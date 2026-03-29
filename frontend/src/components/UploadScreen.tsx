import React, { useState, useRef } from 'react';
import { Loader2, ImagePlus } from 'lucide-react';
import { useBoard } from '../context/BoardContext';

interface UploadScreenProps {
  onComplete: () => void;
}

export const UploadScreen: React.FC<UploadScreenProps> = ({ onComplete }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { fetchBoardState, error } = useBoard();
  const [secretClicks, setSecretClicks] = useState(0);

  const handleSecretClick = () => {
    const newCount = secretClicks + 1;
    setSecretClicks(newCount);
    if (newCount === 5) {
      const pwd = window.prompt("Admin override passcode:");
      if (pwd) {
        localStorage.setItem('adminToken', pwd);
        alert("Admin mode active.");
      }
      setSecretClicks(0);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setLoadingText('Analyzing terrain...');

    // Cycle uploading text for immersion
    const interval = setInterval(() => {
      setLoadingText(prev => prev === 'Analyzing terrain...' ? 'Detecting structures...' : 'Mapping animal territories...');
    }, 1500);

    try {
      await fetchBoardState(file);
      onComplete();
    } catch (e) {
      console.error(e);
      setIsUploading(false);
    } finally {
      clearInterval(interval);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[100px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-emerald-600/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        <div className="text-center mb-8">
          <h1 
            onClick={handleSecretClick}
            className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-indigo-400 cursor-default select-none"
          >
            Cryptid Solver
          </h1>
          <p className="text-slate-400 text-lg">Upload your game board to begin</p>
        </div>

        <div
          className={`w-full aspect-square max-h-[400px] rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-8 backdrop-blur-sm cursor-pointer ${isDragActive
              ? 'border-emerald-400 bg-emerald-400/10 scale-105 shadow-2xl shadow-emerald-500/20'
              : 'border-slate-600 bg-slate-800/40 hover:bg-slate-800/60 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10'
            }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleChange}
            disabled={isUploading}
          />

          {!isUploading ? (
            <>
              <div className="h-20 w-20 rounded-full bg-slate-700/50 flex items-center justify-center mb-6 text-indigo-400 transition-transform duration-300 group-hover:scale-110">
                <ImagePlus size={40} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-200">
                Tap to select photo
              </h3>
              <p className="text-slate-400 text-center max-w-[200px]">
                or drag and drop an image of your map here
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-emerald-400">
              <Loader2 size={48} className="animate-spin mb-6" />
              <p className="text-xl font-medium animate-pulse">{loadingText}</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center max-w-sm animate-in fade-in slide-in-from-bottom-2">
            {error}
          </div>
        )}

        {!isUploading && (
          <button
            onClick={onComplete}
            className="mt-8 text-slate-500 hover:text-indigo-400 transition-colors text-sm font-medium flex items-center gap-2 group"
          >
            Skip and use mock board
            <div className="w-4 h-[1px] bg-slate-700 group-hover:bg-indigo-400 group-hover:w-8 transition-all" />
          </button>
        )}
      </div>
    </div>
  );
};
