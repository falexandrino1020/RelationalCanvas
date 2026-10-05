/**
 * Physical Storage Math & Row Size Calculation Engine
 * Implements dialect-specific storage calculations for PostgreSQL, MSSQL, MySQL, and SQLite.
 */

import { Column, SupportedDialect, Table, TableStorageMetrics } from '../types/schema';

export interface ColumnByteFootprint {
  min: number;
  max: number;
  avg: number;
  isVariable: boolean;
  fixedBytes: number;
}

/**
 * Calculates dialect-specific byte footprint for a given column type
 */
export function calculateColumnBytes(column: Column, dialect: SupportedDialect): ColumnByteFootprint {
  const typeLower = column.type.toLowerCase().trim();

  // Extract optional length e.g. varchar(255), nvarchar(100), decimal(18,2)
  const lengthMatch = typeLower.match(/\((\d+)(?:,\s*(\d+))?\)/);
  const lengthParam = lengthMatch ? parseInt(lengthMatch[1], 10) : null;
  const scaleParam = lengthMatch && lengthMatch[2] ? parseInt(lengthMatch[2], 10) : null;

  // 1. MSSQL Specific Types
  if (dialect === 'mssql') {
    if (typeLower.includes('uniqueidentifier')) {
      return { min: 16, max: 16, avg: 16, isVariable: false, fixedBytes: 16 };
    }
    if (typeLower.includes('nvarchar') || typeLower.includes('ntext')) {
      const maxChars = lengthParam || (typeLower.includes('max') ? 4000 : 255);
      // MSSQL NVARCHAR stores UTF-16: 2 bytes per char + 2 bytes offset entry
      const maxBytes = Math.min(maxChars * 2, 8000);
      const avgBytes = Math.min(Math.round(maxChars * 0.45 * 2) + 2, maxBytes);
      return { min: column.isNullable ? 0 : 2, max: maxBytes + 2, avg: avgBytes, isVariable: true, fixedBytes: 0 };
    }
    if (typeLower.includes('varchar')) {
      const maxChars = lengthParam || (typeLower.includes('max') ? 8000 : 255);
      const maxBytes = Math.min(maxChars, 8000);
      const avgBytes = Math.min(Math.round(maxChars * 0.4) + 2, maxBytes);
      return { min: column.isNullable ? 0 : 2, max: maxBytes + 2, avg: avgBytes, isVariable: true, fixedBytes: 0 };
    }
    if (typeLower.includes('nchar')) {
      const chars = lengthParam || 50;
      const bytes = chars * 2;
      return { min: bytes, max: bytes, avg: bytes, isVariable: false, fixedBytes: bytes };
    }
    if (typeLower.includes('char')) {
      const chars = lengthParam || 50;
      return { min: chars, max: chars, avg: chars, isVariable: false, fixedBytes: chars };
    }
    if (typeLower.includes('bigint')) {
      return { min: 8, max: 8, avg: 8, isVariable: false, fixedBytes: 8 };
    }
    if (typeLower.includes('int') && !typeLower.includes('smallint') && !typeLower.includes('tinyint')) {
      return { min: 4, max: 4, avg: 4, isVariable: false, fixedBytes: 4 };
    }
    if (typeLower.includes('smallint')) {
      return { min: 2, max: 2, avg: 2, isVariable: false, fixedBytes: 2 };
    }
    if (typeLower.includes('tinyint')) {
      return { min: 1, max: 1, avg: 1, isVariable: false, fixedBytes: 1 };
    }
    if (typeLower.includes('bit')) {
      return { min: 1, max: 1, avg: 1, isVariable: false, fixedBytes: 1 };
    }
    if (typeLower.includes('decimal') || typeLower.includes('numeric')) {
      const precision = lengthParam || 18;
      const bytes = precision <= 9 ? 5 : precision <= 19 ? 9 : precision <= 28 ? 13 : 17;
      return { min: bytes, max: bytes, avg: bytes, isVariable: false, fixedBytes: bytes };
    }
    if (typeLower.includes('money')) {
      return { min: 8, max: 8, avg: 8, isVariable: false, fixedBytes: 8 };
    }
    if (typeLower.includes('smallmoney')) {
      return { min: 4, max: 4, avg: 4, isVariable: false, fixedBytes: 4 };
    }
    if (typeLower.includes('datetime2')) {
      const precision = lengthParam || 7;
      const bytes = precision <= 2 ? 6 : precision <= 4 ? 7 : 8;
      return { min: bytes, max: bytes, avg: bytes, isVariable: false, fixedBytes: bytes };
    }
    if (typeLower.includes('datetime')) {
      return { min: 8, max: 8, avg: 8, isVariable: false, fixedBytes: 8 };
    }
    if (typeLower.includes('date')) {
      return { min: 3, max: 3, avg: 3, isVariable: false, fixedBytes: 3 };
    }
    if (typeLower.includes('time')) {
      return { min: 5, max: 5, avg: 5, isVariable: false, fixedBytes: 5 };
    }
    if (typeLower.includes('float')) {
      return { min: 8, max: 8, avg: 8, isVariable: false, fixedBytes: 8 };
    }
    if (typeLower.includes('real')) {
      return { min: 4, max: 4, avg: 4, isVariable: false, fixedBytes: 4 };
    }
  }

  // 2. PostgreSQL Specific Types
  if (dialect === 'postgres') {
    if (typeLower.includes('uuid')) {
      return { min: 16, max: 16, avg: 16, isVariable: false, fixedBytes: 16 };
    }
    if (typeLower.includes('bigint') || typeLower.includes('bigserial') || typeLower.includes('int8')) {
      return { min: 8, max: 8, avg: 8, isVariable: false, fixedBytes: 8 };
    }
    if (typeLower.includes('smallint') || typeLower.includes('smallserial') || typeLower.includes('int2')) {
      return { min: 2, max: 2, avg: 2, isVariable: false, fixedBytes: 2 };
    }
    if (typeLower.includes('int') || typeLower.includes('serial')) {
      return { min: 4, max: 4, avg: 4, isVariable: false, fixedBytes: 4 };
    }
    if (typeLower.includes('boolean') || typeLower.includes('bool')) {
      return { min: 1, max: 1, avg: 1, isVariable: false, fixedBytes: 1 };
    }
    if (typeLower.includes('timestamptz') || typeLower.includes('timestamp')) {
      return { min: 8, max: 8, avg: 8, isVariable: false, fixedBytes: 8 };
    }
    if (typeLower.includes('date')) {
      return { min: 4, max: 4, avg: 4, isVariable: false, fixedBytes: 4 };
    }
    if (typeLower.includes('time')) {
      return { min: 8, max: 8, avg: 8, isVariable: false, fixedBytes: 8 };
    }
    if (typeLower.includes('numeric') || typeLower.includes('decimal')) {
      return { min: 8, max: 18, avg: 10, isVariable: true, fixedBytes: 0 };
    }
    if (typeLower.includes('jsonb')) {
      return { min: 4, max: 512, avg: 64, isVariable: true, fixedBytes: 0 };
    }
    if (typeLower.includes('json')) {
      return { min: 4, max: 512, avg: 72, isVariable: true, fixedBytes: 0 };
    }
    if (typeLower.includes('text') || typeLower.includes('varchar')) {
      const maxLen = lengthParam || 255;
      const avgLen = Math.min(Math.round(maxLen * 0.4), 80);
      return { min: column.isNullable ? 0 : 1, max: maxLen + 4, avg: avgLen + 4, isVariable: true, fixedBytes: 0 };
    }
    if (typeLower.includes('float8') || typeLower.includes('double')) {
      return { min: 8, max: 8, avg: 8, isVariable: false, fixedBytes: 8 };
    }
    if (typeLower.includes('float4') || typeLower.includes('real')) {
      return { min: 4, max: 4, avg: 4, isVariable: false, fixedBytes: 4 };
    }
  }

  // 3. MySQL / General Relational Default
  if (typeLower.includes('bigint')) {
    return { min: 8, max: 8, avg: 8, isVariable: false, fixedBytes: 8 };
  }
  if (typeLower.includes('int') && !typeLower.includes('tinyint') && !typeLower.includes('smallint')) {
    return { min: 4, max: 4, avg: 4, isVariable: false, fixedBytes: 4 };
  }
  if (typeLower.includes('tinyint') || typeLower.includes('bool')) {
    return { min: 1, max: 1, avg: 1, isVariable: false, fixedBytes: 1 };
  }
  if (typeLower.includes('smallint')) {
    return { min: 2, max: 2, avg: 2, isVariable: false, fixedBytes: 2 };
  }
  if (typeLower.includes('datetime') || typeLower.includes('timestamp')) {
    return { min: 8, max: 8, avg: 8, isVariable: false, fixedBytes: 8 };
  }
  if (typeLower.includes('decimal') || typeLower.includes('numeric')) {
    return { min: 8, max: 16, avg: 9, isVariable: false, fixedBytes: 9 };
  }
  if (typeLower.includes('varchar') || typeLower.includes('text')) {
    const maxChars = lengthParam || 255;
    const avgBytes = Math.min(Math.round(maxChars * 0.4), 60);
    return { min: 1, max: maxChars + 2, avg: avgBytes + 2, isVariable: true, fixedBytes: 0 };
  }
  if (typeLower.includes('float') || typeLower.includes('double')) {
    return { min: 8, max: 8, avg: 8, isVariable: false, fixedBytes: 8 };
  }

  // Fallback
  return { min: 4, max: 32, avg: 16, isVariable: true, fixedBytes: 0 };
}

