#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import { program } from 'commander';
import { createServer } from './server.js';
import { createWatcher } from './watcher.js';
import { findGiraflowFiles, promptFileSelection } from './file-selector.js';
import { viewCommand } from './cli/commands/view.js';
import { createCommand } from './cli/commands/create.js';
import { copySchemaCommand } from './cli/commands/copy-schema.js';
import { colors } from './cli/colors.js';

program
  .name('giraflow')
  .description('Giraflow - Live preview server and terminal visualization for .giraflow.json models')
  .version('1.0.0');

// Default command: Server (start server when no subcommand is given)
program
  .argument('[file]', 'Path to .giraflow.json file')
  .option('-p, --port <port>', 'Port to run server on', '3000')
  .option('--no-open', 'Do not open browser automatically')
  .action(async (file?: string, options?: { port: string; open: boolean }) => {
    await startServer(file, options);
  });

// Add subcommands
program.addCommand(viewCommand());
program.addCommand(createCommand());
program.addCommand(copySchemaCommand());

program.addHelpText('after', `
${colors.dim('Commands:')}
  ${colors.cyan('[file]')}        Start live preview server (default)
  ${colors.cyan('view')}          Visualize model in terminal
  ${colors.cyan('create')}        Create new model interactively
  ${colors.cyan('copy-schema')}   Copy schema to current directory

${colors.dim('Examples:')}
  ${colors.white('giraflow')} ${colors.cyan('model.giraflow.json')}           ${colors.dim('# Start live preview server')}
  ${colors.white('giraflow')} ${colors.cyan('view model.giraflow.json -v table')}   ${colors.dim('# Show table view')}
  ${colors.white('giraflow')} ${colors.cyan('create')}                        ${colors.dim('# Interactive model wizard')}
  ${colors.white('giraflow')} ${colors.cyan('copy-schema')}                   ${colors.dim('# Copy schema file')}

${colors.dim('Symbol Legend:')}
  ${colors.event('● Event')}   ${colors.state('◆ State View')}   ${colors.command('▶ Command')}   ${colors.actor('○ Actor')}
`);

async function startServer(file?: string, options?: { port: string; open: boolean }): Promise<void> {
  let filePath = file || '';
  const port = parseInt(options?.port || '3000', 10);
  const openBrowser = options?.open ?? true;

  if (isNaN(port)) {
    console.error(`Invalid port: ${options?.port}`);
    process.exit(1);
  }

  // If no file specified, search for giraflow files in current directory
  if (!filePath) {
    const giraflowFiles = findGiraflowFiles();

    if (giraflowFiles.length === 0) {
      console.error('Error: No *.giraflow.json files found in current directory');
      process.exit(1);
    } else if (giraflowFiles.length === 1) {
      filePath = path.resolve(giraflowFiles[0]);
    } else {
      filePath = await promptFileSelection(giraflowFiles);
    }
  } else {
    // Resolve to absolute path
    filePath = path.resolve(filePath);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

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

program.parseAsync().catch(error => {
  console.error(colors.red('Unexpected error:'), error);
  process.exit(1);
});
