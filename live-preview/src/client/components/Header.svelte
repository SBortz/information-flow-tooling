<script lang="ts">
  import { modelStore } from '../stores/model.svelte';
</script>

<header class="header">
  <div class="header-left">
    <h1>Information Flow Tooling</h1>
  </div>
  <div class="header-right">
    <span class="status">
      Watching {modelStore.watchedFile}
    </span>
  </div>
</header>

<style>
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
  }

  h1 {
    font-size: 1.1rem;
    font-weight: 600;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--color-success);
  }

  .status::before {
    content: '';
    width: 8px;
    height: 8px;
    background: var(--color-success);
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
</style>
