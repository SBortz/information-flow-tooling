<script lang="ts">
  import { onMount } from 'svelte';
  import { modelStore } from "../../stores/model.svelte";
  import { isEvent, isState, isCommand, isActor } from "../../lib/types";
  import type { Event, Actor, Command, StateView, TimelineElement } from "../../lib/types";
  import { buildTimelineViewModel } from "../../lib/models";
  import JsonDisplay from "../shared/JsonDisplay.svelte";
  import WireframeViewer from "../shared/WireframeViewer.svelte";

  // Props for syncing with vertical view
  let {
    activeTick = $bindable<number | null>(null),
    orientation = $bindable<'vertical' | 'horizontal'>('horizontal')
  }: {
    activeTick?: number | null,
    orientation?: 'vertical' | 'horizontal'
  } = $props();

  const symbols: Record<string, string> = {
    event: "●",
    state: "◆",
    command: "▶",
    actor: "○",
  };

  // Build view model
  let viewModel = $derived(buildTimelineViewModel(modelStore.model));
  let timelineItems = $derived(viewModel.items);
  let laneConfig = $derived(viewModel.laneConfig);

  // Selected element for detail panel (separate from scroll sync)
  let selectedElement = $state<TimelineElement | null>(null);
  
  // One-time scroll when data is ready
  let hasScrolledOnce = false;
  $effect(() => {
    // Wait for data to be ready
    if (hasScrolledOnce) return;
    if (activeTick === null || timelineItems.length === 0) return;
    
    // Mark as done and scroll
    hasScrolledOnce = true;
    const tick = activeTick; // Capture value
    requestAnimationFrame(() => {
      scrollToTick(tick);
    });
  });

  // When user selects element, update activeTick and URL
  function selectElement(el: TimelineElement) {
    selectedElement = el;
    activeTick = el.tick;
    // Update URL hash
    history.replaceState(
      { view: "timeline", tick: el.tick },
      "",
      `#timeline/tick-${el.tick}`
    );
  }

  function scrollToTick(tick: number) {
    const tickIndex = tickColumns().findIndex(col => col.tick === tick);
    if (tickIndex >= 0) {
      const scrollArea = document.querySelector('.ht-scroll-area');
      if (scrollArea) {
        const targetX = tickIndex * TICK_WIDTH - scrollArea.clientWidth / 2 + TICK_WIDTH / 2;
        scrollArea.scrollTo({ left: Math.max(0, targetX), behavior: 'smooth' });
      }
    }
  }

  // Group items by tick
  let tickColumns = $derived(() => {
    const tickMap = new Map<number, typeof timelineItems>();
    for (const item of timelineItems) {
      const tick = item.element.tick;
      if (!tickMap.has(tick)) {
        tickMap.set(tick, []);
      }
      tickMap.get(tick)!.push(item);
    }
    return Array.from(tickMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([tick, items]) => ({ tick, items }));
  });

  // Layout constants
  const TICK_WIDTH = 200;
  const LANE_HEIGHT = 200;
  const BOX_WIDTH = 180;
  const BOX_HEIGHT = 180;
  const MAX_FIELDS = 4; // Max fields to show before truncating

  // Get example fields from element
  function getExampleFields(el: TimelineElement): string[] {
    const example = (el as any).example;
    if (!example || typeof example !== 'object') return [];
    return Object.keys(example);
  }

  // Calculate lane Y positions
  // Order: Actors (top) → Commands/States (middle) → Events (bottom)
  function getLaneY(position: string, laneIndex: number): number {
    const actorLaneCount = laneConfig.actorRoles.length;
    const eventLaneCount = laneConfig.eventSystems.length;

    if (position === 'right') { // Actors at top
      return laneIndex * LANE_HEIGHT + LANE_HEIGHT / 2;
    } else if (position === 'center') { // Commands/States in middle
      return actorLaneCount * LANE_HEIGHT + LANE_HEIGHT / 2;
    } else { // Events at bottom
      return (actorLaneCount + 1 + laneIndex) * LANE_HEIGHT + LANE_HEIGHT / 2;
    }
  }

  // Total height
  let totalHeight = $derived(
    (laneConfig.actorRoles.length + 1 + laneConfig.eventSystems.length) * LANE_HEIGHT
  );

  // Close detail panel
  function closeDetails() {
    selectedElement = null;
  }
</script>

