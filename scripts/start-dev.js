#!/usr/bin/env node

/**
 * Development Server Starter
 * Ensures port 5173 is available before starting Vite
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const PORT = 5173;
const WAIT_TIME_MS = 1500;

// Colors
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(msg, color = c.reset) {
  console.log(`${color}${msg}${c.reset}`);
}

async function killPort(port) {
  log(`\n🔍 Checking port ${port}...`, c.blue);

  try {
    await execAsync(`npx kill-port ${port}`);
    log(`✅ Port ${port} cleared`, c.green);
  } catch (error) {
    log(`ℹ️  Port ${port} was already free`, c.yellow);
  }

  log(`⏳ Waiting ${WAIT_TIME_MS}ms for OS to release port...`, c.yellow);
  await new Promise(resolve => setTimeout(resolve, WAIT_TIME_MS));
  log(`✅ Port ready!`, c.green);
}

async function startVite() {
  log(`\n🚀 Starting Vite dev server on port ${PORT}...`, c.bright + c.blue);
  log(`========================================\n`, c.blue);

  // Use spawn instead of exec for better process management
  const vite = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    stdio: 'inherit',
    shell: true
  });

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    log('\n\n👋 Shutting down dev server...', c.yellow);
    vite.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    vite.kill('SIGTERM');
    process.exit(0);
  });

  // Handle Vite process exit
  vite.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      log(`\n❌ Vite exited with code ${code}`, c.red);
      process.exit(code || 1);
    }
  });

  vite.on('error', (error) => {
    log(`\n❌ Failed to start Vite: ${error.message}`, c.red);
    process.exit(1);
  });
}

async function main() {
  log('\n========================================', c.blue);
  log('   Bisedge Quotation Dashboard', c.bright);
  log('========================================', c.blue);

  try {
    await killPort(PORT);
    await startVite();
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, c.red);
    process.exit(1);
  }
}

main();
