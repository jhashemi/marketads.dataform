const os = require('os');
const fs = require('fs');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);

class ResourceMonitor {
  constructor(config = {}) {
    this.config = {
      sampleInterval: config.sampleInterval || 1000, // ms
      enableCPU: config.enableCPU !== false,
      enableMemory: config.enableMemory !== false,
      enableIO: config.enableIO !== false,
      logLevel: config.logLevel || 'info'
    };
    
    this.metrics = {
      cpu: [],
      memory: [],
      io: []
    };
    
    this.startTime = null;
    this.endTime = null;
    this.isMonitoring = false;
  }

  async start() {
    if (this.isMonitoring) {
      throw new Error('Monitoring already in progress');
    }
    
    this.startTime = Date.now();
    this.isMonitoring = true;
    this.metrics = { cpu: [], memory: [], io: [] };
    
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.sampleInterval);
  }

  async stop() {
    if (!this.isMonitoring) {
      throw new Error('No monitoring in progress');
    }
    
    clearInterval(this.monitoringInterval);
    this.endTime = Date.now();
    this.isMonitoring = false;
    
    return this.generateReport();
  }

  async collectMetrics() {
    const timestamp = Date.now();
    
    if (this.config.enableCPU) {
      const cpuUsage = os.loadavg()[0];
      this.metrics.cpu.push({ timestamp, value: cpuUsage });
    }
    
    if (this.config.enableMemory) {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      this.metrics.memory.push({
        timestamp,
        total: totalMem,
        used: usedMem,
        percentage: (usedMem / totalMem) * 100
      });
    }
    
    if (this.config.enableIO) {
      try {
        const diskStats = await readFile('/proc/diskstats', 'utf8');
        const ioMetrics = this.parseIOStats(diskStats);
        this.metrics.io.push({ timestamp, ...ioMetrics });
      } catch (error) {
        // On Windows or if /proc/diskstats is not available
        const perfData = await this.getWindowsIOStats();
        this.metrics.io.push({ timestamp, ...perfData });
      }
    }
  }

  async getWindowsIOStats() {
    // Windows-specific I/O monitoring using PowerShell
    try {
      const { execSync } = require('child_process');
      const cmd = 'powershell "Get-Counter \\"\\PhysicalDisk(_Total)\\Disk Reads/sec\\", \\"\\PhysicalDisk(_Total)\\Disk Writes/sec\\""';
      const output = execSync(cmd).toString();
      
      // Parse PowerShell output
      const matches = output.match(/\d+(\.\d+)?/g);
      return {
        reads: parseFloat(matches[0] || 0),
        writes: parseFloat(matches[1] || 0)
      };
    } catch (error) {
      return { reads: 0, writes: 0 };
    }
  }

  parseIOStats(stats) {
    // Parse Linux /proc/diskstats format
    const lines = stats.split('\n');
    let totalReads = 0;
    let totalWrites = 0;
    
    for (const line of lines) {
      const fields = line.trim().split(/\s+/);
      if (fields.length >= 14) {
        totalReads += parseInt(fields[3], 10) || 0;  // Field 4: reads completed
        totalWrites += parseInt(fields[7], 10) || 0; // Field 8: writes completed
      }
    }
    
    return { reads: totalReads, writes: totalWrites };
  }

  generateReport() {
    const duration = this.endTime - this.startTime;
    const report = {
      duration,
      cpu: this.summarizeMetrics(this.metrics.cpu),
      memory: this.summarizeMetrics(this.metrics.memory),
      io: this.summarizeMetrics(this.metrics.io)
    };
    
    if (this.config.logLevel === 'debug') {
      report.rawMetrics = this.metrics;
    }
    
    return report;
  }

  summarizeMetrics(metricArray) {
    if (!metricArray || metricArray.length === 0) {
      return null;
    }
    
    const values = metricArray.map(m => 
      typeof m.value !== 'undefined' ? m.value : 
      typeof m.percentage !== 'undefined' ? m.percentage :
      (m.reads + m.writes) || 0
    );
    
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      samples: metricArray.length
    };
  }
}

module.exports = ResourceMonitor; 