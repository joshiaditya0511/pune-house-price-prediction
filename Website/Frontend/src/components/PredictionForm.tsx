import React, { useState } from "react";
import options from "../data/options_iteration_2.json";
import PropertyCard from "./PropertyCard";
import type { Property } from "../types";

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

  // States for UI feedback
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState("");
  
  // State for recommendations
  const [recommendations, setRecommendations] = useState<Property[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setPrediction("");
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

    // --- Build the payload ---
    const requestData = {
      carpetArea,
      floorNumber,
      totalFloorNumber,
      bedrooms,
      bathrooms,
      localityName,
      transactionType,
      furnished,
      ageofcons
    };

    // --- Submit to price prediction API ---
    setLoading(true);
    try {
      const response = await fetch("https://phpp-api.adityajoshi.in/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestData)
      });
      if (!response.ok) {
        throw new Error("API request failed");
      }
      const data = await response.json();
      setPrediction(`Estimated Price: ₹ ${data.predictedPrice}`);

      // After successful prediction, fetch recommendations
      fetchRecommendations(requestData);
    } catch (error) {
      setErrorMsg("Prediction failed. Please try again later.");
      setLoading(false);
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