/**
 * Calculates complete table storage footprint, in-row page density, and multi-scale projections
 */
export function calculateTableStorage(table: Table, dialect: SupportedDialect): TableStorageMetrics {
  const columns = table.columns || [];

  // Dialect page limits
  // MSSQL: 8,060 bytes per data page (8KB page minus 96-byte header and slot array)
  // MySQL InnoDB: 8,126 bytes
  // PostgreSQL: 8,192 bytes (TOAST starts compressing at 2,048 bytes)
  const pageLimitBytes = dialect === 'mssql' ? 8060 : dialect === 'mysql' ? 8126 : 8192;
  const usablePageBytes = dialect === 'mssql' ? 8060 : dialect === 'mysql' ? 8126 : 8000;

  // Header & overhead by engine
  let rowHeaderBytes = 4;
  let nullBitmapBytes = 0;
  let varLengthPointers = 0;

  if (dialect === 'mssql') {
    rowHeaderBytes = 4; // Status bits A & B (2) + Fixed length (2)
    const nullCols = columns.length;
    nullBitmapBytes = 2 + Math.ceil(nullCols / 8);
    const varCols = columns.filter(c => calculateColumnBytes(c, dialect).isVariable).length;
    varLengthPointers = varCols > 0 ? 2 + (varCols * 2) : 0;
  } else if (dialect === 'postgres') {
    rowHeaderBytes = 24; // HeapTupleHeaderData (23 bytes padded to 24)
    const hasNullable = columns.some(c => c.isNullable);
    nullBitmapBytes = hasNullable ? Math.ceil(columns.length / 8) : 0;
    varLengthPointers = 0;
  } else if (dialect === 'mysql') {
    rowHeaderBytes = 5; // InnoDB record header
    nullBitmapBytes = Math.ceil(columns.length / 8);
    const varCols = columns.filter(c => calculateColumnBytes(c, dialect).isVariable).length;
    varLengthPointers = varCols;
  } else {
    rowHeaderBytes = 4;
    nullBitmapBytes = 1;
    varLengthPointers = 2;
  }

  const baseOverhead = rowHeaderBytes + nullBitmapBytes + varLengthPointers;

  let totalMin = baseOverhead;
  let totalMax = baseOverhead;
  let totalAvg = baseOverhead;

  for (const col of columns) {
    const fp = calculateColumnBytes(col, dialect);
    totalMin += fp.min;
    totalMax += fp.max;
    totalAvg += fp.avg;
  }

  // Ensure minimum roundings
  totalMin = Math.max(8, Math.round(totalMin));
  totalMax = Math.max(totalMin, Math.round(totalMax));
  totalAvg = Math.max(totalMin, Math.min(totalMax, Math.round(totalAvg)));

  // Calculate rows per standard 8KB database page
  const rowsPer8KPage = Math.max(1, Math.floor(usablePageBytes / totalAvg));
  const pageUtilizationPercent = Math.min(100, Math.round((rowsPer8KPage * totalAvg / usablePageBytes) * 100));
  const exceedsPageLimit = totalMax > pageLimitBytes;

  // Primary key index byte sizing (B-Tree leaf node entry ~ PK bytes + 8 bytes row/page pointer + overhead)
  const pkCol = columns.find(c => c.isPrimaryKey) || columns[0];
  const pkBytes = pkCol ? calculateColumnBytes(pkCol, dialect).avg : 8;
  const indexRowBytes = Math.round(pkBytes + 12);

  const calcProjections = (rowCount: number) => {
    const rawDataMB = (rowCount * totalAvg) / (1024 * 1024);
    const rawIndexMB = (rowCount * indexRowBytes) / (1024 * 1024);
    const pageCount = Math.ceil(rowCount / rowsPer8KPage);
    return {
      dataSizeMB: Number(rawDataMB.toFixed(2)),
      indexSizeMB: Number(rawIndexMB.toFixed(2)),
      totalMB: Number((rawDataMB + rawIndexMB).toFixed(2)),
      pageCount,
    };
  };

  return {
    tableId: table.id,
    tableName: table.name,
    columnCount: columns.length,
    minRowBytes: totalMin,
    maxRowBytes: totalMax,
    avgRowBytes: totalAvg,
    rowsPer8KPage,
    pageUtilizationPercent,
    exceedsPageLimit,
    pageLimitBytes,
    projections: {
      rows10k: calcProjections(10000),
      rows100k: calcProjections(100000),
      rows1m: calcProjections(1000000),
      rows10m: calcProjections(10000000),
    },
  };
}

