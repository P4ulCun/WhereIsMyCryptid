import React from 'react';
import type { Hexagon as HexType } from '../context/BoardContext';
import { Tent, LandPlot, PawPrint, Skull } from 'lucide-react';

interface HexagonNodeProps {
  hex: HexType;
  x: number;
  y: number;
  size: number;
  onClick: (hex: HexType) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isSelected?: boolean;
}

const getTerrainColor = (terrain: HexType['terrain']) => {
  switch (terrain) {
    case 'water': return '#90d5ff'; // ocean-blue
    case 'swamp': return '#7c3aed'; // royal violet (violet-600)
    case 'forest': return '#22c55e'; // green (green-500)
    case 'desert': return '#eab308'; // gold (yellow-500)
    case 'mountain': return '#9ca3af'; // grayish (gray-400)
  }
};

const getStructureIcon = (structure: HexType['structure'], color: HexType['structure_color']) => {
  if (!structure || structure === 'none') return null;

  const colorMap: Record<string, string> = {
    'white': '#f8fafc',
    'blue': '#3b82f6',
    'green': '#22c55e',
    'black': '#0f172a',
    'red': '#ef4444'
  };

  const iconColor = color && colorMap[color.toLowerCase()] ? colorMap[color.toLowerCase()] : '#ffffff';

  if (structure === 'shack') return <Tent size={16} color={iconColor} strokeWidth={2.5} className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />;
  if (structure === 'standing_stone') return <LandPlot size={16} color={iconColor} strokeWidth={2.5} className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />;
  return null;
};

const getAnimalIcon = (animal: HexType['animal_territory']) => {
  if (animal === 'bear') return <Skull size={16} className="text-red-600 drop-shadow-md" />;
  if (animal === 'cougar') return <PawPrint size={16} className="text-orange-500 drop-shadow-md" />;
  return null;
};

export const HexagonNode: React.FC<HexagonNodeProps> = ({ hex, x, y, size, onClick, onMouseEnter, onMouseLeave, isSelected }) => {
  // Generate a flat-topped hexagon SVG path centered at 0,0
  const hexPoints = Array.from({ length: 6 }).map((_, i) => {
    const angle_deg = 60 * i; // Flat topped starts at 0 deg
    const angle_rad = Math.PI / 180 * angle_deg;
    return `${size * Math.cos(angle_rad)},${size * Math.sin(angle_rad)}`;
  }).join(' ');

  const fillColor = getTerrainColor(hex.terrain);

  const strokeStyles = isSelected
    ? "stroke-rose-500 stroke-[4px] drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]"
    : "stroke-slate-800 stroke-[2px] group-hover:stroke-rose-500 group-hover:stroke-[4px] group-hover:drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]";

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={() => onClick(hex)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`cursor-pointer group ${isSelected ? 'relative z-50' : ''}`}
    >
      <polygon
        points={hexPoints}
        fill={fillColor}
        className={`transition-all duration-100 ${strokeStyles} ${hex.is_shadowed ? 'opacity-30' : 'opacity-100'}`}
      />

      {/* If shadowed, draw a subtle cross out */}
      {hex.is_shadowed && (
        <g stroke="#eff6ff" strokeWidth="3" strokeLinecap="round" className="opacity-50">
          <line x1={-size * 0.5} y1={-size * 0.5} x2={size * 0.5} y2={size * 0.5} />
          <line x1={size * 0.5} y1={-size * 0.5} x2={-size * 0.5} y2={size * 0.5} />
        </g>
      )}

      {/* Render Icons via foreignObject to easily use Lucide react components */}
      <foreignObject x={-size / 2} y={-size / 2} width={size} height={size} style={{ pointerEvents: 'none' }}>
        <div className={`w-full h-full flex flex-col items-center justify-center gap-1 ${hex.is_shadowed ? 'opacity-30' : 'opacity-100'}`}>
          {getStructureIcon(hex.structure, hex.structure_color)}
          {getAnimalIcon(hex.animal_territory)}
        </div>
      </foreignObject>
    </g>
  );
};
