/**
 * Timeline View Model
 *
 * Supports multiple swimlanes for events (grouped by system) and actors (grouped by role).
 * Center lane for commands/states remains unchanged.
 *
 * Layout (dynamic lanes):
 * [System B][System A][Default] | [Commands/States] | [Default][Role A][Role B]
 *          ↑ alphabetical       ↑ inner/default      ↑ inner/default ↑ alphabetical
 *
 * Rules:
 * - Events: Named systems alphabetically sorted, outermost first. Default (no system) is innermost.
 * - Actors: Default (no role) is innermost. Named roles alphabetically sorted, outermost last.
 */

import type { InformationFlowModel, TimelineElement, Event, Actor } from '../types';
import { isEvent, isActor } from '../types';

export type TimelinePosition = 'left' | 'center' | 'right';

export interface LaneConfig {
  eventSystems: string[];  // Unique systems for events, sorted alphabetically reversed (+ empty string for default)
  actorRoles: string[];    // Unique roles for actors, sorted alphabetically (+ empty string for default)
  eventLaneCount: number;  // Number of event lanes
  actorLaneCount: number;  // Number of actor lanes
  totalLanes: number;      // Total number of lanes
  laneWidth: number;       // Width per lane in pixels
}

export interface TimelineItem {
  element: TimelineElement;
  position: TimelinePosition;
  laneIndex: number;       // Which lane (0-based from left within the position group)
}

export interface TimelineViewModel {
  items: TimelineItem[];
  count: number;
  laneConfig: LaneConfig;
}

/**
 * Build the lane configuration from the model.
 * Extracts unique systems from events and roles from actors.
 */
export function buildLaneConfig(model: InformationFlowModel | null): LaneConfig {
  const laneWidth = 24;

  if (!model) {
    return {
      eventSystems: [''],
      actorRoles: [''],
      eventLaneCount: 1,
      actorLaneCount: 1,
      totalLanes: 3,
      laneWidth,
    };
  }

  // Extract unique systems from events
  const systemsSet = new Set<string>();
  let hasDefaultEventSystem = false;

  for (const el of model.timeline) {
    if (isEvent(el)) {
      const event = el as Event;
      if (event.system) {
        systemsSet.add(event.system);
      } else {
        hasDefaultEventSystem = true;
      }
    }
  }

  // Sort systems alphabetically, reversed (outermost first)
  const namedSystems = Array.from(systemsSet).sort().reverse();
  // Default (empty string) is innermost/rightmost of event lanes
  // Only include default lane if:
  // - There are elements without a system (hasDefaultEventSystem), OR
  // - There are no named systems at all (fallback to ensure at least one lane)
  const eventSystems = hasDefaultEventSystem
    ? [...namedSystems, '']
    : (namedSystems.length > 0 ? namedSystems : ['']);

  // Extract unique roles from actors
  const rolesSet = new Set<string>();
  let hasDefaultActorRole = false;

  for (const el of model.timeline) {
    if (isActor(el)) {
      const actor = el as Actor;
      if (actor.role) {
        rolesSet.add(actor.role);
      } else {
        hasDefaultActorRole = true;
      }
    }
  }

  // Sort roles alphabetically
  const namedRoles = Array.from(rolesSet).sort();
  // Default (empty string) is innermost/leftmost of actor lanes
  // Only include default lane if:
  // - There are elements without a role (hasDefaultActorRole), OR
  // - There are no named roles at all (fallback to ensure at least one lane)
  const actorRoles = hasDefaultActorRole
    ? ['', ...namedRoles]
    : (namedRoles.length > 0 ? namedRoles : ['']);

  const eventLaneCount = eventSystems.length;
  const actorLaneCount = actorRoles.length;
  const totalLanes = eventLaneCount + 1 + actorLaneCount; // +1 for center lane

  return {
    eventSystems,
    actorRoles,
    eventLaneCount,
    actorLaneCount,
    totalLanes,
    laneWidth,
  };
}

/**
 * Get the lane index for an element within its position group.
 */
export function getElementLaneIndex(element: TimelineElement, config: LaneConfig): number {
  if (isEvent(element)) {
    const event = element as Event;
    const system = event.system || '';
    const index = config.eventSystems.indexOf(system);
    return index >= 0 ? index : config.eventSystems.length - 1; // Default to innermost
  }

  if (isActor(element)) {
    const actor = element as Actor;
    const role = actor.role || '';
    const index = config.actorRoles.indexOf(role);
    return index >= 0 ? index : 0; // Default to innermost
  }

  // Commands and states are always in the center lane
  return 0;
}

/**
 * Get the visual position for a timeline element type.
 * - Events: left lane
 * - States/Commands: center lane
 * - Actors: right lane
 */
export function getElementPosition(type: string): TimelinePosition {
  if (type === 'event') return 'left';
  if (type === 'actor') return 'right';
  return 'center';
}

/**
 * Build the timeline view model from raw model data.
 * Sorts elements by tick and adds position and lane information.
 */
export function buildTimelineViewModel(model: InformationFlowModel | null): TimelineViewModel {
  const laneConfig = buildLaneConfig(model);

  if (!model) {
    return { items: [], count: 0, laneConfig };
  }

  const sortedElements = [...model.timeline].sort((a, b) => a.tick - b.tick);

  const items: TimelineItem[] = sortedElements.map((element) => ({
    element,
    position: getElementPosition(element.type),
    laneIndex: getElementLaneIndex(element, laneConfig),
  }));

  return {
    items,
    count: items.length,
    laneConfig,
  };
}
