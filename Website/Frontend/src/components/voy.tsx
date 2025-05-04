import React, { useState, useEffect } from "react";
import * as ort from "onnxruntime-web";
// import { Voy } from "voy-search"; // <-- Import Voy
// const { Voy } = await import("voy-search");
import options from "../data/options_iteration_3.json";
import PropertyCard from "./PropertyCard";
import type { Property } from "../types";

// --- Define paths to your models and data in the public directory ---
const PREDICTION_MODEL_URL = "/prediction_pipeline_iteration_3.onnx";
const RECOMMENDATION_PREPROCESSOR_URL =
  "/recommendation_preprocessor.onnx"; // <-- Add path
const VECTORS_URL = "/recommendations_property_vectors.json"; // <-- Add path
const METADATA_URL = "/recommendations_property_metadata.json"; // <-- Add path
const WEIGHTS_URL = "/recommendation_feature_weights.json"; // <-- Add path

// Define type for raw embedding data
type EmbeddingItem = {
  id: string;
  embedding: number[];
};

// Define type for weights
type Weights = Record<string, number>;

// Define type for metadata (assuming Property type covers it)
type Metadata = Record<string, Property>;

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

  // --- Prediction ONNX Session State ---
  const [predictionSession, setPredictionSession] =
  useState<ort.InferenceSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true); // For prediction model
  const [sessionError, setSessionError] = useState<string | null>(null);

  // --- Recommendation States ---
  const [recommendations, setRecommendations] = useState<Property[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false); // Specific loading for recs step
  const [recommendationsError, setRecommendationsError] = useState("");

  // ++ NEW: Recommendation Engine State ++
  const [recommenderSession, setRecommenderSession] =
  useState<ort.InferenceSession | null>(null); // For recommendation preprocessor
  // const [voyIndex, setVoyIndex] = useState<Voy | null>(null);
  // const [voyIndex, setVoyIndex] = useState<any | null>(null); // Use 'any' temporarily or define a placeholder type if needed before Voy loads
  const [voyIndexes, setVoyIndexes] = useState<any | null>(null); // With an array to hold multiple indexes
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [weights, setWeights] = useState<Weights | null>(null);
  const [dataLoading, setDataLoading] = useState(true); // Loading for rec data/model
  const [dataError, setDataError] = useState<string | null>(null); // Error for rec data/model
  // ++ END NEW ++

  // --- Effect to Load Prediction ONNX Model ---
  useEffect(() => {
    const loadModel = async () => {
      try {
        setSessionLoading(true);
        setSessionError(null);
        console.log("Attempting to load Prediction ONNX model...");
        const session = await ort.InferenceSession.create(
          PREDICTION_MODEL_URL, // Use constant
          { executionProviders: ["wasm"] }
        );
        setPredictionSession(session); // Use specific state variable
        console.log("Prediction ONNX Session created successfully.");
      } catch (e) {
        console.error("Error loading Prediction ONNX session:", e);
        setSessionError(
          `Failed to load the prediction model. ${
            e instanceof Error ? e.message : String(e)
          }`
        );
      } finally {
        setSessionLoading(false);
      }
    };
    loadModel();
  }, []);

  // ++ NEW: Effect to Load Recommendation Data and Model ++
  useEffect(() => {
    const loadRecommenderAssets = async () => {
      try {
        setDataLoading(true);
        setDataError(null);
        console.log("Attempting to load Recommendation assets...");

        // Dynamically import Voy *first*
        const { Voy } = await import("voy-search"); // <-- DYNAMIC IMPORT HERE

        // Fetch data files and load recommender model concurrently
        const [
          embeddingsResponse,
          metadataResponse,
          weightsResponse,
          recSession,
        ] = await Promise.all([
          fetch(EMBEDDINGS_URL),
          fetch(METADATA_URL),
          fetch(WEIGHTS_URL),
          ort.InferenceSession.create(RECOMMENDATION_PREPROCESSOR_URL, {
            executionProviders: ["wasm"],
          }),
        ]);

        // Check responses
        if (!embeddingsResponse.ok)
          throw new Error(
            `Failed to fetch embeddings: ${embeddingsResponse.statusText}`
          );
        if (!metadataResponse.ok)
          throw new Error(
            `Failed to fetch metadata: ${metadataResponse.statusText}`
          );
        if (!weightsResponse.ok)
          throw new Error(
            `Failed to fetch weights: ${weightsResponse.statusText}`
          );

        const embeddingsData: EmbeddingItem[] = await embeddingsResponse.json();
        const metadataData: Metadata = await metadataResponse.json();
        const weightsData: Weights = await weightsResponse.json();

        // Store fetched data and session
        setMetadata(metadataData);
        setWeights(weightsData);
        setRecommenderSession(recSession);
        console.log("Recommendation assets loaded.");

        // --- Splitting and Indexing Logic ---
        console.log("Splitting data and building Voy indexes...");
        if (embeddingsData && embeddingsData.length > 0) {
          const chunkSize = 3000; // EXPERIMENT with this value! Start smaller if needed.
          const numChunks = Math.ceil(embeddingsData.length / chunkSize);
          const createdIndexes: Voy[] = [];

          for (let i = 0; i < numChunks; i++) {
            const start = i * chunkSize;
            const end = start + chunkSize;
            const chunk = embeddingsData.slice(start, end);
            console.log(`Processing chunk ${i + 1}/${numChunks} (size: ${chunk.length})`);

            if (chunk.length > 0) {
              const voyResource = {
                embeddings: chunk.map((item) => ({
                  id: item.id,
                  title: "",
                  url: "",
                  embeddings: item.embedding.map(Number),
                })),
              };
              // Create index for this chunk
              const index = new Voy(voyResource);
              createdIndexes.push(index);
              console.log(`  Voy index for chunk ${i + 1} built with ${index.size()} items.`);
            }
          }
          setVoyIndexes(createdIndexes); // <-- Set the array of indexes
          console.log(`Total Voy indexes created: ${createdIndexes.length}`);

        } else {
          console.warn("Embeddings data is empty or invalid.");
          setVoyIndexes([]); // Set empty array
        }
        } catch (e) {
        console.error("Error loading Recommendation assets or building indexes:", e); // Updated message
        setDataError(
          `Failed to load recommendation data/model/Voy. ${
            e instanceof Error ? e.message : String(e)
          }`
        );
        setMetadata(null);
        setWeights(null);
        setRecommenderSession(null);
        setVoyIndexes([]); // Clear indexes on error
        } finally {
        setDataLoading(false);
        }
        };

    loadRecommenderAssets();
  }, []); // Runs once on mount
  // ++ END NEW ++

  // --- Handle Form Submission ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setPrediction(null);
    setRecommendations([]);
    setRecommendationsError("");

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

    // --- Check if Prediction Session is Ready ---
    if (!predictionSession) { // Check specific session
      setErrorMsg(
        sessionError || "Prediction model is not loaded yet. Please wait or refresh."
      );
      return;
    }

    // ++ NEW: Check if Recommendation Assets are Ready ++
    if (!recommenderSession || !voyIndex || !metadata || !weights) {
      setErrorMsg(
        dataError || "Recommendation engine is not ready yet. Please wait or refresh."
      );
      return;
    }
    // ++ END NEW ++

    setLoading(true); // Indicate overall process start
    try {
      // --- Prediction Logic (Mostly Unchanged) ---
      const predictionInputTensor = {
        localityName: new ort.Tensor("string", [localityName], [1, 1]),
        carpetArea: new ort.Tensor("int64", [BigInt(carpetArea)], [1, 1]),
        floorNumber: new ort.Tensor("int64", [BigInt(floorNumber)], [1, 1]),
        totalFloorNumber: new ort.Tensor(
          "int64",
          [BigInt(totalFloorNumber)],
          [1, 1]
        ),
        transactionType: new ort.Tensor("string", [transactionType], [1, 1]),
        furnished: new ort.Tensor("string", [furnished], [1, 1]),
        bedrooms: new ort.Tensor("int64", [BigInt(bedrooms)], [1, 1]),
        bathrooms: new ort.Tensor("int64", [BigInt(bathrooms)], [1, 1]),
        ageofcons: new ort.Tensor("string", [ageofcons], [1, 1]),
      };
      console.log("Running prediction inference with input:", predictionInputTensor);
      const predictionResults = await predictionSession.run(predictionInputTensor);
      const outputName = predictionSession.outputNames[0];
      const outputTensor = predictionResults[outputName];
      if (!outputTensor) throw new Error(`Output tensor '${outputName}' not found.`);
      const predictedPrice = (outputTensor.data as Float32Array)[0];
      const formattedPrice = Math.round(predictedPrice).toLocaleString("en-IN");
      setPrediction(`Estimated Price: ₹ ${formattedPrice}`);
      console.log("Prediction successful:", formattedPrice);

      // --- Client-Side Recommendation Logic ---
      setLoadingRecommendations(true); // Specific loading for this step
      setRecommendationsError("");
      try {
        // Prepare input for the recommendation preprocessor ONNX model
        // IMPORTANT: Use only the features the preprocessor expects, in the correct order/names
        const recommendationInputTensor = {
          // Adjust names and types based on your recommendation_preprocessor.onnx
          carpetArea: new ort.Tensor("int64", [BigInt(carpetArea)], [1, 1]),
          bedrooms: new ort.Tensor("int64", [BigInt(bedrooms)], [1, 1]),
          bathrooms: new ort.Tensor("int64", [BigInt(bathrooms)], [1, 1]),
          floorNumber: new ort.Tensor("int64", [BigInt(floorNumber)], [1, 1]),
          totalFloorNumber: new ort.Tensor(
            "int64",
            [BigInt(totalFloorNumber)],
            [1, 1]
          ),
          // Add other features if your preprocessor uses them (locality, etc.)
        };

        console.log("Running recommendation preprocessing inference:", recommendationInputTensor);
        const preprocessorResults = await recommenderSession.run(recommendationInputTensor);
        // Assuming the preprocessor outputs a single tensor with the processed features
        const preprocessorOutputName = recommenderSession.outputNames[0];
        const processedTensor = preprocessorResults[preprocessorOutputName];
        if (!processedTensor) throw new Error(`Preprocessor output '${preprocessorOutputName}' not found.`);

        // Data is likely Float32Array after scaling/processing
        const processedVector = processedTensor.data as Float32Array;
        console.log("Processed vector for recommendation:", processedVector);

        // Apply weights
        // IMPORTANT: Ensure this order matches the output order of your preprocessor ONNX model
        const featureOrderForWeighting = [
          "carpetArea",
          "bedrooms",
          "bathrooms",
          "floorNumber",
          "totalFloorNumber",
          // Add other feature names in the correct order if applicable
        ];
        if (processedVector.length !== featureOrderForWeighting.length) {
            console.error("Mismatch between processed vector length and expected feature order for weighting.");
            throw new Error("Internal error during recommendation weighting.");
        }

        const weightedQueryVector = new Float32Array(processedVector.length);
        for (let i = 0; i < processedVector.length; i++) {
          const featureName = featureOrderForWeighting[i];
          const weight = weights[featureName] ?? 1.0; // Use 1.0 if weight is missing
          weightedQueryVector[i] = processedVector[i] * weight;
        }
        console.log("Weighted query vector:", weightedQueryVector);

        // Search with Voy
        const k = 5; // Number of recommendations
        console.log(`Searching Voy index for ${k} neighbors...`);
        const searchResult = voyIndex.search(weightedQueryVector, k);
        console.log("Voy search result:", searchResult);

        // Retrieve full metadata for neighbors
        const neighborIds = searchResult.neighbors.map(n => n.id);
        const recommendedProperties = neighborIds
          .map(id => metadata[id]) // Look up in the full metadata object
          .filter((p): p is Property => p !== undefined); // Filter out any potential misses

        setRecommendations(recommendedProperties);
        console.log("Recommendations retrieved:", recommendedProperties);

      } catch (recError) {
        console.error("Error during client-side recommendation:", recError);
        setRecommendationsError(
          `Failed to generate recommendations. ${recError instanceof Error ? recError.message : String(recError)}`
        );
        setRecommendations([]); // Clear recommendations on error
      } finally {
        setLoadingRecommendations(false);
      }

    } catch (error) {
      // Catch errors from prediction or the overall process
      console.error("Error during prediction or recommendation setup:", error);
      setErrorMsg(
        `Operation failed. ${error instanceof Error ? error.message : String(error)}`
      );
      setPrediction(null);
      setRecommendations([]);
    } finally {
      setLoading(false); // Stop overall loading indicator
    }
  };

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
      {(recommendations.length > 0 || loadingRecommendations) && (
        <div className="property-recommendations">
          <h3 className="section-title">Similar Properties You Might Like</h3>
          
          {loadingRecommendations && (
            <div className="text-center my-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading recommendations...</span>
              </div>
              <p className="mt-3 text-muted">Finding similar properties...</p>
            </div>
          )}
          
          {recommendationsError && (
            <div className="alert alert-warning" role="alert">
              {recommendationsError}
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
