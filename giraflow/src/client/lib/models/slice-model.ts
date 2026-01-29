/**
 * Slice View Model
 *
 * Deduplicated view of states and commands with aggregated occurrences,
 * cross-references, and auto-generated + spec-defined scenarios.
 */

import type {
  InformationFlowModel,
  StateView,
  Command,
  Event,
  Actor,
  Attachment,
  CommandScenario,
  StateViewScenario,
  TimelineScenario,
  TimelineScenarioRow,
} from '../types';
import { isState, isCommand, isEvent } from '../types';

// ============================================================================
// Interfaces
// ============================================================================

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

  // For states: events this state is sourced from
  sourcedFrom: EventRef[];
  stateOccurrences: StateOccurrence[];

  // For commands: events this command produces
  produces: EventRef[];
  commandOccurrences: CommandOccurrence[];

  // Scenarios (auto-generated Timeline Scenario + spec scenarios)
  scenarios: (CommandScenario | StateViewScenario | TimelineScenario)[];
  specScenarioCount: number;
}

export interface GroupedActor {
  name: string;
  ticks: number[];
  role?: string;
}

export interface SliceExample {
  tick: number;
  data: unknown;
}

export interface SliceViewModel {
  slices: Slice[];
  actors: Actor[];
}

// ============================================================================
// Builder Function
// ============================================================================

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
export function buildSliceViewModel(model: InformationFlowModel): SliceViewModel {
  const timeline = model.timeline;
  const events = timeline.filter(isEvent) as Event[];
  const actors = timeline.filter((el): el is Actor => el.type === 'actor');
  const elements = timeline
    .filter((el): el is StateView | Command => isState(el) || isCommand(el))
    .sort((a, b) => a.tick - b.tick);

  const seen = new Map<string, Slice>();
  // Temporary helper to collect source names before aggregating ticks
  const sliceSourceNames = new Map<string, Set<string>>();

  // First pass: collect all occurrences
  for (const el of elements) {
    const key = `${el.type}:${el.name}`;

    if (!seen.has(key)) {
      seen.set(key, {
        name: el.name,
        type: el.type as 'state' | 'command',
        ticks: [],
        sourcedFrom: [],
        produces: [],
        attachments: [],
        scenarios: [],
        specScenarioCount: 0,
        stateOccurrences: [],
        commandOccurrences: [],
      });
      sliceSourceNames.set(key, new Set());
    }

    const slice = seen.get(key)!;
    slice.ticks.push(el.tick);

    // Capture example if not yet set
    if (!slice.example && el.example) {
      slice.example = el.example;
    }

    if (isState(el)) {
      for (const s of el.sourcedFrom) {
        sliceSourceNames.get(key)!.add(s);
      }
    }

    if (el.attachments) {
      slice.attachments.push(...el.attachments);
    }

    // Collect state and command occurrences for later consolidation
    if (isState(el)) {
      slice.stateOccurrences.push({ tick: el.tick, state: el });
    } else if (isCommand(el)) {
      const producedEvents = events.filter(
        (e) => e.producedBy === `${el.name}-${el.tick}`
      );
      slice.commandOccurrences.push({
        tick: el.tick,
        command: el,
        producedEvents,
      });
    }
  }

  // Second pass: populate cross-references
  for (const [key, slice] of seen) {
    if (slice.type === 'state') {
      const sourceNames = sliceSourceNames.get(key)!;
      for (const sourceName of sourceNames) {
        // Find all occurrences of this event
        const sourceEvents = events.filter((e) => e.name === sourceName);
        slice.sourcedFrom.push({
          name: sourceName,
          ticks: sourceEvents.map((e) => e.tick),
          system: sourceEvents[0]?.system,
        });
      }
    } else if (slice.type === 'command') {
      // Aggregate produced events
      const producedMap = new Map<string, number[]>();
      for (const occ of slice.commandOccurrences) {
        for (const evt of occ.producedEvents) {
          if (!producedMap.has(evt.name)) {
            producedMap.set(evt.name, []);
          }
          producedMap.get(evt.name)!.push(evt.tick);
        }
      }
      slice.produces = Array.from(producedMap.entries()).map(([name, ticks]) => {
        const firstEvent = events.find((e) => e.name === name);
        return {
          name,
          ticks: ticks.sort((a, b) => a - b),
          system: firstEvent?.system,
        };
      });
    }
  }

  // Third pass: generate Timeline Scenarios for states
  for (const [, slice] of seen) {
    if (slice.type === 'state' && slice.stateOccurrences.length > 0) {
      let initialState: unknown = undefined;
      const steps: { given: { event: string; data?: unknown }; then: unknown }[] = [];

      for (let index = 0; index < slice.stateOccurrences.length; index++) {
        const occ = slice.stateOccurrences[index];
        const prevTick = index > 0 ? slice.stateOccurrences[index - 1].tick : 0;

        const precedingEvent = events.find(
          (e) =>
            e.tick > prevTick &&
            e.tick < occ.tick &&
            occ.state.sourcedFrom.includes(e.name)
        );

        if (!precedingEvent && index === 0) {
          // First occurrence without preceding event -> set as initialState
          initialState = occ.state.example;
        } else if (precedingEvent) {
          steps.push({
            given: {
              event: precedingEvent.name,
              ...(precedingEvent.example ? { data: precedingEvent.example } : {}),
            },
            then: occ.state.example,
          });
        }
      }

      const scenario: StateViewScenario = {
        name: 'Timeline Scenario',
        steps,
      };
      if (initialState !== undefined) {
        scenario.initialState = initialState;
      }
      slice.scenarios.push(scenario);
    }
  }

  // Fourth pass: generate Timeline Scenarios for commands
  for (const [, slice] of seen) {
    if (slice.type === 'command' && slice.commandOccurrences.length > 0) {
      const rows: TimelineScenarioRow[] = [];
      let lastTick = 0;

      for (const occ of slice.commandOccurrences) {
        // Events between lastTick and this command
        const eventsBetween = events
          .filter((e) => e.tick > lastTick && e.tick < occ.tick)
          .map((e) => ({
            event: e.name,
            ...(e.example ? { data: e.example } : {}),
          }));

        for (const eventRef of eventsBetween) {
          rows.push({ type: 'events-only', events: [eventRef] });
        }

        // Command with produced events
        rows.push({
          type: 'command',
          command: {
            name: occ.command.name,
            ...(occ.command.example ? { data: occ.command.example } : {}),
          },
          producedEvents: occ.producedEvents.map((e) => ({
            event: e.name,
            ...(e.example ? { data: e.example } : {}),
          })),
        });

        // Update lastTick to include produced events
        const maxProducedTick = Math.max(
          occ.tick,
          ...occ.producedEvents.map((e) => e.tick)
        );
        lastTick = maxProducedTick;
      }

      slice.scenarios.push({ name: 'Timeline Scenario', rows });
    }
  }

  // Fifth pass: add spec scenarios (after Timeline Scenario)
  for (const [, slice] of seen) {
    const specScenarios =
      model.specifications?.find(
        (s) => s.name === slice.name && s.type === slice.type
      )?.scenarios ?? [];
    slice.specScenarioCount = specScenarios.length;
    // Timeline Scenario first, then spec scenarios
    slice.scenarios = [...slice.scenarios, ...specScenarios];
  }

  return {
    slices: [...seen.values()],
    actors,
  };
}

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
