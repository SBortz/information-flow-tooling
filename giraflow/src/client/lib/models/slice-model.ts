/**
 * Slice View Model - Helper Functions
 *
 * The core buildSliceViewModel and Slice types are in shared/slice-builder.ts.
 * This module provides helper functions for UI usage.
 */

import type { Actor } from '../types';

// Re-export types and builder from shared
export {
  type EventRef,
  type StateOccurrence,
  type CommandOccurrence,
  type Slice,
  type SliceViewModel,
  buildSliceViewModel,
  exportSlicesToJson,
} from '../../../shared/slice-builder.js';

// ============================================================================
// Helper Types
// ============================================================================

export interface GroupedActor {
  name: string;
  ticks: number[];
  role?: string;
}

export interface SliceExample {
  tick: number;
  data: unknown;
}

// Import for local use
import type { Slice, SliceViewModel } from '../../../shared/slice-builder.js';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get unique key for a slice (type:name).
 */
export function getSliceKey(slice: Slice): string {
  return `${slice.type}:${slice.name}`;
}

/**
 * Get actors that read a specific state view.
 */
export function getReadingActors(viewModel: SliceViewModel, stateName: string): Actor[] {
  return viewModel.actors.filter((a) => a.readsView === stateName);
}

/**
 * Get actors that trigger a specific command.
 */
export function getTriggeringActors(viewModel: SliceViewModel, commandName: string): Actor[] {
  return viewModel.actors.filter((a) => a.sendsCommand === commandName);
}

/**
 * Get all examples from a state slice with their ticks.
 */
export function getStateExamples(slice: Slice): SliceExample[] {
  return slice.stateOccurrences
    .filter((occ) => occ.state.example !== undefined)
    .map((occ) => ({ tick: occ.tick, data: occ.state.example }));
}

/**
 * Get all examples from a command slice with their ticks.
 */
export function getCommandExamples(slice: Slice): SliceExample[] {
  return slice.commandOccurrences
    .filter((occ) => occ.command.example !== undefined)
    .map((occ) => ({ tick: occ.tick, data: occ.command.example }));
}

/**
 * Get slice examples based on slice type.
 */
export function getSliceExamples(slice: Slice): SliceExample[] {
  return slice.type === 'state' ? getStateExamples(slice) : getCommandExamples(slice);
}

/**
 * Group actors by name, collecting all their ticks and role.
 */
export function groupActorsByName(actors: Actor[]): GroupedActor[] {
  const grouped = new Map<string, { ticks: number[]; role?: string }>();

  for (const actor of actors) {
    if (!grouped.has(actor.name)) {
      grouped.set(actor.name, { ticks: [], role: actor.role });
    }
    grouped.get(actor.name)!.ticks.push(actor.tick);
  }

  return Array.from(grouped.entries()).map(([name, data]) => ({
    name,
    ticks: data.ticks,
    role: data.role,
  }));
}
