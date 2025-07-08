#!/usr/bin/env node

// Simple wrapper to run the main sync script in test mode
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Run the main sync script with --test flag
const syncScript = path.join(__dirname, '../.github/scripts/sync-content.js');
const child = spawn('node', [syncScript, '--test'], { 
  stdio: 'inherit',
  cwd: process.cwd()
});

child.on('close', (code) => {
  process.exit(code);
});