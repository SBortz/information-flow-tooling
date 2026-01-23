<script lang="ts">
  import { modelStore } from '../../stores/model.svelte';
  import type { TimelineElement, Event, StateView, Command, Actor } from '../../lib/types';
  import { isEvent, isState, isCommand, isActor } from '../../lib/types';
  import JsonDisplay from '../shared/JsonDisplay.svelte';

  const symbols: Record<string, string> = {
    event: '●',
    state: '◆',
    command: '▶',
    actor: '○',
  };

  function getPosition(type: string): 'left' | 'center' | 'right' {
    if (type === 'event') return 'left';
    if (type === 'actor') return 'right';
    return 'center';
  }

  function hasDetails(el: TimelineElement): boolean {
    if (isEvent(el)) {
      return !!(el.producedBy || el.externalSource || el.example);
    }
    if (isState(el)) {
      return !!(el.sourcedFrom.length > 0 || el.example);
    }
    if (isActor(el)) {
      return true;
    }
    if (isCommand(el)) {
      return !!el.example;
    }
    return false;
  }

  let sortedTimeline = $derived(
    modelStore.model
      ? [...modelStore.model.timeline].sort((a, b) => a.tick - b.tick)
      : []
  );
</script>

<div class="timeline-view">
  <div class="tl-list">
    <div class="tl-line"></div>

    {#each sortedTimeline as el}
      {@const position = getPosition(el.type)}
      {@const symbol = symbols[el.type]}
      {@const showDetails = hasDetails(el)}

      {#if showDetails}
        <details class="tl-item tl-{position}" open={modelStore.expandAll}>
          <summary class="tl-summary">
            <div class="tl-symbol {el.type}">{symbol}</div>
            <div class="tl-tick">@{el.tick}</div>
            <div class="tl-name {el.type}">{el.name}</div>
          </summary>
          <div class="tl-details">
            {#if isEvent(el)}
              {#if el.producedBy}
                <div class="tl-detail">producedBy: <span class="command">{el.producedBy}</span></div>
              {/if}
              {#if el.externalSource}
                <div class="tl-detail">externalSource: {el.externalSource}</div>
              {/if}
              {#if el.example}
                <JsonDisplay data={el.example} class="tl-json" />
              {/if}
            {:else if isState(el)}
              {#if el.sourcedFrom.length > 0}
                <div class="tl-detail">
                  sourcedFrom: {#each el.sourcedFrom as eventName, i}<span class="event">{eventName}</span>{i < el.sourcedFrom.length - 1 ? ', ' : ''}{/each}
                </div>
              {/if}
              {#if el.example}
                <JsonDisplay data={el.example} class="tl-json" />
              {/if}
            {:else if isActor(el)}
              <div class="tl-detail">
                reads <span class="state">{el.readsView}</span> → triggers <span class="command">{el.sendsCommand}</span>
              </div>
            {:else if isCommand(el)}
              {#if el.example}
                <JsonDisplay data={el.example} class="tl-json" />
              {/if}
            {/if}
          </div>
        </details>
      {:else}
        <div class="tl-item tl-{position}">
          <div class="tl-symbol {el.type}">{symbol}</div>
          <div class="tl-tick">@{el.tick}</div>
          <div class="tl-name {el.type}">{el.name}</div>
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .timeline-view {
    padding: 2rem;
    font-family: var(--font-mono);
  }

  .tl-list {
    position: relative;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    overflow: hidden;
    box-shadow: var(--shadow-card);
  }

  .tl-line {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 122px;
    pointer-events: none;
    z-index: 2;
    background-image:
      /* Hatching for middle lane only */
      repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(107,114,128,0.18) 3px, rgba(107,114,128,0.18) 4px),
      /* Tint for all 3 lanes */
      linear-gradient(rgba(107,114,128,0.05), rgba(107,114,128,0.05)),
      linear-gradient(rgba(107,114,128,0.05), rgba(107,114,128,0.05)),
      linear-gradient(rgba(107,114,128,0.05), rgba(107,114,128,0.05)),
      /* 4 vertical lines */
      linear-gradient(rgba(107,114,128,0.4), rgba(107,114,128,0.4)),
      linear-gradient(rgba(107,114,128,0.4), rgba(107,114,128,0.4)),
      linear-gradient(rgba(107,114,128,0.4), rgba(107,114,128,0.4)),
      linear-gradient(rgba(107,114,128,0.4), rgba(107,114,128,0.4));
    background-position:
      58px 0,
      26px 0, 58px 0, 90px 0,
      24px 0, 56px 0, 88px 0, 120px 0;
    background-size:
      30px 100%,
      30px 100%, 30px 100%, 30px 100%,
      2px 100%, 2px 100%, 2px 100%, 2px 100%;
    background-repeat: no-repeat;
  }

  .tl-item {
    border-bottom: 1px solid var(--border);
    position: relative;
  }

  .tl-item:last-child {
    border-bottom: none;
  }

  /* Non-expandable items */
  div.tl-item {
    display: flex;
    align-items: flex-start;
    padding: 0.75rem 1rem 0.75rem 0;
    gap: 0.75rem;
  }

  div.tl-item:hover {
    background: var(--bg-secondary);
  }

  /* Expandable items */
  details.tl-item > .tl-summary {
    display: flex;
    align-items: flex-start;
    padding: 0.75rem 1rem 0.75rem 0;
    gap: 0.75rem;
    cursor: pointer;
    list-style: none;
  }

  details.tl-item > .tl-summary::-webkit-details-marker {
    display: none;
  }

  details.tl-item > .tl-summary:hover {
    background: var(--bg-secondary);
  }

  details.tl-item > .tl-summary .tl-name::after {
    content: ' ▶';
    font-size: 0.6rem;
    color: var(--text-secondary);
    margin-left: 0.5rem;
    transition: transform 0.2s;
    display: inline-block;
  }

  details.tl-item[open] > .tl-summary .tl-name::after {
    transform: rotate(90deg);
  }

  details.tl-item > .tl-details {
    padding: 0 1rem 0.75rem 0;
    margin-left: 136px;
    padding-left: 4.25rem;
  }

  .tl-symbol {
    width: 136px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    font-size: 1.1rem;
    font-weight: bold;
    flex-shrink: 0;
    position: relative;
    z-index: 3;
  }

  .tl-symbol.event { color: var(--color-event); }
  .tl-symbol.state { color: var(--color-state); }
  .tl-symbol.command { color: var(--color-command); }
  .tl-symbol.actor { color: var(--color-actor); }

  .tl-left .tl-symbol {
    padding-left: 35px;
  }

  .tl-center .tl-symbol {
    padding-left: 67px;
  }

  .tl-right .tl-symbol {
    padding-left: 99px;
  }

  .tl-tick {
    color: var(--text-secondary);
    font-size: 0.85rem;
    flex-shrink: 0;
    width: 3.5rem;
  }

  .tl-name {
    font-weight: 600;
    font-size: 0.95rem;
    margin-bottom: 0.25rem;
  }

  .tl-name.event { color: var(--color-event); }
  .tl-name.state { color: var(--color-state); }
  .tl-name.actor { color: var(--color-actor); }
  .tl-name.command { color: var(--color-command); }

  .tl-details {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .tl-detail {
    margin: 0.125rem 0;
  }

  .tl-detail .event { color: var(--color-event); }
  .tl-detail .state { color: var(--color-state); }
  .tl-detail .actor { color: var(--color-actor); }
  .tl-detail .command { color: var(--color-command); }

  :global(.tl-json) {
    margin-top: 0.5rem;
    font-size: 0.75rem !important;
  }
</style>
