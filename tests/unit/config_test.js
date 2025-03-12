const assert = require('assert');
const config = require('../../includes/config');

describe('config', () => {
  describe('CONFIDENCE', () => {
    it('should have correct threshold values', () => {
      assert.deepStrictEqual(config.CONFIDENCE, {
        HIGH: 0.90,
        MEDIUM: 0.75,
        LOW: 0.60,
        MINIMUM: 0.50
      }, 'CONFIDENCE thresholds are incorrect');
    });
  });

  describe('getEnvironmentConfig', () => {
    it('should return development config by default', () => {
      const defaultConfig = config.ENVIRONMENTS.development;
      assert.deepStrictEqual(config.getEnvironmentConfig(), defaultConfig, 'Default environment config is incorrect');
    });

    it('should return staging config when DATAFORM_ENVIRONMENT is set to staging', () => {
      process.env.DATAFORM_ENVIRONMENT = 'staging';
      const stagingConfig = config.ENVIRONMENTS.staging;
      assert.deepStrictEqual(config.getEnvironmentConfig(), stagingConfig, 'Staging environment config is incorrect');
      delete process.env.DATAFORM_ENVIRONMENT; // Clean up
    });
    
    it('should return production config when DATAFORM_ENVIRONMENT is set to production', () => {
        process.env.DATAFORM_ENVIRONMENT = 'production';
        const productionConfig = config.ENVIRONMENTS.production;
        assert.deepStrictEqual(config.getEnvironmentConfig(), productionConfig, 'Production environment config is incorrect');
        delete process.env.DATAFORM_ENVIRONMENT;
    });

    it('should return development config when DATAFORM_ENVIRONMENT is set to an invalid value', () => {
        process.env.DATAFORM_ENVIRONMENT = 'invalid';
        const defaultConfig = config.ENVIRONMENTS.development;
        assert.deepStrictEqual(config.getEnvironmentConfig(), defaultConfig, "Should have returned default config");
        delete process.env.DATAFORM_ENVIRONMENT;
    });
  });
    
  describe('FIELD_WEIGHTS', () => {
      it('should have the correct field weights', () => {
          // Add assertions here to check the structure and values of FIELD_WEIGHTS
          assert.ok(config.FIELD_WEIGHTS.email === 0.95);
          assert.ok(config.FIELD_WEIGHTS.phoneNumber === 0.90);
      });
  });

  describe('BLOCKING', () => {
      it('should have the correct blocking strategies and settings', () => {
          // Add assertions here to check BLOCKING.STRATEGIES and BLOCKING.MAX_BLOCK_SIZE
          assert.ok(Array.isArray(config.BLOCKING.STRATEGIES));
          assert.ok(config.BLOCKING.MAX_BLOCK_SIZE === 1000);
      });
  });

  describe('TARGETS', () => {
      it('should have the correct target metrics', () => {
          // Add assertions for TARGETS.MATCH_RATE, TARGETS.DOB_APPEND_RATE, etc.
          assert.ok(config.TARGETS.MATCH_RATE === 0.80);
      });
  });

  describe('HISTORICAL_DATASETS', () => {
      it('should have the correct historical datasets configuration', () => {
          // Add assertions for the structure and content of HISTORICAL_DATASETS
          assert.ok(Array.isArray(config.HISTORICAL_DATASETS));
          assert.ok(config.HISTORICAL_DATASETS[0].table === "trustfinancial.consumer2022q4_voter_gold");
      });
  });
    
  describe('ENVIRONMENTS', () => {
      it('should have configurations for development, staging, and production', () => {
          assert.ok(config.ENVIRONMENTS.development);
          assert.ok(config.ENVIRONMENTS.staging);
          assert.ok(config.ENVIRONMENTS.production);
      });
  });
});