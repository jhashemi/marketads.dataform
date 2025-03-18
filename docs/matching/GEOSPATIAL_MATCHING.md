# Geospatial Matching

This document explains how to use the geospatial matching capabilities within the MarketAds Dataform project.

## Overview

The geospatial matcher provides functionality for comparing geographic locations based on their coordinates. It calculates distances between points, determines if locations are within specific radiuses, and generates appropriate SQL for BigQuery.

## Use Cases

- **Nearby Location Detection**: Find locations within a specific radius
- **Address Validation**: Compare addresses based on geographic proximity
- **Distance-Based Scoring**: Score matches based on geographic distance
- **Area Targeting**: Target users or content based on geographic areas
- **Store Locator**: Find the nearest locations from a reference point

## Getting Started

### Basic Usage

```javascript
const { getGeospatialMatcher } = require('../../includes/matching/geospatial_matcher');

// Create a matcher with default settings (5km max distance)
const matcher = getGeospatialMatcher();

// Calculate distance between two points
const distanceKm = matcher.calculateDistance(
  { lat: 40.7128, lng: -74.0060 }, // NYC
  { lat: 34.0522, lng: -118.2437 } // LA
);
console.log(`Distance: ${distanceKm.toFixed(2)} km`);

// Check if two points are within a radius
const isNearby = matcher.isWithinRadius(
  { lat: 40.7300, lng: -74.0200 }, // Nearby location
  { lat: 40.7128, lng: -74.0060 }, // Center point
  5 // 5km radius
);
console.log(`Locations are nearby: ${isNearby}`);

// Calculate similarity between points
const similarity = matcher.calculateSimilarity(
  { lat: 40.7300, lng: -74.0200 }, // Point 1
  { lat: 40.7128, lng: -74.0060 }  // Point 2
);
console.log(`Similarity score: ${similarity.score.toFixed(2)}`);
```

### Custom Configuration

```javascript
// Create a matcher with custom configuration
const customMatcher = getGeospatialMatcher({
  defaultMaxDistance: 10000, // 10km max distance (in meters)
  scoreFunction: 'exponential' // Use exponential scoring function
});

// Compare addresses with coordinates
const match = customMatcher.compareAddresses(
  { 
    street: '123 Main St', 
    city: 'New York', 
    latitude: 40.7128, 
    longitude: -74.0060 
  },
  { 
    street: '456 Broadway', 
    city: 'New York', 
    latitude: 40.7300, 
    longitude: -74.0200 
  },
  {
    threshold: 0.7, // Custom match threshold
    maxDistance: 5000 // 5km max distance (overrides default)
  }
);

console.log(`Addresses match: ${match.isMatch}`);
console.log(`Distance: ${match.distanceKm.toFixed(2)} km`);
```

## SQL Generation

The geospatial matcher can generate SQL for BigQuery to perform geospatial operations:

### Basic SQL Generation

```javascript
const { generateGeospatialSql } = require('../../includes/matching/geospatial_matcher');

// Generate SQL for comparing geographic points
const sql = generateGeospatialSql({
  sourceLatField: 'customers.latitude',
  sourceLngField: 'customers.longitude',
  targetLatField: 'stores.latitude',
  targetLngField: 'stores.longitude',
  maxDistance: 10000, // 10km max distance (in meters)
  scoreFunction: 'linear', // Linear scoring function
  includeDistance: true // Include distance in results
});

// Use the SQL in a query
const query = `
SELECT
  customers.id AS customer_id,
  stores.id AS store_id,
  ${sql}
FROM
  customers
CROSS JOIN
  stores
WHERE
  -- Only include pairs within the specified radius
  ST_DWITHIN(
    ST_GEOGPOINT(customers.longitude, customers.latitude),
    ST_GEOGPOINT(stores.longitude, stores.latitude),
    10000
  )
ORDER BY
  geospatial_score DESC
LIMIT 100
`;
```

### Creating SQL Functions

```javascript
const { createGeoSpatialSqlFunction } = require('../../includes/matching/geospatial_matcher');

// Generate SQL to create a geospatial function
const createFunctionSql = createGeoSpatialSqlFunction('CALCULATE_GEO_SIMILARITY');

// Use the function in a query
const query = `
SELECT
  customer_id,
  store_id,
  geo_result.score AS geo_score,
  geo_result.distance_meters / 1000 AS distance_km
FROM
  customers,
  stores,
  UNNEST([${functionName}(
    customers.latitude, 
    customers.longitude,
    stores.latitude,
    stores.longitude,
    10000
  )]) AS geo_result
WHERE
  geo_result.score > 0.5
ORDER BY
  geo_result.score DESC
`;
```

## Scoring Functions

The geospatial matcher supports different scoring functions:

1. **Linear** (default): Score decreases linearly with distance
   - Formula: `1 - (distance / maxDistance)`
   - Even distribution of scores based on distance

