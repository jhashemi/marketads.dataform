const assert = require('assert');
const docs = require('../../includes/docs');

describe('docs', () => {
  describe('columns', () => {
    it('should be an object', () => {
      assert.strictEqual(typeof docs.columns, 'object', 'columns should be an object');
    });

    it('should contain descriptions for specific columns', () => {
      const expectedColumns = ['AddressID', 'IndividualId', 'personfirstname', 'ZipCode'];
      for (const col of expectedColumns) {
        assert.ok(docs.columns.hasOwnProperty(col), `columns should have property '${col}'`);
        assert.strictEqual(typeof docs.columns[col], 'string', `columns.${col} should be a string`);
      }
    });
  });
});