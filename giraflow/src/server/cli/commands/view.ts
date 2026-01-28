import { Command } from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { select, confirm } from '@inquirer/prompts';
import { InformationFlowModel, ViewMode, CliOptions } from '../../types.js';
import { renderTimeline } from '../views/timeline.js';
import { renderSlice } from '../views/slice.js';
import { renderTable } from '../views/table.js';
import { validateAgainstSchema, getBundledSchemaPath, printValidationResult } from '../validation.js';
import { colors } from '../colors.js';

export function viewCommand(): Command {
  return new Command('view')
    .description('Visualize a .giraflow.json model in the terminal')
    .argument('<file>', 'Path to the .giraflow.json file to parse')
    .option('-v, --view <mode>', 'Display mode: timeline, slice, or table')
    .option('-e, --example', 'Show example data in timeline view')
    .option('-o, --output <file>', 'Save output to a text file')
    .option('-s, --schema <path>', 'Path to JSON schema file for validation')
    .option('--validate', 'Validate against bundled schema')
    .action(async (file: string, options: CliOptions & { validate?: boolean }) => {
      await runView(file, options);
    });
}

async function runView(filePath: string, options: CliOptions & { validate?: boolean }): Promise<void> {
  // Check if file exists
  if (!existsSync(filePath)) {
    console.error(colors.red('Error:') + ` File not found: ${filePath}`);
    process.exit(1);
  }

  // Read the file
  let model: InformationFlowModel;

  try {
    const json = await readFile(filePath, 'utf-8');
    model = JSON.parse(json) as InformationFlowModel;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(colors.red('Error parsing JSON:') + ` ${message}`);
    process.exit(1);
  }

  // Schema validation
  const schemaPath = options.validate ? getBundledSchemaPath() : options.schema;

  if (schemaPath) {
    if (!existsSync(schemaPath)) {
      console.error(colors.red('Error:') + ` Schema file not found: ${schemaPath}`);
      process.exit(1);
    }

    console.log(colors.dim('Validating against schema...'));
    const result = await validateAgainstSchema(model, schemaPath);
    printValidationResult(result);

    if (!result.valid) {
      process.exit(1);
    }
  }

  // Interactive prompts if view mode not specified
  let viewMode: ViewMode = options.view as ViewMode;

  if (!viewMode) {
    const answer = await select({
      message: colors.cyan('Which view would you like?'),
      choices: [
        { value: 'timeline', name: 'timeline - Vertical timeline view' },
        { value: 'slice', name: 'slice    - Detailed slice view with JSON examples' },
        { value: 'table', name: 'table    - Tabular overview with data flow tree' },
      ],
    });
    viewMode = answer as ViewMode;
  }

  // Interactive prompt for examples in timeline view
  let showExamples = options.example ?? false;

  if (viewMode === 'timeline' && options.example === undefined) {
    showExamples = await confirm({
      message: colors.cyan('Show example data in timeline?'),
      default: false,
    });
  }

  // Capture output if output file is specified
  let output = '';
  const originalLog = console.log;

  if (options.output) {
    console.log = (...args: unknown[]) => {
      const line = args.map(arg => String(arg)).join(' ');
      output += line + '\n';
      originalLog(...args);
    };
  }

  // Render based on view mode
  switch (viewMode) {
    case 'slice':
      renderSlice(model);
      break;
    case 'table':
      renderTable(model);
      break;
    case 'timeline':
    default:
      renderTimeline(model, showExamples);
      break;
  }

  // Save to file if output was specified
  if (options.output) {
    console.log = originalLog;
    // Strip ANSI codes for file output
    const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');
    await writeFile(options.output, cleanOutput);
    console.log(`\n${colors.green.bold('✓ Output saved to:')} ${options.output}`);
  }
}
