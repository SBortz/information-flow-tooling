<script lang="ts">
  import { modelStore } from "../../stores/model.svelte";
  import {
    buildSliceViewModel,
    getSliceKey,
    getReadingActors,
    getTriggeringActors,
    getSliceExamples,
    groupActorsByName,
    type Slice,
  } from "../../lib/models";
  import JsonDisplay from "../shared/JsonDisplay.svelte";
  import Scenario from "../shared/Scenario.svelte";

  // Build view model from raw data
  let viewModel = $derived(
    modelStore.model ? buildSliceViewModel(modelStore.model) : null
  );
  let slices = $derived(viewModel?.slices ?? []);
  let activeSliceKey = $state<string | null>(null);
  let activeScenarioId = $state<string | null>(null);
  let scrollContainer: HTMLElement | null = $state(null);
  let sliceElements = $state<Map<string, HTMLElement>>(new Map());
  let scenarioElements = $state<Map<string, HTMLElement>>(new Map());
  let carouselIndices = $state<Map<string, number>>(new Map());

  // Set first slice as active by default
  $effect(() => {
    if (!activeSliceKey && slices.length > 0) {
      activeSliceKey = getSliceKey(slices[0]);
    }
  });

  // IntersectionObserver for scroll-based slice highlighting
  $effect(() => {
    if (!scrollContainer || sliceElements.size === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible slice
        const visibleEntries = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visibleEntries.length > 0) {
          const id = visibleEntries[0].target.id;
          if (id.startsWith("slice-")) {
            activeSliceKey = id.replace("slice-", "");
          }
        }
      },
      {
        root: scrollContainer,
        rootMargin: "-10% 0px -70% 0px",
        threshold: 0,
      },
    );

    for (const el of sliceElements.values()) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  });

  // Scroll-based scenario highlighting
  $effect(() => {
    if (!scrollContainer || scenarioElements.size === 0) return;

    function updateActiveScenario() {
      const containerRect = scrollContainer!.getBoundingClientRect();
      const threshold = containerRect.top + containerRect.height * 0.15; // 15% vom oberen Rand

      let closestElement: HTMLElement | null = null;
      let closestDistance = Infinity;

      for (const element of scenarioElements.values()) {
        const rect = element.getBoundingClientRect();
        // Element muss sichtbar sein (oberer Rand über Threshold)
        if (rect.top <= threshold) {
          const distance = threshold - rect.top;
          if (distance < closestDistance) {
            closestDistance = distance;
            closestElement = element;
          }
        }
      }

      if (closestElement) {
        activeScenarioId = closestElement.id;
      }
    }

    scrollContainer.addEventListener("scroll", updateActiveScenario);
    updateActiveScenario(); // Initial call

    return () =>
      scrollContainer!.removeEventListener("scroll", updateActiveScenario);
  });

  // URL hash handling for deep-links - only handle slice/* hashes
  $effect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && hash.startsWith("slice/") && slices.length > 0) {
      const parts = hash.split("/");
      const sliceName = decodeURIComponent(parts[1]);
      const scenarioName =
        parts[2] === "scenario" ? decodeURIComponent(parts[3]) : null;

      // Find the slice by name
      const slice = slices.find((s) => s.name === sliceName);
      if (slice) {
        const sliceKey = getSliceKey(slice);
        activeSliceKey = sliceKey;

        requestAnimationFrame(() => {
          if (scenarioName) {
            // Find scenario index by name
            const scenarioIndex = slice.scenarios.findIndex(
              (s) => s.name === scenarioName,
            );
            if (scenarioIndex >= 0) {
              const el = document.getElementById(
                `scenario-${sliceKey}-${scenarioIndex}`,
              );
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }
          } else {
            const el = document.getElementById(`slice-${sliceKey}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }
        });
      }
    }
  });

  function registerSliceElement(el: HTMLElement, key: string) {
    sliceElements.set(key, el);
    sliceElements = new Map(sliceElements);

    return {
      destroy() {
        sliceElements.delete(key);
        sliceElements = new Map(sliceElements);
      },
    };
  }

  function registerScenarioElement(el: HTMLElement, id: string) {
    scenarioElements.set(id, el);
    scenarioElements = new Map(scenarioElements);

    return {
      destroy() {
        scenarioElements.delete(id);
        scenarioElements = new Map(scenarioElements);
      },
    };
  }

  function scrollToSlice(slice: Slice) {
    const sliceKey = getSliceKey(slice);
    const el = document.getElementById(`slice-${sliceKey}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // Use replaceState to update URL without adding history entry
      history.replaceState(null, "", `#slice/${encodeURIComponent(slice.name)}`);
    }
  }

  function scrollToScenario(
    slice: Slice,
    scenarioIndex: number,
    scenarioName: string,
  ) {
    const sliceKey = getSliceKey(slice);
    const id = `scenario-${sliceKey}-${scenarioIndex}`;
    const el = document.getElementById(id);
    if (el) {
      // Set active immediately on click
      activeScenarioId = id;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // Use replaceState to update URL without adding history entry
      history.replaceState(null, "", `#slice/${encodeURIComponent(slice.name)}/scenario/${encodeURIComponent(scenarioName)}`);
    }
  }

  function navigateCarousel(sliceKey: string, direction: number, total: number) {
    const current = carouselIndices.get(sliceKey) ?? 0;
    const next = (current + direction + total) % total;
    carouselIndices.set(sliceKey, next);
    carouselIndices = new Map(carouselIndices);
  }
</script>

<div class="slice-explorer">
  <aside class="sidebar">
    <div class="sidebar-header">
      <h3>Slices</h3>
      <span class="count">{slices.length}</span>
    </div>
    <div class="slice-list">
      {#each slices as slice}
        {@const sliceKey = getSliceKey(slice)}
        {@const isActive = activeSliceKey === sliceKey}
        <div class="slice-nav-item {slice.type} {isActive ? 'active' : ''}">
          <button
            class="slice-item-button"
            onclick={() => scrollToSlice(slice)}
          >
            <span class="symbol {slice.type}"
              >{slice.type === "state" ? "◆" : "▶"}</span
            >
            <span class="name">{slice.name}</span>
          </button>

          {#if slice.scenarios.length > 0}
            <div class="scenario-nav-list {isActive ? 'expanded' : ''}">
              {#each slice.scenarios as scenario, scenarioIndex}
                {@const scenarioId = `scenario-${sliceKey}-${scenarioIndex}`}
                <button
                  class="scenario-nav-item {activeScenarioId === scenarioId
                    ? 'active'
                    : ''}"
                  onclick={() =>
                    scrollToScenario(slice, scenarioIndex, scenario.name)}
                >
                  <span class="scenario-icon">›</span>
                  <span class="scenario-name">{scenario.name}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </aside>

  <section class="main-content" bind:this={scrollContainer}>
    {#if slices.length > 0}
      <div class="slices-container">
        {#each slices as slice, sliceIndex}
          {@const sliceKey = getSliceKey(slice)}
          {@const examples = getSliceExamples(slice)}
          <article
            id="slice-{sliceKey}"
            class="slice-detail-view"
            use:registerSliceElement={sliceKey}
          >
            <div class="slice-card {slice.type}">
              <header class="detail-header {slice.type}">
                <div class="title-group">
                  <span class="symbol {slice.type}"
                    >{slice.type === "state" ? "◆" : "▶"}</span
                  >
                  <h1>{slice.name}</h1>
                  <span class="type-badge {slice.type}">{slice.type}</span>
                </div>

                {#if examples.length > 0}
                  {@const currentIndex = carouselIndices.get(sliceKey) ?? 0}
                  <div class="example-carousel">
                    <div class="carousel-header">
                      <span class="carousel-label">Example @{examples[currentIndex].tick}</span>
                      {#if examples.length > 1}
                        <div class="carousel-nav">
                          <button onclick={() => navigateCarousel(sliceKey, -1, examples.length)}>‹</button>
                          <span>{currentIndex + 1} / {examples.length}</span>
                          <button onclick={() => navigateCarousel(sliceKey, 1, examples.length)}>›</button>
                        </div>
                      {/if}
                    </div>
                    <JsonDisplay data={examples[currentIndex].data} />
                  </div>
                {/if}
              </header>

              <div class="detail-body">
                <div class="slice-details">
                  {#if slice.type === "state" && viewModel}
                    {@const readingActors = getReadingActors(viewModel, slice.name)}
                    <div class="metadata-columns">
                      <div class="metadata-column">
                        {#if slice.sourcedFrom.length > 0}
                          <div class="detail-section">
                            <h4>Sourced From</h4>
                            {#each slice.sourcedFrom as source}
                              <div class="detail-item">
                                <span class="event">● {source.name}</span>
                                {#if source.system}
                                  <span class="lane-badge event">{source.system}</span>
                                {/if}
                                <span class="ticks-group">
                                  {#each source.ticks as tick}
                                    <a
                                      class="tick-ref-link"
                                      href="#timeline/tick-{tick}"
                                      onclick={(e) => {
                                        e.preventDefault();
                                        modelStore.navigateToTick(tick);
                                      }}
                                    >
                                      @{tick}
                                    </a>
                                  {/each}
                                </span>
                              </div>
                            {/each}
                          </div>
                        {/if}
                      </div>
                      <div class="metadata-column">
                        {#if readingActors.length > 0}
                          {@const groupedActors = groupActorsByName(readingActors)}
                          <div class="detail-section">
                            <h4>Read By</h4>
                            {#each groupedActors as actor}
                              <div class="detail-item">
                                <span class="actor">○ {actor.name}</span>
                                {#if actor.role}
                                  <span class="lane-badge actor">{actor.role}</span>
                                {/if}
                                <span class="ticks-group">
                                  {#each actor.ticks as tick}
                                    <a
                                      class="tick-ref-link"
                                      href="#timeline/tick-{tick}"
                                      onclick={(e) => {
                                        e.preventDefault();
                                        modelStore.navigateToTick(tick);
                                      }}
                                    >
                                      @{tick}
                                    </a>
                                  {/each}
                                </span>
                              </div>
                            {/each}
                          </div>
                        {/if}
                      </div>
                    </div>
                  {:else if viewModel}
                    {@const triggeringActors = getTriggeringActors(viewModel, slice.name)}
                    <div class="metadata-columns">
                      <div class="metadata-column">
                        {#if triggeringActors.length > 0}
                          {@const groupedTriggers = groupActorsByName(triggeringActors)}
                          <div class="detail-section">
                            <h4>Triggered By</h4>
                            {#each groupedTriggers as actor}
                              <div class="detail-item">
                                <span class="actor">○ {actor.name}</span>
                                {#if actor.role}
                                  <span class="lane-badge actor">{actor.role}</span>
                                {/if}
                                <span class="ticks-group">
                                  {#each actor.ticks as tick}
                                    <a
                                      class="tick-ref-link"
                                      href="#timeline/tick-{tick}"
                                      onclick={(e) => {
                                        e.preventDefault();
                                        modelStore.navigateToTick(tick);
                                      }}
                                    >
                                      @{tick}
                                    </a>
                                  {/each}
                                </span>
                              </div>
                            {/each}
                          </div>
                        {/if}
                      </div>
                      <div class="metadata-column">
                        {#if slice.produces.length > 0}
                          <div class="detail-section">
                            <h4>Produces</h4>
                            {#each slice.produces as produced}
                              <div class="detail-item">
                                <span class="event">● {produced.name}</span>
                                {#if produced.system}
                                  <span class="lane-badge event">{produced.system}</span>
                                {/if}
                                <span class="ticks-group">
                                  {#each produced.ticks as tick}
                                    <a
                                      class="tick-ref-link"
                                      href="#timeline/tick-{tick}"
                                      onclick={(e) => {
                                        e.preventDefault();
                                        modelStore.navigateToTick(tick);
                                      }}
                                    >
                                      @{tick}
                                    </a>
                                  {/each}
                                </span>
                              </div>
                            {/each}
                          </div>
                        {/if}
                      </div>
                    </div>
                  {/if}
                </div>

                {#if slice.attachments.length > 0}
                  <div class="attachments">
                    <h3>Attachments ({slice.attachments.length})</h3>
                    <div class="attachment-list">
                      {#each slice.attachments as attachment}
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
                              <span class="attachment-path"
                                >{attachment.path}</span
                              >
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

            {#if slice.scenarios.length > 0}
              <div class="scenarios">
                <h3>Scenarios ({slice.scenarios.length})</h3>
                {#each slice.scenarios as scenario, scenarioIndex}
                  {@const scenarioId = `scenario-${sliceKey}-${scenarioIndex}`}
                  <div id={scenarioId} use:registerScenarioElement={scenarioId}>
                    <Scenario
                      {scenario}
                      type={slice.type}
                      sliceName={slice.name}
                      alwaysOpen={true}
                    />
                  </div>
                {/each}
              </div>
            {/if}
          </article>
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <p>No slices found in this model</p>
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
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .slice-nav-item {
    display: flex;
    flex-direction: column;
    border-radius: 0.5rem;
    transition: all 0.2s ease-out;
  }

  .slice-item-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.875rem;
    border: 1px solid transparent;
    border-left: 3px solid transparent;
    border-radius: 0.5rem;
    background: transparent;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s ease-out;
  }

  .slice-item-button:hover {
    background: var(--bg-card);
  }

  /* State type hover hint */
  .slice-nav-item.state .slice-item-button:hover {
    background: rgba(156, 206, 106, 0.04);
  }

  /* Command type hover hint */
  .slice-nav-item.command .slice-item-button:hover {
    background: rgba(122, 162, 247, 0.04);
  }

  .slice-nav-item.active .slice-item-button {
    background: var(--bg-card);
    border-color: var(--border);
    box-shadow: var(--shadow-sm);
  }

  /* State active styling */
  .slice-nav-item.state.active .slice-item-button {
    background: rgba(156, 206, 106, 0.08);
    border-left-color: var(--color-state);
  }

  /* Command active styling */
  .slice-nav-item.command.active .slice-item-button {
    background: rgba(122, 162, 247, 0.08);
    border-left-color: var(--color-command);
  }

  .slice-item-button .name {
    font-size: 0.925rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-primary);
  }

  .slice-nav-item.active .slice-item-button .name {
    font-weight: 500;
  }

  .slice-item-button .symbol {
    font-size: 1rem;
  }

  /* Scenario navigation in sidebar */
  .scenario-nav-list {
    display: none;
    flex-direction: column;
    position: relative;
    margin-left: 1rem;
    padding-left: 1rem;
    margin-top: 0.25rem;
    margin-bottom: 0.5rem;
    gap: 0.25rem;
    border-left: 1px solid var(--border);
  }

  .scenario-nav-list.expanded {
    display: flex;
  }

  .scenario-nav-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    position: relative;
    padding: 0.375rem 0.5rem;
    border: 1px solid transparent;
    border-radius: 0.25rem;
    background: transparent;
    cursor: pointer;
    text-align: left;
    font-size: 0.8125rem;
    color: var(--text-secondary);
    transition: all 0.2s ease-out;
  }

  .scenario-nav-item::before {
    content: "";
    position: absolute;
    left: -1rem;
    width: 0.75rem;
    height: 1px;
    background: var(--border);
    top: 50%;
  }

  .scenario-nav-item:hover {
    background: var(--bg-card);
    color: var(--text-primary);
  }

  .scenario-nav-item.active {
    background: var(--bg-card);
    color: var(--text-primary);
    font-weight: 500;
    border: 1px solid var(--border);
    box-shadow: var(--shadow-sm);
  }

  .scenario-icon {
    font-size: 0.7rem;
  }

  .scenario-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Colors */
  .symbol.state {
    color: var(--color-state);
  }
  .symbol.command {
    color: var(--color-command);
  }

  /* Main Content */
  .main-content {
    flex: 1;
    overflow-y: auto;
    background: var(--bg-primary);
    padding: 2rem;
    scroll-behavior: smooth;
  }

  .slices-container {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 3rem;
    padding-bottom: calc(70vh);
  }

  .slice-detail-view {
    padding: 0;
    scroll-margin-top: 1rem;
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
    background: var(--bg-secondary);
    color: var(--color-command);
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
    text-decoration: none;
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

  .lane-badge {
    font-size: 0.65rem;
    font-weight: 500;
    padding: 0.1rem 0.35rem;
    border-radius: 0.75rem;
    margin-left: 0.25rem;
  }

  .lane-badge.event {
    background: rgba(249, 115, 22, 0.15);
    color: var(--color-event);
    border: 1px solid rgba(249, 115, 22, 0.3);
  }

  .lane-badge.actor {
    background: rgba(34, 197, 94, 0.15);
    color: var(--color-actor);
    border: 1px solid rgba(34, 197, 94, 0.3);
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
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .scenarios h3 {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-bottom: 0;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-secondary);
  }

  /* Example Carousel */
  .example-carousel {
    margin-top: 1rem;
    padding: 0.75rem;
    background: var(--bg-primary);
    border-radius: 0.375rem;
    border: 1px solid var(--border);
  }

  .carousel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .carousel-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    font-family: var(--font-mono);
  }

  .carousel-nav {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .carousel-nav button {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 0.25rem;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    color: var(--text-primary);
    font-size: 1rem;
    line-height: 1;
  }

  .carousel-nav button:hover {
    background: var(--bg-card);
    border-color: var(--color-link);
  }

  .carousel-nav span {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  /* Two-Column Metadata Layout */
  .metadata-columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }

  .metadata-column {
    min-width: 0;
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

    .metadata-columns {
      grid-template-columns: 1fr;
    }
  }
</style>
