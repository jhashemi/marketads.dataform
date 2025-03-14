/**
 * String Utilities
 * 
 * This module provides string manipulation utilities used throughout the application.
 * It follows the Separation of Concerns principle by isolating string-related functionality.
 */

/**
 * Converts a string to camelCase
 * @param {string} str - Input string
 * @returns {string} Camel case string
 */
function toCamelCase(str) {
  if (!str || typeof str !== 'string') return '';
  // Insert space between lowercase and uppercase letters to separate camelCase words
  let result = str.replace(/([a-z])([A-Z])/g, '$1 $2');
  let words = result.split(/[\s_\-\.]+/);
  return words.map((word, index) => index === 0 ? word.toLowerCase() : (word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())).join('');
}

/**
 * Converts a string to snake_case
 * @param {string} str - Input string
 * @returns {string} Snake case string
 */
function toSnakeCase(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }
  
  return str
    .replace(/[\s-]+/g, '_')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase();
}

/**
 * Converts a string to PascalCase
 * @param {string} str - Input string
 * @returns {string} Pascal case string
 */
function toPascalCase(str) {
  if (!str || typeof str !== 'string') return '';
  // Insert space between lowercase and uppercase letters to separate camelCase words
  let result = str.replace(/([a-z])([A-Z])/g, '$1 $2');
  let words = result.split(/[\s_\-\.]+/);
  return words.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
}

/**
 * Normalizes a string by removing special characters and converting to lowercase
 * @param {string} str - Input string
 * @returns {string} Normalized string
 */
function normalizeString(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }
  
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/gi, '');
}

/**
 * Truncates a string to a specified length with ellipsis
 * @param {string} str - Input string
 * @param {number} maxLength - Maximum length
 * @param {string} [suffix='...'] - Suffix to add when truncated
 * @returns {string} Truncated string
 */
function truncate(str, maxLength, suffix = '...') {
  if (!str || typeof str !== 'string') {
    return '';
  }
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength) + suffix;
}

/**
 * Slugifies a string for use in URLs
 * @param {string} str - Input string
 * @returns {string} URL-friendly slug
 */
function slugify(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }
  
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Splits a string into tokens
 * @param {string} str - Input string
 * @param {RegExp} [separator=/\s+/] - Separator pattern
 * @returns {string[]} Array of tokens
 */
function tokenize(str, separator = /\s+/) {
  if (!str || typeof str !== 'string') {
    return [];
  }
  
  return str
    .trim()
    .split(separator)
    .filter(token => token.length > 0);
}

/**
 * Extracts initials from a name
 * @param {string} name - Full name
 * @param {number} [maxInitials=2] - Maximum number of initials
 * @returns {string} Initials
 */
function getInitials(name, maxInitials = 2) {
  if (!name || typeof name !== 'string') {
    return '';
  }
  
  const words = name.trim().split(/\s+/);
  return words
    .slice(0, maxInitials)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
}

/**
 * Masks a string for privacy (e.g., email, phone number)
 * @param {string} str - Input string
 * @param {number} [visibleChars=4] - Number of characters to leave visible
 * @param {string} [maskChar='*'] - Character to use for masking
 * @returns {string} Masked string
 */
function maskString(str, visibleChars = 4, maskChar = '*') {
  if (!str || typeof str !== 'string') {
    return '';
  }
  
  if (str.length <= visibleChars) {
    return str;
  }
  
  const visiblePart = str.slice(-visibleChars);
  const maskedPart = maskChar.repeat(str.length - visibleChars);
  
  return maskedPart + visiblePart;
}

/**
 * Formats a name (first/last) with proper capitalization
 * @param {string} name - Name to format
 * @returns {string} Formatted name
 */
function formatName(name) {
  if (!name || typeof name !== 'string') {
    return '';
  }
  
  return name
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

/**
 * Standardizes phone number format
 * @param {string} phoneNumber - Phone number to format
 * @param {string} [format='(###) ###-####'] - Format pattern
 * @returns {string} Formatted phone number
 */
function formatPhoneNumber(phoneNumber, format = '(###) ###-####') {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return '';
  }
  
  // Extract digits only
  const digits = phoneNumber.replace(/\D/g, '');
  
  // If not enough digits, return original
  if (digits.length < 10) {
    return phoneNumber;
  }
  
  // Extract last 10 digits
  const lastTen = digits.slice(-10);
  
  // Format according to pattern
  let formatted = format;
  for (let i = 0; i < lastTen.length; i++) {
    formatted = formatted.replace('#', lastTen[i]);
  }
  
  return formatted;
}

/**
 * Formats an email address for display (e.g., truncates long domains)
 * @param {string} email - Email address
 * @param {number} [maxLocalLength=10] - Maximum local part length
 * @param {number} [maxDomainLength=15] - Maximum domain length
 * @returns {string} Formatted email
 */
function formatEmail(email, maxLocalLength = 10, maxDomainLength = 15) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return email || '';
  }
  
  const [local, domain] = email.split('@');
  
  const truncatedLocal = local.length > maxLocalLength 
    ? local.substring(0, maxLocalLength - 2) + '..' 
    : local;
  
  const truncatedDomain = domain.length > maxDomainLength 
    ? domain.substring(0, maxDomainLength - 2) + '..' 
    : domain;
  
  return `${truncatedLocal}@${truncatedDomain}`;
}

/**
 * Generates a random string
 * @param {number} [length=8] - String length
 * @param {string} [charset='alphanumeric'] - Character set ('alpha', 'numeric', 'alphanumeric', 'hex')
 * @returns {string} Random string
 */
function randomString(length = 8, charset = 'alphanumeric') {
  const charsets = {
    alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    numeric: '0123456789',
    alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    hex: '0123456789abcdef'
  };
  
  const chars = charsets[charset] || charsets.alphanumeric;
  let result = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  
  return result;
}

module.exports = {
  toCamelCase,
  toSnakeCase,
  toPascalCase,
  normalizeString,
  truncate,
  slugify,
  tokenize,
  getInitials,
  maskString,
  formatName,
  formatPhoneNumber,
  formatEmail,
  randomString
}; 