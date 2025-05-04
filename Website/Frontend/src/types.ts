export interface Property {
    propertyId: string;
    localityName: string;
    price: number;
    carpetArea: number;
    floorNumber: number;
    totalFloorNumber: number;
    transactionType: string;
    furnished: string;
    bedrooms: number;
    bathrooms: number;
    ageofcons: string;
    pricePerSqft: number;
    nameOfSociety: string;
    imagePaths: string[];
    lastUpdatedDate: string;
    url: string;
  }

  // src/types.ts (example)
export interface Property {
  id: string; // Assuming metadata keys are IDs
  carpetArea: number;
  bedrooms: number;
  bathrooms: number;
  floorNumber: number;
  totalFloorNumber: number;
  price: number;
  pricePerSqft: number;
  nameOfSociety: string;
  imagePaths: string[];
  url: string;
  localityName: string;
  transactionType: string;
  furnished: string;
  ageofcons: string;
  lastUpdatedDate: string;
  // Add distance if you want to display it
  distance?: number;
}

// Schema for documents in the RxDB vector collection
export interface RxDbVectorDoc {
  id: string; // Property ID
  embedding: number[]; // The precomputed, weighted vector
}

// Type for the metadata map
export type PropertyMetadataMap = Map<string, Omit<Property, "id">>;

// Type for feature weights
export interface FeatureWeights {
  [key: string]: number;
  // Example:
  // carpetArea: number;
  // bedrooms: number;
  // ...etc
}
  