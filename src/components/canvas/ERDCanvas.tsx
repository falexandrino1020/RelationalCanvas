import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SchemaModel, Table, Viewport, SupportedDialect, Relationship } from '../../types/schema';
import { TableCard } from './TableCard';
import { RelationshipLines } from './RelationshipLines';
import { CanvasControls } from './CanvasControls';
import { MiniMap } from './MiniMap';
import { RelationshipModal } from '../modals/RelationshipModal';
import { runAutoLayout } from '../../utils/autoLayout';
import { Database, FolderOpen, Upload, Plus } from 'lucide-react';

interface ERDCanvasProps {
  schema: SchemaModel;
  onUpdateSchema: (updated: SchemaModel) => void;
  selectedTableId: string | null;
  onSelectTable: (id: string | null) => void;
  onOpenTemplates?: () => void;
  onOpenImport?: () => void;
}

export const ERDCanvas: React.FC<ERDCanvasProps> = ({
  schema,
  onUpdateSchema,
  selectedTableId,
  onSelectTable,
  onOpenTemplates,
  onOpenImport,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [draggingTableId, setDraggingTableId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [activeConnection, setActiveConnection] = useState<{
    sourceTableId: string;
    sourceColumnId: string;
    currentMousePos: { x: number; y: number };
  } | null>(null);

  const [selectedRelId, setSelectedRelId] = useState<string | null>(null);
  const [editingRel, setEditingRel] = useState<Relationship | null>(null);
  const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false);
  const [newRelSourcePrefill, setNewRelSourcePrefill] = useState<{ tableId?: string; columnId?: string } | null>(null);

  const [canvasDimensions, setCanvasDimensions] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setCanvasDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Pan canvas on middle-click or empty space drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.target === containerRef.current || (e.target as HTMLElement).id === 'canvas-grid-layer') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
      onSelectTable(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setViewport(prev => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      }));
      return;
    }

    if (draggingTableId && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = (e.clientX - rect.left - viewport.x) / viewport.zoom;
      const rawY = (e.clientY - rect.top - viewport.y) / viewport.zoom;

      const newX = Math.round(rawX - dragOffset.x);
      const newY = Math.round(rawY - dragOffset.y);

      onUpdateSchema({
        ...schema,
        tables: schema.tables.map(t => t.id === draggingTableId ? { ...t, position: { x: newX, y: newY } } : t),
      });
      return;
    }

    if (activeConnection && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseWorldX = (e.clientX - rect.left - viewport.x) / viewport.zoom;
      const mouseWorldY = (e.clientY - rect.top - viewport.y) / viewport.zoom;

      setActiveConnection(prev => prev ? {
        ...prev,
        currentMousePos: { x: mouseWorldX, y: mouseWorldY },
      } : null);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingTableId(null);
    if (activeConnection) {
      setActiveConnection(null);
    }
  };

  // Zoom with mouse wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newZoom = Math.min(2.5, Math.max(0.25, viewport.zoom * zoomFactor));

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newX = mouseX - (mouseX - viewport.x) * (newZoom / viewport.zoom);
    const newY = mouseY - (mouseY - viewport.y) * (newZoom / viewport.zoom);

    setViewport({
      x: newX,
      y: newY,
      zoom: newZoom,
    });
  };

  const handleDragStartTable = (tableId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectTable(tableId);

    const table = schema.tables.find(t => t.id === tableId);
    if (!table || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseWorldX = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const mouseWorldY = (e.clientY - rect.top - viewport.y) / viewport.zoom;

    setDraggingTableId(tableId);
    setDragOffset({
      x: mouseWorldX - table.position.x,
      y: mouseWorldY - table.position.y,
    });
  };

  const handleStartConnection = (sourceTableId: string, sourceColumnId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseWorldX = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const mouseWorldY = (e.clientY - rect.top - viewport.y) / viewport.zoom;

    setActiveConnection({
      sourceTableId,
      sourceColumnId,
      currentMousePos: { x: mouseWorldX, y: mouseWorldY },
    });
  };

  const handleCompleteConnection = (targetTableId: string, targetColumnId: string) => {
    if (!activeConnection) return;
    if (activeConnection.sourceTableId === targetTableId) {
      setActiveConnection(null);
      return; // prevent self loop on same table unless requested
    }

    // Check if relationship already exists
    const exists = schema.relationships.some(
      r => r.sourceTableId === activeConnection.sourceTableId &&
           r.sourceColumnId === activeConnection.sourceColumnId &&
           r.targetTableId === targetTableId &&
           r.targetColumnId === targetColumnId
    );

    if (exists) {
      setActiveConnection(null);
      return;
    }

    const sourceTable = schema.tables.find(t => t.id === activeConnection.sourceTableId);
    const targetTable = schema.tables.find(t => t.id === targetTableId);
    const sourceCol = sourceTable?.columns.find(c => c.id === activeConnection.sourceColumnId);
    const targetCol = targetTable?.columns.find(c => c.id === targetColumnId);

    if (sourceTable && targetTable && sourceCol && targetCol) {
      // Mark sourceCol as foreign key
      const updatedTables = schema.tables.map(t => {
        if (t.id === sourceTable.id) {
          return {
            ...t,
            columns: t.columns.map(c => c.id === sourceCol.id ? {
              ...c,
              isForeignKey: true,
              references: {
                targetTableId: targetTable.id,
                targetColumnId: targetCol.id,
                targetTableName: targetTable.name,
                targetColumnName: targetCol.name,
              },
            } : c),
          };
        }
        return t;
      });

      const newRel: Relationship = {
        id: `rel_${Math.random().toString(36).substring(2, 9)}`,
        sourceTableId: activeConnection.sourceTableId,
        sourceColumnId: activeConnection.sourceColumnId,
        targetTableId,
        targetColumnId,
        cardinality: sourceCol.isUnique ? '1:1' : '1:N',
        sourceEnd: sourceCol.isUnique ? 'one' : 'crows-foot',
        targetEnd: 'one',
        name: `${sourceTable.name}_${sourceCol.name}_fk`,
      };

      setSelectedRelId(newRel.id);

      onUpdateSchema({
        ...schema,
        tables: updatedTables,
        relationships: [...schema.relationships, newRel],
      });
    }

    setActiveConnection(null);
  };

  const handleEditRelationship = (relId: string) => {
    const rel = schema.relationships.find(r => r.id === relId);
    if (rel) {
      setEditingRel(rel);
      setSelectedRelId(rel.id);
      setIsRelationshipModalOpen(true);
    }
  };

  const handleEditColumnRelationship = (tableId: string, columnId: string) => {
    // Check if column is source or target of an existing relationship
    const existing = schema.relationships.find(
      r => (r.sourceTableId === tableId && r.sourceColumnId === columnId) ||
           (r.targetTableId === tableId && r.targetColumnId === columnId)
    );

    if (existing) {
      setEditingRel(existing);
      setSelectedRelId(existing.id);
      setIsRelationshipModalOpen(true);
    } else {
      setEditingRel(null);
      setNewRelSourcePrefill({ tableId, columnId });
      setIsRelationshipModalOpen(true);
    }
  };

  const handleOpenAddRelationship = (sourceTableId?: string, sourceColumnId?: string) => {
    setEditingRel(null);
    setNewRelSourcePrefill(sourceTableId ? { tableId: sourceTableId, columnId: sourceColumnId } : null);
    setIsRelationshipModalOpen(true);
  };

  const handleSwapRelationship = (relId: string) => {
    const rel = schema.relationships.find(r => r.id === relId);
    if (!rel) return;

    const swappedCardinality = rel.cardinality === '1:N' ? 'N:1' : rel.cardinality === 'N:1' ? '1:N' : rel.cardinality;
    const swappedRel: Relationship = {
      ...rel,
      sourceTableId: rel.targetTableId,
      sourceColumnId: rel.targetColumnId,
      targetTableId: rel.sourceTableId,
      targetColumnId: rel.sourceColumnId,
      sourceEnd: rel.targetEnd || 'one',
      targetEnd: rel.sourceEnd || 'crows-foot',
      cardinality: swappedCardinality,
    };

    handleSaveRelationship(swappedRel);
  };

  const handleSaveRelationship = (savedRel: Relationship) => {
    const existingIndex = schema.relationships.findIndex(r => r.id === savedRel.id);

    // Sync foreign key column metadata in tables
    const sourceTable = schema.tables.find(t => t.id === savedRel.sourceTableId);
    const targetTable = schema.tables.find(t => t.id === savedRel.targetTableId);
    const sourceCol = sourceTable?.columns.find(c => c.id === savedRel.sourceColumnId);
    const targetCol = targetTable?.columns.find(c => c.id === savedRel.targetColumnId);

    const updatedTables = schema.tables.map(t => {
      // If table is source, mark column as foreign key referencing target
      if (t.id === savedRel.sourceTableId && targetTable && targetCol) {
        return {
          ...t,
          columns: t.columns.map(c => c.id === savedRel.sourceColumnId ? {
            ...c,
            isForeignKey: true,
            references: {
              targetTableId: targetTable.id,
              targetColumnId: targetCol.id,
              targetTableName: targetTable.name,
              targetColumnName: targetCol.name,
            },
          } : c),
        };
      }
      return t;
    });

    let updatedRelationships: Relationship[];
    if (existingIndex >= 0) {
      updatedRelationships = [...schema.relationships];
      updatedRelationships[existingIndex] = savedRel;
    } else {
      updatedRelationships = [...schema.relationships, savedRel];
    }

    onUpdateSchema({
      ...schema,
      tables: updatedTables,
      relationships: updatedRelationships,
    });

    setSelectedRelId(savedRel.id);
  };

  const handleDeleteRelationship = (relId: string) => {
    const rel = schema.relationships.find(r => r.id === relId);
    if (!rel) return;

    // Unmark foreign key if no other relation uses it
    const updatedTables = schema.tables.map(t => {
      if (t.id === rel.sourceTableId) {
        const otherUses = schema.relationships.some(
          r => r.id !== relId && r.sourceTableId === rel.sourceTableId && r.sourceColumnId === rel.sourceColumnId
        );
        if (!otherUses) {
          return {
            ...t,
            columns: t.columns.map(c => c.id === rel.sourceColumnId ? {
              ...c,
              isForeignKey: false,
              references: undefined,
            } : c),
          };
        }
      }
      return t;
    });

    onUpdateSchema({
      ...schema,
      tables: updatedTables,
      relationships: schema.relationships.filter(r => r.id !== relId),
    });

    if (selectedRelId === relId) {
      setSelectedRelId(null);
    }
  };

  const handleUpdateTable = (updatedTable: Table) => {
    onUpdateSchema({
      ...schema,
      tables: schema.tables.map(t => t.id === updatedTable.id ? updatedTable : t),
    });
  };

  const handleDeleteTable = (tableId: string) => {
    if (confirm('Delete this table and all connected foreign key relationships?')) {
      onUpdateSchema({
        ...schema,
        tables: schema.tables.filter(t => t.id !== tableId),
        relationships: schema.relationships.filter(r => r.sourceTableId !== tableId && r.targetTableId !== tableId),
      });
      if (selectedTableId === tableId) {
        onSelectTable(null);
      }
    }
  };

  const handleAddTable = (worldX?: number, worldY?: number) => {
    const defaultX = worldX !== undefined ? worldX : (-viewport.x + canvasDimensions.width / 2) / viewport.zoom - 140;
    const defaultY = worldY !== undefined ? worldY : (-viewport.y + canvasDimensions.height / 2) / viewport.zoom - 100;

    const newTableId = `tbl_${Math.random().toString(36).substring(2, 9)}`;
    const newTableName = `table_${schema.tables.length + 1}`;

    const pkType = schema.dialect === 'mssql' ? 'uniqueidentifier' : schema.dialect === 'postgres' ? 'uuid' : 'int';
    const pkDefault = schema.dialect === 'mssql' ? 'NEWID()' : schema.dialect === 'postgres' ? 'gen_random_uuid()' : undefined;

    const newTable: Table = {
      id: newTableId,
      name: newTableName,
      position: { x: Math.round(defaultX), y: Math.round(defaultY) },
      columns: [
        {
          id: `col_${Math.random().toString(36).substring(2, 9)}`,
          name: 'id',
          type: pkType,
          isPrimaryKey: true,
          isForeignKey: false,
          isNullable: false,
          isUnique: true,
          defaultValue: pkDefault,
        },
        {
          id: `col_${Math.random().toString(36).substring(2, 9)}`,
          name: 'created_at',
          type: schema.dialect === 'mssql' ? 'datetime2' : 'timestamptz',
          isPrimaryKey: false,
          isForeignKey: false,
          isNullable: false,
          isUnique: false,
        },
      ],
    };

    onUpdateSchema({
      ...schema,
      tables: [...schema.tables, newTable],
    });
    onSelectTable(newTableId);
  };

  const handleAutoLayout = () => {
    const formatted = runAutoLayout(schema);
    onUpdateSchema(formatted);
  };

  const handleFitView = () => {
    if (schema.tables.length === 0) {
      setViewport({ x: 0, y: 0, zoom: 1 });
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    schema.tables.forEach(t => {
      minX = Math.min(minX, t.position.x);
      minY = Math.min(minY, t.position.y);
      maxX = Math.max(maxX, t.position.x + 300);
      maxY = Math.max(maxY, t.position.y + 250);
    });

    const padding = 80;
    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;

    const zoomX = canvasDimensions.width / contentW;
    const zoomY = canvasDimensions.height / contentH;
    const fitZoom = Math.min(1.2, Math.max(0.3, Math.min(zoomX, zoomY)));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setViewport({
      zoom: fitZoom,
      x: canvasDimensions.width / 2 - centerX * fitZoom,
      y: canvasDimensions.height / 2 - centerY * fitZoom,
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onDoubleClick={(e) => {
        if (containerRef.current && (e.target === containerRef.current || (e.target as HTMLElement).id === 'canvas-grid-layer')) {
          const rect = containerRef.current.getBoundingClientRect();
          const clickX = (e.clientX - rect.left - viewport.x) / viewport.zoom;
          const clickY = (e.clientY - rect.top - viewport.y) / viewport.zoom;
          handleAddTable(clickX, clickY);
        }
      }}
      className="relative flex-1 h-full w-full bg-[#0B0F19] overflow-hidden select-none cursor-default"
    >
      {/* Background Micro-Dot Grid */}
      <div
        id="canvas-grid-layer"
        className="absolute inset-0 pointer-events-auto"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.08) 1px, transparent 0)`,
          backgroundSize: `${32 * viewport.zoom}px ${32 * viewport.zoom}px`,
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        }}
      />

      {/* Transformed Workspace Layer */}
      <div
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
        }}
        className="absolute inset-0 pointer-events-none will-change-transform"
      >
        {/* SVG Connectors */}
        <RelationshipLines
          relationships={schema.relationships}
          tables={schema.tables}
          activeConnection={activeConnection}
          selectedRelId={selectedRelId}
          onSelectRelationship={setSelectedRelId}
          onEditRelationship={handleEditRelationship}
          onSwapRelationship={handleSwapRelationship}
          onDeleteRelationship={handleDeleteRelationship}
        />

        {/* HTML Draggable Table Cards */}
        <div className="relative pointer-events-auto">
          {schema.tables.map(table => (
            <TableCard
              key={table.id}
              table={table}
              dialect={schema.dialect}
              zoom={viewport.zoom}
              isSelected={selectedTableId === table.id}
              onSelect={() => onSelectTable(table.id)}
              onUpdateTable={handleUpdateTable}
              onDeleteTable={handleDeleteTable}
              onStartConnection={handleStartConnection}
              onCompleteConnection={handleCompleteConnection}
              onDragStart={handleDragStartTable}
              onEditColumnRelationship={handleEditColumnRelationship}
            />
          ))}
        </div>
      </div>

      {/* Empty State Guidance Card */}
      {schema.tables.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4 z-20">
          <div className="max-w-md w-full bg-[#111827]/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 text-center pointer-events-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3.5 shadow-sm">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5 font-['Plus_Jakarta_Sans']">
              Clean Canvas Ready
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-5">
              Start building your relational schema from scratch, import an existing SQL/ERD file, or load a pre-built template to toy around with the studio.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              {onOpenTemplates && (
                <button
                  onClick={onOpenTemplates}
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm shadow-indigo-600/20"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Browse Templates</span>
                </button>
              )}
              {onOpenImport && (
                <button
                  onClick={onOpenImport}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Import SQL</span>
                </button>
              )}
              <button
                onClick={() => handleAddTable()}
                className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-400" />
                <span>Add Table</span>
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
              Tip: You can also double-click anywhere on the canvas to add a table
            </div>
          </div>
        </div>
      )}

      {/* Floating Canvas Controls */}
      <CanvasControls
        zoom={viewport.zoom}
        onZoomIn={() => setViewport(prev => ({ ...prev, zoom: Math.min(2.5, prev.zoom * 1.15) }))}
        onZoomOut={() => setViewport(prev => ({ ...prev, zoom: Math.max(0.25, prev.zoom * 0.85) }))}
        onResetZoom={() => setViewport(prev => ({ ...prev, zoom: 1 }))}
        onFitView={handleFitView}
        onAutoLayout={handleAutoLayout}
        onAddTable={() => handleAddTable()}
        onAddRelationship={schema.tables.length >= 2 ? () => handleOpenAddRelationship() : undefined}
      />

      {/* Floating Spatial Mini-Map */}
      <MiniMap
        tables={schema.tables}
        viewport={viewport}
        canvasWidth={canvasDimensions.width}
        canvasHeight={canvasDimensions.height}
        onNavigate={(x, y) => setViewport(prev => ({ ...prev, x, y }))}
      />

      {/* Interactive Relationship Editor / Creator Modal */}
      {isRelationshipModalOpen && (
        <RelationshipModal
          isOpen={isRelationshipModalOpen}
          onClose={() => {
            setIsRelationshipModalOpen(false);
            setEditingRel(null);
            setNewRelSourcePrefill(null);
          }}
          tables={schema.tables}
          relationship={editingRel}
          defaultSourceTableId={newRelSourcePrefill?.tableId}
          defaultSourceColumnId={newRelSourcePrefill?.columnId}
          onSave={handleSaveRelationship}
          onDelete={handleDeleteRelationship}
        />
      )}
    </div>
  );
};
