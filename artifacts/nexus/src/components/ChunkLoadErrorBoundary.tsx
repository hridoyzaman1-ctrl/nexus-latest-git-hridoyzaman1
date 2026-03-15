import React, { Component, ErrorInfo, ReactNode } from 'react';
import { WifiOff, RefreshCcw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ChunkLoadErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleBack = () => {
    window.history.back();
    setTimeout(() => {
      this.setState({ hasError: false, error: null });
    }, 100);
  };

  private handleRetry = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isChunkError = 
        this.state.error?.name === 'ChunkLoadError' || 
        this.state.error?.message?.includes('Loading chunk') ||
        this.state.error?.message?.includes('Failed to fetch dynamically imported module');

      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6 animate-in fade-in duration-500">
          <div className="w-20 h-20 rounded-3xl bg-muted/30 flex items-center justify-center relative">
            <WifiOff className="w-10 h-10 text-muted-foreground" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-background animate-pulse" />
          </div>
          
          <div className="space-y-2 max-w-sm">
            <h1 className="text-2xl font-bold font-display">
              {isChunkError ? 'Module Offline' : 'Something went wrong'}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isChunkError 
                ? "This module hasn't been cached for offline use yet. Please connect to the internet to load it for the first time."
                : "An unexpected error occurred. We're sorry for the inconvenience."}
            </p>
          </div>

          <div className="flex flex-col w-full max-w-[240px] gap-2">
            <Button onClick={this.handleRetry} className="w-full gap-2">
              <RefreshCcw className="w-4 h-4" /> Try Again
            </Button>
            <Button onClick={this.handleBack} variant="ghost" className="w-full gap-2">
              <ArrowLeft className="w-4 h-4" /> Go Back
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground/40 font-mono pt-4">
            {this.state.error?.message || 'Unknown error'}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
