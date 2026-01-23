/**
 * Types for Information Flow models
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
  scenarios?: StateViewScenario[];
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
  scenarios?: CommandScenario[];
  attachments?: Attachment[];
}

export type TimelineElement = Event | StateView | Actor | Command;

export interface InformationFlowModel {
  $schema?: string;
  name: string;
  description?: string;
  version?: string;
  timeline: TimelineElement[];
}

export type ViewMode = 'slice' | 'timeline' | 'table';

// Type guards
export function isEvent(el: TimelineElement): el is Event {
  return el.type === 'event';
}

export function isState(el: TimelineElement): el is StateView {
  return el.type === 'state';
}

export function isCommand(el: TimelineElement): el is Command {
  return el.type === 'command';
}

export function isActor(el: TimelineElement): el is Actor {
  return el.type === 'actor';
}
