import React, { useState, useRef, useEffect } from 'react';
import { Column, SupportedDialect, Table } from '../../types/schema';
import { DIALECT_TYPES, COMMON_COLORS } from '../../utils/typeSystem';
import { Key, Link2, Plus, Trash2, MoreHorizontal, Check, Edit2, Palette } from 'lucide-react';

interface TableCardProps {
  table: Table;
  dialect: SupportedDialect;
  zoom: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateTable: (updated: Table) => void;
  onDeleteTable: (tableId: string) => void;
  onStartConnection: (tableId: string, columnId: string, e: React.MouseEvent) => void;
  onCompleteConnection: (tableId: string, columnId: string) => void;
  onDragStart: (tableId: string, e: React.MouseEvent) => void;
}

export const TableCard: React.FC<TableCardProps> = ({
  table,
  dialect,
  zoom,
  isSelected,
  onSelect,
  onUpdateTable,
  onDeleteTable,
  onStartConnection,
  onCompleteConnection,
  onDragStart,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tableName, setTableName] = useState(table.name);
  const [activeTypePickerColId, setActiveTypePickerColId] = useState<string | null>(null);
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editingColName, setEditingColName] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    setTableName(table.name);
  }, [table.name]);

  const handleSaveTableName = () => {
    if (tableName.trim() && tableName.trim() !== table.name) {
      onUpdateTable({ ...table, name: tableName.trim() });
    }
    setIsEditingName(false);
  };

  const handleAddColumn = () => {
    const defaultType = dialect === 'postgres' ? 'varchar(255)' : dialect === 'mssql' ? 'nvarchar(255)' : 'varchar(255)';
    const newCol: Column = {
      id: `col_${Math.random().toString(36).substring(2, 9)}`,
      name: `col_${table.columns.length + 1}`,
      type: defaultType,
      isPrimaryKey: false,
      isForeignKey: false,
      isNullable: true,
      isUnique: false,
    };
    onUpdateTable({
      ...table,
      columns: [...table.columns, newCol],
    });
  };

  const handleUpdateColumn = (colId: string, patch: Partial<Column>) => {
    onUpdateTable({
      ...table,
      columns: table.columns.map(c => c.id === colId ? { ...c, ...patch } : c),
    });
  };

  const handleDeleteColumn = (colId: string) => {
    onUpdateTable({
      ...table,
      columns: table.columns.filter(c => c.id !== colId),
    });
  };

  const dialectCategories = DIALECT_TYPES[dialect] || DIALECT_TYPES.postgres;
  const headerColor = table.colorHeader || '#3B82F6';

  return (
    <div
      id={`table-card-${table.id}`}
      style={{
        transform: `translate(${table.position.x}px, ${table.position.y}px)`,
      }}
      className={`absolute w-72 bg-[#111827] rounded-xl border select-none transition-shadow duration-150 ${
        isSelected
          ? 'border-indigo-500 shadow-xl shadow-indigo-500/20 ring-1 ring-indigo-500'
          : 'border-slate-800 shadow-lg shadow-black/40 hover:border-slate-700'
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Top Accent Strip */}
      <div className="h-1.5 w-full rounded-t-xl" style={{ backgroundColor: headerColor }} />

      {/* Table Header */}
      <div
        className="px-3.5 py-2.5 flex items-center justify-between border-b border-slate-800/80 cursor-grab active:cursor-grabbing bg-slate-900/60 rounded-t-[10px]"
        onMouseDown={(e) => onDragStart(table.id, e)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: headerColor }} />
          {isEditingName ? (
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              onBlur={handleSaveTableName}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTableName()}
              autoFocus
              className="bg-slate-800 text-sm font-semibold text-slate-100 px-1.5 py-0.5 rounded border border-indigo-500 outline-none w-full font-mono"
            />
          ) : (
            <span
              onDoubleClick={() => setIsEditingName(true)}
              className="text-sm font-semibold text-slate-100 truncate font-mono tracking-tight cursor-text hover:text-indigo-300"
              title="Double click to rename table"
            >
              {table.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2" onMouseDown={(e) => e.stopPropagation()}>
          {/* Color Palette Popover */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Change header color"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>
            {showColorPicker && (
              <div className="absolute top-full right-0 mt-1 p-2 bg-[#1A2234] border border-slate-700 rounded-lg shadow-xl z-50 flex gap-1.5">
                {COMMON_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => {
                      onUpdateTable({ ...table, colorHeader: c.value });
                      setShowColorPicker(false);
                    }}
                    className="w-4 h-4 rounded-full border border-white/20 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleAddColumn}
            className="p-1 rounded text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
            title="Add Column"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDeleteTable(table.id)}
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Delete Table"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Columns List */}
      <div className="py-1">
        {table.columns.length === 0 ? (
          <div className="px-3 py-3 text-center text-xs text-slate-500 italic">
            No columns yet. Click + to add.
          </div>
        ) : (
          table.columns.map((col, idx) => (
            <div
              key={col.id}
              id={`col-row-${table.id}-${col.id}`}
              className="group relative flex items-center justify-between px-3 py-1.5 text-xs hover:bg-slate-800/60 transition-colors"
            >
              {/* Left Connector Handle (Target / Port) */}
              <button
                className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-900 border border-slate-600 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-125 hover:border-indigo-400 hover:bg-indigo-950 transition-all z-20 cursor-crosshair"
                title="Drop to connect foreign key"
                onClick={(e) => {
                  e.stopPropagation();
                  onCompleteConnection(table.id, col.id);
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-indigo-400" />
              </button>

              {/* Column Identifiers & Name */}
              <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                {col.isPrimaryKey ? (
                  <span title="Primary Key" className="text-amber-400 shrink-0">
                    <Key className="w-3 h-3" />
                  </span>
                ) : col.isForeignKey ? (
                  <span title="Foreign Key" className="text-cyan-400 shrink-0">
                    <Link2 className="w-3 h-3" />
                  </span>
                ) : (
                  <div className="w-3 h-3 shrink-0" />
                )}

                {editingColId === col.id ? (
                  <input
                    type="text"
                    value={editingColName}
                    onChange={(e) => setEditingColName(e.target.value)}
                    onBlur={() => {
                      if (editingColName.trim()) {
                        handleUpdateColumn(col.id, { name: editingColName.trim() });
                      }
                      setEditingColId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editingColName.trim()) {
                          handleUpdateColumn(col.id, { name: editingColName.trim() });
                        }
                        setEditingColId(null);
                      }
                    }}
                    autoFocus
                    className="bg-slate-800 text-slate-100 px-1 py-0.5 rounded border border-indigo-500 font-mono text-xs w-28 outline-none"
                  />
                ) : (
                  <span
                    onClick={() => {
                      setEditingColId(col.id);
                      setEditingColName(col.name);
                    }}
                    className={`font-mono truncate cursor-pointer hover:underline ${
                      col.isPrimaryKey ? 'font-semibold text-slate-100' : 'text-slate-300'
                    }`}
                    title="Click to rename"
                  >
                    {col.name}
                  </span>
                )}
              </div>

              {/* Data Type & Constraint Badges */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Type Button */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTypePickerColId(activeTypePickerColId === col.id ? null : col.id);
                    }}
                    className="font-mono text-[11px] text-slate-400 hover:text-indigo-300 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800/80 hover:border-slate-700 transition-colors"
                  >
                    {col.type}
                  </button>

                  {/* Type Picker Dropdown */}
                  {activeTypePickerColId === col.id && (
                    <div
                      className="absolute right-0 top-full mt-1 w-56 max-h-60 overflow-y-auto bg-[#1A2234] border border-slate-700 rounded-lg shadow-2xl z-50 p-2 text-left"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-[10px] uppercase font-semibold text-slate-400 px-2 py-1 tracking-wider border-b border-slate-700/60 mb-1">
                        {dialect.toUpperCase()} Types
                      </div>
                      {dialectCategories.map(cat => (
                        <div key={cat.name} className="mb-2">
                          <div className="text-[10px] font-semibold text-indigo-400 px-2 py-0.5">
                            {cat.name}
                          </div>
                          <div className="grid grid-cols-1 gap-0.5">
                            {cat.types.map(t => (
                              <button
                                key={t}
                                onClick={() => {
                                  handleUpdateColumn(col.id, { type: t });
                                  setActiveTypePickerColId(null);
                                }}
                                className={`text-left px-2 py-1 text-xs rounded font-mono hover:bg-indigo-600 hover:text-white transition-colors ${
                                  col.type.toLowerCase() === t.toLowerCase() ? 'bg-indigo-500/20 text-indigo-300 font-semibold' : 'text-slate-300'
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Constraint Toggles */}
                <button
                  onClick={() => handleUpdateColumn(col.id, { isPrimaryKey: !col.isPrimaryKey })}
                  className={`px-1 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    col.isPrimaryKey ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title="Toggle Primary Key"
                >
                  PK
                </button>

                <button
                  onClick={() => handleUpdateColumn(col.id, { isNullable: !col.isNullable })}
                  className={`px-1 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    !col.isNullable ? 'bg-slate-700 text-slate-200 font-semibold' : 'text-slate-500 hover:text-slate-400'
                  }`}
                  title={col.isNullable ? 'Nullable (click to make NOT NULL)' : 'NOT NULL (click to make nullable)'}
                >
                  {col.isNullable ? 'null' : 'NN'}
                </button>

                {/* Delete Column Button */}
                <button
                  onClick={() => handleDeleteColumn(col.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-0.5 transition-opacity"
                  title="Delete Column"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* Right Connector Handle (Source / Drag) */}
              <button
                className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-900 border border-slate-600 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-125 hover:border-cyan-400 hover:bg-cyan-950 transition-all z-20 cursor-crosshair"
                title="Drag to connect relationship"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onStartConnection(table.id, col.id, e);
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-cyan-400" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer Add Column Button */}
      <div className="px-3 py-1.5 border-t border-slate-800/60 bg-slate-900/30 rounded-b-xl flex items-center justify-between text-[11px] text-slate-500">
        <span>{table.columns.length} columns</span>
        <button
          onClick={handleAddColumn}
          className="flex items-center gap-1 hover:text-indigo-400 transition-colors"
        >
          <Plus className="w-3 h-3" /> Add Field
        </button>
      </div>
    </div>
  );
};