2. **Exponential**: Score decreases exponentially with distance
   - Formula: `exp(-5 * (distance / maxDistance))`
   - Heavily favors closer points

3. **Logarithmic**: Score decreases logarithmically with distance
   - Formula: `1 - (ln(1 + distance) / ln(1 + maxDistance))`
   - More gradual decrease for nearby points

Example of selecting a scoring function:

```javascript
const matcher = getGeospatialMatcher({
  scoreFunction: 'exponential' // 'linear', 'exponential', or 'logarithmic'
});
```

## Performance Considerations

### JavaScript Implementation

- The Haversine formula is used for distance calculations (great-circle distance)
- Calculations are performed using radians for greater accuracy
- String coordinates are automatically parsed to numbers
- Error handling is included for invalid coordinates

### BigQuery Optimization

For optimal performance in BigQuery:

1. **Use ST_DWITHIN for filtering**: Always filter with ST_DWITHIN before calculating scores
   ```sql
   WHERE ST_DWITHIN(point1, point2, max_distance)
   ```

2. **Create spatial indices**: Consider creating spatial indices for large datasets
   ```sql
   CREATE SEARCH INDEX spatial_idx ON locations(ST_GEOGPOINT(longitude, latitude));
   ```

3. **Partition by geographic regions**: For very large datasets, partition by region
   ```sql
   PARTITION BY RANGE_BUCKET(region_id, GENERATE_ARRAY(1, 10, 1))
   ```

4. **Materialize frequently accessed geospatial data**: Precalculate and store points
   ```sql
   CREATE OR REPLACE TABLE locations_geo AS
   SELECT *, ST_GEOGPOINT(longitude, latitude) AS geo_point
   FROM locations;
   ```

## API Reference

### Functions

| Function | Description |
|----------|-------------|
| `calculateDistance(point1, point2)` | Calculates distance in kilometers between two points |
| `isWithinRadius(point, center, radiusKm)` | Checks if a point is within a specified radius |
| `createPointSql(latitude, longitude)` | Creates SQL for a geographic point |
| `calculateDistanceSql(lat1, lng1, lat2, lng2)` | Generates SQL for distance calculation |
| `isWithinRadiusSql(lat1, lng1, lat2, lng2, radius)` | Generates SQL for radius check |
| `generateGeospatialSql(options)` | Generates comprehensive SQL for geospatial matching |
| `createGeoSpatialSqlFunction(functionName)` | Creates a SQL function for geospatial similarity |
| `getGeospatialMatcher(config)` | Creates a geospatial matcher with configuration |

### Matcher Methods

| Method | Description |
|--------|-------------|
| `calculateDistance(point1, point2)` | Calculates distance between two points |
| `isWithinRadius(point, center, radiusKm)` | Checks if a point is within a radius |
| `calculateSimilarity(point1, point2, options)` | Calculates similarity between two points |
| `compareAddresses(address1, address2, options)` | Compares two addresses using their coordinates |
| `generateSql(options)` | Generates SQL for geospatial matching |
| `createSqlFunction(functionName)` | Creates a SQL function for geospatial similarity |

## BigQuery Implementation Details

The geospatial matcher uses the following BigQuery geospatial functions:

- **ST_GEOGPOINT**: Creates a geographic point from longitude and latitude
  ```sql
  ST_GEOGPOINT(longitude, latitude)
  ```

- **ST_DISTANCE**: Calculates the distance between two points in meters
  ```sql
  ST_DISTANCE(ST_GEOGPOINT(lng1, lat1), ST_GEOGPOINT(lng2, lat2))
  ```

- **ST_DWITHIN**: Checks if two geographic points are within a specified distance
  ```sql
  ST_DWITHIN(ST_GEOGPOINT(lng1, lat1), ST_GEOGPOINT(lng2, lat2), distance_meters)
  ```

## Integration with Matching Engine

The geospatial matcher can be integrated with the matching engine:

```javascript
const { createMatchingSystem } = require('../../includes/matching');

// Create a matching system
const matchingSystem = createMatchingSystem({
  // Add geospatial configuration in the matching config
  matching: {
    geospatial: {
      enabled: true,
      maxDistance: 5000,
      scoreFunction: 'linear',
      fieldMappings: {
        latitude: ['lat', 'latitude'],
        longitude: ['lng', 'longitude']
      }
    }
  }
});

// The matching system will automatically use geospatial matching
// when it detects latitude and longitude fields in the records
```

## References

- [Haversine Formula - Wikipedia](https://en.wikipedia.org/wiki/Haversine_formula)
- [BigQuery Geography Functions](https://cloud.google.com/bigquery/docs/reference/standard-sql/geography_functions)
- [Great-circle Distance - Wikipedia](https://en.wikipedia.org/wiki/Great-circle_distance)