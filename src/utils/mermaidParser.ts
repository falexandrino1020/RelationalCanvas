import { Column, Relationship, SchemaModel, Table } from '../types/schema';

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function parseMermaidER(mermaid: string): SchemaModel {
  const tables: Table[] = [];
  const relationships: Relationship[] = [];

  const lines = mermaid.split('\n');
  let currentTable: Table | null = null;
  let tableIndex = 0;

  const rawRelations: Array<{
    first: string;
    second: string;
    marker: string;
    label?: string;
  }> = [];

  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('%%') || line.startsWith('erDiagram')) continue;

    // Check relationship lines: TABLE1 ||--o{ TABLE2 : "places"
    const relMatch = line.match(/^([a-zA-Z0-9_]+)\s+([|o}{]+--[|o}{]+)\s+([a-zA-Z0-9_]+)(?:\s*:\s*["']?([^"']*)["']?)?/);
    if (relMatch) {
      rawRelations.push({
        first: relMatch[1],
        marker: relMatch[2],
        second: relMatch[3],
        label: relMatch[4],
      });
      continue;
    }

    // Check table start: TABLE_NAME {
    const tableStart = line.match(/^([a-zA-Z0-9_]+)\s*\{/);
    if (tableStart) {
      const name = tableStart[1];
      const colsCount = 3;
      const colIndex = tableIndex % colsCount;
      const rowIndex = Math.floor(tableIndex / colsCount);
      const posX = 60 + colIndex * 360;
      const posY = 60 + rowIndex * 320;

      currentTable = {
        id: `tbl_${generateId()}`,
        name,
        columns: [],
        position: { x: posX, y: posY },
      };
      tables.push(currentTable);
      tableIndex++;
      continue;
    }

    // Check table end: }
    if (line === '}' && currentTable) {
      currentTable = null;
      continue;
    }

    // Column definition inside table: type name [PK|FK|UK] ["comment"]
    if (currentTable) {
      const colMatch = line.match(/^([a-zA-Z0-9_()]+)\s+([a-zA-Z0-9_]+)(?:\s+(PK|FK|UK))?(?:\s+["']([^"']*)["'])?/i);
      if (colMatch) {
        const colType = colMatch[1];
        const colName = colMatch[2];
        const constraint = (colMatch[3] || '').toUpperCase();
        const comment = colMatch[4];

        const isPK = constraint === 'PK';
        const isFK = constraint === 'FK';
        const isUnique = constraint === 'UK' || isPK;

        currentTable.columns.push({
          id: `col_${generateId()}`,
          name: colName,
          type: colType,
          isPrimaryKey: isPK,
          isForeignKey: isFK,
          isNullable: !isPK,
          isUnique,
          comment,
        });
      }
    }
  }

  // Map relations
  for (const rel of rawRelations) {
    const table1 = tables.find(t => t.name.toLowerCase() === rel.first.toLowerCase());
    const table2 = tables.find(t => t.name.toLowerCase() === rel.second.toLowerCase());

    if (table1 && table2) {
      // Find PK on parent (table1 or table2 based on marker)
      const pk1 = table1.columns.find(c => c.isPrimaryKey) || table1.columns[0];
      const pk2 = table2.columns.find(c => c.isPrimaryKey) || table2.columns[0];

      // Standard convention: parent has ||, child has o{ or |{
      const isParent1 = rel.marker.startsWith('||') || rel.marker.startsWith('|o');
      const srcTable = isParent1 ? table1 : table2;
      const tgtTable = isParent1 ? table2 : table1;
      const srcCol = isParent1 ? pk1 : pk2;
      const tgtCol = (isParent1 ? table2 : table1).columns.find(c => c.isForeignKey || c.name.toLowerCase().includes(srcTable.name.toLowerCase())) || (isParent1 ? pk2 : pk1);

      if (srcTable && tgtTable && srcCol && tgtCol) {
        relationships.push({
          id: `rel_${generateId()}`,
          sourceTableId: tgtTable.id,
          sourceColumnId: tgtCol.id,
          targetTableId: srcTable.id,
          targetColumnId: srcCol.id,
          cardinality: rel.marker.includes('}') ? '1:N' : '1:1',
          name: rel.label,
        });
      }
    }
  }

  return {
    id: `schema_${generateId()}`,
    name: 'Mermaid ER Schema',
    dialect: 'mermaid',
    tables,
    relationships,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
