from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import pandas as pd
import pickle
from fastapi.middleware.cors import CORSMiddleware
import numpy as np

# Create the FastAPI app instance
app = FastAPI(
    title="House Price Prediction and Recommendation API",
    description="API for predicting house prices and recommending similar properties in Pune.",
    version="1.1"
)

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Configuration & Artifact Paths ---

# This now points to your combined sklearn Pipeline (preprocessor + model)
PREDICTION_PIPELINE_FILE = "artifacts/prediction/full_pipeline_lgbm_pune_prices.pkl"

# Recommendation artifacts unchanged
RECOMMENDATION_NN_MODEL_FILE = (
    "artifacts/recommendation/nearest_neighbors_model_iteration_3.joblib"
)
RECOMMENDATION_PREPROCESSOR_FILE = (
    "artifacts/recommendation/recommendation_preprocessor_iteration_3.joblib"
)
RECOMMENDATION_VECTORS_FILE = "artifacts/recommendation/property_vectors_iteration_3.pkl"
RECOMMENDATION_METADATA_FILE = "artifacts/recommendation/recommendations.pkl"

N_RECOMMENDATIONS = 10

class HouseFeatures(BaseModel):
    carpetArea: int
    bedrooms: int
    bathrooms: int
    floorNumber: int
    totalFloorNumber: int
    localityName: str
    transactionType: str
    furnished: str
    ageofcons: str

# --- Load Models and Data on Startup ---

try:
    # Load the combined prediction pipeline
    print("Loading combined prediction pipeline...")
    prediction_pipeline = joblib.load(PREDICTION_PIPELINE_FILE)
    print("-> Prediction pipeline loaded.")

    # Load Recommendation artifacts
    print("Loading recommendation artifacts...")
    nn_model = joblib.load(RECOMMENDATION_NN_MODEL_FILE)
    rec_preprocessor = joblib.load(RECOMMENDATION_PREPROCESSOR_FILE)
    property_vectors_df = pd.read_pickle(RECOMMENDATION_VECTORS_FILE)
    property_ids_in_vectors = property_vectors_df.index
    recommendations_df = pd.read_pickle(RECOMMENDATION_METADATA_FILE)
    for col in recommendations_df.select_dtypes(include="category").columns:
        recommendations_df[col] = recommendations_df[col].astype(str)
    print("-> Recommendation artifacts loaded.")

except Exception as e:
    print(f"FATAL: Error loading artifacts: {e}")
    raise RuntimeError("Error loading necessary artifacts") from e

# --- Health Check ---

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "artifacts_loaded": True}

# --- Prediction Endpoint ---

@app.post("/predict", tags=["Prediction"])
def predict(features: HouseFeatures):
    """
    Predicts the price of a house based on its features using the
    combined sklearn pipeline.
    """
    try:
        # 1. Build a DataFrame from the incoming features
        input_df = pd.DataFrame([features.model_dump()])

        # 2. Directly predict with the combined pipeline
        prediction = prediction_pipeline.predict(input_df)
        predicted_price = float(prediction[0])

        return {"predictedPrice": int(predicted_price)}

    except Exception as e:
        print(f"Prediction Error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error during prediction: {str(e)}"
        )

# --- Recommendation Endpoint ---

@app.post("/recommend", tags=["Recommendation"])
def recommend(features: HouseFeatures):
    """
    Recommends similar properties based on input features.
    """
    try:
        input_data = pd.DataFrame([features.model_dump()])
        transformed_input = rec_preprocessor.transform(input_data)
        distances, indices = nn_model.kneighbors(
            transformed_input, n_neighbors=N_RECOMMENDATIONS + 1
        )
        neighbor_indices = indices[0]
        recommended_ids = property_ids_in_vectors[neighbor_indices].tolist()
        final_ids = recommended_ids[:N_RECOMMENDATIONS]

        results_df = recommendations_df.loc[final_ids]
        results_df = results_df.replace({np.nan: None, pd.NA: None})
        recommendations_list = (
            results_df.reset_index()
            .rename(columns={"index": "propertyId"})
            .to_dict(orient="records")
        )

        return {"recommendations": recommendations_list}

    except KeyError as e:
        print(f"KeyError: {e}")
        raise HTTPException(
            status_code=404,
            detail=f"Metadata not found for some recommended IDs: {e}"
        )
    except Exception as e:
        print(f"Recommendation Error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error during recommendation: {str(e)}"
        )



# if __name__ == "__main__":
#     import uvicorn
#     # Use reload=True only for development
#     uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
