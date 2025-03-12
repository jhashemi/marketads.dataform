/**
 * Date Utilities
 * 
 * This module provides date manipulation utilities used throughout the application.
 * It follows the Separation of Concerns principle by isolating date-related functionality.
 */

/**
 * Checks if a value is a valid date
 * @param {*} value - The value to check
 * @returns {boolean} Whether the value is a valid date
 */
function isValidDate(value) {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Formats a date according to a specified format
 * @param {Date|string|number} date - The date to format
 * @param {string} [format='YYYY-MM-DD'] - The format string
 * @returns {string} The formatted date string
 */
function formatDate(date, format = 'YYYY-MM-DD') {
  const d = parseDate(date);
  
  if (!isValidDate(d)) {
    return '';
  }
  
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const seconds = d.getSeconds();
  const milliseconds = d.getMilliseconds();
  
  return format
    .replace(/YYYY/g, year.toString())
    .replace(/YY/g, year.toString().slice(-2))
    .replace(/MM/g, month.toString().padStart(2, '0'))
    .replace(/M/g, month.toString())
    .replace(/DD/g, day.toString().padStart(2, '0'))
    .replace(/D/g, day.toString())
    .replace(/HH/g, hours.toString().padStart(2, '0'))
    .replace(/H/g, hours.toString())
    .replace(/hh/g, (hours % 12 || 12).toString().padStart(2, '0'))
    .replace(/h/g, (hours % 12 || 12).toString())
    .replace(/mm/g, minutes.toString().padStart(2, '0'))
    .replace(/m/g, minutes.toString())
    .replace(/ss/g, seconds.toString().padStart(2, '0'))
    .replace(/s/g, seconds.toString())
    .replace(/SSS/g, milliseconds.toString().padStart(3, '0'))
    .replace(/A/g, hours < 12 ? 'AM' : 'PM')
    .replace(/a/g, hours < 12 ? 'am' : 'pm');
}

/**
 * Parses a date from various formats
 * @param {Date|string|number} value - The date value to parse
 * @returns {Date} The parsed date object
 */
function parseDate(value) {
  if (value instanceof Date) {
    return value;
  }
  
  if (typeof value === 'number') {
    return new Date(value);
  }
  
  if (typeof value === 'string') {
    // Handle ISO dates
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3})?Z?$/.test(value)) {
      return new Date(value);
    }
    
    // Handle common date formats
    const patterns = [
      // YYYY-MM-DD
      {
        regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
        handler: (m) => new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]))
      },
      // MM/DD/YYYY
      {
        regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        handler: (m) => new Date(parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2]))
      },
      // DD/MM/YYYY
      {
        regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        handler: (m) => new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]))
      }
      // Add more patterns as needed
    ];
    
    for (const pattern of patterns) {
      const match = value.match(pattern.regex);
      if (match) {
        return pattern.handler(match);
      }
    }
    
    // Default to standard parsing
    return new Date(value);
  }
  
  return new Date();
}

/**
 * Adds a specified number of time units to a date
 * @param {Date|string|number} date - The date to modify
 * @param {number} amount - The amount to add
 * @param {string} unit - The unit to add ('years', 'months', 'days', 'hours', 'minutes', 'seconds')
 * @returns {Date} The new date
 */
function addToDate(date, amount, unit) {
  const d = parseDate(date);
  
  if (!isValidDate(d) || typeof amount !== 'number') {
    return d;
  }
  
  const result = new Date(d);
  
  switch (unit.toLowerCase()) {
    case 'years':
    case 'year':
    case 'y':
      result.setFullYear(result.getFullYear() + amount);
      break;
    case 'months':
    case 'month':
    case 'm':
      result.setMonth(result.getMonth() + amount);
      break;
    case 'days':
    case 'day':
    case 'd':
      result.setDate(result.getDate() + amount);
      break;
    case 'hours':
    case 'hour':
    case 'h':
      result.setHours(result.getHours() + amount);
      break;
    case 'minutes':
    case 'minute':
    case 'min':
      result.setMinutes(result.getMinutes() + amount);
      break;
    case 'seconds':
    case 'second':
    case 's':
      result.setSeconds(result.getSeconds() + amount);
      break;
    default:
      // Do nothing for unknown units
      break;
  }
  
  return result;
}

/**
 * Subtracts a specified number of time units from a date
 * @param {Date|string|number} date - The date to modify
 * @param {number} amount - The amount to subtract
 * @param {string} unit - The unit to subtract ('years', 'months', 'days', 'hours', 'minutes', 'seconds')
 * @returns {Date} The new date
 */
function subtractFromDate(date, amount, unit) {
  return addToDate(date, -amount, unit);
}

