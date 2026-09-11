import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RotateCcw, ShoppingBag } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by SAELYXE ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#FAF8F5] text-[#1A1816] flex items-center justify-center p-6 select-none">
          <div className="w-full max-w-lg bg-white p-8 sm:p-12 rounded-2xl border border-[#EAE3D9] shadow-sm text-center space-y-6">
            <div className="w-14 h-14 bg-[#FAF8F5] border border-[#EAE3D9] text-[#1A1816] rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7 stroke-[1.5]" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#8F8171] font-semibold">SAELYXE ATELIER</span>
              <h1 className="font-serif text-2xl sm:text-3xl text-[#1A1816]">Experience Interrupted</h1>
              <p className="text-xs leading-relaxed text-[#665A4E]">
                An unexpected display issue occurred while rendering this session. Your cart and details remain safely preserved.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 h-12 bg-[#1A1816] hover:bg-black text-white text-[11px] uppercase font-semibold tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload Session</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-6 h-12 bg-white border border-[#D5CBBF] text-[#1A1816] text-[11px] uppercase font-semibold tracking-[0.18em] rounded-xl hover:bg-[#FAF8F5] transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Storefront</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
