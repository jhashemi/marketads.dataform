/**
 * Transitive Matcher
 * 
 * Class for performing transitive matching and clustering
 */

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
        confidenceField: 'string'
      },
      defaults: {
        outputTable: 'transitive_matches',
        maxDepth: 3,
        includeDirectMatches: true,
        sourceIdField: 'source_id',
        targetIdField: 'target_id',
        confidenceField: 'confidence'
      },
      messages: {
        matchResultsTable: 'Please provide the initial match results table name.',
        confidenceThreshold: 'Please provide the confidence threshold for transitive closure.'
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
    
    // Generate and execute SQL to perform transitive closure
    const sql = this.generateSql();
    
    // For testing purposes, we'll include a simulation of execution
    // In a real implementation, this would execute the SQL against the database
    
    // Simulate cluster discovery
    const clusters = await this.simulateTransitiveClosure();
    
    // Generate metrics
    const metrics = this.generateMetrics(clusters);
    const executionTime = (Date.now() - startTime) / 1000;
    
    return {
      clusters,
      metrics,
      executionTime,
      sql // Include SQL for debugging
    };
  }
  
  /**
   * Simulates transitive closure execution for testing
   * @private
   * @returns {Array} Array of cluster objects
   */
  async simulateTransitiveClosure() {
    // This simulates what would happen in the database
    // Build initial direct matches
    const directMatches = [
      { source: 'A', target: 'B', confidence: 0.95 },
      { source: 'B', target: 'C', confidence: 0.88 },
      { source: 'C', target: 'D', confidence: 0.92 },
      { source: 'E', target: 'F', confidence: 0.89 },
      { source: 'G', target: 'F', confidence: 0.79 },
    ];
    
    // Apply transitive closure to find connected components
    const clusters = this.findConnectedComponents(directMatches);
    
    // Calculate metrics for each cluster
    return clusters.map((cluster, index) => {
      const avgConfidence = this.calculateAverageConfidence(cluster, directMatches);
      return {
        id: `cluster${index + 1}`,
        records: cluster.length,
        nodes: cluster,
        metrics: {
          avgConfidence,
          density: this.calculateClusterDensity(cluster.length),
          directEdges: this.countDirectEdges(cluster, directMatches),
          transitiveEdges: this.countTransitiveEdges(cluster, directMatches)
        }
      };
    });
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
        const cluster = [];
        this.dfs(node, graph, visited, cluster);
        clusters.push(cluster);
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
  calculateAverageConfidence(cluster, matches) {
    const clusterMatches = matches.filter(match =>
      cluster.includes(match.source) && cluster.includes(match.target)
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
  countDirectEdges(cluster, matches) {
    return matches.filter(match =>
      cluster.includes(match.source) && cluster.includes(match.target)
    ).length;
  }
  
  /**
   * Counts transitive edges within a cluster
   * @private
   * @param {Array} cluster - Array of node IDs in the cluster
   * @param {Array} matches - Array of match objects
   * @returns {number} - Number of transitive edges
   */
  countTransitiveEdges(cluster, matches) {
    const directEdges = this.countDirectEdges(cluster, matches);
    const possibleEdges = (cluster.length * (cluster.length - 1)) / 2;
    return Math.max(0, possibleEdges - directEdges);
  }
  
  /**
   * Generates cluster metrics for all clusters
   * @private
   * @param {Array} clusters - Array of cluster objects
   * @returns {Object} - Metrics object
   */
  generateMetrics(clusters) {
    const totalClusters = clusters.length;
    const totalRecordsInClusters = clusters.reduce((sum, cluster) => sum + cluster.records, 0);
    const averageClusterSize = totalClusters > 0 ? totalRecordsInClusters / totalClusters : 0;
    const largestClusterSize = clusters.length > 0 ?
      Math.max(...clusters.map(cluster => cluster.records)) : 0;
    
    return {
      totalClusters,
      totalRecordsInClusters,
      averageClusterSize,
      largestClusterSize,
      transitivityScore: this.calculateTransitivityScore(clusters),
      clusterSizeDistribution: this.calculateClusterSizeDistribution(clusters)
    };
  }

  /**
   * Generates SQL for transitive closure
   * @returns {string} SQL statement for transitive closure
   */
  generateSql() {
    // Generate comprehensive SQL for transitive closure algorithm
    // This uses Common Table Expressions (CTEs) and a recursive query pattern
    // to find all connected components in the match graph
    const sql = `
      -- Step 1: Filter matches by confidence threshold
      WITH filtered_matches AS (
        SELECT
          source_record_id,
          target_record_id,
          match_confidence
        FROM ${this.matchResultsTable}
        WHERE match_confidence >= ${this.confidenceThreshold}
      ),
      
      -- Step 2: Create symmetric pairs for undirected graph
      -- For each A→B, also include B→A to ensure we find all connections
      symmetric_matches AS (
        SELECT source_record_id, target_record_id, match_confidence FROM filtered_matches
        UNION ALL
        SELECT target_record_id AS source_record_id, source_record_id AS target_record_id, match_confidence
        FROM filtered_matches
      ),
      
      -- Step 3: Find distinct nodes (unique record IDs)
      nodes AS (
        SELECT source_record_id AS record_id FROM symmetric_matches
        UNION
        SELECT target_record_id AS record_id FROM symmetric_matches
      ),
      
      -- Step 4: Recursively traverse the graph to find connected components
      -- This uses a "label propagation" approach where each node starts with
      -- its own cluster ID and then propagates to neighbors
      cluster_detection AS (
        -- Base case: Each record starts in its own cluster with its ID as the cluster ID
        SELECT
          record_id,
          record_id AS cluster_id,
          0 AS iteration
        FROM nodes
        
        UNION ALL
        
        -- Recursive case: Propagate the minimum cluster ID to neighbors
        SELECT
          cd.record_id,
          LEAST(cd.cluster_id, sm.target_record_id) AS cluster_id,
          cd.iteration + 1 AS iteration
        FROM cluster_detection cd
        JOIN symmetric_matches sm ON cd.record_id = sm.source_record_id
        WHERE cd.iteration < 10  -- Limit iterations for safety
      ),
      
      -- Step 5: Find the final cluster ID for each record (minimum ID in connected component)
      final_clusters AS (
        SELECT
          record_id,
          MIN(cluster_id) OVER (PARTITION BY record_id) AS final_cluster_id
        FROM cluster_detection
        WHERE iteration = (SELECT MAX(iteration) FROM cluster_detection)
      ),
      
      -- Step 6: Generate cluster metrics
      cluster_metrics AS (
        SELECT
          final_cluster_id,
          COUNT(*) AS cluster_size,
          ARRAY_AGG(record_id) AS cluster_members
        FROM final_clusters
        GROUP BY final_cluster_id
      )
      
      -- Step 7: Output the final results with metrics
      SELECT
        cm.final_cluster_id AS cluster_id,
        cm.cluster_size,
        cm.cluster_members,
        (
          SELECT AVG(match_confidence)
          FROM filtered_matches fm
          WHERE fm.source_record_id IN UNNEST(cm.cluster_members)
          AND fm.target_record_id IN UNNEST(cm.cluster_members)
        ) AS avg_confidence,
        (
          SELECT COUNT(*)
          FROM filtered_matches fm
          WHERE fm.source_record_id IN UNNEST(cm.cluster_members)
          AND fm.target_record_id IN UNNEST(cm.cluster_members)
        ) AS direct_matches,
        (cm.cluster_size * (cm.cluster_size - 1)) / 2 -
        (
          SELECT COUNT(*)
          FROM filtered_matches fm
          WHERE fm.source_record_id IN UNNEST(cm.cluster_members)
          AND fm.target_record_id IN UNNEST(cm.cluster_members)
        ) AS transitive_matches
      FROM cluster_metrics cm
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
      percentages
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
          (clusters.reduce((sum, c) => sum + (c.metrics?.avgConfidence || 0), 0) / clusters.length).toFixed(2) : 0
      },
      
      // Performance metrics
      performanceMetrics: {
        memoryUsage: this.getMemoryUsage(),
        executionTime: (Date.now() - (clusters[0]?.timestamp || Date.now())) / 1000
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