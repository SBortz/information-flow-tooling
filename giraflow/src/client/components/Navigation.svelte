<script lang="ts">
  import { modelStore } from '../stores/model.svelte';
  import type { ViewMode } from '../lib/types';

  const tabs: { id: ViewMode; label: string }[] = [
    { id: 'timeline', label: 'Timeline' },
    { id: 'slice', label: 'Slices & Scenarios' },
    { id: 'table', label: 'Info' },
    { id: 'editor', label: 'Editor' },
    { id: 'howto', label: 'How-To' },
  ];
</script>

<nav class="tabs">
  {#each tabs as tab}
    <button
      class="tab"
      class:active={modelStore.view === tab.id}
      onclick={() => modelStore.setView(tab.id)}
    >
      {tab.label}
    </button>
  {/each}
</nav>

<style>
  .tabs {
    display: flex;
    align-items: stretch;
    padding: 0 2rem;
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
  }

  .tab {
    padding: 0.75rem 1.25rem;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    font-family: inherit;
    transition: color 0.15s, border-color 0.15s;
    margin-bottom: -1px;
  }

  .tab:hover {
    color: var(--text-primary);
  }

  .tab.active {
    color: var(--color-command);
    border-bottom-color: var(--color-command);
  }

  /* Mobile responsive styles */
  @media (max-width: 900px) {
    .tabs {
      padding: 0 1rem;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .tabs::-webkit-scrollbar {
      display: none;
    }

    .tab {
      padding: 0.6rem 0.75rem;
      font-size: 0.8rem;
      white-space: nowrap;
    }
  }

  @media (max-width: 500px) {
    .tab {
      padding: 0.5rem 0.6rem;
      font-size: 0.75rem;
    }
  }
</style>
