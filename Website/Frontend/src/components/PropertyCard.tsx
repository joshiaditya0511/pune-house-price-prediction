import React, { useState, useEffect } from "react";
import {
  FaMapMarkerAlt,
  FaRulerCombined,
  FaBed,
  FaBath,
  FaBuilding,
  FaExternalLinkAlt,
} from "react-icons/fa";
import type { Property } from "../types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

const defaultImagePath = "/no-photo-available.png";

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
      // Make sure to properly turn off the event listener
      // by passing the same function reference if possible,
      // or ensure the carousel handles this internally on unmount.
      // For now, this is what was provided.
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
      return `₹ ${price.toLocaleString("en-IN")}`;
    }
  };

  return (
    <div className="mb-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col md:flex-row">
        {/* Left: Image Section with ShadCN Carousel - FIXED DIMENSIONS */}
        <div className="relative h-60 w-full flex-shrink-0 overflow-hidden md:h-64 md:w-96">
          {" "}
          {/* Added overflow-hidden, re-ordered for consistency */}
          <Carousel setApi={setApi} className="h-full w-full">
            <CarouselContent className="h-full">
              {displayImagePaths.map((src, index) => (
                <CarouselItem key={index} className="h-full">
                  <img
                    src={src}
                    alt={`${property.nameOfSociety} property view ${
                      index + 1
                    }`}
                    className="block h-full w-full object-cover" // Added 'block'
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            {displayImagePaths.length > 1 && (
              <>
                <CarouselPrevious className="absolute left-2 top-1/2 h-8 w-8 -translate-y-1/2 border-none bg-black/60 text-white hover:bg-black/80" />
                <CarouselNext className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 border-none bg-black/60 text-white hover:bg-black/80" />
              </>
            )}
          </Carousel>
          {/* Dot Indicators */}
          {displayImagePaths.length > 1 && slideCount > 1 && (
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 space-x-1.5">
              {Array.from({ length: slideCount }).map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-2 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? "scale-125 bg-white"
                      : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Property Details */}
        <div className="flex flex-1 flex-col justify-between p-4">
          {/* Header Section */}
          <div className="mb-3 flex flex-col items-start justify-between sm:mb-4 sm:flex-row">
            <div className="mb-2 flex-1 sm:mb-0">
              <h3 className="mb-1 text-lg font-semibold text-gray-800 sm:text-xl">
                {property.nameOfSociety}
              </h3>
              <div className="flex items-center text-sm text-gray-600">
                <FaMapMarkerAlt className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                <span>{property.localityName}</span>
              </div>
            </div>
            <div className="w-full text-left sm:ml-4 sm:w-auto sm:text-right">
              <p className="text-xl font-bold text-blue-600 sm:text-2xl">
                {formatPrice(property.price)}
              </p>
              <p className="text-xs text-gray-600 sm:text-sm">
                ₹ {property.pricePerSqft.toLocaleString("en-IN")} per sq.ft.
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mb-3 grid grid-cols-2 gap-3 md:mb-4 md:grid-cols-4 md:gap-4">
            <div className="text-center">
              <FaRulerCombined className="mx-auto mb-1 h-4 w-4 text-blue-500 md:h-5 md:w-5" />
              <div className="text-sm font-semibold text-gray-800">
                {property.carpetArea} sq.ft.
              </div>
              <div className="text-xs text-gray-600">Carpet Area</div>
            </div>

            <div className="text-center">
              <FaBed className="mx-auto mb-1 h-4 w-4 text-blue-500 md:h-5 md:w-5" />
              <div className="text-sm font-semibold text-gray-800">
                {property.bedrooms} BHK
              </div>
              <div className="text-xs text-gray-600">Bedrooms</div>
            </div>

            <div className="text-center">
              <FaBath className="mx-auto mb-1 h-4 w-4 text-blue-500 md:h-5 md:w-5" />
              <div className="text-sm font-semibold text-gray-800">
                {property.bathrooms}
              </div>
              <div className="text-xs text-gray-600">Bathrooms</div>
            </div>

            <div className="text-center">
              <FaBuilding className="mx-auto mb-1 h-4 w-4 text-blue-500 md:h-5 md:w-5" />
              <div className="text-sm font-semibold text-gray-800">
                {property.floorNumber} of {property.totalFloorNumber}
              </div>
              <div className="text-xs text-gray-600">Floor</div>
            </div>
          </div>

          {/* Additional Info & Button */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3 sm:gap-4 sm:text-sm">
              <div className="flex justify-between sm:block">
                <span className="mr-1 text-gray-600 sm:mr-0">
                  Transaction:
                </span>
                <span className="font-medium text-gray-800">
                  {property.transactionType}
                </span>
              </div>
              <div className="flex justify-between sm:block">
                <span className="mr-1 text-gray-600 sm:mr-0">Age:</span>
                <span className="font-medium text-gray-800">
                  {property.ageofcons}
                </span>
              </div>
              <div className="flex justify-between sm:block">
                <span className="mr-1 text-gray-600 sm:mr-0">Furnishing:</span>
                <span className="font-medium text-gray-800">
                  {property.furnished}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-between pt-2 sm:flex-row sm:pt-0">
              <div className="mb-2 text-xs text-gray-500 sm:mb-0">
                Last updated: {property.lastUpdatedDate}
              </div>
              <a
                href={property.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto"
              >
                View Details
                <FaExternalLinkAlt className="ml-2 h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;