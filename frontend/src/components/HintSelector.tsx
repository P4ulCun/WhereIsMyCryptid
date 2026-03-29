import React, { useState } from 'react';
import { useBoard } from '../context/BoardContext';
import { Plus, Play, Sparkles } from 'lucide-react';

export interface Hint {
  id: string;
  isNegative: boolean;
  distance: 'on' | 'within_1' | 'within_2' | 'within_3';
  target1: string;
  target2?: string;
}

const DISTANCE_OPTIONS = [
  { value: 'on', label: 'On' },
  { value: 'within_1', label: 'Within 1 space of' },
  { value: 'within_2', label: 'Within 2 spaces of' },
  { value: 'within_3', label: 'Within 3 spaces of' },
];

const TERRAINS = [
  { value: 'water', label: 'Water' },
  { value: 'swamp', label: 'Swamp' },
  { value: 'forest', label: 'Forest' },
  { value: 'desert', label: 'Desert' },
  { value: 'mountain', label: 'Mountain' },
];

const WITHIN_1_OPTIONS = [
  ...TERRAINS,
  { value: 'either_animal', label: 'Either Animal Territory' }
];

const WITHIN_2_OPTIONS = [
  { value: 'shack', label: 'Shack' },
  { value: 'standing_stone', label: 'Standing Stone' },
  { value: 'bear', label: 'Bear Territory' },
  { value: 'cougar', label: 'Cougar Territory' },
];

const WITHIN_3_OPTIONS = [
  { value: 'white', label: 'White Structure' },
  { value: 'blue', label: 'Blue Structure' },
  { value: 'green', label: 'Green Structure' },
  { value: 'black', label: 'Black Structure' },
];

export const HintSelector: React.FC = () => {
  const { evaluateHints } = useBoard();
  const [hints, setHints] = useState<Hint[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const addHint = () => {
    setHints(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        isNegative: false,
        distance: 'within_1',
        target1: 'water',
      }
    ]);
  };

  const removeHint = (id: string) => {
    setHints(prev => prev.filter(h => h.id !== id));
  };

  const handleUpdateHint = (id: string, updates: Partial<Hint>) => {
    setHints(prev => prev.map(h => {
      if (h.id !== id) return h;
      const updated = { ...h, ...updates };

      // Handle cascading resets if distance changed
      // Note: we only do this explicitly if 'distance' is part of the update
      if (updates.distance && updates.distance !== h.distance) {
        if (updates.distance === 'on') {
          updated.target1 = 'water';
          updated.target2 = 'swamp';
        } else if (updates.distance === 'within_1') {
          updated.target1 = 'water';
          delete updated.target2;
        } else if (updates.distance === 'within_2') {
          updated.target1 = 'shack';
          delete updated.target2;
        } else if (updates.distance === 'within_3') {
          updated.target1 = 'white';
          delete updated.target2;
        }
      }

      // Handle preventing duplicate targets in 'on' mode
      if (updated.distance === 'on' && updated.target1 === updated.target2) {
        // Find a different terrain
        const fallback = TERRAINS.find(t => t.value !== updated.target1)?.value || 'water';
        if (updates.target1) updated.target2 = fallback;
        if (updates.target2) updated.target1 = fallback;
      }

      return updated;
    }));
  };

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    try {
      await evaluateHints(hints);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="w-full bg-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl border border-slate-700 relative overflow-hidden">
      {/* Dynamic background glow */}
      <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Sparkles size={20} className="text-indigo-400" />
            Clues & Constraints
          </h2>
          <p className="text-sm text-slate-400 mt-1">Add player clues to restrict possible locations</p>
        </div>

        <button
          onClick={addHint}
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-xl transition-colors font-medium text-sm border border-slate-600 shadow-sm"
        >
          <Plus size={16} /> Add Clue
        </button>
      </div>

      <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
        {hints.length === 0 ? (
          <div className="text-center py-8 text-slate-500 bg-slate-900/50 rounded-xl border border-dashed border-slate-700">
            No clues added yet. Click "Add Clue" to begin.
          </div>
        ) : (
          hints.map(hint => (
            <div key={hint.id} className="flex flex-wrap items-center gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-700 animate-in fade-in slide-in-from-left-4">

              {/* Positive / Negative Toggle */}
              <select
                value={hint.isNegative ? 'not' : 'is'}
                onChange={(e) => handleUpdateHint(hint.id, { isNegative: e.target.value === 'not' })}
                className="bg-slate-800 text-slate-200 border border-slate-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="is">The Cryptid is</option>
                <option value="not">The Cryptid is NOT</option>
              </select>

              {/* Distance Select */}
              <select
                value={hint.distance}
                onChange={(e) => handleUpdateHint(hint.id, { distance: e.target.value as any })}
                className="bg-slate-800 text-slate-200 border border-slate-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {DISTANCE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              {/* Target 1 Select */}
              <select
                value={hint.target1}
                onChange={(e) => handleUpdateHint(hint.id, { target1: e.target.value })}
                className="bg-slate-800 text-slate-200 border border-slate-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {hint.distance === 'on' && TERRAINS.map(opt => (
                  <option key={opt.value} value={opt.value} disabled={opt.value === hint.target2}>{opt.label}</option>
                ))}
                {hint.distance === 'within_1' && WITHIN_1_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
                {hint.distance === 'within_2' && WITHIN_2_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
                {hint.distance === 'within_3' && WITHIN_3_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              {/* Target 2 Select (Only for 'on') */}
              {hint.distance === 'on' && (
                <>
                  <span className="text-slate-400 text-sm font-medium">or</span>
                  <select
                    value={hint.target2 || ''}
                    onChange={(e) => handleUpdateHint(hint.id, { target2: e.target.value })}
                    className="bg-slate-800 text-slate-200 border border-slate-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {TERRAINS.map(opt => (
                      <option key={opt.value} value={opt.value} disabled={opt.value === hint.target1}>{opt.label}</option>
                    ))}
                  </select>
                </>
              )}

              <button
                onClick={() => removeHint(hint.id)}
                className="ml-auto p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
                title="Remove clue"
              >
                &times;
              </button>
            </div>
          ))
        )}
      </div>

      <button
        onClick={handleEvaluate}
        disabled={isEvaluating}
        className="w-full relative group overflow-hidden bg-gradient-to-r from-emerald-500 to-indigo-500 text-white font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
      >
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
        <span className="relative flex items-center justify-center gap-2">
          {isEvaluating ? (
            <span className="animate-pulse">Evaluating Possibilities...</span>
          ) : (
            <>
              <Play fill="currentColor" size={20} /> Evaluate Board
            </>
          )}
        </span>
      </button>

    </div>
  );
};
