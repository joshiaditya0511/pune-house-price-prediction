import * as ort from "onnxruntime-web";

export interface AssetLoadingState {
  stage: 'idle' | 'downloading' | 'parsing' | 'complete' | 'error';
  progress: number;
  message: string;
  currentAsset?: string;
}

export interface AssetBundle {
  predictionSession: ort.InferenceSession;
  recPreprocessorSession: ort.InferenceSession;
  recNnSession: ort.InferenceSession;
  featureWeights: Record<string, number>;
  propertyIdMap: string[];
  propertyMetadata: Record<string, any>;
}

export class AssetManager {
  private static memoryCache = new Map<string, any>();
  private static readonly ASSETS = [
    { 
      url: '/prediction_pipeline_iteration_3.onnx', 
      type: 'predictionSession',
      category: 'onnx',
      name: 'Prediction Model'
    },
    { 
      url: '/recommendation_preprocessor.onnx', 
      type: 'recPreprocessorSession',
      category: 'onnx',
      name: 'Recommendation Preprocessor'
    },
    { 
      url: '/nearest_neighbors_model.onnx', 
      type: 'recNnSession',
      category: 'onnx',
      name: 'Nearest Neighbors Model'
    },
    { 
      url: '/recommendation_feature_weights.json', 
      type: 'featureWeights',
      category: 'json',
      name: 'Feature Weights'
    },
    { 
      url: '/property_ids.json', 
      type: 'propertyIdMap',
      category: 'json',
      name: 'Property IDs'
    },
    { 
      url: '/recommendations_property_metadata.json', 
      type: 'propertyMetadata',
      category: 'json',
      name: 'Property Metadata'
    }
  ];

  static async loadAssetsWithProgress(
    onProgress?: (state: AssetLoadingState) => void
  ): Promise<AssetBundle> {
    const updateProgress = (
      stage: AssetLoadingState['stage'], 
      progress: number, 
      message: string, 
      currentAsset?: string
    ) => {
      onProgress?.({ stage, progress, message, currentAsset });
    };

    try {
      updateProgress('downloading', 0, 'Initializing...', 'system');
      
      const sessionOptions: ort.InferenceSession.options = {
        executionProviders: ["wasm", "webgl"],
        graphOptimizationLevel: 'all',
      };

      const results: Partial<AssetBundle> = {};
      const totalAssets = this.ASSETS.length;
      
      for (let i = 0; i < totalAssets; i++) {
        const asset = this.ASSETS[i];
        const baseProgress = (i / totalAssets) * 85; // Reserve 15% for final setup
        
        updateProgress(
          'downloading', 
          baseProgress, 
          `Loading ${asset.name}...`, 
          asset.type
        );
        
        try {
          if (asset.category === 'onnx') {
            // Check memory cache first
            const cacheKey = `session_${asset.url}`;
            if (this.memoryCache.has(cacheKey)) {
              results[asset.type as keyof AssetBundle] = this.memoryCache.get(cacheKey);
              updateProgress(
                'downloading', 
                baseProgress + (1 / totalAssets) * 85, 
                `${asset.name} loaded from cache`, 
                asset.type
              );
            } else {
              updateProgress(
                'parsing', 
                baseProgress + (0.5 / totalAssets) * 85, 
                `Creating ${asset.name} session...`, 
                asset.type
              );
              
              const session = await ort.InferenceSession.create(asset.url, sessionOptions);
              this.memoryCache.set(cacheKey, session);
              results[asset.type as keyof AssetBundle] = session;
              
              updateProgress(
                'downloading', 
                baseProgress + (1 / totalAssets) * 85, 
                `${asset.name} ready`, 
                asset.type
              );
            }
          } else {
            // JSON files
            const cacheKey = `data_${asset.url}`;
            if (this.memoryCache.has(cacheKey)) {
              results[asset.type as keyof AssetBundle] = this.memoryCache.get(cacheKey);
            } else {
              const response = await fetch(asset.url, {
                cache: 'default', // Use browser cache
              });
              
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
              
              const data = await response.json();
              this.memoryCache.set(cacheKey, data);
              results[asset.type as keyof AssetBundle] = data;
            }
            
            updateProgress(
              'downloading', 
              baseProgress + (1 / totalAssets) * 85, 
              `${asset.name} loaded`, 
              asset.type
            );
          }
        } catch (error) {
          console.error(`Failed to load ${asset.name}:`, error);
          throw new Error(`Failed to load ${asset.name}: ${error.message}`);
        }
      }

      updateProgress('parsing', 90, 'Validating assets...', 'validation');
      
      // Validate all required assets are loaded
      const requiredKeys: (keyof AssetBundle)[] = [
        'predictionSession', 'recPreprocessorSession', 'recNnSession',
        'featureWeights', 'propertyIdMap', 'propertyMetadata'
      ];
      
      for (const key of requiredKeys) {
        if (!results[key]) {
          throw new Error(`Missing required asset: ${key}`);
        }
      }

      updateProgress('parsing', 95, 'Finalizing...', 'system');
      
      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 200));
      
      updateProgress('complete', 100, 'All models ready!', 'complete');
      
      return results as AssetBundle;
      
    } catch (error) {
      console.error('Asset loading failed:', error);
      updateProgress(
        'error', 
        0, 
        `Failed to load: ${error.message}`, 
        'error'
      );
      throw error;
    }
  }

  static clearMemoryCache(): void {
    this.memoryCache.clear();
  }

  static getCacheInfo(): { size: number; keys: string[] } {
    return {
      size: this.memoryCache.size,
      keys: Array.from(this.memoryCache.keys())
    };
  }
}