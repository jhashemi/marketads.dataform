/**
 * Geospatial Matcher
 * 
 * This module provides functions for geographic distance calculations and matching 
 * based on coordinates. It also generates SQL for geospatial operations in BigQuery.
 */

/**
 * Earth radius in kilometers
 * @type {number}
 */
const EARTH_RADIUS_KM = 6371;

/**
 * Converts degrees to radians
 * @param {number} degrees - Value in degrees
 * @returns {number} Value in radians
 */
function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Calculates the great-circle distance between two points using the Haversine formula
 * @param {Object} point1 - First coordinate point
 * @param {number|string} point1.lat - Latitude of first point
 * @param {number|string} point1.lng - Longitude of first point
 * @param {Object} point2 - Second coordinate point
 * @param {number|string} point2.lat - Latitude of second point
 * @param {number|string} point2.lng - Longitude of second point
 * @returns {number} Distance in kilometers
 */
function calculateDistance(point1, point2) {
  if (!point1 || !point2) {
    throw new Error('Invalid coordinates: Points must be non-null objects');
  }
  
  // Parse coordinates to ensure they're numbers
  try {
    const lat1 = parseFloat(point1.lat);
    const lng1 = parseFloat(point1.lng);
    const lat2 = parseFloat(point2.lat);
    const lng2 = parseFloat(point2.lng);
    
    if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
      throw new Error('Invalid coordinates: Cannot parse latitude or longitude');
    }
    
    // Convert latitude and longitude from degrees to radians
    const radLat1 = degreesToRadians(lat1);
    const radLng1 = degreesToRadians(lng1);
    const radLat2 = degreesToRadians(lat2);
    const radLng2 = degreesToRadians(lng2);
    
    // Calculate differences between coordinates
    const dLat = radLat2 - radLat1;
    const dLng = radLng2 - radLng1;
    
    // Haversine formula
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(radLat1) * Math.cos(radLat2) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    // Distance in kilometers
    return EARTH_RADIUS_KM * c;
  } catch (error) {
    throw new Error(`Invalid coordinates: ${error.message}`);
  }
}

/**
 * Determines if a point is within a specified radius of a center point
 * @param {Object} point - The point to check
 * @param {number|string} point.lat - Latitude of point
 * @param {number|string} point.lng - Longitude of point
 * @param {Object} center - Center point to check against
 * @param {number|string} center.lat - Latitude of center
 * @param {number|string} center.lng - Longitude of center 
 * @param {number} radiusKm - Radius in kilometers
 * @returns {boolean} True if point is within the radius
 */
function isWithinRadius(point, center, radiusKm) {
  try {
    const distance = calculateDistance(point, center);
    return distance <= radiusKm;
  } catch (error) {
    return false;
  }
}

/**
 * Creates SQL expression for a geographic point in BigQuery
 * @param {string|number} latitude - Latitude value
 * @param {string|number} longitude - Longitude value
 * @returns {string} SQL expression for a geographic point
 */
function createPointSql(latitude, longitude) {
  return `ST_GEOGPOINT(${longitude}, ${latitude})`;
}

/**
 * Generates SQL for calculating distance between two points
 * @param {string} lat1Field - Field name for first point's latitude
 * @param {string} lng1Field - Field name for first point's longitude
 * @param {string} lat2Field - Field name for second point's latitude
 * @param {string} lng2Field - Field name for second point's longitude
 * @returns {string} SQL expression for distance calculation in meters
 */
function calculateDistanceSql(lat1Field, lng1Field, lat2Field, lng2Field) {
  return `ST_DISTANCE(
    ST_GEOGPOINT(${lng1Field}, ${lat1Field}),
    ST_GEOGPOINT(${lng2Field}, ${lat2Field})
  )`;
}

/**
 * Generates SQL for checking if two points are within a specified radius
 * @param {string} lat1Field - Field name for first point's latitude
 * @param {string} lng1Field - Field name for first point's longitude
 * @param {string} lat2Field - Field name for second point's latitude
 * @param {string} lng2Field - Field name for second point's longitude
 * @param {number} radiusMeters - Radius in meters
 * @returns {string} SQL expression that evaluates to boolean
 */
function isWithinRadiusSql(lat1Field, lng1Field, lat2Field, lng2Field, radiusMeters) {
  return `ST_DWITHIN(
    ST_GEOGPOINT(${lng1Field}, ${lat1Field}),
    ST_GEOGPOINT(${lng2Field}, ${lat2Field}),
    ${radiusMeters}
  )`;
}

