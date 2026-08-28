import React from 'react';

export const ComingSoonPage: React.FC = () => {
  return (
    <div
      id="coming-soon-view"
      className="min-h-[70vh] flex flex-col items-center justify-center px-4"
    >
      <div className="text-center">
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-widest uppercase select-none text-slate-900 drop-shadow-sm">
          COMING SOON
        </h1>
        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse delay-100" />
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse delay-200" />
          <span className="w-2.5 h-2.5 rounded-full bg-slate-900 animate-pulse delay-300" />
        </div>
      </div>
    </div>
  );
};

export default ComingSoonPage;

