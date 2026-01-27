import * as fs from 'node:fs';
import * as path from 'node:path';

export function findGiraflowFiles(): string[] {
  const cwd = process.cwd();
  const files = fs.readdirSync(cwd);
  return files.filter(f => f.endsWith('.giraflow.json')).sort();
}

export async function promptFileSelection(files: string[]): Promise<string> {
  return new Promise((resolve) => {
    let selectedIndex = 0;

    // Hide cursor
    process.stdout.write('\x1b[?25l');

    // Print header once
    process.stdout.write('\n  Select a giraflow file:\n\n');

    const renderOptions = () => {
      // Move cursor to start of options (up by number of files)
      process.stdout.write(`\x1b[${files.length}A`);

      for (const [i, file] of files.entries()) {
        const prefix = i === selectedIndex ? '\x1b[36m❯\x1b[0m' : ' ';
        const text = i === selectedIndex ? `\x1b[36m${file}\x1b[0m` : file;
        process.stdout.write(`\x1b[2K    ${prefix} ${text}\n`);
      }
    };

    // Initial render of options
    for (const [i, file] of files.entries()) {
      const prefix = i === selectedIndex ? '\x1b[36m❯\x1b[0m' : ' ';
      const text = i === selectedIndex ? `\x1b[36m${file}\x1b[0m` : file;
      process.stdout.write(`    ${prefix} ${text}\n`);
    }

    // Enable raw mode for keypress detection
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();

    const cleanup = () => {
      process.stdin.removeListener('data', onKeypress);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
      // Show cursor again
      process.stdout.write('\x1b[?25h');
    };

    const onKeypress = (key: Buffer) => {
      const char = key.toString();

      // Arrow up or k
      if (char === '\x1b[A' || char === 'k') {
        selectedIndex = (selectedIndex - 1 + files.length) % files.length;
        renderOptions();
      }
      // Arrow down or j
      else if (char === '\x1b[B' || char === 'j') {
        selectedIndex = (selectedIndex + 1) % files.length;
        renderOptions();
      }
      // Enter
      else if (char === '\r' || char === '\n') {
        cleanup();
        process.stdout.write('\n');
        resolve(path.resolve(files[selectedIndex]));
      }
      // Ctrl+C or q
      else if (char === '\x03' || char === 'q') {
        cleanup();
        process.stdout.write('\n  Cancelled.\n\n');
        process.exit(0);
      }
    };

    process.stdin.on('data', onKeypress);
  });
}
