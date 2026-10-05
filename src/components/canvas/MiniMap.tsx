import React from 'react';
import { Table, Viewport } from '../../types/schema';

interface MiniMapProps {
  tables: Table[];
  viewport: Viewport;
  canvasWidth: number;
  canvasHeight: number;
  onNavigate: (x: number, y: number) => void;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  tables,
  viewport,
  canvasWidth,
  canvasHeight,
  onNavigate,
}) => {
  if (tables.length === 0) return null;

  // Compute bounding box of all tables
  let minX = 0;
  let minY = 0;
  let maxX = 1200;
  let maxY = 800;

  tables.forEach(t => {
    minX = Math.min(minX, t.position.x);
    minY = Math.min(minY, t.position.y);
    maxX = Math.max(maxX, t.position.x + 300);
    maxY = Math.max(maxY, t.position.y + 250);
  });

  // Add padding
  minX -= 100;
  minY -= 100;
  maxX += 100;
  maxY += 100;

  const worldWidth = maxX - minX;
  const worldHeight = maxY - minY;

  const mapWidth = 160;
  const mapHeight = 110;
  const scaleX = mapWidth / worldWidth;
  const scaleY = mapHeight / worldHeight;
  const scale = Math.min(scaleX, scaleY);

  // Viewport rectangle in mini-map coordinates
  const viewX = (-viewport.x - minX) * scale;
  const viewY = (-viewport.y - minY) * scale;
  const viewW = (canvasWidth / viewport.zoom) * scale;
  const viewH = (canvasHeight / viewport.zoom) * scale;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const targetWorldX = clickX / scale + minX;
    const targetWorldY = clickY / scale + minY;

    const newViewportX = -(targetWorldX - (canvasWidth / viewport.zoom) / 2);
    const newViewportY = -(targetWorldY - (canvasHeight / viewport.zoom) / 2);

    onNavigate(newViewportX, newViewportY);
  };

  return (
    <div
      onClick={handleClick}
      className="absolute bottom-6 right-6 z-30 w-40 h-28 bg-[#111827]/90 backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden shadow-2xl cursor-pointer hover:border-slate-700 transition-colors"
      title="MiniMap: click to jump"
    >
      <div className="relative w-full h-full p-1">
        {/* Render Miniature Table Boxes */}
        {tables.map(t => {
          const x = (t.position.x - minX) * scale;
          const y = (t.position.y - minY) * scale;
          const w = 288 * scale;
          const h = (60 + t.columns.length * 30) * scale;

          return (
            <div
              key={t.id}
              style={{
                left: `${Math.max(0, x)}px`,
                top: `${Math.max(0, y)}px`,
                width: `${Math.max(4, w)}px`,
                height: `${Math.max(4, h)}px`,
                backgroundColor: t.colorHeader || '#3B82F6',
              }}
              className="absolute rounded-[2px] opacity-70"
            />
          );
        })}

        {/* Viewport Box */}
        <div
          style={{
            left: `${Math.max(0, viewX)}px`,
            top: `${Math.max(0, viewY)}px`,
            width: `${Math.min(mapWidth, Math.max(12, viewW))}px`,
            height: `${Math.min(mapHeight, Math.max(10, viewH))}px`,
          }}
          className="absolute border border-indigo-400 bg-indigo-500/15 pointer-events-none rounded-[3px]"
        />
      </div>
    </div>
  );
};
