import React, { useRef, useState, useEffect } from 'react';
import type { Hexagon as HexType } from '../context/BoardContext';
import { useBoard } from '../context/BoardContext';
import { HexagonNode } from './HexagonNode';

interface HexBoardProps {
  onHexClick: (hex: HexType) => void;
  selectedHexId?: string | null;
}

export const HexBoard: React.FC<HexBoardProps> = ({ onHexClick, selectedHexId }) => {
  const { hexes } = useBoard();
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
  const [hoveredHexId, setHoveredHexId] = useState<string | null>(null);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setBoardSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    window.addEventListener('resize', updateSize);
    updateSize(); // initial
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Compute layout sizes based on 12x9 flat-topped grid layout using odd-q offset
  // Flat-topped width is 2 * size, height is sqrt(3) * size
  // width of map ~ 2 * size + 1.5 * size * (12 - 1)
  // height of map ~ 9 * Math.sqrt(3) * size + 0.5 * Math.sqrt(3) * size
  
  const hexSize = boardSize.width > 0 
    ? Math.min(
        boardSize.width / (2 + 1.5 * 11), 
        boardSize.height / (9 * Math.sqrt(3) + 0.5 * Math.sqrt(3))
      ) - 1 
    : 25;
    
  const hexHeight = Math.sqrt(3) * hexSize;

  const totalWidth = 2 * hexSize + 1.5 * hexSize * 11;
  const totalHeight = 9 * hexHeight + 0.5 * hexHeight;

  // Offset all hexes to center them in the container
  const offsetX = boardSize.width / 2 - totalWidth / 2 + hexSize;
  const offsetY = boardSize.height / 2 - totalHeight / 2 + hexHeight / 2;

  const hexRenderer = (hex: HexType) => {
    // Flat-top offset coordinates (odd-q): odd columns mapped down by half a height
    const isOdd = hex.q % 2 === 1;
    const x = hexSize * 3/2 * hex.q + offsetX;
    const y = hexHeight * (hex.r + (isOdd ? 0.5 : 0)) + offsetY;

    return (
      <HexagonNode 
        key={hex.id}
        hex={hex} 
        x={x} 
        y={y} 
        size={hexSize} 
        onClick={onHexClick}
        onMouseEnter={() => setHoveredHexId(hex.id)}
        onMouseLeave={() => setHoveredHexId(null)}
        isSelected={selectedHexId === hex.id}
      />
    );
  };

  const sortedHexes = [...hexes].sort((a, b) => {
    // Selected hex should always be on top of everything
    if (a.id === selectedHexId) return 1;
    if (b.id === selectedHexId) return -1;
    // Then hovered hex should be above normal hexes
    if (a.id === hoveredHexId) return 1;
    if (b.id === hoveredHexId) return -1;
    return 0;
  });

  return (
    <div ref={containerRef} className="w-full h-full min-h-[50vh] bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-700 shadow-inner relative">
      <svg width="100%" height="100%" className="absolute inset-0">
        <g>
          {sortedHexes.map(hexRenderer)}
        </g>
      </svg>
    </div>
  );
};
