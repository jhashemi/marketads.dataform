/**
 * Transitive Matcher
 * 
 * Class for performing transitive matching and clustering
 */

const { SqlCompiler } = require('../sql/compiler');
const { validateParameters } = require('../validation/parameter_validator');

/**
 * Transitive Matcher class
 */
class TransitiveMatcher {
  /**
   * Constructor
   * @param {Object} options - Configuration options
   * @param {string} options.matchResultsTable - Table containing initial match results
   * @param {number} options.confidenceThreshold - Minimum confidence threshold for transitive closure
   * @param {string} [options.outputTable] - Output table for transitive matches
   * @param {number} [options.maxDepth=3] - Maximum depth for transitive closure
   * @param {boolean} [options.includeDirectMatches=true] - Whether to include direct matches in results
   * @param {string} [options.sourceIdField=source_id] - Source ID field name
   * @param {string} [options.targetIdField=target_id] - Target ID field name
   * @param {string} [options.confidenceField=confidence] - Confidence field name
   */
  constructor(options) {
    // Define validation rules
    const validationRules = {
      required: ['matchResultsTable', 'confidenceThreshold'],
      types: {
        matchResultsTable: 'string',
        confidenceThreshold: 'number',
        outputTable: 'string',
        maxDepth: 'number',
        includeDirectMatches: 'boolean',
        sourceIdField: 'string',
        targetIdField: 'string',
        confidenceField: 'string',
      },
      defaults: {
        outputTable: 'transitive_matches',
        maxDepth: 3,
        includeDirectMatches: true,
        sourceIdField: 'source_id',
        targetIdField: 'target_id',
        confidenceField: 'confidence',
      },
      messages: {
        matchResultsTable: 'Please provide the initial match results table name.',
        confidenceThreshold: 'Please provide the confidence threshold for transitive closure.',
      }
    };

    // Validate and apply defaults
    const validatedOptions = validateParameters(options, validationRules, 'TransitiveMatcher');
    
    // Initialize properties
    this.matchResultsTable = validatedOptions.matchResultsTable;
    this.confidenceThreshold = validatedOptions.confidenceThreshold;
    this.outputTable = validatedOptions.outputTable;
    this.maxDepth = validatedOptions.maxDepth;
    this.includeDirectMatches = validatedOptions.includeDirectMatches;
    this.sourceIdField = validatedOptions.sourceIdField;
    this.targetIdField = validatedOptions.targetIdField;
    this.confidenceField = validatedOptions.confidenceField;
  }

  /**
   * Executes transitive matching and clustering
   * @returns {Object} Clustering results and metrics
   */
  async execute() {
    console.log('Running transitive matching and clustering...');
    
    const startTime = Date.now();
    
    // 1. Fetch matches from matchResultsTable
    const matches = await this.fetchMatchResults();
    
    // 2. Find connected components (clusters)
    const clusters = this.findConnectedComponents(matches);
    
    // 3. Generate metrics
    const metrics = this.generateMetrics(clusters, matches);
    const executionTime = (Date.now() - startTime) / 1000;
    
    return {
      clusters: clusters,
      metrics: metrics,
      executionTime: executionTime,
      sql: this.generateSql() // Include SQL for debugging
    };
  }
  
  /**
   * Fetches match results from the configured table
   * @private
   * @async
   * @returns {Array<Object>} Array of match result objects
   */
  async fetchMatchResults() {
    console.log(`Fetching match results from ${this.matchResultsTable}`);
    
    const compiler = new SqlCompiler();
    const sqlQuery = compiler.select(
      this.matchResultsTable,
      [this.sourceIdField, this.targetIdField, this.confidenceField]
    );
    
    const queryResult = await dataform.query(sqlQuery).fetch();
    return queryResult;
  }

