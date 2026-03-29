import React, { useState } from 'react';
import { HexBoard } from './HexBoard';
import { HexEditModal } from './HexEditModal';
import { PieceEditModal } from './PieceEditModal';
import { HintSelector } from './HintSelector';
import type { Hexagon as HexType } from '../context/BoardContext';

export const InteractiveBoard: React.FC = () => {
  const [selectedHex, setSelectedHex] = useState<HexType | null>(null);
  const [isPieceModalOpen, setIsPieceModalOpen] = useState(false);

  const handleHexClick = (hex: HexType) => {
    setSelectedHex(hex);
  };

  return (
    <div className="flex flex-col h-screen w-full p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto gap-6 transition-all duration-500">
      
      <header className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-indigo-400">Cryptid Board</h1>
          <p className="text-slate-400 text-sm">Tap a hexagon to edit terrain</p>
        </div>
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => setIsPieceModalOpen(true)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-full text-sm font-medium border border-slate-600 transition-colors shadow-sm"
          >
            Edit Pieces
          </button>
          <div className="flex bg-slate-800 rounded-full px-4 py-2 text-sm font-medium border border-slate-700 shadow-sm">
            <span className="text-emerald-400 mr-2">●</span> Active
          </div>
        </div>
      </header>

      {/* Main Board Area */}
      <main className="flex-grow flex flex-col lg:flex-row gap-6">
        <div className="flex-grow w-full lg:w-2/3 h-[50vh] lg:h-full relative rounded-2xl shadow-xl bg-slate-900 border border-slate-700/50">
          <HexBoard 
            onHexClick={handleHexClick} 
            selectedHexId={selectedHex?.id} 
          />
        </div>
        
        <div className="w-full lg:w-1/3 shrink-0">
          <HintSelector />
        </div>
      </main>

      {/* Hex Edit Modal */}
      {selectedHex && (
        <HexEditModal 
          hex={selectedHex} 
          onClose={() => setSelectedHex(null)} 
        />
      )}

      {/* Piece Edit Modal */}
      {isPieceModalOpen && (
        <PieceEditModal 
          onClose={() => setIsPieceModalOpen(false)} 
        />
      )}

    </div>
  );
};
