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
   * @param {Array} matches - Array of match objects
   * @returns {Object} - Metrics object
   */
  generateMetrics(clusters, matches) {
    if (!clusters || clusters.length === 0) {
      return {
        totalClusters: 0,
        totalRecordsInClusters: 0,
        averageClusterSize: 0,
        largestClusterSize: 0,
        clusterDensities: [],
        averageConfidences: [],
        directEdgesCounts: [],
        transitiveEdgesCounts: [],
        averageClusterDensity: 0,
        averageAverageConfidence: 0,
        totalDirectEdges: 0,
        totalTransitiveEdges: 0,
        transitivityScore: 0,
        clusterSizeDistribution: { counts: {}, percentages: {} }
      };
    }
    
    const totalClusters = clusters.length;
    
    // Handle different cluster structures (members vs records)
    const getClusterMembers = (cluster) => {
      if (cluster.members) return cluster.members;
      if (cluster.records) return cluster.records;
      return [];
    };
    
    const totalRecordsInClusters = clusters.reduce((sum, cluster) => sum + getClusterMembers(cluster).length, 0);
    const averageClusterSize = totalClusters > 0 ? totalRecordsInClusters / totalClusters : 0;
    const largestClusterSize = clusters.length > 0 ?
      Math.max(...clusters.map(cluster => getClusterMembers(cluster).length)) : 0;

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
      const members = getClusterMembers(cluster);
      const clusterSize = members.length;
      const clusterDensity = this.calculateClusterDensity(clusterSize);
      const avgConfidence = this.calculateAverageConfidence(members, matches);
      const directEdges = this.countDirectEdges(members, matches);
      const transitiveEdges = this.countTransitiveEdges(members, matches);

      metrics.clusterDensities.push(clusterDensity);
      metrics.averageConfidences.push(avgConfidence);
      metrics.directEdgesCounts.push(directEdges);
      metrics.transitiveEdgesCounts.push(transitiveEdges);
      
      // Store metrics in the cluster object if it doesn't already have them
      if (!cluster.metrics) {
        cluster.metrics = {
          directEdges,
          transitiveEdges,
          avgConfidence
        };
      }
    });

    metrics.averageClusterDensity = totalClusters > 0 ? 
      metrics.clusterDensities.reduce((sum, density) => sum + density, 0) / totalClusters : 0;
    metrics.averageAverageConfidence = totalClusters > 0 ? 
      metrics.averageConfidences.reduce((sum, confidence) => sum + confidence, 0) / totalClusters : 0;
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
    if (!clusters || clusters.length === 0) return 0;
    
    // Calculate the sum of transitivity scores for all clusters
    const totalTransitivity = clusters.reduce((sum, cluster) => {
      // Skip clusters without metrics
      if (!cluster.metrics) return sum;
      
      const directEdges = cluster.metrics.directEdges || 0;
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
    
    // Helper function to get cluster members consistently
    const getClusterMembers = (cluster) => {
      if (cluster.members) return cluster.members;
      if (cluster.records) return cluster.records;
      return [];
    };
    
    // Count clusters by size
    clusters.forEach(cluster => {
      const size = getClusterMembers(cluster).length;
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
    // Generate test data for simulation
    const testMatches = this.simulateMatchResults();
    
    // Generate real metrics based on clusters produced by transitive closure
    const closureResults = this.simulateTransitiveClosure(testMatches, {
      maxDepth: this.maxDepth,
      confidenceThreshold: this.confidenceThreshold
    });
    
    // Extract clusters from the results
    const clusters = closureResults.clusters || [];
    
    // Generate metrics
    const metrics = this.generateMetrics(clusters, testMatches);
    
    return {
      clusterCount: metrics.totalClusters || 0,
      recordsInClusters: metrics.totalRecordsInClusters || 0,
      averageClusterSize: metrics.averageClusterSize ? metrics.averageClusterSize.toFixed(2) : '0.00',
      largestClusterSize: metrics.largestClusterSize || 0,
      transitivityScore: metrics.transitivityScore ? metrics.transitivityScore.toFixed(2) : '0.00',
      clusterSizeDistribution: metrics.clusterSizeDistribution || { counts: {}, percentages: {} },
      
      // Additional metrics for analysis
      edgeMetrics: {
        directEdges: metrics.totalDirectEdges || 0,
        transitiveEdges: metrics.totalTransitiveEdges || 0,
        avgConfidence: metrics.averageAverageConfidence ? metrics.averageAverageConfidence.toFixed(2) : '0.00',
      },
      
      // Performance metrics
      performanceMetrics: {
        memoryUsage: process.memoryUsage ? process.memoryUsage().heapUsed / 1024 / 1024 : 0,
        executionTime: closureResults.executionTime || 0,
      }
    };
  }
  
  /**
   * Simulates transitive closure for a set of matches
   * @param {Array<Object>} matches - Array of match objects with source, target, and confidence
   * @param {Object} options - Options for transitive closure
   * @param {number} [options.maxDepth=this.maxDepth] - Maximum depth for transitive closure
   * @param {number} [options.confidenceThreshold=this.confidenceThreshold] - Minimum confidence threshold
   * @param {boolean} [options.trackPaths=false] - Whether to track match paths
   * @param {boolean} [options.detectCycles=true] - Whether to detect and handle cycles
   * @returns {Object} - Object containing transitive matches and cluster information
   */
  simulateTransitiveClosure(matches, options = {}) {
    // Use provided options or fall back to instance defaults
    const maxDepth = options.maxDepth || this.maxDepth;
    const confidenceThreshold = options.confidenceThreshold || this.confidenceThreshold;
    const trackPaths = options.trackPaths || false;
    const detectCycles = options.detectCycles !== undefined ? options.detectCycles : true;
    
    // Filter matches by confidence threshold
    const filteredMatches = matches.filter(match => match.confidence >= confidenceThreshold);
    
    // Build adjacency list representation of the graph
    const graph = new Map();
    const reverseGraph = new Map(); // For bidirectional traversal
    
    // Track all unique nodes
    const allNodes = new Set();
    
    // Initialize graph
    filteredMatches.forEach(match => {
      const source = match.source || match[this.sourceIdField];
      const target = match.target || match[this.targetIdField];
      
      // Add nodes to the set of all nodes
      allNodes.add(source);
      allNodes.add(target);
      
      // Add edge to forward graph
      if (!graph.has(source)) {
        graph.set(source, new Set());
      }
      graph.get(source).add(target);
      
      // Add edge to reverse graph for bidirectional traversal
      if (!reverseGraph.has(target)) {
        reverseGraph.set(target, new Set());
      }
      reverseGraph.get(target).add(source);
    });
    
    // Find all transitive matches
    const transitiveMatches = [];
    const visitedPairs = new Set(); // Track visited pairs to avoid duplicates
    
    // Helper function to add a match to the results
    const addMatch = (source, target, depth, path, confidence) => {
      const pairKey = `${source}-${target}`;
      if (!visitedPairs.has(pairKey)) {
        visitedPairs.add(pairKey);
        transitiveMatches.push({
          source,
          target,
          depth,
          path: trackPaths ? path : undefined,
          confidence
        });
      }
    };
    
    // Helper function for depth-first search to find transitive matches
    const dfs = (node, depth, path, visited, targetConfidences) => {
      if (depth > maxDepth) return;
      
      // Get neighbors
      const neighbors = graph.get(node) || new Set();
      
      for (const neighbor of neighbors) {
        // Skip if this would create a cycle and cycle detection is enabled
        if (detectCycles && visited.has(neighbor)) continue;
        
        // Find the match object for this edge
        const matchObj = filteredMatches.find(m => 
          (m.source === node && m.target === neighbor) || 
          (m[this.sourceIdField] === node && m[this.targetIdField] === neighbor)
        );
        
        if (!matchObj) continue;
        
        const confidence = matchObj.confidence || matchObj[this.confidenceField];
        
        // For direct matches (depth 1), add to results
        if (depth === 1) {
          addMatch(path[0], neighbor, depth, [...path, neighbor], confidence);
          targetConfidences.set(neighbor, confidence);
        } else {
          // For transitive matches, calculate propagated confidence
          // Use minimum confidence along the path as the transitive confidence
          const sourceConfidence = targetConfidences.get(node) || 1.0;
          const transitiveConfidence = Math.min(sourceConfidence, confidence);
          
          // Only add if confidence is above threshold
          if (transitiveConfidence >= confidenceThreshold) {
            addMatch(path[0], neighbor, depth, [...path, neighbor], transitiveConfidence);
            targetConfidences.set(neighbor, transitiveConfidence);
          }
        }
        
        // Continue DFS if within depth limit
        if (depth < maxDepth) {
          const newVisited = new Set(visited);
          newVisited.add(neighbor);
          
          dfs(neighbor, depth + 1, [...path, neighbor], newVisited, new Map(targetConfidences));
        }
      }
    };
    
    // Start DFS from each node
    for (const node of allNodes) {
      const visited = new Set([node]);
      const path = [node];
      const targetConfidences = new Map();
      
      dfs(node, 1, path, visited, targetConfidences);
    }
    
    // Find clusters (connected components)
    const clusters = this.findClusters(transitiveMatches);
    
    return {
      directMatches: filteredMatches.length,
      transitiveMatches: transitiveMatches.length - filteredMatches.length,
      totalMatches: transitiveMatches.length,
      matches: transitiveMatches,
      clusters: clusters
    };
  }
  
  /**
   * Finds clusters (connected components) in the match graph
   * @private
   * @param {Array<Object>} matches - Array of match objects
   * @returns {Array<Object>} - Array of cluster objects
   */
  findClusters(matches) {
    // Build undirected graph
    const graph = new Map();
    const allNodes = new Set();
    
    matches.forEach(match => {
      const source = match.source || match[this.sourceIdField];
      const target = match.target || match[this.targetIdField];
      
      allNodes.add(source);
      allNodes.add(target);
      
      // Add edge in both directions for undirected graph
      if (!graph.has(source)) {
        graph.set(source, new Set());
      }
      graph.get(source).add(target);
      
      if (!graph.has(target)) {
        graph.set(target, new Set());
      }
      graph.get(target).add(source);
    });
    
    // Find connected components using DFS
    const visited = new Set();
    const clusters = [];
    
    for (const node of allNodes) {
      if (!visited.has(node)) {
        const cluster = [];
        this.dfs(node, graph, visited, cluster);
        
        if (cluster.length > 0) {
          // Calculate cluster metrics
          const clusterObj = {
            id: `cluster_${clusters.length + 1}`,
            size: cluster.length,
            members: cluster,
            metrics: {
              directEdges: this.countDirectEdges(cluster, matches),
              transitiveEdges: this.countTransitiveEdges(cluster, matches),
              averageConfidence: this.calculateAverageConfidence(cluster, matches)
            }
          };
          
          clusters.push(clusterObj);
        }
      }
    }
    
    return clusters;
  }
}

module.exports = { TransitiveMatcher };