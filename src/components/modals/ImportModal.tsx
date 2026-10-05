import React, { useState } from 'react';
import { SchemaModel, SupportedDialect } from '../../types/schema';
import { parseSQLDDL } from '../../utils/sqlParser';
import { parseDBML } from '../../utils/dbmlParser';
import { parseMermaidER } from '../../utils/mermaidParser';
import { runAutoLayout } from '../../utils/autoLayout';
import { X, Upload, FileCode, Check, AlertCircle } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSchema: (schema: SchemaModel) => void;
  currentDialect: SupportedDialect;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportSchema,
  currentDialect,
}) => {
  const [inputText, setInputText] = useState('');
  const [format, setFormat] = useState<string>('auto');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInputText(content);

      // Auto detect format from file extension
      const name = file.name.toLowerCase();
      if (name.endsWith('.dbml')) setFormat('dbml');
      else if (name.endsWith('.mmd') || name.endsWith('.mermaid')) setFormat('mermaid');
      else if (name.endsWith('.json')) setFormat('json');
      else if (name.endsWith('.sql')) setFormat('sql');
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    setError(null);
    const trimmed = inputText.trim();
    if (!trimmed) {
      setError('Please provide SQL DDL or ERD file content.');
      return;
    }

    try {
      let parsed: SchemaModel;

      // JSON Workspace Import
      if (format === 'json' || (trimmed.startsWith('{') && trimmed.includes('"tables"'))) {
        parsed = JSON.parse(trimmed);
        if (!parsed.tables || !Array.isArray(parsed.tables)) {
          throw new Error('Invalid workspace JSON file format.');
        }
      } else if (format === 'dbml' || (format === 'auto' && /Table\s+[a-zA-Z0-9_]+\s*\{/i.test(trimmed))) {
        parsed = parseDBML(trimmed);
      } else if (format === 'mermaid' || (format === 'auto' && (trimmed.startsWith('erDiagram') || /\|\|--o\{/i.test(trimmed)))) {
        parsed = parseMermaidER(trimmed);
      } else {
        // Standard SQL parser
        const targetDialect = (format === 'sql' || format === 'auto') ? currentDialect : (format as SupportedDialect);
        parsed = parseSQLDDL(trimmed, targetDialect);
      }

      if (parsed.tables.length === 0) {
        throw new Error('No tables were found in the provided input. Check syntax and try again.');
      }

      // Run auto layout to make sure imported tables look neat
      const organized = runAutoLayout(parsed);
      onImportSchema(organized);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to parse schema. Please verify syntax.');
    }
  };

  const sampleSQL = `-- Sample SQL DDL:
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  total_amount NUMERIC(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending'
);`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none">
      <div className="w-full max-w-2xl bg-[#111827] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-100 font-['Plus_Jakarta_Sans']">
              Import Schema / ERD
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Format Selector & File Upload */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Syntax Format:</span>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="bg-[#1A2234] text-slate-200 font-mono text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500"
              >
                <option value="auto">Auto-Detect Syntax</option>
                <option value="postgres">PostgreSQL DDL</option>
                <option value="mssql">MSSQL (T-SQL) DDL</option>
                <option value="mysql">MySQL DDL</option>
                <option value="sqlite">SQLite DDL</option>
                <option value="dbml">DBML Format</option>
                <option value="mermaid">Mermaid ER Diagram</option>
                <option value="json">RelationalCanvas JSON</option>
              </select>
            </div>

            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 cursor-pointer transition-colors">
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>Choose File (.sql, .dbml, .mmd)</span>
              <input
                type="file"
                accept=".sql,.dbml,.mmd,.mermaid,.json,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Paste SQL DDL, DBML, or Mermaid Code:
              </label>
              <button
                type="button"
                onClick={() => setInputText(sampleSQL)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
              >
                Load Sample DDL
              </button>
            </div>
            <textarea
              rows={12}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your CREATE TABLE statements, DBML, or Mermaid erDiagram here..."
              className="w-full bg-[#0B0F19] text-slate-200 font-mono text-xs p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 transition-colors leading-relaxed select-text"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Generate & Visualize ERD</span>
          </button>
        </div>
      </div>
    </div>
  );
};
