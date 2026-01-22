import Table from 'cli-table3';
import {
  InformationFlowModel,
  isEvent,
  isStateView,
  isCommand,
  isActor,
  Event,
  StateView,
  Command,
  Actor,
} from '../models/types.js';
import { colors, rule } from './colors.js';
import { renderHeader, renderSummary } from './timeline.js';

/**
 * Render the table view - tabular overview with data flow tree
 */
export function renderTable(model: InformationFlowModel): void {
  renderHeader(model, 'Table View');
  
  const events = model.timeline.filter(isEvent) as Event[];
  const stateViews = model.timeline.filter(isStateView) as StateView[];
  const actors = model.timeline.filter(isActor) as Actor[];
  const commands = model.timeline.filter(isCommand) as Command[];
  
  // Events Table
  if (events.length > 0) {
    console.log(rule(colors.eventBold('● Events'), 'left'));
    console.log();
    
    const eventTable = new Table({
      head: [
        colors.dim('Tick'),
        colors.eventBold('Name'),
        colors.dim('Produced By'),
        colors.dim('External Source'),
      ],
      style: {
        head: [],
        border: ['grey'],
      },
    });
    
    for (const evt of events.sort((a, b) => a.tick - b.tick)) {
      eventTable.push([
        colors.dim(`@${evt.tick}`),
        colors.eventBold(evt.name),
        evt.producedBy ? colors.command(evt.producedBy) : colors.dim('-'),
        evt.externalSource || colors.dim('-'),
      ]);
    }
    
    console.log(eventTable.toString());
    console.log();
  }
  
  // State Views Table (distinct by name)
  if (stateViews.length > 0) {
    console.log(rule(colors.stateBold('◆ State Views'), 'left'));
    console.log();
    
    const viewTable = new Table({
      head: [
        colors.stateBold('Name'),
        colors.dim('Subscribes To'),
      ],
      style: {
        head: [],
        border: ['grey'],
      },
    });
    
    // Group by name and merge sourcedFrom
    const distinctViews = new Map<string, Set<string>>();
    for (const sv of stateViews) {
      const existing = distinctViews.get(sv.name) || new Set();
      sv.sourcedFrom.forEach(e => existing.add(e));
      distinctViews.set(sv.name, existing);
    }
    
    for (const [name, sourcedFrom] of [...distinctViews.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const subscribes = sourcedFrom.size > 0
        ? [...sourcedFrom].map(e => colors.event(e)).join(', ')
        : colors.dim('-');
      viewTable.push([colors.stateBold(name), subscribes]);
    }
    
    console.log(viewTable.toString());
    console.log();
  }
  
  // Commands Table (distinct by name)
  if (commands.length > 0) {
    console.log(rule(colors.commandBold('▶ Commands'), 'left'));
    console.log();
    
    const cmdTable = new Table({
      head: [
        colors.commandBold('Name'),
        colors.dim('Produces Events'),
      ],
      style: {
        head: [],
        border: ['grey'],
      },
    });
    
    // Group by name and collect produced events
    const distinctCommands = new Map<string, Set<string>>();
    for (const cmd of commands) {
      const cmdKey = `${cmd.name}-${cmd.tick}`;
      const producedEvents = events
        .filter(e => e.producedBy === cmdKey)
        .map(e => e.name);
      
      const existing = distinctCommands.get(cmd.name) || new Set();
      producedEvents.forEach(e => existing.add(e));
      distinctCommands.set(cmd.name, existing);
    }
    
    for (const [name, producedEvents] of [...distinctCommands.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const produces = producedEvents.size > 0
        ? [...producedEvents].map(e => colors.event(e)).join(', ')
        : colors.dim('-');
      cmdTable.push([colors.commandBold(name), produces]);
    }
    
    console.log(cmdTable.toString());
    console.log();
  }
  
  // Actors Table (distinct by name)
  if (actors.length > 0) {
    console.log(rule(colors.actorBold('○ Actors'), 'left'));
    console.log();
    
    const actorTable = new Table({
      head: [
        colors.actorBold('Name'),
        colors.dim('Reads Views'),
        colors.dim('Sends Commands'),
      ],
      style: {
        head: [],
        border: ['grey'],
      },
    });
    
    // Group by name
    const distinctActors = new Map<string, { views: Set<string>; commands: Set<string> }>();
    for (const actor of actors) {
      const existing = distinctActors.get(actor.name) || { views: new Set(), commands: new Set() };
      existing.views.add(actor.readsView);
      existing.commands.add(actor.sendsCommand);
      distinctActors.set(actor.name, existing);
    }
    
    for (const [name, data] of [...distinctActors.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      actorTable.push([
        colors.actorBold(name),
        [...data.views].map(v => colors.state(v)).join(', '),
        [...data.commands].map(c => colors.command(c)).join(', '),
      ]);
    }
    
    console.log(actorTable.toString());
    console.log();
  }
  
  // Data Flow Tree
  renderDataFlowTree(model, events, stateViews, commands, actors);
  
  // Summary
  renderSummary(model);
}

/**
 * Render the data flow tree
 */
function renderDataFlowTree(
  model: InformationFlowModel,
  events: Event[],
  stateViews: StateView[],
  commands: Command[],
  actors: Actor[]
): void {
  console.log(rule(colors.cyan.bold('🔄 Data Flow'), 'left'));
  console.log();
  console.log(colors.cyan('Information Flow'));
  
  // Build grouped data for StateViews
  const stateViewData = new Map<string, Set<string>>();
  for (const sv of stateViews) {
    const existing = stateViewData.get(sv.name) || new Set();
    sv.sourcedFrom.forEach(e => existing.add(e));
    stateViewData.set(sv.name, existing);
  }
  
  // Build grouped data for Commands
  const commandEventData = new Map<string, Set<string>>();
  for (const cmd of commands) {
    const cmdKey = `${cmd.name}-${cmd.tick}`;
    const producedEvents = events
      .filter(e => e.producedBy === cmdKey)
      .map(e => e.name);
    
    const existing = commandEventData.get(cmd.name) || new Set();
    producedEvents.forEach(e => existing.add(e));
    commandEventData.set(cmd.name, existing);
  }
  
  // Build grouped data for Actors
  const actorData = new Map<string, { views: Set<string>; commands: Set<string> }>();
  for (const actor of actors) {
    const existing = actorData.get(actor.name) || { views: new Set(), commands: new Set() };
    existing.views.add(actor.readsView);
    existing.commands.add(actor.sendsCommand);
    actorData.set(actor.name, existing);
  }
  
  // Render StateViews as root nodes
  const distinctStateViewNames = [...stateViewData.keys()].sort();
  
  for (const svName of distinctStateViewNames) {
    console.log(`├─ ${colors.state('◆')} ${colors.state(svName)}`);
    
    // Events this view sourced from
    const sourcedFrom = stateViewData.get(svName);
    if (sourcedFrom && sourcedFrom.size > 0) {
      console.log(`│  └─ ${colors.dim('← sourced from')}`);
      const sortedEvents = [...sourcedFrom].sort();
      for (let i = 0; i < sortedEvents.length; i++) {
        const isLastEvent = i === sortedEvents.length - 1;
        const prefix = isLastEvent ? '└─' : '├─';
        console.log(`│     ${prefix} ${colors.event('●')} ${colors.event(sortedEvents[i])}`);
      }
    }
    
    // Actors that read this view
    const readingActors = [...actorData.entries()]
      .filter(([, data]) => data.views.has(svName))
      .map(([name]) => name)
      .sort();
    
    for (const actorName of readingActors) {
      console.log(`│  └─ ${colors.actor('○')} ${colors.actor(actorName)}`);
      
      // Commands this actor sends
      const actorCommands = [...(actorData.get(actorName)?.commands || [])].sort();
      for (let i = 0; i < actorCommands.length; i++) {
        const cmdName = actorCommands[i];
        const isLastCmd = i === actorCommands.length - 1;
        const cmdPrefix = isLastCmd ? '└─' : '├─';
        console.log(`│     ${cmdPrefix} ${colors.command('▶')} ${colors.command(cmdName)}`);
        
        // Events produced by this command
        const producedEvents = commandEventData.get(cmdName);
        if (producedEvents && producedEvents.size > 0) {
          console.log(`│        └─ ${colors.dim('→ produces')}`);
          const sortedProduced = [...producedEvents].sort();
          for (let j = 0; j < sortedProduced.length; j++) {
            const isLastProd = j === sortedProduced.length - 1;
            const prodPrefix = isLastProd ? '└─' : '├─';
            console.log(`│           ${prodPrefix} ${colors.event('●')} ${colors.event(sortedProduced[j])}`);
          }
        }
      }
    }
  }
  
  // Commands as root nodes
  const allCommandNames = [...commandEventData.keys()].sort();
  for (const cmdName of allCommandNames) {
    console.log(`├─ ${colors.command('▶')} ${colors.command(cmdName)}`);
    
    const producedEvents = commandEventData.get(cmdName);
    if (producedEvents && producedEvents.size > 0) {
      console.log(`│  └─ ${colors.dim('→ produces')}`);
      const sortedProduced = [...producedEvents].sort();
      for (let i = 0; i < sortedProduced.length; i++) {
        const isLast = i === sortedProduced.length - 1;
        const prefix = isLast ? '└─' : '├─';
        console.log(`│     ${prefix} ${colors.event('●')} ${colors.event(sortedProduced[i])}`);
      }
    }
  }
  
  // External events
  const externalEvents = events.filter(e => e.externalSource);
  if (externalEvents.length > 0) {
    console.log(`└─ ${colors.yellow('⚡ External Events')}`);
    for (let i = 0; i < externalEvents.length; i++) {
      const evt = externalEvents[i];
      const isLast = i === externalEvents.length - 1;
      const prefix = isLast ? '└─' : '├─';
      console.log(`   ${prefix} ${colors.event('●')} ${colors.event(evt.name)} ${colors.dim(`from ${evt.externalSource}`)}`);
    }
  }
  
  console.log();
}
