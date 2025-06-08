---
layout: ../layouts/MarkdownPageLayout.astro
title: About the Project
description: "Learn about the technology behind PuneProp Predict, including the machine learning models, tech stack, the project's features, future enhancements, and more."
# publishDate: 2025-05-07
author: Aditya Joshi
displayTitle: false # Uncomment this if your markdown starts with its own H1
---

# Pune House Price Predictor & Recommender

[![Deployment](https://img.shields.io/badge/Live%20App-pune.adityajoshi.in-brightgreen)](https://pune.adityajoshi.in)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) <!-- Optional: Add a license badge if you have one -->
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repo-blue)](https://github.com/joshiaditya0511/pune-house-price-prediction)

Welcome to the Pune House Price Predictor & Recommender project! This tool provides estimated prices for residential properties in Pune, India, and recommends similar properties based on user-defined features using machine learning. You can check out the code at my github repo [here](https://github.com/joshiaditya0511/pune-house-price-prediction).

## Table of Contents

*   [Overview](#overview)
*   [How It Works (Technical Flow)](#how-it-works-technical-flow)
    *   [Current Architecture (Client-Side with ONNX)](#current-architecture-client-side-with-onnx)
    *   [Previous Architecture (Server-Side)](#previous-architecture-server-side)
*   [Methodology](#methodology)
    *   [Data Acquisition](#data-acquisition)
    *   [Data Preprocessing & EDA](#data-preprocessing--eda)
    *   [Feature Engineering & Selection](#feature-engineering--selection)
    *   [Price Prediction Model Training](#price-prediction-model-training)
    *   [Recommendation System Development](#recommendation-system-development)
*   [Technology Stack](#technology-stack)
*   [Deployment](#deployment)
    *   [Current Architecture (Client-Side with ONNX)](#current-architecture-client-side-with-onnx-1)
    *   [Previous Architecture (Server-Side)](#previous-architecture-server-side-1)
*   [Project Versions](#project-versions)
*   [Future Enhancements](#future-enhancements)

---

## Overview

This project aims to provide realistic house price estimates for Pune properties based on various characteristics like area, number of bedrooms/bathrooms, age, and location. It also suggests similar properties from a scraped dataset.

**Key Features:**

1.  **ML-Powered Price Prediction:** Utilizes a trained LightGBM model (achieving R² \( \~ 0.93 \), Median APE \( \~ 11 \% \)) to estimate prices based on user inputs.
2.  **Nearest Neighbor Recommendations:** Finds and displays similar properties from the dataset based on feature similarity to the user's query.

The system primarily operates via client-side computation for its core ML features, with a static frontend serving all necessary assets. Previously, it utilized a decoupled frontend-backend architecture.

## How It Works (Technical Flow)

This section describes the technical process from user input to displaying results.

### Current Architecture (Client-Side with ONNX)

With the latest architectural shift, all machine learning computations (prediction and recommendation) are performed directly in the user's web browser, leveraging ONNX models for efficient client-side inference.

<img 
  src="/PHPPcurrent.svg" 
  alt="Current Architecture Diagram" 
  width="800" 
  height="600" 
  style="max-width: 100%; height: auto;" 
/>

1.  **Initial Asset Loading:** When the user first visits the site ([pune.adityajoshi.in](https://pune.adityajoshi.in)), the frontend application (Astro.js and React) loads:
    *   The ONNX model for price prediction (which includes the preprocessing pipeline).
    *   The ONNX model for preprocessing features for recommendations.
    *   The ONNX model for finding nearest neighbors.
    *   A JSON file containing the metadata for all properties in the dataset (used for displaying recommendation details).
2.  **User Input:** The user inputs property features into the form.
3.  **Client-Side Price Prediction:**
    *   The input features are passed directly to the loaded price prediction ONNX model within the browser.
    *   This single ONNX model handles all necessary preprocessing and then predicts the price.
    *   The predicted price is displayed to the user.
4.  **Client-Side Recommendation Generation (Multi-Step):**
    *   **Preprocessing (ONNX):** The same user input features are passed to the recommendation preprocessing ONNX model.
    *   **Feature Weighting (JavaScript):** The preprocessed features are then programmatically adjusted in JavaScript. This step applies specific weights to different features to refine the similarity calculation based on their perceived importance.
    *   **Nearest Neighbors Search (ONNX):** The weighted feature vector is then fed into the `NearestNeighbors` ONNX model. This model identifies the indices of the top N most similar properties from the dataset.
    *   **Metadata Lookup (JavaScript):** The retrieved indices are used to look up the corresponding property details (like price, area, address snippet, image URL) from the pre-loaded metadata JSON file.
    *   The list of recommended property details is then displayed to the user.
5.  **UI Update:** React components render the predicted price and the list of recommended properties based on the client-side computations.
6.  **No Backend API Calls for ML Compute:** For prediction and recommendation tasks, there are no API calls made to a backend server. All inference happens on the client-side.

### Previous Architecture (Server-Side)

When a user requests a prediction and recommendations via the web interface:

<img 
  src="/PHPPold.svg" 
  alt="Previous Architecture Diagram"
  width="900" 
  height="700" 
  style="max-width: 100%; height: auto;" 
/>

1.  **Frontend Interaction:** The user inputs property features into the form on the static frontend application ([pune.adityajoshi.in](https://pune.adityajoshi.in)), built with Astro.js and React.
2.  **Sequential API Requests:** Upon submission, the frontend makes **synchronous** POST requests to the backend API (`phpp-api.adityajoshi.in`), hosted on AWS EC2:
    *   **First:** A request is sent to `/predict` with the user's input features. The frontend waits for this response.
    *   **Second:** After receiving the price prediction, a *separate* request is sent to `/recommend` with the same features.
3.  **Backend Processing (FastAPI):**
    *   **Startup:** Key components like the Scikit-learn preprocessing pipelines, the trained LightGBM prediction model, the fitted `NearestNeighbors` model, and the recommendation metadata (Pandas DataFrame) are **loaded into memory once when the FastAPI application starts**, not on each request.
    *   **Prediction Request (`/predict`):**
        *   The incoming JSON payload is validated.
        *   The pre-loaded preprocessing pipeline is applied to the input features.
        *   The transformed features are passed to the pre-loaded LightGBM model.
        *   The model generates the price prediction.
        *   The predicted price is returned as a JSON response.
    *   **Recommendation Request (`/recommend`):**
        *   The incoming JSON payload is validated.
        *   The input features are processed, **excluding the `LocalityName` feature** as it's not used for similarity calculation.
        *   The relevant pre-loaded preprocessing steps (e.g., scaling, encoding for the *remaining* features) are applied.
        *   The resulting feature vector is used to query the pre-loaded `NearestNeighbors` model.
        *   The `kneighbors` method identifies the indices of the top N most similar properties.
        *   These indices are used to look up corresponding property details from the pre-loaded metadata DataFrame.
        *   The list of recommended property details is returned as a JSON response.
4.  **Frontend Response Handling:** The frontend JavaScript receives the response from `/predict`, updates the UI to display the price, then receives the response from `/recommend` and updates the UI again to display the recommendations.
5.  **UI Update:** React components render the predicted price and the list of recommended properties.

---

## Methodology

This section details the offline steps taken to acquire data, build the models, and prepare the necessary artifacts used by the backend API during runtime.

### Data Acquisition

*   **Source:** Over 30,000 property listings were collected from the Pune section of [MagicBricks.com](https://magicbricks.com).
*   **Technique:** Due to anti-scraping measures, Selenium was used to automate browser interactions and target an internal API endpoint (discovered via dev tools) to scrape property data efficiently into JSON format.

### Data Preprocessing & EDA

*   **Initial Structuring:** Raw JSON data, containing MagicBricks-specific semantics, was parsed. Relevant information was extracted and transformed into a structured tabular format (CSV) using Pandas.
*   **Data Cleaning:**
    *   Text fields were cleaned using Pandas string methods and regular expressions.
    *   Obvious errors and non-statistical outliers (e.g., impossible values) were identified and removed based on domain understanding. Statistical outliers were generally retained as they might represent valid high-end or low-end market segments.
*   **Missing Data Handling:**
    *   For most features ultimately used in the model, various imputation strategies (KNNImputer, IterativeImputer, SimpleImputer) were tested. Their performance (MAE) was evaluated against the non-null portion of the data, and the best-performing method was chosen for each feature.
    *   The `carpetArea` feature exhibited a strong linear correlation with `coveredArea`, `bedrooms`, and `bathrooms`. Consequently, missing `carpetArea` values were imputed using a Linear Regression model trained on the subset of data where all these features were present.
*   **Exploratory Data Analysis (EDA):**
    *   The `ydata-profiling` library was used extensively for generating comprehensive initial reports covering univariate and bivariate analysis, correlations, and missing value summaries.
    *   Manual analysis using Pandas and visualization libraries was performed where `ydata-profiling` needed supplementation or deeper dives.

### Feature Engineering & Selection

A multi-stage process was used to select the most relevant features for the prediction model:

1.  **Practicality Filter:** Features unavailable at prediction time (e.g., `nameOfSociety`, `developerName`) or requiring information a typical user wouldn't provide (e.g., `maintenanceCharges`) were excluded. The goal was a generalized model.
2.  **Variance & Cardinality Check:** Features with very low variance were dropped. Categorical features where over 95% of values belonged to a single category were also removed as they offered little predictive power.
3.  **Quantitative Importance Scoring:** A comprehensive scoreboard approach was implemented to rank remaining features based on various metrics:
    *   **Statistics-Based:** F-regression, R-regression (correlation), Mutual Information scores.
    *   **Model-Based Importance:** Feature importances derived from trained Linear Regression, Random Forest, XGBoost, and Decision Tree models.
    *   **Permutation Importance:** Assessed feature importance by shuffling feature values and measuring the impact on model performance (tested with Random Forest, XGBoost, Decision Tree).
    *   **SHAP Importance:** Calculated SHAP values to understand feature contributions (tested with Linear Regression, Random Forest, XGBoost, Decision Tree).
4.  **Final Selection:** Scores from all tests were aggregated, and features with consistently high importance across multiple methods were selected for the final model.

### Price Prediction Model Training

*   **Data Split:** The preprocessed data was split into training and testing sets.
*   **Model Evaluation Metrics:** Due to skewness observed in the target variable (price), standard Mean Absolute Error (MAE) and Mean Absolute Percentage Error (MAPE) were deemed less representative. Instead, the evaluation focused on:
    *   R² Score
    *   Median Absolute Error (MedAE)
    *   Median Absolute Percentage Error (MedAPE)
    *   Analysis of error quantiles.
    A composite score combining these metrics was used for model comparison.
*   **Hyperparameter Tuning:** `GridSearchCV` was employed on the training set to find the optimal hyperparameters for various candidate models (e.g., Linear Regression, Random Forest, XGBoost - implied).
*   **Final Model Training & Testing:** The best-performing model (LightGBM) with its optimal hyperparameters (identified via GridSearchCV) was retrained on the entire training dataset. Its final performance was then evaluated on the held-out test set.
*   **Results:** The final model achieved an R² score of \( 0.93 \), a Median Absolute Error of approximately ₹8.3 Lakhs, and a Median Absolute Percentage Error of \( 11.3 \% \) on the test data. The final preprocessing pipeline and trained LightGBM model were saved using pickle and joblib.

### Recommendation System Development

*   **Approach:** Lacking user interaction history, a content-based filtering approach was chosen. The system recommends properties from the scraped dataset that are most similar to the user's input query.
*   **Features Used:** The same features selected for the price prediction model were used for finding neighbors, *except* for `LocalityName`. Including locality would require one-hot encoding, drastically increasing dimensionality and potentially reducing the effectiveness of distance-based neighbor searches (curse of dimensionality).
*   **Implementation:**
    *   Relevant features were appropriately encoded (e.g., numerical scaling, categorical encoding if any non-OHE categories remained).
    *   Scikit-learn's `NearestNeighbors` using a Euclidean distance metric was fitted on the feature vectors of all properties in the dataset (train + test combined).
    *   Metadata (like price, area, address snippet, image URL - if available) for all properties was stored separately, indexed to match the `NearestNeighbors` data, allowing retrieval of details for the recommended properties.

---

## Technology Stack

*   **Data Science & ML:** Python, Pandas, Scikit-learn, Selenium, `ydata-profiling`, Jupyter Notebooks, `ONNX`
*   **Backend:** FastAPI, Python
*   **Frontend:** Astro.js, React, Bootstrap
*   **Deployment:** Docker, Docker Compose, AWS EC2 (Ubuntu), NGINX, Vercel
*   **Version Control:** Git, GitHub

---

## Deployment

This section outlines how the project is deployed and made accessible.

### Current Architecture (Client-Side with ONNX)

The application now operates with a "zero-backend" approach for its core machine learning functionalities, with all computations handled client-side.

*   **Frontend & ML Execution Environment:**
    *   A static multi-page application built with Astro.js and React.
    *   All ML models (in ONNX format) and property metadata (JSON) are served as static assets alongside the HTML, CSS, and JavaScript files.
    *   Hosted on Vercel's Hobby plan.
    *   CI/CD enabled via GitHub integration (automatic builds and deployments on push).
    *   Accessible at: [https://pune.adityajoshi.in](https://pune.adityajoshi.in)
*   **No Active Backend for ML Compute:** The previous backend server (FastAPI on AWS EC2) is no longer used for price prediction or recommendation tasks. Vercel serves all necessary files, and the user's browser executes the logic.

### Previous Architecture (Server-Side)

The application follows a decoupled frontend-backend architecture:

*   **Frontend:**
    *   A static multi-page application built with Astro.js and React.
    *   Hosted on Vercel's Hobby plan.
    *   CI/CD enabled via GitHub integration (automatic builds and deployments on push).
    *   Accessible at: [https://pune.adityajoshi.in](https://pune.adityajoshi.in)
*   **Backend:**
    *   A FastAPI application serving the prediction and recommendation models via REST API endpoints (`/predict`, `/recommend`, `/health`).
    *   Preprocessing pipelines, trained models, and recommendation data are loaded for inference.
    *   Dockerized using multi-stage builds for optimized image size.
    *   Deployed on an AWS EC2 (Free Tier) instance running Ubuntu.
    *   NGINX is used as a reverse proxy and for handling HTTPS.
    *   Accessible via a dedicated subdomain: `phpp-api.adityajoshi.in` (Note: This API is primarily for the frontend's use).

---

## Project Versions

The project has evolved through several iterations:

*   **Version 1.0 (Iteration_1):** Initial working version with imputation for missing values in selected features.
*   **Version 1.1 (Iteration_2):** Instead of imputation, rows with missing values in the *final selected features* were dropped. This reduced the dataset size but avoided potentially inaccurate imputations.
*   **Version 1.2 (Iteration_3):** The dataset was completely rescraped (approx. 3 months after the previous scrape) to ensure data freshness for pricing and recommendations. The entire pipeline (cleaning, EDA, feature selection, training) was re-run on this new data.
*   **Version 2.0 (Current):** Major architectural shift to client-side ML inference using ONNX. All prediction and recommendation logic now runs in the browser. Introduced feature weighting in JavaScript for recommendations. Backend API for ML computation decommissioned.

*(Code and artifacts for each version can be found in the respective `Iteration_X` folders.)*

---

## Future Enhancements

This project is under continuous development. Here are some planned improvements and areas for future exploration:

**Data & Automation:**

*   **Scraping Automation (Challenges):** Explore possibilities for automating the data scraping and processing process (e.g., using MLFlow or scheduled jobs). However, current limitations due to MagicBricks' site structure and potential anti-bot measures (requiring manual intervention, batch processing, and sequential logic) make full automation challenging.
*   **Periodic Data Refresh:** Despite automation challenges, establish a regular cadence for manually re-scraping data to keep price predictions and recommendations current.

**Modeling & Feature Engineering:**

*   **Tiered Prediction Models:** Develop multiple prediction models based on the amount of information the user provides (e.g., a basic model and an advanced model incorporating amenities or detailed project info). Route requests to the appropriate model.
*   **Locality Analysis & Enhancement:**
    *   **Contextual Merging:** Improve the merging of similar locality names using domain knowledge and geographical context to handle inconsistencies in the source data.
    *   **Influence Measurement:** Develop metrics to quantify the impact of locality on property prices, potentially by analyzing price variations across similar property groups in different areas.
    *   **Similarity Identification:** Use techniques like PCA, t-SNE, or clustering based on price influence metrics to identify and potentially merge similar localities for feature encoding.
    *   **Advanced Encoding:** Investigate alternatives to current locality encoding (ordinal/OHE), such as creating composite scores based on average property characteristics within each locality or using target encoding.
*   **Incorporate Amenities:** Add property amenities as features for both prediction and recommendation models.

**Recommendation System:**

*   **Optimized Vector Search:** Explore and potentially implement Approximate Nearest Neighbor (ANN) libraries (e.g., Faiss, Annoy, ScaNN) for more scalable and efficient similarity searches, especially if the dataset grows.
*   **Refined Similarity Matching:**
    *   **Weighted Features:** Experiment with assigning different weights to features during the nearest neighbor search (e.g., giving higher weight to locality if sufficient local examples exist).
    *   **Distance Thresholding:** Apply a maximum distance threshold to filter out recommendations that, while being nearest neighbors, are still significantly dissimilar to the user's query.
    *   **Locality-Specific Recommendations:** Offer options for recommendations strictly within the same locality versus those in different but potentially similar localities.

**New Features: Insights Page**

*   **Dynamic User-Based Insights:**
    *   Generate insights specific to the user's selected locality (price trends, premium status, density, project stats).
    *   Allow comparison between different localities.
    *   Explore integrating LLMs with Retrieval-Augmented Generation (RAG) on the property data to generate narrative insights.
*   **Static Market Insights:**
    *   Add pre-computed analyses to the Insights page: premium localities, listing density, similar locality groups.
    *   Analyze the impact of floor number, total floors, transaction type (resale vs. new), age of construction, and furnishing on prices.
    *   Visualize feature importance and effects using SHAP/LIME results from the trained model.

**Frontend UI/UX & SEO:**

*   **UI Polish:**
    *   Improve Navbar layout and styling (item spacing, hover effects).
    *   Format predicted prices into a more readable currency format (e.g., Lakhs, Crores).
    *   Enhance prediction form validation display (messages near inputs, color coding).
    *   Add loading indicators during API calls.
    *   Improve error handling display for recommendations.
    *   Refine property card details (consider adding maintenance charges if available).
*   **SEO & Metadata:** Implement standard SEO practices (meta descriptions, titles per route, Open Graph tags, favicon, sitemap.xml) for better discoverability.


