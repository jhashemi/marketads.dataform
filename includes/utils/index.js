/**
 * Utilities Module
 * 
 * This module acts as the central point for all utility functions.
 * It follows the Interface Segregation Principle (ISP) by organizing utilities
 * into separate modules based on their domain, while providing a convenient
 * way to import all utilities as needed.
 */

const stringUtils = require('./string');
const arrayUtils = require('./array');
const objectUtils = require('./object');
const validationUtils = require('./validation');
const dateUtils = require('./date');

/**
 * Exports all utility functions organized by domain
 */
module.exports = {
  /**
   * String manipulation utilities
   */
  string: stringUtils,
  
  /**
   * Array manipulation utilities
   */
  array: arrayUtils,
  
  /**
   * Object manipulation utilities
   */
  object: objectUtils,
  
  /**
   * Validation utilities
   */
  validation: validationUtils,
  
  /**
   * Date manipulation utilities
   */
  date: dateUtils
}; 