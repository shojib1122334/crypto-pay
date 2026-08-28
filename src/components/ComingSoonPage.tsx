import React from 'react';

export const ComingSoonPage: React.FC = () => {
  return (
    <div
      id="coming-soon-view"
      className="min-h-[65vh] flex flex-col items-center justify-center px-4"
    >
      <div className="text-center">
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-widest uppercase select-none text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-200 to-amber-300 drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
          COMING SOON
        </h1>
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#F43F5E] animate-pulse" />
          <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#FBBF24] animate-pulse delay-100" />
          <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_#60A5FA] animate-pulse delay-200" />
          <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#FFFFFF] animate-pulse delay-300" />
        </div>
      </div>
    </div>
  );
};

export default ComingSoonPage;
