/**
 * Unit tests for the Geospatial Matcher
 */
const assert = require('assert');
const { 
  calculateDistance,
  isWithinRadius, 
  createPointSql,
  calculateDistanceSql,
  isWithinRadiusSql,
  generateGeospatialSql,
  getGeospatialMatcher
} = require('../../includes/matching/geospatial_matcher');

// Define test cases as an array for Jest compatibility
const tests = [
  {
    id: 'calculate_distance_test',
    name: 'Calculate distance between two points',
    type: 'unit',
    tags: ['geospatial', 'core'],
    priority: 1,
    testFn: async () => {
      // Test points (NYC and LA)
      const nyc = { lat: 40.7128, lng: -74.0060 };
      const la = { lat: 34.0522, lng: -118.2437 };
      
      // Calculate distance
      const distance = calculateDistance(nyc, la);
      
      // Expected distance ~3,936 km or ~2,445 miles
      // Allow for some rounding error
      assert(distance > 3900 && distance < 4000, `Distance should be ~3,936 km but was ${distance}`);
      
      // Test with string coordinates
      const distanceStr = calculateDistance(
        { lat: '40.7128', lng: '-74.0060' },
        { lat: '34.0522', lng: '-118.2437' }
      );
      
      // Should handle string conversion
      assert(Math.abs(distance - distanceStr) < 0.1, 'String coordinates should work');
      
      // Test with null or invalid coordinates
      assert.throws(() => calculateDistance(null, la), /Invalid coordinates/);
      assert.throws(() => calculateDistance(nyc, { lat: 'invalid', lng: -118.2437 }), /Invalid coordinates/);
      
      return true;
    }
  },
  {
    id: 'is_within_radius_test',
    name: 'Check if a point is within radius',
    type: 'unit',
    tags: ['geospatial', 'core'],
    priority: 1,
    testFn: async () => {
      // Test points
      const center = { lat: 40.7128, lng: -74.0060 }; // NYC
      const nearbyPoint = { lat: 40.7300, lng: -74.0200 }; // ~2km from NYC
      const farPoint = { lat: 34.0522, lng: -118.2437 }; // LA
      
      // Test within small radius
      assert.strictEqual(
        isWithinRadius(nearbyPoint, center, 5), 
        true, 
        'Nearby point should be within 5km radius'
      );
      
      // Test outside small radius
      assert.strictEqual(
        isWithinRadius(farPoint, center, 5), 
        false, 
        'Far point should not be within 5km radius'
      );
      
      // Test with large radius
      assert.strictEqual(
        isWithinRadius(farPoint, center, 4000), 
        true, 
        'Far point should be within 4000km radius'
      );
      
      // Test with edge case
      assert.strictEqual(
        isWithinRadius(nearbyPoint, center, 0), 
        false, 
        'No point should be within 0km radius'
      );
      
      return true;
    }
  },
  {
    id: 'sql_generation_test',
    name: 'Generate SQL for geospatial operations',
    type: 'unit',
    tags: ['geospatial', 'sql'],
    priority: 1,
    testFn: async () => {
      // Test point SQL generation
      const pointSql = createPointSql('40.7128', '-74.0060');
      assert(pointSql.includes('ST_GEOGPOINT'), 'Should use ST_GEOGPOINT');
      assert(pointSql.includes('40.7128'), 'Should include latitude');
      assert(pointSql.includes('-74.0060'), 'Should include longitude');
      
      // Test distance calculation SQL
      const distanceSql = calculateDistanceSql(
        'table1.latitude', 'table1.longitude',
        'table2.latitude', 'table2.longitude'
      );
      assert(distanceSql.includes('ST_DISTANCE'), 'Should use ST_DISTANCE');
      assert(distanceSql.includes('table1.latitude'), 'Should reference table1 latitude');
      assert(distanceSql.includes('table2.longitude'), 'Should reference table2 longitude');
      
      // Test within radius SQL
      const radiusSql = isWithinRadiusSql(
        'table1.latitude', 'table1.longitude',
        'table2.latitude', 'table2.longitude',
        5000 // 5km radius
      );
      assert(radiusSql.includes('ST_DWITHIN'), 'Should use ST_DWITHIN');
      assert(radiusSql.includes('5000'), 'Should include radius value');
      
      // Test comprehensive geospatial matching SQL
      const matchSql = generateGeospatialSql({
        sourceLatField: 'source.latitude',
        sourceLngField: 'source.longitude',
        targetLatField: 'target.latitude', 
        targetLngField: 'target.longitude',
        maxDistance: 10000
      });
      
      assert(matchSql.includes('ST_DWITHIN'), 'Should use ST_DWITHIN for filtering');
      assert(matchSql.includes('ST_DISTANCE'), 'Should use ST_DISTANCE for scoring');
      assert(matchSql.includes('10000'), 'Should include max distance value');
      
      return true;
    }
  },
  {
    id: 'geospatial_matcher_test',
    name: 'Use the geospatial matcher API',
    type: 'unit',
    tags: ['geospatial', 'api'],
    priority: 1,
    testFn: async () => {
      // Create a matcher with default config
      const matcher = getGeospatialMatcher();
      
      // Test distance calculation with the matcher
      const distance = matcher.calculateDistance(
        { lat: 40.7128, lng: -74.0060 },
        { lat: 34.0522, lng: -118.2437 }
      );
      
      // Expected distance ~3,936 km
      assert(distance > 3900 && distance < 4000, `Distance should be ~3,936 km but was ${distance}`);
      
      // Test if points are within radius
      const isNearby = matcher.isWithinRadius(
        { lat: 40.7300, lng: -74.0200 },
        { lat: 40.7128, lng: -74.0060 },
        5
      );
      assert.strictEqual(isNearby, true, 'Should identify nearby points');
      
      // Test SQL generation
      const sql = matcher.generateSql({
        sourceLatField: 'source.latitude',
        sourceLngField: 'source.longitude',
        targetLatField: 'target.latitude', 
        targetLngField: 'target.longitude',
        maxDistance: 5000
      });
      
      assert(sql.includes('ST_DWITHIN'), 'Should generate SQL with ST_DWITHIN');
      assert(sql.includes('5000'), 'Should include configured max distance');
      
      // Test with matcher using custom config
      const customMatcher = getGeospatialMatcher({
        defaultMaxDistance: 1000,
        scoreFunction: 'exponential'
      });
      
      const customSql = customMatcher.generateSql({
        sourceLatField: 'source.latitude',
        sourceLngField: 'source.longitude',
        targetLatField: 'target.latitude', 
        targetLngField: 'target.longitude'
      });
      
      assert(customSql.includes('1000'), 'Should use custom default max distance');
      assert(customSql.includes('EXP'), 'Should use exponential score function');
      
      return true;
    }
  }
];

