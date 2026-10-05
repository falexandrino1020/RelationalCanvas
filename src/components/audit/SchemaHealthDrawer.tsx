/**
 * SchemaHealthDrawer - Senior Database Engineer Audit & Storage Calculation Panel
 * High-density SaaS inspection drawer for real-time schema linting, row byte math,
 * and 1-click automated remediations.
 */

import React, { useState, useMemo } from 'react';
import { SchemaModel, AuditIssue } from '../../types/schema';
import { runSchemaAudit, applyAuditFix } from '../../utils/schemaAudit';
import { calculateTableStorage, calculateDatabaseStorage } from '../../utils/storageMath';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  HardDrive,
  Wrench,
  Layers,
  HelpCircle,
  Database,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface SchemaHealthDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  schema: SchemaModel;
  onUpdateSchema: (updated: SchemaModel) => void;
}

type ProjectionScale = 'rows10k' | 'rows100k' | 'rows1m' | 'rows10m';

export const SchemaHealthDrawer: React.FC<SchemaHealthDrawerProps> = ({
  isOpen,
  onClose,
  schema,
  onUpdateSchema,
}) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'storage' | 'guide'>('audit');
  const [projectionScale, setProjectionScale] = useState<ProjectionScale>('rows100k');
  const [fixedIssueIds, setFixedIssueIds] = useState<Set<string>>(new Set());

  // Run audit and storage calculations
  const auditReport = useMemo(() => runSchemaAudit(schema), [schema]);
  const storageSummary = useMemo(() => calculateDatabaseStorage(schema.tables || [], schema.dialect), [schema]);

  if (!isOpen) return null;

  const handleFixIssue = (issue: AuditIssue) => {
    const updated = applyAuditFix(schema, issue.id);
    onUpdateSchema(updated);
    setFixedIssueIds(prev => new Set(prev).add(issue.id));
  };

  const scaleLabelMap: Record<ProjectionScale, string> = {
    rows10k: '10,000 Rows',
    rows100k: '100,000 Rows',
    rows1m: '1,000,000 Rows',
    rows10m: '10,000,000 Rows',
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[540px] md:w-[620px] bg-[#0E1526] border-l border-slate-800 shadow-2xl flex flex-col font-['Plus_Jakarta_Sans',sans-serif] select-none animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-[#111827] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-md ${
            auditReport.score >= 90
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : auditReport.score >= 70
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          }`}>
            <span>{auditReport.grade}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">
                Schema Health & Storage Engine
              </h2>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                auditReport.score >= 90
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                  : auditReport.score >= 70
                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
              }`}>
                {auditReport.score}% Score
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Senior database engineering audit & physical byte math
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Close Audit Drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 px-4 shrink-0">
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'audit'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Audit Findings</span>
          {auditReport.issues.length > 0 && (
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
              auditReport.criticalCount > 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
            }`}>
              {auditReport.issues.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('storage')}
          className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'storage'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Storage & Page Sizing</span>
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'guide'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Dialect Guide</span>
        </button>
      </div>

      {/* Drawer Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: AUDIT FINDINGS */}
        {activeTab === 'audit' && (
          <div className="space-y-3.5">
            {/* Health Metrics Summary Strip */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] uppercase font-mono tracking-wider text-rose-400 block mb-0.5">Critical</span>
                <span className="text-lg font-bold text-white font-mono">{auditReport.criticalCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400 block mb-0.5">Warnings</span>
                <span className="text-lg font-bold text-white font-mono">{auditReport.warningCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 block mb-0.5">Best Practices</span>
                <span className="text-lg font-bold text-white font-mono">{auditReport.infoCount}</span>
              </div>
            </div>

            {/* Zero Issues State */}
            {auditReport.issues.length === 0 && (
              <div className="py-12 px-4 text-center rounded-2xl bg-emerald-950/20 border border-emerald-500/30">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-sm shadow-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">
                  100% Production Grade Architecture
                </h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                  No unindexed foreign keys, floating-point currency hazards, or missing primary keys detected. Schema is ready for deployment.
                </p>
              </div>
            )}

            {/* Issue Cards */}
            {auditReport.issues.map(issue => (
              <div
                key={issue.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  issue.severity === 'critical'
                    ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500/60'
                    : issue.severity === 'warning'
                    ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500/60'
                    : 'bg-cyan-950/20 border-cyan-500/40 hover:border-cyan-500/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    {issue.severity === 'critical' && <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />}
                    {issue.severity === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                    {issue.severity === 'info' && <Info className="w-4 h-4 text-cyan-400 shrink-0" />}
                    <h4 className="text-xs font-bold text-white tracking-tight">
                      {issue.title}
                    </h4>
                  </div>
                  <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                    issue.severity === 'critical'
                      ? 'bg-rose-500/20 text-rose-300'
                      : issue.severity === 'warning'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-cyan-500/20 text-cyan-300'
                  }`}>
                    {issue.severity}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mb-2 leading-relaxed">
                  {issue.description}
                </p>

                {/* Senior Database Engineer Rationale Box */}
                <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800 text-[11px] text-slate-400 mb-3 space-y-1">
                  <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span>Engineering Hazard & Rationale:</span>
                  </div>
                  <p className="leading-relaxed pl-3 border-l border-slate-700/60 text-slate-300">
                    {issue.engineeringRationale}
                  </p>
                </div>

                {/* Remediation & 1-Click Auto Fix */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400 truncate">
                    {issue.remediation}
                  </span>
                  {issue.autoFixAvailable && (
                    <button
                      onClick={() => handleFixIssue(issue)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 flex items-center gap-1.5 transition-all shrink-0 hover:scale-102 active:scale-98"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>{issue.autoFixLabel || 'Fix Issue'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: STORAGE & PAGE SIZING */}
        {activeTab === 'storage' && (
          <div className="space-y-4">
            {/* Projection Scale Switcher */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Projected Row Volume</span>
                <span className="text-[10px] text-slate-400">Calculate disk/RAM at production scale</span>
              </div>
              <div className="flex bg-[#0B0F19] rounded-lg p-0.5 border border-slate-800 font-mono text-[11px]">
                {(['rows10k', 'rows100k', 'rows1m', 'rows10m'] as ProjectionScale[]).map(scaleKey => (
                  <button
                    key={scaleKey}
                    onClick={() => setProjectionScale(scaleKey)}
                    className={`px-2 py-1 rounded transition-colors ${
                      projectionScale === scaleKey
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {scaleKey === 'rows10k' ? '10K' : scaleKey === 'rows100k' ? '100K' : scaleKey === 'rows1m' ? '1M' : '10M'}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Database Footprint Banner */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono text-indigo-400 block mb-0.5">
                  Total Database Footprint ({scaleLabelMap[projectionScale]})
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono text-white">
                    {storageSummary.totals[projectionScale].totalMB >= 1024
                      ? `${(storageSummary.totals[projectionScale].totalMB / 1024).toFixed(2)} GB`
                      : `${storageSummary.totals[projectionScale].totalMB} MB`}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    ({storageSummary.totals[projectionScale].dataMB} MB Data + {storageSummary.totals[projectionScale].indexMB} MB PK Indexes)
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-400 block">8KB Page Count</span>
                <span className="text-sm font-bold font-mono text-indigo-300">
                  {storageSummary.totals[projectionScale].pages.toLocaleString()} pages
                </span>
              </div>
            </div>

            {/* High-Density Tabular Grid */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              <div className="p-2.5 border-b border-slate-800 bg-slate-900/90 text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Table Row Byte Specifications ({schema.dialect.toUpperCase()})</span>
                <span className="text-[10px] font-mono text-slate-500">8KB Page Usable: {schema.dialect === 'mssql' ? '8,060 B' : '8,000 B'}</span>
              </div>

              <div className="divide-y divide-slate-800">
                {storageSummary.tableMetrics.map(tableMetric => (
                  <div key={tableMetric.tableId} className="p-3 hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-mono">{tableMetric.tableName}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          {tableMetric.columnCount} cols
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {tableMetric.exceedsPageLimit ? (
                          <span className="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
                            Exceeds 8,060B Limit
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            ~{tableMetric.rowsPer8KPage} rows/page ({tableMetric.pageUtilizationPercent}%)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Byte Metrics Row */}
                    <div className="grid grid-cols-4 gap-2 text-[11px] font-mono bg-black/30 p-2 rounded-lg text-slate-300">
                      <div>
                        <span className="text-[9px] uppercase text-slate-500 block">Min Row</span>
                        <span>{tableMetric.minRowBytes} B</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-slate-500 block">Avg Row</span>
                        <span className="text-indigo-300 font-bold">{tableMetric.avgRowBytes} B</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-slate-500 block">Max Row</span>
                        <span className={tableMetric.exceedsPageLimit ? 'text-rose-400 font-bold' : ''}>
                          {tableMetric.maxRowBytes} B
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-slate-500 block">At Scale ({scaleLabelMap[projectionScale].split(' ')[0]})</span>
                        <span className="text-emerald-400 font-bold">
                          {tableMetric.projections[projectionScale].totalMB} MB
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {storageSummary.tableMetrics.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No tables present. Add tables or load a template to view storage calculations.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DIALECT ARCHITECTURE GUIDE */}
        {activeTab === 'guide' && (
          <div className="space-y-3.5 text-xs text-slate-300">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <h3 className="font-bold text-white text-xs flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-400" />
                <span>Active Dialect: {schema.dialect.toUpperCase()} Rules</span>
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Relational engines vary substantially in their physical page architecture, clustered indexing defaults, and character encoding byte costs.
              </p>
            </div>

            {schema.dialect === 'mssql' && (
              <div className="space-y-2.5">
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                  <h4 className="font-bold text-indigo-300 mb-1">1. Clustered Primary Keys & NEWSEQUENTIALID()</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    In SQL Server, primary keys are CLUSTERED by default. Inserting random <code>NEWID()</code> GUIDs forces massive page splits on disk. Always prefer <code>NEWSEQUENTIALID()</code> or surrogate <code>BIGINT IDENTITY(1,1)</code> keys.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                  <h4 className="font-bold text-indigo-300 mb-1">2. Strict 8,060-Byte In-Row Limit</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    SQL Server database pages are 8KB (8,192 bytes). After header and slot offsets, in-row data cannot exceed 8,060 bytes. Unicode <code>NVARCHAR(n)</code> consumes <strong>2 bytes per character</strong>.
                  </p>
                </div>
              </div>
            )}

            {schema.dialect === 'postgres' && (
              <div className="space-y-2.5">
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                  <h4 className="font-bold text-indigo-300 mb-1">1. Foreign Keys Require Explicit Indexes</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    PostgreSQL does not create indexes on foreign key columns automatically. Without an index on <code>orders.user_id</code>, running <code>DELETE FROM users WHERE id = 1</code> triggers a sequential full-table scan on <code>orders</code> with shared row locks.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                  <h4 className="font-bold text-indigo-300 mb-1">2. Native UUID and TOAST Compression</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    PostgreSQL supports 16-byte native <code>UUID</code> with zero fragmentation penalty in B-trees compared to MSSQL. Text columns over 2KB are automatically compressed into TOAST storage.
                  </p>
                </div>
              </div>
            )}

            {(schema.dialect === 'mysql' || schema.dialect === 'sqlite' || schema.dialect === 'dbml' || schema.dialect === 'mermaid') && (
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <h4 className="font-bold text-indigo-300 mb-1">InnoDB Record Header & Engine Storage</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  MySQL InnoDB clusters tables by primary key on a 16KB page size with an 8,126-byte in-row threshold. Foreign keys should be indexed to prevent cascading locking bottlenecks.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3.5 border-t border-slate-800 bg-[#111827] flex items-center justify-between shrink-0">
        <span className="text-[11px] text-slate-400 font-mono">
          {auditReport.issues.length === 0 ? '✓ Ready for Production' : `${auditReport.issues.length} action item${auditReport.issues.length > 1 ? 's' : ''}`}
        </span>
        <button
          onClick={onClose}
          className="px-4 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
        >
          Close Drawer
        </button>
      </div>
    </div>
  );
};
