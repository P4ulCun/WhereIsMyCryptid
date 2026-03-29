import React, { useState } from 'react';
import { useBoard } from '../context/BoardContext';
import { X, ArrowLeft, RotateCw, AlertTriangle } from 'lucide-react';

interface PieceEditModalProps {
  onClose: () => void;
}

const POSITION_LABELS: Record<number, string> = {
  0: 'Top Left',
  1: 'Top Right',
  2: 'Middle Left',
  3: 'Middle Right',
  4: 'Bottom Left',
  5: 'Bottom Right',
};

export const PieceEditModal: React.FC<PieceEditModalProps> = ({ onClose }) => {
  const { pieces, updatePiece, isLoading } = useBoard();
  const [selectedGridPosition, setSelectedGridPosition] = useState<number | null>(null);

  // Draft state for when a piece position is selected
  const [draftPieceNumber, setDraftPieceNumber] = useState<number>(1);
  const [draftIsFlipped, setDraftIsFlipped] = useState<boolean>(false);

  const handleSelectPosition = (pos: number) => {
    const existing = pieces.find(p => p.grid_position === pos);
    setDraftPieceNumber(existing ? existing.piece_number : 1);
    setDraftIsFlipped(existing ? existing.is_flipped : false);
    setSelectedGridPosition(pos);
  };

  const handleSave = async () => {
    if (selectedGridPosition === null) return;
    await updatePiece(selectedGridPosition, draftPieceNumber, draftIsFlipped);
    setSelectedGridPosition(null); // Go back to grid view
  };

  const hasDuplicates = pieces.length !== new Set(pieces.map(p => p.piece_number)).size;

  return (
    <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto bg-slate-900/95 backdrop-blur-md p-6 rounded-t-3xl shadow-[0_-20px_50px_rgba(0,0,0,0.6)] border-t border-slate-700 z-50 animate-in slide-in-from-bottom-full duration-300">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          {selectedGridPosition !== null && (
            <button
              onClick={() => setSelectedGridPosition(null)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors text-slate-300"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h3 className="text-xl font-bold text-slate-100">
              {selectedGridPosition !== null ? `Edit ${POSITION_LABELS[selectedGridPosition]} Piece` : 'Board Layout'}
            </h3>
            <p className="text-sm text-slate-400">
              {selectedGridPosition !== null ? 'Configure piece details' : 'Select a position to edit'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
        >
          <X size={20} className="text-slate-300" />
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {selectedGridPosition === null ? (
          <div className="flex flex-col gap-3 h-full">
            {/* Warning banner */}
            {hasDuplicates && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm shrink-0">
                <AlertTriangle size={15} className="shrink-0" />
                <span>Each piece number should be unique — you have duplicates.</span>
              </div>
            )}

            {/* Grid View */}
            <div className="grid grid-cols-2 gap-3 h-full">
              {[0, 1, 2, 3, 4, 5].map((pos) => {
                const p = pieces.find(x => x.grid_position === pos);
                return (
                  <button
                    key={pos}
                    onClick={() => handleSelectPosition(pos)}
                    className="flex flex-col items-center justify-center p-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-2xl transition-all group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-xs uppercase tracking-wider text-slate-400 mb-1">{POSITION_LABELS[pos]}</span>
                    {p ? (
                      <div className="flex flex-col items-center">
                        <span className="text-3xl font-extrabold text-slate-200 mb-1">{p.piece_number}</span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-emerald-400">
                          {p.is_flipped ? 'Flipped' : 'Normal'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic text-sm">Empty</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Edit View */
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-300">
            {/* Piece Number Selection */}
            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Piece Number</h4>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <button
                    key={num}
                    onClick={() => setDraftPieceNumber(num)}
                    className={`p-4 rounded-xl text-lg font-bold transition-all ${draftPieceNumber === num
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 border-indigo-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      } border`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Flipped Toggle */}
            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Orientation</h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDraftIsFlipped(false)}
                  className={`p-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${!draftIsFlipped
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 border-emerald-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    } border`}
                >
                  Normal
                </button>
                <button
                  onClick={() => setDraftIsFlipped(true)}
                  className={`p-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${draftIsFlipped
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 border-emerald-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    } border`}
                >
                  <RotateCw size={18} className={draftIsFlipped ? 'text-white' : 'text-slate-400'} />
                  Flipped
                </button>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="w-full relative group overflow-hidden bg-gradient-to-r from-emerald-500 to-indigo-500 text-white font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative flex items-center justify-center gap-2">
                {isLoading ? 'Updating Board...' : 'Apply Changes'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
