# Iteration 3

## New Scraped Data

- The primary purpose of this iteration was to scrape new data from MagicBricks website.
- I scraped data on 7th April 2025. The scraping process took around 3 days.

## Handling Missing Values

In this iteration, I haven't imputed the missing values of the selected features:
1. Carpet Area
2. Bedrooms
3. Bathrooms
4. Floor Number
5. Total Floor Number
6. Age of Construction
7. Furnishing Status
8. Transaction Type

I directly dropped the rows with missing values in the selected features.

## Localities lexical merging

- In this iteration, I have NOT merged the localities lexically.
- I kept the locality names as they are.
- I only kept localities with more than 10 properties.
