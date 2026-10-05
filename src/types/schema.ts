/**
 * Schema types and definitions for RelationalCanvas
 */

export type SupportedDialect = 'postgres' | 'mysql' | 'mssql' | 'sqlite' | 'dbml' | 'mermaid';

export type Cardinality = '1:1' | '1:N' | 'N:1' | 'N:M';

export type EndNotation =
  | 'crows-foot'       // Many / Crow's foot (three prongs)
  | 'one'              // Exactly One (double vertical bars ||)
  | 'zero-one'         // Zero or One (circle + bar o|)
  | 'zero-many'        // Zero or Many (circle + crow's foot o<)
  | 'one-many';        // One or Many (bar + crow's foot |>)

export interface ColumnReference {
  targetTableId: string;
  targetColumnId: string;
  targetTableName?: string;
  targetColumnName?: string;
}

export interface Column {
  id: string;
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isNullable: boolean;
  isUnique: boolean;
  isIndexed?: boolean;
  defaultValue?: string;
  references?: ColumnReference;
  comment?: string;
}

export type AuditSeverity = 'critical' | 'warning' | 'info';

export interface AuditIssue {
  id: string;
  severity: AuditSeverity;
  category: 'indexing' | 'data-type' | 'normalization' | 'storage-limit' | 'integrity';
  title: string;
  description: string;
  engineeringRationale: string;
  tableId?: string;
  tableName?: string;
  columnId?: string;
  columnName?: string;
  remediation: string;
  autoFixAvailable: boolean;
  autoFixLabel?: string;
}

export interface TableStorageMetrics {
  tableId: string;
  tableName: string;
  columnCount: number;
  minRowBytes: number;
  maxRowBytes: number;
  avgRowBytes: number;
  rowsPer8KPage: number;
  pageUtilizationPercent: number;
  exceedsPageLimit: boolean;
  pageLimitBytes: number;
  projections: {
    rows10k: { dataSizeMB: number; indexSizeMB: number; totalMB: number; pageCount: number };
    rows100k: { dataSizeMB: number; indexSizeMB: number; totalMB: number; pageCount: number };
    rows1m: { dataSizeMB: number; indexSizeMB: number; totalMB: number; pageCount: number };
    rows10m: { dataSizeMB: number; indexSizeMB: number; totalMB: number; pageCount: number };
  };
}

export interface Table {
  id: string;
  name: string;
  columns: Column[];
  position: { x: number; y: number };
  colorHeader?: string;
  comment?: string;
}

export interface Relationship {
  id: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  cardinality: Cardinality;
  sourceEnd?: EndNotation;
  targetEnd?: EndNotation;
  name?: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface SchemaModel {
  id: string;
  name: string;
  dialect: SupportedDialect;
  tables: Table[];
  relationships: Relationship[];
  createdAt: number;
  updatedAt: number;
}

export interface AIPatchAction {
  type: 'ADD_TABLE' | 'REMOVE_TABLE' | 'MODIFY_TABLE' | 'ADD_COLUMN' | 'REMOVE_COLUMN' | 'ADD_RELATIONSHIP' | 'REFACTOR_SCHEMA';
  description: string;
  data: any;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  proposedPatch?: {
    summary: string;
    schemaSnapshot?: SchemaModel;
    actions?: AIPatchAction[];
    sqlPreview?: string;
  };
}
