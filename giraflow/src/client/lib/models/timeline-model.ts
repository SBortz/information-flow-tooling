/**
 * Timeline View Model
 *
 * Simple sorted view of timeline elements with position information.
 */

import type { InformationFlowModel, TimelineElement } from '../types';

export type TimelinePosition = 'left' | 'center' | 'right';

export interface TimelineItem {
  element: TimelineElement;
  position: TimelinePosition;
}

export interface TimelineViewModel {
  items: TimelineItem[];
  count: number;
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
 * Sorts elements by tick and adds position information.
 */
export function buildTimelineViewModel(model: InformationFlowModel | null): TimelineViewModel {
  if (!model) {
    return { items: [], count: 0 };
  }

  const sortedElements = [...model.timeline].sort((a, b) => a.tick - b.tick);

  const items: TimelineItem[] = sortedElements.map((element) => ({
    element,
    position: getElementPosition(element.type),
  }));

  return {
    items,
    count: items.length,
  };
}
