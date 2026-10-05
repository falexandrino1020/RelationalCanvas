import React from 'react';
import { Relationship, Table } from '../../types/schema';

interface RelationshipLinesProps {
  relationships: Relationship[];
  tables: Table[];
  activeConnection: {
    sourceTableId: string;
    sourceColumnId: string;
    currentMousePos: { x: number; y: number };
  } | null;
  onDeleteRelationship: (relId: string) => void;
}

export const RelationshipLines: React.FC<RelationshipLinesProps> = ({
  relationships,
  tables,
  activeConnection,
  onDeleteRelationship,
}) => {
  // Helper to calculate exact port coordinate for a table column
  const getPortCoords = (tableId: string, columnId: string, isSource: boolean): { x: number; y: number } | null => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return null;

    const colIndex = table.columns.findIndex(c => c.id === columnId);
    if (colIndex === -1) {
      // Fallback to table center if column not found
      return {
        x: table.position.x + (isSource ? 288 : 0),
        y: table.position.y + 40,
      };
    }

    // Table width is 288px (w-72)
    // Header is ~46px, each column row is ~31px
    const portX = isSource ? table.position.x + 288 : table.position.x;
    const portY = table.position.y + 46 + colIndex * 31 + 15.5;

    return { x: portX, y: portY };
  };

  return (
    <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible z-10">
      <defs>
        {/* Normal Arrowhead */}
        <marker
          id="arrowhead"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#06B6D4" />
        </marker>

        {/* Selected / Hover Arrowhead */}
        <marker
          id="arrowhead-hover"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38BDF8" />
        </marker>
      </defs>

      {/* Existing Saved Relationships */}
      {relationships.map((rel) => {
        const srcPos = getPortCoords(rel.sourceTableId, rel.sourceColumnId, true);
        const tgtPos = getPortCoords(rel.targetTableId, rel.targetColumnId, false);

        if (!srcPos || !tgtPos) return null;

        // Smart bezier control points
        const dx = Math.abs(tgtPos.x - srcPos.x);
        const controlOffset = Math.max(60, dx * 0.4);

        const isLeftToRight = tgtPos.x >= srcPos.x;
        const cp1x = isLeftToRight ? srcPos.x + controlOffset : srcPos.x + controlOffset;
        const cp1y = srcPos.y;
        const cp2x = isLeftToRight ? tgtPos.x - controlOffset : tgtPos.x - controlOffset;
        const cp2y = tgtPos.y;

        const pathData = `M ${srcPos.x} ${srcPos.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tgtPos.x} ${tgtPos.y}`;
        const midX = (srcPos.x + tgtPos.x) / 2;
        const midY = (srcPos.y + tgtPos.y) / 2;

        return (
          <g key={rel.id} className="group pointer-events-auto cursor-pointer">
            {/* Fat invisible line for easy clicking/hovering */}
            <path
              d={pathData}
              fill="none"
              stroke="transparent"
              strokeWidth="16"
              onClick={() => {
                if (confirm('Delete this relationship connector?')) {
                  onDeleteRelationship(rel.id);
                }
              }}
            />

            {/* Glowing Accent Underline on hover */}
            <path
              d={pathData}
              fill="none"
              stroke="#06B6D4"
              strokeWidth="4"
              className="opacity-0 group-hover:opacity-40 transition-opacity blur-[2px]"
            />

            {/* Visible Line */}
            <path
              d={pathData}
              fill="none"
              stroke="#06B6D4"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
              className="group-hover:stroke-cyan-300 transition-colors"
            />

            {/* Source Anchor Dot */}
            <circle cx={srcPos.x} cy={srcPos.y} r="3" fill="#06B6D4" />

            {/* Target Anchor Dot */}
            <circle cx={tgtPos.x} cy={tgtPos.y} r="3" fill="#10B981" />

            {/* Cardinality Badges */}
            <g transform={`translate(${srcPos.x + (isLeftToRight ? 16 : 16)}, ${srcPos.y - 8})`}>
              <rect x="-8" y="-8" width="16" height="16" rx="4" fill="#111827" stroke="#374151" strokeWidth="1" />
              <text x="0" y="4" textAnchor="middle" fill="#06B6D4" fontSize="10" fontFamily="monospace" fontWeight="bold">
                {rel.cardinality === '1:1' ? '1' : 'N'}
              </text>
            </g>

            <g transform={`translate(${tgtPos.x - (isLeftToRight ? 16 : 16)}, ${tgtPos.y - 8})`}>
              <rect x="-8" y="-8" width="16" height="16" rx="4" fill="#111827" stroke="#374151" strokeWidth="1" />
              <text x="0" y="4" textAnchor="middle" fill="#10B981" fontSize="10" fontFamily="monospace" fontWeight="bold">
                1
              </text>
            </g>

            {/* Hover Tooltip / Delete hint */}
            <g
              transform={`translate(${midX}, ${midY})`}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onDeleteRelationship(rel.id)}
            >
              <rect x="-30" y="-12" width="60" height="24" rx="12" fill="#1F2937" stroke="#EF4444" strokeWidth="1" />
              <text x="0" y="4" textAnchor="middle" fill="#F87171" fontSize="10" fontFamily="monospace">
                delete
              </text>
            </g>
          </g>
        );
      })}

      {/* Active In-Progress Drag Connection */}
      {activeConnection && (() => {
        const srcPos = getPortCoords(activeConnection.sourceTableId, activeConnection.sourceColumnId, true);
        if (!srcPos) return null;

        const curPos = activeConnection.currentMousePos;
        const dx = Math.abs(curPos.x - srcPos.x);
        const controlOffset = Math.max(40, dx * 0.4);

        const pathData = `M ${srcPos.x} ${srcPos.y} C ${srcPos.x + controlOffset} ${srcPos.y}, ${curPos.x - controlOffset} ${curPos.y}, ${curPos.x} ${curPos.y}`;

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
            <circle cx={srcPos.x} cy={srcPos.y} r="4" fill="#A855F7" />
            <circle cx={curPos.x} cy={curPos.y} r="4" fill="#A855F7" />
          </g>
        );
      })()}
    </svg>
  );
};
