import React, { useState, useEffect } from "react";
import * as ort from "onnxruntime-web"; // Import ONNX Runtime Web
import options from "../data/options_iteration_3.json";
import PropertyCard from "./PropertyCard";
import type { Property } from "../types";

// --- Define the path to your model in the public directory ---
const MODEL_URL = "/prediction_pipeline_iteration_3.onnx";

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

  // --- ONNX Session State ---
  const [onnxSession, setOnnxSession] =
    useState<ort.InferenceSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true); // For model loading
  const [sessionError, setSessionError] = useState<string | null>(null);
  
  // State for recommendations
  const [recommendations, setRecommendations] = useState<Property[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState("");

  // --- Effect to Load ONNX Model ---
  useEffect(() => {
    const loadModel = async () => {
      try {
        setSessionLoading(true);
        setSessionError(null);
        console.log("Attempting to load ONNX model...");
        // Create session with WASM backend preference
        const session = await ort.InferenceSession.create(MODEL_URL, {
          executionProviders: ["wasm"], // Prioritize WASM
          // Optional: Graph optimization level
          // graphOptimizationLevel: 'all',
        });
        setOnnxSession(session);
        console.log("ONNX Inference Session created successfully.");
      } catch (e) {
        console.error("Error loading ONNX session:", e);
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
  }, []); // Empty dependency array ensures this runs only once on mount

  // --- Handle Form Submission ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setPrediction(null); // Clear previous prediction
    setRecommendations([]); // Clear recommendations
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

    // --- Check if ONNX Session is Ready ---
    if (!onnxSession) {
      setErrorMsg(
        sessionError || "Model is not loaded yet. Please wait or refresh."
      );
      return;
    }

  //   // --- Build the payload ---
  //   const requestData = {
  //     carpetArea,
  //     floorNumber,
  //     totalFloorNumber,
  //     bedrooms,
  //     bathrooms,
  //     localityName,
  //     transactionType,
  //     furnished,
  //     ageofcons
  //   };

  //   // --- Submit to price prediction API ---
  //   setLoading(true);
  //   try {
  //     const response = await fetch("https://phpp-api.adityajoshi.in/predict", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json"
  //       },
  //       body: JSON.stringify(requestData)
  //     });
  //     if (!response.ok) {
  //       throw new Error("API request failed");
  //     }
  //     const data = await response.json();
  //     setPrediction(`Estimated Price: ₹ ${data.predictedPrice}`);

  //     // After successful prediction, fetch recommendations
  //     fetchRecommendations(requestData);
  //   } catch (error) {
  //     setErrorMsg("Prediction failed. Please try again later.");
  //     setLoading(false);
  //   }
  // };

      // --- Start Prediction Process ---
      setLoading(true);
      try {
        // --- Build the Input Tensor ---
        // Keys MUST match the 'initial_types' names used during Python conversion
        // Data types MUST match (String -> string, Int64 -> bigint)
        // Shape is [1, 1] for a single prediction
        const inputTensor = {
          localityName: new ort.Tensor("string", [localityName], [1, 1]),
          carpetArea: new ort.Tensor("int64", [BigInt(carpetArea)], [1, 1]),
          floorNumber: new ort.Tensor("int64", [BigInt(floorNumber)], [1, 1]),
          totalFloorNumber: new ort.Tensor(
            "int64",
            [BigInt(totalFloorNumber)],
            [1, 1]
          ),
          transactionType: new ort.Tensor(
            "string",
            [transactionType],
            [1, 1]
          ),
          furnished: new ort.Tensor("string", [furnished], [1, 1]),
          bedrooms: new ort.Tensor("int64", [BigInt(bedrooms)], [1, 1]),
          bathrooms: new ort.Tensor("int64", [BigInt(bathrooms)], [1, 1]),
          ageofcons: new ort.Tensor("string", [ageofcons], [1, 1]),
        };
  
        console.log("Running inference with input:", inputTensor);
  
        // --- Run Inference ---
        const results = await onnxSession.run(inputTensor);
        console.log("Inference results:", results);
  
        // --- Process Output ---
        // Get the name of the output node (usually the first one for sklearn pipelines)
        const outputName = onnxSession.outputNames[0];
        const outputTensor = results[outputName];
  
        if (!outputTensor) {
          throw new Error(`Output tensor '${outputName}' not found in results.`);
        }
  
        // Data is typically a Float32Array for regression
        const predictedPrice = (outputTensor.data as Float32Array)[0];
  
        // Format and set the prediction state
        const formattedPrice = Math.round(predictedPrice).toLocaleString("en-IN");
        setPrediction(`Estimated Price: ₹ ${formattedPrice}`);
  
        // --- Fetch Recommendations (if needed) ---
        // This part remains the same if it depends only on input features
        const requestData = {
          carpetArea,
          floorNumber,
          totalFloorNumber,
          bedrooms,
          bathrooms,
          localityName,
          transactionType,
          furnished,
          ageofcons,
        };
        // If fetchRecommendations needs the predicted price, pass it:
        // fetchRecommendations(requestData, predictedPrice);
        fetchRecommendations(requestData); // Assuming it only needs input features
      } catch (error) {
        console.error("Error during prediction:", error);
        setErrorMsg(
          `Prediction failed. ${error instanceof Error ? error.message : String(error)}`
        );
        setPrediction(null); // Clear prediction on error
      } finally {
        setLoading(false); // Stop loading indicator
      }
    };

  // Separate function to fetch recommendations
  const fetchRecommendations = async (requestData: any) => {
    setLoadingRecommendations(true);
    try {
      const response = await fetch("https://phpp-api.adityajoshi.in/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        throw new Error("Recommendations request failed");
      }
      
      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
      setRecommendationsError("Failed to load similar properties. Please try again later.");
    } finally {
      setLoadingRecommendations(false);
      setLoading(false); // Complete the loading state
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
