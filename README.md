# RelationalCanvas 🚀

> **AI-Powered Bi-Directional SQL & ERD Visual Workbench with Database Architecture Health Auditing**  
> *Seamlessly turn raw SQL schemas into interactive visual ERDs you can edit, fine-tune Crow's Foot relationship connectors, audit physical page storage math, and generate production-grade multi-dialect migrations — with zero sign-in required.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Google Gemini](https://img.shields.io/badge/AI-Gemini%203.1%20Flash--Lite-8E75C4.svg?logo=google)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![Tests Passing](https://img.shields.io/badge/Tests-68%20Passed%20(100%25)-success.svg)](comprehensive-test.ts)

---

## 🌟 About RelationalCanvas

**RelationalCanvas** is an open-source visual database architecture workbench and schema health intelligence studio designed for software engineers, database administrators, and cloud architects. It unifies visual database modeling, deep physical storage diagnostics, and bi-directional DDL code generation into a single, high-performance canvas:

- **Bi-Directional Code & Diagram Sync**: Import SQL DDL, DBML, or Mermaid ER diagrams to instantly generate editable interactive canvases; visually design schemas and export clean, production-ready DDL migrations.
- **Crow's Foot & ER Connector Notation**: Full visual terminal symbols for `1:1`, `1:N`, `N:1`, and `N:M` relationships with authentic Crow's Foot (`⤚`), Mandatory One (`||`), Optional Zero-or-One (`o|`), Zero-or-Many (`o<`), and One-or-Many (`|>`).
- **Interactive Relationship Editor**: Click any line, pill badge, or foreign key icon to configure cardinality, swap relationship directions (Source ⇄ Target), reroute connected columns, and set `ON DELETE` / `ON UPDATE` referential actions (`CASCADE`, `SET NULL`, `RESTRICT`, `NO ACTION`) with a real-time live SVG preview.
- **Senior Database Engineer Health Audit & Storage Math**:
  - Exact in-row physical sizing calculations (accounting for PostgreSQL 24B tuple headers, NULL bitmaps, MSSQL 8,060B page limits and Unicode doubling, MySQL InnoDB alignment).
  - Physical 8KB page utilization metrics and row projections for 10K, 100K, 1M, and 10M rows.
  - Automated detection of unindexed foreign keys, fragmented random GUID primary keys, floating-point currency anti-patterns, and missing constraints with **1-click auto-remediation**.
- **Deterministic AI Co-Pilot**: Powered by Google Gemini 3.1 Flash-Lite with voice dictation, strictly scoped to relational database architecture and normalization (1NF–3NF), with zero sign-in required.
- **100% Private & Standalone**: Zero sign-in, zero tracking, and zero cloud database account lock-in. Works entirely in your browser with automated `localStorage` state persistence.

---

## ⚡ Supported Dialects & Formats

RelationalCanvas includes native deterministic parsers, code generators, and storage engines for all industry-standard engines:

| Engine / Format | Key Syntax & Capabilities Supported |
| :--- | :--- |
| **PostgreSQL** | `UUID DEFAULT gen_random_uuid()`, `SERIAL`, `TIMESTAMPTZ`, `JSONB`, `FOREIGN KEY ... ON DELETE/UPDATE ...`, explicit `CREATE INDEX` generation for indexed FKs |
| **Microsoft SQL Server (MSSQL)** | `[dbo].[TableName]`, `[ColumnName]`, `IDENTITY(1,1)`, `PRIMARY KEY CLUSTERED`, `UNIQUEIDENTIFIER`, `NVARCHAR` (2x byte sizing), `DATETIME2`, `BIT`, `NEWSEQUENTIALID()` recommendations |
| **MySQL (InnoDB)** | `AUTO_INCREMENT`, backtick escaping, `ENGINE=InnoDB`, `DATETIME`, `TINYINT(1)`, `FOREIGN KEY ... REFERENCES ...` |
| **SQLite** | `INTEGER PRIMARY KEY AUTOINCREMENT`, `TEXT`, `REAL`, `BLOB`, lightweight embedded DDL |
| **DBML** | Standard Database Markup Language (`Table users { id int [pk] }`, `Ref: orders.user_id > users.id`) |
| **Mermaid ERD** | Standard Mermaid markdown `erDiagram` with crow's foot cardinality (`||--o{`, `||--||`, `}o--o{`) |
| **SVG Vector Export** | One-click export of clean vector diagrams for technical documentation, RFCs, and architecture reviews |

