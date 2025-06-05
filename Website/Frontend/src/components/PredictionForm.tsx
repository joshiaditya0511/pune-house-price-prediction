import React, { useState } from "react";
import { useAssets } from "../hooks/useAssets";
import { AssetLoadingIndicator } from "./AssetLoadingIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  FaHome, 
  FaMapMarkerAlt, 
  FaBed, 
  FaBath, 
  FaBuilding, 
  FaCalendarAlt, 
  FaPalette, 
  FaSpinner,
  FaMagic,
  FaExclamationTriangle,
  FaCheckCircle,
  FaDownload,
  FaRedo
} from 'react-icons/fa';
import {FaArrowTrendUp} from 'react-icons/fa6';
import * as ort from "onnxruntime-web";
import options from "../data/options_iteration_3.json";
import PropertyCard from "./PropertyCard";
import type { Property } from "../types";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FaCheck, FaChevronDown } from 'react-icons/fa';
import { cn } from "@/lib/utils";

const PredictionForm: React.FC = () => {
  // Asset management
  const { assets, isLoading: assetsLoading, isReady, loadingState, error: assetsError, retryLoading } = useAssets();

  // Form state
  const [formData, setFormData] = useState({
    localityName: "",
    carpetArea: 1000,
    bedrooms: 2,
    bathrooms: 2,
    floorNumber: 1,
    totalFloorNumber: 5,
    transactionType: options.transactionType[0],
    ageofcons: options.ageofcons[0],
    furnished: options.furnished[0],
  });

  // UI state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Property[]>([]);
  const [processing, setProcessing] = useState(false);
  const [formError, setFormError] = useState("");
  const [localityOpen, setLocalityOpen] = useState(false);

  // Recommendation processing function
  const runClientSideRecommendations = async (recInputData: {
    carpetArea: number;
    bedrooms: number;
    bathrooms: number;
    floorNumber: number;
    totalFloorNumber: number;
  }): Promise<Property[]> => {
    if (!assets) throw new Error("Assets not loaded");

    const { recPreprocessorSession, recNnSession, featureWeights, propertyIdMap, propertyMetadata } = assets;

    // Step 1: Preprocessor
    const preprocessorInput = {
      carpetArea: new ort.Tensor("int64", [BigInt(recInputData.carpetArea)], [1, 1]),
      bedrooms: new ort.Tensor("int64", [BigInt(recInputData.bedrooms)], [1, 1]),
      bathrooms: new ort.Tensor("int64", [BigInt(recInputData.bathrooms)], [1, 1]),
      floorNumber: new ort.Tensor("int64", [BigInt(recInputData.floorNumber)], [1, 1]),
      totalFloorNumber: new ort.Tensor("int64", [BigInt(recInputData.totalFloorNumber)], [1, 1]),
    };

    const preprocessorResults = await recPreprocessorSession.run(preprocessorInput);
    const preprocessedTensor = preprocessorResults[recPreprocessorSession.outputNames[0]];
    const preprocessedData = Array.from(preprocessedTensor.data as Float32Array);

    // Step 2: Apply weights
    const weightedData = preprocessedData.map((value, index) => {
      const featureName = Object.keys(featureWeights)[index];
      return value * (featureWeights[featureName] || 1.0);
    });

    // Step 3: Nearest neighbors
    const nnInputTensor = new ort.Tensor("float32", new Float32Array(weightedData), [1, weightedData.length]);
    const nnResults = await recNnSession.run({ [recNnSession.inputNames[0]]: nnInputTensor });
    const indicesTensor = nnResults[recNnSession.outputNames[0]];
    const neighborIndices = Array.from(indicesTensor.data as BigInt64Array | Int32Array).map(Number);

    // Step 4: Get recommendations
    const recommendedPropertyIds = neighborIndices
      .filter(index => index >= 0 && index < propertyIdMap.length)
      .map(index => propertyIdMap[index]);

    const finalRecommendations: Property[] = recommendedPropertyIds
      .map(id => {
        const meta = propertyMetadata[id];
        return meta ? { ...meta, id } : null;
      })
      .filter((p): p is Property => p !== null);

    return finalRecommendations;
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setPrediction(null);
    setRecommendations([]);

    // Validation
    if (formData.floorNumber > formData.totalFloorNumber) {
      setFormError("Current floor cannot be greater than total floors.");
      return;
    }

    if (!isReady || !assets) {
      setFormError("Models are still loading. Please wait.");
      return;
    }

    setProcessing(true);

    try {
      // Prediction
      const predictionInput = {
        localityName: new ort.Tensor("string", [formData.localityName], [1, 1]),
        carpetArea: new ort.Tensor("int64", [BigInt(formData.carpetArea)], [1, 1]),
        floorNumber: new ort.Tensor("int64", [BigInt(formData.floorNumber)], [1, 1]),
        totalFloorNumber: new ort.Tensor("int64", [BigInt(formData.totalFloorNumber)], [1, 1]),
        transactionType: new ort.Tensor("string", [formData.transactionType], [1, 1]),
        furnished: new ort.Tensor("string", [formData.furnished], [1, 1]),
        bedrooms: new ort.Tensor("int64", [BigInt(formData.bedrooms)], [1, 1]),
        bathrooms: new ort.Tensor("int64", [BigInt(formData.bathrooms)], [1, 1]),
        ageofcons: new ort.Tensor("string", [formData.ageofcons], [1, 1]),
      };

      const predictionResults = await assets.predictionSession.run(predictionInput);
      const predictedPrice = (predictionResults[assets.predictionSession.outputNames[0]].data as Float32Array)[0];
      const formattedPrice = Math.round(predictedPrice).toLocaleString("en-IN");
      setPrediction(formattedPrice);

      // Recommendations
      const recs = await runClientSideRecommendations({
        carpetArea: formData.carpetArea,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        floorNumber: formData.floorNumber,
        totalFloorNumber: formData.totalFloorNumber,
      });
      setRecommendations(recs);

    } catch (error) {
      console.error("Prediction error:", error);
      setFormError(`Prediction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Asset Loading Status */}
      <AssetLoadingIndicator
        loadingState={loadingState}
        isLoading={assetsLoading}
        error={assetsError}
        onRetry={retryLoading}
      />

      {/* Main Form Card */}
      <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FaHome className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl md:text-2xl text-slate-800">Property Price Predictor</CardTitle>
              <CardDescription className="text-sm md:text-base">
                Get AI-powered price estimates for Pune properties
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Location Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm md:text-base font-medium text-slate-700">
                <FaMapMarkerAlt className="w-4 h-4" />
                <span>Location Details</span>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="locality" className="text-sm md:text-base">Locality</Label>
                  <Popover open={localityOpen} onOpenChange={setLocalityOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={localityOpen}
                        className="w-full justify-between"
                      >
                        {formData.localityName || "Select locality..."}
                        <FaChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search locality..." />
                        <CommandEmpty>No locality found.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {options.localityName.map((locality) => (
                            <CommandItem
                              key={locality}
                              value={locality}
                              onSelect={(currentValue) => {
                                updateFormData('localityName', currentValue === formData.localityName ? "" : currentValue);
                                setLocalityOpen(false);
                              }}
                            >
                              <FaCheck
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.localityName === locality ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {locality}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Property Details Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm md:text-base font-medium text-slate-700">
                <FaBuilding className="w-4 h-4" />
                <span>Property Details</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="carpetArea" className="text-sm md:text-base">Carpet Area (sqft)</Label>
                  <Input
                    id="carpetArea"
                    type="number"
                    min="100"
                    max="10000"
                    value={formData.carpetArea}
                    onChange={(e) => updateFormData('carpetArea', parseInt(e.target.value) || 0)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bedrooms" className="flex items-center space-x-1 text-sm md:text-base">
                    <FaBed className="w-3 h-3" />
                    <span>Bedrooms</span>
                  </Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.bedrooms}
                    onChange={(e) => updateFormData('bedrooms', parseInt(e.target.value) || 1)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bathrooms" className="flex items-center space-x-1 text-sm md:text-base">
                    <FaBath className="w-3 h-3" />
                    <span>Bathrooms</span>
                  </Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.bathrooms}
                    onChange={(e) => updateFormData('bathrooms', parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
            </div>

            {/* Floor Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="floorNumber" className="text-sm md:text-base">Current Floor</Label>
                <Input
                  id="floorNumber"
                  type="number"
                  min="0"
                  max="50"
                  value={formData.floorNumber}
                  onChange={(e) => updateFormData('floorNumber', parseInt(e.target.value) || 0)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="totalFloors" className="text-sm md:text-base">Total Floors</Label>
                <Input
                  id="totalFloors"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.totalFloorNumber}
                  onChange={(e) => updateFormData('totalFloorNumber', parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            {/* Additional Details */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm md:text-base font-medium text-slate-700">
                <FaPalette className="w-4 h-4" />
                <span>Additional Features</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transactionType" className="text-sm md:text-base">Transaction Type</Label>
                  <Select value={formData.transactionType} onValueChange={(value) => updateFormData('transactionType', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {options.transactionType.map((type, index) => (
                        <SelectItem key={index} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ageofcons" className="text-sm md:text-base">Age of Construction</Label>
                  <Select value={formData.ageofcons} onValueChange={(value) => updateFormData('ageofcons', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {options.ageofcons.map((age, index) => (
                        <SelectItem key={index} value={age}>
                          {age}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="furnished" className="text-sm md:text-base">Furnishing Status</Label>
                  <Select value={formData.furnished} onValueChange={(value) => updateFormData('furnished', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {options.furnished.map((option, index) => (
                        <SelectItem key={index} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Error Alert */}
            {formError && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  {formError}
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              disabled={!isReady || processing}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
            >
              {processing ? (
                <>
                  <FaSpinner className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : !isReady ? (
                <>
                  <FaSpinner className="w-4 h-4 mr-2 animate-spin" />
                  Loading Models...
                </>
              ) : (
                <>
                  <FaMagic className="w-4 h-4 mr-2" />
                  Get Price Estimate
                </>
              )}
            </Button>
          </form>

          {/* Prediction Result */}
            {prediction && (
              <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FaArrowTrendUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Estimated Property Value</p>
                      <p className="text-2xl font-bold text-slate-800">₹ {prediction}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
        </CardContent>
      </Card>

      {/* Recommendations Section */}
      {recommendations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 mb-6">
            <FaMagic className="w-5 h-5 text-amber-500" />
            <h3 className="text-xl font-semibold text-gray-800">Similar Properties You Might Like</h3>
          </div>
          <p className="text-gray-600 mb-6">Based on your search criteria, here are some similar properties</p>
          
          <div className="space-y-4">
            {recommendations.map((property, index) => (
              <PropertyCard key={property.propertyId || index} property={property} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionForm;