<script lang="ts">
  import { modelStore } from '../../stores/model.svelte';
  import type { Event, StateView, Command, Actor } from '../../lib/types';

  // Deduplicate by name
  function uniqueByName<T extends { name: string }>(items: T[]): T[] {
    return [...new Map(items.map(item => [item.name, item])).values()];
  }

  let events = $derived(modelStore.events.sort((a, b) => a.tick - b.tick));
  let uniqueStates = $derived(uniqueByName(modelStore.states));
  let uniqueCommands = $derived(uniqueByName(modelStore.commands));
  let uniqueActors = $derived(uniqueByName(modelStore.actors));
</script>

<div class="table-view">
  {#if modelStore.model}
    <div class="model-info">
      <div class="model-info-header">
        <h2>{modelStore.model.name}</h2>
        {#if modelStore.model.version}
          <span class="model-version">v{modelStore.model.version}</span>
        {/if}
      </div>
      {#if modelStore.model.description}
        <p class="model-description">{modelStore.model.description}</p>
      {/if}
    </div>
  {/if}

  {#if events.length > 0}
    <div class="table-section">
      <h2 class="events"><span class="symbol">●</span> Events ({events.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Tick</th>
            <th>Name</th>
            <th>Produced By</th>
            <th>External Source</th>
          </tr>
        </thead>
        <tbody>
          {#each events as event}
            <tr>
              <td>@{event.tick}</td>
              <td><span class="event">{event.name}</span></td>
              <td>
                {#if event.producedBy}
                  <span class="command">{event.producedBy}</span>
                {:else}
                  —
                {/if}
              </td>
              <td>{event.externalSource || '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#if uniqueStates.length > 0}
    <div class="table-section">
      <h2 class="states"><span class="symbol">◆</span> State Views ({uniqueStates.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Sourced From</th>
          </tr>
        </thead>
        <tbody>
          {#each uniqueStates as state}
            <tr>
              <td><span class="state">{state.name}</span></td>
              <td>
                {#each state.sourcedFrom as eventName, i}
                  <span class="event">{eventName}</span>{i < state.sourcedFrom.length - 1 ? ', ' : ''}
                {/each}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#if uniqueCommands.length > 0}
    <div class="table-section">
      <h2 class="commands"><span class="symbol">▶</span> Commands ({uniqueCommands.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>
          {#each uniqueCommands as command}
            <tr>
              <td><span class="command">{command.name}</span></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#if uniqueActors.length > 0}
    <div class="table-section">
      <h2 class="actors"><span class="symbol">○</span> Actors ({uniqueActors.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Reads</th>
            <th>Sends</th>
          </tr>
        </thead>
        <tbody>
          {#each uniqueActors as actor}
            <tr>
              <td><span class="actor">{actor.name}</span></td>
              <td><span class="state">{actor.readsView}</span></td>
              <td><span class="command">{actor.sendsCommand}</span></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .table-view {
    padding: 2rem;
  }

  .model-info {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    padding: 1.25rem 1.5rem;
    margin-bottom: 2rem;
    box-shadow: var(--shadow-card);
  }

  .model-info-header {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
  }

  .model-info-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .model-version {
    font-size: 0.75rem;
    font-family: var(--font-mono);
    color: var(--text-secondary);
  }

  .model-description {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .table-section {
    margin-bottom: 2rem;
  }

  .table-section h2 {
    font-size: 1rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .table-section h2 .symbol {
    font-size: 1.25rem;
  }

  .table-section h2.events .symbol { color: var(--color-event); }
  .table-section h2.states .symbol { color: var(--color-state); }
  .table-section h2.commands .symbol { color: var(--color-command); }
  .table-section h2.actors .symbol { color: var(--color-actor); }

  table {
    width: 100%;
    border-collapse: collapse;
    background: var(--bg-card);
    border-radius: 0.5rem;
    overflow: hidden;
    box-shadow: var(--shadow-card);
  }

  th, td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }

  th {
    background: var(--bg-secondary);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:hover td {
    background: var(--bg-secondary);
  }

  .event { color: var(--color-event); }
  .state { color: var(--color-state); }
  .command { color: var(--color-command); }
  .actor { color: var(--color-actor); }
</style>
