import React from 'react';
import { SchemaModel } from '../../types/schema';
import { SAMPLE_SCHEMAS } from '../../utils/sampleSchemas';
import { X, Sparkles, Database, ArrowRight } from 'lucide-react';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (schema: SchemaModel) => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none">
      <div className="w-full max-w-xl bg-[#111827] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-100 font-['Plus_Jakarta_Sans']">
              Pre-built Schema Templates
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {Object.entries(SAMPLE_SCHEMAS).map(([key, item]) => (
            <div
              key={key}
              onClick={() => {
                onSelectTemplate(item.schema);
                onClose();
              }}
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/60 cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
                  {item.name}
                </h3>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 uppercase">
                  {item.schema.dialect}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                {item.description}
              </p>
              <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>{item.schema.tables.length} tables · {item.schema.relationships.length} relations</span>
                <span className="flex items-center gap-1 text-indigo-400 group-hover:translate-x-0.5 transition-transform font-sans font-medium">
                  Load Template <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
