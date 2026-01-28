/**
 * Types for Information Flow models (copied from main project for independence)
 */

export interface EventReference {
  event: string;
  data?: unknown;
}

export interface CommandScenarioOutcome {
  produces?: EventReference[];
  fails?: string;
}

export interface CommandScenario {
  name: string;
  given: EventReference[];
  when?: unknown;
  then: CommandScenarioOutcome;
}

export interface StateViewScenario {
  name: string;
  given: EventReference[];
  then?: unknown;
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
  externalSource?: string;
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

export interface InformationFlowModel {
  $schema?: string;
  name: string;
  description?: string;
  version?: string;
  timeline: TimelineElement[];
  specifications?: Specification[];
}

export type ViewMode = 'slice' | 'timeline' | 'table';

/**
 * Type guards for timeline elements
 */
export function isEvent(element: TimelineElement): element is Event {
  return element.type === 'event';
}

export function isStateView(element: TimelineElement): element is StateView {
  return element.type === 'state';
}

export function isActor(element: TimelineElement): element is Actor {
  return element.type === 'actor';
}

export function isCommand(element: TimelineElement): element is Command {
  return element.type === 'command';
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
