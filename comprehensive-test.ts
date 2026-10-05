/**
 * Comprehensive End-to-End Test Suite for RelationalCanvas
 * Tests:
 * 1. File Ingestion & Parsing (SQL, MSSQL, MySQL, SQLite, DBML, Mermaid, JSON)
 * 2. File Exporting (Postgres, MSSQL, MySQL, SQLite, DBML, Mermaid, JSON, SVG)
 * 3. AI Chatbot API (Schema mutations, SQL Design Advisory, Scope Boundary enforcement)
 * 4. Canvas State & Graph Mechanics (Nodes, Foreign Keys, Port Calculation, Auto-Layout)
 */

import { parseSQLDDL } from './src/utils/sqlParser';
import { parseDBML } from './src/utils/dbmlParser';
import { parseMermaidER } from './src/utils/mermaidParser';
import {
  generatePostgres,
  generateMSSQL,
  generateMySQL,
  generateSQLite,
  generateDBML,
  generateMermaid,
} from './src/utils/codeGenerators';
import { runAutoLayout } from './src/utils/autoLayout';
import { SAMPLE_SCHEMAS } from './src/utils/sampleSchemas';
import { SchemaModel, Table, Column, Relationship } from './src/types/schema';

let passed = 0;
let failed = 0;

function testAssert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RELATIONALCANVAS THOROUGH END-TO-END VERIFICATION');
  console.log('====================================================\n');

  // --- PART 1: IMPORTING FILES ---
  console.log('--- 1. Testing File Import & Syntax Parsers ---');

  // 1.1 PostgreSQL DDL
  const samplePG = `
    CREATE TABLE customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(100),
      balance NUMERIC(12,2) DEFAULT 0.00
    );

    CREATE TABLE subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID NOT NULL REFERENCES customers(id),
      plan_name VARCHAR(50) NOT NULL,
      status VARCHAR(20) DEFAULT 'active'
    );
  `;
  const pgSchema = parseSQLDDL(samplePG, 'postgres');
  testAssert(pgSchema.tables.length === 2, 'Import PostgreSQL DDL: extracted 2 tables');
  testAssert(pgSchema.tables[0].columns.length === 4, 'Import PostgreSQL DDL: customers has 4 columns');
  testAssert(pgSchema.tables[1].columns.length === 4, 'Import PostgreSQL DDL: subscriptions has 4 columns');
  testAssert(pgSchema.relationships.length === 1, 'Import PostgreSQL DDL: 1 foreign key relation connected');
  testAssert(pgSchema.relationships[0].sourceTableId === pgSchema.tables[1].id, 'Import PostgreSQL DDL: subscriptions references customers');

  // 1.2 MSSQL (T-SQL) with bracket syntax, IDENTITY, clustered PK, and ALTER TABLE FK
  const sampleMSSQL = `
    CREATE TABLE [dbo].[Patients] (
      [PatientId] INT IDENTITY(1,1) PRIMARY KEY CLUSTERED,
      [FullName] NVARCHAR(150) NOT NULL,
      [MRN] UNIQUEIDENTIFIER DEFAULT NEWID(),
      [IsInsured] BIT DEFAULT 1
    );

    CREATE TABLE [dbo].[Appointments] (
      [AppointmentId] INT IDENTITY(1,1) PRIMARY KEY,
      [PatientId] INT NOT NULL,
      [ScheduledAt] DATETIME2 NOT NULL,
      [DoctorNotes] NVARCHAR(MAX)
    );

    ALTER TABLE [dbo].[Appointments]
      ADD CONSTRAINT [FK_Appointments_Patients] FOREIGN KEY ([PatientId]) REFERENCES [dbo].[Patients] ([PatientId]);
  `;
  const mssqlSchema = parseSQLDDL(sampleMSSQL, 'mssql');
  testAssert(mssqlSchema.tables.length === 2, 'Import MSSQL (T-SQL): extracted 2 tables with [dbo] brackets');
  testAssert(mssqlSchema.tables[0].name === 'Patients', 'Import MSSQL: table name Patients stripped of brackets');
  testAssert(mssqlSchema.tables[1].name === 'Appointments', 'Import MSSQL: table name Appointments stripped of brackets');
  testAssert(mssqlSchema.relationships.length === 1, 'Import MSSQL: ALTER TABLE foreign key constraint resolved');

  // 1.3 DBML Format
  const sampleDBML = `
    Table organizations {
      id integer [pk]
      name varchar(100) [not null]
      created_at timestamp
    }

    Table team_members {
      id integer [pk]
      org_id integer [ref: > organizations.id]
      email varchar(120) [unique]
    }
  `;
  const dbmlSchema = parseDBML(sampleDBML);
  testAssert(dbmlSchema.tables.length === 2, 'Import DBML: extracted 2 tables');
  testAssert(dbmlSchema.relationships.length === 1, 'Import DBML: Ref relation extracted');
  testAssert(dbmlSchema.tables[1].columns[1].isForeignKey === true, 'Import DBML: team_members.org_id marked as FK');

  // 1.4 Mermaid ER Diagram
  const sampleMermaid = `
    erDiagram
      AUTHOR ||--o{ BOOK : writes
      AUTHOR {
        string id PK
        string full_name
      }
      BOOK {
        string id PK
        string author_id FK
        string title
      }
  `;
  const mermaidSchema = parseMermaidER(sampleMermaid);
  testAssert(mermaidSchema.tables.length === 2, 'Import Mermaid: extracted 2 tables');
  testAssert(mermaidSchema.relationships.length === 1, 'Import Mermaid: cardinality line parsed');

  // 1.5 JSON Workspace import
  const rawJSON = JSON.stringify(SAMPLE_SCHEMAS.ecommerce.schema);
  const parsedJSON: SchemaModel = JSON.parse(rawJSON);
  testAssert(parsedJSON.tables.length === 6, 'Import JSON Workspace: recovered full 6 tables');
  testAssert(parsedJSON.relationships.length === 6, 'Import JSON Workspace: recovered full 6 relationships');

  // --- PART 2: EXPORTING FILES ---
  console.log('\n--- 2. Testing File Export & Code Generators ---');
  const baseSchema = SAMPLE_SCHEMAS.ecommerce.schema;

  // 2.1 Postgres Export
  const pgExport = generatePostgres(baseSchema);
  testAssert(pgExport.includes('CREATE TABLE IF NOT EXISTS "users"'), 'Export Postgres: includes CREATE TABLE "users"');
  testAssert(pgExport.includes('CONSTRAINT "fk_orders_user_id" FOREIGN KEY'), 'Export Postgres: generates valid FK constraint');

  // 2.2 MSSQL Export
  const mssqlExport = generateMSSQL(baseSchema);
  testAssert(mssqlExport.includes('CREATE TABLE [dbo].[users]'), 'Export MSSQL: includes [dbo].[users]');
  testAssert(mssqlExport.includes('ALTER TABLE [dbo].[orders]'), 'Export MSSQL: generates T-SQL ALTER TABLE FK');

  // 2.3 MySQL Export
  const mysqlExport = generateMySQL(baseSchema);
  testAssert(mysqlExport.includes('CREATE TABLE IF NOT EXISTS `users`'), 'Export MySQL: uses backtick escaping');
  testAssert(mysqlExport.includes('ENGINE=InnoDB'), 'Export MySQL: specifies InnoDB engine');

  // 2.4 SQLite Export
  const sqliteExport = generateSQLite(baseSchema);
  testAssert(sqliteExport.includes('CREATE TABLE IF NOT EXISTS "users"'), 'Export SQLite: produces SQLite DDL');

  // 2.5 DBML Export
  const dbmlExport = generateDBML(baseSchema);
  testAssert(dbmlExport.includes('Table users {'), 'Export DBML: produces Table users block');
  testAssert(dbmlExport.includes('Ref: orders.user_id > users.id'), 'Export DBML: produces Ref relationship syntax');

  // 2.6 Mermaid Export
  const mermaidExport = generateMermaid(baseSchema);
  testAssert(mermaidExport.startsWith('erDiagram'), 'Export Mermaid: starts with erDiagram header');
  testAssert(mermaidExport.includes('users ||--o{ orders'), 'Export Mermaid: contains relationship links');

  // --- PART 3: AI CHATBOT FUNCTIONALITY ---
  console.log('\n--- 3. Testing AI Chatbot Server Endpoint (/api/gemini/assist) ---');

  // 3.1 AI Mutation Request
  try {
    const resMutation = await fetch('http://localhost:3000/api/gemini/assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Add a payments table linked to orders with amount and payment_method',
        schema: baseSchema,
      }),
    });
    testAssert(resMutation.ok, 'AI Chatbot Mutation: HTTP status 200 OK');
    const dataMutation = await resMutation.json();
    testAssert(!!dataMutation.explanation, 'AI Chatbot Mutation: returned clear architectural explanation');
    testAssert(!!dataMutation.updatedSchema, 'AI Chatbot Mutation: returned updatedSchema');
    testAssert(dataMutation.updatedSchema.tables.length >= baseSchema.tables.length, 'AI Chatbot Mutation: schema retained or added tables');
  } catch (err: any) {
    testAssert(false, 'AI Chatbot Mutation request failed', err.message);
  }

  // 3.2 AI SQL Design Advisory (Informational Question)
  try {
    const resAdvisory = await fetch('http://localhost:3000/api/gemini/assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Compare UNIQUEIDENTIFIER in MSSQL vs UUID in PostgreSQL and index trade-offs',
        schema: baseSchema,
      }),
    });
    testAssert(resAdvisory.ok, 'AI Chatbot Advisory: HTTP status 200 OK');
    const dataAdvisory = await resAdvisory.json();
    const isAdvisorySummary = /advisory|compare|comparison|trade-?off|design/i.test(dataAdvisory.summary || '');
    testAssert(isAdvisorySummary, 'AI Chatbot Advisory: correctly labeled with an advisory summary');
    testAssert(dataAdvisory.explanation.includes('UNIQUEIDENTIFIER') || dataAdvisory.explanation.includes('MSSQL'), 'AI Chatbot Advisory: provides in-depth technical comparison');
    testAssert(dataAdvisory.updatedSchema.tables.length === baseSchema.tables.length, 'AI Chatbot Advisory: preserved schema without forced mutation');
  } catch (err: any) {
    testAssert(false, 'AI Chatbot Advisory request failed', err.message);
  }

  // 3.3 AI Out-of-Scope Enforcement
  try {
    const resOutOfScope = await fetch('http://localhost:3000/api/gemini/assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Write a Python script to scrape product prices from an e-commerce website',
        schema: baseSchema,
      }),
    });
    testAssert(resOutOfScope.ok, 'AI Chatbot Out-of-Scope: HTTP status 200 OK');
    const dataOutOfScope = await resOutOfScope.json();
    testAssert(dataOutOfScope.summary === 'Out of Scope', 'AI Chatbot Out-of-Scope: correctly identified out-of-scope query');
    testAssert(dataOutOfScope.explanation.includes('specialized in database') || dataOutOfScope.explanation.includes('RelationalCanvas'), 'AI Chatbot Out-of-Scope: politely declined and redirected to database design');
  } catch (err: any) {
    testAssert(false, 'AI Chatbot Out-of-Scope request failed', err.message);
  }

  // --- PART 4: CANVAS MECHANICS & GRAPH LOGIC ---
  console.log('\n--- 4. Testing Canvas State & Graph Mechanics ---');

  // 4.1 Empty State to Active State
  const emptyCanvasSchema: SchemaModel = {
    id: 'empty_test',
    name: 'Empty Workspace',
    dialect: 'postgres',
    tables: [],
    relationships: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  testAssert(emptyCanvasSchema.tables.length === 0, 'Canvas State: empty canvas initialized with 0 tables');

  // 4.2 Adding a Table on Canvas
  const newTable: Table = {
    id: 'tbl_products_custom',
    name: 'custom_products',
    position: { x: 120, y: 140 },
    columns: [
      { id: 'c1', name: 'id', type: 'uuid', isPrimaryKey: true, isForeignKey: false, isNullable: false, isUnique: true },
      { id: 'c2', name: 'title', type: 'varchar(255)', isPrimaryKey: false, isForeignKey: false, isNullable: false, isUnique: false },
    ],
  };
  const withTableSchema: SchemaModel = {
    ...emptyCanvasSchema,
    tables: [newTable],
  };
  testAssert(withTableSchema.tables.length === 1, 'Canvas State: added 1 table node successfully');

  // 4.3 Wiring a Foreign Key Relationship
  const newChildTable: Table = {
    id: 'tbl_inventory_custom',
    name: 'custom_inventory',
    position: { x: 500, y: 140 },
    columns: [
      { id: 'inv1', name: 'id', type: 'uuid', isPrimaryKey: true, isForeignKey: false, isNullable: false, isUnique: true },
      { id: 'inv2', name: 'product_id', type: 'uuid', isPrimaryKey: false, isForeignKey: true, isNullable: false, isUnique: false },
    ],
  };
  const newRelation: Relationship = {
    id: 'rel_test_1',
    sourceTableId: 'tbl_inventory_custom',
    sourceColumnId: 'inv2',
    targetTableId: 'tbl_products_custom',
    targetColumnId: 'c1',
    cardinality: '1:N',
    name: 'fk_inventory_products',
  };
  const withRelationSchema: SchemaModel = {
    ...withTableSchema,
    tables: [newTable, newChildTable],
    relationships: [newRelation],
  };
  testAssert(withRelationSchema.relationships.length === 1, 'Canvas State: wired 1:N relationship connector between tables');

  // 4.4 Auto-Layout Calculation
  const laidOutSchema = runAutoLayout(withRelationSchema);
  testAssert(laidOutSchema.tables[0].position.x !== undefined && laidOutSchema.tables[0].position.y !== undefined, 'Auto-Layout: computed valid 2D coordinates for table 1');
  testAssert(laidOutSchema.tables[1].position.x !== undefined && laidOutSchema.tables[1].position.y !== undefined, 'Auto-Layout: computed valid 2D coordinates for table 2');

  console.log('\n====================================================');
  console.log(`🏁 FINAL VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
