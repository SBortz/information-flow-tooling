<script lang="ts">
  import { onMount } from 'svelte';
  import { modelStore } from "../../stores/model.svelte";
  import { isEvent, isState, isCommand, isActor } from "../../lib/types";
  import type { Event, Actor, TimelineElement } from "../../lib/types";
  import { buildTimelineViewModel } from "../../lib/models";
  import JsonDisplay from "../shared/JsonDisplay.svelte";
  import WireframeViewer from "../shared/WireframeViewer.svelte";
  import TimelineHeader from "../shared/TimelineHeader.svelte";

  // Props
  let {
    activeTick = $bindable<number | null>(null),
    orientation = $bindable<'vertical' | 'horizontal'>('horizontal'),
    zoomLevel = $bindable(1),
    wheelMode = $bindable<'zoom' | 'scroll'>('zoom')
  }: {
    activeTick?: number | null,
    orientation?: 'vertical' | 'horizontal',
    zoomLevel?: number,
    wheelMode?: 'zoom' | 'scroll'
  } = $props();

  const symbols: Record<string, string> = {
    event: "●",
    state: "◆",
    command: "▶",
    actor: "○",
  };

  // Zoom constants
  const ZOOM_MIN = 0.3;
  const ZOOM_MAX = 2.0;
  const ZOOM_STEP = 0.1;

  let viewModel = $derived(buildTimelineViewModel(modelStore.model));
  let timelineItems = $derived(viewModel.items);
  let laneConfig = $derived(viewModel.laneConfig);

  // Selected element for detail panel (separate from scroll sync)
  let selectedElement = $state<TimelineElement | null>(null);
  let scrollAreaEl: HTMLDivElement | undefined = $state();

  // Register wheel handler with { passive: false } so preventDefault works in Chrome
  onMount(() => {
    if (scrollAreaEl) {
      scrollAreaEl.addEventListener('wheel', handleWheel, { passive: false });
      return () => scrollAreaEl?.removeEventListener('wheel', handleWheel);
    }
  });

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

  function updateActiveTickFromScroll() {
    if (!scrollAreaEl || tickColumns.length === 0) return;
    const centerX = scrollAreaEl.scrollLeft + scrollAreaEl.clientWidth / 2;
    const tickIndex = Math.round(centerX / TICK_WIDTH - 0.5);
    const clamped = Math.max(0, Math.min(tickColumns.length - 1, tickIndex));
    const tick = tickColumns[clamped].tick;
    if (tick !== activeTick) {
      activeTick = tick;
      history.replaceState({ view: "timeline", tick }, "", `#timeline/tick-${tick}`);
    }
  }

  function scrollToTick(tick: number, smooth = false) {
    const tickIndex = tickColumns.findIndex(col => col.tick === tick);
    if (tickIndex >= 0 && scrollAreaEl) {
      const targetX = tickIndex * TICK_WIDTH - scrollAreaEl.clientWidth / 2 + TICK_WIDTH / 2;
      scrollAreaEl.scrollTo({ left: Math.max(0, targetX), behavior: smooth ? 'smooth' : 'instant' });
    }
  }

  // Group items by tick
  let tickColumns = $derived.by(() => {
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

  // Layout — scaled by zoom
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 900;
  const BASE_TICK_WIDTH = 200;
  const BASE_LANE_HEIGHT = isMobile ? 140 : 200;
  const BASE_BOX_WIDTH = 180;
  const BASE_BOX_HEIGHT = isMobile ? 120 : 180;

  let TICK_WIDTH = $derived(Math.round(BASE_TICK_WIDTH * zoomLevel));
  let LANE_HEIGHT = $derived(Math.round(BASE_LANE_HEIGHT * zoomLevel));
  let BOX_WIDTH = $derived(Math.round(BASE_BOX_WIDTH * zoomLevel));
  let BOX_HEIGHT = $derived(Math.round(BASE_BOX_HEIGHT * zoomLevel));
  let MAX_FIELDS = $derived(zoomLevel < 0.6 ? 2 : 4);
  const MAX_VALUE_LENGTH = 15;

  // Format a value for display
  function formatValue(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return `[${value.length}]`;
    if (typeof value === 'object') return '{...}';
    if (typeof value === 'string') {
      return value.length > MAX_VALUE_LENGTH 
        ? value.slice(0, MAX_VALUE_LENGTH) + '…' 
        : value;
    }
    return String(value);
  }

  // Get example fields with values from element
  function getExampleFields(el: TimelineElement): string[] {
    const example = (el as any).example;
    if (!example || typeof example !== 'object') return [];
    return Object.entries(example).map(([key, value]) => {
      return `${key}: ${formatValue(value)}`;
    });
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

  // Drag-to-pan state
  let isDragging = $state(false);
  let dragStart = { x: 0, y: 0, scrollLeft: 0, scrollTop: 0 };
  
  function handleMouseDown(e: MouseEvent) {
    if (e.button !== 2 || !scrollAreaEl) return;
    e.preventDefault();

    isDragging = true;
    dragStart = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: scrollAreaEl.scrollLeft,
      scrollTop: scrollAreaEl.scrollTop
    };
    scrollAreaEl.style.cursor = 'grabbing';
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging || !scrollAreaEl) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    scrollAreaEl.scrollLeft = dragStart.scrollLeft - dx;
    scrollAreaEl.scrollTop = dragStart.scrollTop - dy;
  }

  function handleMouseUp() {
    if (!isDragging || !scrollAreaEl) return;
    isDragging = false;
    scrollAreaEl.style.cursor = '';
  }

  function handleMouseLeave() {
    if (isDragging && scrollAreaEl) {
      isDragging = false;
      scrollAreaEl.style.cursor = '';
    }
  }

  function handleWheel(e: WheelEvent) {
    if (!scrollAreaEl) return;

    if (wheelMode === 'scroll') {
      // Scroll mode: wheel → horizontal, shift+wheel → vertical
      e.preventDefault();
      if (e.shiftKey) {
        scrollAreaEl.scrollTop += e.deltaY;
      } else {
        scrollAreaEl.scrollLeft += e.deltaY;
      }
      return;
    }

    // Zoom mode: shift+wheel → horizontal scroll
    if (e.shiftKey) {
      e.preventDefault();
      scrollAreaEl.scrollLeft += e.deltaY;
      return;
    }

    // Zoom mode: wheel → zoom towards cursor
    e.preventDefault();
    const rect = scrollAreaEl.getBoundingClientRect();
    const cursorX = e.clientX - rect.left + scrollAreaEl.scrollLeft;
    const cursorY = e.clientY - rect.top + scrollAreaEl.scrollTop;
    const fractionX = cursorX / scrollAreaEl.scrollWidth;
    const fractionY = cursorY / scrollAreaEl.scrollHeight;

    const oldZoom = zoomLevel;
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    zoomLevel = Math.round(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomLevel + delta)) * 100) / 100;

    if (zoomLevel !== oldZoom) {
      requestAnimationFrame(() => {
        if (!scrollAreaEl) return;
        const newX = fractionX * scrollAreaEl.scrollWidth - (e.clientX - rect.left);
        const newY = fractionY * scrollAreaEl.scrollHeight - (e.clientY - rect.top);
        scrollAreaEl.scrollLeft = newX;
        scrollAreaEl.scrollTop = newY;
      });
    }
  }

  function closeDetails() {
    selectedElement = null;
  }
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && selectedElement !== null) {
      closeDetails();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="horizontal-timeline">
  <TimelineHeader count={tickColumns.length} countLabel="ticks">
    <span class="zoom-info mobile-hide">{Math.round(zoomLevel * 100)}%</span>
    {#if Math.round(zoomLevel * 100) !== 100}
      <button
        class="ctrl-btn mobile-hide"
        onclick={() => zoomLevel = 1}
        title="Zoom zurücksetzen"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 1 1 3 6.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 22v-6h6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    {/if}
    <button
      class="ctrl-btn mobile-hide"
      class:active={wheelMode === 'scroll'}
      onclick={() => { wheelMode = wheelMode === 'zoom' ? 'scroll' : 'zoom'; }}
      title={wheelMode === 'zoom' ? 'Mausrad: Zoom (klicken für Scroll)' : 'Mausrad: Scroll (klicken für Zoom)'}
    >
      {#if wheelMode === 'zoom'}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35M8 11h6M11 8v6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {:else}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {/if}
    </button>
    <div class="toggle-group">
      <button
        class="ctrl-btn"
        class:active={orientation === 'vertical'}
        onclick={() => orientation = 'vertical'}
        title="Vertikal (Zeit ↓)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 4v16M8 16l4 4 4-4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <button
        class="ctrl-btn"
        class:active={orientation === 'horizontal'}
        onclick={() => orientation = 'horizontal'}
        title="Horizontal (Zeit →)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 12h16M16 8l4 4-4 4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  </TimelineHeader>

  <div class="ht-container">
    <!-- Lane labels (fixed left) -->
    <div class="ht-lane-labels" style="height: {totalHeight}px; font-size: {zoomLevel}em;">
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
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="ht-scroll-area"
      bind:this={scrollAreaEl}
      onmousedown={handleMouseDown}
      onmousemove={handleMouseMove}
      onmouseup={handleMouseUp}
      onmouseleave={handleMouseLeave}
      oncontextmenu={(e) => e.preventDefault()}
      onscroll={updateActiveTickFromScroll}
    >
      <div class="ht-canvas" style="width: {tickColumns.length * TICK_WIDTH + 50}px; height: {totalHeight}px; font-size: {zoomLevel}em;">
        <!-- Lane backgrounds -->
        {#each laneConfig.actorRoles as _, i}
          <div class="ht-lane-bg actor" style="top: {i * LANE_HEIGHT}px; height: {LANE_HEIGHT}px;"></div>
        {/each}
        <div class="ht-lane-bg center" style="top: {laneConfig.actorRoles.length * LANE_HEIGHT}px; height: {LANE_HEIGHT}px;"></div>
        {#each laneConfig.eventSystems as _, i}
          <div class="ht-lane-bg event" style="top: {(laneConfig.actorRoles.length + 1 + i) * LANE_HEIGHT}px; height: {LANE_HEIGHT}px;"></div>
        {/each}

        <!-- Tick columns - click updates route but doesn't open panel -->
        {#each tickColumns as { tick, items }, tickIndex}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="ht-tick-column"
            class:selected={activeTick === tick}
            style="left: {tickIndex * TICK_WIDTH}px; width: {TICK_WIDTH}px; height: {totalHeight}px;"
            onclick={() => {
              activeTick = tick;
              history.replaceState(
                { view: "timeline", tick },
                "",
                `#timeline/tick-${tick}`
              );
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
              {#if isActor(el)}
                <div class="ht-actor-desc">
                  <div class="ht-actor-reads">reads: {el.readsView || '?'}</div>
                  <div class="ht-actor-triggers">→ {el.sendsCommand || '?'}</div>
                </div>
              {:else if fields.length > 0}
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
        <div class="ht-detail-actions">
          <span class="ht-esc-hint">esc</span>
          <button class="ht-detail-close" onclick={closeDetails} title="Schließen (Esc)">✕</button>
        </div>
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
    height: calc(100dvh - var(--page-header-height));
    font-family: var(--font-mono);
    position: relative;
    overflow: hidden;
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
    width: 28px;
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
    writing-mode: vertical-lr;
    text-orientation: mixed;
    font-size: 0.65em;
    font-weight: 600;
    text-transform: uppercase;
    border-bottom: 1px solid var(--border);
    text-align: center;
    padding: 0.25rem 0;
    line-height: 1.3;
  }

  .ht-lane-label.actor { color: var(--color-actor); }
  .ht-lane-label.center { color: var(--text-secondary); }
  .ht-lane-label.event { color: var(--color-event); }

  .ht-scroll-area {
    flex: 1;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-x pan-y;
    overscroll-behavior-x: contain;
  }

  /* Thicker scrollbars for desktop */
  .ht-scroll-area::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }

  .ht-scroll-area::-webkit-scrollbar-track {
    background: var(--bg-secondary);
    border-radius: 6px;
  }

  .ht-scroll-area::-webkit-scrollbar-thumb {
    background: var(--text-secondary);
    border-radius: 6px;
    border: 2px solid var(--bg-secondary);
  }

  .ht-scroll-area::-webkit-scrollbar-thumb:hover {
    background: var(--text-primary);
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
    font-size: 0.8em;
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
    font-size: 0.9em;
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
    border: 1px solid color-mix(in srgb, var(--color-event), black 20%);
    color: var(--text-primary);
  }

  .ht-element.command {
    background: var(--color-command);
    border: 1px solid color-mix(in srgb, var(--color-command), black 20%);
    color: var(--text-primary);
  }

  .ht-element.state {
    background: var(--color-state);
    border: 1px solid color-mix(in srgb, var(--color-state), black 20%);
    color: var(--text-primary);
  }

  .ht-element.actor {
    background: var(--color-actor);
    border: 1px solid color-mix(in srgb, var(--color-actor), black 20%);
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
    font-size: 1em;
    flex-shrink: 0;
  }

  .ht-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
    font-size: 0.9em;
    line-height: 1.3;
  }

  .ht-fields {
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: 0.8em;
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

  .ht-actor-desc {
    font-size: 0.8em;
    font-weight: 400;
    opacity: 0.95;
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .ht-actor-reads,
  .ht-actor-triggers {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ht-actor-triggers {
    opacity: 0.85;
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
    min-width: 0;
    flex: 1;
    overflow: hidden;
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
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ht-detail-tick {
    color: var(--text-secondary);
    font-size: 0.85rem;
  }

  .ht-detail-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .ht-esc-hint {
    font-size: 0.65rem;
    color: var(--text-secondary);
    opacity: 0.6;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  @media (max-width: 900px) {
    .ht-esc-hint {
      display: none;
    }
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
