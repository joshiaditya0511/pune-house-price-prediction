import React, { useState, useEffect, useCallback } from "react"; // Added useCallback
import * as ort from "onnxruntime-web";
import {
  createRxDatabase,
  addRxPlugin,
  RxDatabase, // Import RxDatabase type
  RxCollection, // Import RxCollection type
} from "rxdb";
// import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import {
  // RxDBVectorStorePlugin,
  cosineSimilarity,
} from "rxdb/plugins/vector";
import { sortByObjectNumberProperty } from "rxdb"; // Core utility

import options from "../data/options_iteration_3.json";
import PropertyCard from "./PropertyCard";
import type { FeatureWeights, Property, PropertyMetadataMap, RxDbVectorDoc } from "../types"; // Assuming you define RxDbVectorDoc in types.ts

// --- Define paths to your models and data in the public directory ---
const PREDICTION_MODEL_URL = "/prediction_pipeline_iteration_3.onnx";
const RECOMMENDATION_PREPROCESSOR_URL =
  "/recommendation_preprocessor.onnx"; // <-- Add path
const VECTORS_URL = "/recommendations_property_vectors.json"; // <-- Add path
const METADATA_URL = "/recommendations_property_metadata.json"; // <-- Add path
const WEIGHTS_URL = "/recommendation_feature_weights.json"; // <-- Add path

