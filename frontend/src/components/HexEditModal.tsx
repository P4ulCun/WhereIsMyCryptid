import React from 'react';
import type { Hexagon as HexType, TerrainType, StructureType, AnimalTerritoryType } from '../context/BoardContext';
import { useBoard } from '../context/BoardContext';
import { X } from 'lucide-react';

interface HexEditModalProps {
  hex: HexType;
  onClose: () => void;
}

export const HexEditModal: React.FC<HexEditModalProps> = ({ hex, onClose }) => {
  const { hexes, updateHex } = useBoard();

  // The 'hex' prop might be stale if the context updates. Find the latest from context.
  const currentHex = hexes.find(h => h.id === hex.id) || hex;

  const handleTerrainChange = (terrain: TerrainType) => updateHex(hex.id, { terrain });
  const handleStructureChange = (structure: StructureType) => updateHex(hex.id, { structure });
  const handleColorChange = (structure_color: string | null) => updateHex(hex.id, { structure_color });
  const handleAnimalChange = (animal_territory: AnimalTerritoryType) => updateHex(hex.id, { animal_territory });

  const terrains: TerrainType[] = ['water', 'swamp', 'forest', 'desert', 'mountain'];
  const structures: StructureType[] = ['none', 'shack', 'standing_stone'];
  const structureColors = ['white', 'blue', 'green', 'black', 'red'];
  const animals: AnimalTerritoryType[] = ['none', 'bear', 'cougar'];

  return (
    <div className="absolute inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto bg-slate-900/95 backdrop-blur-md p-6 rounded-t-3xl shadow-[0_-20px_50px_rgba(0,0,0,0.6)] border-t border-slate-700 z-50 animate-in slide-in-from-bottom-full duration-300">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-100">Edit Hexagon</h3>
          <p className="text-sm text-slate-400">Coordinate: ({currentHex.q}, {currentHex.r})</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
        >
          <X size={20} className="text-slate-300" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Terrain */}
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Terrain</h4>
          <div className="flex flex-wrap gap-2">
            {terrains.map(t => (
              <button
                key={t}
                onClick={() => handleTerrainChange(t)}
                className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${currentHex.terrain === t
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Structure */}
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Structure</h4>
          <div className="flex flex-wrap gap-2">
            {structures.map(s => (
              <button
                key={s}
                onClick={() => handleStructureChange(s)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentHex.structure === s
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Conditional Color Picker for Structures */}
        {currentHex.structure && currentHex.structure !== 'none' && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <h5 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Structure Color</h5>
            <div className="flex gap-3 items-center">
              {structureColors.map(c => (
                <button
                  key={c}
                  onClick={() => handleColorChange(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${currentHex.structure_color === c
                    ? 'border-slate-300 scale-110 shadow-[0_0_12px_rgba(255,255,255,0.2)]'
                    : 'border-transparent hover:scale-105'
                    }`}
                  style={{
                    backgroundColor: c === 'white' ? '#f8fafc' : c === 'blue' ? '#3b82f6' : c === 'green' ? '#22c55e' : c === 'black' ? '#0f172a' : '#ef4444'
                  }}
                  title={c}
                />
              ))}
              <button
                onClick={() => handleColorChange(null)}
                className={`ml-2 px-3 py-1 text-xs rounded-lg transition-all ${!currentHex.structure_color ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Animal Territory */}
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Animal Territory</h4>
          <div className="flex flex-wrap gap-2">
            {animals.map(a => (
              <button
                key={a}
                onClick={() => handleAnimalChange(a)}
                className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${currentHex.animal_territory === a
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div >
  );
};
