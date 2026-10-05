import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI SDK (server-side only, never exposed to client)
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
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

      const response = await client.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const responseText = response.text || '';
      try {
        const parsed = JSON.parse(responseText);
        return res.json(parsed);
      } catch (jsonErr) {
        return res.json({
          explanation: responseText,
          summary: 'Schema reasoning complete',
          updatedSchema: schema,
        });
      }
    } catch (aiErr: any) {
      console.error('Gemini API call error:', aiErr?.message || aiErr);
      // Fall through to smart fallback
    }
  }

  // Smart fallback response for standalone offline mode or missing API key
  const updatedTables = [...(schema?.tables || [])];
  const updatedRels = [...(schema?.relationships || [])];

  let explanation = '';
  let summary = '';

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

  if (lower.includes('audit')) {
    const auditTableId = `tbl_audit_${Date.now()}`;
    updatedTables.push({
      id: auditTableId,
      name: 'audit_logs',
      position: { x: 50, y: (updatedTables.length > 0 ? Math.max(...updatedTables.map((t: any) => t.position.y)) + 300 : 500) },
      colorHeader: '#F59E0B',
      columns: [
        { id: `c_aud_1`, name: 'id', type: schema?.dialect === 'mssql' ? 'bigint IDENTITY(1,1)' : 'bigserial', isPrimaryKey: true, isForeignKey: false, isNullable: false, isUnique: true },
        { id: `c_aud_2`, name: 'table_name', type: schema?.dialect === 'mssql' ? 'nvarchar(100)' : 'varchar(100)', isPrimaryKey: false, isForeignKey: false, isNullable: false, isUnique: false },
        { id: `c_aud_3`, name: 'action', type: schema?.dialect === 'mssql' ? 'nvarchar(50)' : 'varchar(50)', isPrimaryKey: false, isForeignKey: false, isNullable: false, isUnique: false },
        { id: `c_aud_4`, name: 'record_id', type: schema?.dialect === 'mssql' ? 'nvarchar(128)' : 'varchar(128)', isPrimaryKey: false, isForeignKey: false, isNullable: false, isUnique: false },
        { id: `c_aud_5`, name: 'diff_json', type: schema?.dialect === 'mssql' ? 'nvarchar(max)' : schema?.dialect === 'postgres' ? 'jsonb' : 'text', isPrimaryKey: false, isForeignKey: false, isNullable: true, isUnique: false },
        { id: `c_aud_6`, name: 'changed_at', type: schema?.dialect === 'mssql' ? 'datetime2' : 'timestamptz', isPrimaryKey: false, isForeignKey: false, isNullable: false, isUnique: false, defaultValue: schema?.dialect === 'mssql' ? 'SYSUTCDATETIME()' : 'NOW()' },
      ],
    });
    explanation = 'Added a standardized `audit_logs` table tracking table name, action type (INSERT, UPDATE, DELETE), record ID, and payload diffs for complete governance.';
    summary = 'Added audit_logs entity';
  } else if (lower.includes('address')) {
    const addrId = `tbl_address_${Date.now()}`;
    const userTable = updatedTables.find((t: any) => t.name.toLowerCase().includes('user')) || updatedTables[0];
    const userCol = userTable?.columns?.find((c: any) => c.isPrimaryKey) || userTable?.columns?.[0];

    const foreignColId = `c_ad_user_id`;
    updatedTables.push({
      id: addrId,
      name: 'addresses',
      position: { x: (userTable ? userTable.position.x + 360 : 300), y: (userTable ? userTable.position.y : 300) },
      colorHeader: '#06B6D4',
      columns: [
        { id: `c_ad_1`, name: 'id', type: schema?.dialect === 'mssql' ? 'uniqueidentifier' : 'uuid', isPrimaryKey: true, isForeignKey: false, isNullable: false, isUnique: true, defaultValue: schema?.dialect === 'mssql' ? 'NEWID()' : 'gen_random_uuid()' },
        { id: foreignColId, name: userTable ? `${userTable.name}_id` : 'user_id', type: userCol ? userCol.type : 'uuid', isPrimaryKey: false, isForeignKey: true, isNullable: false, isUnique: false, references: userTable && userCol ? { targetTableId: userTable.id, targetColumnId: userCol.id, targetTableName: userTable.name, targetColumnName: userCol.name } : undefined },
        { id: `c_ad_3`, name: 'street_line1', type: schema?.dialect === 'mssql' ? 'nvarchar(255)' : 'varchar(255)', isPrimaryKey: false, isForeignKey: false, isNullable: false, isUnique: false },
        { id: `c_ad_4`, name: 'city', type: schema?.dialect === 'mssql' ? 'nvarchar(100)' : 'varchar(100)', isPrimaryKey: false, isForeignKey: false, isNullable: false, isUnique: false },
        { id: `c_ad_5`, name: 'state_province', type: schema?.dialect === 'mssql' ? 'nvarchar(100)' : 'varchar(100)', isPrimaryKey: false, isForeignKey: false, isNullable: true, isUnique: false },
        { id: `c_ad_6`, name: 'postal_code', type: schema?.dialect === 'mssql' ? 'nvarchar(20)' : 'varchar(20)', isPrimaryKey: false, isForeignKey: false, isNullable: false, isUnique: false },
      ],
    });

    if (userTable && userCol) {
      updatedRels.push({
        id: `rel_${Date.now()}`,
        sourceTableId: addrId,
        sourceColumnId: foreignColId,
        targetTableId: userTable.id,
        targetColumnId: userCol.id,
        cardinality: '1:N',
        name: `fk_addresses_${userTable.name}`,
      });
    }
    explanation = `Added \`addresses\` table with structured postal fields and linked via foreign key to \`${userTable?.name || 'parent'}\`.`;
    summary = 'Added addresses entity with foreign key';
  } else {
    // General solution
    const newTableId = `tbl_entity_${Date.now()}`;
    updatedTables.push({
      id: newTableId,
      name: `custom_solution`,
      position: { x: 400, y: 350 },
      colorHeader: '#8B5CF6',
      columns: [
        { id: `col_1_${newTableId}`, name: 'id', type: schema?.dialect === 'mssql' ? 'uniqueidentifier' : 'uuid', isPrimaryKey: true, isForeignKey: false, isNullable: false, isUnique: true, defaultValue: schema?.dialect === 'mssql' ? 'NEWID()' : 'gen_random_uuid()' },
        { id: `col_2_${newTableId}`, name: 'title', type: schema?.dialect === 'mssql' ? 'nvarchar(255)' : 'varchar(255)', isPrimaryKey: false, isForeignKey: false, isNullable: false, isUnique: false },
        { id: `col_3_${newTableId}`, name: 'status', type: schema?.dialect === 'mssql' ? 'nvarchar(50)' : 'varchar(50)', isPrimaryKey: false, isForeignKey: false, isNullable: false, isUnique: false },
        { id: `col_4_${newTableId}`, name: 'created_at', type: schema?.dialect === 'mssql' ? 'datetime2' : 'timestamptz', isPrimaryKey: false, isForeignKey: false, isNullable: false, isUnique: false },
      ],
    });
    explanation = `Created a new entity based on your prompt: "${prompt}". You can modify columns or connect foreign keys directly on canvas.`;
    summary = 'Custom Entity Created';
  }

  res.json({
    explanation,
    summary,
    updatedSchema: {
      ...schema,
      tables: updatedTables,
      relationships: updatedRels,
      updatedAt: Date.now(),
    },
  });
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
