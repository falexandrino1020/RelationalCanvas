import React, { useState, useEffect } from 'react';
import { Table, Relationship, Cardinality, EndNotation } from '../../types/schema';
import { X, ArrowRightLeft, Trash2, Check, HelpCircle, Link2, ShieldAlert } from 'lucide-react';

interface RelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: Table[];
  relationship?: Relationship | null;
  defaultSourceTableId?: string;
  defaultSourceColumnId?: string;
  onSave: (relationship: Relationship) => void;
  onDelete?: (relationshipId: string) => void;
}

export const RelationshipModal: React.FC<RelationshipModalProps> = ({
  isOpen,
  onClose,
  tables,
  relationship,
  defaultSourceTableId,
  defaultSourceColumnId,
  onSave,
  onDelete,
}) => {
  const isEditing = Boolean(relationship);

  const [sourceTableId, setSourceTableId] = useState<string>('');
  const [sourceColumnId, setSourceColumnId] = useState<string>('');
  const [targetTableId, setTargetTableId] = useState<string>('');
  const [targetColumnId, setTargetColumnId] = useState<string>('');

  const [cardinality, setCardinality] = useState<Cardinality>('1:N');
  const [sourceEnd, setSourceEnd] = useState<EndNotation>('crows-foot');
  const [targetEnd, setTargetEnd] = useState<EndNotation>('one');

  const [name, setName] = useState<string>('');
  const [onDeleteAction, setOnDeleteAction] = useState<'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'>('NO ACTION');
  const [onUpdateAction, setOnUpdateAction] = useState<'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'>('NO ACTION');

  // Initialize or reset form when modal opens or relationship changes
  useEffect(() => {
    if (relationship) {
      setSourceTableId(relationship.sourceTableId);
      setSourceColumnId(relationship.sourceColumnId);
      setTargetTableId(relationship.targetTableId);
      setTargetColumnId(relationship.targetColumnId);
      setCardinality(relationship.cardinality || '1:N');
      setSourceEnd(relationship.sourceEnd || (relationship.cardinality === '1:1' ? 'one' : 'crows-foot'));
      setTargetEnd(relationship.targetEnd || (relationship.cardinality === 'N:M' ? 'crows-foot' : 'one'));
      setName(relationship.name || '');
      setOnDeleteAction(relationship.onDelete || 'NO ACTION');
      setOnUpdateAction(relationship.onUpdate || 'NO ACTION');
    } else {
      const initialSrcTbl = defaultSourceTableId || (tables.length > 0 ? tables[0].id : '');
      const srcTblObj = tables.find(t => t.id === initialSrcTbl);
      const initialSrcCol = defaultSourceColumnId || (srcTblObj?.columns[0]?.id || '');

      const initialTgtTbl = tables.find(t => t.id !== initialSrcTbl)?.id || (tables.length > 1 ? tables[1].id : initialSrcTbl);
      const tgtTblObj = tables.find(t => t.id === initialTgtTbl);
      const initialTgtCol = tgtTblObj?.columns.find(c => c.isPrimaryKey)?.id || tgtTblObj?.columns[0]?.id || '';

      setSourceTableId(initialSrcTbl);
      setSourceColumnId(initialSrcCol);
      setTargetTableId(initialTgtTbl);
      setTargetColumnId(initialTgtCol);
      setCardinality('1:N');
      setSourceEnd('crows-foot');
      setTargetEnd('one');
      setName(srcTblObj && tgtTblObj ? `fk_${srcTblObj.name}_${tgtTblObj.name}` : '');
      setOnDeleteAction('NO ACTION');
      setOnUpdateAction('NO ACTION');
    }
  }, [relationship, isOpen, tables, defaultSourceTableId, defaultSourceColumnId]);

  if (!isOpen) return null;

  const currentSourceTable = tables.find(t => t.id === sourceTableId);
  const currentTargetTable = tables.find(t => t.id === targetTableId);
  const currentSourceCol = currentSourceTable?.columns.find(c => c.id === sourceColumnId);
  const currentTargetCol = currentTargetTable?.columns.find(c => c.id === targetColumnId);

  // Auto-generate name when tables/columns change if user hasn't explicitly customized
  const handleSourceTableChange = (newTableId: string) => {
    setSourceTableId(newTableId);
    const newTbl = tables.find(t => t.id === newTableId);
    const firstCol = newTbl?.columns[0]?.id || '';
    setSourceColumnId(firstCol);
    if (!name || name.startsWith('fk_')) {
      setName(`fk_${newTbl?.name || 'child'}_${currentTargetTable?.name || 'parent'}`);
    }
  };

  const handleTargetTableChange = (newTableId: string) => {
    setTargetTableId(newTableId);
    const newTbl = tables.find(t => t.id === newTableId);
    const pkCol = newTbl?.columns.find(c => c.isPrimaryKey)?.id || newTbl?.columns[0]?.id || '';
    setTargetColumnId(pkCol);
    if (!name || name.startsWith('fk_')) {
      setName(`fk_${currentSourceTable?.name || 'child'}_${newTbl?.name || 'parent'}`);
    }
  };

  const handleCardinalitySelect = (newCard: Cardinality) => {
    setCardinality(newCard);
    // Smart preset ends matching cardinality conventions
    if (newCard === '1:1') {
      setSourceEnd('one');
      setTargetEnd('one');
    } else if (newCard === '1:N' || newCard === 'N:1') {
      setSourceEnd('crows-foot');
      setTargetEnd('one');
    } else if (newCard === 'N:M') {
      setSourceEnd('crows-foot');
      setTargetEnd('crows-foot');
    }
  };

  const handleSwapDirection = () => {
    const prevSrcTbl = sourceTableId;
    const prevSrcCol = sourceColumnId;
    const prevTgtTbl = targetTableId;
    const prevTgtCol = targetColumnId;
    const prevSrcEnd = sourceEnd;
    const prevTgtEnd = targetEnd;

    setSourceTableId(prevTgtTbl);
    setSourceColumnId(prevTgtCol);
    setTargetTableId(prevSrcTbl);
    setTargetColumnId(prevSrcCol);
    setSourceEnd(prevTgtEnd);
    setTargetEnd(prevSrcEnd);

    if (cardinality === '1:N') {
      setCardinality('N:1');
    } else if (cardinality === 'N:1') {
      setCardinality('1:N');
    }

    const newSrc = tables.find(t => t.id === prevTgtTbl);
    const newTgt = tables.find(t => t.id === prevSrcTbl);
    setName(`fk_${newSrc?.name || 'child'}_${newTgt?.name || 'parent'}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceTableId || !sourceColumnId || !targetTableId || !targetColumnId) return;

    const savedRel: Relationship = {
      id: relationship?.id || `rel_${Math.random().toString(36).substring(2, 9)}`,
      sourceTableId,
      sourceColumnId,
      targetTableId,
      targetColumnId,
      cardinality,
      sourceEnd,
      targetEnd,
      name: name.trim() || `fk_${currentSourceTable?.name}_${currentTargetTable?.name}`,
      onDelete: onDeleteAction,
      onUpdate: onUpdateAction,
    };

    onSave(savedRel);
    onClose();
  };

  const endNotationOptions: { value: EndNotation; label: string; symbol: string; desc: string }[] = [
    { value: 'crows-foot', label: 'Many (Crow\'s Foot)', symbol: '⤚', desc: 'Child FK (many records)' },
    { value: 'one', label: 'Exactly One (||)', symbol: '||', desc: 'Strictly 1 mandatory record' },
    { value: 'zero-one', label: 'Zero or One (o|)', symbol: 'o|', desc: 'Optional 0 or 1 record' },
    { value: 'zero-many', label: 'Zero or Many (o<)', symbol: 'o<', desc: 'Optional 0 to multiple records' },
    { value: 'one-many', label: 'One or Many (|>)', symbol: '|>', desc: 'At least 1 mandatory record' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shadow-xs">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
                {isEditing ? 'Edit Visual Relationship & Cardinality' : 'Create Table Relationship'}
              </h2>
              <p className="text-xs text-slate-400">
                Configure visual connector line symbols, cardinality, and referential constraints
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1 text-xs">
          {/* Live SVG Visual Preview Banner */}
          <div className="bg-[#0B0F19] border border-slate-800/80 rounded-xl p-4 flex flex-col items-center">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between w-full">
              <span>Interactive Connection Preview</span>
              <span className="font-mono text-cyan-400 font-bold bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded text-[10px]">
                {cardinality} Cardinality
              </span>
            </div>

            <div className="w-full h-24 bg-slate-950/80 rounded-lg border border-slate-800/60 relative overflow-hidden flex items-center justify-between px-6">
              {/* Left Table Box (Source) */}
              <div className="z-10 bg-slate-900 border border-cyan-500/40 rounded-lg p-2.5 shadow-md min-w-[130px] text-center">
                <div className="font-mono font-bold text-cyan-300 text-xs truncate">
                  {currentSourceTable?.name || 'source_table'}
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                  .{currentSourceCol?.name || 'fk_col'}
                </div>
              </div>

              {/* Center Dynamic SVG Connector */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                <defs>
                  <linearGradient id="previewGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06B6D4" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                </defs>

                {/* Path line */}
                <path
                  d="M 160 48 C 220 48, 260 48, 320 48"
                  fill="none"
                  stroke="url(#previewGrad)"
                  strokeWidth="2.5"
                />

                {/* Left (Source) Visual End Marker */}
                {sourceEnd === 'crows-foot' && (
                  <g stroke="#06B6D4" strokeWidth="2" strokeLinecap="round">
                    <line x1="160" y1="48" x2="174" y2="40" />
                    <line x1="160" y1="48" x2="174" y2="48" />
                    <line x1="160" y1="48" x2="174" y2="56" />
                  </g>
                )}
                {sourceEnd === 'one' && (
                  <g stroke="#06B6D4" strokeWidth="2" strokeLinecap="round">
                    <line x1="166" y1="38" x2="166" y2="58" />
                    <line x1="172" y1="38" x2="172" y2="58" />
                  </g>
                )}
                {sourceEnd === 'zero-one' && (
                  <g stroke="#06B6D4" strokeWidth="2">
                    <circle cx="176" cy="48" r="4" fill="#0B0F19" />
                    <line x1="168" y1="38" x2="168" y2="58" strokeLinecap="round" />
                  </g>
                )}
                {sourceEnd === 'zero-many' && (
                  <g stroke="#06B6D4" strokeWidth="2">
                    <circle cx="180" cy="48" r="4" fill="#0B0F19" />
                    <line x1="160" y1="48" x2="172" y2="40" strokeLinecap="round" />
                    <line x1="160" y1="48" x2="172" y2="48" strokeLinecap="round" />
                    <line x1="160" y1="48" x2="172" y2="56" strokeLinecap="round" />
                  </g>
                )}
                {sourceEnd === 'one-many' && (
                  <g stroke="#06B6D4" strokeWidth="2">
                    <line x1="176" y1="38" x2="176" y2="58" strokeLinecap="round" />
                    <line x1="160" y1="48" x2="170" y2="40" strokeLinecap="round" />
                    <line x1="160" y1="48" x2="170" y2="48" strokeLinecap="round" />
                    <line x1="160" y1="48" x2="170" y2="56" strokeLinecap="round" />
                  </g>
                )}

                {/* Right (Target) Visual End Marker */}
                {targetEnd === 'crows-foot' && (
                  <g stroke="#10B981" strokeWidth="2" strokeLinecap="round">
                    <line x1="320" y1="48" x2="306" y2="40" />
                    <line x1="320" y1="48" x2="306" y2="48" />
                    <line x1="320" y1="48" x2="306" y2="56" />
                  </g>
                )}
                {targetEnd === 'one' && (
                  <g stroke="#10B981" strokeWidth="2" strokeLinecap="round">
                    <line x1="314" y1="38" x2="314" y2="58" />
                    <line x1="308" y1="38" x2="308" y2="58" />
                  </g>
                )}
                {targetEnd === 'zero-one' && (
                  <g stroke="#10B981" strokeWidth="2">
                    <circle cx="304" cy="48" r="4" fill="#0B0F19" />
                    <line x1="312" y1="38" x2="312" y2="58" strokeLinecap="round" />
                  </g>
                )}
                {targetEnd === 'zero-many' && (
                  <g stroke="#10B981" strokeWidth="2">
                    <circle cx="300" cy="48" r="4" fill="#0B0F19" />
                    <line x1="320" y1="48" x2="308" y2="40" strokeLinecap="round" />
                    <line x1="320" y1="48" x2="308" y2="48" strokeLinecap="round" />
                    <line x1="320" y1="48" x2="308" y2="56" strokeLinecap="round" />
                  </g>
                )}
                {targetEnd === 'one-many' && (
                  <g stroke="#10B981" strokeWidth="2">
                    <line x1="304" y1="38" x2="304" y2="58" strokeLinecap="round" />
                    <line x1="320" y1="48" x2="310" y2="40" strokeLinecap="round" />
                    <line x1="320" y1="48" x2="310" y2="48" strokeLinecap="round" />
                    <line x1="320" y1="48" x2="310" y2="56" strokeLinecap="round" />
                  </g>
                )}
              </svg>

              {/* Right Table Box (Target) */}
              <div className="z-10 bg-slate-900 border border-emerald-500/40 rounded-lg p-2.5 shadow-md min-w-[130px] text-center">
                <div className="font-mono font-bold text-emerald-300 text-xs truncate">
                  {currentTargetTable?.name || 'target_table'}
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                  .{currentTargetCol?.name || 'pk_col'}
                </div>
              </div>
            </div>
          </div>

          {/* Connected Tables & Columns Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">Connected Entities & Columns</span>
              <button
                type="button"
                onClick={handleSwapDirection}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 font-mono text-[11px]"
                title="Swap source and target table direction"
              >
                <ArrowRightLeft className="w-3 h-3 text-cyan-400" />
                <span>Swap Direction</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Source (Child / Foreign Key Table) */}
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    Source (Foreign Key Side)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Child Table</span>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Table</label>
                  <select
                    value={sourceTableId}
                    onChange={(e) => handleSourceTableChange(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono outline-hidden focus:border-cyan-500"
                  >
                    {tables.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Column (FK Field)</label>
                  <select
                    value={sourceColumnId}
                    onChange={(e) => setSourceColumnId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono outline-hidden focus:border-cyan-500"
                  >
                    {currentSourceTable?.columns.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type}) {c.isPrimaryKey ? '· [PK]' : ''} {c.isForeignKey ? '· [FK]' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target (Parent / Referenced Table) */}
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Target (Referenced Side)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Parent Table</span>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Table</label>
                  <select
                    value={targetTableId}
                    onChange={(e) => handleTargetTableChange(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono outline-hidden focus:border-emerald-500"
                  >
                    {tables.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Column (PK / Unique Field)</label>
                  <select
                    value={targetColumnId}
                    onChange={(e) => setTargetColumnId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono outline-hidden focus:border-emerald-500"
                  >
                    {currentTargetTable?.columns.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type}) {c.isPrimaryKey ? '· [PK]' : ''} {c.isUnique ? '· [UK]' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Cardinality Selector Cards */}
          <div className="space-y-2.5">
            <label className="block font-semibold text-slate-300">
              Relationship Cardinality
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: '1:N', title: '1 : N', name: 'One-to-Many', desc: 'Parent record has many children (Standard FK)' },
                { id: 'N:1', title: 'N : 1', name: 'Many-to-One', desc: 'Many child records point to one parent' },
                { id: '1:1', title: '1 : 1', name: 'One-to-One', desc: 'Unique FK (single record to single record)' },
                { id: 'N:M', title: 'N : M', name: 'Many-to-Many', desc: 'Associative or logical bridge relationship' },
              ].map(card => {
                const isSelected = cardinality === card.id;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleCardinalitySelect(card.id as Cardinality)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/10 shadow-sm shadow-indigo-500/20'
                        : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-mono text-sm font-bold ${isSelected ? 'text-indigo-400' : 'text-slate-300'}`}>
                        {card.title}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <div className={`font-semibold text-[11px] mb-1 ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {card.name}
                    </div>
                    <div className="text-[10px] text-slate-500 leading-tight">
                      {card.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visual Connection End Notation Options */}
          <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">Visual Line End Symbols (Crow's Foot & ER)</span>
              <span className="text-[10px] text-slate-500">Fine-tune visual connection ends on canvas</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Source End Notation */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1.5">
                  Source End Symbol ({currentSourceTable?.name || 'source'})
                </label>
                <div className="space-y-1.5">
                  {endNotationOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSourceEnd(opt.value)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg border text-left transition-colors ${
                        sourceEnd === opt.value
                          ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-200'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-cyan-400 font-bold text-sm w-5 text-center">
                          {opt.symbol}
                        </span>
                        <span>{opt.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target End Notation */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1.5">
                  Target End Symbol ({currentTargetTable?.name || 'target'})
                </label>
                <div className="space-y-1.5">
                  {endNotationOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTargetEnd(opt.value)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg border text-left transition-colors ${
                        targetEnd === opt.value
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-emerald-400 font-bold text-sm w-5 text-center">
                          {opt.symbol}
                        </span>
                        <span>{opt.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Referential Constraints & Constraint Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1 font-mono">
                Constraint Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="fk_child_parent"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono outline-hidden focus:border-indigo-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1 font-mono">
                ON DELETE Action
              </label>
              <select
                value={onDeleteAction}
                onChange={(e) => setOnDeleteAction(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono outline-hidden focus:border-indigo-500 text-xs"
              >
                <option value="NO ACTION">NO ACTION (Default)</option>
                <option value="CASCADE">CASCADE (Delete child rows)</option>
                <option value="SET NULL">SET NULL (Nullify FK)</option>
                <option value="RESTRICT">RESTRICT (Block delete)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1 font-mono">
                ON UPDATE Action
              </label>
              <select
                value={onUpdateAction}
                onChange={(e) => setOnUpdateAction(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono outline-hidden focus:border-indigo-500 text-xs"
              >
                <option value="NO ACTION">NO ACTION (Default)</option>
                <option value="CASCADE">CASCADE (Cascade new PK)</option>
                <option value="SET NULL">SET NULL (Nullify FK)</option>
                <option value="RESTRICT">RESTRICT (Block update)</option>
              </select>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div>
            {isEditing && onDelete && relationship && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete relationship "${relationship.name || 'fk'}"?`)) {
                    onDelete(relationship.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Relation</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-sm shadow-indigo-600/20 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Save Changes' : 'Create Relationship'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
