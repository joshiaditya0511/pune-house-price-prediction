import React, { useState, useEffect } from 'react';
import { 
  FaMapMarkerAlt, 
  FaRulerCombined, 
  FaBed, 
  FaBath, 
  FaBuilding, 
  FaExternalLinkAlt 
} from 'react-icons/fa';
import type { Property } from '../types';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

const defaultImagePath = '/no-photo-available.png';

interface PropertyCardProps {
  property: Property;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property }) => {
  const [api, setApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideCount, setSlideCount] = useState(0);

  const displayImagePaths =
    property.imagePaths &&
    Array.isArray(property.imagePaths) &&
    property.imagePaths.length > 0
      ? property.imagePaths
      : [defaultImagePath];

  useEffect(() => {
    if (!api) {
      return;
    }

    setSlideCount(api.scrollSnapList().length);
    setCurrentSlide(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrentSlide(api.selectedScrollSnap());
    });
    
    return () => {
      api.off("select", () => {
        setCurrentSlide(api.selectedScrollSnap());
      });
    };
  }, [api]);

  const formatPrice = (price: number): string => {
    if (price >= 10000000) {
      return `₹ ${(price / 10000000).toFixed(1)} Crore`;
    } else if (price >= 100000) {
      return `₹ ${(price / 100000).toFixed(0)} Lakh`;
    } else {
      return `₹ ${price.toLocaleString('en-IN')}`;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow mb-4">
      <div className="flex flex-col md:flex-row">
        {/* Left: Image Section with ShadCN Carousel - FIXED DIMENSIONS */}
        <div className="relative w-full h-60 md:w-96 md:h-64 flex-shrink-0"> {/* MODIFIED LINE */}
          <Carousel setApi={setApi} className="w-full h-full">
            <CarouselContent className="h-full">
              {displayImagePaths.map((src, index) => (
                <CarouselItem key={index} className="h-full">
                  <img
                    src={src}
                    alt={`${property.nameOfSociety} property view ${index + 1}`}
                    className="w-full h-full object-cover" // object-cover ensures no whitespace
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            {displayImagePaths.length > 1 && (
              <>
                <CarouselPrevious className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white border-none h-8 w-8" />
                <CarouselNext className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white border-none h-8 w-8" />
              </>
            )}
          </Carousel>

          {/* Dot Indicators */}
          {displayImagePaths.length > 1 && (
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1.5 z-10">
              {Array.from({ length: slideCount }).map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentSlide ? 'bg-white scale-125' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Property Details (remains the same) */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start mb-3 sm:mb-4">
            <div className="flex-1 mb-2 sm:mb-0">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1">
                {property.nameOfSociety}
              </h3>
              <div className="flex items-center text-sm text-gray-600">
                <FaMapMarkerAlt className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span>{property.localityName}</span>
              </div>
            </div>
            <div className="text-left sm:text-right sm:ml-4 w-full sm:w-auto">
              <p className="text-xl sm:text-2xl font-bold text-blue-600">
                {formatPrice(property.price)}
              </p>
              <p className="text-xs sm:text-sm text-gray-600">
                ₹ {property.pricePerSqft.toLocaleString('en-IN')} per sq.ft.
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
            <div className="text-center">
              <FaRulerCombined className="w-4 h-4 md:w-5 md:h-5 text-blue-500 mx-auto mb-1" />
              <div className="text-sm font-semibold text-gray-800">{property.carpetArea} sq.ft.</div>
              <div className="text-xs text-gray-600">Carpet Area</div>
            </div>
            
            <div className="text-center">
              <FaBed className="w-4 h-4 md:w-5 md:h-5 text-blue-500 mx-auto mb-1" />
              <div className="text-sm font-semibold text-gray-800">{property.bedrooms} BHK</div>
              <div className="text-xs text-gray-600">Bedrooms</div>
            </div>
            
            <div className="text-center">
              <FaBath className="w-4 h-4 md:w-5 md:h-5 text-blue-500 mx-auto mb-1" />
              <div className="text-sm font-semibold text-gray-800">{property.bathrooms}</div>
              <div className="text-xs text-gray-600">Bathrooms</div>
            </div>
            
            <div className="text-center">
              <FaBuilding className="w-4 h-4 md:w-5 md:h-5 text-blue-500 mx-auto mb-1" />
              <div className="text-sm font-semibold text-gray-800">
                {property.floorNumber} of {property.totalFloorNumber}
              </div>
              <div className="text-xs text-gray-600">Floor</div>
            </div>
          </div>

          {/* Additional Info & Button */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
              <div className="flex justify-between sm:block">
                <span className="text-gray-600 mr-1 sm:mr-0">Transaction:</span>
                <span className="font-medium text-gray-800">{property.transactionType}</span>
              </div>
              <div className="flex justify-between sm:block">
                <span className="text-gray-600 mr-1 sm:mr-0">Age:</span>
                <span className="font-medium text-gray-800">{property.ageofcons}</span>
              </div>
              <div className="flex justify-between sm:block">
                <span className="text-gray-600 mr-1 sm:mr-0">Furnishing:</span>
                <span className="font-medium text-gray-800">{property.furnished}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center pt-2 sm:pt-0">
              <div className="text-xs text-gray-500 mb-2 sm:mb-0">
                Last updated: {property.lastUpdatedDate}
              </div>
              <a 
                href={property.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                View Details
                <FaExternalLinkAlt className="w-3 h-3 ml-2" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;