/**
 * Summarizes entire database storage footprint across all tables
 */
export function calculateDatabaseStorage(tables: Table[], dialect: SupportedDialect) {
  const tableMetrics = tables.map(t => calculateTableStorage(t, dialect));

  let totalAvgRowBytes = 0;
  let totalExceedingPages = 0;

  const totals = {
    rows10k: { dataMB: 0, indexMB: 0, totalMB: 0, pages: 0 },
    rows100k: { dataMB: 0, indexMB: 0, totalMB: 0, pages: 0 },
    rows1m: { dataMB: 0, indexMB: 0, totalMB: 0, pages: 0 },
    rows10m: { dataMB: 0, indexMB: 0, totalMB: 0, pages: 0 },
  };

  for (const m of tableMetrics) {
    totalAvgRowBytes += m.avgRowBytes;
    if (m.exceedsPageLimit) totalExceedingPages++;

    totals.rows10k.dataMB += m.projections.rows10k.dataSizeMB;
    totals.rows10k.indexMB += m.projections.rows10k.indexSizeMB;
    totals.rows10k.totalMB += m.projections.rows10k.totalMB;
    totals.rows10k.pages += m.projections.rows10k.pageCount;

    totals.rows100k.dataMB += m.projections.rows100k.dataSizeMB;
    totals.rows100k.indexMB += m.projections.rows100k.indexSizeMB;
    totals.rows100k.totalMB += m.projections.rows100k.totalMB;
    totals.rows100k.pages += m.projections.rows100k.pageCount;

    totals.rows1m.dataMB += m.projections.rows1m.dataSizeMB;
    totals.rows1m.indexMB += m.projections.rows1m.indexSizeMB;
    totals.rows1m.totalMB += m.projections.rows1m.totalMB;
    totals.rows1m.pages += m.projections.rows1m.pageCount;

    totals.rows10m.dataMB += m.projections.rows10m.dataSizeMB;
    totals.rows10m.indexMB += m.projections.rows10m.indexSizeMB;
    totals.rows10m.totalMB += m.projections.rows10m.totalMB;
    totals.rows10m.pages += m.projections.rows10m.pageCount;
  }

  return {
    tableCount: tables.length,
    tableMetrics,
    totalAvgRowBytes: Math.round(totalAvgRowBytes),
    totalExceedingPages,
    totals,
  };
}
