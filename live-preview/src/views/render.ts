import { CSS } from './styles.js';
import {
  InformationFlowModel,
  TimelineElement,
  Event,
  StateView,
  Command,
  Actor,
  ViewMode,
  CommandScenario,
  StateViewScenario,
} from '../types.js';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function syntaxHighlightJson(json: unknown): string {
  const str = JSON.stringify(json, null, 2);
  return str
    .replace(/"([^"]+)":/g, '<span class="key">"$1"</span>:')
    .replace(/: "([^"]+)"/g, ': <span class="string">"$1"</span>')
    .replace(/: (\d+)/g, ': <span class="number">$1</span>')
    .replace(/: (true|false)/g, ': <span class="boolean">$1</span>');
}

function isEvent(el: TimelineElement): el is Event {
  return el.type === 'event';
}

function isStateView(el: TimelineElement): el is StateView {
  return el.type === 'state';
}

function isCommand(el: TimelineElement): el is Command {
  return el.type === 'command';
}

function isActor(el: TimelineElement): el is Actor {
  return el.type === 'actor';
}

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
      givenHtml = '<em>(keine Vorbedingungen)</em>';
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
      givenHtml = '<em>(keine Events)</em>';
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

function renderSliceView(model: InformationFlowModel): string {
  const events = model.timeline.filter(isEvent);
  const actors = model.timeline.filter(isActor);
  const slices = model.timeline
    .filter(el => isStateView(el) || isCommand(el))
    .sort((a, b) => a.tick - b.tick) as (StateView | Command)[];
  
  const eventsByCommandTick = new Map<string, Event[]>();
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

function renderTimelineView(model: InformationFlowModel): string {
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
    
    return `
      <div class="tl-item tl-${position}">
        <div class="tl-symbol ${colorClass}">${symbol}</div>
        <div class="tl-tick">@${el.tick}</div>
        <div class="tl-content">
          <div class="tl-name ${colorClass}">${escapeHtml(el.name)}</div>
          ${details ? `<div class="tl-details">${details}</div>` : ''}
        </div>
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

function renderTableView(model: InformationFlowModel): string {
  const events = model.timeline.filter(isEvent);
  const states = model.timeline.filter(isStateView);
  const commands = model.timeline.filter(isCommand);
  const actors = model.timeline.filter(isActor);
  
  const eventsTable = events.length > 0 ? `
    <div class="table-section">
      <h2 class="events"><span class="symbol">●</span> Events (${events.length})</h2>
      <table>
        <thead><tr><th>Tick</th><th>Name</th><th>Produced By</th><th>External Source</th></tr></thead>
        <tbody>
          ${events.sort((a, b) => a.tick - b.tick).map(e => `
            <tr>
              <td>@${e.tick}</td>
              <td><span class="event">${escapeHtml(e.name)}</span></td>
              <td>${e.producedBy ? `<span class="command">${escapeHtml(e.producedBy)}</span>` : '—'}</td>
              <td>${e.externalSource || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';
  
  const uniqueStates = [...new Map(states.map(s => [s.name, s])).values()];
  const statesTable = uniqueStates.length > 0 ? `
    <div class="table-section">
      <h2 class="states"><span class="symbol">◆</span> State Views (${uniqueStates.length})</h2>
      <table>
        <thead><tr><th>Name</th><th>Sourced From</th></tr></thead>
        <tbody>
          ${uniqueStates.map(s => `
            <tr>
              <td><span class="state">${escapeHtml(s.name)}</span></td>
              <td>${s.sourcedFrom.map(e => `<span class="event">${escapeHtml(e)}</span>`).join(', ')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';
  
  const uniqueCommands = [...new Map(commands.map(c => [c.name, c])).values()];
  const commandsTable = uniqueCommands.length > 0 ? `
    <div class="table-section">
      <h2 class="commands"><span class="symbol">▶</span> Commands (${uniqueCommands.length})</h2>
      <table>
        <thead><tr><th>Name</th></tr></thead>
        <tbody>
          ${uniqueCommands.map(c => `
            <tr><td><span class="command">${escapeHtml(c.name)}</span></td></tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';
  
  const uniqueActors = [...new Map(actors.map(a => [a.name, a])).values()];
  const actorsTable = uniqueActors.length > 0 ? `
    <div class="table-section">
      <h2 class="actors"><span class="symbol">○</span> Actors (${uniqueActors.length})</h2>
      <table>
        <thead><tr><th>Name</th><th>Reads</th><th>Sends</th></tr></thead>
        <tbody>
          ${uniqueActors.map(a => `
            <tr>
              <td><span class="actor">${escapeHtml(a.name)}</span></td>
              <td><span class="state">${escapeHtml(a.readsView)}</span></td>
              <td><span class="command">${escapeHtml(a.sendsCommand)}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';
  
  return `<div class="table-view">${eventsTable}${statesTable}${commandsTable}${actorsTable}</div>`;
}

export function renderHtml(model: InformationFlowModel, view: ViewMode, error?: string, watchedFile?: string): string {
  const viewContent = error
    ? `<div class="error"><h2>Error</h2><pre>${escapeHtml(error)}</pre></div>`
    : view === 'slice' ? renderSliceView(model)
    : view === 'timeline' ? renderTimelineView(model)
    : renderTableView(model);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(model.name)} - Information Flow Live Preview</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>${CSS}</style>
</head>
<body>
  <header class="header">
    <div>
      <h1>${escapeHtml(model.name)}</h1>
      ${model.description ? `<p class="meta">${escapeHtml(model.description)}</p>` : ''}
    </div>
    <div>
      ${model.version ? `<span class="meta">v${escapeHtml(model.version)}</span>` : ''}
      <span class="status">Watching ${watchedFile ? `${escapeHtml(watchedFile)}` : ''}</span>
    </div>
  </header>
  
  <nav class="tabs">
    <button class="tab ${view === 'timeline' ? 'active' : ''}" onclick="setView('timeline')">Timeline</button>  
    <button class="tab ${view === 'slice' ? 'active' : ''}" onclick="setView('slice')">Slices & Scenarios</button>
    <button class="tab ${view === 'table' ? 'active' : ''}" onclick="setView('table')">Consolidated</button>
    
    <label class="toggle-details">
      <input type="checkbox" id="showDetails" onchange="toggleDetails(this.checked)" checked>
      <span>Details</span>
    </label>
  </nav>
  
  <main>
    ${viewContent}
  </main>
  
  <script>
    // Live reload via Server-Sent Events
    const events = new EventSource('/events');
    events.onmessage = () => location.reload();
    events.onerror = () => console.log('SSE connection lost, retrying...');
    
    // View switching
    function setView(view) {
      const url = new URL(window.location);
      url.searchParams.set('view', view);
      window.location = url;
    }
    
    // Toggle details visibility
    function toggleDetails(show) {
      document.body.classList.toggle('hide-details', !show);
      localStorage.setItem('showDetails', show);
    }
    
    // Restore details preference
    const savedPref = localStorage.getItem('showDetails');
    if (savedPref === 'false') {
      document.getElementById('showDetails').checked = false;
      document.body.classList.add('hide-details');
    }
  </script>
</body>
</html>`;
}
