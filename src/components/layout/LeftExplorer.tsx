import React, { useState } from 'react';
import { SchemaModel, Table } from '../../types/schema';
import { Table as TableIcon, Plus, Search, ChevronLeft, ChevronRight, Hash, Layers } from 'lucide-react';

interface LeftExplorerProps {
  schema: SchemaModel;
  selectedTableId: string | null;
  onSelectTable: (tableId: string) => void;
  onAddTable: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const LeftExplorer: React.FC<LeftExplorerProps> = ({
  schema,
  selectedTableId,
  onSelectTable,
  onAddTable,
  isOpen,
  onToggle,
}) => {
  const [search, setSearch] = useState('');

  const filteredTables = schema.tables.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.columns.some(c => c.name.toLowerCase().includes(search.toLowerCase()))
  );

  if (!isOpen) {
    return (
      <div className="w-10 border-r border-slate-800 bg-[#0E1526] flex flex-col items-center py-3 select-none shrink-0 z-30">
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors mb-4"
          title="Expand Schema Explorer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="rotate-90 text-[11px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap mt-8">
          Tables ({schema.tables.length})
        </div>
      </div>
    );
  }

  return (
    <aside className="w-64 border-r border-slate-800 bg-[#0E1526] flex flex-col select-none shrink-0 z-30">
      {/* Top Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Tables ({schema.tables.length})
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onAddTable}
            className="p-1 rounded text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
            title="Create Table"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={onToggle}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-slate-800/80">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tables or columns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#131B2E] text-slate-200 placeholder-slate-500 text-xs pl-8 pr-2 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Tables List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredTables.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            {search ? 'No tables found' : 'No tables yet. Click + to add.'}
          </div>
        ) : (
          filteredTables.map(t => {
            const isSelected = selectedTableId === t.id;
            const pkCount = t.columns.filter(c => c.isPrimaryKey).length;
            const fkCount = t.columns.filter(c => c.isForeignKey).length;

            return (
              <button
                key={t.id}
                onClick={() => onSelectTable(t.id)}
                className={`w-full text-left p-2 rounded-lg transition-colors flex items-center justify-between group ${
                  isSelected
                    ? 'bg-indigo-600/20 border border-indigo-500/40 text-slate-100'
                    : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: t.colorHeader || '#3B82F6' }}
                  />
                  <span className="text-xs font-mono font-medium truncate">
                    {t.name}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-slate-500 font-mono">
                  <span>{t.columns.length} cols</span>
                  {fkCount > 0 && <span className="text-cyan-400">· {fkCount}fk</span>}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Quick Add CTA at bottom */}
      <div className="p-2 border-t border-slate-800">
        <button
          onClick={onAddTable}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700/80 text-xs font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-indigo-400" />
          <span>New Table</span>
        </button>
      </div>
    </aside>
  );
};