// Jest-style tests for the same functionality
describe('Geospatial Matcher', () => {
  describe('Distance calculation', () => {
    test('calculates distance between two points correctly', () => {
      // Test points (NYC and LA)
      const nyc = { lat: 40.7128, lng: -74.0060 };
      const la = { lat: 34.0522, lng: -118.2437 };
      
      // Calculate distance
      const distance = calculateDistance(nyc, la);
      
      // Expected distance ~3,936 km or ~2,445 miles
      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4000);
    });
    
    test('handles string coordinates', () => {
      const distance1 = calculateDistance(
        { lat: 40.7128, lng: -74.0060 },
        { lat: 34.0522, lng: -118.2437 }
      );
      
      const distance2 = calculateDistance(
        { lat: '40.7128', lng: '-74.0060' },
        { lat: '34.0522', lng: '-118.2437' }
      );
      
      expect(Math.abs(distance1 - distance2)).toBeLessThan(0.1);
    });
    
    test('throws error for invalid coordinates', () => {
      const nyc = { lat: 40.7128, lng: -74.0060 };
      const invalid = { lat: 'invalid', lng: -118.2437 };
      
      expect(() => calculateDistance(null, nyc)).toThrow();
      expect(() => calculateDistance(nyc, invalid)).toThrow();
    });
  });
  
  describe('Radius checks', () => {
    test('correctly identifies points within radius', () => {
      // Test points
      const center = { lat: 40.7128, lng: -74.0060 }; // NYC
      const nearbyPoint = { lat: 40.7300, lng: -74.0200 }; // ~2km from NYC
      const farPoint = { lat: 34.0522, lng: -118.2437 }; // LA
      
      expect(isWithinRadius(nearbyPoint, center, 5)).toBe(true);
      expect(isWithinRadius(farPoint, center, 5)).toBe(false);
      expect(isWithinRadius(farPoint, center, 4000)).toBe(true);
    });
  });
  
  describe('SQL generation', () => {
    test('generates point SQL correctly', () => {
      const pointSql = createPointSql('40.7128', '-74.0060');
      expect(pointSql).toContain('ST_GEOGPOINT');
      expect(pointSql).toContain('40.7128');
      expect(pointSql).toContain('-74.0060');
    });
    
    test('generates distance calculation SQL', () => {
      const distanceSql = calculateDistanceSql(
        'table1.latitude', 'table1.longitude',
        'table2.latitude', 'table2.longitude'
      );
      expect(distanceSql).toContain('ST_DISTANCE');
    });
    
    test('generates within radius SQL', () => {
      const radiusSql = isWithinRadiusSql(
        'table1.latitude', 'table1.longitude',
        'table2.latitude', 'table2.longitude',
        5000
      );
      expect(radiusSql).toContain('ST_DWITHIN');
      expect(radiusSql).toContain('5000');
    });
  });
});

// For manual testing
if (require.main === module) {
  const testRunner = tests => {
    tests.forEach(test => {
      console.log(`Running test: ${test.name}`);
      try {
        const result = test.testFn();
        console.log(`Test ${test.id}: ${result ? 'PASSED' : 'FAILED'}`);
      } catch (error) {
        console.error(`Test ${test.id} failed:`, error);
      }
    });
  };
  
  testRunner(tests);
}

module.exports = { tests };