/**
 * Documentation Manager for Record Matching System
 * 
 * Centralizes documentation management, ensuring consistency
 * and providing structured access to documentation.
 */

const fs = require('fs');
const path = require('path');
const marked = require('marked');
const errorHandler = require('./error_handler');
const { withErrorHandling } = errorHandler;

/**
 * Documentation sections enum
 * @readonly
 * @enum {string}
 */
const DocSection = {
  OVERVIEW: 'overview',
  MATCHING: 'matching',
  VALIDATION: 'validation',
  CONFIGURATION: 'configuration',
  DEVELOPMENT: 'development',
  DEPLOYMENT: 'deployment',
  API: 'api',
  EXAMPLES: 'examples',
  REFERENCE: 'reference',
  CONTRIBUTING: 'contributing'
};

/**
 * Documentation Manager class
 */
class DocumentationManager {
  /**
   * Create a new DocumentationManager
   * @param {string} rootDirectory - Root directory for documentation
   */
  constructor(rootDirectory = './docs') {
    this.rootDirectory = rootDirectory;
    this.tableOfContents = {};
    this.docCache = new Map();
    this.initialized = false;
  }
  
  /**
   * Initialize documentation manager
   * @returns {Promise<boolean>} True if successful
   */
  async initialize() {
    try {
      // Ensure documentation directory exists
      if (!fs.existsSync(this.rootDirectory)) {
        fs.mkdirSync(this.rootDirectory, { recursive: true });
      }
      
      // Create section directories if they don't exist
      Object.values(DocSection).forEach(section => {
        const sectionPath = path.join(this.rootDirectory, section);
        if (!fs.existsSync(sectionPath)) {
          fs.mkdirSync(sectionPath, { recursive: true });
        }
      });
      
      // Generate table of contents
      await this.generateTableOfContents();
      
      this.initialized = true;
      return true;
    } catch (error) {
      throw errorHandler.createIOError(`Failed to initialize documentation manager: ${error.message}`, error);
    }
  }
  
  /**
   * Generate table of contents for all documentation
   * @returns {Promise<Object>} Table of contents
   */
  async generateTableOfContents() {
    try {
      const toc = {};
      
      // Process each section
      for (const section of Object.values(DocSection)) {
        const sectionPath = path.join(this.rootDirectory, section);
        toc[section] = { title: this._formatSectionTitle(section), documents: [] };
        
        if (fs.existsSync(sectionPath)) {
          const files = fs.readdirSync(sectionPath);
          
          for (const file of files) {
            if (file.endsWith('.md')) {
              const filePath = path.join(sectionPath, file);
              const content = fs.readFileSync(filePath, 'utf8');
              const title = this._extractTitle(content) || this._formatTitle(file.replace('.md', ''));
              
              toc[section].documents.push({
                id: file.replace('.md', ''),
                title,
                path: filePath,
                lastModified: fs.statSync(filePath).mtime.toISOString()
              });
            }
          }
        }
      }
      
      this.tableOfContents = toc;
      return toc;
    } catch (error) {
      throw errorHandler.createIOError(`Failed to generate table of contents: ${error.message}`, error);
    }
  }
  
  /**
   * Get table of contents
   * @returns {Object} Table of contents
   */
  getTableOfContents() {
    return JSON.parse(JSON.stringify(this.tableOfContents));
  }
  
