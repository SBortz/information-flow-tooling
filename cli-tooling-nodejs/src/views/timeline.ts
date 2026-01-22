import {
  InformationFlowModel,
  TimelineElement,
  isEvent,
  isStateView,
  isActor,
  isCommand,
  Event,
  StateView,
  Actor,
} from '../models/types.js';
import { colors, formatElement, getElementStyle, rule } from './colors.js';

/**
 * Render the timeline view
 */
export function renderTimeline(model: InformationFlowModel, showExamples = false): void {
  renderHeader(model, 'Timeline View');
  
  // Sort timeline by tick
  const sortedTimeline = [...model.timeline].sort((a, b) => a.tick - b.tick);
  
  for (let i = 0; i < sortedTimeline.length; i++) {
    const element = sortedTimeline[i];
    const isLast = i === sortedTimeline.length - 1;
    
    // Calculate spacing based on tick distance
    let extraLines = 0;
    if (!isLast) {
      const nextElement = sortedTimeline[i + 1];
      const tickDistance = nextElement.tick - element.tick;
      extraLines = Math.max(0, Math.floor(tickDistance / 10) - 1);
    }
    
    renderTimelineElement(element, isLast, extraLines, showExamples);
  }
  
  console.log();
  renderSummary(model);
}

/**
 * Render the model header
 */
export function renderHeader(model: InformationFlowModel, viewName?: string): void {
  console.log();
  
  // Subtitle with model name, version and view mode
  const subtitle: string[] = [];
  subtitle.push(colors.cyan(model.name));
  if (model.version) subtitle.push(`v${model.version}`);
  if (viewName) subtitle.push(viewName);
  
  console.log(rule(colors.dim(subtitle.join(' • '))));
  
  if (model.description) {
    console.log();
    console.log('  ' + colors.dim.italic(model.description));
  }
  
  console.log();
}

/**
 * Render a single timeline element
 */
function renderTimelineElement(
  element: TimelineElement,
  isLast: boolean,
  extraLines: number,
  showExamples: boolean
): void {
  const line = isLast ? colors.symbols.timelineEnd : colors.symbols.timelineLine;
  const { symbol, color } = getElementStyle(element.type);
  const tickStr = `@${element.tick}`.padStart(5);
  
  const margin = '    ';
  let prefix: string;
  let detailPrefix: string;
  
  // Layout differs based on element type
  switch (element.type) {
    case 'event':
      // Event is left of timeline
      prefix = `${margin}${color(symbol)}  ${colors.dim(line)}     ${tickStr}  `;
      detailPrefix = `${margin}   ${colors.dim(line)}            `;
      break;
    case 'state':
    case 'command':
      // StateView/Command IS on the timeline
      prefix = `${margin}   ${color(symbol)}     ${tickStr}  `;
      detailPrefix = `${margin}   ${colors.dim(line)}            `;
      break;
    case 'actor':
      // Actor is right of timeline
      prefix = `${margin}   ${colors.dim(line)}  ${color(symbol)}  ${tickStr}  `;
      detailPrefix = `${margin}   ${colors.dim(line)}            `;
      break;
    default:
      prefix = `${margin}   ${colors.dim(line)}     ${tickStr}  `;
      detailPrefix = `${margin}   ${colors.dim(line)}            `;
  }
  
  // Main line: layout + name
  console.log(prefix + formatElement(element.type, element.name, true));
  
  // Detail lines based on type
  if (isEvent(element)) {
    const evt = element as Event;
    if (evt.producedBy) {
      console.log(`${detailPrefix}${colors.dim('producedBy:')} ${colors.command(evt.producedBy)}`);
    }
    if (evt.externalSource) {
      console.log(`${detailPrefix}${colors.dim('externalSource:')} ${colors.dim(evt.externalSource)}`);
    }
  } else if (isStateView(element)) {
    const sv = element as StateView;
    if (sv.sourcedFrom.length > 0) {
      const eventNames = sv.sourcedFrom.map(e => colors.event(e)).join(colors.dim(', '));
      console.log(`${detailPrefix}${colors.dim('sourcedFrom:')} ${eventNames}`);
    }
  } else if (isActor(element)) {
    const actor = element as Actor;
    console.log(`${detailPrefix}${colors.dim('readsView:')} ${colors.state(actor.readsView)}`);
    console.log(`${detailPrefix}${colors.dim('sendsCommand:')} ${colors.command(actor.sendsCommand)}`);
  }
  
  // Show example data if requested
  if (showExamples) {
    let exampleData: unknown = null;
    if (isEvent(element) || isStateView(element) || isCommand(element)) {
      exampleData = (element as Event | StateView).example;
    }
    
    if (exampleData) {
      const exampleJson = JSON.stringify(exampleData, null, 2);
      const jsonLines = exampleJson.split('\n');
      for (const jsonLine of jsonLines) {
        console.log(`${detailPrefix}${colors.grey(jsonLine)}`);
      }
    }
  }
  
  // Empty line for spacing
  if (!isLast) {
    console.log(`${margin}   ${colors.dim(line)}`);
    for (let i = 0; i < extraLines; i++) {
      console.log(`${margin}   ${colors.dim(line)}`);
    }
  }
}

/**
 * Render summary panel
 */
export function renderSummary(model: InformationFlowModel): void {
  const events = model.timeline.filter(isEvent).length;
  const states = model.timeline.filter(isStateView).length;
  const commands = model.timeline.filter(isCommand).length;
  const actors = model.timeline.filter(isActor).length;
  
  console.log(rule(colors.dim('Summary')));
  console.log();
  
  const summaryLine = [
    `${colors.eventBold(events.toString())} ${colors.dim('Events')}`,
    `${colors.stateBold(states.toString())} ${colors.dim('Views')}`,
    `${colors.commandBold(commands.toString())} ${colors.dim('Commands')}`,
    `${colors.actorBold(actors.toString())} ${colors.dim('Actors')}`,
  ].join('   ');
  
  console.log('  ' + summaryLine);
  console.log();
}
