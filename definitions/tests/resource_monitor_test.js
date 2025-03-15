const assert = require('assert');
const ResourceMonitor = require('../utils/resource_monitor');

describe('ResourceMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new ResourceMonitor({
      sampleInterval: 100, // Faster sampling for tests
      logLevel: 'debug'
    });
  });

  afterEach(async () => {
    if (monitor.isMonitoring) {
      await monitor.stop();
    }
  });

  it('should initialize with default configuration', () => {
    const defaultMonitor = new ResourceMonitor();
    assert.strictEqual(defaultMonitor.config.sampleInterval, 1000);
    assert.strictEqual(defaultMonitor.config.enableCPU, true);
    assert.strictEqual(defaultMonitor.config.enableMemory, true);
    assert.strictEqual(defaultMonitor.config.enableIO, true);
    assert.strictEqual(defaultMonitor.config.logLevel, 'info');
  });

  it('should start and stop monitoring', async () => {
    await monitor.start();
    assert.strictEqual(monitor.isMonitoring, true);
    assert.notStrictEqual(monitor.startTime, null);

    await new Promise(resolve => setTimeout(resolve, 200)); // Allow for samples

    const report = await monitor.stop();
    assert.strictEqual(monitor.isMonitoring, false);
    assert.notStrictEqual(monitor.endTime, null);
    assert(report.duration > 0);
  });

  it('should collect CPU metrics', async () => {
    await monitor.start();
    await new Promise(resolve => setTimeout(resolve, 200));
    const report = await monitor.stop();

    assert(report.cpu !== null);
    assert(report.cpu.samples > 0);
    assert(report.cpu.min >= 0);
    assert(report.cpu.max <= 100);
    assert(report.cpu.avg >= 0 && report.cpu.avg <= 100);
  });

  it('should collect memory metrics', async () => {
    await monitor.start();
    await new Promise(resolve => setTimeout(resolve, 200));
    const report = await monitor.stop();

    assert(report.memory !== null);
    assert(report.memory.samples > 0);
    assert(report.memory.min >= 0);
    assert(report.memory.max <= 100);
    assert(report.memory.avg >= 0 && report.memory.avg <= 100);
  });

  it('should collect I/O metrics on Windows', async () => {
    await monitor.start();
    
    // Generate some I/O activity
    const fs = require('fs');
    const tempFile = 'test_io.tmp';
    fs.writeFileSync(tempFile, 'test data');
    fs.readFileSync(tempFile);
    fs.unlinkSync(tempFile);

    await new Promise(resolve => setTimeout(resolve, 200));
    const report = await monitor.stop();

    assert(report.io !== null);
    assert(report.io.samples > 0);
    assert(report.io.min >= 0);
    assert(report.io.max >= 0);
    assert(report.io.avg >= 0);
  });

  it('should handle monitoring errors gracefully', async () => {
    // Test starting monitoring twice
    await monitor.start();
    await assert.rejects(async () => {
      await monitor.start();
    }, /Monitoring already in progress/);

    await monitor.stop();

    // Test stopping when not monitoring
    await assert.rejects(async () => {
      await monitor.stop();
    }, /No monitoring in progress/);
  });

  it('should generate detailed reports in debug mode', async () => {
    await monitor.start();
    await new Promise(resolve => setTimeout(resolve, 200));
    const report = await monitor.stop();

    assert(report.rawMetrics);
    assert(Array.isArray(report.rawMetrics.cpu));
    assert(Array.isArray(report.rawMetrics.memory));
    assert(Array.isArray(report.rawMetrics.io));
  });

  it('should respect disabled metrics in configuration', async () => {
    const limitedMonitor = new ResourceMonitor({
      sampleInterval: 100,
      enableCPU: false,
      enableMemory: true,
      enableIO: false
    });

    await limitedMonitor.start();
    await new Promise(resolve => setTimeout(resolve, 200));
    const report = await limitedMonitor.stop();

    assert.strictEqual(report.cpu, null);
    assert(report.memory !== null);
    assert.strictEqual(report.io, null);
  });
});

// Integration test with query execution
describe('ResourceMonitor Integration', () => {
  it('should monitor resource usage during query execution', async () => {
    const monitor = new ResourceMonitor({ sampleInterval: 100 });
    await monitor.start();

    // Simulate a heavy query execution
    const array = new Array(1000000).fill(0);
    array.sort(() => Math.random() - 0.5);

    const report = await monitor.stop();
    
    assert(report.duration >= 0);
    assert(report.cpu.max > report.cpu.min);
    assert(report.memory.max > report.memory.min);
  });
}); 