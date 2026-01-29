/**
 * Slice Builder
 *
 * Builds deduplicated view of states and commands with aggregated occurrences,
 * cross-references, and auto-generated + spec-defined scenarios.
 *
 * This module is used by both server (for auto-export) and client (for display).
 */
import type { InformationFlowModel, StateView, Command, Event, Actor, Attachment, CommandScenario, StateViewScenario, TimelineScenario } from './types.js';
export interface EventRef {
    name: string;
    ticks: number[];
    system?: string;
}
export interface StateOccurrence {
    tick: number;
    state: StateView;
}
export interface CommandOccurrence {
    tick: number;
    command: Command;
    producedEvents: Event[];
}
export interface Slice {
    name: string;
    type: 'state' | 'command';
    ticks: number[];
    example?: unknown;
    attachments: Attachment[];
    sourcedFrom: EventRef[];
    stateOccurrences: StateOccurrence[];
    produces: EventRef[];
    commandOccurrences: CommandOccurrence[];
    scenarios: (CommandScenario | StateViewScenario | TimelineScenario)[];
    specScenarioCount: number;
}
export interface SliceViewModel {
    slices: Slice[];
    actors: Actor[];
}
/**
 * Build the slice view model from raw model data.
 *
 * This function:
 * 1. Deduplicates timeline elements by type:name
 * 2. Aggregates occurrences across ticks
 * 3. Cross-references (sourcedFrom for states, produces for commands)
 * 4. Synthesizes Timeline Scenarios from occurrences
 * 5. Attaches spec-defined scenarios
 */
export declare function buildSliceViewModel(model: InformationFlowModel): SliceViewModel;
/**
 * Export slices to JSON string.
 */
export declare function exportSlicesToJson(slices: Slice[]): string;
