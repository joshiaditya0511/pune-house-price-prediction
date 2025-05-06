import React, { useState, useEffect } from "react";
import * as ort from "onnxruntime-web"; // Import ONNX Runtime Web
import options from "../data/options_iteration_3.json";
import PropertyCard from "./PropertyCard";
import type { Property } from "../types";

// --- Define paths to your models and data in the public directory ---
const PREDICTION_MODEL_URL = "/prediction_pipeline_iteration_3.onnx";
const REC_PREPROCESSOR_URL = "/recommendation_preprocessor.onnx"; // Path to preprocessor ONNX
const REC_NN_MODEL_URL = "/nearest_neighbors_model.onnx"; // Path to NN ONNX
const FEATURE_WEIGHTS_URL = "/recommendation_feature_weights.json"; // Path to weights JSON
const PROPERTY_ID_MAP_URL = "/property_ids.json"; // Path to ID map JSON
const PROPERTY_METADATA_URL = "/recommendations_property_metadata.json"; // Path to metadata JSON

// Define expected structure for weights and metadata
interface FeatureWeights {
  [key: string]: number;
}

interface PropertyMetadata {
  [key: string]: Property; // Assuming Property type matches metadata structure
}

const PredictionForm: React.FC = () => {
  // State for each form field
  const [localityName, setLocality] = useState("");
  const [carpetArea, setCarpetArea] = useState(100);
  const [bedrooms, setBedrooms] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [floorNumber, setFloorNumber] = useState(0);
  const [totalFloorNumber, setTotalFloors] = useState(0);
  const [transactionType, setTransactionType] = useState(
    options.transactionType[0]
  );
  const [ageofcons, setAgeOfConstruction] = useState(
    options.ageofcons[0]
  );
  const [furnished, setFurnished] = useState(options.furnished[0]);

  // --- UI Feedback States ---
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false); // For prediction process
  const [prediction, setPrediction] = useState<string | null>(null); // Use null initially

  // --- Existing Prediction ONNX Session State ---
  const [predictionSession, setPredictionSession] =
  useState<ort.InferenceSession | null>(null);

  // --- NEW: Recommendation Assets State ---
  const [recPreprocessorSession, setRecPreprocessorSession] =
  useState<ort.InferenceSession | null>(null);
  const [recNnSession, setRecNnSession] =
  useState<ort.InferenceSession | null>(null);
  const [featureWeights, setFeatureWeights] =
  useState<FeatureWeights | null>(null);
  const [propertyIdMap, setPropertyIdMap] = useState<string[] | null>(
  null
  );
  const [propertyMetadata, setPropertyMetadata] =
  useState<PropertyMetadata | null>(null);

  // --- Combined Loading/Error State for All Assets ---
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetsError, setAssetsError] = useState<string | null>(null);

  // --- Existing Recommendations State ---
  const [recommendations, setRecommendations] = useState<Property[]>([]);

  // --- Constants for Recommendation Model ---
  // IMPORTANT: Ensure these match your NN model export
  const REC_NUM_FEATURES = 5; // Number of features AFTER preprocessing for NN model
  const REC_NUM_NEIGHBORS = 10; // K value used in NN model

  // --- Effect to Load ONNX Model ---
  useEffect(() => {
    const loadAssets = async () => {
      try {
        setAssetsLoading(true);
        setAssetsError(null);
        console.log("Attempting to load all assets...");

        // Define fetch options if needed (e.g., caching)
        const fetchOptions = { cache: "no-cache" } as RequestInit; // Example: disable cache

        // Define ONNX session options
        const sessionOptions: ort.InferenceSession.options = {
          executionProviders: ["wasm", "webgl"], // Try WASM first, fallback WebGL
          // graphOptimizationLevel: 'all', // Optional optimization
        };

        // Load all assets concurrently
        const [
          predSess,
          recPreSess,
          recNnSess,
          weightsRes,
          idMapRes,
          metadataRes,
        ] = await Promise.all([
          ort.InferenceSession.create(PREDICTION_MODEL_URL, sessionOptions),
          ort.InferenceSession.create(REC_PREPROCESSOR_URL, sessionOptions),
          ort.InferenceSession.create(REC_NN_MODEL_URL, sessionOptions),
          fetch(FEATURE_WEIGHTS_URL, fetchOptions),
          fetch(PROPERTY_ID_MAP_URL, fetchOptions),
          fetch(PROPERTY_METADATA_URL, fetchOptions),
        ]);

        // Check fetch responses
        if (!weightsRes.ok)
          throw new Error(
            `Failed to fetch weights: ${weightsRes.statusText}`
          );
        if (!idMapRes.ok)
          throw new Error(
            `Failed to fetch ID map: ${idMapRes.statusText}`
          );
        if (!metadataRes.ok)
          throw new Error(
            `Failed to fetch metadata: ${metadataRes.statusText}`
          );

        // Parse JSON data
        const weightsJson = await weightsRes.json();
        const idMapJson = await idMapRes.json();
        const metadataJson = await metadataRes.json();

        // Set state
        setPredictionSession(predSess);
        setRecPreprocessorSession(recPreSess);
        setRecNnSession(recNnSess);
        setFeatureWeights(weightsJson);
        setPropertyIdMap(idMapJson);
        setPropertyMetadata(metadataJson);

        console.log("All assets loaded successfully:");
        console.log("Prediction Session:", predSess);
        console.log("Rec Preprocessor Session:", recPreSess);
        console.log("Rec NN Session:", recNnSess);
        console.log("Feature Weights:", weightsJson);

      } catch (e) {
        console.error("Error loading assets:", e);
        setAssetsError(
          `Failed to load necessary assets. Please refresh. ${
            e instanceof Error ? e.message : String(e)
          }`
        );
        // Clear potentially partially loaded state
        setPredictionSession(null);
        setRecPreprocessorSession(null);
        setRecNnSession(null);
        setFeatureWeights(null);
        setPropertyIdMap(null);
        setPropertyMetadata(null);
      } finally {
        setAssetsLoading(false);
      }
    };
    loadAssets();
  }, []); // Empty dependency array ensures this runs only once on mount

    // --- NEW: Function to run client-side recommendations ---
    const runClientSideRecommendations = async (
      // Pass only the features needed by the recommendation preprocessor
      recInputData: {
        carpetArea: number;
        bedrooms: number;
        bathrooms: number;
        floorNumber: number;
        totalFloorNumber: number;
      }
    ): Promise<Property[]> => {
      // Check if all required assets are loaded
      if (
        !recPreprocessorSession ||
        !recNnSession ||
        !featureWeights ||
        !propertyIdMap ||
        !propertyMetadata
      ) {
        throw new Error(
          "Recommendation assets not loaded. Cannot proceed."
        );
      }
  
      console.log("Starting client-side recommendations...");
  
      // --- Step 1: Run Preprocessor ONNX ---
      // Input names MUST match the 'initial_types' used for preprocessor ONNX conversion
      const preprocessorInput = {
        // Assuming these are the names and they expect Int64
        carpetArea: new ort.Tensor(
          "int64",
          [BigInt(recInputData.carpetArea)],
          [1, 1]
        ),
        bedrooms: new ort.Tensor(
          "int64",
          [BigInt(recInputData.bedrooms)],
          [1, 1]
        ),
        bathrooms: new ort.Tensor(
          "int64",
          [BigInt(recInputData.bathrooms)],
          [1, 1]
        ),
        floorNumber: new ort.Tensor(
          "int64",
          [BigInt(recInputData.floorNumber)],
          [1, 1]
        ),
        totalFloorNumber: new ort.Tensor(
          "int64",
          [BigInt(recInputData.totalFloorNumber)],
          [1, 1]
        ),
      };
      console.log("Rec Preprocessor Input:", preprocessorInput);
  
      const preprocessorResults = await recPreprocessorSession.run(
        preprocessorInput
      );
      const preprocessorOutputName = recPreprocessorSession.outputNames[0];
      const preprocessedTensor = preprocessorResults[preprocessorOutputName];
  
      if (!preprocessedTensor || !(preprocessedTensor.data instanceof Float32Array)) {
          throw new Error("Preprocessor did not return a valid Float32Array tensor.");
      }
      const preprocessedData = Array.from(preprocessedTensor.data as Float32Array); // Convert Float32Array to regular array
      console.log("Preprocessed Data:", preprocessedData);
  
      if (preprocessedData.length !== REC_NUM_FEATURES) {
          throw new Error(`Preprocessor output length (${preprocessedData.length}) does not match expected features (${REC_NUM_FEATURES})`);
      }
  
  
      // --- Step 2: Apply Feature Weights ---
      // The order of weights in the JSON must match the output order of the preprocessor
      const weightedData = preprocessedData.map((value, index) => {
        // Assuming featureWeights keys match the order implicitly or explicitly
        // A safer approach might be to get output names from preprocessor if available
        // For now, assume order matches: carpetArea, bedrooms, bathrooms, floorNumber, totalFloorNumber
        const featureName = Object.keys(featureWeights)[index]; // Less robust way
        // TODO: A more robust way is needed if preprocessor output order isn't guaranteed
        // or if featureWeights keys don't align perfectly.
        // For now, we rely on the order being correct as per your setup.
        if (!featureName || featureWeights[featureName] === undefined) {
            console.warn(`Weight not found for feature at index ${index}. Using weight 1.0`);
            return value; // Apply weight 1 if not found (or handle error)
        }
        return value * featureWeights[featureName];
      });
      console.log("Weighted Data:", weightedData);
  
      // --- Step 3: Run Nearest Neighbors ONNX ---
      const nnInputTensor = new ort.Tensor(
        "float32",
        new Float32Array(weightedData), // NN model expects Float32
        [1, REC_NUM_FEATURES] // Shape [batch_size, num_features]
      );
      const nnInputName = recNnSession.inputNames[0]; // Get the actual input name
      const nnFeeds = { [nnInputName]: nnInputTensor };
  
      console.log("Rec NN Input:", nnFeeds);
      const nnResults = await recNnSession.run(nnFeeds);
      console.log("Rec NN Results:", nnResults);
  
      // --- Step 4: Get Indices ---
      // Output names depend on skl2onnx version and model type.
      // Usually 'output_label' or 'indices' for indices, 'output_probability' or 'distances' for distances.
      // Check recNnSession.outputNames if unsure. Let's assume standard order [indices, distances]
      const indicesOutputName = recNnSession.outputNames[0];
      const distancesOutputName = recNnSession.outputNames[1]; // We don't use distances here, but good to know
  
      const indicesTensor = nnResults[indicesOutputName];
      // Indices might be Int64, represented as BigInt64Array in JS
      const neighborIndices = Array.from(indicesTensor.data as BigInt64Array | Int32Array).map(Number); // Convert BigInt/Int32 to number
      console.log("Neighbor Indices:", neighborIndices);
  
      // --- Step 5: Map Indices to Property IDs ---
      const recommendedPropertyIds = neighborIndices.map((index) => {
        if (index < 0 || index >= propertyIdMap.length) {
          console.error(`Invalid index ${index} from NN model.`);
          return null; // Handle invalid index
        }
        return propertyIdMap[index];
      }).filter(id => id !== null) as string[]; // Filter out any nulls
      console.log("Recommended Property IDs:", recommendedPropertyIds);
  
  
      // --- Step 6: Fetch Metadata ---
      const finalRecommendations: Property[] = recommendedPropertyIds
        .map((id) => {
          const meta = propertyMetadata[id];
          if (!meta) {
            console.warn(`Metadata not found for property ID: ${id}`);
            return null;
          }
          // Optionally add the original ID to the property object if not already present
          return { ...meta, id: id };
        })
        .filter((p): p is Property => p !== null); // Type guard to filter nulls
  
      console.log("Final Recommendations:", finalRecommendations);
      return finalRecommendations;
    };
  

  // --- Handle Form Submission ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setPrediction(null);
    setRecommendations([]); // Clear previous recommendations

    // --- Input/form validation ---
    if (floorNumber > totalFloorNumber) {
      setErrorMsg("Current floor cannot be greater than total floors.");
      return;
    }
    if (bedrooms < 1 || bedrooms > 15) {
      setErrorMsg("Bedrooms must be between 1 and 15.");
      return;
    }
    if (bathrooms < 1 || bathrooms > 15) {
      setErrorMsg("Bathrooms must be between 1 and 15.");
      return;
    }
    if (carpetArea < 100 || carpetArea > 10000) {
      setErrorMsg("Carpet Area must be between 100 and 10,000 sqft.");
      return;
    }
    if (floorNumber < 0 || floorNumber > 75) {
      setErrorMsg("Current floor must be between 0 and 75.");
      return;
    }
    if (totalFloorNumber < 0 || totalFloorNumber > 75) {
      setErrorMsg("Total floors must be between 0 and 75.");
      return;
    }

    // --- Check if ALL Assets are Ready ---
    if (assetsLoading) {
      setErrorMsg("Assets are still loading. Please wait.");
      return;
    }
    if (assetsError || !predictionSession || !recPreprocessorSession || !recNnSession || !featureWeights || !propertyIdMap || !propertyMetadata) {
      setErrorMsg(assetsError || "One or more required assets failed to load. Please refresh.");
      return;
    }

    // --- Start Loading State ---
    setLoading(true); // Use combined loading state

    try {
      // --- Run Prediction (Keep this part as is) ---
      const predictionInputTensor = {
        localityName: new ort.Tensor("string", [localityName], [1, 1]),
        carpetArea: new ort.Tensor("int64", [BigInt(carpetArea)], [1, 1]),
        floorNumber: new ort.Tensor("int64", [BigInt(floorNumber)], [1, 1]),
        totalFloorNumber: new ort.Tensor("int64", [BigInt(totalFloorNumber)], [1, 1]),
        transactionType: new ort.Tensor("string", [transactionType], [1, 1]),
        furnished: new ort.Tensor("string", [furnished], [1, 1]),
        bedrooms: new ort.Tensor("int64", [BigInt(bedrooms)], [1, 1]),
        bathrooms: new ort.Tensor("int64", [BigInt(bathrooms)], [1, 1]),
        ageofcons: new ort.Tensor("string", [ageofcons], [1, 1]),
      };
      console.log("Running prediction inference with input:", predictionInputTensor);
      const predictionResults = await predictionSession.run(predictionInputTensor);
      const predictionOutputName = predictionSession.outputNames[0];
      const predictionOutputTensor = predictionResults[predictionOutputName];
      if (!predictionOutputTensor) throw new Error("Prediction output tensor not found.");
      const predictedPrice = (predictionOutputTensor.data as Float32Array)[0];
      const formattedPrice = Math.round(predictedPrice).toLocaleString("en-IN");
      setPrediction(`Estimated Price: ₹ ${formattedPrice}`);
      console.log("Prediction successful:", formattedPrice);


      // --- Run Client-Side Recommendations ---
      // Prepare input data specifically for the recommendation preprocessor
      const recommendationInputData = {
        carpetArea,
        bedrooms,
        bathrooms,
        floorNumber,
        totalFloorNumber,
        // Add other features IF your recommendation preprocessor expects them
      };

      const recs = await runClientSideRecommendations(recommendationInputData);
      setRecommendations(recs);

    } catch (error) {
      console.error("Error during prediction or recommendation:", error);
      setErrorMsg(
        `Processing failed. ${error instanceof Error ? error.message : String(error)}`
      );
      setPrediction(null); // Clear prediction on error
      setRecommendations([]); // Clear recommendations on error
    } finally {
      setLoading(false); // Stop loading indicator
    }
  };

  // --- JSX Rendering (Mostly unchanged) ---
  // Add checks for assetsLoading and assetsError at the top level if desired
  if (assetsLoading) {
    return <div>Loading models and data...</div>;
  }

  if (assetsError) {
    return <div>Error loading assets: {assetsError}</div>;
  }

  return (
    <>
      <div className="card shadow-sm p-4 my-5">
        <h2 className="fw-bold mb-3">Estimate Your Home&apos;s Price</h2>
        <p className="text-muted mb-4">
          Enter your property details below to get an instant price estimate.
        </p>
        <form onSubmit={handleSubmit} noValidate>
          {/* Locality with search-enabled datalist */}
          <div className="mb-3">
            <label htmlFor="locality" className="form-label">
              Locality
            </label>
            <input
              type="text"
              id="locality"
              name="locality"
              className="form-control"
              placeholder="Start typing to search..."
              value={localityName}
              onChange={(e) => setLocality(e.target.value)}
              list="localityOptions"
              required
            />
            <datalist id="localityOptions">
              {options.localityName.map((loc, index) => (
                <option value={loc} key={index} />
              ))}
            </datalist>
          </div>

          {/* Three numerical inputs in one row: Carpet Area, Bedrooms, Bathrooms */}
          <div className="row">
            <div className="mb-3 col-md-4">
              <label htmlFor="carpetArea" className="form-label">
                Carpet Area (sqft)
              </label>
              <input
                type="number"
                id="carpetArea"
                name="carpetArea"
                className="form-control"
                min={100}
                max={10000}
                value={carpetArea}
                onChange={(e) =>
                  setCarpetArea(parseInt(e.target.value, 10))
                }
                required
              />
            </div>
            <div className="mb-3 col-md-4">
              <label htmlFor="bedrooms" className="form-label">
                Bedrooms
              </label>
              <input
                type="number"
                id="bedrooms"
                name="bedrooms"
                className="form-control"
                min={1}
                max={15}
                value={bedrooms}
                onChange={(e) =>
                  setBedrooms(parseInt(e.target.value, 10))
                }
                required
              />
            </div>
            <div className="mb-3 col-md-4">
              <label htmlFor="bathrooms" className="form-label">
                Bathrooms
              </label>
              <input
                type="number"
                id="bathrooms"
                name="bathrooms"
                className="form-control"
                min={1}
                max={15}
                value={bathrooms}
                onChange={(e) =>
                  setBathrooms(parseInt(e.target.value, 10))
                }
                required
              />
            </div>
          </div>

          {/* Two numerical inputs: Current Floor and Total Floors */}
          <div className="row">
            <div className="mb-3 col-md-6">
              <label htmlFor="floorNumber" className="form-label">
                Current Floor
              </label>
              <input
                type="number"
                id="floorNumber"
                name="floorNumber"
                className="form-control"
                min={0}
                max={75}
                value={floorNumber}
                onChange={(e) =>
                  setFloorNumber(parseInt(e.target.value, 10))
                }
                required
              />
            </div>
            <div className="mb-3 col-md-6">
              <label htmlFor="totalFloors" className="form-label">
                Total Floors
              </label>
              <input
                type="number"
                id="totalFloors"
                name="totalFloors"
                className="form-control"
                min={0}
                max={75}
                value={totalFloorNumber}
                onChange={(e) =>
                  setTotalFloors(parseInt(e.target.value, 10))
                }
                required
              />
            </div>
          </div>

          {/* Three dropdown selects: Transaction Type, Age of Construction, Furnishing */}
          <div className="row">
            <div className="mb-3 col-md-4">
              <label htmlFor="transactionType" className="form-label">
                Transaction Type
              </label>
              <select
                id="transactionType"
                name="transactionType"
                className="form-select"
                value={transactionType}
                onChange={(e) =>
                  setTransactionType(e.target.value)
                }
              >
                {options.transactionType.map((type, index) => (
                  <option value={type} key={index}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-3 col-md-4">
              <label htmlFor="ageOfConstruction" className="form-label">
                Age of Construction
              </label>
              <select
                id="ageOfConstruction"
                name="ageOfConstruction"
                className="form-select"
                value={ageofcons}
                onChange={(e) =>
                  setAgeOfConstruction(e.target.value)
                }
              >
                {options.ageofcons.map((age, index) => (
                  <option value={age} key={index}>
                    {age}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-3 col-md-4">
              <label htmlFor="furnished" className="form-label">
                Furnishing Status
              </label>
              <select
                id="furnished"
                name="furnished"
                className="form-select"
                value={furnished}
                onChange={(e) =>
                  setFurnished(e.target.value)
                }
              >
                {options.furnished.map((option, index) => (
                  <option value={option} key={index}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Display error messages if present */}
          {errorMsg && (
            <div className="alert alert-warning" role="alert">
              {errorMsg}
            </div>
          )}

          {/* Submit button with loading spinner */}
          <div className="d-flex align-items-center">
            <button
              type="submit"
              className="btn btn-primary me-3"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Getting Price...
                </>
              ) : (
                "Get Price Estimate"
              )}
            </button>
          </div>
        </form>

        {/* Display prediction result after successful API call */}
        {prediction && (
          <div className="mt-4 alert alert-success" role="alert">
            {prediction}
          </div>
        )}
      </div>

      {/* Property Recommendations Section */}
      {(recommendations.length > 0 || loading) && (
        <div className="property-recommendations">
          <h3 className="section-title">Similar Properties You Might Like</h3>
          
          {loading && (
            <div className="text-center my-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading recommendations...</span>
              </div>
              <p className="mt-3 text-muted">Finding similar properties...</p>
            </div>
          )}
          
          {errorMsg && (
            <div className="alert alert-warning" role="alert">
              {errorMsg}
            </div>
          )}
          
          {recommendations.map((property) => (
            <PropertyCard key={property.propertyId} property={property} />
          ))}
        </div>
      )}
    </>
  );
};

export default PredictionForm;