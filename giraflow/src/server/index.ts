#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createServer } from './server.js';
import { createWatcher } from './watcher.js';

// Simple CLI argument parsing
function parseArgs(): { filePath: string; port: number; openBrowser: boolean } {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    console.log(`
  Giraflow

  Usage: giraflow <file.giraflow.json> [options]

  Options:
    -p, --port <port>    Port to run server on (default: 3000)
    --no-open            Don't open browser automatically
    -h, --help           Show this help message

  Examples:
    giraflow model.giraflow.json
    giraflow model.giraflow.json --port 8080
    giraflow model.giraflow.json --no-open
    `);
    process.exit(0);
  }

  let filePath = '';
  let port = 3000;
  let openBrowser = true;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-p' || arg === '--port') {
      const portStr = args[++i];
      port = parseInt(portStr, 10);
      if (isNaN(port)) {
        console.error(`Invalid port: ${portStr}`);
        process.exit(1);
      }
    } else if (arg === '--no-open') {
      openBrowser = false;
    } else if (!arg.startsWith('-')) {
      filePath = arg;
    }
  }
  
  if (!filePath) {
    console.error('Error: No file specified');
    process.exit(1);
  }
  
  // Resolve to absolute path
  filePath = path.resolve(filePath);
  
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }
  
  return { filePath, port, openBrowser };
}

async function main(): Promise<void> {
  const { filePath, port, openBrowser } = parseArgs();
  
  const server = createServer({ filePath, port });
  const watcher = createWatcher({
    filePath,
    onChange: () => server.triggerReload(),
  });
  
  // Handle graceful shutdown
  const shutdown = () => {
    console.log('\n  Shutting down...\n');
    watcher.stop();
    server.stop();
    process.exit(0);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  
  // Start services
  server.start();
  watcher.start();
  
  // Open browser if requested
  if (openBrowser) {
    try {
      const open = (await import('open')).default;
      await open(`http://localhost:${port}`);
    } catch {
      // Ignore if open fails
    }
  }
}

main().catch(console.error);