  /**
   * Get document by section and ID
   * @param {string} section - Section name
   * @param {string} id - Document ID
   * @returns {Promise<Object>} Document content and metadata
   */
  async getDocument(section, id) {
    if (!Object.values(DocSection).includes(section)) {
      throw errorHandler.createValidationError(`Invalid documentation section: ${section}`);
    }
    
    const cacheKey = `${section}:${id}`;
    
    // Check cache first
    if (this.docCache.has(cacheKey)) {
      return this.docCache.get(cacheKey);
    }
    
    const filePath = path.join(this.rootDirectory, section, `${id}.md`);
    
    try {
      if (!fs.existsSync(filePath)) {
        throw errorHandler.createIOError(`Document not found: ${filePath}`);
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      const title = this._extractTitle(content) || this._formatTitle(id);
      const html = marked.parse(content);
      
      const doc = {
        section,
        id,
        title,
        content,
        html,
        path: filePath,
        lastModified: fs.statSync(filePath).mtime.toISOString()
      };
      
      // Cache the document
      this.docCache.set(cacheKey, doc);
      
      return doc;
    } catch (error) {
      throw errorHandler.createIOError(`Failed to get document ${id} in section ${section}: ${error.message}`, error);
    }
  }
  
  /**
   * Create or update a document
   * @param {string} section - Section name
   * @param {string} id - Document ID
   * @param {string} content - Document content
   * @returns {Promise<Object>} Updated document
   */
  async updateDocument(section, id, content) {
    if (!Object.values(DocSection).includes(section)) {
      throw errorHandler.createValidationError(`Invalid documentation section: ${section}`);
    }
    
    try {
      const sectionPath = path.join(this.rootDirectory, section);
      
      // Ensure section directory exists
      if (!fs.existsSync(sectionPath)) {
        fs.mkdirSync(sectionPath, { recursive: true });
      }
      
      const filePath = path.join(sectionPath, `${id}.md`);
      fs.writeFileSync(filePath, content, 'utf8');
      
      // Invalidate cache
      this.docCache.delete(`${section}:${id}`);
      
      // Update table of contents
      await this.generateTableOfContents();
      
      // Return updated document
      return await this.getDocument(section, id);
    } catch (error) {
      throw errorHandler.createIOError(`Failed to update document ${id} in section ${section}: ${error.message}`, error);
    }
  }
  
  /**
   * Delete a document
   * @param {string} section - Section name
   * @param {string} id - Document ID
   * @returns {Promise<boolean>} True if successful
   */
  async deleteDocument(section, id) {
    if (!Object.values(DocSection).includes(section)) {
      throw errorHandler.createValidationError(`Invalid documentation section: ${section}`);
    }
    
    try {
      const filePath = path.join(this.rootDirectory, section, `${id}.md`);
      
      if (!fs.existsSync(filePath)) {
        throw errorHandler.createIOError(`Document not found: ${filePath}`);
      }
      
      fs.unlinkSync(filePath);
      
      // Invalidate cache
      this.docCache.delete(`${section}:${id}`);
      
      // Update table of contents
      await this.generateTableOfContents();
      
      return true;
    } catch (error) {
      throw errorHandler.createIOError(`Failed to delete document ${id} in section ${section}: ${error.message}`, error);
    }
  }
  
  /**
   * Create index.html for browsing documentation
   * @returns {Promise<string>} Path to index.html
   */
  async generateIndex() {
    try {
      const indexPath = path.join(this.rootDirectory, 'index.html');
      const toc = this.getTableOfContents();
      
      let html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Record Matching System Documentation</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
              line-height: 1.6;
              max-width: 900px;
              margin: 0 auto;
              padding: 20px;
              color: #333;
            }
            h1 {
              border-bottom: 2px solid #eaecef;
              padding-bottom: 0.3em;
              color: #24292e;
            }
            h2 {
              margin-top: 24px;
              margin-bottom: 16px;
              font-weight: 600;
              line-height: 1.25;
              border-bottom: 1px solid #eaecef;
              padding-bottom: 0.3em;
            }
            .section {
              margin-bottom: 30px;
            }
            .doc-list {
              list-style-type: none;
              padding: 0;
            }
            .doc-list li {
              margin-bottom: 8px;
            }
            .doc-list a {
              color: #0366d6;
              text-decoration: none;
            }
            .doc-list a:hover {
              text-decoration: underline;
            }
            .last-modified {
              color: #6a737d;
              font-size: 0.85em;
              margin-left: 8px;
            }
            .search-container {
              margin-bottom: 20px;
            }
            #search {
              width: 100%;
              padding: 8px;
              border: 1px solid #ddd;
              border-radius: 4px;
              font-size: 16px;
            }
          </style>
        </head>
        <body>
          <h1>Record Matching System Documentation</h1>
          
          <div class="search-container">
            <input type="text" id="search" placeholder="Search documentation...">
          </div>
          
      `;
      
      // Add sections and documents
      Object.entries(toc).forEach(([sectionKey, section]) => {
        html += `
          <div class="section" data-section="${sectionKey}">
            <h2>${section.title}</h2>
            <ul class="doc-list">
        `;
        
        if (section.documents.length === 0) {
          html += `<li>No documents in this section yet.</li>`;
        } else {
          section.documents.forEach(doc => {
            const relativePath = path.relative(this.rootDirectory, doc.path).replace(/\\/g, '/');
            const lastModified = new Date(doc.lastModified).toLocaleDateString();
            
            html += `
              <li data-title="${doc.title.toLowerCase()}">
                <a href="${relativePath}">${doc.title}</a>
                <span class="last-modified">Last modified: ${lastModified}</span>
              </li>
            `;
          });
        }
        
        html += `
            </ul>
          </div>
        `;
      });
      
      html += `
          <script>
            document.getElementById('search').addEventListener('input', function(e) {
              const query = e.target.value.toLowerCase();
              document.querySelectorAll('.doc-list li').forEach(function(item) {
                const title = item.getAttribute('data-title');
                if (title.includes(query)) {
                  item.style.display = '';
                } else {
                  item.style.display = 'none';
                }
              });
              
              document.querySelectorAll('.section').forEach(function(section) {
                const hasVisibleItems = Array.from(section.querySelectorAll('li'))
                  .some(li => li.style.display !== 'none');
                
                section.style.display = hasVisibleItems ? '' : 'none';
              });
            });
          </script>
        </body>
        </html>
      `;
      
      fs.writeFileSync(indexPath, html, 'utf8');
      return indexPath;
    } catch (error) {
      throw errorHandler.createIOError(`Failed to generate documentation index: ${error.message}`, error);
    }
  }
  
  /**
   * Generate API documentation from JSDoc comments
   * @param {string} sourceDir - Source directory to scan
   * @returns {Promise<Object>} Generated API documentation
   */
  async generateApiDocs(sourceDir) {
    // This would typically use a JSDoc parser like 'jsdoc-to-markdown'
    // For now, placeholder for future implementation
    return {
      generated: true,
      message: 'API documentation generation not fully implemented yet'
    };
  }
  
  /**
   * Consolidate documentation from multiple sources
   * @param {Array<string>} sources - Source directories to scan
   * @returns {Promise<Object>} Consolidation results
   */
  async consolidateDocumentation(sources) {
    try {
      const results = {
        totalFiles: 0,
        consolidatedFiles: 0,
        sections: {}
      };
      
      for (const source of sources) {
        if (!fs.existsSync(source)) {
          console.warn(`Source directory not found: ${source}`);
          continue;
        }
        
        const files = this._findMarkdownFiles(source);
        results.totalFiles += files.length;
        
        for (const file of files) {
          const content = fs.readFileSync(file, 'utf8');
          const filename = path.basename(file);
          const section = this._determineSection(file, content);
          
          // Skip if we can't determine the section
          if (!section) continue;
          
          const id = filename.replace('.md', '');
          await this.updateDocument(section, id, content);
          
          if (!results.sections[section]) {
            results.sections[section] = 0;
          }
          results.sections[section]++;
          results.consolidatedFiles++;
        }
      }
      
      // Generate index after consolidation
      await this.generateIndex();
      
      return results;
    } catch (error) {
      throw errorHandler.createIOError(`Failed to consolidate documentation: ${error.message}`, error);
    }
  }
  
  /**
   * Find all markdown files in a directory recursively
   * @private
   * @param {string} directory - Directory to scan
   * @returns {Array<string>} List of markdown file paths
   */
  _findMarkdownFiles(directory) {
    let results = [];
    
    function traverseDir(dir) {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          traverseDir(fullPath);
        } else if (file.endsWith('.md')) {
          results.push(fullPath);
        }
      }
    }
    
    traverseDir(directory);
    return results;
  }
  
  /**
   * Determine the appropriate section for a document
   * @private
   * @param {string} filePath - Path to the file
   * @param {string} content - File content
   * @returns {string|null} Section name or null if unknown
   */
  _determineSection(filePath, content) {
    // First check if the file is already in a known section
    for (const section of Object.values(DocSection)) {
      if (filePath.includes(`/${section}/`)) {
        return section;
      }
    }
    
    // Then check content for section hints
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('# overview') || 
        lowerContent.includes('introduction') ||
        filePath.includes('readme')) {
      return DocSection.OVERVIEW;
    }
    
    if (lowerContent.includes('# api') ||
        lowerContent.includes('api reference')) {
      return DocSection.API;
    }
    
    if (lowerContent.includes('# configuration') ||
        lowerContent.includes('config')) {
      return DocSection.CONFIGURATION;
    }
    
    if (lowerContent.includes('# validation') ||
        lowerContent.includes('testing')) {
      return DocSection.VALIDATION;
    }
    
    if (lowerContent.includes('# matching') ||
        lowerContent.includes('record linkage') ||
        lowerContent.includes('entity resolution')) {
      return DocSection.MATCHING;
    }
    
    if (lowerContent.includes('# example') ||
        lowerContent.includes('# tutorial')) {
      return DocSection.EXAMPLES;
    }
    
    if (lowerContent.includes('# development') ||
        lowerContent.includes('# contributing')) {
      return DocSection.DEVELOPMENT;
    }
    
    if (lowerContent.includes('# deployment') ||
        lowerContent.includes('# installation')) {
      return DocSection.DEPLOYMENT;
    }
    
    // Default to reference if we can't determine the section
    return DocSection.REFERENCE;
  }
  
  /**
   * Extract title from markdown content
   * @private
   * @param {string} content - Markdown content
   * @returns {string|null} Title or null if not found
   */
  _extractTitle(content) {
    // Look for the first heading
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
  }
  
  /**
   * Format a title from an ID
   * @private
   * @param {string} id - Document ID
   * @returns {string} Formatted title
   */
  _formatTitle(id) {
    return id
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  /**
   * Format a section title
   * @private
   * @param {string} section - Section name
   * @returns {string} Formatted section title
   */
  _formatSectionTitle(section) {
    return section.charAt(0).toUpperCase() + section.slice(1);
  }
}

// Create wrapped methods with error handling
const wrappedMethods = [
  'initialize',
  'generateTableOfContents',
  'getDocument',
  'updateDocument',
  'deleteDocument',
  'generateIndex',
  'generateApiDocs',
  'consolidateDocumentation'
];

const documentationManager = new DocumentationManager();

// Wrap methods with error handling
wrappedMethods.forEach(method => {
  const originalMethod = documentationManager[method];
  documentationManager[method] = withErrorHandling(
    originalMethod.bind(documentationManager),
    errorHandler.ErrorType.IO_ERROR,
    { component: 'DocumentationManager', method }
  );
});

module.exports = {
  DocSection,
  DocumentationManager,
  documentationManager
}; 