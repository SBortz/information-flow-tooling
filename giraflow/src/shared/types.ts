/**
 * Shared types for Information Flow models
 *
 * These types are used by both server and client.
 */

export interface EventReference {
  event: string;
  data?: unknown;
}

export interface CommandScenarioStep {
  type: 'events-only' | 'command';
  // For events-only:
  events?: EventReference[];
  // For command:
  when?: unknown;
  produces?: EventReference[];
  fails?: string;
}

export interface CommandScenario {
  name: string;
  steps: CommandScenarioStep[];
}

export interface ScenarioStep {
  given: {
    event: string;
    data?: unknown;
  };
  then: unknown;
}

export interface StateViewScenario {
  name: string;
  initialState?: unknown;
  steps: ScenarioStep[];
}

export interface TimelineScenarioRow {
  type: 'events-only' | 'command';
  // For events-only rows:
  events?: EventReference[];
  // For command rows:
  command?: { name: string; data?: unknown };
  producedEvents?: EventReference[];
  fails?: string;
}

export interface TimelineScenario {
  name: string;
  rows: TimelineScenarioRow[];
}

export interface Attachment {
  type: 'image' | 'link' | 'note' | 'file';
  label: string;
  path?: string;
  url?: string;
  content?: string;
}

export interface Event {
  type: 'event';
  name: string;
  tick: number;
  producedBy?: string;
  system?: string;
  example?: unknown;
}

export interface StateView {
  type: 'state';
  name: string;
  tick: number;
  sourcedFrom: string[];
  example?: unknown;
  attachments?: Attachment[];
}

export interface Actor {
  type: 'actor';
  name: string;
  tick: number;
  readsView: string;
  sendsCommand: string;
  wireframes?: string[];
  role?: string;
}

export interface Command {
  type: 'command';
  name: string;
  tick: number;
  example?: unknown;
  attachments?: Attachment[];
}

export type TimelineElement = Event | StateView | Actor | Command;

export interface CommandSpecification {
  name: string;
  type: 'command';
  scenarios: CommandScenario[];
}

export interface StateSpecification {
  name: string;
  type: 'state';
  scenarios: StateViewScenario[];
}

export type Specification = CommandSpecification | StateSpecification;

export interface GiraflowModel {
  $schema?: string;
  name: string;
  description?: string;
  version?: string;
  timeline: TimelineElement[];
  specifications?: Specification[];
}

export type ViewMode = 'slice' | 'timeline' | 'table' | 'editor' | 'howto';

// Type guards
export function isEvent(el: TimelineElement): el is Event {
  return el.type === 'event';
}

export function isState(el: TimelineElement): el is StateView {
  return el.type === 'state';
}

export function isStateView(el: TimelineElement): el is StateView {
  return el.type === 'state';
}

export function isCommand(el: TimelineElement): el is Command {
  return el.type === 'command';
}

export function isActor(el: TimelineElement): el is Actor {
  return el.type === 'actor';
}

/**
 * CLI options
 */
export interface CliOptions {
  view?: ViewMode;
  schema?: string;
  example?: boolean;
  output?: string;
}