---

## 🎨 Crow's Foot Notation & Relationship Editing

RelationalCanvas accurately renders Entity-Relationship (ER) connection ends:

```
Table A (Child / FK)                    Table B (Parent / PK)
+-----------------------+              +-----------------------+
| orders                |              | customers             |
|-----------------------|              |-----------------------|
| id: uuid [PK]         |              | id: uuid [PK]         |
| customer_id: uuid [FK]| >────────── || id: uuid              |
+-----------------------+              +-----------------------+
        Crow's Foot (Many)             Mandatory One (||)
```

- **Smart Facing Ports**: Connectors automatically calculate the closest facing edge of related tables (left or right) to avoid awkward loops.
- **Interactive Relationship Modal**:
  - Real-time SVG preview reflecting selected ends and colors.
  - Cardinality selection cards (`1:N`, `N:1`, `1:1`, `N:M`).
  - End notation overrides (`crows-foot`, `one`, `zero-one`, `zero-many`, `one-many`).
  - Referential integrity actions: `ON DELETE` / `ON UPDATE` (`CASCADE`, `SET NULL`, `RESTRICT`, `NO ACTION`).
  - One-click direction swapping (`Swap Direction`).

---

## 🩺 Senior Database Engineer Storage Math & Audit Engine

RelationalCanvas computes real physical disk layouts and flags architectural anti-patterns:

- **Storage Math Calculations**:
  - PostgreSQL: 24-byte heap tuple header + null bitmap + 4-byte ItemId pointer alignment.
  - MSSQL: 4-byte header + column count + null bitmap + variable-length offset array + 8,060-byte in-row page ceiling.
  - MySQL InnoDB: 5-byte record header + transaction ID / roll pointer + 16KB extent math.
- **Automated Health Checks**:
  - 🚨 **Unindexed Foreign Keys**: Detects foreign keys lacking dedicated B-tree indexes, preventing full table locks and catastrophic table scans on `DELETE` / `JOIN` operations.
  - 🚨 **Clustered PK Fragmentation**: Detects random `UUID` or `NEWID()` clustered primary keys in MSSQL/Postgres and recommends sequential alternatives (`NEWSEQUENTIALID()`, `uuid_generate_v7()`, `IDENTITY`).
  - 🚨 **Floating-Point Currency Anti-Pattern**: Identifies financial columns using `FLOAT` or `REAL` and converts them to fixed-point `DECIMAL(18,2)` / `NUMERIC` to prevent IEEE 754 rounding errors.
  - 🚨 **Missing Primary Keys**: Flags unkeyed tables and provides 1-click addition of primary keys.

---

## 🤖 AI Co-Pilot (Highest Free Tier Allowance)

RelationalCanvas is powered by **Google Gemini 3.1 Flash-Lite**, Google's ultra-fast model offering the highest free tier allowances on Google AI Studio:

- **Free Tier Limits**:
  - **15 Requests Per Minute (RPM)**
  - **1,000,000 Tokens Per Minute (TPM)**
  - **1,500 Requests Per Day (RPD)** — completely free with zero credit card required!
- **Voice Dictation**: Click the microphone button to dictate database requirements naturally using continuous browser speech recognition.
- **Strict Scope Limitation**: The AI co-pilot is bound strictly to database modeling, normalization, foreign key integrity, and cross-dialect trade-offs, politely declining non-database queries.
- **Zero Sign-In**: API requests are proxied server-side via server environment variables with no user sign-in required.

---

