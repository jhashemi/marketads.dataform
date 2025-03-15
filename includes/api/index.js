/**
 * API Entry Point
 * Starting point for the MarketAds Data Matching API
 */

const { startServer } = require('./server');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Start server with port from environment or default
const PORT = process.env.PORT || 3000;

// Start server and handle errors
startServer(PORT)
  .then((server) => {
    console.log(`API server started successfully on port ${PORT}`);
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });
    
    process.on('SIGINT', () => {
      console.log('SIGINT signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });
  })
  .catch((error) => {
    console.error('Failed to start API server:', error);
    process.exit(1);
  }); 