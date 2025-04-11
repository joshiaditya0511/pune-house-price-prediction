# Data and Model Updation

## 1.1 Current Architecture
    - The prediction and recommendation models are deployed using FastAPI and Python and deployed on my Free Tier AWS EC2 instance using docker-compose.
    - Everytime I update the data/models, I have to manually SSH into the EC2 instance, copy all the necessary files, and restart the docker-compose.
    - I can try CI/CD to automate this process. Like using GitHub actions or AWS CodePipeline to automatically check if there are updates to the data/models using git diff and then deploy the changes.

## 1.2 Client side computation using WebAssembly
    - In this case, if I don't use database to store property metadata for recommendations, then, there will be no need for any CI/CD process to update the data/models. They will be updated directly as Vercel rebuilds my app and deploys it using GitHub integration.
    - If I use database to store property metadata for recommendations, then, I can use CI/CD to update the database using GitHub actions or AWS CodePipeline.

## 1.3 Constraints on Automation due to Data
    - As you know, I scrape the data from MagicBricks website. They have probably implemented some kind of anti-bot meausres to prevent scraping or maybe their architecture is not designed to be scraped. Basically, I can't scrape the data using simple requests. I have to wait for the javascript to load and then scrape the data.
    - Also, I have to do it in batches. And the search criteria is different for each batch. And each batch's outcome decided the criteria for next batch. So, I have to do it in a loop and cannot parallelize it.
    - So, it's difficult to automate the process. I have to manually run the script over multiple days.
    - Otherwise, I wanted to automate the scraping process and scrape and update the data periodically to stay up-to-date.
    - I would have done it using MLFlow or similar tools.


# Model Training

## Price Prediction

### 1. Multiple models based on how much data the user can provide. 
    - For example, a base model which takes in input the basic choices and features and predicts the price.
    - A more advanced model if the user decides to provide additional data like amentities, project/society details like number of buildings/wings, etc.
    - Differential routing and models based on user selection.

### 2. Localities

#### 2.1 More context aware locality merging
    - The locality names are not very accurate and consistent. This problem arise because of the data source. There, agents/owners are not always consistent in their locality naming.
    - So, use good context and domain and geographical knowledge to merge the locality names.

#### 2.2 A better way to measure the price influence of locality
    - Everyone knows that locality is a big factor in determining the price. But, how much does it really matter? And how can I measure it?
    - Like one or multiple metrics to measure the influence of locality on the price. Can be determined using the price difference of similar groups of properties across localities.

#### 2.3 Identification of similar localities
    - Based on above research, we can identify similar localities and merge them internally (feature encoding).
    - This will help in reducing the dimensionality of the data and thus, speed up the training and inference process.
    - Try using PCA or t-SNE to do this? (Heavily depends on outcome of point 2.2)

#### 2.4 Better encoding of locality
    - The current encoding (one-hot for Nearest Neighbours in recommendations; and ordinal for Tree based regression model for price prediction) is not very effective.
    - Before all the above mentioned research on locality, I can try to improve the encoding of locality. 
    - Like creating a composite score of locality based on composite of mean and median carpet area, bedrooms, bathrooms, total floors. (Also amenities when I incorporate them)

## Recommendation

### 1. Vector search
    - Currently, I am using simple Nearest Neighbours given by scikit-learn to find similar properties. Albeit it being effective since it's on small data, it's not very scalable.
    - I want to try using different optimized algortithms like Annoy, Faiss, Scann, etc.

### 2. Finetuning vectors
    - Currently, the recommendations are based on simple nearest neighbours. For that, I have used one-hot encoding for categorical variables and Standard Scaler for numerical variables.
    - But, this is not ideal. Also, since I don't have historic data of user preferences, I can only generate recommendations based on this simple nearest neighbor search. So, there's no way for me to assess quality of recommendations. So, I have to rely on common knowledge about the real estate domain. 
    - One way I can improve the recommendationsis by giving differential weights to different features. For example, if the chose locality has multiple properties available in the training metadata, then, I can give more weight to the locality in the recommendation.
    - Also, I can give 2 types of recommendations. One exclusively for same locality and one exclusively for different locality.
    - Also, instead of just relying on the recommendations given by K-nearest neighbor search, I can also apply a distance filter to the recommendations. Like even though the property has been recommended, if the distance between the property and the user is greater than a certain threshold, then, I can ignore the recommendation.
    - Also, include amentities in the recommendations.


# Deployment

## 1. Current Architecture

### 1.1 Frontend
    - The frontend is just a simple UI to input the data and display the results.

### 1.2 Backend
    - The current architecture is a simple one. All the prediction and recommendation logic is done in the backend. 
    - The backend is built using FastAPI and Python and deployed on my Free Tier AWS EC2 instance using docker-compose.

## 2. Client side computation using WebAssembly
    - The prediction and recommendation models are relatively small in size. So, I can run them in the browser using WebAssembly.
    - I will just have to figure out how to do this.

### 2.1 Prediction
    - There are various pathways and options to do this that need to be explored.
    - Use compiled XGBoost/LightGBM models using their native C API?
    - Compile XGBoost/LightGBM models using [ONNX](https://onnx.ai/sklearn-onnx/index.html) or [m2cgen](https://github.com/BayesWitnesses/m2cgen) or [tl2cgen](https://github.com/dmlc/tl2cgen)?
    - Use Pyodide to run XGBoost/LightGBM models in the browser?
    - Manually convert XGBoost/LightGBM models to native C/Go code using analysis and parsing of text/json dumps?

### 2.2 Recommendation
    - Like prediction, there are various pathways and options to do this that need to be explored.

#### 2.2.1 Vector search
    - Use RxDB to store vectors for recommendations?
    - Use RxDB for vector search?
    - Or use compiled versions of algorithms like Annoy, Faiss, Scann, etc. in WebAssembly for vector search?

#### 2.2.2 Metadata
    - Store the recommendations metadata in an embeddable database like SQLite? Hydrated in our frontend?
    - Or store the metadata in database in the backend?
    - Or, generate static files of metadata for each property. Then, whan the recommendations are generated on the frontend (i.e. we get recommended property IDs), we can fetch the metadata from the static files and use it to generate the recommendations. This will bloat the size of the app, but is a way to eliminate the need for a database and a backend.

# Insights

## 1. Dynamic Insights

### 1.1 Insights on Locality
    - How prices fluctuate with the locality?
    - Is the locality premium or not?
    - How dense is the locality?
    - General trends in prices with locality?
    - General stats on projects in locality?

### 1.2 Compare different localities

### 1.3 Integrate LLM and RAG in some way to generate insights

## 2. Static Insights