/**
 * Gets the difference between two dates in the specified unit
 * @param {Date|string|number} dateA - The first date
 * @param {Date|string|number} dateB - The second date
 * @param {string} unit - The unit of difference ('years', 'months', 'days', 'hours', 'minutes', 'seconds')
 * @returns {number} The difference in the specified unit
 */
function diffDate(dateA, dateB, unit) {
  const a = parseDate(dateA);
  const b = parseDate(dateB);
  
  if (!isValidDate(a) || !isValidDate(b)) {
    return NaN;
  }
  
  const diffMs = a.getTime() - b.getTime();
  
  switch (unit.toLowerCase()) {
    case 'years':
    case 'year':
    case 'y':
      return a.getFullYear() - b.getFullYear();
    case 'months':
    case 'month':
    case 'm':
      return (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());
    case 'days':
    case 'day':
    case 'd':
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    case 'hours':
    case 'hour':
    case 'h':
      return Math.floor(diffMs / (1000 * 60 * 60));
    case 'minutes':
    case 'minute':
    case 'min':
      return Math.floor(diffMs / (1000 * 60));
    case 'seconds':
    case 'second':
    case 's':
      return Math.floor(diffMs / 1000);
    default:
      return diffMs;
  }
}

/**
 * Gets the start of a time unit for a date
 * @param {Date|string|number} date - The date to process
 * @param {string} unit - The unit ('year', 'month', 'week', 'day', 'hour', 'minute', 'second')
 * @returns {Date} The start of the unit
 */
function startOf(date, unit) {
  const d = parseDate(date);
  
  if (!isValidDate(d)) {
    return d;
  }
  
  const result = new Date(d);
  
  switch (unit.toLowerCase()) {
    case 'year':
    case 'y':
      result.setMonth(0, 1);
      result.setHours(0, 0, 0, 0);
      break;
    case 'month':
    case 'm':
      result.setDate(1);
      result.setHours(0, 0, 0, 0);
      break;
    case 'week':
    case 'w':
      const day = result.getDay();
      result.setDate(result.getDate() - day);
      result.setHours(0, 0, 0, 0);
      break;
    case 'day':
    case 'd':
      result.setHours(0, 0, 0, 0);
      break;
    case 'hour':
    case 'h':
      result.setMinutes(0, 0, 0);
      break;
    case 'minute':
    case 'min':
      result.setSeconds(0, 0);
      break;
    case 'second':
    case 's':
      result.setMilliseconds(0);
      break;
    default:
      // Do nothing for unknown units
      break;
  }
  
  return result;
}

/**
 * Gets the end of a time unit for a date
 * @param {Date|string|number} date - The date to process
 * @param {string} unit - The unit ('year', 'month', 'week', 'day', 'hour', 'minute', 'second')
 * @returns {Date} The end of the unit
 */
function endOf(date, unit) {
  const d = parseDate(date);
  
  if (!isValidDate(d)) {
    return d;
  }
  
  const result = new Date(d);
  
  switch (unit.toLowerCase()) {
    case 'year':
    case 'y':
      result.setMonth(11, 31);
      result.setHours(23, 59, 59, 999);
      break;
    case 'month':
    case 'm':
      result.setMonth(result.getMonth() + 1, 0);
      result.setHours(23, 59, 59, 999);
      break;
    case 'week':
    case 'w':
      const day = result.getDay();
      result.setDate(result.getDate() + (6 - day));
      result.setHours(23, 59, 59, 999);
      break;
    case 'day':
    case 'd':
      result.setHours(23, 59, 59, 999);
      break;
    case 'hour':
    case 'h':
      result.setMinutes(59, 59, 999);
      break;
    case 'minute':
    case 'min':
      result.setSeconds(59, 999);
      break;
    case 'second':
    case 's':
      result.setMilliseconds(999);
      break;
    default:
      // Do nothing for unknown units
      break;
  }
  
  return result;
}

/**
 * Checks if a date is between two other dates
 * @param {Date|string|number} date - The date to check
 * @param {Date|string|number} start - The start date
 * @param {Date|string|number} end - The end date
 * @param {string} [inclusivity='[]'] - Whether to include the start/end dates ('()', '(]', '[)', '[]')
 * @returns {boolean} Whether the date is between the start and end dates
 */
function isBetween(date, start, end, inclusivity = '[]') {
  const d = parseDate(date);
  const s = parseDate(start);
  const e = parseDate(end);
  
  if (!isValidDate(d) || !isValidDate(s) || !isValidDate(e)) {
    return false;
  }
  
  const isAfterStart = inclusivity[0] === '[' ? d >= s : d > s;
  const isBeforeEnd = inclusivity[1] === ']' ? d <= e : d < e;
  
  return isAfterStart && isBeforeEnd;
}

