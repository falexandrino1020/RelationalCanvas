# RelationalCanvas 🚀

> **AI-Powered Bi-Directional SQL & ERD Visual Workbench**  
> *Seamlessly turn raw SQL schemas into interactive visual ERDs you can edit, and turn visual ERDs into production-grade multi-dialect database migrations — with zero sign-in required.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Google Gemini](https://img.shields.io/badge/AI-Gemini%203.1%20Flash--Lite-8E75C4.svg?logo=google)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)

---

## 🌟 Overview

**RelationalCanvas** is an open-source visual database architecture studio designed for developers, database administrators, and software architects. It bridges the gap between database code and visual architecture:

- **SQL to ERD**: Drop or paste existing `.sql` DDL, DBML, or Mermaid diagram files to immediately generate an interactive, drag-and-drop entity relationship diagram.
- **ERD to SQL**: Visually add tables, edit columns, configure primary/foreign keys, and drag relationship connectors — then export clean, production-ready DDL migrations.
- **AI Co-Pilot with Voice**: Converse with an AI database architect using speech dictation or text. Ask the AI to design schemas, normalize tables (1NF–3NF), optimize indexes, or convert dialect syntax.
- **Zero Sign-In Required**: 100% standalone and private. No user accounts, passwords, or cloud database provisioning needed. Works offline with automatic browser `localStorage` persistence.

---

## ⚡ Supported Dialects & Formats

RelationalCanvas features native deterministic parsers and code generators for all major relational database engines:

| Engine / Format | Key Syntax & Features Supported |
| :--- | :--- |
| **PostgreSQL** | `UUID DEFAULT gen_random_uuid()`, `SERIAL`, `TIMESTAMPTZ`, `JSONB`, `FOREIGN KEY ... REFERENCES ...` |
| **Microsoft SQL Server (MSSQL)** | `[dbo].[TableName]`, `[ColumnName]`, `IDENTITY(1,1)`, `PRIMARY KEY CLUSTERED`, `UNIQUEIDENTIFIER`, `NVARCHAR`, `DATETIME2`, `BIT` |
| **MySQL** | `AUTO_INCREMENT`, backtick escaping, `ENGINE=InnoDB`, `DATETIME`, `TINYINT(1)` |
| **SQLite** | `INTEGER PRIMARY KEY AUTOINCREMENT`, `TEXT`, `REAL`, `BLOB` |
| **DBML** | Standard Database Markup Language notation (`Table users { id int [pk] }`, `Ref: ...`) |
| **Mermaid ERD** | Mermaid markdown `erDiagram` with crow's foot cardinality (`||--o{`, `||--||`) |
| **SVG Vector Export** | One-click export of the visual diagram as a clean vector graphic for documentation |

---

## 🤖 AI Co-Pilot (Highest Free Tier Allowance)

RelationalCanvas is powered by **Google Gemini 3.1 Flash-Lite**, Google's ultra-fast model offering the highest free tier allowances on Google AI Studio:

- **Free Tier Limits**:
  - **15 Requests Per Minute (RPM)**
  - **1,000,000 Tokens Per Minute (TPM)**
  - **1,500 Requests Per Day (RPD)** — completely free with zero credit card required!
- **Voice-Enabled Dictation**: Click the microphone button to dictate database requirements naturally using continuous browser speech recognition.
- **Design Advisory & Safety Scope**: The AI co-pilot is bound strictly to database modeling, normalization, foreign key integrity, and cross-dialect trade-offs.
- **Zero Sign-In**: The app proxies AI requests server-side without prompting users to sign in or register accounts. Server environment variables supply the API key securely.

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
   GEMINI_MODEL="gemini-3.8-flash"
   ```
   *(Note: Even without an API key, all visual ERD editing, SQL/DBML/Mermaid imports, auto-layout, and code exports work completely offline!)*

4. **Start the development server**:
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
│   │   ├── canvas/
│   │   │   ├── ERDCanvas.tsx          # Pan/zoom infinite canvas with grid
│   │   │   ├── TableCard.tsx          # Draggable table cards with inline editing
│   │   │   ├── RelationshipLines.tsx  # Dynamic SVG cubic bezier connectors
│   │   │   ├── CanvasControls.tsx     # Zoom, Fit view, Auto-layout buttons
│   │   │   └── MiniMap.tsx            # Viewport minimap radar
│   │   ├── layout/
│   │   │   ├── TopBar.tsx             # Wordmark, stats, and primary actions
│   │   │   └── LeftExplorer.tsx       # Table catalog search and selector
│   │   └── modals/
│   │       ├── ImportModal.tsx        # File drag-drop & code paste importer
│   │       ├── ExportModal.tsx        # Multi-dialect DDL & SVG exporter
│   │       └── TemplatesModal.tsx     # Pre-built realistic starter schemas
│   ├── types/
│   │   └── schema.ts                  # SchemaModel, Table, Column, Relationship IR
│   ├── utils/
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

Contributions are welcome! Whether you are adding a new SQL dialect (e.g. Oracle, CockroachDB), improving parser performance, or enhancing the canvas experience:

1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.
