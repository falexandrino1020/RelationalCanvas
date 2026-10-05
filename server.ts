import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { generateDomainSchemaSolution } from './src/utils/domainSchemaGenerator';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to sanitize and normalize AI-generated schema into RelationalCanvas SchemaModel
function normalizeAISchema(rawSchema: any, fallbackSchema: any) {
  if (!rawSchema || typeof rawSchema !== 'object') return fallbackSchema;

  const tables = Array.isArray(rawSchema.tables) && rawSchema.tables.length > 0 ? rawSchema.tables.map((t: any, idx: number) => {
    const tableId = t.id || `tbl_${t.name || idx}_${Date.now()}`;
    const xPos = t.position?.x ?? t.x ?? (60 + (idx % 3) * 340);
    const yPos = t.position?.y ?? t.y ?? (60 + Math.floor(idx / 3) * 300);

    const cols = Array.isArray(t.columns) ? t.columns.map((c: any, cIdx: number) => ({
      id: c.id || `col_${c.name || cIdx}_${tableId}`,
      name: c.name || `col_${cIdx + 1}`,
      type: c.type || 'varchar(255)',
      isPrimaryKey: Boolean(c.isPrimaryKey || c.primaryKey || c.pk),
      isForeignKey: Boolean(c.isForeignKey || c.foreignKey || c.fk),
      isNullable: c.isNullable ?? c.nullable ?? true,
      isUnique: Boolean(c.isUnique || c.unique || c.isPrimaryKey),
      isIndexed: Boolean(c.isIndexed || c.indexed || c.isPrimaryKey || c.isForeignKey),
      defaultValue: c.defaultValue || c.default,
      references: c.references,
    })) : [];

    return {
      id: tableId,
      name: t.name || `table_${idx + 1}`,
      position: { x: xPos, y: yPos },
      colorHeader: t.colorHeader || (['#3B82F6', '#06B6D4', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B'][idx % 6]),
      columns: cols,
    };
  }) : fallbackSchema.tables;

  const relationships = Array.isArray(rawSchema.relationships) ? rawSchema.relationships.map((r: any, rIdx: number) => {
    let srcTbl = tables.find((t: any) => t.id === r.sourceTableId || t.name === r.source || t.name === r.sourceTableId);
    let tgtTbl = tables.find((t: any) => t.id === r.targetTableId || t.name === r.target || t.name === r.targetTableId);

    const srcCol = srcTbl?.columns?.find((c: any) => c.id === r.sourceColumnId || c.name === r.sourceColumn || c.isForeignKey) || srcTbl?.columns?.[0];
    const tgtCol = tgtTbl?.columns?.find((c: any) => c.id === r.targetColumnId || c.name === r.targetColumn || c.isPrimaryKey) || tgtTbl?.columns?.[0];

    return {
      id: r.id || `rel_${rIdx}_${Date.now()}`,
      sourceTableId: srcTbl?.id || r.sourceTableId,
      sourceColumnId: srcCol?.id || r.sourceColumnId,
      targetTableId: tgtTbl?.id || r.targetTableId,
      targetColumnId: tgtCol?.id || r.targetColumnId,
      cardinality: r.cardinality || '1:N',
      sourceEnd: r.sourceEnd || (r.cardinality === '1:1' ? 'one' : 'crows-foot'),
      targetEnd: r.targetEnd || (r.cardinality === 'N:M' ? 'crows-foot' : 'one'),
      name: r.name || `fk_${srcTbl?.name}_${tgtTbl?.name}`,
      onDelete: r.onDelete || 'CASCADE',
      onUpdate: r.onUpdate || 'CASCADE',
    };
  }) : fallbackSchema.relationships;

  return {
    ...fallbackSchema,
    ...rawSchema,
    tables,
    relationships,
    updatedAt: Date.now(),
  };
}

// POST /api/gemini/assist
app.post('/api/gemini/assist', async (req, res) => {
  const { prompt, schema, apiKey: clientApiKey } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const lower = prompt.toLowerCase();

  // Strict Scope Limitation Check:
  // Reject non-database requests (e.g. general programming, python scripting, web dev, scraping, etc.)
  const isOutOfScope = /python|javascript|react component|write a poem|weather|css style|scrape|backend api|express route|html|frontend/i.test(lower);
  if (isOutOfScope) {
    return res.json({
      explanation: `I am specialized in database schema architecture, entity relationship modeling, and SQL dialect compatibility within RelationalCanvas.

I cannot assist with general software programming, server scripting, or non-database tasks. However, I am ready to help you model tables, define relationships, optimize indexes, or ensure cross-dialect compatibility across PostgreSQL, Microsoft SQL Server (MSSQL), MySQL, SQLite, DBML, and Mermaid!`,
      summary: 'Out of Scope',
      updatedSchema: schema,
    });
  }

  // Resolve API key from server environment or optional client header/body
  const activeApiKey = (clientApiKey as string) || (req.headers['x-gemini-api-key'] as string) || process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

  // If Gemini API is available (either server injected or user provided)
  if (activeApiKey) {
    try {
      const client = new GoogleGenAI({
        apiKey: activeApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemInstruction = `You are RelationalCanvas AI, an expert relational database architect dedicated to database modeling, schema design, and cross-dialect compatibility within RelationalCanvas.

CRITICAL SCOPE BOUNDARY & RESPONSIBILITIES:
1. STRICT SCOPE LIMITATION:
   - Your capabilities and actions are strictly limited to relational database architecture, schema design, and dialect compatibility.
   - You CAN answer questions, provide recommendations, and suggest best practices related to:
     * SQL schema design, entity modeling, and table architectures.
     * Column specifications, primary keys, composite keys, and data type selection.
     * Foreign key relationships, cardinality (1:1, 1:N, N:M junction tables), and referential integrity (CASCADE, SET NULL, RESTRICT).
     * Cross-dialect compatibility and translation across PostgreSQL, Microsoft SQL Server (MSSQL / T-SQL), MySQL, SQLite, DBML, and Mermaid.
     * Database normalization (1NF, 2NF, 3NF, BCNF), indexing recommendations, and query performance optimization.
   - You MUST NOT execute or entertain tasks outside database schema design (e.g. general software programming, writing Node.js/Python server logic, web development, UI design, copywriting, or unrelated topics). If asked, politely decline and redirect the user back to SQL schema architecture and cross-dialect compatibility within RelationalCanvas.

2. ADVISORY VS. MUTATION:
   - If the user asks an informational question or asks for design advice (e.g., "What are the trade-offs between UUID and BIGINT in MSSQL vs PostgreSQL?", "How should I structure a multi-tenant database?"):
     * Provide a clear, insightful technical answer in "explanation".
     * Set "summary" to "SQL Design Advisory".
     * Keep "updatedSchema" as the current schema (do not force unnecessary canvas changes).
   - If the user asks to modify, extend, or generate tables (e.g., "Add an address table linked to users", "Refactor this into 3NF", "Convert data types to MSSQL"):
     * Explain the architectural decisions in "explanation".
     * Set a concise "summary" (e.g. "Added addresses table with foreign key").
     * Return the COMPLETE updated schema in "updatedSchema" preserving all existing tables and relationships unless specifically asked to remove them.
     * Ensure new tables have non-overlapping x, y coordinates.
     * Ensure every foreign key relationship is properly recorded in "relationships" with source and target IDs and cardinality.`;

      const contents = `Current Schema:
${JSON.stringify(schema, null, 2)}

User Request:
${prompt}

Please return JSON with:
- "explanation": string (Markdown text explaining what you changed or your SQL design guidance)
- "summary": string (brief 1-line title of the change or advisory)
- "updatedSchema": the complete SchemaModel object (or current schema if purely advisory)
- "sqlPreview": optional DDL snippet for the changes (or empty string if advisory)`;

      const candidateModels = [
        modelName,
        'gemini-flash-latest',
        'gemini-3.1-flash-lite',
        'gemini-3.8-flash'
      ].filter((v, i, a) => a.indexOf(v) === i);

      let responseText = '';
      for (const candidate of candidateModels) {
        try {
          const response = await client.models.generateContent({
            model: candidate,
            contents,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              temperature: 0.3,
            },
          });
          if (response && response.text) {
            responseText = response.text;
            break;
          }
        } catch (modelErr: any) {
          console.warn(`Model ${candidate} attempt error:`, modelErr?.message || modelErr);
        }
      }

      if (responseText) {
        try {
          const parsed = JSON.parse(responseText);
          const normalized = normalizeAISchema(parsed.updatedSchema, schema);
          return res.json({
            explanation: parsed.explanation || 'I have analyzed your request and prepared the schema modifications below.',
            summary: parsed.summary || 'Proposed Schema Architecture',
            updatedSchema: normalized,
            sqlPreview: parsed.sqlPreview || '',
          });
        } catch (jsonErr) {
          console.warn('Could not parse Gemini JSON response, adapting text:', jsonErr);
        }
      }
    } catch (aiErr: any) {
      console.error('Gemini API call error:', aiErr?.message || aiErr);
    }
  }

  // Check for advisory / informational design questions
  const isAdvisory = /difference|compare|vs|trade-?off|how to|what is|why|explain|which type|normalize|normalization|indexing|performance|best practice/i.test(lower);

  if (isAdvisory) {
    let advisoryExplanation = '';
    if (lower.includes('uniqueidentifier') || lower.includes('uuid')) {
      advisoryExplanation = `### UNIQUEIDENTIFIER (MSSQL) vs. UUID (PostgreSQL)

- **Microsoft SQL Server (\`UNIQUEIDENTIFIER\`)**:
  - 16-byte binary GUID storage. Generated via \`NEWID()\` (random) or \`NEWSEQUENTIALID()\` (sequential).
  - *Index Performance Tip*: Random \`NEWID()\` causes index fragmentation when used as a clustered primary key. For clustered keys, prefer \`NEWSEQUENTIALID()\` or an \`IDENTITY(1,1)\` surrogate key.
- **PostgreSQL (\`UUID\`)**:
  - Native 128-bit type. Generated via \`gen_random_uuid()\` (built-in pgcrypto/PG 13+).
  - Works smoothly with B-tree indexes; UUIDv7 / sequential UUIDs can minimize cache misses in large tables.
- **Compatibility**:
  - RelationalCanvas automatically maps between \`UUID\` (PostgreSQL) and \`UNIQUEIDENTIFIER\` (MSSQL) during dialect export.`;
    } else if (lower.includes('normalize') || lower.includes('3nf')) {
      advisoryExplanation = `### Database Normalization Principles (1NF – 3NF)

1. **First Normal Form (1NF)**: Eliminate repeating groups; ensure atomic column values and a distinct primary key for each row.
2. **Second Normal Form (2NF)**: Must be 1NF and all non-key columns must fully depend on the primary key (no partial key dependencies).
3. **Third Normal Form (3NF)**: Must be 2NF and no transitive dependencies (non-key columns must depend *only* on the primary key, not on another non-key column).
4. **RelationalCanvas Tip**: Separate entity attributes into dedicated tables linked by foreign keys, and use junction tables for Many-to-Many (\`N:M\`) relationships.`;
    } else {
      advisoryExplanation = `### SQL Schema Design Guidance

- **Primary Keys**: Always enforce a clear identifier (\`UUID\` / \`UNIQUEIDENTIFIER\` for distributed systems, or auto-incrementing integers for compact clustered index leaf pages).
- **Referential Integrity**: Define explicit \`FOREIGN KEY\` constraints with appropriate cascade rules (\`ON DELETE CASCADE\` vs \`SET NULL\` vs \`RESTRICT\`).
- **Cross-Dialect Type Selection**: Use appropriate types for each engine (e.g. \`NVARCHAR\` in MSSQL for Unicode vs \`VARCHAR\` in PostgreSQL; \`DATETIME2\` in MSSQL vs \`TIMESTAMPTZ\` in PostgreSQL).`;
    }

    return res.json({
      explanation: advisoryExplanation,
      summary: 'SQL Design Advisory',
      updatedSchema: schema,
    });
  }

  // Full Domain Schema Solution Architect (produces complete multi-table normalized solutions)
  const domainSolution = generateDomainSchemaSolution(prompt, schema);
  return res.json(domainSolution);
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RelationalCanvas server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
