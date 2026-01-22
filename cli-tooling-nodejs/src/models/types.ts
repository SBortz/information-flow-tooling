/**
 * Base interface for all timeline elements
 */
export interface ITimelineElement {
  type: string;
  name: string;
  tick: number;
}

/**
 * An event represents something that has happened.
 * Named in past tense (e.g. OrderPlaced, OrderShipped).
 */
export interface Event extends ITimelineElement {
  type: 'event';
  producedBy?: string;
  externalSource?: string;
  example?: unknown;
}

/**
 * A state view (read model) built from events.
 * Named as a noun (e.g. PendingOrders, CustomerProfile).
 */
export interface StateView extends ITimelineElement {
  type: 'state';
  sourcedFrom: string[];
  example?: unknown;
}

/**
 * An actor (human or system) that reads views and sends commands.
 * Named as a role (e.g. WarehouseWorker, PaymentGateway).
 */
export interface Actor extends ITimelineElement {
  type: 'actor';
  readsView: string;
  sendsCommand: string;
}

/**
 * A command represents an intent to do something.
 * Named in imperative (e.g. ShipOrder, ProcessPayment).
 */
export interface Command extends ITimelineElement {
  type: 'command';
  example?: unknown;
}

/**
 * Union type for all timeline elements
 */
export type TimelineElement = Event | StateView | Actor | Command;

/**
 * The main information flow model
 */
export interface InformationFlowModel {
  $schema?: string;
  name: string;
  description?: string;
  version?: string;
  timeline: TimelineElement[];
}

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
 * View modes for the CLI
 */
export type ViewMode = 'timeline' | 'slice' | 'table';

/**
 * CLI options
 */
export interface CliOptions {
  view?: ViewMode;
  schema?: string;
  example?: boolean;
  output?: string;
}
