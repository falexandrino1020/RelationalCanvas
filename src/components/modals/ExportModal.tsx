import React, { useState, useMemo } from 'react';
import { SchemaModel, SupportedDialect } from '../../types/schema';
import {
  generatePostgres,
  generateMSSQL,
  generateMySQL,
  generateSQLite,
  generateDBML,
  generateMermaid,
} from '../../utils/codeGenerators';
import { X, Copy, Check, Download, Image as ImageIcon, FileCode, Layers } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  schema: SchemaModel;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  schema,
}) => {
  const [activeTab, setActiveTab] = useState<'postgres' | 'mssql' | 'mysql' | 'sqlite' | 'dbml' | 'mermaid' | 'json'>(
    schema.dialect === 'mssql' ? 'mssql' : 'postgres'
  );
  const [copied, setCopied] = useState(false);

  const exportedCode = useMemo(() => {
    switch (activeTab) {
      case 'postgres':
        return generatePostgres(schema);
      case 'mssql':
        return generateMSSQL(schema);
      case 'mysql':
        return generateMySQL(schema);
      case 'sqlite':
        return generateSQLite(schema);
      case 'dbml':
        return generateDBML(schema);
      case 'mermaid':
        return generateMermaid(schema);
      case 'json':
        return JSON.stringify(schema, null, 2);
      default:
        return generatePostgres(schema);
    }
  }, [activeTab, schema]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(exportedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const extensions: Record<string, string> = {
      postgres: 'postgres.sql',
      mssql: 'mssql.sql',
      mysql: 'mysql.sql',
      sqlite: 'sqlite.sql',
      dbml: 'dbml',
      mermaid: 'mmd',
      json: 'json',
    };

    const ext = extensions[activeTab] || 'sql';
    const filename = `${schema.name.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'schema'}.${ext}`;

    const blob = new Blob([exportedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSVG = () => {
    // Generate clean SVG representation of the diagram
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    schema.tables.forEach(t => {
      minX = Math.min(minX, t.position.x);
      minY = Math.min(minY, t.position.y);
      maxX = Math.max(maxX, t.position.x + 300);
      maxY = Math.max(maxY, t.position.y + 60 + t.columns.length * 32);
    });

    const padding = 60;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX - padding} ${minY - padding} ${width} ${height}" style="background-color: #0B0F19; font-family: monospace;">\n`;

    // Draw background
    svgContent += `  <rect x="${minX - padding}" y="${minY - padding}" width="${width}" height="${height}" fill="#0B0F19" />\n`;

    // Draw Tables
    schema.tables.forEach(t => {
      const hColor = t.colorHeader || '#3B82F6';
      const tHeight = 44 + t.columns.length * 28;
      svgContent += `  <g transform="translate(${t.position.x}, ${t.position.y})">\n`;
      svgContent += `    <rect width="288" height="${tHeight}" rx="10" fill="#111827" stroke="#1F2937" stroke-width="1.5" />\n`;
      svgContent += `    <path d="M 0 10 Q 0 0 10 0 L 278 0 Q 288 0 288 10 L 288 38 L 0 38 Z" fill="#1F293B" />\n`;
      svgContent += `    <rect width="288" height="3" rx="1.5" fill="${hColor}" />\n`;
      svgContent += `    <text x="14" y="24" fill="#F8FAFC" font-size="13" font-weight="bold">${t.name}</text>\n`;

      t.columns.forEach((c, idx) => {
        const y = 44 + idx * 28 + 18;
        const pkIcon = c.isPrimaryKey ? '🔑 ' : c.isForeignKey ? '🔗 ' : '   ';
        svgContent += `    <text x="12" y="${y}" fill="${c.isPrimaryKey ? '#FBBF24' : '#E2E8F0'}" font-size="11">${pkIcon}${c.name}</text>\n`;
        svgContent += `    <text x="276" y="${y}" text-anchor="end" fill="#94A3B8" font-size="11">${c.type}</text>\n`;
      });

      svgContent += `  </g>\n`;
    });

    svgContent += `</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schema.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_diagram.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none">
      <div className="w-full max-w-4xl bg-[#111827] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-100 font-['Plus_Jakarta_Sans']">
              Export Database Schema & Diagram
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-4 py-2 border-b border-slate-800 bg-[#0E1526] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'postgres', label: 'PostgreSQL' },
              { id: 'mssql', label: 'MSSQL (T-SQL)' },
              { id: 'mysql', label: 'MySQL' },
              { id: 'sqlite', label: 'SQLite' },
              { id: 'dbml', label: 'DBML' },
              { id: 'mermaid', label: 'Mermaid ER' },
              { id: 'json', label: 'Workspace JSON' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportSVG}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:text-cyan-200 bg-cyan-950/40 hover:bg-cyan-950/70 border border-cyan-800/60 rounded-lg transition-colors"
            title="Download visual ERD as high-resolution SVG vector"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Export SVG Diagram</span>
          </button>
        </div>

        {/* Code Content */}
        <div className="flex-1 p-4 overflow-y-auto bg-[#0B0F19]">
          <pre className="font-mono text-xs text-slate-200 whitespace-pre leading-relaxed select-text p-3 bg-slate-950/60 rounded-xl border border-slate-900 overflow-x-auto">
            {exportedCode}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="text-xs text-slate-400 font-mono">
            {schema.tables.length} tables · {schema.relationships.length} foreign key relationships
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadFile}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
