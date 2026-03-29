import { useState } from 'react';
import { BoardProvider } from './context/BoardContext';
import { UploadScreen } from './components/UploadScreen';
import { InteractiveBoard } from './components/InteractiveBoard';

export const App = () => {
  const [currentPage, setCurrentPage] = useState<'upload' | 'board'>('upload');

  return (
    <BoardProvider>
      <div className="min-h-screen bg-slate-900 text-slate-50 font-sans selection:bg-indigo-500/30">
        {currentPage === 'upload' ? (
          <UploadScreen onComplete={() => setCurrentPage('board')} />
        ) : (
          <InteractiveBoard />
        )}
      </div>
    </BoardProvider>
  );
};

export default App;
