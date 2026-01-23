<script lang="ts">
  import { modelStore } from './stores/model.svelte';
  import Header from './components/Header.svelte';
  import Navigation from './components/Navigation.svelte';
  import TimelineView from './components/views/TimelineView.svelte';
  import SliceView from './components/views/SliceView.svelte';
  import TableView from './components/views/TableView.svelte';
</script>

<div class="sticky-header">
  <Header />
  <Navigation />
</div>

<main>
  {#if modelStore.error && !modelStore.model}
    <div class="error">
      <h2>Failed to load model</h2>
      <pre>{modelStore.error}</pre>
    </div>
  {:else if modelStore.model}
    {#if modelStore.view === 'timeline'}
      <TimelineView />
    {:else if modelStore.view === 'slice'}
      <SliceView />
    {:else if modelStore.view === 'table'}
      <TableView />
    {/if}

    {#if modelStore.error}
      <div class="error-banner">
        <span>Error: {modelStore.error}</span>
      </div>
    {/if}
  {:else}
    <div class="loading">Loading...</div>
  {/if}
</main>

<style>
  .sticky-header {
    position: sticky;
    top: 0;
    z-index: 100;
  }

  main {
    min-height: calc(100vh - 120px);
  }

  .error {
    background: var(--bg-card);
    border: 1px solid var(--color-error);
    border-radius: 0.5rem;
    padding: 2rem;
    margin: 2rem;
    text-align: center;
  }

  .error h2 {
    color: var(--color-error);
    margin-bottom: 1rem;
  }

  .error pre {
    background: var(--bg-primary);
    padding: 1rem;
    border-radius: 0.5rem;
    text-align: left;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    overflow-x: auto;
  }

  .error-banner {
    position: fixed;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-error);
    color: var(--bg-primary);
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 50vh;
    color: var(--text-secondary);
  }
</style>
