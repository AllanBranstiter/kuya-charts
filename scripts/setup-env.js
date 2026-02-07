#!/usr/bin/env node

/**
 * Setup Environment Variables Script
 * 
 * This script helps developers set up their local .env files by:
 * 1. Copying .env.example to .env for both backend and frontend
 * 2. Optionally prompting for required values
 * 3. Validating the setup
 * 
 * Usage:
 *   node scripts/setup-env.js
 *   npm run setup-env (if added to package.json)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

/**
 * Check if a file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Copy .env.example to .env if it doesn't exist
 */
function copyEnvExample(dir, name) {
  const examplePath = path.join(PROJECT_ROOT, dir, '.env.example');
  const envPath = path.join(PROJECT_ROOT, dir, '.env');

  if (!fileExists(examplePath)) {
    log.error(`Missing ${dir}/.env.example file`);
    return false;
  }

  if (fileExists(envPath)) {
    log.warn(`${name} .env file already exists, skipping...`);
    return true;
  }

  try {
    fs.copyFileSync(examplePath, envPath);
    log.success(`Created ${name} .env file from .env.example`);
    return true;
  } catch (error) {
    log.error(`Failed to create ${name} .env file: ${error.message}`);
    return false;
  }
}

/**
 * Read and parse .env file
 */
function readEnvFile(dir) {
  const envPath = path.join(PROJECT_ROOT, dir, '.env');
  
  if (!fileExists(envPath)) {
    return {};
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};

  content.split('\n').forEach((line) => {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || !line.trim()) {
      return;
    }

    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      env[key] = value;
    }
  });

  return env;
}

/**
 * Update .env file with new values
 */
function updateEnvFile(dir, updates) {
  const envPath = path.join(PROJECT_ROOT, dir, '.env');
  
  if (!fileExists(envPath)) {
    log.error(`${dir}/.env file not found`);
    return false;
  }

  try {
    let content = fs.readFileSync(envPath, 'utf-8');

    Object.entries(updates).forEach(([key, value]) => {
      // Replace the value for existing key
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
      }
    });

    fs.writeFileSync(envPath, content, 'utf-8');
    return true;
  } catch (error) {
    log.error(`Failed to update ${dir}/.env: ${error.message}`);
    return false;
  }
}

/**
 * Check if required backend variables are set
 */
function checkBackendEnv() {
  const env = readEnvFile('backend');
  const required = ['DATABASE_URL', 'JWT_SECRET', 'ALPHA_VANTAGE_API_KEY'];
  const missing = [];

  required.forEach((key) => {
    const value = env[key];
    if (!value || value.includes('your_') || value.includes('_here')) {
      missing.push(key);
    }
  });

  return { env, missing };
}

/**
 * Check if required frontend variables are set
 */
function checkFrontendEnv() {
  const env = readEnvFile('frontend');
  const required = ['VITE_API_BASE_URL', 'VITE_WS_URL'];
  const missing = [];

  required.forEach((key) => {
    const value = env[key];
    if (!value) {
      missing.push(key);
    }
  });

  return { env, missing };
}

/**
 * Main setup function
 */
async function setup() {
  log.header('🚀 Kuya Charts - Environment Setup');

  console.log('This script will help you set up your local development environment.\n');

  // Step 1: Copy .env.example files
  log.header('Step 1: Creating .env files');
  
  const backendCreated = copyEnvExample('backend', 'Backend');
  const frontendCreated = copyEnvExample('frontend', 'Frontend');

  if (!backendCreated || !frontendCreated) {
    log.error('\nFailed to create .env files. Please check the errors above.');
    rl.close();
    process.exit(1);
  }

  // Step 2: Check for missing required variables
  log.header('Step 2: Checking required variables');

  const { missing: backendMissing } = checkBackendEnv();
  const { missing: frontendMissing } = checkFrontendEnv();

  if (backendMissing.length === 0 && frontendMissing.length === 0) {
    log.success('All required variables are set!');
    log.info('\nYou can now start the development servers:');
    console.log('  Backend:  cd backend && npm run dev');
    console.log('  Frontend: cd frontend && npm run dev\n');
    rl.close();
    return;
  }

  // Step 3: Prompt for missing variables (optional)
  console.log('\nThe following required variables need to be configured:');
  
  if (backendMissing.length > 0) {
    log.warn(`Backend: ${backendMissing.join(', ')}`);
  }
  
  if (frontendMissing.length > 0) {
    log.warn(`Frontend: ${frontendMissing.join(', ')}`);
  }

  console.log('\nWould you like to set them now? (y/n)');
  const answer = await question('> ');

  if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
    log.info('\nYou can manually edit the .env files:');
    console.log('  Backend:  backend/.env');
    console.log('  Frontend: frontend/.env\n');
    rl.close();
    return;
  }

  // Step 4: Prompt for backend variables
  if (backendMissing.length > 0) {
    log.header('Configuring Backend Variables');

    const updates = {};

    for (const key of backendMissing) {
      console.log(`\n${colors.bright}${key}${colors.reset}`);
      
      if (key === 'DATABASE_URL') {
        console.log('Database connection string (e.g., postgresql://user:pass@localhost:5432/kuya_charts)');
        console.log('Press Enter to keep default: postgresql://postgres:postgres@localhost:5432/kuya_charts');
        const value = await question('> ');
        if (value.trim()) {
          updates[key] = value.trim();
        }
      } else if (key === 'JWT_SECRET') {
        console.log('JWT secret key (minimum 32 characters)');
        console.log('Press Enter to generate a random secret');
        const value = await question('> ');
        if (value.trim()) {
          updates[key] = value.trim();
        } else {
          // Generate random secret
          const crypto = await import('crypto');
          updates[key] = crypto.randomBytes(32).toString('base64');
          log.success(`Generated random JWT secret`);
        }
      } else if (key === 'ALPHA_VANTAGE_API_KEY') {
        console.log('Alpha Vantage API key (get one at https://www.alphavantage.co/support/#api-key)');
        console.log('Press Enter to skip (you can add it later)');
        const value = await question('> ');
        if (value.trim()) {
          updates[key] = value.trim();
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      updateEnvFile('backend', updates);
      log.success('Backend .env file updated');
    }
  }

  // Step 5: Frontend variables (usually defaults are fine for local dev)
  if (frontendMissing.length > 0) {
    log.info('\nFrontend variables are set to default values for local development.');
    log.info('No changes needed unless you\'re using different ports.');
  }

  // Final summary
  log.header('✨ Setup Complete!');

  const { missing: finalBackendMissing } = checkBackendEnv();
  const { missing: finalFrontendMissing } = checkFrontendEnv();

  if (finalBackendMissing.length > 0) {
    log.warn('Still missing backend variables:');
    console.log(`  ${finalBackendMissing.join(', ')}`);
    console.log('\nEdit backend/.env to add these manually.');
  }

  if (finalFrontendMissing.length > 0) {
    log.warn('Still missing frontend variables:');
    console.log(`  ${finalFrontendMissing.join(', ')}`);
    console.log('\nEdit frontend/.env to add these manually.');
  }

  console.log('\n📚 Next Steps:');
  console.log('1. Ensure PostgreSQL is running (optional)');
  console.log('2. Ensure Redis is running (optional)');
  console.log('3. Start backend: cd backend && npm run dev');
  console.log('4. Start frontend: cd frontend && npm run dev');
  console.log('\n📖 For more info, see README.md or backend/.env.example\n');

  rl.close();
}

// Run the setup
setup().catch((error) => {
  log.error(`Setup failed: ${error.message}`);
  rl.close();
  process.exit(1);
});
