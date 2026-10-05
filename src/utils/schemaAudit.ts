/**
 * Senior Database Engineer Schema Audit & Anti-Pattern Linter
 * Evaluates relational schemas for production performance, referential integrity,
 * indexing gaps, and dialect-specific physical storage hazards.
 */

import { AuditIssue, SchemaModel, Table, Column, Relationship } from '../types/schema';
import { calculateTableStorage } from './storageMath';

export interface AuditReport {
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  issues: AuditIssue[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  summaryText: string;
}

/**
 * Runs a comprehensive senior database engineering audit on a schema
 */
export function runSchemaAudit(schema: SchemaModel): AuditReport {
  const issues: AuditIssue[] = [];
  const dialect = schema.dialect;
  const tables = schema.tables || [];
  const relationships = schema.relationships || [];

  for (const table of tables) {
    const columns = table.columns || [];

    // --- RULE 1: MISSING PRIMARY KEY (Critical - 1NF Entity Integrity) ---
    const primaryKeys = columns.filter(c => c.isPrimaryKey);
    if (primaryKeys.length === 0) {
      issues.push({
        id: `missing_pk::${table.id}`,
        severity: 'critical',
        category: 'normalization',
        title: `Table '${table.name}' lacks a Primary Key`,
        description: `Every relational table must have a Primary Key to satisfy First Normal Form (1NF) and guarantee row identity.`,
        engineeringRationale: `Without a Primary Key, tables remain unorganized heaps in engines like MSSQL and InnoDB, preventing clustered index tree lookups, foreign key targeting, and logical replication.`,
        tableId: table.id,
        tableName: table.name,
        remediation: `Add a primary key column (e.g. 'id' with UUID or auto-incrementing integer).`,
        autoFixAvailable: true,
        autoFixLabel: `Add Primary Key 'id'`,
      });
    }

    // --- RULE 2: UNINDEXED FOREIGN KEYS (Warning - Severe Table Scan / Locking Risk) ---
    for (const col of columns) {
      const isFK = col.isForeignKey || relationships.some(r => r.sourceTableId === table.id && r.sourceColumnId === col.id);
      if (isFK && !col.isIndexed && !col.isPrimaryKey && !col.isUnique) {
        issues.push({
          id: `unindexed_fk::${table.id}::${col.id}`,
          severity: 'warning',
          category: 'indexing',
          title: `Unindexed Foreign Key on '${table.name}.${col.name}'`,
          description: `Foreign key column '${col.name}' does not have an index.`,
          engineeringRationale: `In PostgreSQL, MSSQL, and MySQL, foreign keys do NOT automatically create indexes on the child table. When deleting or updating parent records, the engine must perform a full-table scan on '${table.name}' with shared/exclusive table locks, causing catastrophic latency and deadlocks.`,
          tableId: table.id,
          tableName: table.name,
          columnId: col.id,
          columnName: col.name,
          remediation: `Create a B-tree index on '${col.name}' to eliminate full table scans during joins and parent deletions.`,
          autoFixAvailable: true,
          autoFixLabel: `Add Index on ${col.name}`,
        });
      }
    }

    // --- RULE 3: INEXACT FLOATING POINT MONEY ANTI-PATTERN (Warning - Accounting Discrepancy) ---
    const moneyRegex = /^(?:price|amount|balance|cost|salary|total|fee|tax|revenue|subtotal|discount)$/i;
    for (const col of columns) {
      const colLower = col.name.toLowerCase();
      const typeLower = col.type.toLowerCase();
      if (moneyRegex.test(colLower) && (typeLower.includes('float') || typeLower.includes('real') || typeLower.includes('double'))) {
        issues.push({
          id: `inexact_money::${table.id}::${col.id}`,
          severity: 'warning',
          category: 'data-type',
          title: `Inexact Float Type on Monetary Column '${table.name}.${col.name}'`,
          description: `Column '${col.name}' uses '${col.type}', an approximate IEEE 754 binary floating-point representation.`,
          engineeringRationale: `Binary floats cannot precisely represent base-10 fractional currency values (e.g. 0.10 + 0.20 = 0.30000000000000004), causing silent rounding discrepancies, balance mismatches, and compliance audit failures.`,
          tableId: table.id,
          tableName: table.name,
          columnId: col.id,
          columnName: col.name,
          remediation: `Convert to DECIMAL(18,2) or NUMERIC(12,2) for exact fixed-point financial precision.`,
          autoFixAvailable: true,
          autoFixLabel: `Convert to DECIMAL(18,2)`,
        });
      }
    }

    // --- RULE 4: MSSQL CLUSTERED GUID FRAGMENTATION (Warning - B-Tree Splits) ---
    if (dialect === 'mssql') {
      const guidPk = columns.find(c => c.isPrimaryKey && c.type.toLowerCase().includes('uniqueidentifier'));
      if (guidPk) {
        const def = (guidPk.defaultValue || '').toLowerCase();
        if (def.includes('newid()') || !def) {
          issues.push({
            id: `mssql_guid_frag::${table.id}::${guidPk.id}`,
            severity: 'warning',
            category: 'indexing',
            title: `MSSQL Random GUID Clustered PK on '${table.name}'`,
            description: `Primary key '${guidPk.name}' uses random UNIQUEIDENTIFIER (NEWID()) on MSSQL.`,
            engineeringRationale: `In Microsoft SQL Server, primary keys are CLUSTERED by default. Inserting random 16-byte GUIDs into a clustered B-tree index causes continuous 50/50 page splits, severe physical fragmentation, buffer pool cache thrashing, and high transaction log write volume.`,
            tableId: table.id,
            tableName: table.name,
            columnId: guidPk.id,
            columnName: guidPk.name,
            remediation: `Change default to NEWSEQUENTIALID() to guarantee chronological monotonic clustered index insertion, or use a surrogate BIGINT IDENTITY key.`,
            autoFixAvailable: true,
            autoFixLabel: `Use NEWSEQUENTIALID()`,
          });
        }
      }
    }

    // --- RULE 5: PHYSICAL ROW SIZE LIMIT RISK (Critical/Warning - Page Overflow) ---
    const storageMetrics = calculateTableStorage(table, dialect);
    if (storageMetrics.exceedsPageLimit) {
      issues.push({
        id: `row_size_overflow::${table.id}`,
        severity: dialect === 'mssql' ? 'critical' : 'warning',
        category: 'storage-limit',
        title: `Table '${table.name}' Maximum Row Exceeds Physical Page Limit`,
        description: `Maximum possible row size (${storageMetrics.maxRowBytes} bytes) exceeds the dialect's physical in-row data page limit of ${storageMetrics.pageLimitBytes} bytes.`,
        engineeringRationale: `In ${dialect === 'mssql' ? 'MSSQL (8,060 bytes)' : 'MySQL InnoDB (8,126 bytes)'}, rows that exceed page capacity either fail on INSERT or force slow off-row overflow pointer chains, adding extra disk I/O reads for every query.`,
        tableId: table.id,
        tableName: table.name,
        remediation: `Reduce oversized VARCHAR/NVARCHAR columns or normalize broad metadata attributes into a satellite entity table.`,
        autoFixAvailable: false,
      });
    }

    // --- RULE 6: NULLABLE FOREIGN KEY MISSING 'ON DELETE SET NULL' (Info) ---
    for (const col of columns) {
      if (col.isForeignKey && col.isNullable) {
        const rel = relationships.find(r => r.sourceTableId === table.id && r.sourceColumnId === col.id);
        if (rel && (!rel.onDelete || rel.onDelete === 'NO ACTION')) {
          issues.push({
            id: `nullable_fk_no_action::${table.id}::${col.id}`,
            severity: 'info',
            category: 'integrity',
            title: `Nullable Foreign Key '${table.name}.${col.name}' Missing Cascading Rule`,
            description: `Column '${col.name}' is nullable, but relationship '${rel.name || 'FK'}' has no ON DELETE action.`,
            engineeringRationale: `When parent records are deleted, having ON DELETE SET NULL on nullable foreign keys gracefully unlinks records without causing constraint violation errors.`,
            tableId: table.id,
            tableName: table.name,
            columnId: col.id,
            columnName: col.name,
            remediation: `Configure 'ON DELETE SET NULL' on the relationship constraint.`,
            autoFixAvailable: true,
            autoFixLabel: `Set ON DELETE SET NULL`,
          });
        }
      }
    }
  }

  // Calculate health score (100 base, -15 per critical, -6 per warning, -2 per info)
  let penalty = 0;
  let criticalCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  for (const issue of issues) {
    if (issue.severity === 'critical') {
      penalty += 15;
      criticalCount++;
    } else if (issue.severity === 'warning') {
      penalty += 6;
      warningCount++;
    } else {
      penalty += 2;
      infoCount++;
    }
  }

  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'A+';
  if (score >= 95) grade = 'A+';
  else if (score >= 85) grade = 'A';
  else if (score >= 75) grade = 'B';
  else if (score >= 65) grade = 'C';
  else if (score >= 50) grade = 'D';
  else grade = 'F';

  let summaryText = 'Schema design conforms to production database engineering standards.';
  if (criticalCount > 0) {
    summaryText = `${criticalCount} critical schema hazard${criticalCount > 1 ? 's' : ''} detected that require immediate remediation.`;
  } else if (warningCount > 0) {
    summaryText = `${warningCount} performance or indexing anti-pattern${warningCount > 1 ? 's' : ''} identified.`;
  } else if (infoCount > 0) {
    summaryText = `Schema is solid with ${infoCount} minor best practice suggestion${infoCount > 1 ? 's' : ''}.`;
  }

  return {
    score,
    grade,
    issues,
    criticalCount,
    warningCount,
    infoCount,
    summaryText,
  };
}

/**
 * Deterministically applies an automated 1-click fix to the schema model
 */
export function applyAuditFix(schema: SchemaModel, issueId: string): SchemaModel {
  const updatedTables = schema.tables.map(table => ({
    ...table,
    columns: table.columns.map(col => ({ ...col })),
  }));
  const updatedRels = schema.relationships.map(rel => ({ ...rel }));

  const [type, tableId, columnId] = issueId.split('::');

  // Fix 1: Add Primary Key
  if (type === 'missing_pk') {
    const table = updatedTables.find(t => t.id === tableId);
    if (table) {
      const isMSSQL = schema.dialect === 'mssql';
      const isPostgres = schema.dialect === 'postgres';
      const pkType = isMSSQL ? 'uniqueidentifier' : isPostgres ? 'uuid' : 'int';
      const pkDefault = isMSSQL ? 'NEWSEQUENTIALID()' : isPostgres ? 'gen_random_uuid()' : undefined;

      const newPkCol: Column = {
        id: `pk_${Date.now()}`,
        name: 'id',
        type: pkType,
        isPrimaryKey: true,
        isForeignKey: false,
        isNullable: false,
        isUnique: true,
        isIndexed: true,
        defaultValue: pkDefault,
      };
      table.columns = [newPkCol, ...table.columns];
    }
  }

  // Fix 2: Index Foreign Key
  else if (type === 'unindexed_fk') {
    const table = updatedTables.find(t => t.id === tableId);
    if (table) {
      const col = table.columns.find(c => c.id === columnId);
      if (col) {
        col.isIndexed = true;
      }
    }
  }

  // Fix 3: Inexact Money Float -> DECIMAL(18,2)
  else if (type === 'inexact_money') {
    const table = updatedTables.find(t => t.id === tableId);
    if (table) {
      const col = table.columns.find(c => c.id === columnId);
      if (col) {
        col.type = schema.dialect === 'postgres' ? 'numeric(12,2)' : 'decimal(18,2)';
      }
    }
  }

  // Fix 4: MSSQL NEWID() -> NEWSEQUENTIALID()
  else if (type === 'mssql_guid_frag') {
    const table = updatedTables.find(t => t.id === tableId);
    if (table) {
      const col = table.columns.find(c => c.id === columnId);
      if (col) {
        col.defaultValue = 'NEWSEQUENTIALID()';
      }
    }
  }

  // Fix 5: Nullable FK set ON DELETE SET NULL
  else if (type === 'nullable_fk_no_action') {
    const rel = updatedRels.find(r => r.sourceTableId === tableId && r.sourceColumnId === columnId);
    if (rel) {
      rel.onDelete = 'SET NULL';
    }
  }

  return {
    ...schema,
    tables: updatedTables,
    relationships: updatedRels,
    updatedAt: Date.now(),
  };
}
