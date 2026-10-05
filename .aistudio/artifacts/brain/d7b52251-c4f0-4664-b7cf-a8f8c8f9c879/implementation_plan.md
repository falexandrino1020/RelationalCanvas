# RelationalCanvas: AI-Powered Bi-Directional SQL & ERD Visual Workbench

A visual database architecture studio that bi-directionally transforms between raw SQL DDL schemas and interactive Entity Relationship Diagrams (ERDs), enhanced by an AI co-pilot with voice dictation to design, refactor, and customize schemas directly on canvas.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural, branding, scope, and dialect choices are confirmed and guide the build:

- **Confirmed Brand Name**: **RelationalCanvas** — a clean, distinctive, and copyright-safe title that clearly communicates visual database modeling without conflicting with existing trademarks.
- **Standalone Tool Architecture**: **100% Standalone Operation** — Zero user authentication, zero cloud database accounts, and zero mandatory external dependencies. Operates as an independent tool with automatic `localStorage` persistence, local workspace file backup/restore (`.json`), and instant `.sql` / `.dbml` / `.mmd` file import & export.
- **Confirmed Multi-Dialect Suite (including MSSQL)**:
  - **Relational SQL Dialects**: **PostgreSQL**, **MySQL**, **Microsoft SQL Server (MSSQL / T-SQL)**, and **SQLite**.
  - **ERD & Diagram Formats**: **DBML** and **Mermaid `erDiagram`**.
- **MSSQL (T-SQL) Specific Fidelity**: First-class handling of MSSQL bracket identifiers (`[dbo].[TableName]`, `[ColumnName]`), `IDENTITY(1,1)` auto-increment, and native MSSQL types (`uniqueidentifier`, `nvarchar(n)`, `varchar(n)`, `datetime2`, `datetimeoffset`, `bit`, `decimal(p,s)`, `varbinary`, etc.), with accurate cross-dialect type mapping.
- **Canvas Experience**: High-fidelity interactive node canvas with drag-and-drop table cards, field reordering, primary/foreign key tagging, relationship bezier connectors with cardinality markers (1:1, 1:N, N:M), zoom/pan controls, and auto-layout.
- **AI Co-Pilot & Voice**: Integrated collapsible AI assistant side panel supporting voice dictation (continuous speech-to-text), contextual schema auditing, SQL index optimization suggestions, and direct executable actions that modify canvas tables and relations in real time.

---

### 1. Step-by-Step Workflow & System Mechanics

Here is the exact step-by-step lifecycle of how RelationalCanvas operates from input to execution:

1. **Input Ingestion & Detection**:
   - The user pastes raw text or drops a file (`.sql`, `.dbml`, `.mmd`, or RelationalCanvas `.json` workspace).
   - RelationalCanvas detects the syntax: MSSQL T-SQL (e.g. `CREATE TABLE [dbo].[Users] ([Id] INT IDENTITY(1,1)...)`), Postgres, MySQL, SQLite, DBML, or Mermaid.
   - The client-side parser extracts table definitions, column types, primary keys, nullability, unique constraints, and foreign key references into a normalized **Schema Intermediate Representation (IR)**.
2. **Visual Graph Assembly & Layout**:
   - The Schema IR is loaded into the canvas state.
   - If node positions are unassigned (e.g. from raw SQL), an auto-layout algorithm positions tables logically in columns or grid clusters to minimize line crossings.
   - Foreign key relationships are mapped to connector lines anchored to table rows with directional arrows and cardinality markers.
3. **Interactive Visual Editing & Local Auto-Save**:
   - Drag tables across the infinite grid canvas with smooth panning and zooming ($25\%$ to $200\%$).
   - Inline column editing: Rename columns, pick datatypes from quick-select popovers (including dialect-tailored MSSQL types like `nvarchar`, `uniqueidentifier`, `bit`, `datetime2`), toggle `PK`, `FK`, `Nullable`, and `Unique`.
   - Add new tables with one click; connect tables by dragging relation connectors between primary and foreign keys.
   - Every mutation immediately debounces to browser `localStorage`, ensuring work is never lost between refreshes or browser restarts.
4. **AI Voice & Chat Collaboration**:
   - The user clicks the microphone button for speech dictation or types a natural language request (e.g., *"Convert this PostgreSQL schema to MSSQL using uniqueidentifier and datetime2"* or *"Add an audit log table for orders"*).
   - Server-side Gemini API (`gemini-3.8-flash`) analyzes the current Schema IR + user prompt and returns structured mutations (`ADD_TABLE`, `MODIFY_COLUMN`, `ADD_RELATION`).
   - The user reviews the proposed change diff and clicks "Apply", instantly updating canvas nodes and connector lines.
