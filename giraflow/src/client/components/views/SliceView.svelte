<script lang="ts">
  import { modelStore } from '../../stores/model.svelte';
  import type { StateView, Command, Event, Actor, Attachment } from '../../lib/types';
  import { isState, isCommand } from '../../lib/types';
  import JsonDisplay from '../shared/JsonDisplay.svelte';
  import Scenario from '../shared/Scenario.svelte';

  // Get slices (states and commands) sorted by tick
  let slices = $derived(
    modelStore.model
      ? modelStore.model.timeline
          .filter((el): el is StateView | Command => isState(el) || isCommand(el))
          .sort((a, b) => a.tick - b.tick)
      : []
  );

  // Map events produced by commands
  let eventsByCommand = $derived(() => {
    const map = new Map<string, Event[]>();
    for (const evt of modelStore.events) {
      if (evt.producedBy) {
        const existing = map.get(evt.producedBy) || [];
        existing.push(evt);
        map.set(evt.producedBy, existing);
      }
    }
    return map;
  });

  function getReadingActors(stateName: string): Actor[] {
    return modelStore.actors.filter(a => a.readsView === stateName);
  }

  function getTriggeringActors(commandName: string): Actor[] {
    return modelStore.actors.filter(a => a.sendsCommand === commandName);
  }

  function getProducedEvents(commandName: string, tick: number): Event[] {
    const key = `${commandName}-${tick}`;
    return eventsByCommand().get(key) || [];
  }
</script>

