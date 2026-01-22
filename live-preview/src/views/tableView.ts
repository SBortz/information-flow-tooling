import { InformationFlowModel } from '../types.js';
import { escapeHtml, isEvent, isStateView, isCommand, isActor } from './utils.js';

export function renderTableView(model: InformationFlowModel): string {
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
