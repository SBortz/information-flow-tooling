import {
  TimelineElement,
  Event,
  StateView,
  Command,
  Actor,
} from '../types.js';

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function syntaxHighlightJson(json: unknown): string {
  const str = JSON.stringify(json, null, 2);
  return str
    .replace(/"([^"]+)":/g, '<span class="key">"$1"</span>:')
    .replace(/: "([^"]+)"/g, ': <span class="string">"$1"</span>')
    .replace(/: (\d+)/g, ': <span class="number">$1</span>')
    .replace(/: (true|false)/g, ': <span class="boolean">$1</span>');
}

export function isEvent(el: TimelineElement): el is Event {
  return el.type === 'event';
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