const PredictionForm: React.FC = () => {
  // --- Existing State ---
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
  
  //
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [onnxSession, setOnnxSession] =
    useState<ort.InferenceSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Property[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState("");

  // --- NEW State Variables ---

  // Recommendation Preprocessor ONNX Session
  const [recoOnnxSession, setRecoOnnxSession] =
    useState<ort.InferenceSession | null>(null);
  const [recoSessionLoading, setRecoSessionLoading] = useState(true);
  const [recoSessionError, setRecoSessionError] = useState<string | null>(
    null
  );

  // RxDB State
  const [dbInstance, setDbInstance] = useState<RxDatabase | null>(null);
  const [vectorCollection, setVectorCollection] =
    useState<RxCollection<RxDbVectorDoc> | null>(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Metadata State
  const [propertyMetadata, setPropertyMetadata] =
    useState<PropertyMetadataMap>(new Map());
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  // Weights State
  const [featureWeights, setFeatureWeights] = useState<FeatureWeights | null>(
    null
  );
  const [weightsLoading, setWeightsLoading] = useState(true);
  const [weightsError, setWeightsError] = useState<string | null>(null);

  // Combined loading state for all initial setup
  const [isInitializing, setIsInitializing] = useState(true);

  // --- Add RxDB Plugin ---
  // Needs to be done only once, outside component or in a top-level setup
  // If called multiple times, it might log warnings but should be okay.
  // Consider moving this to your main app entry point if possible.
  // try {
  //   addRxPlugin(RxDBVectorStorePlugin);
  // } catch (err) {
  //   console.warn("RxDBVectorStorePlugin might already be added.", err);
  // }

  // --- Effect to Load Models, Init DB, and Load Data ---
  useEffect(() => {
    const initializeApp = async () => {
      setIsInitializing(true);
      console.log("Starting application initialization...");

      try {
        // --- 1. Load ONNX Models Concurrently ---
        setSessionLoading(true);
        setRecoSessionLoading(true);
        const [predSession, recoSession] = await Promise.all([
          ort.InferenceSession.create(PREDICTION_MODEL_URL, {
            executionProviders: ["wasm"],
          }).catch((e) => {
            console.error("Error loading Prediction ONNX session:", e);
            setSessionError(
              `Failed to load prediction model: ${
                e instanceof Error ? e.message : String(e)
              }`
            );
            return null; // Allow other initializations to proceed
          }),
          ort.InferenceSession.create(RECOMMENDATION_PREPROCESSOR_URL, {
            executionProviders: ["wasm"],
          }).catch((e) => {
            console.error("Error loading Recommendation ONNX session:", e);
            setRecoSessionError(
              `Failed to load recommendation preprocessor: ${
                e instanceof Error ? e.message : String(e)
              }`
            );
            return null;
          }),
        ]);

        if (predSession) {
          setOnnxSession(predSession);
          console.log("Prediction ONNX Session created.");
          setSessionError(null); // Clear previous error on success
        }
        setSessionLoading(false);

        if (recoSession) {
          setRecoOnnxSession(recoSession);
          console.log("Recommendation Preprocessor ONNX Session created.");
          setRecoSessionError(null); // Clear previous error on success
        }
        setRecoSessionLoading(false);

        // --- 2. Initialize RxDB ---
        setDbLoading(true);
        let db: RxDatabase | null = null;
        let vectorsCol: RxCollection<RxDbVectorDoc> | null = null;
        try {
          console.log("Initializing RxDB database...");
          db = await createRxDatabase({
            name: "recommendationdb_memory", // Unique name
            storage: getRxStorageMemory(),
            // ignoreDuplicate: true, // Prevent error if DB exists
          });
          setDbInstance(db);
          console.log("RxDB database initialized.");

          console.log("Defining vector schema...");
          const vectorSchema = {
            version: 0,
            primaryKey: "id",
            type: "object",
            properties: {
              id: { type: "string", maxLength: 100 },
              embedding: { type: "array", items: { type: "number" } },
            },
            required: ["id", "embedding"],
          };

          console.log("Adding 'vectors' collection...");
          // Use a temporary object for collections definition
          const collections = {
            vectors: { schema: vectorSchema },
          };
          await db.addCollections(collections);
          vectorsCol = db.vectors; // Access the collection
          setVectorCollection(vectorsCol);
          console.log("'vectors' collection added successfully.");
          setDbError(null);
        } catch (e) {
          console.error("Error initializing RxDB:", e);
          setDbError(
            `Failed to initialize database: ${
              e instanceof Error ? e.message : String(e)
            }`
          );
        } finally {
          setDbLoading(false);
        }

        // --- 3. Load Static Data (Weights, Metadata) Concurrently ---
        setWeightsLoading(true);
        setMetadataLoading(true);
        const [weightsData, metadataData] = await Promise.all([
          fetch(WEIGHTS_URL)
            .then((res) => (res.ok ? res.json() : Promise.reject(res)))
            .catch((e) => {
              console.error("Error fetching weights:", e);
              setWeightsError("Failed to load feature weights.");
              return null;
            }),
          fetch(METADATA_URL)
            .then((res) => (res.ok ? res.json() : Promise.reject(res)))
            .catch((e) => {
              console.error("Error fetching metadata:", e);
              setMetadataError("Failed to load property metadata.");
              return null;
            }),
        ]);

        if (weightsData) {
          setFeatureWeights(weightsData);
          console.log("Feature weights loaded.");
          setWeightsError(null);
        }
        setWeightsLoading(false);

        if (metadataData) {
          setPropertyMetadata(new Map(Object.entries(metadataData)));
          console.log("Property metadata loaded into memory map.");
          setMetadataError(null);
        }
        setMetadataLoading(false);

        // --- 4. Load Vectors into RxDB (only if DB and collection are ready) ---
        if (vectorsCol) {
          console.log("Checking vector data in RxDB...");
          try {
            const response = await fetch(VECTORS_URL);
            if (!response.ok) throw new Error("Failed to fetch vectors.json");
            const vectorJsonData: RxDbVectorDoc[] = await response.json();
            const expectedCount = vectorJsonData.length;
            const currentCount = await vectorsCol.count().exec();

            if (currentCount !== expectedCount) {
              console.log(
                `Vector count mismatch (${currentCount}/${expectedCount}). Upserting...`
              );
              // Consider performance for large upserts on first load
              await vectorsCol.bulkUpsert(vectorJsonData);
              console.log(
                `Upserted ${vectorJsonData.length} vectors into RxDB.`
              );
            } else {
              console.log("Vector data already loaded in RxDB.");
            }
          } catch (e) {
            console.error("Error loading vectors into RxDB:", e);
            // Optionally set a specific error state for vector loading
            setDbError(
              (dbError ? dbError + "; " : "") +
                `Failed to load vectors: ${
                  e instanceof Error ? e.message : String(e)
                }`
            );
          }
        } else {
          console.warn("Skipping vector load because DB/collection failed.");
        }

        console.log("Application initialization complete.");
      } catch (error) {
        // Catch any unexpected errors during the overall process
        console.error("Critical error during app initialization:", error);
        // Set a general initialization error state if needed
      } finally {
        setIsInitializing(false); // Mark initialization as finished
      }
    };

    initializeApp();

    // Cleanup function for RxDB on component unmount
    return () => {
      console.log("Cleaning up RxDB instance...");
      dbInstance?.destroy(); // Properly close the database connection
    };
  }, []); // Empty dependency array: Run only once on mount

  // --- Nearest Neighbor Search Function (Full Scan) ---
  const findNearestNeighborsFullScan = useCallback(
    async (
      queryVector: number[],
      collection: RxCollection<RxDbVectorDoc>, // Pass collection as arg
      topN: number = 10 // Number of recommendations to return
    ): Promise<Array<{ doc: RxDbVectorDoc; distance: number }>> => {
      if (!collection) {
        console.error("Vector collection is not available for search.");
        return [];
      }

      console.log("Starting full scan nearest neighbor search...");
      console.time("FullScanSearch"); // Start timing

      try {
        // 1. Fetch all documents from the collection (reads from LocalStorage)
        const allDocs = await collection.find().exec();
        console.log(`Retrieved ${allDocs.length} documents for comparison.`);

        if (allDocs.length === 0) return [];

        // 2. Calculate distance for each document
        const docsWithDistance = allDocs.map((doc) => {
          // Ensure embedding exists and is an array
          const embedding = doc.embedding;
          if (!Array.isArray(embedding)) {
            console.warn(`Document ${doc.id} has invalid embedding.`);
            return { doc: doc.toJSON(), distance: Infinity }; // Handle invalid data
          }
          return {
            doc: doc.toJSON(), // Use plain JS object
            distance: cosineSimilarity(queryVector, embedding),
          };
        });

        // 3. Sort by distance (ascending)
        const sorted = docsWithDistance.sort(
          sortByObjectNumberProperty("distance")
        );

        console.timeEnd("FullScanSearch"); // End timing
        console.log(
          `Search complete. Top result distance: ${
            sorted.length > 0 ? sorted[0].distance : "N/A"
          }`
        );

        // 4. Return top N results
        return sorted.slice(0, topN);
      } catch (error) {
        console.error("Error during full scan search:", error);
        console.timeEnd("FullScanSearch"); // Ensure timer ends on error
        return []; // Return empty on error
      }
    },
    []
  ); // No dependencies needed if it only uses args

  // --- Handle Form Submission ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setPrediction(null);
    setRecommendations([]); // Clear previous recommendations
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

    // --- Check if Prediction Model is Ready ---
    if (!onnxSession) {
      setErrorMsg(
        sessionError || "Prediction model not loaded. Please wait or refresh."
      );
      return;
    }

    setLoading(true); // Indicate general loading (prediction + potential reco)

    // --- Prediction Logic (Keep Existing) ---
    let predictedPriceFormatted: string | null = null;
    try {
      // Build input tensor for prediction model
      const inputTensor = {
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
      console.log("Running prediction inference...");

      const results = await onnxSession.run(inputTensor);
      const outputName = onnxSession.outputNames[0];
      const outputTensor = results[outputName];
      if (!outputTensor) throw new Error("Prediction output tensor not found.");
      const predictedPrice = (outputTensor.data as Float32Array)[0];
      predictedPriceFormatted = `Estimated Price: ₹ ${Math.round(
        predictedPrice
      ).toLocaleString("en-IN")}`;
      setPrediction(predictedPriceFormatted);
      console.log("Prediction successful:", predictedPriceFormatted);
    } catch (error) {
      console.error("Error during prediction:", error);
      setErrorMsg(
        `Prediction failed. ${error instanceof Error ? error.message : String(error)}`
      );
      setLoading(false); // Stop loading if prediction fails
      return; // Stop if prediction fails
    }

    // --- Client-Side Recommendation Logic ---
    setLoadingRecommendations(true); // Specific loading for recommendations
    try {
      // Check if all necessary components for recommendations are ready
      if (isInitializing) {
        throw new Error("App is still initializing. Please wait.");
      }
      if (!recoOnnxSession) {
        throw new Error(
          recoSessionError || "Recommendation preprocessor not loaded."
        );
      }
      if (!vectorCollection) {
        throw new Error(dbError || "Vector database not ready.");
      }
      if (!featureWeights) {
        throw new Error(weightsError || "Feature weights not loaded.");
      }
      if (propertyMetadata.size === 0) {
        throw new Error(metadataError || "Property metadata not loaded.");
      }

      console.log("Starting client-side recommendation process...");

      // 1. Prepare input for Recommendation Preprocessor ONNX
      // IMPORTANT: Use ONLY the features expected by recommendation_preprocessor.onnx
      //            and ensure the names match its 'initial_types'
      const recoInputTensor = {
        // Adjust names and types based on your reco_preprocessor.onnx definition
        carpetArea: new ort.Tensor("int64", [BigInt(carpetArea)], [1, 1]),
        bedrooms: new ort.Tensor("int64", [BigInt(bedrooms)], [1, 1]),
        bathrooms: new ort.Tensor("int64", [BigInt(bathrooms)], [1, 1]),
        floorNumber: new ort.Tensor("int64", [BigInt(floorNumber)], [1, 1]),
        totalFloorNumber: new ort.Tensor(
          "int64",
          [BigInt(totalFloorNumber)],
          [1, 1]
        ),
        // Add other features if your preprocessor expects them (locality, etc.)
        // localityName: new ort.Tensor("string", [localityName], [1, 1]),
        // transactionType: new ort.Tensor("string", [transactionType], [1, 1]),
        // furnished: new ort.Tensor("string", [furnished], [1, 1]),
        // ageofcons: new ort.Tensor("string", [ageofcons], [1, 1]),
      };
      console.log("Running recommendation preprocessor inference...");
      const recoResults = await recoOnnxSession.run(recoInputTensor);
      const recoOutputName = recoOnnxSession.outputNames[0]; // Assuming one output
      const recoOutputTensor = recoResults[recoOutputName];
      if (!recoOutputTensor)
        throw new Error("Recommendation preprocessor output not found.");

      // Output is likely Float32Array or similar
      const preprocessedVector = Array.from(
        recoOutputTensor.data as Float32Array | Int32Array | BigInt64Array // Adjust type based on actual output
      );
      console.log("Preprocessed vector:", preprocessedVector);

      // 2. Apply Weights to create Query Vector
      // IMPORTANT: Ensure this order matches the output order of reco_preprocessor.onnx
      const featureOrderForWeights = [
        "carpetArea",
        "bedrooms",
        "bathrooms",
        "floorNumber",
        "totalFloorNumber",
        // Add other feature names in the correct order if they are in the output
      ];
      if (preprocessedVector.length !== featureOrderForWeights.length) {
          console.error("Mismatch between preprocessed vector length and expected feature order for weights!");
          // Handle this error appropriately - maybe skip weighting or throw
          throw new Error("Preprocessor output length mismatch for weighting.");
      }
      const queryVector = preprocessedVector.map((value, index) => {
        const featureName = featureOrderForWeights[index];
        const weight = featureWeights[featureName] || 1.0; // Default to 1 if weight missing
        return value * weight;
      });
      console.log("Weighted query vector:", queryVector);

      // 3. Perform Nearest Neighbor Search
      const searchResults = await findNearestNeighborsFullScan(
        queryVector,
        vectorCollection,
        10 // Get top 10 recommendations
      );
      console.log("Search results:", searchResults);

      // 4. Retrieve Metadata and Format Results
      const finalRecommendations: Property[] = searchResults
        .map((result) => {
          const metadata = propertyMetadata.get(result.doc.id);
          if (metadata) {
            return {
              ...metadata, // Spread the metadata fields
              id: result.doc.id, // Ensure ID is present
              distance: result.distance, // Add distance for potential display/sorting
            };
          }
          console.warn(`Metadata not found for recommended ID: ${result.doc.id}`);
          return null; // Filter out items with missing metadata
        })
        .filter((item): item is Property => item !== null); // Type guard to remove nulls

      setRecommendations(finalRecommendations);
      console.log("Recommendations generated:", finalRecommendations);
      if (finalRecommendations.length === 0 && searchResults.length > 0) {
          setRecommendationsError("Found similar items, but couldn't load their details.");
      }

    } catch (error) {
      console.error("Error during recommendation generation:", error);
      setRecommendationsError(
        `Failed to get recommendations. ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      setRecommendations([]); // Clear recommendations on error
    } finally {
      setLoadingRecommendations(false);
      setLoading(false); // Ensure overall loading stops
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