/**
 * Generates normalized distance score based on actual distance and maximum distance
 * @param {string} distanceExpr - SQL expression representing distance
 * @param {number} maxDistance - Maximum distance in meters
 * @param {string} scoreFunction - Type of scoring function ('linear', 'exponential', 'logarithmic')
 * @returns {string} SQL expression for normalized score
 */
function generateDistanceScoreSql(distanceExpr, maxDistance, scoreFunction = 'linear') {
  switch (scoreFunction.toLowerCase()) {
    case 'exponential':
      // Exponential decay, closer points score much higher
      return `
        CASE
          WHEN ${distanceExpr} IS NULL THEN 0
          WHEN ${distanceExpr} > ${maxDistance} THEN 0
          ELSE EXP(-5 * (${distanceExpr} / ${maxDistance}))
        END`;
        
    case 'logarithmic':
      // Logarithmic scale, more gradual decay
      return `
        CASE
          WHEN ${distanceExpr} IS NULL THEN 0
          WHEN ${distanceExpr} > ${maxDistance} THEN 0
          ELSE 1 - (LN(1 + ${distanceExpr}) / LN(1 + ${maxDistance}))
        END`;
      
    case 'linear':
    default:
      // Linear scaling, simple 1 - (distance/maxDistance)
      return `
        CASE
          WHEN ${distanceExpr} IS NULL THEN 0
          WHEN ${distanceExpr} > ${maxDistance} THEN 0
          ELSE 1 - (${distanceExpr} / ${maxDistance})
        END`;
  }
}

/**
 * Generates comprehensive SQL for geospatial matching
 * @param {Object} options - Configuration options
 * @param {string} options.sourceLatField - Source latitude field
 * @param {string} options.sourceLngField - Source longitude field
 * @param {string} options.targetLatField - Target latitude field
 * @param {string} options.targetLngField - Target longitude field
 * @param {number} [options.maxDistance=5000] - Maximum distance in meters
 * @param {string} [options.scoreFunction='linear'] - Score function type
 * @param {boolean} [options.includeDistance=true] - Whether to include distance in output
 * @returns {string} SQL expression for geospatial matching
 */
function generateGeospatialSql(options) {
  const {
    sourceLatField,
    sourceLngField,
    targetLatField, 
    targetLngField,
    maxDistance = 5000,
    scoreFunction = 'linear',
    includeDistance = true
  } = options;
  
  // Calculate distance expression
  const distanceExpr = calculateDistanceSql(
    sourceLatField, sourceLngField, 
    targetLatField, targetLngField
  );
  
  // Distance filtering (optimization)
  const withinRadiusExpr = isWithinRadiusSql(
    sourceLatField, sourceLngField, 
    targetLatField, targetLngField,
    maxDistance
  );
  
  // Generate score expression
  const scoreExpr = generateDistanceScoreSql(
    distanceExpr,
    maxDistance,
    scoreFunction
  );
  
  // Combine into a complete SQL expression
  return `
    -- Filter by distance first for optimization
    CASE WHEN ${withinRadiusExpr}
    THEN
      -- Calculate similarity score
      ${scoreExpr}
    ELSE 0
    END AS geospatial_score
    ${includeDistance ? `, ${distanceExpr} AS distance_meters` : ''}
  `;
}

/**
 * Creates a SQL function for calculating geospatial similarity
 * @param {string} functionName - Name for the SQL function
 * @returns {string} SQL CREATE FUNCTION statement
 */
function createGeoSpatialSqlFunction(functionName) {
  return `
    CREATE OR REPLACE FUNCTION \`\${self()}.${functionName}\`(
      lat1 FLOAT64, 
      lng1 FLOAT64, 
      lat2 FLOAT64, 
      lng2 FLOAT64, 
      max_distance_meters FLOAT64
    )
    RETURNS STRUCT<score FLOAT64, distance_meters FLOAT64>
    AS (
      (
        WITH distance_calc AS (
          SELECT ST_DISTANCE(
            ST_GEOGPOINT(lng1, lat1),
            ST_GEOGPOINT(lng2, lat2)
          ) AS distance_meters
        )
        SELECT STRUCT(
          CASE
            WHEN distance_calc.distance_meters > max_distance_meters THEN 0
            ELSE 1 - (distance_calc.distance_meters / max_distance_meters)
          END AS score,
          distance_calc.distance_meters AS distance_meters
        )
        FROM distance_calc
      )
    );
  `;
}

