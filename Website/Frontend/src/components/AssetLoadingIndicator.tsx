import React from 'react';
import { AssetLoadingState } from '../services/AssetManager';
import { FaExclamationTriangle, FaCheckCircle, FaSpinner, FaRedo } from 'react-icons/fa';

interface Props {
  loadingState: AssetLoadingState;
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const AssetLoadingIndicator: React.FC<Props> = ({ 
  loadingState, 
  isLoading, 
  error,
  onRetry
}) => {
  // Success state
  if (!isLoading && loadingState.stage === 'complete') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
        <div className="flex items-center space-x-2">
          <FaCheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-green-800 text-sm font-medium">Models ready</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || loadingState.stage === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FaExclamationTriangle className="w-4 h-4 text-red-600" />
            <span className="text-red-800 text-sm">Failed to load models</span>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center space-x-1 text-red-600 hover:text-red-700 text-sm"
            >
              <FaRedo className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
        <div className="flex items-center space-x-2">
          <FaSpinner className="w-4 h-4 text-blue-600 animate-spin" />
          <span className="text-blue-800 text-sm">{loadingState.message}</span>
        </div>
      </div>
    );
  }

  return null;
};