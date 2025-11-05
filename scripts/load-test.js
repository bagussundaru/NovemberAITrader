#!/usr/bin/env node

// Load Testing Script for Live Trading Bot
// Requirements: 7.1, 7.2, 7.3, 7.4

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

class LoadTester {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.concurrency = options.concurrency || 10;
    this.duration = options.duration || 60000; // 1 minute
    this.requestInterval = options.requestInterval || 1000; // 1 second
    this.endpoints = options.endpoints || [
      '/api/health',
      '/api/metrics',
      '/api/trading/status',
      '/api/trading/dashboard'
    ];
    
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      responseTimes: [],
      errorCounts: {},
      statusCodes: {}
    };
  }

  async makeRequest(endpoint) {
    const startTime = performance.now();
    const url = `${this.baseUrl}${endpoint}`;
    
    return new Promise((resolve) => {
      const client = url.startsWith('https') ? https : http;
      
      const req = client.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          resolve({
            success: true,
            statusCode: res.statusCode,
            responseTime,
            dataLength: data.length,
            endpoint
          });
        });
      });
      
      req.on('error', (error) => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        resolve({
          success: false,
          error: error.message,
          responseTime,
          endpoint
        });
      });
      
      req.setTimeout(10000, () => {
        req.destroy();
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        resolve({
          success: false,
          error: 'Request timeout',
          responseTime,
          endpoint
        });
      });
    });
  }

  updateResults(result) {
    this.results.totalRequests++;
    
    if (result.success) {
      this.results.successfulRequests++;
      
      // Update status code counts
      const statusCode = result.statusCode || 'unknown';
      this.results.statusCodes[statusCode] = (this.results.statusCodes[statusCode] || 0) + 1;
    } else {
      this.results.failedRequests++;
      
      // Update error counts
      const error = result.error || 'unknown';
      this.results.errorCounts[error] = (this.results.errorCounts[error] || 0) + 1;
    }
    
    // Update response time statistics
    const responseTime = result.responseTime;
    this.results.responseTimes.push(responseTime);
    this.results.minResponseTime = Math.min(this.results.minResponseTime, responseTime);
    this.results.maxResponseTime = Math.max(this.results.maxResponseTime, responseTime);
    
    // Calculate average response time
    this.results.averageResponseTime = 
      this.results.responseTimes.reduce((sum, time) => sum + time, 0) / 
      this.results.responseTimes.length;
  }

  async runLoadTest() {
    console.log(`Starting load test...`);
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`Concurrency: ${this.concurrency}`);
    console.log(`Duration: ${this.duration}ms`);
    console.log(`Endpoints: ${this.endpoints.join(', ')}`);
    console.log('');

    const startTime = Date.now();
    const workers = [];

    // Create concurrent workers
    for (let i = 0; i < this.concurrency; i++) {
      const worker = this.runWorker(startTime);
      workers.push(worker);
    }

    // Wait for all workers to complete
    await Promise.all(workers);

    return this.generateReport();
  }

  async runWorker(startTime) {
    while (Date.now() - startTime < this.duration) {
      // Select random endpoint
      const endpoint = this.endpoints[Math.floor(Math.random() * this.endpoints.length)];
      
      try {
        const result = await this.makeRequest(endpoint);
        this.updateResults(result);
      } catch (error) {
        this.updateResults({
          success: false,
          error: error.message,
          responseTime: 0,
          endpoint
        });
      }
      
      // Wait before next request
      await new Promise(resolve => setTimeout(resolve, this.requestInterval));
    }
  }

  generateReport() {
    const duration = this.duration / 1000; // Convert to seconds
    const requestsPerSecond = this.results.totalRequests / duration;
    const successRate = (this.results.successfulRequests / this.results.totalRequests) * 100;
    
    // Calculate percentiles
    const sortedTimes = this.results.responseTimes.sort((a, b) => a - b);
    const p50 = this.getPercentile(sortedTimes, 50);
    const p90 = this.getPercentile(sortedTimes, 90);
    const p95 = this.getPercentile(sortedTimes, 95);
    const p99 = this.getPercentile(sortedTimes, 99);

    const report = {
      summary: {
        totalRequests: this.results.totalRequests,
        successfulRequests: this.results.successfulRequests,
        failedRequests: this.results.failedRequests,
        successRate: successRate.toFixed(2) + '%',
        requestsPerSecond: requestsPerSecond.toFixed(2),
        testDuration: duration + 's'
      },
      responseTime: {
        average: this.results.averageResponseTime.toFixed(2) + 'ms',
        minimum: this.results.minResponseTime.toFixed(2) + 'ms',
        maximum: this.results.maxResponseTime.toFixed(2) + 'ms',
        p50: p50.toFixed(2) + 'ms',
        p90: p90.toFixed(2) + 'ms',
        p95: p95.toFixed(2) + 'ms',
        p99: p99.toFixed(2) + 'ms'
      },
      statusCodes: this.results.statusCodes,
      errors: this.results.errorCounts
    };

    this.printReport(report);
    return report;
  }

  getPercentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  printReport(report) {
    console.log('\n' + '='.repeat(60));
    console.log('LOAD TEST RESULTS');
    console.log('='.repeat(60));
    
    console.log('\nSUMMARY:');
    console.log(`  Total Requests:      ${report.summary.totalRequests}`);
    console.log(`  Successful Requests: ${report.summary.successfulRequests}`);
    console.log(`  Failed Requests:     ${report.summary.failedRequests}`);
    console.log(`  Success Rate:        ${report.summary.successRate}`);
    console.log(`  Requests/Second:     ${report.summary.requestsPerSecond}`);
    console.log(`  Test Duration:       ${report.summary.testDuration}`);
    
    console.log('\nRESPONSE TIME:');
    console.log(`  Average:  ${report.responseTime.average}`);
    console.log(`  Minimum:  ${report.responseTime.minimum}`);
    console.log(`  Maximum:  ${report.responseTime.maximum}`);
    console.log(`  50th %:   ${report.responseTime.p50}`);
    console.log(`  90th %:   ${report.responseTime.p90}`);
    console.log(`  95th %:   ${report.responseTime.p95}`);
    console.log(`  99th %:   ${report.responseTime.p99}`);
    
    if (Object.keys(report.statusCodes).length > 0) {
      console.log('\nSTATUS CODES:');
      Object.entries(report.statusCodes).forEach(([code, count]) => {
        console.log(`  ${code}: ${count}`);
      });
    }
    
    if (Object.keys(report.errors).length > 0) {
      console.log('\nERRORS:');
      Object.entries(report.errors).forEach(([error, count]) => {
        console.log(`  ${error}: ${count}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Performance assessment
    this.assessPerformance(report);
  }

  assessPerformance(report) {
    console.log('\nPERFORMANCE ASSESSMENT:');
    
    const successRate = parseFloat(report.summary.successRate);
    const avgResponseTime = parseFloat(report.responseTime.average);
    const requestsPerSecond = parseFloat(report.summary.requestsPerSecond);
    
    // Success rate assessment
    if (successRate >= 99) {
      console.log('  ✅ Excellent success rate');
    } else if (successRate >= 95) {
      console.log('  ⚠️  Good success rate');
    } else {
      console.log('  ❌ Poor success rate - investigate errors');
    }
    
    // Response time assessment
    if (avgResponseTime <= 100) {
      console.log('  ✅ Excellent response time');
    } else if (avgResponseTime <= 500) {
      console.log('  ⚠️  Acceptable response time');
    } else {
      console.log('  ❌ Poor response time - performance optimization needed');
    }
    
    // Throughput assessment
    if (requestsPerSecond >= 100) {
      console.log('  ✅ Excellent throughput');
    } else if (requestsPerSecond >= 50) {
      console.log('  ⚠️  Good throughput');
    } else {
      console.log('  ❌ Low throughput - scaling may be needed');
    }
    
    console.log('');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    
    switch (key) {
      case 'url':
        options.baseUrl = value;
        break;
      case 'concurrency':
        options.concurrency = parseInt(value);
        break;
      case 'duration':
        options.duration = parseInt(value) * 1000; // Convert to ms
        break;
      case 'interval':
        options.requestInterval = parseInt(value);
        break;
      case 'endpoints':
        options.endpoints = value.split(',');
        break;
    }
  }
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Load Testing Script for Live Trading Bot');
    console.log('');
    console.log('Usage: node load-test.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --url <url>           Base URL (default: http://localhost:3000)');
    console.log('  --concurrency <n>     Number of concurrent requests (default: 10)');
    console.log('  --duration <seconds>  Test duration in seconds (default: 60)');
    console.log('  --interval <ms>       Interval between requests in ms (default: 1000)');
    console.log('  --endpoints <list>    Comma-separated list of endpoints to test');
    console.log('  --help, -h            Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node load-test.js --concurrency 20 --duration 120');
    console.log('  node load-test.js --url https://api.example.com --endpoints /health,/metrics');
    return;
  }
  
  const tester = new LoadTester(options);
  
  try {
    await tester.runLoadTest();
  } catch (error) {
    console.error('Load test failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = LoadTester;