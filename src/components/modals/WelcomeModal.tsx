import React from 'react';
import { Database, FolderOpen, Plus, Sparkles, Upload, ArrowRight, X } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTemplates: () => void;
  onOpenImport: () => void;
  onAddFirstTable: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  onOpenTemplates,
  onOpenImport,
  onAddFirstTable,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#111827] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-[#131B2E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Welcome to RelationalCanvas
              </h2>
              <p className="text-xs text-slate-400">
                Visual SQL & ERD Studio with Voice & Chat AI Co-Pilot
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Guide */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            RelationalCanvas is an open-source, standalone workspace for designing, visualizing, and converting database schemas across <strong>PostgreSQL</strong>, <strong>MSSQL (T-SQL)</strong>, <strong>MySQL</strong>, <strong>SQLite</strong>, <strong>DBML</strong>, and <strong>Mermaid</strong>.
          </p>

          {/* Action Pathways */}
          <div className="space-y-2.5">
            {/* Template Path (Recommended) */}
            <div
              onClick={() => {
                onClose();
                onOpenTemplates();
              }}
              className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/40 hover:border-indigo-500 hover:bg-indigo-900/30 transition-all cursor-pointer group flex items-start gap-3.5"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                    Toy Around with a Template (Recommended)
                  </h3>
                  <span className="text-[10px] text-indigo-400 font-medium font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    Quickstart
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Click <strong>Templates</strong> in the top navigation bar at any time to load full architectures like <em>E-Commerce Orders</em> or <em>SaaS Multi-Tenant</em>.
                </p>
              </div>
            </div>

            {/* Blank Canvas Path */}
            <div
              onClick={() => {
                onClose();
                onAddFirstTable();
              }}
              className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition-all cursor-pointer group flex items-start gap-3.5"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <Plus className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors mb-0.5">
                  Start with a Clean Blank Canvas
                </h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Double-click anywhere on the canvas or click <strong>+ Add Table</strong> in the bottom toolbar to build your entities from scratch.
                </p>
              </div>
            </div>

            {/* Import Path */}
            <div
              onClick={() => {
                onClose();
                onOpenImport();
              }}
              className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition-all cursor-pointer group flex items-start gap-3.5"
            >
              <div className="w-8 h-8 rounded-lg bg-cyan-950/40 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <Upload className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors mb-0.5">
                  Import Existing SQL DDL or ERD File
                </h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Click <strong>Import</strong> in the top bar to paste or drop `.sql`, `.dbml`, or `.mmd` files to immediately visualize them.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            Zero sign-in · Auto-saved locally
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenTemplates();
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Browse Templates</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
