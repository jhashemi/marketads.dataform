/**
 * Tests for regex pattern handling in SQL generation functions
 * 
 * These tests verify that regex patterns are properly formatted and escaped
 * for use with BigQuery SQL functions.
 */

const standardization = require('../../includes/sql/standardization');
const similarity = require('../../includes/sql/similarity_functions');
const assert = require('assert');

describe('RegEx Pattern Handling in SQL Generation', () => {
  
  test('standardizeString handles regex patterns properly', () => {
    // Test with removeNonAlpha option (uses REGEXP_REPLACE)
    const sql = standardization.standardizeString('field_name', {
      removeNonAlpha: true
    });
    
    // Should NOT contain Python-style r' prefix
    assert(!sql.includes("r'["), "SQL should not contain Python-style r' prefix");
    
    // Should properly form the REGEXP_REPLACE call
    assert(sql.includes("REGEXP_REPLACE"), "SQL should use REGEXP_REPLACE");
    assert(sql.includes("[^a-zA-Z]"), "SQL should contain the pattern");
  });
  
  test('standardizeName handles regex patterns properly', () => {
    const sql = standardization.standardizeName('name_field', {
      removePrefix: true,
      removeSuffix: true
    });
    
    // Should NOT contain Python-style r' prefix
    assert(!sql.includes("r'^"), "SQL should not contain Python-style r' prefix");
    assert(!sql.includes("r'\\s+"), "SQL should not contain Python-style r' prefix");
    
    // Should properly form the REGEXP_REPLACE calls
    assert(sql.includes("REGEXP_REPLACE"), "SQL should use REGEXP_REPLACE");
    assert(sql.includes("(MR|MRS|MS|DR|PROF)"), "SQL should contain prefix pattern");
    assert(sql.includes("(JR|SR|I|II|III|IV|V|ESQ|MD|PHD)"), "SQL should contain suffix pattern");
  });
  
  test('standardizeAddress handles regex patterns properly', () => {
    const sql = standardization.standardizeAddress('address_field', {
      standardizeStreetTypes: true,
      standardizeDirectionals: true
    });
    
    // Should NOT contain Python-style r' prefix
    assert(!sql.includes("r'\\b"), "SQL should not contain Python-style r' prefix");
    
    // Should properly handle the street type patterns
    assert(sql.includes("\\bAVENUE\\b"), "SQL should contain avenue pattern");
    assert(sql.includes("\\bSTREET\\b"), "SQL should contain street pattern");
    
    // Should properly handle directionals
    assert(sql.includes("\\bNORTH\\b"), "SQL should contain NORTH pattern");
    assert(sql.includes("\\bSOUTH\\b"), "SQL should contain SOUTH pattern");
  });
  
  test('standardizePhone handles regex patterns properly', () => {
    const sql = standardization.standardizePhone('phone_field', {
      digitsOnly: true
    });
    
    // Should NOT contain Python-style r' prefix
    assert(!sql.includes("r'[^0-9]'"), "SQL should not contain Python-style r' prefix");
    
    // Should properly form the REGEXP_REPLACE call
    assert(sql.includes("REGEXP_REPLACE"), "SQL should use REGEXP_REPLACE");
    assert(sql.includes("[^0-9]"), "SQL should contain the non-digit pattern");
  });
  
  test('similarity functions handle regex patterns properly', () => {
    const sql = similarity.blockingKeySql('email_field', 'last4');
    
    // Should NOT contain Python-style r' prefix
    assert(!sql.includes("r'[^0-9]'"), "SQL should not contain Python-style r' prefix");
    
    // Should properly form the REGEXP_REPLACE call
    assert(sql.includes("REGEXP_REPLACE"), "SQL should use REGEXP_REPLACE");
    assert(sql.includes("[^0-9]"), "SQL should contain the non-digit pattern");
  });
  
  test('address standardization in similarity functions handles regex patterns properly', () => {
    const sql = similarity.standardizeAddressSql('address_field');
    
    // Should NOT contain Python-style r' prefix
    assert(!sql.includes("r'\\b"), "SQL should not contain Python-style r' prefix");
    
    // Should properly handle various patterns
    assert(sql.includes("\\s+"), "SQL should contain whitespace pattern");
    assert(sql.includes("\\bstreet\\b"), "SQL should contain street pattern");
    assert(sql.includes("\\bavenue\\b"), "SQL should contain avenue pattern");
    
    // Check proper abbreviations
    assert(sql.includes("'dr'"), "SQL should use proper abbreviation for drive");
    assert(sql.includes("'cir'"), "SQL should use proper abbreviation for circle");
    assert(sql.includes("'ter'"), "SQL should use proper abbreviation for terrace");
  });
}); 