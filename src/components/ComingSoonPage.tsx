import React from 'react';

export const ComingSoonPage: React.FC = () => {
  return (
    <div
      id="coming-soon-view"
      className="min-h-[70vh] flex flex-col items-center justify-center px-4"
    >
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-400 mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse" />
          <span>Under Development</span>
        </div>
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-widest uppercase select-none text-[#FFFFFF] drop-shadow-[0_0_25px_rgba(255,255,255,0.1)]">
          COMING SOON
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 mt-4 max-w-md mx-auto">
          Merchant settlements, webhooks, multi-currency auto-conversion, and API keys are coming in the next release.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <span className="w-3 h-3 rounded-full bg-[#FFFFFF] shadow-[0_0_8px_#FFFFFF] animate-pulse" />
          <span className="w-3 h-3 rounded-full bg-[#00E676] shadow-[0_0_8px_#00E676] animate-pulse delay-100" />
          <span className="w-3 h-3 rounded-full bg-[#3B82F6] shadow-[0_0_8px_#3B82F6] animate-pulse delay-200" />
          <span className="w-3 h-3 rounded-full bg-[#FACC15] shadow-[0_0_8px_#FACC15] animate-pulse delay-300" />
          <span className="w-3 h-3 rounded-full bg-[#EF4444] shadow-[0_0_8px_#EF4444] animate-pulse delay-500" />
        </div>
      </div>
    </div>
  );
};

export default ComingSoonPage;