5. **Bi-Directional Code Generation & Standalone Export**:
   - The active Schema IR is converted into clean, formatted code for any selected dialect:
     - **Microsoft SQL Server (MSSQL)**: Clean T-SQL with `[table]`, `[column]`, `IDENTITY(1,1)`, `CONSTRAINT [PK_...] PRIMARY KEY CLUSTERED`, `NVARCHAR`, `DATETIME2`, `UNIQUEIDENTIFIER`.
     - **PostgreSQL**: `UUID` or `SERIAL`, `TIMESTAMP WITH TIME ZONE`, `FOREIGN KEY ... REFERENCES ...`.
     - **MySQL**: `AUTO_INCREMENT`, `DATETIME`, backtick quoting, `ENGINE=InnoDB`.
     - **SQLite**: Clean standard SQLite DDL.
     - **DBML**: Standard Database Markup Language notation.
     - **Mermaid**: `erDiagram` block format ready for Markdown docs and GitHub READMEs.
     - **Workspace JSON**: Complete project snapshot including canvas coordinates, zoom levels, and custom notes.
   - One-click copy, download `.sql` file, download `.json` project, or export canvas PNG/SVG.

---

### 2. User Experience & Visual Design

Following the **Universal Frontend Design Constitution** and **SaaS & Developer Dashboard** guidelines:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  Top Bar Contract: [RelationalCanvas] ─ [Tables (8) · Relations (11) · Dialect: MSSQL] ─ [Import] [Export Code] [Auto Layout]  │
├───────────────┬────────────────────────────────────────────────────────┬───────────────┤
│ Schema Tree   │ Interactive ERD Canvas                                 │ AI Studio &   │
│ & Tables      │ ┌──────────────┐         ┌──────────────┐              │ Inspector     │
│               │ │ users        │────────<│ orders       │              │               │
│ - users       │ │ id (PK) uuid │ 1     N │ id (PK) uuid │              │ [Voice Mic]   │
│ - orders      │ │ email text   │         │ user_id (FK) │              │               │
│ - order_items │ └──────────────┘         └──────┬───────┘              │ "Add an audit │
│ - products    │                                 │ 1                    │ log table for │
│ - categories  │                                 │ N                    │ all updates"  │
│               │                          ┌──────┴───────┐              │               │
│ [+ Add Table] │                          │ order_items  │              │ [Apply Plan]  │
│ [Sample Sets] │ [Zoom: 100%] [Fit View]  │ id (PK) uuid │              │ [Export DDL]  │
└───────────────┴──────────────────────────┴──────────────┴──────────────┴───────────────┘
```

#### Visual Identity & Styling
- **Aesthetic Direction**: Deep slate developer console (`#0B0F19` dark canvas, `#111827` surface panels, `#1F2937` borders). Precision lines, 1px hairline dividers, zero flashy AI slop.
- **Color Discipline (60-30-10)**:
  - 60% Canvas & Neutral Backdrop: `#0B0F19` deep space slate with subtle micro-dot grid pattern (`rgba(255,255,255,0.06)`).
  - 30% Structural Panels & Cards: `#131B2E` table nodes, `#1E293B` table headers, crisp `#334155` borders with subtle hover highlights.
  - 10% Intentional Accents: Emerald (`#10B981`) for Primary Keys and valid relationships, Cyan (`#06B6D4`) for Foreign Keys, Amber (`#F59E0B`) for indexing warnings, Violet (`#8B5CF6`) for AI voice active listening.
- **Typography & Tabular Discipline**:
  - Headings & Table Names: `Plus Jakarta Sans` / `Cabinet Grotesk` (clean bold sans-serif).
  - Column Names, Types, and DDL: `JetBrains Mono` with `tabular-nums` for precise column alignment and datatype readability.
- **Top Bar Contract**:
  - Zone 1: `RelationalCanvas` wordmark with active project title.
  - Zone 2: Navigation / Quick stats (`Tables: 6`, `Relations: 8`, `Dialect: MSSQL / Postgres / MySQL / SQLite`).
  - Zone 3: Primary action cluster (`[Preset Templates]`, `[Auto-Layout]`, `[Import]`, `[Export Code]`).

---

### 3. Key Product Decisions & Trade-Offs

- **Cross-Dialect Type Normalization Matrix**:
  - *Chosen Approach*: A deterministic type-mapping matrix mapping generic conceptual types (`ID`, `STRING`, `TEXT`, `INTEGER`, `BIGINT`, `BOOLEAN`, `DATETIME`, `DECIMAL`, `JSON`, `BINARY`) to their dialect-specific counterparts (e.g. `BOOLEAN` -> `BIT` in MSSQL, `BOOLEAN` in Postgres, `TINYINT(1)` in MySQL, `INTEGER` in SQLite; `UUID` -> `UNIQUEIDENTIFIER` in MSSQL, `UUID` in Postgres, `VARCHAR(36)` in MySQL/SQLite).
  - *Why*: Allows switching dialects on the fly or exporting the exact same visual ERD to PostgreSQL, MSSQL, MySQL, or SQLite with 100% syntactic correctness.
- **Standalone Tool Architecture**:
  - *Chosen Approach*: Self-contained client application with zero account walls, saving automatically to `localStorage` with full JSON workspace export/import.
  - *Why*: Users can immediately use RelationalCanvas on their local machines or any browser with total privacy, zero friction, and no server database account setup.
