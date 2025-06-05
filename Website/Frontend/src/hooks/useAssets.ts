import { useState, useEffect, useCallback } from 'react';
import { AssetManager, AssetLoadingState, AssetBundle } from '../services/AssetManager';

interface UseAssetsReturn {
  assets: AssetBundle | null;
  isLoading: boolean;
  isReady: boolean;
  loadingState: AssetLoadingState;
  error: string | null;
  retryLoading: () => void;
  // clearCache: () => void;
}

export const useAssets = (): UseAssetsReturn => {
  const [assets, setAssets] = useState<AssetBundle | null>(null);
  const [loadingState, setLoadingState] = useState<AssetLoadingState>({
    stage: 'idle',
    progress: 0,
    message: 'Ready to load assets'
  });
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const loadAssets = useCallback(async () => {
    try {
      setError(null);
      setAssets(null);
      
      const loadedAssets = await AssetManager.loadAssetsWithProgress(
        (state) => {
          setLoadingState(state);
        }
      );
      
      setAssets(loadedAssets);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setLoadingState(prev => ({ 
        ...prev, 
        stage: 'error',
        message: errorMessage 
      }));
    }
  }, []);

  const retryLoading = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  const clearCache = useCallback(() => {
    AssetManager.clearMemoryCache();
    setAssets(null);
    setLoadingState({
      stage: 'idle',
      progress: 0,
      message: 'Cache cleared. Ready to reload.'
    });
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initializeAssets = async () => {
      if (cancelled) return;
      await loadAssets();
    };

    initializeAssets();

    return () => {
      cancelled = true;
    };
  }, [loadAssets, retryCount]);

  return {
    assets,
    isLoading: loadingState.stage !== 'complete' && loadingState.stage !== 'error' && loadingState.stage !== 'idle',
    isReady: loadingState.stage === 'complete' && assets !== null,
    loadingState,
    error,
    retryLoading,
    // clearCache
  };
};