from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import pandas as pd
import pickle
from fastapi.middleware.cors import CORSMiddleware
import numpy as np # Import numpy for potential NaN handling

# Create the FastAPI app instance
app = FastAPI(
    title="House Price Prediction and Recommendation API",
    description="API for predicting house prices and recommending similar properties in Pune.",
    version="1.1" # Updated version
)

origins = [
    # "http://localhost",
    # "http://localhost:8080",
    # "http://localhost:4321",
    "*"
    # Add any other origins your frontend might use
]

mapping = {
    "carpetArea": pd.Float64Dtype(),
    "floorNumber": pd.Float64Dtype(),
    "totalFloorNumber": pd.Float64Dtype(),
    "bedrooms": pd.Float64Dtype(),
    "bathrooms": pd.Float64Dtype(),
    "localityName": 'category',
    "transactionType": 'category',
    "furnished": pd.Float64Dtype(),
    "ageofcons": pd.Float64Dtype(),
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Configuration & Artifact Paths ---
PREDICTION_MODEL_FILE = "artifacts/prediction/lgb_model_iteration_3.pkl"
PREDICTION_PIPELINE_FILE = "artifacts/prediction/final_preprocessor_pipeline_iteration_3.pkl"

RECOMMENDATION_NN_MODEL_FILE = 'artifacts/recommendation/nearest_neighbors_model_iteration_3.joblib'
RECOMMENDATION_PREPROCESSOR_FILE = 'artifacts/recommendation/recommendation_preprocessor_iteration_3.joblib'
# This file contains the vectors used to fit the NN model, with Property IDs as index
RECOMMENDATION_VECTORS_FILE = 'artifacts/recommendation/property_vectors_iteration_3.pkl'
# This file contains the full metadata for all properties, indexed by Property ID
RECOMMENDATION_METADATA_FILE = 'artifacts/recommendation/recommendations.pkl'

N_RECOMMENDATIONS = 10 # Default number of recommendations to return

# --- Pydantic Model (same as before) ---
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
    # Load Prediction artifacts
    print("Loading prediction artifacts...")
    with open(PREDICTION_MODEL_FILE, "rb") as f:
        prediction_model = pickle.load(f)
    prediction_pipeline = joblib.load(PREDICTION_PIPELINE_FILE)
    print("-> Prediction artifacts loaded.")

    # Load Recommendation artifacts
    print("Loading recommendation artifacts...")
    nn_model = joblib.load(RECOMMENDATION_NN_MODEL_FILE)
    rec_preprocessor = joblib.load(RECOMMENDATION_PREPROCESSOR_FILE)

    # Load the DataFrame with vectors (needed for property ID mapping)
    property_vectors_df = pd.read_pickle(RECOMMENDATION_VECTORS_FILE)
    # Ensure index is readily available
    property_ids_in_vectors = property_vectors_df.index

    # Load the DataFrame with full metadata for recommendations
    recommendations_df = pd.read_pickle(RECOMMENDATION_METADATA_FILE)
    # Convert category columns to string for easier JSON serialization if needed
    for col in recommendations_df.select_dtypes(include='category').columns:
        recommendations_df[col] = recommendations_df[col].astype(str)
    print("-> Recommendation artifacts loaded.")

except Exception as e:
    print(f"FATAL: Error loading model or data files: {e}")
    # Depending on your deployment, you might want to exit or raise a more specific error
    raise RuntimeError("Error loading necessary artifacts") from e

# --- API Endpoints ---

@app.get("/health", tags=["Health"])
def health_check():
    """
    A simple health check endpoint.
    """
    return {"status": "ok", "artifacts_loaded": True}

@app.post("/predict", tags=["Prediction"])
def predict(features: HouseFeatures):
    """
    Predicts the price of a house based on its features.
    """
    try:
        # Convert input to DataFrame
        input_data = pd.DataFrame([features.model_dump()])

        # Use the prediction-specific pipeline
        transformed_data = prediction_pipeline.transform(input_data)

        transformed_df = pd.DataFrame(
            transformed_data, columns=[
                "carpetArea", "bedrooms", "bathrooms", "floorNumber",
                "totalFloorNumber", "localityName", "transactionType",
                "furnished", "ageofcons"
            ]
        ).astype(mapping)

        # Get prediction
        print("Predicting price...")
        prediction = prediction_model.predict(transformed_df)
        predicted_price = float(prediction[0])

        return {"predictedPrice": int(predicted_price)}

    except Exception as e:
        print(f"Prediction Error: {e}") # Log the error
        raise HTTPException(
            status_code=500,
            detail=f"Error during prediction: {str(e)}"
        )

@app.post("/recommend", tags=["Recommendation"])
def recommend(features: HouseFeatures):
    """
    Recommends similar properties based on input features.
    """
    try:
        # 1. Convert input features to DataFrame
        input_data = pd.DataFrame([features.model_dump()])
        print(f"Recommendation input: {input_data}")

        # 2. Transform the input using the RECOMMENDATION preprocessor
        # This ensures scaling and encoding match the NN model's training data
        transformed_input = rec_preprocessor.transform(input_data)
        print(f"Transformed recommendation input shape: {transformed_input.shape}")

        # 3. Prepare vector for kneighbors (needs to be 2D NumPy array)
        input_vector_np = transformed_input # Already a numpy array if sparse=False

        # 4. Find nearest neighbors using the loaded nn_model
        # We add 1 to N_RECOMMENDATIONS temporarily in case the input itself is found
        distances, indices = nn_model.kneighbors(
            input_vector_np,
            n_neighbors=N_RECOMMENDATIONS + 1 # Fetch one extra initially
        )

        # 5. Extract the row indices of neighbors from the results
        neighbor_indices = indices[0]
        print(f"Neighbor indices found: {neighbor_indices}")

        # 6. Map these indices back to the actual Property IDs
        # Use the index from the DataFrame the NN model was fitted on
        recommended_ids = property_ids_in_vectors[neighbor_indices].tolist()
        print(f"Mapped Property IDs: {recommended_ids}")

        # Let's just take the top N unique IDs found (excluding potential self)
        final_recommended_ids = []
        # We don't have the input property's ID, so we can't directly exclude it.
        # We will just return the top N results found. If the user sees their exact
        # input parameters reflected, they can ignore it.
        final_recommended_ids = recommended_ids[:N_RECOMMENDATIONS]


        print(f"Final recommended IDs: {final_recommended_ids}")

        # 8. Retrieve the full metadata for these recommended Property IDs
        results_df = recommendations_df.loc[final_recommended_ids]

        # 9. Convert the results DataFrame to a list of dictionaries for JSON output
        # Replace NaN/NaT with None for JSON compatibility
        results_df = results_df.replace({np.nan:None, pd.NA: None})
        recommendations_list = results_df.reset_index().rename(columns={'index': 'propertyId'}).to_dict(orient='records')


        return {"recommendations": recommendations_list}

    except KeyError as e:
         print(f"KeyError during recommendation metadata lookup: {e}")
         raise HTTPException(
            status_code=404,
            detail=f"Could not find metadata for one or more recommended property IDs: {e}"
         )
    except Exception as e:
        print(f"Recommendation Error: {e}") # Log the error
        raise HTTPException(
            status_code=500,
            detail=f"Error during recommendation: {str(e)}"
        )


# if __name__ == "__main__":
#     import uvicorn
#     # Use reload=True only for development
#     uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