<div class="horizontal-timeline">
  <header class="ht-header">
    <h2>Timeline</h2>
    <span class="ht-count">{tickColumns().length} ticks</span>
  </header>

  <div class="ht-container">
    <!-- Lane labels (fixed left) -->
    <div class="ht-lane-labels" style="height: {totalHeight}px;">
      {#each laneConfig.actorRoles as role, i}
        <div class="ht-lane-label actor" style="top: {i * LANE_HEIGHT}px; height: {LANE_HEIGHT}px;">
          {role || 'Actors'}
        </div>
      {/each}
      <div class="ht-lane-label center" style="top: {laneConfig.actorRoles.length * LANE_HEIGHT}px; height: {LANE_HEIGHT}px;">
        Cmd / State
      </div>
      {#each laneConfig.eventSystems as system, i}
        <div class="ht-lane-label event" style="top: {(laneConfig.actorRoles.length + 1 + i) * LANE_HEIGHT}px; height: {LANE_HEIGHT}px;">
          {system || 'Events'}
        </div>
      {/each}
    </div>

    <!-- Scrollable timeline area -->
    <div class="ht-scroll-area">
      <div class="ht-canvas" style="width: {tickColumns().length * TICK_WIDTH + 50}px; height: {totalHeight}px;">
        <!-- Lane backgrounds -->
        {#each laneConfig.actorRoles as _, i}
          <div class="ht-lane-bg actor" style="top: {i * LANE_HEIGHT}px; height: {LANE_HEIGHT}px;"></div>
        {/each}
        <div class="ht-lane-bg center" style="top: {laneConfig.actorRoles.length * LANE_HEIGHT}px; height: {LANE_HEIGHT}px;"></div>
        {#each laneConfig.eventSystems as _, i}
          <div class="ht-lane-bg event" style="top: {(laneConfig.actorRoles.length + 1 + i) * LANE_HEIGHT}px; height: {LANE_HEIGHT}px;"></div>
        {/each}

        <!-- Tick columns -->
        {#each tickColumns() as { tick, items }, tickIndex}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="ht-tick-column"
            class:selected={selectedElement?.tick === tick}
            style="left: {tickIndex * TICK_WIDTH}px; width: {TICK_WIDTH}px; height: {totalHeight}px;"
            onclick={() => {
              // Select first element in this tick
              if (items.length > 0) {
                selectElement(items[0].element);
              }
            }}
          >
            <span class="ht-tick-label">@{tick}</span>
          </div>

          <!-- Elements in this tick -->
          {#each items as { element: el, position, laneIndex }}
            {@const fields = getExampleFields(el)}
            <button
              class="ht-element {el.type}"
              class:selected={selectedElement?.tick === el.tick && selectedElement?.name === el.name}
              style="
                left: {tickIndex * TICK_WIDTH + (TICK_WIDTH - BOX_WIDTH) / 2}px;
                top: {getLaneY(position, laneIndex) - BOX_HEIGHT / 2}px;
                width: {BOX_WIDTH}px;
                height: {BOX_HEIGHT}px;
              "
              title="{el.name} @{el.tick}"
              onclick={() => selectElement(el)}
            >
              <div class="ht-element-header">
                <span class="ht-symbol">{symbols[el.type]}</span>
                <span class="ht-name">{el.name}</span>
              </div>
              {#if fields.length > 0}
                <ul class="ht-fields">
                  {#each fields.slice(0, MAX_FIELDS) as field}
                    <li>{field}</li>
                  {/each}
                  {#if fields.length > MAX_FIELDS}
                    <li class="ht-fields-more">+{fields.length - MAX_FIELDS} more...</li>
                  {/if}
                </ul>
              {/if}
              {#if isActor(el) && el.wireframes && el.wireframes.length > 0}
                <span class="ht-wireframe-indicator" title="Wireframe">
                  <svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="3" width="14" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="5" cy="7" r="1.5"/><path d="M3 11l3-3 2 2 4-4 3 3" stroke="currentColor" stroke-width="1" fill="none"/></svg>
                </span>
              {/if}
            </button>
          {/each}
        {/each}
      </div>
    </div>
  </div>

  <!-- Detail Panel (slides up from bottom) -->
  <div class="ht-detail-panel" class:open={selectedElement !== null}>
    {#if selectedElement}
      <div class="ht-detail-header">
        <div class="ht-detail-title">
          <span class="ht-detail-symbol {selectedElement.type}">{symbols[selectedElement.type]}</span>
          <span class="ht-detail-name">{selectedElement.name}</span>
          <span class="ht-detail-tick">@{selectedElement.tick}</span>
        </div>
        <button class="ht-detail-close" onclick={closeDetails} title="Schließen">✕</button>
      </div>
      <div class="ht-detail-content">
        {#if isEvent(selectedElement)}
          {#if selectedElement.producedBy}
            <div class="ht-detail-row">
              <span class="ht-detail-label">producedBy:</span>
              <span class="command">{selectedElement.producedBy}</span>
            </div>
          {/if}
          {#if selectedElement.example}
            <div class="ht-detail-section">
              <span class="ht-detail-label">Example:</span>
              <JsonDisplay data={selectedElement.example} />
            </div>
          {/if}
        {:else if isState(selectedElement)}
          {#if selectedElement.sourcedFrom?.length > 0}
            <div class="ht-detail-row">
              <span class="ht-detail-label">sourcedFrom:</span>
              {#each selectedElement.sourcedFrom as eventName, i}
                <span class="event">{eventName}</span>{i < selectedElement.sourcedFrom.length - 1 ? ', ' : ''}
              {/each}
            </div>
          {/if}
          {#if selectedElement.example}
            <div class="ht-detail-section">
              <span class="ht-detail-label">Example:</span>
              <JsonDisplay data={selectedElement.example} />
            </div>
          {/if}
        {:else if isCommand(selectedElement)}
          {#if selectedElement.example}
            <div class="ht-detail-section">
              <span class="ht-detail-label">Example:</span>
              <JsonDisplay data={selectedElement.example} />
            </div>
          {/if}
        {:else if isActor(selectedElement)}
          <div class="ht-detail-row ht-actor-flow">
            <span class="ht-detail-label">reads:</span>
            <span class="state ht-wrap">{selectedElement.readsView}</span>
          </div>
          <div class="ht-detail-row ht-actor-flow">
            <span class="ht-detail-label">→ triggers:</span>
            <span class="command ht-wrap">{selectedElement.sendsCommand}</span>
          </div>
          {#if selectedElement.role}
            <div class="ht-detail-row">
              <span class="ht-detail-label">Role:</span>
              <span>{selectedElement.role}</span>
            </div>
          {/if}
          {#if selectedElement.wireframes && selectedElement.wireframes.length > 0}
            <div class="ht-wireframes">
              {#each selectedElement.wireframes as wireframe}
                <WireframeViewer
                  src={modelStore.getWireframePath(wireframe)}
                  title="{selectedElement.name} - {wireframe}"
                />
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .horizontal-timeline {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    font-family: var(--font-mono);
    position: relative;
    overflow: hidden;
  }

  .ht-header {
    display: flex;
    align-items: baseline;
    gap: 1rem;
    padding: 1rem 2rem;
    border-bottom: 1px solid var(--border);
  }

  .ht-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
  }

  .ht-count {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .ht-orientation-toggle {
    display: flex;
    margin-left: auto;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 0.375rem;
    overflow: hidden;
  }

  .ht-orientation-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s;
  }

  .ht-orientation-btn svg {
    width: 14px;
    height: 14px;
  }

  .ht-orientation-btn:hover {
    background: var(--bg-card);
    color: var(--text-primary);
  }

  .ht-orientation-btn.active {
    background: var(--color-command);
    color: white;
  }

  .ht-orientation-btn:first-child {
    border-right: 1px solid var(--border);
  }

  .ht-orientation-btn.active:first-child {
    border-right-color: var(--color-command);
  }

  .ht-container {
    display: flex;
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  }

  .ht-lane-labels {
    flex-shrink: 0;
    width: 120px;
    position: relative;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border);
    overflow-y: auto;
    overflow-x: hidden;
  }

  .ht-lane-label {
    position: absolute;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    border-bottom: 1px solid var(--border);
    text-align: center;
    word-break: break-word;
    padding: 0.5rem;
    line-height: 1.3;
  }

  .ht-lane-label.actor { color: var(--color-actor); }
  .ht-lane-label.center { color: var(--text-secondary); }
  .ht-lane-label.event { color: var(--color-event); }

  .ht-scroll-area {
    flex: 1;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
  }

  .ht-canvas {
    position: relative;
    padding-bottom: 20px;
  }

  .ht-lane-bg {
    position: absolute;
    left: 0;
    right: 0;
    border-bottom: 1px solid var(--border);
  }

  .ht-lane-bg.actor { background: rgba(107, 114, 128, 0.05); }
  .ht-lane-bg.center { background: rgba(107, 114, 128, 0.1); }
  .ht-lane-bg.event { background: rgba(249, 115, 22, 0.05); }

  .ht-tick-column {
    position: absolute;
    top: 0;
    border-right: 1px dashed var(--border);
    cursor: pointer;
    transition: background 0.15s;
  }

  .ht-tick-column:hover {
    background: rgba(122, 162, 247, 0.1);
  }

  .ht-tick-column.selected {
    background: rgba(122, 162, 247, 0.15);
  }

  .ht-tick-label {
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.65rem;
    color: var(--text-secondary);
  }

  .ht-element {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    gap: 0.25rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s;
    z-index: 1;
    padding: 0.5rem;
    text-align: left;
    overflow: hidden;
  }

  .ht-element:hover {
    transform: scale(1.03);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 2;
  }

  .ht-element.event {
    background: var(--color-event);
    border: 1px solid #df7e44;
    color: var(--text-primary);
  }

  .ht-element.command {
    background: var(--color-command);
    border: 1px solid #5a82d7;
    color: var(--text-primary);
  }

  .ht-element.state {
    background: var(--color-state);
    border: 1px solid #7eb356;
    color: var(--text-primary);
  }

  .ht-element.actor {
    background: var(--color-actor);
    border: 1px solid #4b5563;
    color: white;
    border-radius: 16px;
  }

  .ht-element-header {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding-bottom: 0.35rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    margin-bottom: 0.25rem;
  }

  .ht-symbol {
    font-size: 0.85rem;
    flex-shrink: 0;
  }

  .ht-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
    font-size: 0.75rem;
    line-height: 1.3;
  }

  .ht-fields {
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: 0.65rem;
    font-weight: 400;
    opacity: 0.9;
    flex: 1;
    overflow: hidden;
  }

  .ht-fields li {
    padding: 0.1rem 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ht-fields li::before {
    content: "• ";
    opacity: 0.7;
  }

  .ht-fields-more {
    font-style: italic;
    opacity: 0.7;
  }

  .ht-fields-more::before {
    content: "" !important;
  }

  .ht-element.selected {
    transform: scale(1.1);
    box-shadow: 0 0 0 3px var(--color-command), 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 10;
  }

  /* Detail Panel - Fullscreen when open */
  .ht-detail-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    top: 0;
    background: var(--bg-card);
    border-top: 1px solid var(--border);
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
    transform: translateY(100%);
    transition: transform 0.25s ease-out;
    overflow-y: auto;
    overflow-x: hidden;
    z-index: 100;
  }

  .ht-detail-panel.open {
    transform: translateY(0);
  }

  .ht-detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1.5rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg-secondary);
    position: sticky;
    top: 0;
  }

  .ht-detail-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .ht-detail-symbol {
    font-size: 1.1rem;
  }

  .ht-detail-symbol.event { color: var(--color-event); }
  .ht-detail-symbol.state { color: var(--color-state); }
  .ht-detail-symbol.command { color: var(--color-command); }
  .ht-detail-symbol.actor { color: var(--color-actor); }

  .ht-detail-name {
    font-weight: 600;
    font-size: 1rem;
  }

  .ht-detail-tick {
    color: var(--text-secondary);
    font-size: 0.85rem;
  }

  .ht-detail-close {
    width: 2rem;
    height: 2rem;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: 1.25rem;
    cursor: pointer;
    border-radius: 0.25rem;
    transition: all 0.15s;
  }

  .ht-detail-close:hover {
    background: var(--bg-primary);
    color: var(--text-primary);
  }

  .ht-detail-content {
    padding: 1rem 1.5rem;
    overflow-x: hidden;
    word-break: break-word;
  }

  .ht-detail-row {
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 0.85rem;
    word-break: break-word;
    max-width: 100%;
  }

  .ht-wrap {
    word-break: break-word;
    overflow-wrap: break-word;
    max-width: calc(100% - 5rem);
  }

  .ht-detail-label {
    color: var(--text-secondary);
  }

  .ht-detail-section {
    margin-bottom: 0.75rem;
  }

  .ht-detail-section .ht-detail-label {
    display: block;
    margin-bottom: 0.25rem;
  }

  .ht-detail-content .event { color: var(--color-event); }
  .ht-detail-content .state { color: var(--color-state); }
  .ht-detail-content .command { color: var(--color-command); }
  .ht-detail-content .actor { color: var(--color-actor); }

  .ht-wireframes {
    margin-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .ht-wireframe-indicator {
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    align-items: center;
    color: rgba(255, 255, 255, 0.7);
  }

  .ht-wireframe-indicator svg {
    width: 14px;
    height: 14px;
  }

</style>
