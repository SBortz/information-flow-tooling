#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { findGiraflowFiles, promptFileSelection } from './server/file-selector.js';

const CLI_COMMANDS = ['view', 'create', 'copy-schema', 'copy-ai-instructions', 'copy-example', 'generate-slices', '--help', '-h', '--version', '-V'];

async function main() {
  const args = process.argv.slice(2);

  // Check if this is a CLI command that should be passed to the main CLI
  const firstArg = args[0];
  if (firstArg && CLI_COMMANDS.includes(firstArg)) {
    // Pass through to the main CLI
    const cli = spawn('npx', ['tsx', 'src/server/index.ts', ...args], {
      stdio: 'inherit',
      shell: true,
    });

    cli.on('close', (code) => {
      process.exit(code ?? 0);
    });
    return;
  }

  let filePath: string | undefined;

  // Check if file was passed as argument
  for (const arg of args) {
    if (!arg.startsWith('-') && arg.endsWith('.giraflow.json')) {
      filePath = arg;
      break;
    }
  }

  // If no file specified, search and prompt
  if (!filePath) {
    const files = findGiraflowFiles();

    if (files.length === 0) {
      console.error('\n  No *.giraflow.json files found in current directory.\n');
      process.exit(1);
    } else if (files.length === 1) {
      filePath = files[0];
      console.log(`\n  Using: ${filePath}\n`);
    } else {
      filePath = await promptFileSelection(files);
    }
  }

  // Start vite with the selected file
  const vite = spawn('npx', ['vite', '--port', '4321'], {
    env: { ...process.env, IF_FILE: filePath },
    stdio: 'inherit',
    shell: true,
  });

  vite.on('close', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch(console.error);
