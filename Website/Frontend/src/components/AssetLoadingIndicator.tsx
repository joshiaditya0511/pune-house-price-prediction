import React from 'react';
import { AssetLoadingState } from '../services/AssetManager';
import { AlertCircle, CheckCircle, Download, Loader2, RefreshCw } from 'lucide-react';

interface Props {
  loadingState: AssetLoadingState;
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  onClearCache?: () => void;
}

export const AssetLoadingIndicator: React.FC<Props> = ({ 
  loadingState, 
  isLoading, 
  error,
  onRetry,
  onClearCache 
}) => {
  // Success state
  if (!isLoading && loadingState.stage === 'complete') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-emerald-800 font-medium text-sm">Models Ready</p>
              <p className="text-emerald-700 text-xs">All AI models loaded successfully</p>
            </div>
          </div>
          {onClearCache && (
            <button
              onClick={onClearCache}
              className="text-emerald-600 hover:text-emerald-700 text-xs underline"
            >
              Clear Cache
            </button>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error || loadingState.stage === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 font-medium text-sm">Failed to Load Models</p>
            <p className="text-red-700 text-xs mt-1">{error || loadingState.message}</p>
            <div className="flex space-x-3 mt-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="flex items-center space-x-1 text-red-600 hover:text-red-700 text-xs font-medium"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              )}
              {onClearCache && (
                <button
                  onClick={onClearCache}
                  className="text-red-600 hover:text-red-700 text-xs underline"
                >
                  Clear Cache
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    const getIcon = () => {
      switch (loadingState.stage) {
        case 'downloading':
          return <Download className="w-4 h-4 text-blue-600" />;
        case 'parsing':
          return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
        default:
          return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      }
    };

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            {getIcon()}
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <p className="text-blue-800 text-sm font-medium">{loadingState.message}</p>
                <span className="text-blue-600 text-xs font-mono bg-blue-100 px-2 py-0.5 rounded">
                  {Math.round(loadingState.progress)}%
                </span>
              </div>
              {loadingState.currentAsset && (
                <p className="text-blue-600 text-xs mt-1">
                  Current: {loadingState.currentAsset}
                </p>
              )}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${Math.max(loadingState.progress, 5)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
};