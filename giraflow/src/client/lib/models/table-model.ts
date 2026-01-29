/**
 * Table View Model
 *
 * Deduplicated summary of timeline elements grouped by name with occurrence counts.
 */

import type { InformationFlowModel, Event, StateView, Command, Actor } from '../types';

export interface DeduplicatedItem {
  name: string;
  ticks: number[];
  count: number;
}

export interface DeduplicatedStateItem extends DeduplicatedItem {
  sourcedFrom: string[];
}

export interface TableViewModel {
  events: DeduplicatedItem[];
  states: DeduplicatedStateItem[];
  commands: DeduplicatedItem[];
  actors: DeduplicatedItem[];
  totalEvents: number;
  totalStates: number;
  totalCommands: number;
  totalActors: number;
}

/**
 * Deduplicate items by name, collecting all ticks and counting occurrences.
 */
function deduplicateWithCounts<T extends { name: string; tick: number }>(
  items: T[]
): DeduplicatedItem[] {
  const map = new Map<string, number[]>();

  for (const item of items) {
    const ticks = map.get(item.name) || [];
    ticks.push(item.tick);
    map.set(item.name, ticks);
  }

  return [...map.entries()]
    .map(([name, ticks]) => ({
      name,
      ticks: ticks.sort((a, b) => a - b),
      count: ticks.length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Deduplicate states with sourcedFrom information.
 */
function deduplicateStates(
  items: { name: string; tick: number; sourcedFrom: string[] }[]
): DeduplicatedStateItem[] {
  const map = new Map<string, { ticks: number[]; sourcedFrom: string[] }>();

  for (const item of items) {
    const existing = map.get(item.name);
    if (existing) {
      existing.ticks.push(item.tick);
    } else {
      map.set(item.name, {
        ticks: [item.tick],
        sourcedFrom: item.sourcedFrom,
      });
    }
  }

  return [...map.entries()]
    .map(([name, { ticks, sourcedFrom }]) => ({
      name,
      ticks: ticks.sort((a, b) => a - b),
      count: ticks.length,
      sourcedFrom,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Build the table view model from raw model data.
 * Deduplicates all element types and provides occurrence counts.
 */
export function buildTableViewModel(model: InformationFlowModel | null): TableViewModel {
  if (!model) {
    return {
      events: [],
      states: [],
      commands: [],
      actors: [],
      totalEvents: 0,
      totalStates: 0,
      totalCommands: 0,
      totalActors: 0,
    };
  }

  const events = model.timeline.filter((el): el is Event => el.type === 'event');
  const states = model.timeline.filter((el): el is StateView => el.type === 'state');
  const commands = model.timeline.filter((el): el is Command => el.type === 'command');
  const actors = model.timeline.filter((el): el is Actor => el.type === 'actor');

  return {
    events: deduplicateWithCounts(events),
    states: deduplicateStates(states),
    commands: deduplicateWithCounts(commands),
    actors: deduplicateWithCounts(actors),
    totalEvents: events.length,
    totalStates: states.length,
    totalCommands: commands.length,
    totalActors: actors.length,
  };
}
