<script lang="ts">
  import { modelStore } from '../stores/model.svelte';
  import type { ViewMode } from '../lib/types';

  const tabs: { id: ViewMode; label: string }[] = [
    { id: 'table', label: 'Info' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'slice', label: 'Slices & Scenarios' },
  ];

  function handleExpandAllChange(event: Event) {
    const target = event.target as HTMLInputElement;
    modelStore.setExpandAll(target.checked);
  }
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

  <label class="toggle-expand">
    <input
      type="checkbox"
      checked={modelStore.expandAll}
      onchange={handleExpandAllChange}
    />
    Expand All
  </label>
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

  .toggle-expand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: auto;
    align-self: center;
    padding: 0.35rem 0.7rem;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.75rem;
    color: var(--text-secondary);
    transition: all 0.15s;
  }

  .toggle-expand:hover {
    color: var(--text-primary);
    border-color: var(--text-secondary);
  }

  .toggle-expand input {
    accent-color: var(--color-command);
    cursor: pointer;
  }
</style>
