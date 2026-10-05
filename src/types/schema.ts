/**
 * Schema types and definitions for RelationalCanvas
 */

export type SupportedDialect = 'postgres' | 'mysql' | 'mssql' | 'sqlite' | 'dbml' | 'mermaid';

export type Cardinality = '1:1' | '1:N' | 'N:M';

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
  defaultValue?: string;
  references?: ColumnReference;
  comment?: string;
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
