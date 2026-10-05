import { SchemaModel, Table } from '../types/schema';

export function runAutoLayout(schema: SchemaModel): SchemaModel {
  const tables = [...schema.tables];
  if (tables.length === 0) return schema;

  // Calculate in-degree (how many foreign keys point to this table)
  const inDegree: Record<string, number> = {};
  const outDegree: Record<string, number> = {};

  tables.forEach(t => {
    inDegree[t.id] = 0;
    outDegree[t.id] = 0;
  });

  schema.relationships.forEach(rel => {
    if (inDegree[rel.targetTableId] !== undefined) {
      inDegree[rel.targetTableId]++;
    }
    if (outDegree[rel.sourceTableId] !== undefined) {
      outDegree[rel.sourceTableId]++;
    }
  });

  // Sort tables: primary root tables (more incoming refs, fewer outgoing) first
  tables.sort((a, b) => {
    const scoreA = (inDegree[a.id] || 0) - (outDegree[a.id] || 0);
    const scoreB = (inDegree[b.id] || 0) - (outDegree[b.id] || 0);
    return scoreB - scoreA;
  });

  const columnsCount = Math.max(2, Math.min(4, Math.ceil(Math.sqrt(tables.length * 1.5))));
  const columnWidth = 380;
  const rowHeightBase = 60;
  const colHeightPadding = 40;

  // Keep track of column Y heights
  const colHeights = new Array(columnsCount).fill(60);

  const updatedTables: Table[] = tables.map((table) => {
    // Find shortest column
    let minColIdx = 0;
    let minHeight = colHeights[0];

    for (let c = 1; c < columnsCount; c++) {
      if (colHeights[c] < minHeight) {
        minHeight = colHeights[c];
        minColIdx = c;
      }
    }

    const posX = 60 + minColIdx * columnWidth;
    const posY = colHeights[minColIdx];

    // Estimated height: header (~50px) + ~34px per column + footer (~30px)
    const tableHeight = 60 + table.columns.length * 34 + 30;
    colHeights[minColIdx] += tableHeight + colHeightPadding;

    return {
      ...table,
      position: { x: posX, y: posY },
    };
  });

  return {
    ...schema,
    tables: updatedTables,
    updatedAt: Date.now(),
  };
}