- **Client-Side Parsing & Generation**:
  - *Chosen Approach*: Fully in-browser deterministic parsing and AST code generation for PostgreSQL, MSSQL (T-SQL), MySQL, SQLite, DBML, and Mermaid.
  - *Why*: Visual editing, syntax parsing, and DDL generation execute in sub-milliseconds without requiring any server round-trips.
- **Bespoke React + SVG Interactive Canvas vs. Heavy 3rd-Party Diagram Libraries**:
  - *Chosen Approach*: Lightweight custom canvas featuring matrix-transform pan/zoom, draggable HTML table cards, and SVG cubic bezier relationship connector paths.
  - *Why*: Eliminates thousands of external dependencies, allows direct inline DOM input editing, maintains $60\text{fps}$ performance, and ensures exact visual styling alignment.
- **AI Voice Dictation (Client Web Speech API) + Server Gemini Flash Model**:
  - *Chosen Approach*: Instant browser-native speech-to-text dictation directly into the AI prompt bar, paired with a secure server-side Express proxy calling `@google/genai` (`gemini-3.8-flash`).
  - *Why*: Zero audio streaming latency, 100% microphone reliability across standard browsers, and server-side protection of the Gemini API key.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RelationalCanvas Client                            │
│                                                                             │
│  ┌────────────────────┐   ┌────────────────────────┐   ┌─────────────────┐  │
│  │ Left Explorer Bar  │   │ Interactive ERD Canvas │   │ AI & Inspector  │  │
│  │ - Table list       │   │ - Pan / Zoom viewport  │   │ - Voice input   │  │
│  │ - Quick search     │   │ - Draggable TableNodes │   │ - Chat prompt   │  │
│  │ - Field additions  │   │ - Bezier FK Connectors │   │ - Quick actions │  │
│  │ - Sample templates │   │ - Cardinality markers  │   │ - MSSQL types   │  │
│  └─────────┬──────────┘   └───────────┬────────────┘   └────────┬────────┘  │
│            │                          │                         │           │
│            └──────────────────────────┼─────────────────────────┘           │
│                                       ▼                                     │
│                     ┌───────────────────────────────────┐                   │
│                     │  Unified Schema State Store (IR)  │                   │
│                     │  - tables: TableDefinition[]      │                   │
│                     │  - relationships: Relation[]      │                   │
│                     │  - dialect: SupportedDialect      │                   │
│                     │  - localStorage Auto-Persist      │                   │
│                     └─────────────────┬─────────────────┘                   │
│                                       │                                     │
│               ┌───────────────────────┴───────────────────────┐             │
│               ▼                                               ▼             │
│     ┌─────────────────────┐                       ┌─────────────────────┐   │
│     │ Parsers & Importers │                       │ Code Generators     │   │
│     │ - MSSQL T-SQL       │                       │ - MSSQL T-SQL       │   │
│     │ - Postgres DDL      │                       │ - PostgreSQL DDL    │   │
│     │ - MySQL DDL         │                       │ - MySQL DDL         │   │
│     │ - SQLite DDL        │                       │ - SQLite DDL        │   │
│     │ - DBML / Mermaid    │                       │ - DBML & Mermaid    │   │
│     │ - Workspace JSON    │                       │ - Workspace JSON    │   │
│     └─────────────────────┘                       └─────────────────────┘   │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        │ (Fetch /api/gemini/assist)
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Node / Express Fullstack Server                          │
│                                                                             │
│   POST /api/gemini/assist           ──>  Google GenAI SDK (gemini-3.8-flash)│
│   - Receives schema IR + user prompt     with structured tool actions:      │
│   - Returns explanation + patch array    - ADD_TABLE / REMOVE_TABLE         │
│                                          - ADD_COLUMN / MODIFY_COLUMN       │
│                                          - ADD_RELATION / REFACTOR_SCHEMA   │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Core Data Entities
- `Column`: `id`, `name`, `type`, `isPrimaryKey`, `isForeignKey`, `isNullable`, `isUnique`, `defaultValue`, `references` (`{ tableId, columnId }`).
- `Table`: `id`, `name`, `columns: Column[]`, `position: { x, y }`, `colorHeader?`, `comment?`.
- `Relationship`: `id`, `sourceTableId`, `sourceColumnId`, `targetTableId`, `targetColumnId`, `cardinality` (`1:1`, `1:N`, `N:M`), `onDelete`, `onUpdate`.
- `SchemaModel`: `tables: Table[]`, `relationships: Relationship[]`, `dialect: 'postgres' | 'mysql' | 'mssql' | 'sqlite'`, `name: string`, `version: number`.

#### Verification & Reliability Plan
- Full build and TypeScript check via `compile_applet`.
- Round-trip fidelity test: Parsing MSSQL DDL with `[bracket]` syntax, `IDENTITY(1,1)`, and `NVARCHAR` -> Converting to IR -> Generating clean MSSQL DDL without loss of table/column/FK integrity.
- Standalone offline test: Verify that all diagram creation, editing, layout, and multi-format exports work completely offline without network calls.
- Voice dictation verification with graceful fallback to text chat when microphone is unavailable.
- Responsive canvas test ensuring smooth dragging, zooming (25% to 200%), and collision-free connector rendering.
