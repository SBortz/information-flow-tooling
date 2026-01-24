import chalk from 'chalk';
import {
  InformationFlowModel,
  TimelineElement,
  isEvent,
  isStateView,
  isCommand,
  Event,
  StateView,
  Command,
  Actor,
  isActor,
  CommandScenario,
  StateViewScenario,
  Specification,
} from '../models/types.js';
import { colors, getElementStyle, box } from './colors.js';
import { renderHeader } from './timeline.js';

// Get terminal width for smart truncation
const terminalWidth = process.stdout.columns || 80;

/**
 * Get visible length of string (without ANSI codes)
 */
function visibleLength(str: string): number {
  return str.replace(/\x1b\[[0-9;]*m/g, '').length;
}

/**
 * Truncate string only if it exceeds available width
 */
function smartTruncate(str: string, reservedChars: number = 10): string {
  const maxLen = Math.min(terminalWidth - reservedChars, 80); // Cap at 80 for readability
  const visible = visibleLength(str);
  if (visible <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

interface DeduplicatedSlice {
  name: string;
  type: 'state' | 'command';
  ticks: number[];
  sourcedFrom: string[];
  attachments: { type: string; label: string; path?: string; url?: string; content?: string }[];
  scenarios: (CommandScenario | StateViewScenario)[];
}

function buildDeduplicatedSlices(model: InformationFlowModel): DeduplicatedSlice[] {
  const timeline = model.timeline;
  const events = timeline.filter(isEvent) as Event[];
  const elements = timeline
    .filter(e => isStateView(e) || isCommand(e))
    .sort((a, b) => a.tick - b.tick) as (StateView | Command)[];

  const seen = new Map<string, DeduplicatedSlice>();
  for (const el of elements) {
    const key = `${el.type}:${el.name}`;
    if (!seen.has(key)) {
      seen.set(key, {
        name: el.name,
        type: el.type as 'state' | 'command',
        ticks: [],
        sourcedFrom: [],
        attachments: [],
        scenarios: []
      });
    }
    const slice = seen.get(key)!;
    slice.ticks.push(el.tick);

    if (isStateView(el)) {
      for (const s of el.sourcedFrom) {
        if (!slice.sourcedFrom.includes(s)) slice.sourcedFrom.push(s);
      }
    }
    if ((el as any).attachments) slice.attachments.push(...(el as any).attachments);

    // Auto-scenario from each timeline occurrence
    if (isStateView(el)) {
      slice.scenarios.push({
        name: `Example @${el.tick}`,
        given: events
          .filter(e => e.tick < el.tick && el.sourcedFrom.includes(e.name))
          .map(e => ({ event: e.name, ...(e.example ? { data: e.example } : {}) })),
        then: el.example
      });
    } else if (isCommand(el)) {
      const producedEvents = events
        .filter(e => e.producedBy === `${el.name}-${el.tick}`)
        .map(e => ({ event: e.name, ...(e.example ? { data: e.example } : {}) }));
      slice.scenarios.push({
        name: `Example @${el.tick}`,
        given: events
          .filter(e => e.tick < el.tick)
          .map(e => ({ event: e.name, ...(e.example ? { data: e.example } : {}) })),
        when: el.example,
        then: producedEvents.length > 0
          ? { produces: producedEvents }
          : { produces: [] }
      });
    }
  }

  // Prepend spec scenarios
  for (const [, slice] of seen) {
    const specScenarios = model.specifications
      ?.find(s => s.name === slice.name && s.type === slice.type)
      ?.scenarios ?? [];
    slice.scenarios = [...specScenarios, ...slice.scenarios];
  }

  return [...seen.values()];
}

/**
 * Render the slice view - detailed panels for each slice
 */
export function renderSlice(model: InformationFlowModel): void {
  renderHeader(model, 'Slice View');
  console.log();

  const events = model.timeline.filter(isEvent) as Event[];
  const actors = model.timeline.filter(isActor) as Actor[];
  const deduplicatedSlices = buildDeduplicatedSlices(model);

  for (let i = 0; i < deduplicatedSlices.length; i++) {
    const slice = deduplicatedSlices[i];
    const isLast = i === deduplicatedSlices.length - 1;

    renderDeduplicatedSlicePanel(slice, events, actors, isLast, deduplicatedSlices, i);
  }

  // External events section
  const externalEvents = events.filter(e => e.externalSource);
  if (externalEvents.length > 0) {
    console.log(colors.dim('─'.repeat(45)));
    console.log(colors.eventBold('● EXTERNAL EVENTS'));

    for (const evt of externalEvents.sort((a, b) => a.tick - b.tick)) {
      console.log(`  ${colors.event(evt.name)} ${colors.dim(`@${evt.tick}`)}`);
      console.log(`    ${colors.dim('source:')} ${evt.externalSource}`);
    }
  }
}

/**
 * Render command scenarios (Given-When-Then)
 */
function renderCommandScenarios(scenarios: CommandScenario[], commandName: string): string[] {
  const lines: string[] = [];
  lines.push(`${chalk.yellow.bold('Scenarios')} ${colors.dim(`(${scenarios.length})`)}`);
  
  for (const scenario of scenarios) {
    // Scenario name with outcome indicator
    const outcomeSymbol = scenario.then.fails ? colors.red('✗') : colors.green('✓');
    lines.push(`  ${outcomeSymbol} ${colors.yellow(scenario.name)}`);
    
    // Given - one line per event with data
    if (scenario.given.length > 0) {
      lines.push(`      ${colors.dim('Given:')}`);
      for (const ref of scenario.given) {
        const dataJson = ref.data ? ` ${colors.grey(smartTruncate(JSON.stringify(ref.data), 20))}` : '';
        lines.push(`        ${colors.event(ref.event)}${dataJson}`);
      }
    } else {
      lines.push(`      ${colors.dim('Given:')} ${chalk.dim.italic('(keine Vorbedingungen)')}`);
    }
    
    // When - with command name
    if (scenario.when) {
      const whenJson = JSON.stringify(scenario.when);
      lines.push(`      ${colors.dim('When:')} ${colors.command(commandName)} ${colors.grey(smartTruncate(whenJson, 20))}`);
    }
    
    // Then - with event data
    if (scenario.then.fails) {
      lines.push(`      ${colors.dim('Then:')} ${colors.red('✗ ' + scenario.then.fails)}`);
    } else if (scenario.then.produces && scenario.then.produces.length > 0) {
      lines.push(`      ${colors.dim('Then:')}`);
      for (const ref of scenario.then.produces) {
        const dataJson = ref.data ? ` ${colors.grey(smartTruncate(JSON.stringify(ref.data), 20))}` : '';
        lines.push(`        → ${colors.event(ref.event)}${dataJson}`);
      }
    }
  }
  
  return lines;
}

/**
 * Render state view scenarios (Given-Then)
 */
function renderStateViewScenarios(scenarios: StateViewScenario[]): string[] {
  const lines: string[] = [];
  lines.push(`${chalk.yellow.bold('Scenarios')} ${colors.dim(`(${scenarios.length})`)}`);
  
  for (const scenario of scenarios) {
    // Scenario name
    lines.push(`  ${colors.state('◇')} ${colors.yellow(scenario.name)}`);
    
    // Given - one line per event with data
    if (scenario.given.length > 0) {
      lines.push(`      ${colors.dim('Given:')}`);
      for (const ref of scenario.given) {
        const dataJson = ref.data ? ` ${colors.grey(smartTruncate(JSON.stringify(ref.data), 20))}` : '';
        lines.push(`        ${colors.event(ref.event)}${dataJson}`);
      }
    } else {
      lines.push(`      ${colors.dim('Given:')} ${chalk.dim.italic('(keine Events)')}`);
    }
    
    // Then
    if (scenario.then) {
      const thenJson = JSON.stringify(scenario.then);
      lines.push(`      ${colors.dim('Then:')} ${colors.grey(smartTruncate(thenJson, 14))}`);
    }
  }
  
  return lines;
}

/**
 * Render a deduplicated slice panel
 */
function renderDeduplicatedSlicePanel(
  slice: DeduplicatedSlice,
  events: Event[],
  actors: Actor[],
  isLast: boolean,
  slices: DeduplicatedSlice[],
  index: number
): void {
  const { symbol, color } = getElementStyle(slice.type);
  const content: string[] = [];
  let scenarioLines: string[] = [];

  // Add slice name as first line
  content.push(`${color.bold(slice.name)}`);
  content.push('');

  if (slice.type === 'state') {
    // Events this view sourced from
    if (slice.sourcedFrom.length > 0) {
      content.push(colors.dim('sourcedFrom:'));
      for (const eventName of slice.sourcedFrom) {
        const evt = events.find(e => e.name === eventName);
        const tickInfo = evt ? colors.dim(` @${evt.tick}`) : '';
        content.push(`  ${colors.event('●')} ${colors.event(eventName)}${tickInfo}`);
      }
    }

    // Actors that read this view
    const readingActors = actors.filter(a => a.readsView === slice.name);
    if (readingActors.length > 0) {
      if (content.length > 2) content.push('');
      content.push(colors.dim('readBy:'));
      for (const actor of readingActors) {
        content.push(
          `  ${colors.actor('○')} ${colors.actor(actor.name)} ${colors.dim(`@${actor.tick}`)} → ${colors.command(actor.sendsCommand)}`
        );
      }
    }
  } else {
    // Actors that trigger this command
    const triggeringActors = actors.filter(a => a.sendsCommand === slice.name);
    if (triggeringActors.length > 0) {
      content.push(colors.dim('triggeredBy:'));
      for (const actor of triggeringActors) {
        content.push(
          `  ${colors.actor('○')} ${colors.actor(actor.name)} ${colors.dim(`@${actor.tick}`)} ← ${colors.state(actor.readsView)}`
        );
      }
    }
  }

  // Scenarios
  if (slice.scenarios.length > 0) {
    if (slice.type === 'state') {
      scenarioLines = renderStateViewScenarios(slice.scenarios as StateViewScenario[]);
    } else {
      scenarioLines = renderCommandScenarios(slice.scenarios as CommandScenario[], slice.name);
    }
  }

  // Build panel content
  const panelLines: string[] = [];

  // 1. Name (bold)
  panelLines.push(color.bold(slice.name));

  // 2. Details (content without name)
  const details = content.slice(2).filter(line => line !== '');
  if (details.length > 0) {
    panelLines.push('');
    panelLines.push(...details);
  }

  // 3. Scenarios
  if (scenarioLines.length > 0) {
    panelLines.push('');
    panelLines.push(...scenarioLines);
  }

  const panelContent = panelLines.join('\n') || colors.dim('(no details)');

  // Timeline prefix - show all ticks
  const tickStr = slice.ticks.map(t => `@${t}`).join(', ');
  console.log(`${color(symbol)} ${colors.dim(`${tickStr.padStart(Math.max(5, tickStr.length))} │`)}`);

  // Panel
  console.log(box(panelContent, { borderColor: color }));

  // Timeline continuation
  if (!isLast) {
    console.log(`        ${colors.dim('│')}`);
  } else {
    console.log(`        ${colors.dim('↓')}`);
  }
}
