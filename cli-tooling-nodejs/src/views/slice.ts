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
} from '../models/types.js';
import { colors, getElementStyle, box } from './colors.js';
import { renderHeader } from './timeline.js';

/**
 * Render the slice view - detailed panels for each slice
 */
export function renderSlice(model: InformationFlowModel): void {
  renderHeader(model, 'Slice View');
  console.log();
  
  // Collect elements
  const events = model.timeline.filter(isEvent) as Event[];
  const actors = model.timeline.filter(isActor) as Actor[];
  
  // Build lookup: events by command tick
  const eventsByCommandTick = new Map<string, Event[]>();
  for (const evt of events) {
    if (evt.producedBy) {
      const existing = eventsByCommandTick.get(evt.producedBy) || [];
      existing.push(evt);
      eventsByCommandTick.set(evt.producedBy, existing);
    }
  }
  
  // Get slices: StateViews and Commands, sorted by tick
  const slices = model.timeline
    .filter(e => isStateView(e) || isCommand(e))
    .sort((a, b) => a.tick - b.tick) as (StateView | Command)[];
  
  for (let i = 0; i < slices.length; i++) {
    const slice = slices[i];
    const isLast = i === slices.length - 1;
    
    renderSlicePanel(slice, events, actors, eventsByCommandTick, isLast, slices, i);
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
function renderCommandScenarios(scenarios: CommandScenario[]): string[] {
  const lines: string[] = [];
  lines.push(`${chalk.yellow.bold('Scenarios')} ${colors.dim(`(${scenarios.length})`)}`);
  
  for (const scenario of scenarios) {
    // Scenario name with outcome indicator
    const outcomeSymbol = scenario.then.fails ? colors.red('✗') : colors.green('✓');
    lines.push(`  ${outcomeSymbol} ${colors.yellow(scenario.name)}`);
    
    // Given (compact)
    if (scenario.given.length > 0) {
      const givenEvents = scenario.given.map(e => colors.event(e.event)).join(', ');
      lines.push(`      ${colors.dim('Given:')} ${givenEvents}`);
    } else {
      lines.push(`      ${colors.dim('Given:')} ${chalk.dim.italic('(keine Vorbedingungen)')}`);
    }
    
    // When (compact JSON)
    if (scenario.when) {
      const whenJson = JSON.stringify(scenario.when);
      if (whenJson.length <= 60) {
        lines.push(`      ${colors.dim('When:')} ${colors.grey(whenJson)}`);
      } else {
        lines.push(`      ${colors.dim('When:')} ${colors.grey(whenJson.substring(0, 57) + '...')}`);
      }
    }
    
    // Then
    if (scenario.then.fails) {
      lines.push(`      ${colors.dim('Then:')} ${colors.red('✗ ' + scenario.then.fails)}`);
    } else if (scenario.then.produces && scenario.then.produces.length > 0) {
      const producedEvents = scenario.then.produces.map(e => colors.event(e.event)).join(', ');
      lines.push(`      ${colors.dim('Then:')} → ${producedEvents}`);
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
    
    // Given (compact)
    if (scenario.given.length > 0) {
      const givenEvents = scenario.given.map(e => colors.event(e.event)).join(', ');
      lines.push(`      ${colors.dim('Given:')} ${givenEvents}`);
    } else {
      lines.push(`      ${colors.dim('Given:')} ${chalk.dim.italic('(keine Events)')}`);
    }
    
    // Then (compact JSON)
    if (scenario.then) {
      const thenJson = JSON.stringify(scenario.then);
      if (thenJson.length <= 60) {
        lines.push(`      ${colors.dim('Then:')} ${colors.grey(thenJson)}`);
      } else {
        lines.push(`      ${colors.dim('Then:')} ${colors.grey(thenJson.substring(0, 57) + '...')}`);
      }
    }
  }
  
  return lines;
}

/**
 * Render a single slice panel
 */
function renderSlicePanel(
  slice: StateView | Command,
  events: Event[],
  actors: Actor[],
  eventsByCommandTick: Map<string, Event[]>,
  isLast: boolean,
  slices: (StateView | Command)[],
  index: number
): void {
  const { symbol, color } = getElementStyle(slice.type);
  const content: string[] = [];
  let scenarioLines: string[] = [];
  
  if (isStateView(slice)) {
    const sv = slice as StateView;
    
    // Events this view sourced from
    if (sv.sourcedFrom.length > 0) {
      content.push(colors.dim('sourcedFrom:'));
      for (const eventName of sv.sourcedFrom) {
        const evt = events.find(e => e.name === eventName);
        const tickInfo = evt ? colors.dim(` @${evt.tick}`) : '';
        content.push(`  ${colors.event('●')} ${colors.event(eventName)}${tickInfo}`);
      }
    }
    
    // Actors that read this view
    const readingActors = actors.filter(a => a.readsView === sv.name);
    if (readingActors.length > 0) {
      if (content.length > 0) content.push('');
      content.push(colors.dim('readBy:'));
      for (const actor of readingActors) {
        content.push(
          `  ${colors.actor('○')} ${colors.actor(actor.name)} ${colors.dim(`@${actor.tick}`)} → ${colors.command(actor.sendsCommand)}`
        );
      }
    }
    
    // Scenarios (Given-Then)
    if (sv.scenarios && sv.scenarios.length > 0) {
      scenarioLines = renderStateViewScenarios(sv.scenarios);
    }
  } else if (isCommand(slice)) {
    const cmd = slice as Command;
    
    // Actors that trigger this command
    const triggeringActors = actors.filter(a => a.sendsCommand === cmd.name);
    if (triggeringActors.length > 0) {
      content.push(colors.dim('triggeredBy:'));
      for (const actor of triggeringActors) {
        content.push(
          `  ${colors.actor('○')} ${colors.actor(actor.name)} ${colors.dim(`@${actor.tick}`)} ← ${colors.state(actor.readsView)}`
        );
      }
    }
    
    // Events produced by this command
    const cmdKey = `${cmd.name}-${cmd.tick}`;
    const producedEvents = eventsByCommandTick.get(cmdKey) || [];
    if (producedEvents.length > 0) {
      if (content.length > 0) content.push('');
      content.push(colors.dim('produces:'));
      for (const evt of producedEvents.sort((a, b) => a.tick - b.tick)) {
        content.push(`  ${colors.event('●')} ${colors.event(evt.name)} ${colors.dim(`@${evt.tick}`)}`);
      }
    }
    
    // Scenarios (Given-When-Then)
    if (cmd.scenarios && cmd.scenarios.length > 0) {
      scenarioLines = renderCommandScenarios(cmd.scenarios);
    }
  }
  
  // Get example data
  const exampleData = slice.example;
  
  // Build panel content
  let panelContent: string;
  if (exampleData) {
    const exampleJson = JSON.stringify(exampleData, null, 2);
    const jsonColored = exampleJson
      .replace(/"([^"]+)":/g, `${colors.cyan('"$1"')}:`)
      .replace(/: "([^"]+)"/g, `: ${colors.yellow('"$1"')}`)
      .replace(/: (\d+)/g, `: ${colors.yellow('$1')}`)
      .replace(/: (true|false)/g, `: ${colors.yellow('$1')}`);
    
    const parts: string[] = [jsonColored];
    if (content.length > 0) {
      parts.push('');
      parts.push(content.join('\n'));
    }
    if (scenarioLines.length > 0) {
      parts.push('');
      parts.push(scenarioLines.join('\n'));
    }
    panelContent = parts.join('\n');
  } else {
    const parts: string[] = [];
    if (content.length > 0) {
      parts.push(content.join('\n'));
    }
    if (scenarioLines.length > 0) {
      if (parts.length > 0) parts.push('');
      parts.push(scenarioLines.join('\n'));
    }
    panelContent = parts.length > 0 ? parts.join('\n') : colors.dim('(no details)');
  }
  
  // Timeline prefix
  const tickStr = `@${slice.tick}`.padStart(5);
  console.log(`${color(symbol)} ${colors.dim(`${tickStr} │`)}`);
  
  // Title and panel
  const title = `${color(symbol)} ${color.bold(slice.name)}`;
  console.log(box(panelContent, { borderColor: color }));
  
  // Timeline continuation
  if (!isLast) {
    console.log(`        ${colors.dim('│')}`);
    
    // Extra lines based on tick distance
    const nextSlice = slices[index + 1];
    const tickDistance = nextSlice.tick - slice.tick;
    const extraLines = Math.max(0, Math.floor(tickDistance / 10) - 1);
    for (let j = 0; j < extraLines; j++) {
      console.log(`        ${colors.dim('│')}`);
    }
  } else {
    console.log(`        ${colors.dim('↓')}`);
  }
}
