#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { program } from 'commander';
import { select, confirm } from '@inquirer/prompts';
import { InformationFlowModel, ViewMode } from './models/types.js';
import { renderTimeline } from './views/timeline.js';
import { renderSlice } from './views/slice.js';
import { renderTable } from './views/table.js';
import { validateAgainstSchema, printValidationResult } from './validation.js';
import { colors, rule } from './views/colors.js';

// CLI setup
program
  .name('ift')
  .description('Information Flow Tooling CLI - Analyze and visualize Information Flow models')
  .version('1.0.0')
  .argument('<file>', 'Path to the .informationflow.json file to parse')
  .option('-v, --view <mode>', 'Display mode: timeline, slice, or table')
  .option('-e, --example', 'Show example data in timeline view')
  .option('-o, --output <file>', 'Save output to a text file')
  .option('-s, --schema <path>', 'Path to JSON schema file for validation');

program.addHelpText('after', `
${colors.dim('View Modes:')}
  ${colors.cyan('timeline')}  Vertical timeline view with symbols by type
  ${colors.cyan('slice')}     Detailed slice view with JSON examples
  ${colors.cyan('table')}     Tabular overview with data flow tree

${colors.dim('Examples:')}
  ${colors.white('ift')} ${colors.cyan('my-model.informationflow.json')}
  ${colors.white('ift')} ${colors.cyan('my-model.informationflow.json')} ${colors.green('--view table')}
  ${colors.white('ift')} ${colors.cyan('my-model.informationflow.json')} ${colors.green('-v slice -s schema.json')}

${colors.dim('Symbol Legend:')}
  ${colors.event('● Event')}   ${colors.state('◆ State View')}   ${colors.command('▶ Command')}   ${colors.actor('○ Actor')}
`);

async function main(): Promise<number> {
  program.parse();
  
  const args = program.args;
  const options = program.opts();
  
  if (args.length === 0) {
    program.help();
    return 1;
  }
  
  const filePath = args[0];
  
  // Check if file exists
  if (!existsSync(filePath)) {
    console.error(colors.red('Error:') + ` File not found: ${filePath}`);
    return 1;
  }
  
  // Read the file
  let json: string;
  let model: InformationFlowModel;
  
  try {
    json = await readFile(filePath, 'utf-8');
    model = JSON.parse(json) as InformationFlowModel;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(colors.red('Error parsing JSON:') + ` ${message}`);
    return 1;
  }
  
  // Schema validation
  if (options.schema) {
    if (!existsSync(options.schema)) {
      console.error(colors.red('Error:') + ` Schema file not found: ${options.schema}`);
      return 1;
    }
    
    console.log(colors.dim('Validating against schema...'));
    const result = await validateAgainstSchema(model, options.schema);
    printValidationResult(result);
    
    if (!result.valid) {
      return 1;
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
  
  return 0;
}

main()
  .then(code => process.exit(code))
  .catch(error => {
    console.error(colors.red('Unexpected error:'), error);
    process.exit(1);
  });
