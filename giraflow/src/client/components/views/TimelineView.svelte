<script lang="ts">
  import { modelStore } from "../../stores/model.svelte";
  import { isEvent, isState, isCommand, isActor } from "../../lib/types";
  import type { Event, Actor } from "../../lib/types";
  import { buildTimelineViewModel } from "../../lib/models";
  import JsonDisplay from "../shared/JsonDisplay.svelte";
  import WireframeViewer from "../shared/WireframeViewer.svelte";
  import TimelineHorizontalView from "./TimelineHorizontalView.svelte";

  const symbols: Record<string, string> = {
    event: "●",
    state: "◆",
    command: "▶",
    actor: "○",
  };

  // Orientation toggle: vertical (default) or horizontal
  // Restore from localStorage if available
  const savedOrientation = typeof localStorage !== 'undefined' 
    ? localStorage.getItem('giraflow-timeline-orientation') as 'vertical' | 'horizontal' | null
    : null;
  let orientation = $state<'vertical' | 'horizontal'>(savedOrientation || 'vertical');
  let prevOrientation = $state<'vertical' | 'horizontal'>(savedOrientation || 'vertical');
  
  // Save orientation to localStorage when it changes
  $effect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('giraflow-timeline-orientation', orientation);
    }
  });

  let activeTick = $state<number | null>(null);
  let detailContainer: HTMLElement | null = $state(null);
  let detailElements = $state<Map<number, HTMLElement>>(new Map());
  // Set flag immediately if there's a hash to navigate to
  let isProgrammaticScroll = window.location.hash.includes("timeline/tick-");

  // Mobile side panel state
  let sidePanelOpen = $state(false);

  // Filter state - sets contain systems/roles to HIDE
  let hiddenSystems = $state(new Set<string>());
  let hiddenRoles = $state(new Set<string>());
  let filterDropdownOpen = $state(false);

  // Hovered lane state for full-column highlight
  let hoveredLane = $state<{ type: 'event' | 'actor' | 'center'; index: number } | null>(null);

  // Check if any filters are active
  let hasActiveFilters = $derived(hiddenSystems.size > 0 || hiddenRoles.size > 0);

  // Check if lane header should be shown (multiple lanes or named lanes)
  let shouldShowLaneHeader = $derived(() => {
    const hasMultipleSystems = laneConfig.eventSystems.length > 1;
    const hasMultipleRoles = laneConfig.actorRoles.length > 1;
    const hasNamedSystem = laneConfig.eventSystems.some(s => s !== '');
    const hasNamedRole = laneConfig.actorRoles.some(r => r !== '');
    return hasMultipleSystems || hasMultipleRoles || hasNamedSystem || hasNamedRole;
  });

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

  // Berechne die optimale Höhe für Lane-Labels basierend auf der längsten Namenslänge
  let laneLabelHeight = $derived(() => {
    const allNames = [...laneConfig.eventSystems, ...laneConfig.actorRoles];
    const maxLength = Math.max(...allNames.map(name => (name || '').length), 0);
    // Ca. 0.5rem pro Zeichen, Minimum 3rem, Maximum 9rem
    return Math.min(9, Math.max(3, 1.5 + maxLength * 0.5));
  });

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

  // Generate CSS for faded lane backgrounds and lines in the header area
  function generateLaneLinesFadeCSS(): string {
    const config = filteredLaneConfig();
    const laneWidth = config.laneWidth;
    const eventLanes = config.eventLaneCount;
    const actorLanes = config.actorLaneCount;
    const totalLanes = config.totalLanes;
    const centerLaneIndex = eventLanes;

    const layers: string[] = [];
    const positions: string[] = [];
    const sizes: string[] = [];

    // Hatching for center lane
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
      background-image: ${layers.join(', ')};
      background-position: ${positions.join(', ')};
      background-size: ${sizes.join(', ')};
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
      // Close panel on mobile after selection
      if (window.innerWidth <= 900) {
        sidePanelOpen = false;
      }
    }
  }

  // Scroll to activeTick when switching from horizontal to vertical
  $effect(() => {
    if (prevOrientation === 'horizontal' && orientation === 'vertical' && activeTick !== null) {
      // Wait for DOM to render vertical view
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const element = document.getElementById(`tick-${activeTick}`);
          if (element) {
            isProgrammaticScroll = true;
            element.scrollIntoView({ behavior: "smooth", block: "start" });
            setTimeout(() => (isProgrammaticScroll = false), 1000);
          }
        });
      });
    }
    prevOrientation = orientation;
  });

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

  // Handle initial hash on mount - parse tick from URL (runs once when data loads)
  let hasInitializedFromHash = false;
  $effect(() => {
    if (hasInitializedFromHash) return;
    
    const hash = window.location.hash.slice(1);
    if (hash.startsWith("timeline/tick-") && timelineItems.length > 0) {
      const tick = parseInt(hash.replace("timeline/tick-", ""), 10);
      if (!isNaN(tick)) {
        hasInitializedFromHash = true;
        activeTick = tick;
        // Scroll to this tick in vertical view
        if (orientation === 'vertical') {
          requestAnimationFrame(() => {
            const el = document.getElementById(`tick-${tick}`);
            if (el) {
              isProgrammaticScroll = true;
              el.scrollIntoView({ behavior: "smooth", block: "start" });
              setTimeout(() => (isProgrammaticScroll = false), 1000);
            }
          });
        }
      }
    } else if (timelineItems.length > 0 && activeTick === null) {
      hasInitializedFromHash = true;
      activeTick = timelineItems[0].element.tick;
    }
  });
  
  // Scroll to activeTick only when switching from horizontal to vertical
  $effect(() => {
    if (prevOrientation === 'horizontal' && orientation === 'vertical' && activeTick !== null) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = document.getElementById(`tick-${activeTick}`);
          if (el) {
            isProgrammaticScroll = true;
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            setTimeout(() => (isProgrammaticScroll = false), 1000);
          }
        });
      });
    }
    prevOrientation = orientation;
  });
