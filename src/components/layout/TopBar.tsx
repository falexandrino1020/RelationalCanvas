import React from 'react';
import { SchemaModel, SupportedDialect } from '../../types/schema';
import { Database, Download, Upload, Sparkles, FolderOpen, RefreshCw, CheckCircle2, HelpCircle } from 'lucide-react';

interface TopBarProps {
  schema: SchemaModel;
  onChangeDialect: (dialect: SupportedDialect) => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
  onOpenTemplates: () => void;
  onOpenWelcome?: () => void;
  aiPanelOpen: boolean;
  onToggleAIPanel: () => void;
  lastSavedTime: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  schema,
  onChangeDialect,
  onOpenImport,
  onOpenExport,
  onOpenTemplates,
  onOpenWelcome,
  aiPanelOpen,
  onToggleAIPanel,
  lastSavedTime,
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-[#0E1526] px-4 flex items-center justify-between shrink-0 select-none z-40">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <a href="/" className="text-base font-bold tracking-tight text-white flex items-center gap-2 hover:opacity-90">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Database className="w-4 h-4 text-white" />
          </div>
          <span className="font-['Plus_Jakarta_Sans']">RelationalCanvas</span>
        </a>

        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-800">
          <span className="text-xs font-medium text-slate-300 truncate max-w-[160px]">
            {schema.name}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
            <CheckCircle2 className="w-3 h-3" />
            <span>Saved</span>
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation & Status Metrics */}
      <div className="hidden lg:flex items-center gap-3 text-xs text-slate-400">
        <span className="font-mono tabular-nums">
          <strong className="text-slate-200">{schema.tables.length}</strong> tables
        </span>
        <span aria-hidden="true" className="text-slate-600">·</span>
        <span className="font-mono tabular-nums">
          <strong className="text-slate-200">{schema.relationships.length}</strong> relations
        </span>
        <span aria-hidden="true" className="text-slate-600">·</span>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Dialect:</span>
          <select
            value={schema.dialect}
            onChange={(e) => onChangeDialect(e.target.value as SupportedDialect)}
            className="bg-[#172136] text-indigo-300 font-mono text-xs font-semibold px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="postgres">PostgreSQL</option>
            <option value="mssql">MSSQL (T-SQL)</option>
            <option value="mysql">MySQL</option>
            <option value="sqlite">SQLite</option>
            <option value="dbml">DBML</option>
            <option value="mermaid">Mermaid ER</option>
          </select>
        </div>
      </div>

      {/* Zone 3: Primary Action Cluster */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenTemplates}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition-colors"
          title="Load pre-built starter schemas"
        >
          <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden md:inline">Templates</span>
        </button>

        <button
          onClick={onOpenImport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors shadow-sm"
          title="Import SQL, DBML, or Mermaid file"
        >
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          <span>Import</span>
        </button>

        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-colors"
          title="Export as SQL, DBML, or Mermaid"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

        {/* AI Co-Pilot Toggle */}
        <button
          onClick={onToggleAIPanel}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
            aiPanelOpen
              ? 'bg-purple-600/20 text-purple-300 border-purple-500/50 shadow-sm shadow-purple-500/20'
              : 'text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border-slate-700'
          }`}
          title="Toggle AI Schema Assistant"
        >
          <Sparkles className={`w-3.5 h-3.5 ${aiPanelOpen ? 'text-purple-400 animate-pulse' : 'text-purple-400'}`} />
          <span>AI Co-Pilot</span>
        </button>

        {onOpenWelcome && (
          <button
            onClick={onOpenWelcome}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Open Welcome Guide & Instructions"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
