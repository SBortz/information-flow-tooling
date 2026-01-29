<script lang="ts">
  import { modelStore } from "../../stores/model.svelte";
  import { isEvent, isState, isCommand, isActor } from "../../lib/types";
  import type { Event, Actor } from "../../lib/types";
  import { buildTimelineViewModel } from "../../lib/models";
  import JsonDisplay from "../shared/JsonDisplay.svelte";
  import WireframeViewer from "../shared/WireframeViewer.svelte";

  const symbols: Record<string, string> = {
    event: "●",
    state: "◆",
    command: "▶",
    actor: "○",
  };

  let activeTick = $state<number | null>(null);
  let detailContainer: HTMLElement | null = $state(null);
  let detailElements = $state<Map<number, HTMLElement>>(new Map());
  // Set flag immediately if there's a hash to navigate to
  let isProgrammaticScroll = window.location.hash.includes("timeline/tick-");

  // Filter state - sets contain systems/roles to HIDE
  let hiddenSystems = $state(new Set<string>());
  let hiddenRoles = $state(new Set<string>());
  let filterDropdownOpen = $state(false);

  // Check if any filters are active
  let hasActiveFilters = $derived(hiddenSystems.size > 0 || hiddenRoles.size > 0);

  // Toggle functions - clicking toggles visibility (visible by default)
  function toggleSystem(system: string) {
    if (hiddenSystems.has(system)) {
      hiddenSystems.delete(system);
    } else {
      hiddenSystems.add(system);
    }
    hiddenSystems = new Set(hiddenSystems);
  }

  function toggleRole(role: string) {
    if (hiddenRoles.has(role)) {
      hiddenRoles.delete(role);
    } else {
      hiddenRoles.add(role);
    }
    hiddenRoles = new Set(hiddenRoles);
  }

  function clearAllFilters() {
    hiddenSystems = new Set();
    hiddenRoles = new Set();
  }

  // Close dropdown when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.tl-filter-dropdown')) {
      filterDropdownOpen = false;
    }
  }

  // Build view model from raw data
  let viewModel = $derived(buildTimelineViewModel(modelStore.model));
  let timelineItems = $derived(viewModel.items);
  let laneConfig = $derived(viewModel.laneConfig);

  // Filtered lane config - excludes hidden systems/roles
  let filteredLaneConfig = $derived(() => {
    const visibleSystems = laneConfig.eventSystems.filter(s => !hiddenSystems.has(s));
    const visibleRoles = laneConfig.actorRoles.filter(r => !hiddenRoles.has(r));
    const eventLaneCount = Math.max(1, visibleSystems.length);
    const actorLaneCount = Math.max(1, visibleRoles.length);
    return {
      eventSystems: visibleSystems,
      actorRoles: visibleRoles,
      eventLaneCount,
      actorLaneCount,
      totalLanes: eventLaneCount + 1 + actorLaneCount, // +1 for center lane
      laneWidth: laneConfig.laneWidth,
    };
  });

  // Filtered items with recalculated lane indices
  let filteredItems = $derived(
    timelineItems
      .filter(item => {
        if (item.element.type === 'event') {
          const event = item.element as Event;
          return !hiddenSystems.has(event.system || '');
        }
        if (item.element.type === 'actor') {
          const actor = item.element as Actor;
          return !hiddenRoles.has(actor.role || '');
        }
        return true; // Always show commands and states
      })
      .map(item => {
        // Recalculate laneIndex based on filtered lane config
        if (item.element.type === 'event') {
          const event = item.element as Event;
          const system = event.system || '';
          const newLaneIndex = filteredLaneConfig().eventSystems.indexOf(system);
          return { ...item, laneIndex: newLaneIndex >= 0 ? newLaneIndex : 0 };
        }
        if (item.element.type === 'actor') {
          const actor = item.element as Actor;
          const role = actor.role || '';
          const newLaneIndex = filteredLaneConfig().actorRoles.indexOf(role);
          return { ...item, laneIndex: newLaneIndex >= 0 ? newLaneIndex : 0 };
        }
        return item;
      })
  );

  let filteredCount = $derived(filteredItems.length);

  // Calculate total width for the lane area (using filtered config)
  let totalLaneWidth = $derived(filteredLaneConfig().totalLanes * filteredLaneConfig().laneWidth);

  // Calculate symbol padding based on position and lane index (using filtered config)
  function getSymbolPadding(position: string, laneIndex: number): number {
    const config = filteredLaneConfig();
    const laneWidth = config.laneWidth;
    if (position === 'left') {
      // Events: lane 0 is outermost (leftmost), higher lanes are more to the right
      return laneIndex * laneWidth + 8;
    } else if (position === 'center') {
      // Commands/States: always in the center lane
      return config.eventLaneCount * laneWidth + 8;
    } else {
      // Actors: lane 0 is innermost (leftmost of actor lanes)
      return (config.eventLaneCount + 1 + laneIndex) * laneWidth + 8;
    }
  }

  // Generate CSS for dynamic lane backgrounds (using filtered config)
  function generateLaneBackgroundCSS(): string {
    const config = filteredLaneConfig();
    const laneWidth = config.laneWidth;
    const eventLanes = config.eventLaneCount;
    const actorLanes = config.actorLaneCount;
    const totalLanes = config.totalLanes;
    const centerLaneIndex = eventLanes;

    // Build background layers
    const layers: string[] = [];
    const positions: string[] = [];
    const sizes: string[] = [];

    // Hatching for center lane only
    layers.push(`repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 3px,
      rgba(107, 114, 128, 0.18) 3px,
      rgba(107, 114, 128, 0.18) 4px
    )`);
    positions.push(`${centerLaneIndex * laneWidth}px 0`);
    sizes.push(`${laneWidth}px 100%`);

    // Tint for all lanes
    for (let i = 0; i < totalLanes; i++) {
      layers.push(`linear-gradient(rgba(107, 114, 128, 0.05), rgba(107, 114, 128, 0.05))`);
      positions.push(`${i * laneWidth}px 0`);
      sizes.push(`${laneWidth}px 100%`);
    }

    // Vertical lines (one at each lane boundary + rightmost edge)
    for (let i = 0; i <= totalLanes; i++) {
      layers.push(`linear-gradient(rgba(107, 114, 128, 0.4), rgba(107, 114, 128, 0.4))`);
      positions.push(`${i * laneWidth - 1}px 0`);
      sizes.push(`2px 100%`);
    }

    return `
      background-image: ${layers.join(',\n      ')};
      background-position: ${positions.join(',\n      ')};
      background-size: ${sizes.join(',\n      ')};
      background-repeat: no-repeat;
    `;
  }

  function scrollToDetail(tick: number) {
    const element = document.getElementById(`tick-${tick}`);
    if (element) {
      activeTick = tick;
      isProgrammaticScroll = true;
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      // Re-enable scroll handler after animation completes
      setTimeout(() => (isProgrammaticScroll = false), 1000);
      element.classList.add("highlight-flash");
      setTimeout(() => element.classList.remove("highlight-flash"), 2000);
      // Update URL
      history.replaceState(
        { view: "timeline", tick },
        "",
        `#timeline/tick-${tick}`,
      );
    }
  }

  // Register detail elements for intersection observer
  function registerDetailElement(el: HTMLElement, tick: number) {
    detailElements.set(tick, el);
    detailElements = new Map(detailElements);
    return {
      destroy() {
        detailElements.delete(tick);
        detailElements = new Map(detailElements);
      },
    };
  }

  // Scroll-based highlighting - finds the topmost visible element on each scroll
  $effect(() => {
    if (!detailContainer || detailElements.size === 0) return;

    function updateActiveFromScroll() {
      // Skip during programmatic scrolling to avoid race conditions
      if (isProgrammaticScroll) return;

      const headerOffset = 120; // Sticky header height
      let closestTick: number | null = null;
      let closestDistance = Infinity;

      for (const [tick, el] of detailElements) {
        const rect = el.getBoundingClientRect();
        const distanceFromTop = rect.top - headerOffset;

        // Element is visible (below header, above viewport end)
        if (distanceFromTop < 100 && rect.bottom > headerOffset) {
          if (Math.abs(distanceFromTop) < closestDistance) {
            closestDistance = Math.abs(distanceFromTop);
            closestTick = tick;
          }
        }
      }

      if (closestTick !== null && closestTick !== activeTick) {
        activeTick = closestTick;
        // Update URL without adding history entry
        history.replaceState(
          { view: "timeline", tick: closestTick },
          "",
          `#timeline/tick-${closestTick}`,
        );

        // Scroll master item into view if needed (use scrollTo to avoid affecting window scroll)
        const masterItem = document.querySelector(
          `.tl-master-item[data-tick="${closestTick}"]`,
        ) as HTMLElement | null;
        const masterContainer = document.querySelector(".timeline-master");
        if (masterItem && masterContainer) {
          const containerRect = masterContainer.getBoundingClientRect();
          const itemRect = masterItem.getBoundingClientRect();
          // Only scroll if item is outside visible area of master
          if (itemRect.top < containerRect.top || itemRect.bottom > containerRect.bottom) {
            masterContainer.scrollTo({
              top: masterItem.offsetTop - masterContainer.clientHeight / 2 + masterItem.clientHeight / 2,
              behavior: "smooth",
            });
          }
        }
      }
    }

    window.addEventListener("scroll", updateActiveFromScroll, { passive: true });
    // No initial call - hash effect handles initialization

    return () => window.removeEventListener("scroll", updateActiveFromScroll);
  });

  // Handle initial hash on mount
  $effect(() => {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith("timeline/tick-")) {
      const tick = parseInt(hash.replace("timeline/tick-", ""), 10);
      if (!isNaN(tick) && timelineItems.length > 0) {
        activeTick = tick;
        isProgrammaticScroll = true;
        requestAnimationFrame(() => {
          const el = document.getElementById(`tick-${tick}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          // Re-enable scroll handler after animation completes
          setTimeout(() => (isProgrammaticScroll = false), 1000);
        });
      }
    } else if (timelineItems.length > 0 && activeTick === null) {
      // Set first tick as active by default
      activeTick = timelineItems[0].element.tick;
    }
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="timeline-master-detail" role="presentation" onclick={handleClickOutside}>
  <!-- Master: Compact timeline on the left -->
  <aside class="timeline-master">
    <div class="tl-master-content">
      <div class="tl-lane-header">
        <div class="tl-lane-labels-wrapper" style="padding-left: calc(0.75rem + 2rem + 0.5rem + 0.25rem);">
        <div class="tl-lane-labels" style="width: {totalLaneWidth}px;">
          {#each filteredLaneConfig().eventSystems as system, i}
            <div
              class="tl-lane-label event"
              style="left: {i * filteredLaneConfig().laneWidth}px; width: {filteredLaneConfig().laneWidth}px;"
            >
              {#if system}<span class="tl-lane-label-text">{system}</span>{/if}
            </div>
          {/each}
          <div
            class="tl-lane-label center"
            style="left: {filteredLaneConfig().eventLaneCount * filteredLaneConfig().laneWidth}px; width: {filteredLaneConfig().laneWidth}px;"
          ></div>
          {#each filteredLaneConfig().actorRoles as role, i}
            <div
              class="tl-lane-label actor"
              style="left: {(filteredLaneConfig().eventLaneCount + 1 + i) * filteredLaneConfig().laneWidth}px; width: {filteredLaneConfig().laneWidth}px;"
            >
              {#if role}<span class="tl-lane-label-text">{role}</span>{/if}
            </div>
          {/each}
        </div>
        </div>
        {#if laneConfig.eventSystems.length > 1 || laneConfig.actorRoles.length > 1}
          <div class="tl-filter-dropdown">
            <button
              class="tl-filter-trigger"
              class:has-filters={hasActiveFilters}
              onclick={() => filterDropdownOpen = !filterDropdownOpen}
            >
              <span>⚙</span>
              {#if hasActiveFilters}
                <span class="tl-filter-badge">{hiddenSystems.size + hiddenRoles.size}</span>
              {/if}
            </button>
            {#if filterDropdownOpen}
              <div class="tl-filter-panel">
                {#if laneConfig.eventSystems.length > 1}
                  <div class="tl-filter-group">
                    <span class="tl-filter-label">Systems</span>
                    <div class="tl-filter-chips">
                      {#each laneConfig.eventSystems as system}
                        <button
                          class="tl-filter-chip event"
                          class:hidden={hiddenSystems.has(system)}
                          onclick={() => toggleSystem(system)}
                        >
                          {system || 'Default'}
                        </button>
                      {/each}
                    </div>
                  </div>
                {/if}
                {#if laneConfig.actorRoles.length > 1}
                  <div class="tl-filter-group">
                    <span class="tl-filter-label">Roles</span>
                    <div class="tl-filter-chips">
                      {#each laneConfig.actorRoles as role}
                        <button
                          class="tl-filter-chip actor"
                          class:hidden={hiddenRoles.has(role)}
                          onclick={() => toggleRole(role)}
                        >
                          {role || 'Default'}
                        </button>
                      {/each}
                    </div>
                  </div>
                {/if}
                {#if hasActiveFilters}
                  <button class="tl-filter-clear" onclick={clearAllFilters}>
                    Reset
                  </button>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      </div>
      <div
        class="tl-master-line"
        style="width: {totalLaneWidth}px; {generateLaneBackgroundCSS()}"
      ></div>
      {#each filteredItems as { element: el, position, laneIndex }}
        <button
          class="tl-master-item"
          class:active={activeTick === el.tick}
          data-tick={el.tick}
          onclick={() => scrollToDetail(el.tick)}
        >
          <span class="tl-tick">@{el.tick}</span>
          <span
            class="tl-symbol {el.type}"
            style="width: {totalLaneWidth}px; padding-left: {getSymbolPadding(position, laneIndex)}px;"
          >{symbols[el.type]}</span>
          <span class="tl-name {el.type}">{el.name}</span>
        </button>
      {/each}
    </div>
  </aside>

  <!-- Detail: Continuous stream on the right -->
  <main class="timeline-detail" bind:this={detailContainer}>
    <header class="tl-detail-title">
      <h2>Timeline</h2>
      <span class="tl-detail-count">
          {filteredCount}{filteredCount !== viewModel.count ? ` of ${viewModel.count}` : ''} items
        </span>
    </header>
    {#each filteredItems as { element: el, position }}
      <section
        class="tl-detail-item tl-{position}"
        id="tick-{el.tick}"
        use:registerDetailElement={el.tick}
      >
        <div class="tl-detail-header">
          <span class="tl-symbol {el.type}">{symbols[el.type]}</span>
          <span class="tl-tick">@{el.tick}</span>
          <span class="tl-name {el.type}">{el.name}</span>
          {#if isEvent(el) && el.system}
            <span class="tl-lane-badge event">{el.system}</span>
          {/if}
          {#if isActor(el) && el.role}
            <span class="tl-lane-badge actor">{el.role}</span>
          {/if}
        </div>
        <div class="tl-detail-content">
          {#if isEvent(el)}
            {#if el.producedBy}
              <div class="tl-detail-row">
                producedBy: <span class="command">{el.producedBy}</span>
              </div>
            {/if}
            {#if el.externalSource}
              <div class="tl-detail-row">
                externalSource: {el.externalSource}
              </div>
            {/if}
            {#if el.example}
              <JsonDisplay data={el.example} class="tl-json" />
            {/if}
          {:else if isState(el)}
            {#if el.sourcedFrom.length > 0}
              <div class="tl-detail-row">
                sourcedFrom: {#each el.sourcedFrom as eventName, i}<span
                    class="event">{eventName}</span
                  >{i < el.sourcedFrom.length - 1 ? ", " : ""}{/each}
              </div>
            {/if}
            {#if el.example}
              <JsonDisplay data={el.example} class="tl-json" />
            {/if}
          {:else if isActor(el)}
            <div class="tl-detail-row">
              reads <span class="state">{el.readsView}</span> → triggers
              <span class="command">{el.sendsCommand}</span>
            </div>
            {#if el.wireframes && el.wireframes.length > 0}
              <div class="tl-wireframes">
                {#each el.wireframes as wireframe}
                  <WireframeViewer
                    src="/wireframes/{wireframe}"
                    title="{el.name} - {wireframe}"
                  />
                {/each}
              </div>
            {/if}
          {:else if isCommand(el)}
            {#if el.example}
              <JsonDisplay data={el.example} class="tl-json" />
            {/if}
          {/if}
        </div>
      </section>
    {/each}
  </main>
</div>

<style>
  .timeline-master-detail {
    display: flex;
    font-family: var(--font-mono);
    min-height: calc(100vh - 120px);
  }

  /* Master sidebar */
  .timeline-master {
    width: 30%;
    min-width: 280px;
    position: sticky;
    top: 120px;
    align-self: flex-start;
    max-height: calc(100vh - 120px);
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    box-shadow: var(--shadow-card);
    margin: 1.5rem 0 1.5rem 2rem;
  }

  .tl-master-content {
    position: relative;
    min-height: 100%;
  }

  .tl-lane-header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 0.5rem 0.5rem 0.5rem 0;
    gap: 0.5rem;
  }

  .tl-lane-labels-wrapper {
    flex: 1;
    min-width: 0;
  }

  .tl-lane-labels {
    position: relative;
    height: 7rem;
  }

  .tl-lane-label {
    position: absolute;
    top: 0;
    height: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    overflow: hidden;
    padding-bottom: 0.25rem;
  }

  .tl-lane-label-text {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    transform: rotate(180deg);
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0.25rem 0.15rem;
    border-radius: 0.2rem;
    max-height: calc(100% - 4px);
  }

  .tl-lane-label.event .tl-lane-label-text {
    background: rgba(249, 115, 22, 0.15);
    color: var(--color-event);
  }

  .tl-lane-label.center .tl-lane-label-text {
    background: rgba(107, 114, 128, 0.15);
    color: var(--text-secondary);
  }

  .tl-lane-label.actor .tl-lane-label-text {
    background: rgba(34, 197, 94, 0.15);
    color: var(--color-actor);
  }

  .tl-master-line {
    position: absolute;
    /* Top offset accounts for lane header: padding (0.5rem + 0.5rem) + labels height (7rem) + border (1px) */
    top: calc(0.5rem + 0.5rem + 7rem + 1px);
    bottom: 0;
    /* left padding (0.75rem) + tick width (2rem) + gap (0.5rem) + tick margin (0.25rem) = 3.5rem */
    left: calc(0.75rem + 2rem + 0.5rem + 0.25rem);
    pointer-events: none;
    z-index: 2;
  }

  .tl-master-item {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0.5rem 0.75rem;
    gap: 0.5rem;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    transition: background 0.15s;
  }

  .tl-master-item:last-child {
    border-bottom: none;
  }

  .tl-master-item:hover {
    background: var(--bg-secondary);
  }

  .tl-master-item.active {
    background: var(--bg-secondary);
    box-shadow: inset 3px 0 0 var(--color-command);
  }

  .tl-master-item .tl-tick {
    color: var(--text-secondary);
    font-size: 0.75rem;
    flex-shrink: 0;
    width: 2rem;
    text-align: right;
    margin-right: 0.25rem;
  }

  .tl-master-item .tl-symbol {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    font-size: 0.9rem;
    font-weight: bold;
    flex-shrink: 0;
    position: relative;
    z-index: 3;
  }

  .tl-master-item .tl-name {
    font-size: 0.8rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    margin-left: 0.25rem;
  }

  /* Detail area */
  .timeline-detail {
    flex: 1;
    padding: 1.5rem 2rem 50vh 1rem;
    overflow-y: auto;
  }

  .tl-detail-title {
    display: flex;
    align-items: baseline;
    gap: 1rem;
    margin-bottom: 3rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
  }

  .tl-detail-title h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    color: var(--text-primary);
  }

  .tl-detail-count {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .tl-detail-item {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    box-shadow: var(--shadow-card);
    overflow: hidden;
    scroll-margin-top: calc(95px + 1.5rem);
  }

  .tl-detail-item:last-child {
    margin-bottom: 0;
  }

  .tl-detail-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg-secondary);
  }

  .tl-detail-header .tl-symbol {
    font-size: 1.1rem;
    font-weight: bold;
    flex-shrink: 0;
  }

  .tl-detail-header .tl-tick {
    color: var(--text-secondary);
    font-size: 0.85rem;
    flex-shrink: 0;
  }

  .tl-detail-header .tl-name {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .tl-lane-badge {
    font-size: 0.7rem;
    font-weight: 500;
    padding: 0.15rem 0.4rem;
    border-radius: 0.75rem;
    margin-left: auto;
  }

  .tl-lane-badge.event {
    background: rgba(249, 115, 22, 0.15);
    color: var(--color-event);
    border: 1px solid rgba(249, 115, 22, 0.3);
  }

  .tl-lane-badge.actor {
    background: rgba(34, 197, 94, 0.15);
    color: var(--color-actor);
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .tl-detail-content {
    padding: 1rem;
  }

  .tl-detail-content:empty {
    display: none;
  }

  .tl-detail-row {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
  }

  .tl-detail-row:last-child {
    margin-bottom: 0;
  }

  /* Color classes */
  .tl-symbol.event {
    color: var(--color-event);
  }
  .tl-symbol.state {
    color: var(--color-state);
  }
  .tl-symbol.command {
    color: var(--color-command);
  }
  .tl-symbol.actor {
    color: var(--color-actor);
  }

  .tl-name.event {
    color: var(--color-event);
  }
  .tl-name.state {
    color: var(--color-state);
  }
  .tl-name.actor {
    color: var(--color-actor);
  }
  .tl-name.command {
    color: var(--color-command);
  }

  .tl-detail-row .event {
    color: var(--color-event);
  }
  .tl-detail-row .state {
    color: var(--color-state);
  }
  .tl-detail-row .actor {
    color: var(--color-actor);
  }
  .tl-detail-row .command {
    color: var(--color-command);
  }

  :global(.tl-json) {
    margin-top: 0.5rem;
    font-size: 0.75rem !important;
  }

  .tl-wireframes {
    margin-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  :global(.highlight-flash) {
    animation: flash 2s ease-out;
  }

  @keyframes flash {
    0%,
    20% {
      background: rgba(234, 179, 8, 0.25);
    }
    100% {
      background: transparent;
    }
  }

  /* Filter dropdown styles */
  .tl-filter-dropdown {
    position: relative;
    flex-shrink: 0;
    align-self: flex-end;
    margin-bottom: 0.25rem;
  }

  .tl-filter-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    border: 1px solid var(--border);
    background: var(--bg-card);
    border-radius: 0.25rem;
    font-size: 0.85rem;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
    color: var(--text-secondary);
  }

  .tl-filter-trigger:hover {
    border-color: var(--text-secondary);
    background: var(--bg-secondary);
  }

  .tl-filter-trigger.has-filters {
    border-color: var(--color-command);
    color: var(--color-command);
  }

  .tl-filter-badge {
    position: absolute;
    top: -0.35rem;
    right: -0.35rem;
    background: var(--color-command);
    color: white;
    font-size: 0.55rem;
    min-width: 1rem;
    height: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 0.25rem;
    border-radius: 0.5rem;
    font-weight: 600;
  }

  .tl-filter-panel {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.25rem;
    min-width: 10rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 0.375rem;
    box-shadow: var(--shadow-card);
    z-index: 100;
    padding: 0.5rem;
  }

  .tl-filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .tl-filter-group + .tl-filter-group {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--border);
  }

  .tl-filter-label {
    font-size: 0.6rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .tl-filter-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .tl-filter-chip {
    padding: 0.25rem 0.5rem;
    border-radius: 1rem;
    font-size: 0.7rem;
    font-family: inherit;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    border: 1px solid transparent;
  }

  .tl-filter-chip.event {
    background: rgba(249, 115, 22, 0.15);
    color: var(--color-event);
    border-color: rgba(249, 115, 22, 0.3);
  }

  .tl-filter-chip.event:hover {
    background: rgba(249, 115, 22, 0.25);
  }

  .tl-filter-chip.actor {
    background: rgba(34, 197, 94, 0.15);
    color: var(--color-actor);
    border-color: rgba(34, 197, 94, 0.3);
  }

  .tl-filter-chip.actor:hover {
    background: rgba(34, 197, 94, 0.25);
  }

  .tl-filter-chip.hidden {
    background: var(--bg-secondary);
    color: var(--text-secondary);
    border-color: var(--border);
    opacity: 0.6;
    text-decoration: line-through;
  }

  .tl-filter-chip.hidden:hover {
    opacity: 0.8;
  }

  .tl-filter-clear {
    margin-top: 0.5rem;
    padding: 0.3rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 0.25rem;
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.65rem;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
    align-self: flex-start;
  }

  .tl-filter-clear:hover {
    border-color: var(--text-secondary);
    color: var(--text-primary);
  }
</style>