/**
 * Checks if a date is the same as another date (up to the specified unit)
 * @param {Date|string|number} dateA - The first date
 * @param {Date|string|number} dateB - The second date
 * @param {string} [unit='day'] - The unit of precision ('year', 'month', 'day', 'hour', 'minute', 'second')
 * @returns {boolean} Whether the dates are the same up to the specified unit
 */
function isSame(dateA, dateB, unit = 'day') {
  const a = parseDate(dateA);
  const b = parseDate(dateB);
  
  if (!isValidDate(a) || !isValidDate(b)) {
    return false;
  }
  
  switch (unit.toLowerCase()) {
    case 'year':
    case 'y':
      return a.getFullYear() === b.getFullYear();
    case 'month':
    case 'm':
      return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
    case 'day':
    case 'd':
      return a.getFullYear() === b.getFullYear() && 
             a.getMonth() === b.getMonth() && 
             a.getDate() === b.getDate();
    case 'hour':
    case 'h':
      return a.getFullYear() === b.getFullYear() && 
             a.getMonth() === b.getMonth() && 
             a.getDate() === b.getDate() && 
             a.getHours() === b.getHours();
    case 'minute':
    case 'min':
      return a.getFullYear() === b.getFullYear() && 
             a.getMonth() === b.getMonth() && 
             a.getDate() === b.getDate() && 
             a.getHours() === b.getHours() && 
             a.getMinutes() === b.getMinutes();
    case 'second':
    case 's':
      return a.getFullYear() === b.getFullYear() && 
             a.getMonth() === b.getMonth() && 
             a.getDate() === b.getDate() && 
             a.getHours() === b.getHours() && 
             a.getMinutes() === b.getMinutes() && 
             a.getSeconds() === b.getSeconds();
    default:
      return a.getTime() === b.getTime();
  }
}

/**
 * Checks if a date is before another date
 * @param {Date|string|number} dateA - The first date
 * @param {Date|string|number} dateB - The second date
 * @param {string} [unit='millisecond'] - The unit of precision
 * @returns {boolean} Whether the first date is before the second date
 */
function isBefore(dateA, dateB, unit = 'millisecond') {
  const a = parseDate(dateA);
  const b = parseDate(dateB);
  
  if (!isValidDate(a) || !isValidDate(b)) {
    return false;
  }
  
  return startOf(a, unit) < startOf(b, unit);
}

/**
 * Checks if a date is after another date
 * @param {Date|string|number} dateA - The first date
 * @param {Date|string|number} dateB - The second date
 * @param {string} [unit='millisecond'] - The unit of precision
 * @returns {boolean} Whether the first date is after the second date
 */
function isAfter(dateA, dateB, unit = 'millisecond') {
  const a = parseDate(dateA);
  const b = parseDate(dateB);
  
  if (!isValidDate(a) || !isValidDate(b)) {
    return false;
  }
  
  return startOf(a, unit) > startOf(b, unit);
}

/**
 * Gets the day of the week for a date
 * @param {Date|string|number} date - The date to process
 * @param {boolean} [asString=false] - Whether to return the day as a string
 * @returns {number|string} The day of the week (0-6 or 'Sunday'-'Saturday')
 */
function getDayOfWeek(date, asString = false) {
  const d = parseDate(date);
  
  if (!isValidDate(d)) {
    return asString ? '' : NaN;
  }
  
  const dayNumber = d.getDay();
  
  if (!asString) {
    return dayNumber;
  }
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber];
}

/**
 * Gets the quarter of the year for a date
 * @param {Date|string|number} date - The date to process
 * @returns {number} The quarter (1-4)
 */
function getQuarter(date) {
  const d = parseDate(date);
  
  if (!isValidDate(d)) {
    return NaN;
  }
  
  return Math.floor(d.getMonth() / 3) + 1;
}

/**
 * Gets the number of days in the month for a date
 * @param {Date|string|number} date - The date to process
 * @returns {number} The number of days in the month
 */
