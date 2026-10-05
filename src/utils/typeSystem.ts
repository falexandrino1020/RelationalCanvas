import { SupportedDialect } from '../types/schema';

export interface TypeCategory {
  name: string;
  types: string[];
}

export const DIALECT_TYPES: Record<SupportedDialect, TypeCategory[]> = {
  postgres: [
    { name: 'Identifiers & Numeric', types: ['uuid', 'serial', 'bigserial', 'integer', 'bigint', 'smallint', 'numeric', 'double precision', 'real'] },
    { name: 'Strings & Text', types: ['varchar(255)', 'text', 'char(1)', 'jsonb', 'json'] },
    { name: 'Date & Time', types: ['timestamptz', 'timestamp', 'date', 'time', 'interval'] },
    { name: 'Boolean & Binary', types: ['boolean', 'bytea'] },
  ],
  mssql: [
    { name: 'Identifiers & Numeric', types: ['uniqueidentifier', 'int', 'bigint', 'smallint', 'tinyint', 'decimal(18,2)', 'numeric(18,2)', 'float'] },
    { name: 'Strings & Unicode', types: ['nvarchar(255)', 'nvarchar(max)', 'varchar(255)', 'varchar(max)', 'nchar(10)', 'text'] },
    { name: 'Date & Time', types: ['datetime2', 'datetimeoffset', 'datetime', 'date', 'time'] },
    { name: 'Boolean & Binary', types: ['bit', 'varbinary(max)', 'xml'] },
  ],
  mysql: [
    { name: 'Numeric & Auto', types: ['int', 'bigint', 'mediumint', 'smallint', 'tinyint', 'decimal(10,2)', 'float', 'double'] },
    { name: 'Strings & Text', types: ['varchar(255)', 'text', 'longtext', 'char(36)', 'json', 'enum'] },
    { name: 'Date & Time', types: ['datetime', 'timestamp', 'date', 'time'] },
    { name: 'Boolean & Binary', types: ['tinyint(1)', 'boolean', 'blob', 'varbinary'] },
  ],
  sqlite: [
    { name: 'Standard SQLite Types', types: ['INTEGER', 'TEXT', 'REAL', 'BLOB', 'NUMERIC'] },
    { name: 'Common Semantic Aliases', types: ['INTEGER PRIMARY KEY', 'VARCHAR(255)', 'BOOLEAN', 'DATETIME', 'FLOAT'] },
  ],
  dbml: [
    { name: 'Generic DBML Types', types: ['integer', 'varchar', 'text', 'boolean', 'timestamp', 'decimal', 'float', 'uuid', 'json'] },
  ],
  mermaid: [
    { name: 'Mermaid ER Types', types: ['string', 'int', 'float', 'boolean', 'date', 'datetime', 'uuid'] },
  ],
};

export const COMMON_COLORS = [
  { name: 'Slate Blue', value: '#3B82F6' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Violet', value: '#8B5CF6' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Indigo', value: '#6366F1' },
];

/**
 * Normalizes a type from any dialect into a canonical form for cross-conversion
 */
export function normalizeType(typeStr: string, targetDialect: SupportedDialect): string {
  const clean = typeStr.trim().toLowerCase();

  // Identifier / UUID
  if (clean.includes('uuid') || clean.includes('guid') || clean === 'uniqueidentifier') {
    if (targetDialect === 'mssql') return 'uniqueidentifier';
    if (targetDialect === 'postgres') return 'uuid';
    if (targetDialect === 'mysql') return 'char(36)';
    if (targetDialect === 'sqlite') return 'TEXT';
    return 'uuid';
  }

  // Auto-increment / Primary ID
  if (clean.includes('serial') || clean.includes('identity') || clean === 'autoincrement') {
    if (targetDialect === 'postgres') return 'serial';
    if (targetDialect === 'mssql') return 'int IDENTITY(1,1)';
    if (targetDialect === 'mysql') return 'int AUTO_INCREMENT';
    if (targetDialect === 'sqlite') return 'INTEGER PRIMARY KEY AUTOINCREMENT';
    return 'integer';
  }

  // Boolean
  if (clean.includes('bool') || clean === 'bit') {
    if (targetDialect === 'mssql') return 'bit';
    if (targetDialect === 'mysql') return 'tinyint(1)';
    if (targetDialect === 'sqlite') return 'INTEGER';
    if (targetDialect === 'postgres') return 'boolean';
    return 'boolean';
  }

  // Timestamp / DateTime
  if (clean.includes('time') || clean.includes('date')) {
    if (targetDialect === 'postgres') return 'timestamptz';
    if (targetDialect === 'mssql') return 'datetime2';
    if (targetDialect === 'mysql') return 'datetime';
    if (targetDialect === 'sqlite') return 'DATETIME';
    return 'timestamp';
  }

  // Large Text
  if (clean.includes('text') || clean.includes('varchar(max)') || clean.includes('nvarchar(max)')) {
    if (targetDialect === 'mssql') return 'nvarchar(max)';
    if (targetDialect === 'postgres') return 'text';
    if (targetDialect === 'mysql') return 'text';
    if (targetDialect === 'sqlite') return 'TEXT';
    return 'text';
  }

  // String / Varchar
  if (clean.includes('char') || clean.includes('str')) {
    if (targetDialect === 'mssql') return 'nvarchar(255)';
    if (targetDialect === 'postgres') return 'varchar(255)';
    if (targetDialect === 'mysql') return 'varchar(255)';
    if (targetDialect === 'sqlite') return 'TEXT';
    return 'varchar';
  }

  // Numbers / Int
  if (clean.includes('bigint') || clean.includes('int8')) {
    if (targetDialect === 'sqlite') return 'INTEGER';
    return 'bigint';
  }
  if (clean.includes('int')) {
    if (targetDialect === 'sqlite') return 'INTEGER';
    return 'int';
  }

  // JSON
  if (clean.includes('json')) {
    if (targetDialect === 'postgres') return 'jsonb';
    if (targetDialect === 'mssql') return 'nvarchar(max)';
    if (targetDialect === 'mysql') return 'json';
    if (targetDialect === 'sqlite') return 'TEXT';
    return 'json';
  }

  // Fallback
  return typeStr;
}
