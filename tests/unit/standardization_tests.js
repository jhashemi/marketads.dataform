const standardization = require('../../includes/sql/standardization');
const assert = require('assert');

describe('Field Standardization', () => {
  
  test('standardizeString generates correct SQL with basic options', () => {
    const sql = standardization.standardizeString('field_name', {
      trim: true,
      uppercase: true
    });
    
    // SQL should include TRIM and UPPER functions
    assert(sql.includes('TRIM('), 'SQL should include TRIM function');
    assert(sql.includes('UPPER('), 'SQL should include UPPER function');
    
    // SQL should handle NULL values properly
    assert(sql.includes('IFNULL('), 'SQL should handle NULL values');
  });
  
  test('standardizeName handles prefixes and suffixes', () => {
    const sql = standardization.standardizeName('full_name', {
      removePrefix: true,
      removeSuffix: true
    });
    
    // Should remove Mr, Mrs, Dr, etc. and Jr, Sr, III, etc.
    assert(sql.includes('REGEXP_REPLACE'), 'SQL should use REGEXP_REPLACE');
    assert(sql.includes('MR|MRS|MS|DR'), 'SQL should handle name prefixes');
    assert(sql.includes('JR|SR|I|II|III'), 'SQL should handle name suffixes');
  });
  
  test('standardizeAddress normalizes street types', () => {
    const sql = standardization.standardizeAddress('address_line1', {
      standardizeStreetTypes: true,
      standardizeDirectionals: true
    });
    
    // Should normalize street types (STREET->ST, AVENUE->AVE)
    assert(sql.includes('STREET'), 'SQL should handle street type normalization');
    assert(sql.includes('AVENUE'), 'SQL should handle street type normalization');
    
    // Should normalize directionals (NORTH->N, SOUTHEAST->SE)
    assert(sql.includes('NORTH'), 'SQL should handle directional normalization');
    assert(sql.includes('SOUTHEAST'), 'SQL should handle directional normalization');
  });
  
  test('standardizeField applies correct standardization based on field type', () => {
    // Test name standardization
    const nameSql = standardization.standardizeField('first_name', 'first_name');
    assert(nameSql.includes('UPPER'), 'Name fields should be uppercased');
    
    // Test email standardization
    const emailSql = standardization.standardizeField('email', 'email');
    assert(emailSql.includes('LOWER'), 'Email fields should be lowercased');
    
    // Test date standardization
    const dateSql = standardization.standardizeField('dob', 'date_of_birth');
    assert(dateSql.includes('DATE'), 'Date fields should use DATE functions');
  });
});
