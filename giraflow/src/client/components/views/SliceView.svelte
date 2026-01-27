<script lang="ts">
  import { modelStore } from '../../stores/model.svelte';
  import type { StateView, Command, Event, Actor, Attachment, CommandScenario, StateViewScenario, CommandEvolutionScenario, TimelineEvolutionRow } from '../../lib/types';
  import { isState, isCommand, isEvent } from '../../lib/types';
  import JsonDisplay from '../shared/JsonDisplay.svelte';
  import Scenario from '../shared/Scenario.svelte';

  interface DeduplicatedSlice {
    name: string;
    type: 'state' | 'command';
    ticks: number[];
    sourcedFrom: string[];
    attachments: Attachment[];
    scenarios: (CommandScenario | StateViewScenario | CommandEvolutionScenario)[];
    specScenarioCount: number;
    stateOccurrences: { tick: number; state: StateView }[];
    commandOccurrences: { tick: number; command: Command; producedEvents: Event[] }[];
  }

  let deduplicatedSlices = $derived(buildDeduplicatedSlices());

  function buildDeduplicatedSlices(): DeduplicatedSlice[] {
    if (!modelStore.model) return [];
    const timeline = modelStore.model.timeline;
    const events = timeline.filter(isEvent) as Event[];
    const elements = timeline
      .filter((el): el is StateView | Command => isState(el) || isCommand(el))
      .sort((a, b) => a.tick - b.tick);

    const seen = new Map<string, DeduplicatedSlice>();
    for (const el of elements) {
      const key = `${el.type}:${el.name}`;
      if (!seen.has(key)) {
        seen.set(key, {
          name: el.name,
          type: el.type as 'state' | 'command',
          ticks: [],
          sourcedFrom: [],
          attachments: [],
          scenarios: [],
          specScenarioCount: 0,
          stateOccurrences: [],
          commandOccurrences: []
        });
      }
      const slice = seen.get(key)!;
      slice.ticks.push(el.tick);

      if (isState(el)) {
        for (const s of el.sourcedFrom) {
          if (!slice.sourcedFrom.includes(s)) slice.sourcedFrom.push(s);
        }
      }
      if (el.attachments) slice.attachments.push(...el.attachments);

      // Collect state and command occurrences for later consolidation
      if (isState(el)) {
        slice.stateOccurrences.push({ tick: el.tick, state: el });
      } else if (isCommand(el)) {
        const producedEvents = events.filter(e => e.producedBy === `${el.name}-${el.tick}`);
        slice.commandOccurrences.push({ tick: el.tick, command: el, producedEvents });
      }
    }

    // Convert state occurrences to single timeline scenario
    for (const [, slice] of seen) {
      if (slice.type === 'state' && slice.stateOccurrences.length > 0) {
        const steps = slice.stateOccurrences.map((occ, index) => {
          const prevTick = index > 0 ? slice.stateOccurrences[index - 1].tick : 0;
          const precedingEvent = events.find(e =>
            e.tick > prevTick &&
            e.tick < occ.tick &&
            occ.state.sourcedFrom.includes(e.name)
          );
          return {
            given: {
              event: precedingEvent?.name ?? '(initial)',
              ...(precedingEvent?.example ? { data: precedingEvent.example } : {})
            },
            then: occ.state.example
          };
        });
        slice.scenarios.push({
          name: 'Timeline Evolution',
          steps
        });
      }
    }

    // Convert command occurrences to chronological timeline evolution
    for (const [, slice] of seen) {
      if (slice.type === 'command' && slice.commandOccurrences.length > 0) {
        const rows: TimelineEvolutionRow[] = [];
        let lastTick = 0;

        for (const occ of slice.commandOccurrences) {
          // Events zwischen lastTick und diesem Command
          const eventsBetween = events
            .filter(e => e.tick > lastTick && e.tick < occ.tick)
            .map(e => ({ event: e.name, ...(e.example ? { data: e.example } : {}) }));

          if (eventsBetween.length > 0) {
            rows.push({ type: 'events-only', events: eventsBetween });
          }

          // Command mit produced Events
          rows.push({
            type: 'command',
            command: {
              name: occ.command.name,
              ...(occ.command.example ? { data: occ.command.example } : {})
            },
            producedEvents: occ.producedEvents.map(e => ({
              event: e.name,
              ...(e.example ? { data: e.example } : {})
            }))
          });

          // Update lastTick to include produced events
          const maxProducedTick = Math.max(occ.tick, ...occ.producedEvents.map(e => e.tick));
          lastTick = maxProducedTick;
        }

        slice.scenarios.push({ name: 'Timeline Evolution', rows });
      }
    }

    // Add spec scenarios (after Timeline Evolution for both states and commands)
    for (const [, slice] of seen) {
      const specScenarios = modelStore.model?.specifications
        ?.find(s => s.name === slice.name && s.type === slice.type)
        ?.scenarios ?? [];
      slice.specScenarioCount = specScenarios.length;
      // Timeline Evolution first, then spec scenarios
      slice.scenarios = [...slice.scenarios, ...specScenarios];
    }

    return [...seen.values()];
  }

  function getReadingActors(stateName: string): Actor[] {
    return modelStore.actors.filter(a => a.readsView === stateName);
  }

  function getTriggeringActors(commandName: string): Actor[] {
    return modelStore.actors.filter(a => a.sendsCommand === commandName);
  }
</script>

<div class="slice-view">
  {#each deduplicatedSlices as slice}
    {@const symbol = slice.type === 'state' ? '◆' : '▶'}

    <details class="slice-panel {slice.type}" open={modelStore.expandAll}>
      <summary class="slice-header">
        <div>
          <span class="symbol {slice.type}">{symbol}</span>
          <span class="name">{slice.name}</span>
        </div>
        <span class="tick">{slice.ticks.map(t => `@${t}`).join(', ')}</span>
      </summary>

      <div class="slice-content">
        <div class="slice-details">
          {#if slice.type === 'state'}
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
          {:else}
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
          {/if}
        </div>

        {#if slice.attachments.length > 0}
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

        {#if slice.scenarios.length > 0}
          <div class="scenarios">
            <h3>Scenarios ({slice.scenarios.length})</h3>
            {#each slice.scenarios as scenario}
              <Scenario {scenario} type={slice.type} sliceName={slice.name} />
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
