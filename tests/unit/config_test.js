/**
 * Tests for the configuration module
 */

// Ensure Jest functions are available to the validation registry
require('../../includes/validation/jest_adapter');

// Continue with the original test
const { getEnvironmentConfig, 
        CONFIDENCE, 
        FIELD_WEIGHTS, 
        BLOCKING,
        TARGETS,
        HISTORICAL_DATASETS,
        ENVIRONMENTS } = require('../../includes/config');

describe('config', () => {
  describe('CONFIDENCE', () => {
    test('should have correct threshold values', () => {
      expect(CONFIDENCE.HIGH_THRESHOLD).toBeGreaterThan(CONFIDENCE.MEDIUM_THRESHOLD);
      expect(CONFIDENCE.MEDIUM_THRESHOLD).toBeGreaterThan(CONFIDENCE.LOW_THRESHOLD);
      expect(CONFIDENCE.LOW_THRESHOLD).toBeGreaterThan(0);
    });
  });

  describe('getEnvironmentConfig', () => {
    const originalEnv = process.env.DATAFORM_ENVIRONMENT;

    afterEach(() => {
      process.env.DATAFORM_ENVIRONMENT = originalEnv;
    });

    test('should return development config by default', () => {
      process.env.DATAFORM_ENVIRONMENT = undefined;
      const config = getEnvironmentConfig();
      expect(config.name).toBe('development');
    });

    test('should return staging config when DATAFORM_ENVIRONMENT is set to staging', () => {
      process.env.DATAFORM_ENVIRONMENT = 'staging';
      const config = getEnvironmentConfig();
      expect(config.name).toBe('staging');
    });

    test('should return production config when DATAFORM_ENVIRONMENT is set to production', () => {
      process.env.DATAFORM_ENVIRONMENT = 'production';
      const config = getEnvironmentConfig();
      expect(config.name).toBe('production');
    });

    test('should return development config when DATAFORM_ENVIRONMENT is set to an invalid value', () => {
      process.env.DATAFORM_ENVIRONMENT = 'invalid_environment';
      const config = getEnvironmentConfig();
      expect(config.name).toBe('development');
    });
  });

  describe('FIELD_WEIGHTS', () => {
    test('should have the correct field weights', () => {
      expect(FIELD_WEIGHTS).toHaveProperty('name');
      expect(FIELD_WEIGHTS).toHaveProperty('address');
      expect(FIELD_WEIGHTS).toHaveProperty('email');
      expect(FIELD_WEIGHTS).toHaveProperty('phone');
      
      // Check that weights are numbers between 0 and 1
      Object.values(FIELD_WEIGHTS).forEach(weight => {
        expect(typeof weight).toBe('number');
        expect(weight).toBeGreaterThan(0);
        expect(weight).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('BLOCKING', () => {
    test('should have the correct blocking strategies and settings', () => {
      expect(BLOCKING).toHaveProperty('strategies');
      expect(BLOCKING).toHaveProperty('maxCandidates');
      expect(BLOCKING.strategies).toBeInstanceOf(Array);
      expect(BLOCKING.maxCandidates).toBeGreaterThan(0);
    });
  });

  describe('TARGETS', () => {
    test('should have the correct target metrics', () => {
      expect(TARGETS).toHaveProperty('precision');
      expect(TARGETS).toHaveProperty('recall');
      expect(TARGETS.precision).toBeGreaterThan(0);
      expect(TARGETS.precision).toBeLessThanOrEqual(1);
      expect(TARGETS.recall).toBeGreaterThan(0);
      expect(TARGETS.recall).toBeLessThanOrEqual(1);
    });
  });

  describe('HISTORICAL_DATASETS', () => {
    test('should have the correct historical datasets configuration', () => {
      expect(HISTORICAL_DATASETS).toBeInstanceOf(Array);
      HISTORICAL_DATASETS.forEach(dataset => {
        expect(dataset).toHaveProperty('name');
        expect(dataset).toHaveProperty('location');
      });
    });
  });

  describe('ENVIRONMENTS', () => {
    test('should have configurations for development, staging, and production', () => {
      expect(ENVIRONMENTS).toHaveProperty('development');
      expect(ENVIRONMENTS).toHaveProperty('staging');
      expect(ENVIRONMENTS).toHaveProperty('production');
      
      ['development', 'staging', 'production'].forEach(env => {
        expect(ENVIRONMENTS[env]).toHaveProperty('name');
        expect(ENVIRONMENTS[env]).toHaveProperty('dataset');
        expect(ENVIRONMENTS[env]).toHaveProperty('location');
      });
    });
  });
});