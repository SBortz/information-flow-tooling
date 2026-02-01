import { Command } from 'commander';
import { input, select, confirm } from '@inquirer/prompts';
import { writeFile } from 'fs/promises';
import { InformationFlowModel, TimelineElement } from '../../types.js';
import { colors } from '../colors.js';

export function createCommand(): Command {
  return new Command('create')
    .description('Create a new .giraflow.json model interactively')
    .argument('[output]', 'Output file path')
    .action(async (output?: string) => {
      await runCreateWizard(output);
    });
}

async function runCreateWizard(outputArg?: string): Promise<void> {
  console.log(colors.bold('\nGiraflow Model Creator\n'));

  // 1. Model metadata
  const name = await input({
    message: 'Model name:',
    validate: (v) => v.trim().length > 0 || 'Name is required',
  });

  const description = await input({
    message: 'Description (optional):',
  });

  // 2. Element loop
  const timeline: TimelineElement[] = [];
  let tick = 10;
  let addMore = true;

  while (addMore) {
    const element = await promptElement(tick, timeline);
    timeline.push(element);
    tick += 10;

    addMore = await confirm({
      message: 'Add another element?',
      default: true,
    });
  }

  // 3. Build model
  const model: InformationFlowModel = {
    name: name.trim(),
    timeline,
  };

  if (description.trim()) {
    model.description = description.trim();
  }

  // 4. Determine output path
  let outputPath = outputArg;
  if (!outputPath) {
    const defaultName = `${name.trim().replace(/\s+/g, '-').toLowerCase()}.giraflow.json`;
    outputPath = await input({
      message: 'Output file:',
      default: defaultName,
    });
  }

  // 5. Write file
  const json = JSON.stringify(model, null, 2);
  await writeFile(outputPath, json + '\n', 'utf-8');
  console.log(`\n${colors.green.bold('✓ Saved:')} ${outputPath}`);
}

async function promptElement(tick: number, timeline: TimelineElement[]): Promise<TimelineElement> {
  const type = await select({
    message: 'Element type:',
    choices: [
      { value: 'event', name: `${colors.symbols.event} Event` },
      { value: 'state', name: `${colors.symbols.state} State View` },
      { value: 'actor', name: `${colors.symbols.actor} Actor` },
      { value: 'command', name: `${colors.symbols.command} Command` },
    ],
  });

  const name = await input({
    message: 'Element name:',
    validate: (v) => v.trim().length > 0 || 'Name is required',
  });

  const trimmedName = name.trim();

  switch (type) {
    case 'event': {
      const producedBy = await input({ message: 'producedBy (command name, optional):' });
      const example = await promptExample();
      const el: TimelineElement = {
        type: 'event',
        name: trimmedName,
        tick,
        ...(producedBy.trim() && { producedBy: producedBy.trim() }),
        ...(example !== undefined && { example }),
      };
      return el;
    }
    case 'state': {
      const sourcedFromRaw = await input({
        message: 'sourcedFrom (comma-separated event names, optional):',
      });
      const sourcedFrom = sourcedFromRaw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const example = await promptExample();
      const el: TimelineElement = {
        type: 'state',
        name: trimmedName,
        tick,
        sourcedFrom,
        ...(example !== undefined && { example }),
      };
      return el;
    }
    case 'actor': {
      const lastState = [...timeline].reverse().find((el) => el.type === 'state');
      const readsView = await input({
        message: 'readsView (state view name, optional):',
        ...(lastState && { default: lastState.name }),
      });
      const sendsCommand = await input({ message: 'sendsCommand (command name, optional):' });
      const el: TimelineElement = {
        type: 'actor',
        name: trimmedName,
        tick,
        readsView: readsView.trim() || '',
        sendsCommand: sendsCommand.trim() || '',
      };
      return el;
    }
    case 'command': {
      const example = await promptExample();
      const el: TimelineElement = {
        type: 'command',
        name: trimmedName,
        tick,
        ...(example !== undefined && { example }),
      };
      return el;
    }
    default:
      return { type: 'command', name: trimmedName, tick } as TimelineElement;
  }
}

async function promptExample(): Promise<unknown | undefined> {
  const mode = await select({
    message: 'Example data:',
    choices: [
      { value: 'none', name: 'None' },
      { value: 'text', name: 'Free text' },
      { value: 'kv', name: 'Key-Value pairs' },
    ],
  });

  switch (mode) {
    case 'text': {
      const text = await input({ message: 'Example text:' });
      return text.trim() || undefined;
    }
    case 'kv': {
      const obj: Record<string, string> = {};
      let addField = true;
      while (addField) {
        const key = await input({
          message: 'Key (empty to finish):',
        });
        if (!key.trim()) break;
        const value = await input({ message: `Value for "${key.trim()}":` });
        obj[key.trim()] = value;
        addField = await confirm({ message: 'Add another field?', default: true });
      }
      return Object.keys(obj).length > 0 ? obj : undefined;
    }
    default:
      return undefined;
  }
}