</script>

<!-- Floating Orientation Toggle -->
<div class="orientation-toggle-floating">
  <button 
    class="orientation-btn-floating" 
    class:active={orientation === 'vertical'}
    onclick={() => orientation = 'vertical'}
    title="Vertikal (Zeit ↓)"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 4v16M8 16l4 4 4-4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>
  <button 
    class="orientation-btn-floating" 
    class:active={orientation === 'horizontal'}
    onclick={() => orientation = 'horizontal'}
    title="Horizontal (Zeit →)"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 12h16M16 8l4 4-4 4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>
</div>

{#if orientation === 'horizontal'}
  <TimelineHorizontalView bind:activeTick bind:orientation />
{:else}
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="timeline-master-detail" role="presentation" onclick={handleClickOutside}>
  <!-- Mobile toggle button -->
  <button
    class="tl-panel-toggle"
    onclick={() => sidePanelOpen = !sidePanelOpen}
    aria-label={sidePanelOpen ? 'Close timeline panel' : 'Open timeline panel'}
  >
    {sidePanelOpen ? '✕' : '☰'}
  </button>

  <!-- Mobile overlay backdrop -->
  {#if sidePanelOpen}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="tl-panel-overlay"
      onclick={() => sidePanelOpen = false}
    ></div>
  {/if}

  <!-- Master: Compact timeline on the left -->
  <aside class="timeline-master" class:open={sidePanelOpen}>
    <div class="tl-master-content">
      {#if shouldShowLaneHeader()}
        <div class="tl-lane-header">
          <div class="tl-lane-labels-wrapper" style="padding-left: calc(0.75rem + 2rem + 0.5rem + 0.25rem);">
          <div class="tl-lane-labels" style="width: {totalLaneWidth}px; height: {laneLabelHeight()}rem;">
            <!-- Faded lane lines extending into header -->
            <div class="tl-lane-lines-fade" style="width: {totalLaneWidth}px; {generateLaneLinesFadeCSS()}"></div>
            <!-- Lane highlight in header area -->
            {#if hoveredLane}
              <div
                class="tl-lane-highlight-header {hoveredLane.type}"
                style="left: {(hoveredLane.type === 'event' ? hoveredLane.index : hoveredLane.type === 'center' ? filteredLaneConfig().eventLaneCount : filteredLaneConfig().eventLaneCount + 1 + hoveredLane.index) * filteredLaneConfig().laneWidth}px; width: {filteredLaneConfig().laneWidth}px;"
              ></div>
            {/if}
            {#each filteredLaneConfig().eventSystems as system, i}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="tl-lane-label event"
                style="left: {i * filteredLaneConfig().laneWidth}px; width: {filteredLaneConfig().laneWidth}px;"
                onmouseenter={() => hoveredLane = { type: 'event', index: i }}
                onmouseleave={() => hoveredLane = null}
              >
                {#if system}<span class="tl-lane-label-text">{system}</span>{/if}
                <div class="tl-lane-tooltip event">
                  <span class="tl-lane-tooltip-type">System</span>
                  <span class="tl-lane-tooltip-name">{system || 'Default'}</span>
                </div>
              </div>
            {/each}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="tl-lane-label center"
              style="left: {filteredLaneConfig().eventLaneCount * filteredLaneConfig().laneWidth}px; width: {filteredLaneConfig().laneWidth}px;"
              onmouseenter={() => hoveredLane = { type: 'center' as any, index: 0 }}
              onmouseleave={() => hoveredLane = null}
            >
              <div class="tl-lane-tooltip center">
                <span class="tl-lane-tooltip-name">Commands / State Views</span>
              </div>
            </div>
            {#each filteredLaneConfig().actorRoles as role, i}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="tl-lane-label actor"
                style="left: {(filteredLaneConfig().eventLaneCount + 1 + i) * filteredLaneConfig().laneWidth}px; width: {filteredLaneConfig().laneWidth}px;"
                onmouseenter={() => hoveredLane = { type: 'actor', index: i }}
                onmouseleave={() => hoveredLane = null}
              >
                {#if role}<span class="tl-lane-label-text">{role}</span>{/if}
                <div class="tl-lane-tooltip actor">
                  <span class="tl-lane-tooltip-type">Rolle</span>
                  <span class="tl-lane-tooltip-name">{role || 'Default'}</span>
                </div>
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
                <span class="tl-filter-icon">⚙</span>
                <span class="tl-filter-text">Filter</span>
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
      {/if}
      <div
        class="tl-master-line"
        style="width: {totalLaneWidth}px; {shouldShowLaneHeader() ? `top: calc(0.375rem + 0.375rem + ${laneLabelHeight()}rem + 1px);` : ''} {generateLaneBackgroundCSS()}"
      >
        {#if hoveredLane}
          <div
            class="tl-lane-highlight {hoveredLane.type}"
            style="left: {(hoveredLane.type === 'event' ? hoveredLane.index : hoveredLane.type === 'center' ? filteredLaneConfig().eventLaneCount : filteredLaneConfig().eventLaneCount + 1 + hoveredLane.index) * filteredLaneConfig().laneWidth}px; width: {filteredLaneConfig().laneWidth}px;"
          ></div>
        {/if}
      </div>
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
          {#if isActor(el) && el.wireframes && el.wireframes.length > 0}
            <span class="tl-wireframe-indicator" title="Wireframe">
              <svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="3" width="14" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="5" cy="7" r="1.5"/><path d="M3 11l3-3 2 2 4-4 3 3" stroke="currentColor" stroke-width="1" fill="none"/></svg>
            </span>
          {/if}
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
          {#if isState(el) || isCommand(el)}
            <a class="tl-name tl-name-link {el.type}" href="#slice/{encodeURIComponent(el.name)}">{el.name}</a>
          {:else}
            <span class="tl-name {el.type}">{el.name}</span>
          {/if}
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
                    src={modelStore.getWireframePath(wireframe)}
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
{/if}

<style>
  .orientation-toggle-floating {
    position: fixed;
    top: 105px;
    right: 1rem;
    display: flex;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 0.375rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 50;
    overflow: hidden;
  }

  .orientation-btn-floating {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s;
  }

  .orientation-btn-floating svg {
    width: 16px;
    height: 16px;
  }

  .orientation-btn-floating:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  .orientation-btn-floating.active {
    background: var(--color-command);
    color: white;
  }

  .orientation-btn-floating:first-child {
    border-right: 1px solid var(--border);
  }

  .orientation-btn-floating.active:first-child {
    border-right-color: var(--color-command);
  }
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
    padding: 0.375rem 0.5rem 0.375rem 0;
    gap: 0.5rem;
  }

  .tl-lane-labels-wrapper {
    flex: 1;
    min-width: 0;
  }

  .tl-lane-labels {
    position: relative;
    /* height is set dynamically via inline style based on max label length */
  }

  .tl-lane-lines-fade {
    position: absolute;
    top: 0;
    bottom: -0.5rem; /* extend past label area to connect with main lane lines */
    left: 0;
    pointer-events: none;
    mask-image: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,1) 100%);
    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,1) 100%);
  }

  .tl-lane-label {
    position: absolute;
    top: 0;
    height: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    overflow: visible;
    padding-bottom: 0.25rem;
    cursor: pointer;
    transition: background 0.15s;
  }


  .tl-lane-tooltip {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(0.5rem);
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s, visibility 0.2s;
    /* Glassmorphism - light mode */
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    white-space: nowrap;
    z-index: 20;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    text-align: center;
  }

  /* Arrow pointing up */
  .tl-lane-tooltip::before {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-bottom-color: rgba(255, 255, 255, 0.95);
  }

  .tl-lane-label:hover .tl-lane-tooltip {
    opacity: 1;
    visibility: visible;
  }

  .tl-lane-tooltip-type {
    font-size: 0.6rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
  }

  .tl-lane-tooltip-name {
    font-size: 0.8rem;
    font-weight: 600;
  }

  .tl-lane-tooltip.event .tl-lane-tooltip-name {
    color: var(--color-event);
  }

  .tl-lane-tooltip.actor .tl-lane-tooltip-name {
    color: var(--color-actor);
  }

  .tl-lane-tooltip.center .tl-lane-tooltip-name {
    color: var(--text-primary);
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
    color: var(--color-event);
  }

  .tl-lane-label.center .tl-lane-label-text {
    color: var(--text-secondary);
  }

  .tl-lane-label.actor .tl-lane-label-text {
    color: var(--color-actor);
  }

  .tl-master-line {
    position: absolute;
    /* top is set dynamically via inline style when header is shown */
    top: 0;
    bottom: 0;
    /* left padding (0.75rem) + tick width (2rem) + gap (0.5rem) + tick margin (0.25rem) = 3.5rem */
    left: calc(0.75rem + 2rem + 0.5rem + 0.25rem);
    pointer-events: none;
    z-index: 2;
  }

  .tl-lane-highlight {
    position: absolute;
    top: 0;
    bottom: 0;
    pointer-events: none;
    transition: opacity 0.15s;
  }

  .tl-lane-highlight.event {
    background: linear-gradient(
      to bottom,
      rgba(249, 115, 22, 0.15) 0%,
      rgba(249, 115, 22, 0.08) 100%
    );
  }

  .tl-lane-highlight.actor,
  .tl-lane-highlight.center {
    background: linear-gradient(
      to bottom,
      rgba(107, 114, 128, 0.15) 0%,
      rgba(107, 114, 128, 0.08) 100%
    );
  }

  .tl-lane-highlight-header {
    position: absolute;
    top: 0;
    bottom: -0.5rem; /* extend to connect with main highlight */
    pointer-events: none;
    z-index: 1;
  }

  .tl-lane-highlight-header.event {
    background: rgba(249, 115, 22, 0.12);
  }

  .tl-lane-highlight-header.actor,
  .tl-lane-highlight-header.center {
    background: rgba(107, 114, 128, 0.12);
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

  .tl-wireframe-indicator {
    display: flex;
    align-items: center;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .tl-wireframe-indicator svg {
    width: 14px;
    height: 14px;
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

  .tl-detail-header .tl-name-link {
    text-decoration: none;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .tl-detail-header .tl-name-link:hover {
    text-decoration: underline;
    opacity: 0.8;
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
    gap: 0.375rem;
    width: auto;
    height: 2rem;
    padding: 0 0.75rem;
    border: 1px solid var(--border);
    background: var(--bg-card);
    border-radius: 0.375rem;
    font-size: 0.85rem;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
    color: var(--text-secondary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    box-sizing: content-box;
  }

  .tl-filter-trigger:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  .tl-filter-icon {
    font-size: 0.85rem;
  }

  .tl-filter-text {
    font-size: 0.75rem;
    font-weight: 500;
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

  /* Mobile panel toggle button - hidden by default on desktop */
  .tl-panel-toggle {
    display: none;
  }

  /* Mobile overlay - hidden by default */
  .tl-panel-overlay {
    display: none;
  }

  /* Mobile responsive styles */
  @media (max-width: 900px) {
    .tl-filter-text {
      display: none;
    }

    .tl-filter-trigger {
      width: 1.75rem;
      height: 1.75rem;
      padding: 0;
    }

    .timeline-master {
      position: fixed;
      left: 0;
      top: 120px;
      bottom: 0;
      width: 300px;
      max-width: 85vw;
      margin: 0;
      border-radius: 0;
      border-left: none;
      border-top: none;
      border-bottom: none;
      transform: translateX(-100%);
      transition: transform 0.3s ease;
      z-index: 101;
    }

    .timeline-master.open {
      transform: translateX(0);
    }

    .tl-panel-overlay {
      display: block;
      position: fixed;
      inset: 0;
      top: 120px;
      background: rgba(0, 0, 0, 0.5);
      z-index: 100;
    }

    .tl-panel-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      position: fixed;
      left: 1rem;
      bottom: 1rem;
      width: 3rem;
      height: 3rem;
      border-radius: 50%;
      background: var(--color-command);
      color: white;
      border: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      font-size: 1.25rem;
      cursor: pointer;
      z-index: 102;
      transition: background 0.15s, transform 0.15s;
    }

    .tl-panel-toggle:hover {
      background: var(--color-command);
      transform: scale(1.05);
    }

    .tl-panel-toggle:active {
      transform: scale(0.95);
    }

    .timeline-detail {
      padding-left: 1rem;
      padding-right: 1rem;
    }
  }
</style>
