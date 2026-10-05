/**
 * RelationalCanvas - Main Application Component
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SchemaModel, SupportedDialect, Table } from './types/schema';
import { SAMPLE_SCHEMAS } from './utils/sampleSchemas';
import { TopBar } from './components/layout/TopBar';
import { LeftExplorer } from './components/layout/LeftExplorer';
import { ERDCanvas } from './components/canvas/ERDCanvas';
import { RightAIPanel } from './components/ai/RightAIPanel';
import { ImportModal } from './components/modals/ImportModal';
import { ExportModal } from './components/modals/ExportModal';
import { TemplatesModal } from './components/modals/TemplatesModal';
import { WelcomeModal } from './components/modals/WelcomeModal';
import { SchemaHealthDrawer } from './components/audit/SchemaHealthDrawer';
import { runSchemaAudit } from './utils/schemaAudit';
import { normalizeType } from './utils/typeSystem';

const STORAGE_KEY = 'relational_canvas_active_schema';

const EMPTY_SCHEMA: SchemaModel = {
  id: 'schema_new',
  name: 'New Database Workspace',
  dialect: 'postgres',
  tables: [],
  relationships: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export default function App() {
  // Initialize from localStorage or start completely blank (no data preloaded)
  const [schema, setSchema] = useState<SchemaModel>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tables && Array.isArray(parsed.tables)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load saved schema from localStorage', e);
    }
    return EMPTY_SCHEMA;
  });

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [healthDrawerOpen, setHealthDrawerOpen] = useState(false);

  // Senior Database Engineering Audit Report & Storage calculations
  const auditReport = useMemo(() => runSchemaAudit(schema), [schema]);

  // Modals
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(() => {
    try {
      return !localStorage.getItem('relational_canvas_has_visited');
    } catch {
      return true;
    }
  });

  const handleCloseWelcomeModal = () => {
    setWelcomeModalOpen(false);
    try {
      localStorage.setItem('relational_canvas_has_visited', 'true');
    } catch {}
  };

  const [lastSavedTime, setLastSavedTime] = useState<number>(Date.now());

  // Auto-save debounced to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
        setLastSavedTime(Date.now());
      } catch (e) {
        console.error('Failed to auto-save schema', e);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [schema]);

  // Handle changing dialect (normalizes column types to target dialect syntax)
  const handleChangeDialect = (newDialect: SupportedDialect) => {
    const updatedTables: Table[] = schema.tables.map(table => ({
      ...table,
      columns: table.columns.map(col => ({
        ...col,
        type: normalizeType(col.type, newDialect),
      })),
    }));

    setSchema({
      ...schema,
      dialect: newDialect,
      tables: updatedTables,
      updatedAt: Date.now(),
    });
  };

  const handleAddTable = () => {
    const newTableId = `tbl_${Math.random().toString(36).substring(2, 9)}`;
    const newTableName = `table_${schema.tables.length + 1}`;

    const pkType = schema.dialect === 'mssql' ? 'uniqueidentifier' : schema.dialect === 'postgres' ? 'uuid' : 'int';
    const pkDefault = schema.dialect === 'mssql' ? 'NEWID()' : schema.dialect === 'postgres' ? 'gen_random_uuid()' : undefined;

    const newTable: Table = {
      id: newTableId,
      name: newTableName,
      position: { x: 120 + (schema.tables.length % 3) * 320, y: 120 + Math.floor(schema.tables.length / 3) * 260 },
      columns: [
        {
          id: `col_${Math.random().toString(36).substring(2, 9)}`,
          name: 'id',
          type: pkType,
          isPrimaryKey: true,
          isForeignKey: false,
          isNullable: false,
          isUnique: true,
          defaultValue: pkDefault,
        },
      ],
    };

    setSchema({
      ...schema,
      tables: [...schema.tables, newTable],
      updatedAt: Date.now(),
    });
    setSelectedTableId(newTableId);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setExportModalOpen(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setImportModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0B0F19] text-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Strict Top Bar Contract Header */}
      <TopBar
        schema={schema}
        onChangeDialect={handleChangeDialect}
        onOpenImport={() => setImportModalOpen(true)}
        onOpenExport={() => setExportModalOpen(true)}
        onOpenTemplates={() => setTemplatesModalOpen(true)}
        onOpenWelcome={() => setWelcomeModalOpen(true)}
        onOpenHealthDrawer={() => setHealthDrawerOpen(true)}
        healthScore={auditReport.score}
        auditIssueCount={auditReport.issues.length}
        aiPanelOpen={aiPanelOpen}
        onToggleAIPanel={() => setAiPanelOpen(!aiPanelOpen)}
        lastSavedTime={lastSavedTime}
      />

      {/* Main Studio Body Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Schema Explorer */}
        <LeftExplorer
          schema={schema}
          selectedTableId={selectedTableId}
          onSelectTable={(id) => setSelectedTableId(id)}
          onAddTable={handleAddTable}
          isOpen={explorerOpen}
          onToggle={() => setExplorerOpen(!explorerOpen)}
        />

        {/* Center Interactive ERD Canvas */}
        <ERDCanvas
          schema={schema}
          onUpdateSchema={setSchema}
          selectedTableId={selectedTableId}
          onSelectTable={setSelectedTableId}
          onOpenTemplates={() => setTemplatesModalOpen(true)}
          onOpenImport={() => setImportModalOpen(true)}
        />

        {/* Right AI Assistant & Voice Co-Pilot */}
        <RightAIPanel
          schema={schema}
          onApplySchemaUpdate={(newSchema) => {
            setSchema(newSchema);
          }}
          isOpen={aiPanelOpen}
          onClose={() => setAiPanelOpen(false)}
        />
      </div>

      {/* Senior Database Engineering Audit & Storage Drawer */}
      <SchemaHealthDrawer
        isOpen={healthDrawerOpen}
        onClose={() => setHealthDrawerOpen(false)}
        schema={schema}
        onUpdateSchema={setSchema}
      />

      {/* Modals */}
      <WelcomeModal
        isOpen={welcomeModalOpen}
        onClose={handleCloseWelcomeModal}
        onOpenTemplates={() => setTemplatesModalOpen(true)}
        onOpenImport={() => setImportModalOpen(true)}
        onAddFirstTable={handleAddTable}
      />

      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportSchema={(newSchema) => {
          setSchema(newSchema);
          setSelectedTableId(null);
        }}
        currentDialect={schema.dialect}
      />

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        schema={schema}
      />

      <TemplatesModal
        isOpen={templatesModalOpen}
        onClose={() => setTemplatesModalOpen(false)}
        onSelectTemplate={(templateSchema) => {
          setSchema(templateSchema);
          setSelectedTableId(null);
        }}
      />
    </div>
  );
}