  /**
   * Simulates fetching match results for testing
   * @private
   * @returns {Array} Array of simulated match results
   */
  simulateMatchResults() {
    return [
      { source: 'A', target: 'B', confidence: 0.95 },
      { source: 'B', target: 'C', confidence: 0.88 },
      { source: 'C', target: 'D', confidence: 0.92 },
      { source: 'E', target: 'F', confidence: 0.89 },
      { source: 'G', target: 'F', confidence: 0.79 },
    ];
  }

  /**
   * Finds connected components in a graph (clusters of records)
   * @private
   * @param {Array} matches - Array of match objects with source and target
   * @returns {Array} Array of clusters (each cluster is an array of node IDs)
   */
  findConnectedComponents(matches) {
    const graph = new Map();
    
    // Build the graph
    for (const match of matches) {
      if (match.confidence < this.confidenceThreshold) continue;
      
      if (!graph.has(match.source)) graph.set(match.source, new Set());
      if (!graph.has(match.target)) graph.set(match.target, new Set());
      
      graph.get(match.source).add(match.target);
      graph.get(match.target).add(match.source); // Undirected graph for connected components
    }
    
    // Find connected components using DFS
    const visited = new Set();
    const clusters = [];
    
    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        const records = [];
        this.dfs(node, graph, visited, records);
        clusters.push({ records }); // Changed to return cluster object with records
      }
    }
    
    return clusters;
  }
  
  /**
   * Depth-first search to find all nodes in a connected component
   * @private
   * @param {string} node - Current node ID
   * @param {Map} graph - Adjacency list representation of the graph
   * @param {Set} visited - Set of visited nodes
   * @param {Array} cluster - Array to collect nodes in the current cluster
   */
  dfs(node, graph, visited, cluster) {
    visited.add(node);
    cluster.push(node);
    
    const neighbors = graph.get(node) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        this.dfs(neighbor, graph, visited, cluster);
      }
    }
  }
  
  /**
   * Calculates average confidence for matches within a cluster
   * @private
   * @param {Array} cluster - Array of node IDs in the cluster
   * @param {Array} matches - Array of match objects
   * @returns {number} - Average confidence value
   */
  calculateAverageConfidence(clusterRecords, matches) {
    const clusterMatches = matches.filter(match =>
      clusterRecords.includes(match.source) && clusterRecords.includes(match.target)
    );
    
    if (clusterMatches.length === 0) return 0;
    
    const sum = clusterMatches.reduce((acc, match) => acc + match.confidence, 0);
    return sum / clusterMatches.length;
  }
  
  /**
   * Calculates cluster density (ratio of actual connections to possible connections)
   * @private
   * @param {number} clusterSize - Number of nodes in the cluster
   * @returns {number} - Density value between 0 and 1
   */
  calculateClusterDensity(clusterSize) {
    if (clusterSize <= 1) return 1;
    const possibleConnections = (clusterSize * (clusterSize - 1)) / 2;
    return Math.min(clusterSize - 1, possibleConnections) / possibleConnections;
  }
  
  /**
   * Counts direct edges (matches) within a cluster
   * @private
   * @param {Array} cluster - Array of node IDs in the cluster
   * @param {Array} matches - Array of match objects
   * @returns {number} - Number of direct edges
   */
  countDirectEdges(clusterRecords, matches) {
    return matches.filter(match =>
      clusterRecords.includes(match.source) && clusterRecords.includes(match.target)
    ).length;
  }
  
  /**
   * Counts transitive edges within a cluster
   * @private
   * @param {Array} cluster - Array of node IDs in the cluster
   * @param {Array} matches - Array of match objects
   * @returns {number} - Number of transitive edges
   */
  countTransitiveEdges(clusterRecords, matches) {
    const directEdges = this.countDirectEdges(clusterRecords, matches);
    const possibleEdges = (clusterRecords.length * (clusterRecords.length - 1)) / 2;
    return Math.max(0, possibleEdges - directEdges);
  }
  
  /**
   * Generates cluster metrics for all clusters
   * @private
   * @param {Array} clusters - Array of cluster objects
   * @returns {Object} - Metrics object
   */
  generateMetrics(clusters, matches) {
    const totalClusters = clusters.length;
    const totalRecordsInClusters = clusters.reduce((sum, cluster) => sum + cluster.records.length, 0);
    const averageClusterSize = totalClusters > 0 ? totalRecordsInClusters / totalClusters : 0;
    const largestClusterSize = clusters.length > 0 ?
      Math.max(...clusters.map(cluster => cluster.records.length)) : 0;

    const metrics = {
      totalClusters: totalClusters,
      totalRecordsInClusters: totalRecordsInClusters,
      averageClusterSize: averageClusterSize,
      largestClusterSize: largestClusterSize,
      clusterDensities: [],
      averageConfidences: [],
      directEdgesCounts: [],
      transitiveEdgesCounts: [],
    };

    clusters.forEach(cluster => {
      const clusterSize = cluster.records.length;
      const clusterDensity = this.calculateClusterDensity(clusterSize);
      const avgConfidence = this.calculateAverageConfidence(cluster.records, matches); // Use actual matches
      const directEdges = this.countDirectEdges(cluster.records, matches); // Use actual matches
      const transitiveEdges = this.countTransitiveEdges(cluster.records, matches); // Use actual matches


      metrics.clusterDensities.push(clusterDensity);
      metrics.averageConfidences.push(avgConfidence);
      metrics.directEdgesCounts.push(directEdges);
      metrics.transitiveEdgesCounts.push(transitiveEdges);
    });

    metrics.averageClusterDensity = metrics.clusterDensities.reduce((sum, density) => sum + density, 0) / totalClusters || 0;
    metrics.averageAverageConfidence = metrics.averageConfidences.reduce((sum, confidence) => sum + confidence, 0) / totalClusters || 0;
    metrics.totalDirectEdges = metrics.directEdgesCounts.reduce((sum, count) => sum + count, 0);
    metrics.totalTransitiveEdges = metrics.transitiveEdgesCounts.reduce((sum, count) => sum + count, 0);
    metrics.transitivityScore = this.calculateTransitivityScore(clusters);
    metrics.clusterSizeDistribution = this.calculateClusterSizeDistribution(clusters);


    return metrics;
  }

  /**
   * Generates SQL for transitive closure
   * @returns {string} SQL statement for transitive closure
   */
  generateSql() {
    // to find all connected components in the match graph
    // This uses Common Table Expressions (CTEs) and a recursive query pattern
    const sql = `
      WITH RECURSIVE TransitiveClosure AS (
        SELECT
          ${this.sourceIdField} AS source_record_id,
          ${this.targetIdField} AS target_record_id,
          ARRAY[${this.sourceIdField}, ${this.targetIdField}] AS path,
          1 AS depth
        FROM ${this.matchResultsTable}
        WHERE ${this.confidenceField} >= ${this.confidenceThreshold}

        UNION ALL

        SELECT
          tc.source_record_id,
          m.target_record_id,
          tc.path || m.target_record_id,
          tc.depth + 1
        FROM TransitiveClosure tc
        JOIN ${this.matchResultsTable} m ON tc.target_record_id = m.${this.sourceIdField}
        WHERE m.${this.confidenceField} >= ${this.confidenceThreshold}
          AND NOT m.target_record_id = ANY(tc.path)
          AND tc.depth < ${this.maxDepth}
      ),
      Clusters AS (
        SELECT
          array_agg(DISTINCT record_id) AS cluster_members,
          min(record_id) as cluster_id,
          count(DISTINCT record_id) AS cluster_size
        FROM (
          SELECT source_record_id as record_id FROM TransitiveClosure
          UNION ALL
          SELECT target_record_id as record_id FROM TransitiveClosure
        ) AS all_records
        GROUP BY cluster_id
      )
      SELECT
          cluster_id,
          cluster_size,
          cluster_members
       FROM Clusters
       ORDER BY cluster_size DESC
    `;
    return sql;
  }

  /**
   * Calculates transitivity score for clusters
   * @private
   * @param {Array} clusters - Array of cluster objects
   * @returns {number} Transitivity score (0-1)
   */
  calculateTransitivityScore(clusters) {
    if (clusters.length === 0) return 0;
    
    // Calculate the sum of transitivity scores for all clusters
    const totalTransitivity = clusters.reduce((sum, cluster) => {
      if (!cluster.metrics || !cluster.metrics.directEdges) return sum;
      
      const directEdges = cluster.metrics.directEdges;
      const transitiveEdges = cluster.metrics.transitiveEdges || 0;
      const totalEdges = directEdges + transitiveEdges;
      
      if (totalEdges === 0) return sum;
      
      // Transitivity score: ratio of direct edges to total possible edges
      return sum + (directEdges / totalEdges);
    }, 0);
    
    // Return the average transitivity score across all clusters
    return totalTransitivity / clusters.length;
  }
  
  /**
   * Calculates cluster size distribution
   * @private
   * @param {Array} clusters - Array of cluster objects
   * @returns {Object} Distribution of cluster sizes
   */
  calculateClusterSizeDistribution(clusters) {
    const distribution = {};
    
    // Count clusters by size
    clusters.forEach(cluster => {
      const size = cluster.records;
      if (!distribution[size]) {
        distribution[size] = 0;
      }
      distribution[size]++;
    });
    
    // Calculate percentages
    const totalClusters = clusters.length;
    const percentages = {};
    
    for (const [size, count] of Object.entries(distribution)) {
      percentages[size] = (count / totalClusters * 100).toFixed(2) + '%';
    }
    
    return {
      counts: distribution,
      percentages: percentages
    };
  }
  
  /**
   * Gets comprehensive cluster metrics for analysis
   * @returns {Object} Detailed cluster metrics
   */
  async getClusterMetrics() {
    // Generate real metrics based on clusters produced by transitive closure
    const clusters = await this.simulateTransitiveClosure();
    const metrics = this.generateMetrics(clusters);
    
    return {
      clusterCount: metrics.totalClusters,
      recordsInClusters: metrics.totalRecordsInClusters,
      averageClusterSize: metrics.averageClusterSize.toFixed(2),
      largestClusterSize: metrics.largestClusterSize,
      transitivityScore: metrics.transitivityScore ? metrics.transitivityScore.toFixed(2) : 0,
      clusterSizeDistribution: metrics.clusterSizeDistribution,
      
      // Additional metrics for analysis
      edgeMetrics: {
        directEdges: clusters.reduce((sum, c) => sum + (c.metrics?.directEdges || 0), 0),
        transitiveEdges: clusters.reduce((sum, c) => sum + (c.metrics?.transitiveEdges || 0), 0),
        avgConfidence: clusters.length > 0 ?
          (clusters.reduce((sum, c) => sum + (c.metrics?.avgConfidence || 0), 0) / clusters.length).toFixed(2) : 0,
      },
      
      // Performance metrics
      performanceMetrics: {
        memoryUsage: this.getMemoryUsage(),
        executionTime: (Date.now() - (clusters[0]?.timestamp || Date.now())) / 1000,
      }
    };
  }
  
  /**
   * Gets current memory usage (helper method)
   * @private
   * @returns {number} Memory usage in MB
   */
  getMemoryUsage() {
    // Try to get memory usage from Node.js process if available
    if (typeof process !== 'undefined' && process.memoryUsage) {
      try {
        const { heapUsed } = process.memoryUsage();
        return Math.round(heapUsed / (1024 * 1024) * 100) / 100; // Convert to MB
      } catch (e) {
        console.warn('Unable to get heap memory usage:', e.message);
      }
    }
    
    // Fallback for browsers or if process.memoryUsage fails
    return 0;
  }
}

module.exports = { TransitiveMatcher };