<script lang="ts">
  import { modelStore } from "../../stores/model.svelte";
  import type {
    StateView,
    Command,
    Event,
    Actor,
    Attachment,
    CommandScenario,
    StateViewScenario,
    TimelineScenario,
    TimelineScenarioRow,
  } from "../../lib/types";
  import { isState, isCommand, isEvent } from "../../lib/types";
  import JsonDisplay from "../shared/JsonDisplay.svelte";
  import Scenario from "../shared/Scenario.svelte";

  interface DeduplicatedSlice {
    name: string;
    type: "state" | "command";
    ticks: number[];
    sourcedFrom: { name: string; ticks: number[] }[];
    produces: { name: string; ticks: number[] }[];
    attachments: Attachment[];
    scenarios: (CommandScenario | StateViewScenario | TimelineScenario)[];
    specScenarioCount: number;
    stateOccurrences: { tick: number; state: StateView }[];
    commandOccurrences: {
      tick: number;
      command: Command;
      producedEvents: Event[];
    }[];
    example?: any;
  }

  let deduplicatedSlices = $derived(buildDeduplicatedSlices());
  let selectedSliceKey = $state<string | null>(null);

  // Select first slice by default
  $effect(() => {
    if (!selectedSliceKey && deduplicatedSlices.length > 0) {
      selectedSliceKey = getSliceKey(deduplicatedSlices[0]);
    }
  });

  let selectedSlice = $derived(
    selectedSliceKey
      ? deduplicatedSlices.find((s) => getSliceKey(s) === selectedSliceKey)
      : null,
  );

  function getSliceKey(slice: DeduplicatedSlice) {
    return `${slice.type}:${slice.name}`;
  }

  function buildDeduplicatedSlices(): DeduplicatedSlice[] {
    if (!modelStore.model) return [];
    const timeline = modelStore.model.timeline;
    const events = timeline.filter(isEvent) as Event[];
    const elements = timeline
      .filter((el): el is StateView | Command => isState(el) || isCommand(el))
      .sort((a, b) => a.tick - b.tick);

    const seen = new Map<string, DeduplicatedSlice>();
    // Temporary helper to collect source names before aggregating ticks
    const sliceSourceNames = new Map<string, Set<string>>();

    for (const el of elements) {
      const key = `${el.type}:${el.name}`;
      if (!seen.has(key)) {
        seen.set(key, {
          name: el.name,
          type: el.type as "state" | "command",
          ticks: [],
          sourcedFrom: [],
          produces: [],
          attachments: [],
          scenarios: [],
          specScenarioCount: 0,
          stateOccurrences: [],
          commandOccurrences: [],
        });
        sliceSourceNames.set(key, new Set());
      }
      const slice = seen.get(key)!;
      slice.ticks.push(el.tick);

      // Capture example if not yet set
      if (!slice.example && el.example) {
        slice.example = el.example;
      }

      if (isState(el)) {
        for (const s of el.sourcedFrom) {
          sliceSourceNames.get(key)!.add(s);
        }
      }
      if (el.attachments) slice.attachments.push(...el.attachments);

      // Collect state and command occurrences for later consolidation
      if (isState(el)) {
        slice.stateOccurrences.push({ tick: el.tick, state: el });
      } else if (isCommand(el)) {
        const producedEvents = events.filter(
          (e) => e.producedBy === `${el.name}-${el.tick}`,
        );
        slice.commandOccurrences.push({
          tick: el.tick,
          command: el,
          producedEvents,
        });
      }
    }

    // Populate data
    for (const [key, slice] of seen) {
      if (slice.type === "state") {
        const sourceNames = sliceSourceNames.get(key)!;
        for (const sourceName of sourceNames) {
          // Find all occurrences of this event
          const sourceEvents = events.filter((e) => e.name === sourceName);
          slice.sourcedFrom.push({
            name: sourceName,
            ticks: sourceEvents.map((e) => e.tick),
          });
        }
      } else if (slice.type === "command") {
        // Aggregate produced events
        const producedMap = new Map<string, number[]>();
        for (const occ of slice.commandOccurrences) {
          for (const evt of occ.producedEvents) {
            if (!producedMap.has(evt.name)) {
              producedMap.set(evt.name, []);
            }
            producedMap.get(evt.name)!.push(evt.tick);
          }
        }
        slice.produces = Array.from(producedMap.entries()).map(
          ([name, ticks]) => ({
            name,
            ticks: ticks.sort((a, b) => a - b),
          }),
        );
      }
    }

    // Convert state occurrences to single timeline scenario
    for (const [, slice] of seen) {
      if (slice.type === "state" && slice.stateOccurrences.length > 0) {
        const steps = slice.stateOccurrences.map((occ, index) => {
          const prevTick =
            index > 0 ? slice.stateOccurrences[index - 1].tick : 0;
          const precedingEvent = events.find(
            (e) =>
              e.tick > prevTick &&
              e.tick < occ.tick &&
              occ.state.sourcedFrom.includes(e.name),
          );
          return {
            given: {
              event: precedingEvent?.name ?? "(initial)",
              ...(precedingEvent?.example
                ? { data: precedingEvent.example }
                : {}),
            },
            then: occ.state.example,
          };
        });
        slice.scenarios.push({
          name: "Timeline Scenario",
          steps,
        });
      }
    }

    // Convert command occurrences to chronological timeline scenario
    for (const [, slice] of seen) {
      if (slice.type === "command" && slice.commandOccurrences.length > 0) {
        const rows: TimelineScenarioRow[] = [];
        let lastTick = 0;

        for (const occ of slice.commandOccurrences) {
          // Events zwischen lastTick und diesem Command
          const eventsBetween = events
            .filter((e) => e.tick > lastTick && e.tick < occ.tick)
            .map((e) => ({
              event: e.name,
              ...(e.example ? { data: e.example } : {}),
            }));

          if (eventsBetween.length > 0) {
            rows.push({ type: "events-only", events: eventsBetween });
          }

          // Command mit produced Events
          rows.push({
            type: "command",
            command: {
              name: occ.command.name,
              ...(occ.command.example ? { data: occ.command.example } : {}),
            },
            producedEvents: occ.producedEvents.map((e) => ({
              event: e.name,
              ...(e.example ? { data: e.example } : {}),
            })),
          });

          // Update lastTick to include produced events
          const maxProducedTick = Math.max(
            occ.tick,
            ...occ.producedEvents.map((e) => e.tick),
          );
          lastTick = maxProducedTick;
        }

        slice.scenarios.push({ name: "Timeline Scenario", rows });
      }
    }

    // Add spec scenarios (after Timeline Scenario for both states and commands)
    for (const [, slice] of seen) {
      const specScenarios =
        modelStore.model?.specifications?.find(
          (s) => s.name === slice.name && s.type === slice.type,
        )?.scenarios ?? [];
      slice.specScenarioCount = specScenarios.length;
      // Timeline Scenario first, then spec scenarios
      slice.scenarios = [...slice.scenarios, ...specScenarios];
    }

    return [...seen.values()];
  }

  function getReadingActors(stateName: string): Actor[] {
    return modelStore.actors.filter((a) => a.readsView === stateName);
  }

  function getTriggeringActors(commandName: string): Actor[] {
    return modelStore.actors.filter((a) => a.sendsCommand === commandName);
  }