## 🛠️ Quickstart

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher)
- [npm](https://www.npmjs.com/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/relational-canvas.git
   cd relational-canvas
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables** (Optional for AI):
   ```bash
   cp .env.example .env
   ```
   Add your free Google Gemini API key from [Google AI Studio](https://aistudio.google.com/):
   ```env
   GEMINI_API_KEY="your-gemini-api-key"
   GEMINI_MODEL="gemini-3.1-flash-lite"
   ```
   *(Note: Even without an API key, all visual ERD editing, relationship customization, storage math, schema audits, SQL/DBML/Mermaid imports, auto-layout, and code exports work completely offline!)*

4. **Run the Test Suite**:
   ```bash
   npm test
   ```
   Runs 68 automated end-to-end tests validating imports, code generators, AI endpoints, canvas mechanics, and database engine storage calculations.

5. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Architecture

```
relational-canvas/
├── src/
│   ├── components/
│   │   ├── ai/
│   │   │   └── RightAIPanel.tsx       # AI Co-Pilot with voice dictation & chat
│   │   ├── audit/
│   │   │   └── SchemaHealthDrawer.tsx # Senior DB Engineer audit & 1-click remediation
│   │   ├── canvas/
│   │   │   ├── ERDCanvas.tsx          # Pan/zoom infinite canvas with micro-dot grid
│   │   │   ├── TableCard.tsx          # Draggable table cards with inline editing
│   │   │   ├── RelationshipLines.tsx  # Crow's Foot & ER cubic bezier connectors
│   │   │   ├── CanvasControls.tsx     # Zoom, Fit view, Auto-layout, Add Relation
│   │   │   └── MiniMap.tsx            # Viewport spatial radar
│   │   ├── layout/
│   │   │   ├── TopBar.tsx             # Wordmark, stats, and primary actions
│   │   │   └── LeftExplorer.tsx       # Table catalog search and selector
│   │   └── modals/
│   │       ├── RelationshipModal.tsx  # Visual connector & cardinality editor
│   │       ├── ImportModal.tsx        # File drag-drop & code paste importer
│   │       ├── ExportModal.tsx        # Multi-dialect DDL & SVG exporter
│   │       ├── TemplatesModal.tsx     # Pre-built realistic starter schemas
│   │       └── WelcomeModal.tsx       # First-time onboarding guide
│   ├── types/
│   │   └── schema.ts                  # SchemaModel, Table, Column, Relationship IR
│   ├── utils/
│   │   ├── storageMath.ts             # Senior DB page sizing & row projection math
│   │   ├── schemaAuditor.ts           # Anti-pattern detection & auto-fix engine
│   │   ├── sqlParser.ts               # Multi-dialect SQL DDL parser
│   │   ├── dbmlParser.ts              # DBML language parser
│   │   ├── mermaidParser.ts           # Mermaid ERD parser
│   │   ├── codeGenerators.ts          # Multi-dialect code generation
│   │   ├── autoLayout.ts              # Topological grid auto-layout
│   │   ├── typeSystem.ts              # Cross-dialect type mapping matrix
│   │   └── sampleSchemas.ts           # E-commerce, SaaS, Healthcare templates
│   ├── App.tsx                        # Application root orchestrator
│   └── main.tsx                       # React DOM entry point
├── server.ts                          # Express server with Gemini API proxy
├── comprehensive-test.ts              # 68 automated end-to-end verification tests
├── package.json
└── README.md
```

---

## 🔒 Privacy & Offline Guarantee

- **No Sign-In Required**: You will never be asked for an email, password, or credit card.
- **Local Persistence**: Diagrams are saved in your browser's `localStorage` and never sent to external servers unless you ask the AI co-pilot for advice.
- **Export Anywhere**: Back up your workspaces as raw JSON, copy your SQL migrations, or save diagram images at any time.

---

## 🤝 Contributing

Contributions are welcome! Whether you are adding a new SQL dialect, improving parser performance, or enhancing the canvas experience:

1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.
