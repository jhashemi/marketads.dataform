/**
 * Database Service
 * Provides methods for interacting with the database
 */

class DatabaseService {
  constructor() {
    // In a real application, this would include connection details
    this.isConnected = false;
  }

  /**
   * Get the database service instance (singleton pattern)
   * @returns {DatabaseService} Database service instance
   */
  static getInstance() {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Connect to the database
   * @returns {Promise<void>} Promise that resolves when connection is established
   */
  async connect() {
    // In a real application, this would establish a database connection
    this.isConnected = true;
  }

  /**
   * Execute a SQL query
   * @param {string} query - SQL query to execute
   * @param {Array<any>} params - Parameters for the query
   * @returns {Promise<any>} Query results
   */
  async executeQuery(query, params = []) {
    // In a real application, this would execute the query against the database
    // For this implementation, we'll simulate responses based on the query

    // Log the query for debugging
    console.log(`Executing query: ${query}`);
    console.log(`With params: ${JSON.stringify(params)}`);

    // Check if connected
    if (!this.isConnected) {
      await this.connect();
    }

    // Simulate schema information
    if (query.includes('INFORMATION_SCHEMA.COLUMNS')) {
      return this.simulateSchemaQuery(query, params);
    }

    // Simulate null ratio query
    if (query.includes('NULL_COUNT') || query.includes('COUNT(*)')) {
      return this.simulateNullRatioQuery(query, params);
    }

    // Simulate uniqueness query
    if (query.includes('COUNT(DISTINCT')) {
      return this.simulateUniquenessQuery(query, params);
    }

    // Default empty response
    return { rows: [] };
  }

  /**
   * Simulate schema query results
   * @param {string} query - SQL query
   * @param {Array<any>} params - Query parameters
   * @returns {Object} Simulated schema results
   */
  simulateSchemaQuery(query, params) {
    // Extract table name from query
    const tableNameMatch = query.match(/FROM\s+`?(\w+)`?/i);
    const tableName = tableNameMatch ? tableNameMatch[1] : '';

    // If table doesn't exist in our simulation, return empty result
    if (!tableName || !this.mockSchemas[tableName]) {
      return { columns: [] };
    }

    // Return mock schema for the table
    return { columns: this.mockSchemas[tableName] };
  }

  /**
   * Simulate null ratio query results
   * @param {string} query - SQL query
   * @param {Array<any>} params - Query parameters
   * @returns {Object} Simulated null ratio results
   */
  simulateNullRatioQuery(query, params) {
    // Extract table and field name from query
    const tableNameMatch = query.match(/FROM\s+`?(\w+)`?/i);
    const fieldNameMatch = query.match(/NULL_COUNT\(`?(\w+)`?\)/i) || query.match(/`?(\w+)`?\s+IS\s+NULL/i);

    const tableName = tableNameMatch ? tableNameMatch[1] : '';
    const fieldName = fieldNameMatch ? fieldNameMatch[1] : '';

    // Default values
    const totalRows = 1000;
    let nullCount = 0;

    // Assign null counts based on field names
    if (fieldName === 'id') {
      nullCount = 0; // IDs are usually not null
    } else if (fieldName === 'email') {
      nullCount = 100; // 10% null ratio
    } else if (fieldName === 'phone') {
      nullCount = 200; // 20% null ratio
    } else if (fieldName === 'firstName' || fieldName === 'lastName') {
      nullCount = 50; // 5% null ratio
    }

    return {
      rows: [{ null_count: nullCount, total_count: totalRows }]
    };
  }

  /**
   * Simulate uniqueness query results
   * @param {string} query - SQL query
   * @param {Array<any>} params - Query parameters
   * @returns {Object} Simulated uniqueness results
   */
  simulateUniquenessQuery(query, params) {
    // Extract table and field name from query
    const tableNameMatch = query.match(/FROM\s+`?(\w+)`?/i);
    const fieldNameMatch = query.match(/COUNT\(DISTINCT\s+`?(\w+)`?\)/i);

    const tableName = tableNameMatch ? tableNameMatch[1] : '';
    const fieldName = fieldNameMatch ? fieldNameMatch[1] : '';

    // Default values
    const totalRows = 1000;
    let distinctCount = 0;

    // Assign distinct counts based on field names
    if (fieldName === 'id') {
      distinctCount = 1000; // IDs are unique
    } else if (fieldName === 'email') {
      distinctCount = 990; // 99% unique
    } else if (fieldName === 'phone') {
      distinctCount = 900; // 90% unique
    } else if (fieldName === 'firstName') {
      distinctCount = 300; // 30% unique
    } else if (fieldName === 'lastName') {
      distinctCount = 700; // 70% unique
    }

    return {
      rows: [{ distinct_count: distinctCount, total_count: totalRows }]
    };
  }

  // Mock schema data for simulation
  mockSchemas = {
    'source_table_123': [
      { name: 'id', type: 'STRING' },
      { name: 'firstName', type: 'STRING' },
      { name: 'lastName', type: 'STRING' },
      { name: 'email', type: 'STRING' },
      { name: 'phone', type: 'STRING' }
    ],
    'reference_table_456': [
      { name: 'id', type: 'STRING' },
      { name: 'firstName', type: 'STRING' },
      { name: 'lastName', type: 'STRING' },
      { name: 'email', type: 'STRING' },
      { name: 'address', type: 'STRING' }
    ]
  };
}

module.exports = DatabaseService; 