function getDaysInMonth(date) {
  const d = parseDate(date);
  
  if (!isValidDate(d)) {
    return NaN;
  }
  
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/**
 * Checks if a year is a leap year
 * @param {number|Date|string} year - The year or date to check
 * @returns {boolean} Whether the year is a leap year
 */
function isLeapYear(year) {
  let yearValue;
  
  if (year instanceof Date) {
    yearValue = year.getFullYear();
  } else if (typeof year === 'string') {
    const date = parseDate(year);
    if (isValidDate(date)) {
      yearValue = date.getFullYear();
    } else {
      yearValue = parseInt(year, 10);
    }
  } else {
    yearValue = year;
  }
  
  if (isNaN(yearValue)) {
    return false;
  }
  
  return (yearValue % 4 === 0 && yearValue % 100 !== 0) || (yearValue % 400 === 0);
}

/**
 * Formats a relative time (e.g., '2 days ago', 'in 3 hours')
 * @param {Date|string|number} date - The date to format
 * @param {Date|string|number} [baseDate=new Date()] - The base date for comparison
 * @returns {string} The relative time string
 */
function formatRelative(date, baseDate = new Date()) {
  const d = parseDate(date);
  const b = parseDate(baseDate);
  
  if (!isValidDate(d) || !isValidDate(b)) {
    return '';
  }
  
  const diffMs = d.getTime() - b.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);
  const diffMonths = diffDate(d, b, 'months');
  const diffYears = diffDate(d, b, 'years');
  
  const isFuture = diffMs > 0;
  const prefix = isFuture ? 'in ' : '';
  const suffix = isFuture ? '' : ' ago';
  
  const abs = (value) => Math.abs(value);
  
  if (abs(diffYears) >= 1) {
    const unit = abs(diffYears) === 1 ? 'year' : 'years';
    return `${prefix}${abs(diffYears)} ${unit}${suffix}`;
  }
  
  if (abs(diffMonths) >= 1) {
    const unit = abs(diffMonths) === 1 ? 'month' : 'months';
    return `${prefix}${abs(diffMonths)} ${unit}${suffix}`;
  }
  
  if (abs(diffDays) >= 1) {
    const unit = abs(diffDays) === 1 ? 'day' : 'days';
    return `${prefix}${abs(diffDays)} ${unit}${suffix}`;
  }
  
  if (abs(diffHours) >= 1) {
    const unit = abs(diffHours) === 1 ? 'hour' : 'hours';
    return `${prefix}${abs(diffHours)} ${unit}${suffix}`;
  }
  
  if (abs(diffMinutes) >= 1) {
    const unit = abs(diffMinutes) === 1 ? 'minute' : 'minutes';
    return `${prefix}${abs(diffMinutes)} ${unit}${suffix}`;
  }
  
  return 'just now';
}

/**
 * Creates a date range array between two dates
 * @param {Date|string|number} startDate - The start date
 * @param {Date|string|number} endDate - The end date
 * @param {string} [unit='day'] - The unit to increment by
 * @returns {Date[]} Array of dates in the range
 */
function dateRange(startDate, endDate, unit = 'day') {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  
  if (!isValidDate(start) || !isValidDate(end) || start > end) {
    return [];
  }
  
  const range = [];
  let current = new Date(start);
  
  while (current <= end) {
    range.push(new Date(current));
    current = addToDate(current, 1, unit);
  }
  
  return range;
}

/**
 * Gets an ISO date string (YYYY-MM-DD)
 * @param {Date|string|number} date - The date to format
 * @returns {string} The ISO date string
 */
function toISODate(date) {
  const d = parseDate(date);
  
  if (!isValidDate(d)) {
    return '';
  }
  
  return d.toISOString().split('T')[0];
}

/**
 * Gets a timestamp in milliseconds
 * @param {Date|string|number} date - The date to convert
 * @returns {number} The timestamp in milliseconds
 */
function toTimestamp(date) {
  const d = parseDate(date);
  
  if (!isValidDate(d)) {
    return NaN;
  }
  
  return d.getTime();
}

/**
 * Creates a new date object by setting specific components
 * @param {Object} components - The date components
 * @param {number} [components.year] - The year
 * @param {number} [components.month] - The month (0-11)
 * @param {number} [components.day] - The day of the month
 * @param {number} [components.hour] - The hour
 * @param {number} [components.minute] - The minute
 * @param {number} [components.second] - The second
 * @param {number} [components.millisecond] - The millisecond
 * @returns {Date} The new date
 */
function createDate({
  year = new Date().getFullYear(),
  month = new Date().getMonth(),
  day = 1,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0
} = {}) {
  return new Date(year, month, day, hour, minute, second, millisecond);
}

module.exports = {
  isValidDate,
  formatDate,
  parseDate,
  addToDate,
  subtractFromDate,
  diffDate,
  startOf,
  endOf,
  isBetween,
  isSame,
  isBefore,
  isAfter,
  getDayOfWeek,
  getQuarter,
  getDaysInMonth,
  isLeapYear,
  formatRelative,
  dateRange,
  toISODate,
  toTimestamp,
  createDate
}; 