</script>

<div class="slice-explorer">
  <aside class="sidebar">
    <div class="sidebar-header">
      <h3>Slices</h3>
      <span class="count">{deduplicatedSlices.length}</span>
    </div>
    <div class="slice-list">
      {#each deduplicatedSlices as slice}
        {@const isActive = selectedSliceKey === getSliceKey(slice)}
        <button
          class="slice-item {slice.type} {isActive ? 'active' : ''}"
          onclick={() => (selectedSliceKey = getSliceKey(slice))}
        >
          <div class="slice-item-main">
            <span class="symbol {slice.type}"
              >{slice.type === "state" ? "◆" : "▶"}</span
            >
            <span class="name">{slice.name}</span>
          </div>
        </button>
      {/each}
    </div>
  </aside>

  <section class="main-content">
    {#if selectedSlice}
      <div class="slice-detail-view">
        <div class="slice-card {selectedSlice.type}">
          <header class="detail-header {selectedSlice.type}">
            <div class="title-group">
              <span class="symbol {selectedSlice.type}"
                >{selectedSlice.type === "state" ? "◆" : "▶"}</span
              >
              <h1>{selectedSlice.name}</h1>
              <span class="type-badge {selectedSlice.type}"
                >{selectedSlice.type}</span
              >
            </div>

            {#if selectedSlice.example}
              <div class="slice-example">
                <JsonDisplay data={selectedSlice.example} />
              </div>
            {/if}
          </header>

          <div class="detail-body">
            <div class="slice-details">
              {#if selectedSlice.type === "state"}
                {#if selectedSlice.sourcedFrom.length > 0}
                  <div class="detail-section">
                    <h4>Sourced From</h4>
                    {#each selectedSlice.sourcedFrom as source}
                      <div class="detail-item">
                        <span class="event">● {source.name}</span>
                        <span class="ticks-group">
                          {#each source.ticks as tick, i}
                            <button
                              class="tick-ref-link"
                              onclick={() => modelStore.navigateToTick(tick)}
                            >
                              @{tick}
                            </button>
                          {/each}
                        </span>
                      </div>
                    {/each}
                  </div>
                {/if}

                {@const readingActors = getReadingActors(selectedSlice.name)}
                {#if readingActors.length > 0}
                  <div class="detail-section">
                    <h4>Read By</h4>
                    {#each readingActors as actor}
                      <div class="detail-item">
                        <span class="actor">○ {actor.name}</span>
                        <button
                          class="tick-ref-link"
                          onclick={() => modelStore.navigateToTick(actor.tick)}
                        >
                          @{actor.tick}
                        </button>
                      </div>
                    {/each}
                  </div>
                {/if}
              {:else}
                {@const triggeringActors = getTriggeringActors(
                  selectedSlice.name,
                )}
                {#if triggeringActors.length > 0}
                  <div class="detail-section">
                    <h4>Triggered By</h4>
                    {#each triggeringActors as actor}
                      <div class="detail-item">
                        <span class="actor">○ {actor.name}</span>
                        <button
                          class="tick-ref-link"
                          onclick={() => modelStore.navigateToTick(actor.tick)}
                        >
                          @{actor.tick}
                        </button>
                      </div>
                    {/each}
                  </div>
                {/if}

                {#if selectedSlice.produces.length > 0}
                  <div class="detail-section">
                    <h4>Produces</h4>
                    {#each selectedSlice.produces as produced}
                      <div class="detail-item">
                        <span class="event">● {produced.name}</span>
                        <span class="ticks-group">
                          {#each produced.ticks as tick, i}
                            <button
                              class="tick-ref-link"
                              onclick={() => modelStore.navigateToTick(tick)}
                            >
                              @{tick}
                            </button>
                          {/each}
                        </span>
                      </div>
                    {/each}
                  </div>
                {/if}
              {/if}
            </div>

            {#if selectedSlice.attachments.length > 0}
              <div class="attachments">
                <h3>Attachments ({selectedSlice.attachments.length})</h3>
                <div class="attachment-list">
                  {#each selectedSlice.attachments as attachment}
                    <div class="attachment-item {attachment.type}">
                      {#if attachment.type === "image" && attachment.path}
                        <figure>
                          <img
                            src="/attachments/{attachment.path}"
                            alt={attachment.label}
                          />
                          <figcaption>{attachment.label}</figcaption>
                        </figure>
                      {:else if attachment.type === "link" && attachment.url}
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span class="attachment-icon">🔗</span>
                          {attachment.label}
                        </a>
                      {:else if attachment.type === "note" && attachment.content}
                        <div class="attachment-note">
                          <span class="attachment-label"
                            >{attachment.label}</span
                          >
                          <p>{attachment.content}</p>
                        </div>
                      {:else if attachment.type === "file" && attachment.path}
                        <a
                          href="/attachments/{attachment.path}"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="attachment-file"
                        >
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
          </div>
          <!-- End detail-body -->
        </div>
        <!-- End slice-card -->

        {#if selectedSlice.scenarios.length > 0}
          <div class="scenarios">
            <h3>Scenarios ({selectedSlice.scenarios.length})</h3>
            {#each selectedSlice.scenarios as scenario}
              <Scenario
                {scenario}
                type={selectedSlice.type}
                sliceName={selectedSlice.name}
              />
            {/each}
          </div>
        {/if}
      </div>
      <!-- End slice-detail-view -->
    {:else}
      <div class="empty-state">
        <p>Select a slice from the sidebar to view details</p>
      </div>
    {/if}
  </section>
</div>

<style>
  .slice-explorer {
    display: flex;
    height: calc(100vh - 120px); /* Adjust based on App header/nav */
    width: 100%;
    overflow: hidden;
    background: var(--bg-primary);
  }

  /* Sidebar */
  .sidebar {
    width: 380px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border);
    background: var(--bg-secondary);
  }

  .sidebar-header {
    padding: 1rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .sidebar-header h3 {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  }

  .sidebar-header .count {
    background: var(--bg-card);
    padding: 0.125rem 0.5rem;
    border-radius: 999px;
    font-size: 0.75rem;
    color: var(--text-secondary);
    border: 1px solid var(--border);
  }

  .slice-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .slice-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 0.75rem;
    border: 1px solid transparent;
    border-radius: 0.5rem;
    background: transparent;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
  }

  .slice-item:hover {
    background: var(--bg-card);
  }

  .slice-item.active {
    background: var(--bg-card);
    border-color: var(--color-link);
    box-shadow: var(--shadow-sm);
  }

  .slice-item-main {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    overflow: hidden;
  }

  .slice-item .name {
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-primary);
  }

  .slice-item .symbol {
    font-size: 1rem;
  }

  /* Colors */
  .symbol.state {
    color: var(--color-state);
  }
  .symbol.command {
    color: var(--color-command);
  }

  .slice-item.active.state {
    border-left: 3px solid var(--color-state);
  }
  .slice-item.active.command {
    border-left: 3px solid var(--color-command);
  }

  /* Main Content */
  .main-content {
    flex: 1;
    overflow-y: auto;
    background: var(--bg-primary);
    padding: 2rem;
  }

  .slice-detail-view {
    padding: 0;
    max-width: 1400px;
    margin: 0 auto;
  }

  .slice-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }

  .detail-header {
    padding: 1.5rem 2rem;
    border-bottom: 1px solid var(--border);
  }

  .detail-header.state {
    background: linear-gradient(
      to bottom,
      var(--bg-card),
      rgba(59, 130, 246, 0.02)
    );
  }
  .detail-header.command {
    background: linear-gradient(
      to bottom,
      var(--bg-card),
      rgba(239, 68, 68, 0.02)
    );
  }

  .title-group {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .slice-example {
    font-size: 0.875rem;
    margin-top: 1rem;
    padding: 0.75rem;
    background: var(--bg-primary);
    border-radius: 0.375rem;
    border: 1px solid var(--border);
  }

  .detail-header h1 {
    font-size: 1.5rem;
    margin: 0;
  }

  .detail-header .symbol {
    font-size: 1.5rem;
  }

  .type-badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    text-transform: uppercase;
    font-weight: 600;
    letter-spacing: 0.05em;
  }

  .type-badge.state {
    background: rgba(59, 130, 246, 0.1);
    color: var(--color-state);
  }
  .type-badge.command {
    background: rgba(239, 68, 68, 0.1);
    color: var(--color-command);
  }

  .detail-header .ticks {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-left: 2.5rem; /* align with text */
  }

  .detail-header .tick-values {
    font-family: var(--font-mono);
  }

  .tick-link {
    background: none;
    border: none;
    padding: 0;
    color: var(--color-link, #5b9fd4);
    text-decoration: underline;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
  }

  .tick-link:hover {
    color: var(--color-link-hover, #3b82f6);
  }

  .tick-ref-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 0.25rem;
    padding: 0.125rem 0.375rem;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 0.75rem;
    font-family: var(--font-mono);
    transition: all 0.2s;
    text-decoration: none; /* Reset underline */
    margin-left: 0.25rem;
  }

  .tick-ref-link:hover {
    background: var(--bg-card);
    border-color: var(--color-link);
    color: var(--color-link);
    text-decoration: none;
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }

  .ticks-group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    margin-left: 0.5rem;
  }

  .detail-body {
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  /* Reuse details styles */
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

  .detail-item .event {
    color: var(--color-event);
  }
  .detail-item .state {
    color: var(--color-state);
  }
  .detail-item .command {
    color: var(--color-command);
  }
  .detail-item .actor {
    color: var(--color-actor);
  }

  .detail-item .muted-ref {
    color: var(--text-secondary);
    opacity: 0.6;
    font-size: 0.8rem;
  }

  /* Attachments - Reused */
  .attachments {
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

  /* Scenarios */
  .scenarios {
    margin-top: 2rem;
    padding-top: 0;
  }

  .scenarios h3 {
    font-size: 0.875rem;
    color: var(--color-warning);
    margin-bottom: 1rem;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-secondary);
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .slice-explorer {
      flex-direction: column;
    }

    .sidebar {
      width: 100%;
      height: 200px;
      border-right: none;
      border-bottom: 1px solid var(--border);
    }

    .main-content {
      height: calc(100% - 200px);
    }
  }
</style>
