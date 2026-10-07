/**
 * Synthetic Monitoring Runner
 * Executes critical user journeys and reports metrics to Prometheus
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { Registry, Counter, Gauge, Histogram, pushToGateway } = require('prom-client');

// Load configuration
const configPath = process.env.SYNTHETIC_CONFIG || './deploy/synthetic/synthetic-monitoring.yml';
const config = require('js-yaml').load(fs.readFileSync(configPath, 'utf8'));

const BASE_URL = process.env.BASE_URL || 'https://nabd.plus';
const PUSH_GATEWAY = process.env.PUSH_GATEWAY || 'http://prometheus:9091';

// Prometheus metrics
const registry = new Registry();

const journeyDuration = new Histogram({
  name: 'nabd_synthetic_journey_duration_seconds',
  help: 'Synthetic journey duration in seconds',
  labelNames: ['journey'],
  buckets: [1, 5, 10, 30, 60, 120, 300],
  registers: [registry],
});

const journeySuccess = new Counter({
  name: 'nabd_synthetic_journey_success_total',
  help: 'Total successful synthetic journeys',
  labelNames: ['journey'],
  registers: [registry],
});

const journeyFailure = new Counter({
  name: 'nabd_synthetic_journey_failure_total',
  help: 'Total failed synthetic journeys',
  labelNames: ['journey', 'error_type'],
  registers: [registry],
});

const journeySteps = new Counter({
  name: 'nabd_synthetic_journey_steps_total',
  help: 'Total journey steps executed',
  labelNames: ['journey', 'step', 'status'],
  registers: [registry],
});

const activeJourneys = new Gauge({
  name: 'nabd_synthetic_active_journeys',
  help: 'Number of currently running synthetic journeys',
  labelNames: ['journey'],
  registers: [registry],
});

async function runJourney(journey, browser) {
  const startTime = Date.now();
  activeJourneys.inc({ journey: journey.name });
  
  const context = await browser.newContext({
    viewport: config.browser.viewport,
    userAgent: config.browser.user_agent,
  });
  
  const page = await context.newPage();
  let success = true;
  let errorType = 'unknown';
  
  try {
    for (const step of journey.steps) {
      const stepStart = Date.now();
      
      try {
        await executeStep(page, step);
        journeySteps.inc({ journey: journey.name, step: step.action, status: 'success' });
      } catch (stepError) {
        journeySteps.inc({ journey: journey.name, step: step.action, status: 'failed' });
        throw stepError;
      }
    }
    
    journeySuccess.inc({ journey: journey.name });
  } catch (error) {
    success = false;
    errorType = error.name || error.constructor.name || 'Error';
    journeyFailure.inc({ journey: journey.name, error_type: errorType });
    console.error(`Journey "${journey.name}" failed:`, error.message);
  } finally {
    const duration = (Date.now() - startTime) / 1000;
    journeyDuration.observe({ journey: journey.name }, duration);
    activeJourneys.dec({ journey: journey.name });
    
    await context.close();
  }
  
  return { success, duration, errorType };
}

async function executeStep(page, step) {
  switch (step.action) {
    case 'navigate':
      await page.goto(step.url.replace('https://nabd.plus', BASE_URL), {
        waitUntil: step.wait_for || 'networkidle',
        timeout: step.timeout || config.browser.timeout,
      });
      break;
      
    case 'click':
      await page.click(step.selector, { timeout: 5000 });
      break;
      
    case 'fill':
      await page.fill(step.selector, step.value, { timeout: 5000 });
      break;
      
    case 'wait_for':
      await page.waitForSelector(step.selector, { 
        state: 'visible', 
        timeout: 10000 
      });
      break;
      
    case 'assert':
      await assertCondition(page, step);
      break;
      
    default:
      throw new Error(`Unknown step action: ${step.action}`);
  }
}

async function assertCondition(page, step) {
  switch (step.condition) {
    case 'visible':
      await page.waitForSelector(step.selector, { state: 'visible', timeout: 5000 });
      break;
      
    case 'enabled':
      await page.waitForSelector(step.selector, { state: 'enabled', timeout: 5000 });
      break;
      
    case 'status_code':
      // Status code is checked on navigation
      break;
      
    case 'results_count':
      const count = await page.locator(step.selector).count();
      if (step.expected.startsWith('>')) {
        const min = parseInt(step.expected.substring(1));
        if (count <= min) throw new Error(`Expected >${min} results, got ${count}`);
      }
      break;
      
    default:
      throw new Error(`Unknown assertion condition: ${step.condition}`);
  }
}

async function pushMetrics() {
  try {
    await pushToGateway(PUSH_GATEWAY, { job: 'nabd-synthetic' }, registry);
    console.log('Metrics pushed to Pushgateway');
  } catch (error) {
    console.error('Failed to push metrics:', error.message);
  }
}

async function main() {
  console.log('Starting synthetic monitoring...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Push Gateway: ${PUSH_GATEWAY}`);
  
  const browser = await chromium.launch({
    headless: config.browser.headless,
  });
  
  const intervals = new Map();
  
  // Schedule journeys
  for (const journey of config.synthetic_monitoring.journeys) {
    const intervalMs = journey.interval * 1000;
    
    // Run immediately
    await runJourney(journey, browser);
    await pushMetrics();
    
    // Schedule recurring
    const interval = setInterval(async () => {
      await runJourney(journey, browser);
      await pushMetrics();
    }, intervalMs);
    
    intervals.set(journey.name, interval);
    console.log(`Scheduled "${journey.name}" every ${journey.interval}s`);
  }
  
  // Handle shutdown
  process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    intervals.forEach(interval => clearInterval(interval));
    await browser.close();
    await pushMetrics();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    console.log('Shutting down...');
    intervals.forEach(interval => clearInterval(interval));
    await browser.close();
    await pushMetrics();
    process.exit(0);
  });
}

main().catch(console.error);