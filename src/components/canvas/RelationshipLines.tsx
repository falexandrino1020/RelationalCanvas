import React from 'react';
import { Relationship, Table, EndNotation } from '../../types/schema';
import { Edit3, ArrowRightLeft, Trash2 } from 'lucide-react';

interface RelationshipLinesProps {
  relationships: Relationship[];
  tables: Table[];
  activeConnection: {
    sourceTableId: string;
    sourceColumnId: string;
    currentMousePos: { x: number; y: number };
  } | null;
  selectedRelId?: string | null;
  onSelectRelationship?: (relId: string | null) => void;
  onEditRelationship?: (relId: string) => void;
  onSwapRelationship?: (relId: string) => void;
  onDeleteRelationship: (relId: string) => void;
}

export const RelationshipLines: React.FC<RelationshipLinesProps> = ({
  relationships,
  tables,
  activeConnection,
  selectedRelId,
  onSelectRelationship,
  onEditRelationship,
  onSwapRelationship,
  onDeleteRelationship,
}) => {
  const TABLE_WIDTH = 288;
  const HEADER_HEIGHT = 46;
  const ROW_HEIGHT = 31;

  // Calculates exact port coordinate and exit direction (+1 for right edge, -1 for left edge)
  const getPortInfo = (
    tableId: string,
    columnId: string,
    otherTableId: string
  ): { x: number; y: number; dir: number } | null => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return null;

    const otherTable = tables.find(t => t.id === otherTableId);
    // Table centers
    const tableCenterX = table.position.x + TABLE_WIDTH / 2;
    const otherCenterX = otherTable ? otherTable.position.x + TABLE_WIDTH / 2 : tableCenterX;

    // Connect to facing edge: if other table is to our right, exit right (+1). If other table is to our left, exit left (-1)
    const isExitRight = tableCenterX <= otherCenterX;
    const dir = isExitRight ? 1 : -1;
    const portX = isExitRight ? table.position.x + TABLE_WIDTH : table.position.x;

    const colIndex = table.columns.findIndex(c => c.id === columnId);
    const portY = colIndex === -1
      ? table.position.y + 40
      : table.position.y + HEADER_HEIGHT + colIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

    return { x: portX, y: portY, dir };
  };

  // Helper to render the exact visual ER / Crow's foot end marker at (px, py)
  const renderEndNotation = (
    notation: EndNotation,
    px: number,
    py: number,
    dir: number,
    color: string
  ) => {
    switch (notation) {
      case 'crows-foot':
        // Trident fork branching into table edge
        return (
          <g stroke={color} strokeWidth="2" strokeLinecap="round">
            <line x1={px + dir * 14} y1={py} x2={px} y2={py - 6} />
            <line x1={px + dir * 14} y1={py} x2={px} y2={py} />
            <line x1={px + dir * 14} y1={py} x2={px} y2={py + 6} />
          </g>
        );

      case 'one':
        // Exactly One: Two parallel vertical hash bars ||
        return (
          <g stroke={color} strokeWidth="2" strokeLinecap="round">
            <line x1={px + dir * 6} y1={py - 8} x2={px + dir * 6} y2={py + 8} />
            <line x1={px + dir * 12} y1={py - 8} x2={px + dir * 12} y2={py + 8} />
          </g>
        );

      case 'zero-one':
        // Zero or One: Circle + bar o|
        return (
          <g stroke={color} strokeWidth="2">
            <line x1={px + dir * 6} y1={py - 8} x2={px + dir * 6} y2={py + 8} strokeLinecap="round" />
            <circle cx={px + dir * 15} cy={py} r={4} fill="#0F172A" />
          </g>
        );

      case 'zero-many':
        // Zero or Many: Circle + Crow's foot o<
        return (
          <g stroke={color} strokeWidth="2">
            <circle cx={px + dir * 21} cy={py} r={4} fill="#0F172A" />
            <line x1={px + dir * 14} y1={py} x2={px} y2={py - 6} strokeLinecap="round" />
            <line x1={px + dir * 14} y1={py} x2={px} y2={py} strokeLinecap="round" />
            <line x1={px + dir * 14} y1={py} x2={px} y2={py + 6} strokeLinecap="round" />
          </g>
        );

      case 'one-many':
        // One or Many: Bar + Crow's foot |>
        return (
          <g stroke={color} strokeWidth="2" strokeLinecap="round">
            <line x1={px + dir * 18} y1={py - 8} x2={px + dir * 18} y2={py + 8} />
            <line x1={px + dir * 12} y1={py} x2={px} y2={py - 6} />
            <line x1={px + dir * 12} y1={py} x2={px} y2={py} />
            <line x1={px + dir * 12} y1={py} x2={px} y2={py + 6} />
          </g>
        );

      default:
        return null;
    }
  };

  return (
    <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible z-10">
      <defs>
        <linearGradient id="relGradientCyanGreen" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
      </defs>

      {/* Existing Saved Relationships */}
      {relationships.map((rel) => {
        const srcInfo = getPortInfo(rel.sourceTableId, rel.sourceColumnId, rel.targetTableId);
        const tgtInfo = getPortInfo(rel.targetTableId, rel.targetColumnId, rel.sourceTableId);

        if (!srcInfo || !tgtInfo) return null;

        const isSelected = selectedRelId === rel.id;

        // Resolve visual end notations
        const resolvedSourceEnd: EndNotation =
          rel.sourceEnd ||
          (rel.cardinality === '1:1'
            ? 'one'
            : rel.cardinality === '1:N' || rel.cardinality === 'N:1'
            ? 'crows-foot'
            : 'crows-foot');

        const resolvedTargetEnd: EndNotation =
          rel.targetEnd ||
          (rel.cardinality === '1:1'
            ? 'one'
            : rel.cardinality === 'N:M'
            ? 'crows-foot'
            : 'one');

        // Smooth Bezier Curve connecting facing ports
        const dx = Math.abs(tgtInfo.x - srcInfo.x);
        const controlDist = Math.max(50, Math.min(180, dx * 0.45));

        const cp1x = srcInfo.x + srcInfo.dir * controlDist;
        const cp1y = srcInfo.y;
        const cp2x = tgtInfo.x + tgtInfo.dir * controlDist;
        const cp2y = tgtInfo.y;

        const pathData = `M ${srcInfo.x} ${srcInfo.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tgtInfo.x} ${tgtInfo.y}`;

        // Bezier midpoint calculation at t=0.5
        const midX = 0.125 * srcInfo.x + 0.375 * cp1x + 0.375 * cp2x + 0.125 * tgtInfo.x;
        const midY = 0.125 * srcInfo.y + 0.375 * cp1y + 0.375 * cp2y + 0.125 * tgtInfo.y;

        const srcTable = tables.find(t => t.id === rel.sourceTableId);
        const tgtTable = tables.find(t => t.id === rel.targetTableId);

        return (
          <g key={rel.id} className="group pointer-events-auto cursor-pointer">
            {/* Fat invisible line for easy clicking/hovering */}
            <path
              d={pathData}
              fill="none"
              stroke="transparent"
              strokeWidth="24"
              onClick={(e) => {
                e.stopPropagation();
                onSelectRelationship?.(rel.id);
                onEditRelationship?.(rel.id);
              }}
            />

            {/* Glowing Accent Underline on hover or when selected */}
            <path
              d={pathData}
              fill="none"
              stroke={isSelected ? '#38BDF8' : '#06B6D4'}
              strokeWidth={isSelected ? '6' : '4'}
              className={`transition-all blur-[3px] ${
                isSelected ? 'opacity-70' : 'opacity-0 group-hover:opacity-40'
              }`}
            />

            {/* Visible Main Relationship Connector Line */}
            <path
              d={pathData}
              fill="none"
              stroke={isSelected ? '#38BDF8' : '#06B6D4'}
              strokeWidth={isSelected ? '2.5' : '2'}
              className="group-hover:stroke-cyan-300 transition-colors"
            />

            {/* Source Visual End Symbol (Crow's foot, One, etc.) */}
            {renderEndNotation(
              resolvedSourceEnd,
              srcInfo.x,
              srcInfo.y,
              srcInfo.dir,
              isSelected ? '#38BDF8' : '#06B6D4'
            )}

            {/* Target Visual End Symbol (One, Crow's foot, etc.) */}
            {renderEndNotation(
              resolvedTargetEnd,
              tgtInfo.x,
              tgtInfo.y,
              tgtInfo.dir,
              isSelected ? '#34D399' : '#10B981'
            )}

            {/* Source Anchor Dot */}
            <circle cx={srcInfo.x} cy={srcInfo.y} r="3" fill="#06B6D4" />

            {/* Target Anchor Dot */}
            <circle cx={tgtInfo.x} cy={tgtInfo.y} r="3" fill="#10B981" />

            {/* Source End Cardinality Pill Badge */}
            <g
              transform={`translate(${srcInfo.x + srcInfo.dir * 26}, ${srcInfo.y - 12})`}
              className="pointer-events-none select-none"
            >
              <rect
                x="-10"
                y="-9"
                width="20"
                height="18"
                rx="5"
                fill="#0F172A"
                stroke="#06B6D4"
                strokeWidth="1.2"
                className="shadow-sm"
              />
              <text
                x="0"
                y="3.5"
                textAnchor="middle"
                fill="#38BDF8"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {resolvedSourceEnd === 'one' ? '1' : 'N'}
              </text>
            </g>

            {/* Target End Cardinality Pill Badge */}
            <g
              transform={`translate(${tgtInfo.x + tgtInfo.dir * 26}, ${tgtInfo.y - 12})`}
              className="pointer-events-none select-none"
            >
              <rect
                x="-10"
                y="-9"
                width="20"
                height="18"
                rx="5"
                fill="#0F172A"
                stroke="#10B981"
                strokeWidth="1.2"
                className="shadow-sm"
              />
              <text
                x="0"
                y="3.5"
                textAnchor="middle"
                fill="#34D399"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {resolvedTargetEnd === 'crows-foot' ? 'N' : '1'}
              </text>
            </g>

            {/* Interactive Center Badge with Quick Edit & Cardinality Options */}
            <g
              transform={`translate(${midX}, ${midY})`}
              className="transition-transform group-hover:scale-105"
            >
              {/* Center Pill Background */}
              <rect
                x="-46"
                y="-13"
                width="92"
                height="26"
                rx="13"
                fill="#0B0F19"
                stroke={isSelected ? '#38BDF8' : '#334155'}
                strokeWidth={isSelected ? '2' : '1.5'}
                className="shadow-lg cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectRelationship?.(rel.id);
                  onEditRelationship?.(rel.id);
                }}
              />

              {/* Relationship Label & Cardinality Tag */}
              <text
                x="-16"
                y="4"
                textAnchor="middle"
                fill="#E2E8F0"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectRelationship?.(rel.id);
                  onEditRelationship?.(rel.id);
                }}
              >
                {rel.cardinality || '1:N'}
              </text>

              {/* Quick Action: Edit Button (Pencil) */}
              <g
                transform="translate(4, -7)"
                className="cursor-pointer text-slate-400 hover:text-cyan-300 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectRelationship?.(rel.id);
                  onEditRelationship?.(rel.id);
                }}
              >
                <circle cx="7" cy="7" r="8" fill="#1E293B" stroke="#475569" strokeWidth="1" />
                <path
                  d="M4 10 L10 4 L11 5 L5 11 Z"
                  fill="#38BDF8"
                />
              </g>

              {/* Quick Action: Swap Direction Button */}
              {onSwapRelationship && (
                <g
                  transform="translate(24, -7)"
                  className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSwapRelationship(rel.id);
                  }}
                >
                  <circle cx="7" cy="7" r="8" fill="#1E293B" stroke="#475569" strokeWidth="1" />
                  <path
                    d="M4 6 L7 4 L7 6 L10 6 L10 8 L7 8 L7 10 Z"
                    fill="#10B981"
                    transform="scale(0.7) translate(2, 2)"
                  />
                </g>
              )}
            </g>
          </g>
        );
      })}

      {/* Active In-Progress Drag Connection */}
      {activeConnection && (() => {
        const srcTable = tables.find(t => t.id === activeConnection.sourceTableId);
        if (!srcTable) return null;

        const colIndex = srcTable.columns.findIndex(c => c.id === activeConnection.sourceColumnId);
        const srcY = colIndex === -1
          ? srcTable.position.y + 40
          : srcTable.position.y + HEADER_HEIGHT + colIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

        const curPos = activeConnection.currentMousePos;
        // Determine whether mouse is to the left or right of table center
        const isRight = curPos.x >= srcTable.position.x + TABLE_WIDTH / 2;
        const srcX = isRight ? srcTable.position.x + TABLE_WIDTH : srcTable.position.x;
        const dir = isRight ? 1 : -1;

        const dx = Math.abs(curPos.x - srcX);
        const controlDist = Math.max(40, dx * 0.4);

        const pathData = `M ${srcX} ${srcY} C ${srcX + dir * controlDist} ${srcY}, ${curPos.x - dir * controlDist} ${curPos.y}, ${curPos.x} ${curPos.y}`;

        return (
          <g>
            <path
              d={pathData}
              fill="none"
              stroke="#A855F7"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              className="animate-pulse"
            />
            {/* Crow's foot preview at drag source */}
            <g stroke="#A855F7" strokeWidth="2" strokeLinecap="round">
              <line x1={srcX + dir * 14} y1={srcY} x2={srcX} y2={srcY - 6} />
              <line x1={srcX + dir * 14} y1={srcY} x2={srcX} y2={srcY} />
              <line x1={srcX + dir * 14} y1={srcY} x2={srcX} y2={srcY + 6} />
            </g>
            <circle cx={srcX} cy={srcY} r="4" fill="#A855F7" />
            <circle cx={curPos.x} cy={curPos.y} r="4" fill="#A855F7" />
          </g>
        );
      })()}
    </svg>
  );
};