/**
 * Creates a matcher for geospatial operations
 * @param {Object} [config={}] - Configuration options
 * @param {number} [config.defaultMaxDistance=5000] - Default maximum distance in meters
 * @param {string} [config.scoreFunction='linear'] - Default score function type
 * @returns {Object} Matcher object with geospatial functions
 */
function getGeospatialMatcher(config = {}) {
  const {
    defaultMaxDistance = 5000,
    scoreFunction = 'linear'
  } = config;
  
  return {
    /**
     * Calculates the distance between two points
     * @param {Object} point1 - First coordinate point
     * @param {Object} point2 - Second coordinate point
     * @returns {number} Distance in kilometers
     */
    calculateDistance,
    
    /**
     * Checks if a point is within a radius of another point
     * @param {Object} point - Point to check
     * @param {Object} center - Center point
     * @param {number} radiusKm - Radius in kilometers
     * @returns {boolean} Whether point is within radius
     */
    isWithinRadius,
    
    /**
     * Generates SQL for geospatial matching
     * @param {Object} options - Configuration options 
     * @returns {string} SQL for geospatial matching
     */
    generateSql(options = {}) {
      return generateGeospatialSql({
        maxDistance: defaultMaxDistance,
        scoreFunction,
        ...options
      });
    },
    
    /**
     * Creates SQL function for geospatial similarity
     * @param {string} functionName - Name for the SQL function
     * @returns {string} SQL CREATE FUNCTION statement
     */
    createSqlFunction(functionName) {
      return createGeoSpatialSqlFunction(functionName);
    },
    
    /**
     * Calculate the similarity between two geographic points
     * @param {Object} point1 - First coordinate point
     * @param {Object} point2 - Second coordinate point
     * @param {Object} [options={}] - Calculation options
     * @param {number} [options.maxDistance=5000] - Maximum distance in meters
     * @param {string} [options.scoreFunction='linear'] - Score function type
     * @returns {Object} Result with similarity score and distance
     */
    calculateSimilarity(point1, point2, options = {}) {
      const maxDistanceKm = (options.maxDistance || defaultMaxDistance) / 1000;
      const distanceKm = calculateDistance(point1, point2);
      
      let score = 0;
      if (distanceKm <= maxDistanceKm) {
        // Apply the specified scoring function
        switch ((options.scoreFunction || scoreFunction).toLowerCase()) {
          case 'exponential':
            score = Math.exp(-5 * (distanceKm / maxDistanceKm));
            break;
          case 'logarithmic':
            score = 1 - (Math.log(1 + distanceKm) / Math.log(1 + maxDistanceKm));
            break;
          case 'linear':
          default:
            score = 1 - (distanceKm / maxDistanceKm);
            break;
        }
      }
      
      return {
        score: Math.max(0, Math.min(1, score)), // Clamp to 0-1 range
        distance: distanceKm,
        distanceMeters: distanceKm * 1000,
        isWithinMaxDistance: distanceKm <= maxDistanceKm
      };
    },
    
    /**
     * Compares two addresses using their coordinates
     * @param {Object} address1 - First address with coordinates
     * @param {Object} address2 - Second address with coordinates
     * @param {Object} [options={}] - Comparison options
     * @param {number} [options.threshold=0.6] - Similarity threshold for match
     * @returns {Object} Comparison result with score and details
     */
    compareAddresses(address1, address2, options = {}) {
      const { threshold = 0.6 } = options;
      
      // Extract coordinates from addresses
      const point1 = {
        lat: address1.latitude || address1.lat,
        lng: address1.longitude || address1.lng
      };
      
      const point2 = {
        lat: address2.latitude || address2.lat,
        lng: address2.longitude || address2.lng
      };
      
      // Check that both addresses have coordinates
      if (!point1.lat || !point1.lng || !point2.lat || !point2.lng) {
        return {
          similarity: 0,
          isMatch: false,
          error: 'Missing coordinates in one or both addresses'
        };
      }
      
      // Calculate similarity
      const result = this.calculateSimilarity(point1, point2, options);
      
      return {
        similarity: result.score,
        isMatch: result.score >= threshold,
        distanceKm: result.distance,
        distanceMeters: result.distanceMeters,
        threshold
      };
    }
  };
}

// Exports
module.exports = {
  calculateDistance,
  isWithinRadius,
  createPointSql,
  calculateDistanceSql,
  isWithinRadiusSql,
  generateDistanceScoreSql,
  generateGeospatialSql,
  createGeoSpatialSqlFunction,
  getGeospatialMatcher
};