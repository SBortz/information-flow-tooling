import {
  InformationFlowModel,
  StateView,
  Command,
  CommandScenario,
  StateViewScenario,
} from '../types.js';
import { escapeHtml, syntaxHighlightJson, isEvent, isStateView, isCommand, isActor } from './utils.js';

function renderEventDataJson(data: unknown): string {
  return `<pre class="scenario-json">${syntaxHighlightJson(data)}</pre>`;
}

function renderCommandScenarios(scenarios: CommandScenario[], commandName: string): string {
  return scenarios.map(scenario => {
    const icon = scenario.then.fails ? '✗' : '✓';
    const iconClass = scenario.then.fails ? 'failure' : 'success';

    let givenHtml = '';
    if (scenario.given.length > 0) {
      givenHtml = `<div class="step-items">${scenario.given.map(ref => {
        const data = ref.data ? renderEventDataJson(ref.data) : '';
        return `<div class="step-item"><span class="event">● ${escapeHtml(ref.event)}</span>${data}</div>`;
      }).join('')}</div>`;
    } else {
      givenHtml = '<em>(no preconditions)</em>';
    }

    const whenHtml = scenario.when
      ? `<span class="command">▶ ${escapeHtml(commandName)}</span>${renderEventDataJson(scenario.when)}`
      : '';

    let thenHtml = '';
    if (scenario.then.fails) {
      thenHtml = `<span class="icon failure">✗</span> ${escapeHtml(scenario.then.fails)}`;
    } else if (scenario.then.produces && scenario.then.produces.length > 0) {
      thenHtml = `<div class="step-items">${scenario.then.produces.map(ref => {
        const data = ref.data ? renderEventDataJson(ref.data) : '';
        return `<div class="step-item">→ <span class="event">● ${escapeHtml(ref.event)}</span>${data}</div>`;
      }).join('')}</div>`;
    }

    return `
      <details class="scenario">
        <summary class="scenario-header">
          <span class="icon ${iconClass}">${icon}</span>
          <span class="name">${escapeHtml(scenario.name)}</span>
        </summary>
        <div class="scenario-body">
          <div class="scenario-step"><span class="label">Given:</span> ${givenHtml}</div>
          ${whenHtml ? `<div class="scenario-step"><span class="label">When:</span> ${whenHtml}</div>` : ''}
          <div class="scenario-step"><span class="label">Then:</span> ${thenHtml}</div>
        </div>
      </details>
    `;
  }).join('');
}

function renderStateViewScenarios(scenarios: StateViewScenario[]): string {
  return scenarios.map(scenario => {
    let givenHtml = '';
    if (scenario.given.length > 0) {
      givenHtml = `<div class="step-items">${scenario.given.map(ref => {
        const data = ref.data ? renderEventDataJson(ref.data) : '';
        return `<div class="step-item"><span class="event">● ${escapeHtml(ref.event)}</span>${data}</div>`;
      }).join('')}</div>`;
    } else {
      givenHtml = '<em>(no events)</em>';
    }

    const thenHtml = scenario.then
      ? renderEventDataJson(scenario.then)
      : '';

    return `
      <details class="scenario">
        <summary class="scenario-header">
          <span class="icon success">◇</span>
          <span class="name">${escapeHtml(scenario.name)}</span>
        </summary>
        <div class="scenario-body">
          <div class="scenario-step"><span class="label">Given:</span> ${givenHtml}</div>
          <div class="scenario-step"><span class="label">Then:</span> ${thenHtml}</div>
        </div>
      </details>
    `;
  }).join('');
}

export function renderSliceView(model: InformationFlowModel): string {
  const events = model.timeline.filter(isEvent);
  const actors = model.timeline.filter(isActor);
  const slices = model.timeline
    .filter(el => isStateView(el) || isCommand(el))
    .sort((a, b) => a.tick - b.tick) as (StateView | Command)[];

  const eventsByCommandTick = new Map<string, typeof events>();
  for (const evt of events) {
    if (evt.producedBy) {
      const existing = eventsByCommandTick.get(evt.producedBy) || [];
      existing.push(evt);
      eventsByCommandTick.set(evt.producedBy, existing);
    }
  }

  const panels = slices.map(slice => {
    const isState = isStateView(slice);
    const type = isState ? 'state' : 'command';
    const symbol = isState ? '◆' : '▶';

    let detailsHtml = '';
    let scenariosHtml = '';

    if (isStateView(slice)) {
      const sv = slice;
      if (sv.sourcedFrom.length > 0) {
        detailsHtml += `
          <div class="detail-section">
            <h4>Sourced From</h4>
            ${sv.sourcedFrom.map(e => `<div class="detail-item"><span class="event">● ${escapeHtml(e)}</span></div>`).join('')}
          </div>
        `;
      }

      const readingActors = actors.filter(a => a.readsView === sv.name);
      if (readingActors.length > 0) {
        detailsHtml += `
          <div class="detail-section">
            <h4>Read By</h4>
            ${readingActors.map(a => `
              <div class="detail-item">
                <span class="actor">○ ${escapeHtml(a.name)}</span>
                <span class="tick-ref">@${a.tick}</span>
                <span class="muted-ref">(→ ${escapeHtml(a.sendsCommand)})</span>
              </div>
            `).join('')}
          </div>
        `;
      }

      if (sv.scenarios && sv.scenarios.length > 0) {
        scenariosHtml = `
          <div class="scenarios">
            <h3>Scenarios (${sv.scenarios.length})</h3>
            ${renderStateViewScenarios(sv.scenarios)}
          </div>
        `;
      }
    } else if (isCommand(slice)) {
      const cmd = slice;
      const triggeringActors = actors.filter(a => a.sendsCommand === cmd.name);
      if (triggeringActors.length > 0) {
        detailsHtml += `
          <div class="detail-section">
            <h4>Triggered By</h4>
            ${triggeringActors.map(a => `
              <div class="detail-item">
                <span class="actor">○ ${escapeHtml(a.name)}</span>
                <span>←</span>
                <span class="state">${escapeHtml(a.readsView)}</span>
              </div>
            `).join('')}
          </div>
        `;
      }

      const cmdKey = `${cmd.name}-${cmd.tick}`;
      const producedEvents = eventsByCommandTick.get(cmdKey) || [];
      if (producedEvents.length > 0) {
        detailsHtml += `
          <div class="detail-section">
            <h4>Produces</h4>
            ${producedEvents.map(e => `<div class="detail-item"><span class="event">● ${escapeHtml(e.name)}</span></div>`).join('')}
          </div>
        `;
      }

      if (cmd.scenarios && cmd.scenarios.length > 0) {
        scenariosHtml = `
          <div class="scenarios">
            <h3>Scenarios (${cmd.scenarios.length})</h3>
            ${renderCommandScenarios(cmd.scenarios, cmd.name)}
          </div>
        `;
      }
    }

    const jsonHtml = slice.example
      ? `<div class="slice-json"><pre>${syntaxHighlightJson(slice.example)}</pre></div>`
      : '';

    return `
      <div class="slice-panel ${type}">
        <div class="slice-header">
          <div>
            <span class="symbol ${type}">${symbol}</span>
            <span class="name">${escapeHtml(slice.name)}</span>
          </div>
          <span class="tick">@${slice.tick}</span>
        </div>
        <div class="slice-content">
          ${jsonHtml}
          <div class="slice-details">${detailsHtml}</div>
          ${scenariosHtml}
        </div>
      </div>
    `;
  }).join('');

  return `<div class="slice-view">${panels}</div>`;
}
