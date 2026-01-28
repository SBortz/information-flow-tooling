import chalk from 'chalk';
import {
  InformationFlowModel,
  isEvent,
  isStateView,
  isCommand,
  Event,
  StateView,
  Command,
  Actor,
  isActor,
} from '../../types.js';
import { colors, getElementStyle, box } from '../colors.js';
import { renderHeader } from './timeline.js';

interface DeduplicatedSlice {
  name: string;
  type: 'state' | 'command';
  ticks: number[];
  sourcedFrom: string[];
  attachments: { type: string; label: string; path?: string; url?: string; content?: string }[];
  scenarios: Array<{ name: string }>;
}

function buildDeduplicatedSlices(model: InformationFlowModel): DeduplicatedSlice[] {
  const timeline = model.timeline;
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
  }

  // Add explicit scenarios from specifications
  for (const [, slice] of seen) {
    const specScenarios = model.specifications
      ?.find(s => s.name === slice.name && s.type === slice.type)
      ?.scenarios ?? [];
    slice.scenarios = specScenarios.map(s => ({ name: s.name }));
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
 * Render scenario names (simple list)
 */
function renderScenarioNames(scenarios: Array<{ name: string }>): string[] {
  const lines: string[] = [];
  if (scenarios.length === 0) return lines;

  lines.push('');
  lines.push(`${chalk.yellow.bold('Scenarios')} ${colors.dim(`(${scenarios.length})`)}`);
  for (const scenario of scenarios) {
    lines.push(`  • ${colors.yellow(scenario.name)}`);
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
    scenarioLines = renderScenarioNames(slice.scenarios);
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
