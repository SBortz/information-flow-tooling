import { Command } from 'commander';
import { copyFileSync, readdirSync, existsSync, mkdirSync, readFileSync, statSync } from 'fs';
import { join, basename } from 'path';
import { select } from '@inquirer/prompts';
import { getBundledExamplesPath } from '../validation.js';
import { colors } from '../colors.js';

interface ExampleInfo {
  name: string;
  description: string;
  jsonFile: string;
  assetsDir: string | null;
}

function getAvailableExamples(examplesDir: string): ExampleInfo[] {
  const files = readdirSync(examplesDir);
  const jsonFiles = files.filter(f => f.endsWith('.giraflow.json'));

  return jsonFiles.map(jsonFile => {
    const name = jsonFile.replace('.giraflow.json', '');
    const jsonPath = join(examplesDir, jsonFile);
    const assetsDir = join(examplesDir, `${name}.giraflow`);

    // Read description from the JSON file
    let description = '';
    try {
      const content = JSON.parse(readFileSync(jsonPath, 'utf-8'));
      description = content.description || '';
    } catch {
      // Ignore parsing errors
    }

    return {
      name,
      description,
      jsonFile,
      assetsDir: existsSync(assetsDir) ? assetsDir : null,
    };
  });
}

function copyDirectoryRecursive(src: string, dest: string): number {
  let fileCount = 0;

  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src);
  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      fileCount += copyDirectoryRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
      fileCount++;
    }
  }

  return fileCount;
}

function copyExample(example: ExampleInfo, examplesDir: string): void {
  const destJson = join(process.cwd(), example.jsonFile);
  copyFileSync(join(examplesDir, example.jsonFile), destJson);
  console.log(`${colors.green('✔')} Copied ${example.jsonFile}`);

  if (example.assetsDir) {
    const destAssets = join(process.cwd(), `${example.name}.giraflow`);
    const fileCount = copyDirectoryRecursive(example.assetsDir, destAssets);
    console.log(`${colors.green('✔')} Copied ${example.name}.giraflow/ (${fileCount} files)`);
  }
}

export function copyExampleCommand(): Command {
  return new Command('copy-example')
    .description('Copy an example giraflow project to the current directory')
    .argument('[name]', 'Name of the example to copy')
    .action(async (name?: string) => {
      const examplesDir = getBundledExamplesPath();
      if (!examplesDir) {
        console.error(colors.red('Error: Bundled examples not found'));
        process.exit(1);
      }

      const examples = getAvailableExamples(examplesDir);
      if (examples.length === 0) {
        console.error(colors.red('Error: No examples found'));
        process.exit(1);
      }

      let selectedExample: ExampleInfo | undefined;

      if (name) {
        // Direct selection by name
        selectedExample = examples.find(e => e.name === name);
        if (!selectedExample) {
          console.error(colors.red(`Error: Example '${name}' not found`));
          console.log(`\nAvailable examples: ${examples.map(e => e.name).join(', ')}`);
          process.exit(1);
        }
      } else {
        // Interactive selection
        const answer = await select({
          message: 'Select an example:',
          choices: examples.map(e => ({
            name: `${e.name.padEnd(20)} ${colors.dim('-')} ${colors.dim(e.description || 'No description')}`,
            value: e.name,
          })),
        });

        selectedExample = examples.find(e => e.name === answer);
      }

      if (selectedExample) {
        console.log();
        copyExample(selectedExample, examplesDir);
        console.log();
        console.log(`${colors.dim('Run')} ${colors.cyan(`giraflow ${selectedExample.jsonFile}`)} ${colors.dim('to start the preview')}`);
      }
    });
}
