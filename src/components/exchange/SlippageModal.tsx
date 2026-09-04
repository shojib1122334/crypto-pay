import React, { useState } from 'react';
import { X, AlertTriangle, Info, Check } from 'lucide-react';

interface SlippageModalProps {
  isOpen: boolean;
  onClose: () => void;
  slippage: number;
  onSelectSlippage: (val: number) => void;
  deadlineMinutes?: number;
  onSelectDeadline?: (minutes: number) => void;
}

export const SlippageModal: React.FC<SlippageModalProps> = ({
  isOpen,
  onClose,
  slippage,
  onSelectSlippage,
  deadlineMinutes = 20,
  onSelectDeadline,
}) => {
  const [customValue, setCustomValue] = useState<string>(
    [0.1, 0.5, 1.0].includes(slippage) ? '' : slippage.toString()
  );
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCustomChange = (val: string) => {
    setCustomValue(val);
    const num = parseFloat(val);
    if (isNaN(num)) {
      setError('Please enter a valid number');
      return;
    }
    if (num <= 0) {
      setError('Slippage must be greater than 0%');
      return;
    }
    if (num > 5.0) {
      setError('Maximum allowed slippage is 5.0%');
      return;
    }
    setError(null);
    onSelectSlippage(num);
  };

  const handlePreset = (preset: number) => {
    setCustomValue('');
    setError(null);
    onSelectSlippage(preset);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Transaction Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Slippage section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                Slippage Tolerance
                <span title="Your transaction will revert if the price changes unfavorably by more than this percentage.">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                </span>
              </label>
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                {slippage}% Selected
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[0.1, 0.5, 1.0].map((preset) => {
                const active = slippage === preset && !customValue;
                return (
                  <button
                    key={preset}
                    onClick={() => handlePreset(preset)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {preset}%
                  </button>
                );
              })}

              {/* Custom input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Custom"
                  value={customValue}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  className={`w-full py-2 pl-2.5 pr-6 text-xs font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/80 border rounded-xl focus:outline-none ${
                    customValue
                      ? 'border-indigo-600 dark:border-indigo-500'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  %
                </span>
              </div>
            </div>

            {error && (
              <p className="mt-1.5 text-[11px] text-rose-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0" /> {error}
              </p>
            )}

            {slippage > 2.0 && !error && (
              <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0" /> High slippage increases risk of frontrunning.
              </p>
            )}
          </div>

          {/* Deadline section */}
          {onSelectDeadline && (
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                Transaction Deadline
              </label>
              <div className="flex gap-2">
                {[10, 20, 30].map((mins) => {
                  const active = deadlineMinutes === mins;
                  return (
                    <button
                      key={mins}
                      onClick={() => onSelectDeadline(mins)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                        active
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {mins} mins
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      </div>
    </div>
  );
};
