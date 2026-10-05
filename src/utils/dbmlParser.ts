import { Column, Relationship, SchemaModel, Table } from '../types/schema';

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function parseDBML(dbml: string): SchemaModel {
  const tables: Table[] = [];
  const relationships: Relationship[] = [];

  // Remove single line comments //
  const sanitized = dbml.replace(/\/\/.*$/gm, '');

  // Extract Tables: Table table_name [as alias] { ... }
  const tableRegex = /Table\s+([^\s{]+)(?:\s+as\s+[^\s{]+)?\s*\{([\s\S]*?)\}/gi;
  let match: RegExpExecArray | null;
  let tableIndex = 0;

  const rawRefs: Array<{
    sourceTable: string;
    sourceCol: string;
    targetTable: string;
    targetCol: string;
    relationType: string;
  }> = [];

  while ((match = tableRegex.exec(sanitized)) !== null) {
    const tableName = match[1].trim().replace(/['"]/g, '');
    const body = match[2];
    const tableId = `tbl_${generateId()}`;
    const columns: Column[] = [];

    const lines = body.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Matches: col_name type [settings]
      const colMatch = line.match(/^([^\s]+)\s+([^\s\[]+)(?:\s*\[(.*)\])?/);
      if (colMatch) {
        const colName = colMatch[1].replace(/['"]/g, '');
        const colType = colMatch[2];
        const settings = colMatch[3] || '';

        const isPK = /pk|primary\s+key/i.test(settings);
        const isUnique = /unique/i.test(settings) || isPK;
        const isNullable = !/not\s+null/i.test(settings) && !isPK;

        // Check inline ref: [ref: > users.id]
        const inlineRef = settings.match(/ref:\s*([><-])\s*([^\s.\[\]]+)\.([^\s.\[\]]+)/i);
        if (inlineRef) {
          rawRefs.push({
            sourceTable: tableName,
            sourceCol: colName,
            targetTable: inlineRef[2],
            targetCol: inlineRef[3],
            relationType: inlineRef[1],
          });
        }

        columns.push({
          id: `col_${generateId()}`,
          name: colName,
          type: colType,
          isPrimaryKey: isPK,
          isForeignKey: false,
          isNullable,
          isUnique,
        });
      }
    }

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

  // Extract standalone Ref declarations: Ref [optional_name]: orders.user_id > users.id
  const refRegex = /Ref(?:\s+[^\s:]+)?\s*:\s*([^\s.]+)\.([^\s.]+)\s*([><-])\s*([^\s.]+)\.([^\s.]+)/gi;
  let refMatch: RegExpExecArray | null;

  while ((refMatch = refRegex.exec(sanitized)) !== null) {
    rawRefs.push({
      sourceTable: refMatch[1],
      sourceCol: refMatch[2],
      relationType: refMatch[3],
      targetTable: refMatch[4],
      targetCol: refMatch[5],
    });
  }

  // Resolve references
  for (const ref of rawRefs) {
    const srcTable = tables.find(t => t.name.toLowerCase() === ref.sourceTable.toLowerCase());
    const tgtTable = tables.find(t => t.name.toLowerCase() === ref.targetTable.toLowerCase());

    if (srcTable && tgtTable) {
      const srcCol = srcTable.columns.find(c => c.name.toLowerCase() === ref.sourceCol.toLowerCase());
      const tgtCol = tgtTable.columns.find(c => c.name.toLowerCase() === ref.targetCol.toLowerCase());

      if (srcCol && tgtCol) {
        srcCol.isForeignKey = true;
        srcCol.references = {
          targetTableId: tgtTable.id,
          targetColumnId: tgtCol.id,
          targetTableName: tgtTable.name,
          targetColumnName: tgtCol.name,
        };

        const cardinality = ref.relationType === '-' ? '1:1' : '1:N';

        relationships.push({
          id: `rel_${generateId()}`,
          sourceTableId: srcTable.id,
          sourceColumnId: srcCol.id,
          targetTableId: tgtTable.id,
          targetColumnId: tgtCol.id,
          cardinality,
          name: `${srcTable.name}_${srcCol.name}_fk`,
        });
      }
    }
  }

  return {
    id: `schema_${generateId()}`,
    name: 'DBML Imported Schema',
    dialect: 'dbml',
    tables,
    relationships,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
