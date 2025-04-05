import React, { useState } from 'react';
import type { Property } from '../types';

// Define the path to your generic "no photo" image
// You might want to import this image if it's local:
// import defaultImage from './assets/no-photo-available.png';
const defaultImagePath = '/no-photo-available.png'; // Replace with your actual path or imported image

interface PropertyCardProps {
  property: Property;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // --- Modification Start ---
  // Ensure imagePaths is always an array with at least one image.
  // If the original imagePaths is null, undefined, or empty, use the default image path.
  const displayImagePaths =
    property.imagePaths &&
    Array.isArray(property.imagePaths) &&
    property.imagePaths.length > 0
      ? property.imagePaths
      : [defaultImagePath];
  // --- Modification End ---

  // Format price to Indian currency format (e.g., "₹ 56 Lakh" or "₹ 1.2 Crore")
  const formatPrice = (price: number): string => {
    if (price >= 10000000) {
      return `₹ ${(price / 10000000).toFixed(1)} Crore`;
    } else if (price >= 100000) {
      return `₹ ${(price / 100000).toFixed(0)} Lakh`;
    } else {
      return `₹ ${price.toLocaleString('en-IN')}`;
    }
  };

  // Navigation for image carousel - uses displayImagePaths now
  const nextImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === displayImagePaths.length - 1 ? 0 : prevIndex + 1,
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? displayImagePaths.length - 1 : prevIndex - 1,
    );
  };

  return (
    <div className="property-card">
      {/* Image Carousel */}
      <div className="image-container">
        {/* No need to check displayImagePaths.length > 0 here, as it's guaranteed */}
        <img
          src={displayImagePaths[currentImageIndex]} // Use displayImagePaths
          alt={`${property.nameOfSociety} property view`}
          className="property-image"
        />

        {/* Image Navigation Arrows - Show only if there's more than 1 image */}
        {displayImagePaths.length > 1 && ( // Use displayImagePaths
          <>
            <button
              className="carousel-control prev"
              onClick={prevImage}
              aria-label="Previous image"
            >
              <i className="bi bi-chevron-left"></i>
            </button>
            <button
              className="carousel-control next"
              onClick={nextImage}
              aria-label="Next image"
            >
              <i className="bi bi-chevron-right"></i>
            </button>
            <div className="carousel-indicators">
              {displayImagePaths.map((_, index) => ( // Use displayImagePaths
                <span
                  key={index}
                  className={`indicator ${
                    index === currentImageIndex ? 'active' : ''
                  }`}
                  onClick={() => setCurrentImageIndex(index)}
                ></span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Property Details */}
      <div className="property-details">
        {/* Title and Price */}
        <div className="header-section">
          <div className="property-title">
            <h3 className="society-name">{property.nameOfSociety}</h3>
            <div className="locality">
              <i className="bi bi-geo-alt-fill"></i> {property.localityName}
            </div>
          </div>
          <div className="price-section">
            <p className="price">{formatPrice(property.price)}</p>
            <p className="price-per-sqft">
              ₹ {property.pricePerSqft.toLocaleString('en-IN')} per sq.ft.
            </p>
          </div>
        </div>

        {/* Features Section */}
        <div className="features-container">
          <div className="feature-box">
            <i className="bi bi-rulers"></i>
            <div className="feature-value">{property.carpetArea} sq.ft.</div>
            <div className="feature-label">Carpet Area</div>
          </div>
          <div className="feature-box">
            <i className="bi bi-house-door"></i>
            <div className="feature-value">{property.bedrooms} BHK</div>
            <div className="feature-label">Bedrooms</div>
          </div>
          <div className="feature-box">
            <i className="bi bi-droplet"></i>
            <div className="feature-value">{property.bathrooms}</div>
            <div className="feature-label">Bathrooms</div>
          </div>
          <div className="feature-box">
            <i className="bi bi-building"></i>
            <div className="feature-value">
              {property.floorNumber} of {property.totalFloorNumber}
            </div>
            <div className="feature-label">Floor</div>
          </div>
        </div>

        {/* Bottom Section with Additional Info and Button */}
        <div className="bottom-section">
          <div className="additional-info">
            <div className="info-item">
              <i className="bi bi-building-check"></i>
              <span className="info-label">Transaction:</span>
              <span className="info-value">{property.transactionType}</span>
            </div>
            <div className="info-item">
              <i className="bi bi-calendar-check"></i>
              <span className="info-label">Age:</span>
              <span className="info-value">{property.ageofcons}</span>
            </div>
            <div className="info-item">
              <i className="bi bi-house-gear"></i>
              <span className="info-label">Furnishing:</span>
              <span className="info-value">{property.furnished}</span>
            </div>
          </div>
          {/* <button className="view-details-btn">View Details</button> */}
          <a className="view-details-btn" href={property.url} target="_blank">View Details</a>
          <div className="last-updated">
            Last updated: {property.lastUpdatedDate}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
