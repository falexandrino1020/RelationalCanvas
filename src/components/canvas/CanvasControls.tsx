import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, LayoutGrid, Plus, RotateCcw } from 'lucide-react';

interface CanvasControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitView: () => void;
  onAutoLayout: () => void;
  onAddTable: () => void;
}

export const CanvasControls: React.FC<CanvasControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitView,
  onAutoLayout,
  onAddTable,
}) => {
  return (
    <div className="absolute bottom-6 left-6 z-30 flex items-center gap-1.5 p-1.5 bg-[#111827]/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl">
      <button
        onClick={onAddTable}
        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors mr-1"
        title="Create new table"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add Table</span>
      </button>

      <div className="h-4 w-px bg-slate-800 mx-0.5" />

      <button
        onClick={onZoomOut}
        className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
        title="Zoom Out (Ctrl + Scroll Down)"
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      <button
        onClick={onResetZoom}
        className="px-2 py-1 text-xs font-mono font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors tabular-nums min-w-[3.5rem] text-center"
        title="Click to reset zoom to 100%"
      >
        {Math.round(zoom * 100)}%
      </button>

      <button
        onClick={onZoomIn}
        className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
        title="Zoom In (Ctrl + Scroll Up)"
      >
        <ZoomIn className="w-4 h-4" />
      </button>

      <div className="h-4 w-px bg-slate-800 mx-0.5" />

      <button
        onClick={onFitView}
        className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
        title="Fit All Tables to Screen"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      <button
        onClick={onAutoLayout}
        className="flex items-center gap-1 px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs font-medium transition-colors"
        title="Organize tables cleanly"
      >
        <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
        <span>Auto-Layout</span>
      </button>
    </div>
  );
};
