const assert = require('assert');
const matchingFunctions = require('../../includes/matching_functions');

describe('matching_functions', () => {
  describe('standardize', () => {
    it('should standardize name fields correctly', () => {
      assert.strictEqual(matchingFunctions.standardize('  Mr. John Smith Jr. ', 'name'), 'JOHN SMITH');
      assert.strictEqual(matchingFunctions.standardize('Dr. Jane Doe, PHD', 'name'), 'JANE DOE');
      assert.strictEqual(matchingFunctions.standardize('Ms.  Alice   Wonderland   ', 'name'), 'ALICE WONDERLAND');
    });

    it('should standardize address fields correctly', () => {
      assert.strictEqual(matchingFunctions.standardize('123 Main Street APT 1', 'address'), '123 MAIN ST APT 1');
      assert.strictEqual(matchingFunctions.standardize('456 Oak Avenue, apartment 2', 'address'), '456 OAK AVE APT 2');
      assert.strictEqual(matchingFunctions.standardize('789 Pine Boulevard', 'address'), '789 PINE BLVD');
    });

    it('should standardize phone fields correctly', () => {
      assert.strictEqual(matchingFunctions.standardize('(123) 456-7890', 'phone'), '1234567890');
      assert.strictEqual(matchingFunctions.standardize('123.456.7890 ext 123', 'phone'), '1234567890123');
    });

    it('should standardize email fields correctly', () => {
      assert.strictEqual(matchingFunctions.standardize('  Test@Example.com  ', 'email'), 'test@example.com');
    });

    it('should standardize zip fields correctly', () => {
      assert.strictEqual(matchingFunctions.standardize('12345-6789', 'zip'), '12345');
      assert.strictEqual(matchingFunctions.standardize('abc123def', 'zip'), '123');
    });

    it('should return an empty string for null or undefined input', () => {
      assert.strictEqual(matchingFunctions.standardize(null, 'name'), '');
      assert.strictEqual(matchingFunctions.standardize(undefined, 'address'), '');
    });
  });

  describe('jaroWinkler', () => {
    it('should return 0 for null or undefined inputs', () => {
      assert.strictEqual(matchingFunctions.jaroWinkler(null, 'test'), 0);
      assert.strictEqual(matchingFunctions.jaroWinkler('test', undefined), 0);
      assert.strictEqual(matchingFunctions.jaroWinkler(null, null), 0);
    });

    it('should return 1 for identical strings', () => {
      assert.strictEqual(matchingFunctions.jaroWinkler('test', 'test'), 1);
    });

    it('should return 0.5 for different strings (placeholder)', () => {
      assert.strictEqual(matchingFunctions.jaroWinkler('hello', 'world'), 0.5);
    });
  });

  describe('phoneticCode', () => {
    it('should return an empty string for null or undefined input', () => {
      assert.strictEqual(matchingFunctions.phoneticCode(null), '');
      assert.strictEqual(matchingFunctions.phoneticCode(undefined), '');
    });

    it('should return the first character followed by "000" for a valid input (placeholder)', () => {
      assert.strictEqual(matchingFunctions.phoneticCode('Test'), 'T000');
      assert.strictEqual(matchingFunctions.phoneticCode('Another'), 'A000');
    });
  });

  describe('calculateConfidenceScore', () => {
    it('should calculate the confidence score (placeholder)', () => {
      const sourceRecord = { name: 'John Smith', address: '123 Main St' };
      const targetRecord = { name: 'Jon Smith', address: '123 Main St' };
      const weights = { name: 0.6, address: 0.4 };
      const thresholds = { name: 0.7, address: 0.8 };
      const result = matchingFunctions.calculateConfidenceScore(sourceRecord, targetRecord, weights, thresholds);
      assert.ok(result.score >= 0 && result.score <= 1); // Basic check for now
    });
  });

  describe('generateBlockingKeys', () => {
    it('should generate a zipcode blocking key', () => {
      const record = { ZipCode: '12345' };
      assert.deepStrictEqual(matchingFunctions.generateBlockingKeys(record, 'zipcode'), ['ZIP:12345']);
    });

    it('should generate a name_zip blocking key', () => {
      const record = { LastName: 'Smith', ZipCode: '12345' };
      assert.deepStrictEqual(matchingFunctions.generateBlockingKeys(record, 'name_zip'), ['LZ:SMIT12345']);
    });

    it('should return an empty array if the required fields are missing', () => {
      const record = { FirstName: 'John' };
      assert.deepStrictEqual(matchingFunctions.generateBlockingKeys(record, 'name_zip'), []);
    });
  });
});