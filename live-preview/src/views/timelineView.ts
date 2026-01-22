import { InformationFlowModel } from '../types.js';
import { escapeHtml, syntaxHighlightJson, isEvent, isStateView, isActor, isCommand } from './utils.js';

export function renderTimelineView(model: InformationFlowModel): string {
  const sorted = [...model.timeline].sort((a, b) => a.tick - b.tick);

  const symbols: Record<string, string> = { event: '●', state: '◆', command: '▶', actor: '○' };

  const rows = sorted.map(el => {
    const symbol = symbols[el.type];
    const colorClass = el.type;

    // Position: event=left, state/command=center, actor=right
    const position = el.type === 'event' ? 'left'
                   : el.type === 'actor' ? 'right'
                   : 'center';

    // Build details based on type
    let details = '';
    if (isEvent(el)) {
      if (el.producedBy) {
        details += `<div class="tl-detail">producedBy: <span class="command">${escapeHtml(el.producedBy)}</span></div>`;
      }
      if (el.externalSource) {
        details += `<div class="tl-detail">externalSource: ${escapeHtml(el.externalSource)}</div>`;
      }
      if (el.example) {
        details += `<pre class="tl-json">${syntaxHighlightJson(el.example)}</pre>`;
      }
    } else if (isStateView(el)) {
      if (el.sourcedFrom.length > 0) {
        details += `<div class="tl-detail">sourcedFrom: ${el.sourcedFrom.map(e => `<span class="event">${escapeHtml(e)}</span>`).join(', ')}</div>`;
      }
      if (el.example) {
        details += `<pre class="tl-json">${syntaxHighlightJson(el.example)}</pre>`;
      }
    } else if (isActor(el)) {
      details += `<div class="tl-detail">reads <span class="state">${escapeHtml(el.readsView)}</span> → triggers <span class="command">${escapeHtml(el.sendsCommand)}</span></div>`;
    } else if (isCommand(el)) {
      if (el.example) {
        details += `<pre class="tl-json">${syntaxHighlightJson(el.example)}</pre>`;
      }
    }

    const hasDetails = details.length > 0;

    return hasDetails ? `
      <details class="tl-item tl-${position}">
        <summary class="tl-summary">
          <div class="tl-symbol ${colorClass}">${symbol}</div>
          <div class="tl-tick">@${el.tick}</div>
          <div class="tl-name ${colorClass}">${escapeHtml(el.name)}</div>
        </summary>
        <div class="tl-details">${details}</div>
      </details>
    ` : `
      <div class="tl-item tl-${position}">
        <div class="tl-symbol ${colorClass}">${symbol}</div>
        <div class="tl-tick">@${el.tick}</div>
        <div class="tl-name ${colorClass}">${escapeHtml(el.name)}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="timeline-view">
      <div class="tl-list">
        <div class="tl-line"></div>
        ${rows}
      </div>
    </div>
  `;
}
