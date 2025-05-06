// predict_onnx_node.js
const ort = require("onnxruntime-node");
const fs = require("fs");

// --- Configuration ---
const MODEL_PATH =
  "../../PipelinesAndModels/prediction_pipeline_iteration_3.onnx";
const TEST_DATA_JSON_PATH = "test_data_x.json";
const PREDICTIONS_JS_PATH = "onnx_js_predictions.json";

// --- Input Feature Names (MUST match initial_types in Python) ---
const inputFeatureNames = [
  "localityName",
  "carpetArea",
  "floorNumber",
  "totalFloorNumber",
  "transactionType",
  "furnished",
  "bedrooms",
  "bathrooms",
  "ageofcons",
];

// --- Helper function to create input tensor ---
function createInputTensor(dataRow) {
  const input = {};
  // Match the types used in initial_types during conversion
  input.localityName = new ort.Tensor("string", [dataRow.localityName], [1, 1]);
  input.carpetArea = new ort.Tensor("int64", [BigInt(dataRow.carpetArea)], [1, 1]);
  input.floorNumber = new ort.Tensor("int64", [BigInt(dataRow.floorNumber)], [1, 1]);
  input.totalFloorNumber = new ort.Tensor("int64", [BigInt(dataRow.totalFloorNumber)], [1, 1]);
  input.transactionType = new ort.Tensor("string", [dataRow.transactionType], [1, 1]);
  input.furnished = new ort.Tensor("string", [dataRow.furnished], [1, 1]);
  input.bedrooms = new ort.Tensor("int64", [BigInt(dataRow.bedrooms)], [1, 1]);
  input.bathrooms = new ort.Tensor("int64", [BigInt(dataRow.bathrooms)], [1, 1]);
  input.ageofcons = new ort.Tensor("string", [dataRow.ageofcons], [1, 1]);
  return input;
}

async function runPrediction() {
  console.log("Starting Node.js ONNX prediction...");

  try {
    // 1. Load Test Data
    console.log(`Loading test data from ${TEST_DATA_JSON_PATH}...`);
    const testDataRaw = fs.readFileSync(TEST_DATA_JSON_PATH, "utf8");
    const testData = JSON.parse(testDataRaw);
    console.log(`Loaded ${testData.length} test samples.`);

    // 2. Load ONNX Model
    console.log(`Loading ONNX model from ${MODEL_PATH}...`);
    const session = await ort.InferenceSession.create(MODEL_PATH, {
        executionProviders: ["cpu"] // Use CPU provider for Node.js typically
    });
    console.log("ONNX session created.");
    const outputName = session.outputNames[0]; // Get the output node name

    // 3. Run Inference for each row
    const predictions = [];
    console.log("Running inference...");
    for (let i = 0; i < testData.length; i++) {
      const row = testData[i];
      const inputTensor = createInputTensor(row);
      const results = await session.run(inputTensor);
      const prediction = results[outputName].data[0];
      predictions.push(prediction);

      if ((i + 1) % 100 === 0) { // Log progress
          console.log(`Processed ${i + 1} / ${testData.length} samples...`);
      }
    }
    console.log("Inference complete.");

    // 4. Save Predictions
    console.log(`Saving ${predictions.length} predictions to ${PREDICTIONS_JS_PATH}...`);
    fs.writeFileSync(
      PREDICTIONS_JS_PATH,
      JSON.stringify(predictions, null, 2) // Use null, 2 for pretty printing
    );
    console.log("Predictions saved successfully.");

  } catch (error) {
    console.error("Error during Node.js ONNX prediction:", error);
    process.exit(1); // Exit with error code
  }
}

runPrediction();
