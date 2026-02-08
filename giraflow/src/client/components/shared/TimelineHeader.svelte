<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    count: number;
    totalCount?: number;
    countLabel: string;
    sticky?: boolean;
    children?: Snippet;
  }

  let { count, totalCount, countLabel, sticky = false, children }: Props = $props();
</script>

<header class="timeline-header" class:sticky>
  <h2>Timeline</h2>
  <span class="header-count">{count}{totalCount !== undefined && totalCount !== count ? ` of ${totalCount}` : ''} {countLabel}</span>
  {#if children}
    <div class="header-controls">
      {@render children()}
    </div>
  {/if}
</header>

<style>
  .timeline-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 2rem;
    border-bottom: 1px solid var(--border);
    font-family: var(--font-mono);
    background: var(--bg-primary, #f9fafb);
  }

  .timeline-header.sticky {
    position: sticky;
    top: var(--page-header-height);
    z-index: 20;
  }

  .timeline-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1;
    margin: 0;
  }

  .header-count {
    font-size: 0.85rem;
    line-height: 1;
    color: var(--text-secondary);
  }

  .header-controls {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  /* Shared button styles for controls passed as children */
  .header-controls :global(.ctrl-btn) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border: 1px solid var(--border);
    border-radius: 0.375rem;
    background: var(--bg-card);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s;
  }

  .header-controls :global(.ctrl-btn svg) {
    width: 14px;
    height: 14px;
  }

  .header-controls :global(.ctrl-btn:hover) {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  .header-controls :global(.ctrl-btn.active) {
    background: var(--color-command);
    color: white;
    border-color: var(--color-command);
  }

  /* Grouped toggle styles */
  .header-controls :global(.toggle-group) {
    display: flex;
  }

  .header-controls :global(.toggle-group .ctrl-btn) {
    border-radius: 0;
  }

  .header-controls :global(.toggle-group .ctrl-btn:first-child) {
    border-radius: 0.375rem 0 0 0.375rem;
    border-right: none;
  }

  .header-controls :global(.toggle-group .ctrl-btn:last-child) {
    border-radius: 0 0.375rem 0.375rem 0;
  }

  /* Zoom info text */
  .header-controls :global(.zoom-info) {
    font-size: 0.8rem;
    line-height: 1;
    color: var(--text-secondary);
  }

  /* Hide elements marked mobile-hide on small screens */
  @media (max-width: 900px) {
    .header-controls :global(.mobile-hide) {
      display: none;
    }
  }
</style>
