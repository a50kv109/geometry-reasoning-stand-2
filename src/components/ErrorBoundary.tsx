import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          id="errorBoundaryCard"
          className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 flex flex-col gap-3 shadow-xs m-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-100 rounded-xl text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-950">
                {this.props.fallbackTitle || 'Произошла ошибка отображения блока'}
              </h3>
              <p className="text-xs text-rose-700">
                {this.state.error?.message || 'Непредвиденная ошибка выполнения.'}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-rose-200/70 flex items-center justify-between">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Попробовать снова
            </button>
            <span className="text-[11px] font-mono text-rose-500">
              Безопасный режим восстановления
            </span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
