import { Column, Relationship, SchemaModel, Table, SupportedDialect } from '../types/schema';

function cleanIdentifier(token: string): string {
  if (!token) return '';
  return token
    .trim()
    .replace(/^\[|\]$/g, '')      // MSSQL [identifier]
    .replace(/^`|`$/g, '')        // MySQL `identifier`
    .replace(/^"|"$/g, '')        // Postgres "identifier"
    .replace(/^dbo\./i, '');      // MSSQL dbo.table
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function parseSQLDDL(sql: string, preferredDialect: SupportedDialect = 'postgres'): SchemaModel {
  const tables: Table[] = [];
  const relationships: Relationship[] = [];

  // Remove SQL comments (-- and /* */)
  const sanitized = sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '');

  // Detect likely dialect if preferred is generic
  let detectedDialect: SupportedDialect = preferredDialect;
  if (/IDENTITY\s*\(\s*\d+\s*,\s*\d+\s*\)|NVARCHAR|UNIQUEIDENTIFIER/i.test(sql)) {
    detectedDialect = 'mssql';
  } else if (/ENGINE\s*=\s*InnoDB|AUTO_INCREMENT/i.test(sql)) {
    detectedDialect = 'mysql';
  } else if (/UUID\s+DEFAULT\s+gen_random_uuid|SERIAL|TIMESTAMPTZ/i.test(sql)) {
    detectedDialect = 'postgres';
  } else if (/AUTOINCREMENT|BLOB/i.test(sql)) {
    detectedDialect = 'sqlite';
  }

  // Extract CREATE TABLE blocks with balanced parentheses
  const tableHeaderRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s(]+)\s*\(/gi;
  let headerMatch: RegExpExecArray | null;

  const rawForeignKeys: Array<{
    sourceTableName: string;
    sourceColumnName: string;
    targetTableName: string;
    targetColumnName: string;
  }> = [];

  let tableIndex = 0;

  while ((headerMatch = tableHeaderRegex.exec(sanitized)) !== null) {
    const rawTableName = headerMatch[1];
    const tableName = cleanIdentifier(rawTableName.split('.').pop() || rawTableName);
    
    // Balanced paren extraction
    let parenDepth = 1;
    let i = tableHeaderRegex.lastIndex;
    let body = '';
    while (i < sanitized.length && parenDepth > 0) {
      const char = sanitized[i];
      if (char === '(') parenDepth++;
      else if (char === ')') parenDepth--;
      if (parenDepth > 0) {
        body += char;
      }
      i++;
    }
    tableHeaderRegex.lastIndex = i;
    const tableId = `tbl_${generateId()}`;

    const columns: Column[] = [];
    const tablePrimaryKeys: string[] = [];

    // Split body by commas, keeping parentheses together
    const lines = splitDefinitions(body);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const upper = trimmed.toUpperCase();

      // Check table-level PRIMARY KEY (col1, col2)
      if (upper.startsWith('PRIMARY KEY') || upper.includes('CONSTRAINT') && upper.includes('PRIMARY KEY')) {
        const pkMatch = trimmed.match(/PRIMARY\s+KEY(?:\s+CLUSTERED)?\s*\(([^)]+)\)/i);
        if (pkMatch) {
          const pks = pkMatch[1].split(',').map(s => cleanIdentifier(s.trim()));
          tablePrimaryKeys.push(...pks);
        }
        continue;
      }

      // Check table-level FOREIGN KEY
      if (upper.includes('FOREIGN KEY') && upper.includes('REFERENCES')) {
        const fkMatch = trimmed.match(/FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s*([^\s(]+)\s*\(([^)]+)\)/i);
        if (fkMatch) {
          const srcCols = fkMatch[1].split(',').map(s => cleanIdentifier(s.trim()));
          const targetTable = cleanIdentifier(fkMatch[2].split('.').pop() || fkMatch[2]);
          const targetCols = fkMatch[3].split(',').map(s => cleanIdentifier(s.trim()));

          srcCols.forEach((srcCol, idx) => {
            rawForeignKeys.push({
              sourceTableName: tableName,
              sourceColumnName: srcCol,
              targetTableName: targetTable,
              targetColumnName: targetCols[idx] || targetCols[0] || 'id',
            });
          });
        }
        continue;
      }

      // Skip check constraints or index declarations
      if (upper.startsWith('KEY ') || upper.startsWith('INDEX ') || upper.startsWith('UNIQUE KEY') || upper.startsWith('CHECK ')) {
        continue;
      }

      // Parse column definition: [name] [type] [constraints...]
      const tokens = trimmed.split(/\s+/);
      if (tokens.length < 2) continue;

      const colName = cleanIdentifier(tokens[0]);
      let colType = tokens[1];

      // Handle types with arguments, e.g. varchar(255), decimal(10, 2)
      let tokenIndex = 2;
      if (colType.includes('(') && !colType.includes(')')) {
        while (tokenIndex < tokens.length) {
          colType += ' ' + tokens[tokenIndex];
          if (tokens[tokenIndex].includes(')')) {
            tokenIndex++;
            break;
          }
          tokenIndex++;
        }
      }

      const rest = tokens.slice(tokenIndex).join(' ');
      const restUpper = rest.toUpperCase();

      const isPK = restUpper.includes('PRIMARY KEY');
      const isNullable = !restUpper.includes('NOT NULL') && !isPK;
      const isUnique = restUpper.includes('UNIQUE') || isPK;

      // Extract DEFAULT value if present
      let defaultValue: string | undefined;
      const defaultMatch = rest.match(/DEFAULT\s+([^,;]+)/i);
      if (defaultMatch) {
        defaultValue = defaultMatch[1].trim();
      }

      // Inline REFERENCES
      if (restUpper.includes('REFERENCES')) {
        const refMatch = rest.match(/REFERENCES\s*([^\s(]+)(?:\s*\(([^)]+)\))?/i);
        if (refMatch) {
          const targetTable = cleanIdentifier(refMatch[1].split('.').pop() || refMatch[1]);
          const targetCol = refMatch[2] ? cleanIdentifier(refMatch[2]) : 'id';
          rawForeignKeys.push({
            sourceTableName: tableName,
            sourceColumnName: colName,
            targetTableName: targetTable,
            targetColumnName: targetCol,
          });
        }
      }

      columns.push({
        id: `col_${generateId()}`,
        name: colName,
        type: colType,
        isPrimaryKey: isPK,
        isForeignKey: false, // will update during relationship resolution
        isNullable,
        isUnique,
        defaultValue,
      });
    }

    // Apply table-level primary keys
    tablePrimaryKeys.forEach(pkName => {
      const col = columns.find(c => c.name.toLowerCase() === pkName.toLowerCase());
      if (col) {
        col.isPrimaryKey = true;
        col.isNullable = false;
        col.isUnique = true;
      }
    });

    // Auto layout positioning in columns of 2 or 3
    const colsCount = 3;
    const colIndex = tableIndex % colsCount;
    const rowIndex = Math.floor(tableIndex / colsCount);
    const posX = 60 + colIndex * 360;
    const posY = 60 + rowIndex * 320;

    tables.push({
      id: tableId,
      name: tableName,
      columns,
      position: { x: posX, y: posY },
    });

    tableIndex++;
  }

  // Parse ALTER TABLE foreign keys
  const alterFKRegex = /ALTER\s+TABLE\s+([^\s]+)\s+ADD\s+(?:CONSTRAINT\s+[^\s]+\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s*([^\s(]+)\s*\(([^)]+)\)/gi;
  let alterMatch: RegExpExecArray | null;
  while ((alterMatch = alterFKRegex.exec(sanitized)) !== null) {
    const rawSrcTable = alterMatch[1];
    const srcTable = cleanIdentifier(rawSrcTable.split('.').pop() || rawSrcTable);
    const srcCols = alterMatch[2].split(',').map(s => cleanIdentifier(s.trim()));
    const targetTable = cleanIdentifier(alterMatch[3].split('.').pop() || alterMatch[3]);
    const targetCols = alterMatch[4].split(',').map(s => cleanIdentifier(s.trim()));

    srcCols.forEach((srcCol, idx) => {
      rawForeignKeys.push({
        sourceTableName: srcTable,
        sourceColumnName: srcCol,
        targetTableName: targetTable,
        targetColumnName: targetCols[idx] || targetCols[0] || 'id',
      });
    });
  }

  // Resolve Foreign Keys into Relationships
  for (const fk of rawForeignKeys) {
    const srcTable = tables.find(t => t.name.toLowerCase() === fk.sourceTableName.toLowerCase());
    const tgtTable = tables.find(t => t.name.toLowerCase() === fk.targetTableName.toLowerCase());

    if (srcTable && tgtTable) {
      const srcCol = srcTable.columns.find(c => c.name.toLowerCase() === fk.sourceColumnName.toLowerCase());
      const tgtCol = tgtTable.columns.find(c => c.name.toLowerCase() === fk.targetColumnName.toLowerCase()) || tgtTable.columns.find(c => c.isPrimaryKey);

      if (srcCol && tgtCol) {
        srcCol.isForeignKey = true;
        srcCol.references = {
          targetTableId: tgtTable.id,
          targetColumnId: tgtCol.id,
          targetTableName: tgtTable.name,
          targetColumnName: tgtCol.name,
        };

        relationships.push({
          id: `rel_${generateId()}`,
          sourceTableId: srcTable.id,
          sourceColumnId: srcCol.id,
          targetTableId: tgtTable.id,
          targetColumnId: tgtCol.id,
          cardinality: srcCol.isUnique ? '1:1' : '1:N',
          name: `${srcTable.name}_${srcCol.name}_fk`,
        });
      }
    }
  }

  return {
    id: `schema_${generateId()}`,
    name: 'Imported Database Schema',
    dialect: detectedDialect,
    tables,
    relationships,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Splits column and constraint definitions inside table parentheses,
 * respecting nested parentheses in types like decimal(10, 2).
 */
function splitDefinitions(body: string): string[] {
  const result: string[] = [];
  let current = '';
  let parenDepth = 0;

  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (char === '(') {
      parenDepth++;
      current += char;
    } else if (char === ')') {
      parenDepth--;
      current += char;
    } else if (char === ',' && parenDepth === 0) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    result.push(current.trim());
  }

  return result;
}
