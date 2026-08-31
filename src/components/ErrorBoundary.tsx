import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled React error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-black text-white font-sans">
          <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-1.5">
                {this.props.fallbackTitle || 'Something went wrong'}
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                An unexpected interface error occurred. The application prevented a crash and is ready to recover.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-xl text-left">
                <p className="text-[11px] font-mono text-red-400 break-words font-semibold">
                  {this.state.error.message || 'Unknown render error'}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-3 px-4 rounded-xl bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