<div class="slice-view">
  {#each slices as slice}
    {@const isStateSlice = isState(slice)}
    {@const type = isStateSlice ? 'state' : 'command'}
    {@const symbol = isStateSlice ? '◆' : '▶'}

    <details class="slice-panel {type}" open={modelStore.expandAll}>
      <summary class="slice-header">
        <div>
          <span class="symbol {type}">{symbol}</span>
          <span class="name">{slice.name}</span>
        </div>
        <span class="tick">@{slice.tick}</span>
      </summary>

      <div class="slice-content">
        {#if slice.example}
          <div class="slice-json">
            <JsonDisplay data={slice.example} />
          </div>
        {/if}

        <div class="slice-details">
          {#if isState(slice)}
            {#if slice.sourcedFrom.length > 0}
              <div class="detail-section">
                <h4>Sourced From</h4>
                {#each slice.sourcedFrom as eventName}
                  <div class="detail-item">
                    <span class="event">● {eventName}</span>
                  </div>
                {/each}
              </div>
            {/if}

            {@const readingActors = getReadingActors(slice.name)}
            {#if readingActors.length > 0}
              <div class="detail-section">
                <h4>Read By</h4>
                {#each readingActors as actor}
                  <div class="detail-item">
                    <span class="actor">○ {actor.name}</span>
                    <span class="tick-ref">@{actor.tick}</span>
                    <span class="muted-ref">(→ {actor.sendsCommand})</span>
                  </div>
                {/each}
              </div>
            {/if}
          {:else if isCommand(slice)}
            {@const triggeringActors = getTriggeringActors(slice.name)}
            {#if triggeringActors.length > 0}
              <div class="detail-section">
                <h4>Triggered By</h4>
                {#each triggeringActors as actor}
                  <div class="detail-item">
                    <span class="actor">○ {actor.name}</span>
                    <span>←</span>
                    <span class="state">{actor.readsView}</span>
                  </div>
                {/each}
              </div>
            {/if}

            {@const producedEvents = getProducedEvents(slice.name, slice.tick)}
            {#if producedEvents.length > 0}
              <div class="detail-section">
                <h4>Produces</h4>
                {#each producedEvents as event}
                  <div class="detail-item">
                    <span class="event">● {event.name}</span>
                  </div>
                {/each}
              </div>
            {/if}
          {/if}
        </div>

        {#if slice.attachments && slice.attachments.length > 0}
          <div class="attachments">
            <h3>Attachments ({slice.attachments.length})</h3>
            <div class="attachment-list">
              {#each slice.attachments as attachment}
                <div class="attachment-item {attachment.type}">
                  {#if attachment.type === 'image' && attachment.path}
                    <figure>
                      <img src="/attachments/{attachment.path}" alt={attachment.label} />
                      <figcaption>{attachment.label}</figcaption>
                    </figure>
                  {:else if attachment.type === 'link' && attachment.url}
                    <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                      <span class="attachment-icon">🔗</span>
                      {attachment.label}
                    </a>
                  {:else if attachment.type === 'note' && attachment.content}
                    <div class="attachment-note">
                      <span class="attachment-label">{attachment.label}</span>
                      <p>{attachment.content}</p>
                    </div>
                  {:else if attachment.type === 'file' && attachment.path}
                    <a href="/attachments/{attachment.path}" target="_blank" rel="noopener noreferrer" class="attachment-file">
                      <span class="attachment-icon">📄</span>
                      {attachment.label}
                      <span class="attachment-path">{attachment.path}</span>
                    </a>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}

        {#if isState(slice) && slice.scenarios && slice.scenarios.length > 0}
          <div class="scenarios">
            <h3>Scenarios ({slice.scenarios.length})</h3>
            {#each slice.scenarios as scenario}
              <Scenario {scenario} type="state" />
            {/each}
          </div>
        {:else if isCommand(slice) && slice.scenarios && slice.scenarios.length > 0}
          <div class="scenarios">
            <h3>Scenarios ({slice.scenarios.length})</h3>
            {#each slice.scenarios as scenario}
              <Scenario {scenario} type="command" />
            {/each}
          </div>
        {/if}
      </div>
    </details>
  {/each}
</div>

<style>
  .slice-view {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 2rem;
  }

  .slice-panel {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    overflow: hidden;
    box-shadow: var(--shadow-card);
  }

  .slice-panel.state {
    border-left: 4px solid var(--color-state);
  }

  .slice-panel.command {
    border-left: 4px solid var(--color-command);
  }

  .slice-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    list-style: none;
  }

  .slice-header::-webkit-details-marker {
    display: none;
  }

  .slice-panel:not([open]) .slice-header {
    border-bottom: none;
  }

  .slice-header .name {
    font-weight: 600;
    font-size: 1.1rem;
  }

  .slice-header .tick {
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-family: var(--font-mono);
  }

  .slice-header .symbol {
    font-size: 1.25rem;
    margin-right: 0.5rem;
  }

  .slice-header .symbol.state { color: var(--color-state); }
  .slice-header .symbol.command { color: var(--color-command); }

  .slice-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    padding: 1.5rem;
  }

  @media (max-width: 900px) {
    .slice-content {
      grid-template-columns: 1fr;
    }
  }

  .slice-json {
    background: var(--bg-primary);
    border-radius: 0.5rem;
    padding: 1rem;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    overflow-x: auto;
  }

  .slice-details {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .detail-section h4 {
    color: var(--text-secondary);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .detail-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    padding: 0.25rem 0;
  }

  .detail-item .event { color: var(--color-event); }
  .detail-item .state { color: var(--color-state); }
  .detail-item .command { color: var(--color-command); }
  .detail-item .actor { color: var(--color-actor); }

  .detail-item .tick-ref {
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  .detail-item .muted-ref {
    color: var(--text-secondary);
    opacity: 0.6;
    font-size: 0.8rem;
  }

  .attachments {
    grid-column: 1 / -1;
    border-top: 1px solid var(--border);
    padding-top: 1.5rem;
  }

  .attachments h3 {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-bottom: 1rem;
  }

  .attachment-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .attachment-item.image figure {
    margin: 0;
  }

  .attachment-item.image img {
    max-width: 100%;
    border-radius: 0.5rem;
    border: 1px solid var(--border);
  }

  .attachment-item.image figcaption {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
  }

  .attachment-item.link a,
  .attachment-item.file a {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-link, #5b9fd4);
    text-decoration: none;
    font-size: 0.875rem;
    padding: 0.5rem 0.75rem;
    background: var(--bg-secondary);
    border-radius: 0.375rem;
    border: 1px solid var(--border);
  }

  .attachment-item.link a:hover,
  .attachment-item.file a:hover {
    border-color: var(--color-link, #5b9fd4);
  }

  .attachment-path {
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-family: var(--font-mono);
    margin-left: auto;
  }

  .attachment-note {
    padding: 0.5rem 0.75rem;
    background: var(--bg-secondary);
    border-radius: 0.375rem;
    border: 1px solid var(--border);
  }

  .attachment-note .attachment-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .attachment-note p {
    margin: 0.25rem 0 0;
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .scenarios {
    grid-column: 1 / -1;
    border-top: 1px solid var(--border);
    padding-top: 1.5rem;
  }

  .scenarios h3 {
    font-size: 0.875rem;
    color: var(--color-warning);
    margin-bottom: 1rem;
  }
</style>
