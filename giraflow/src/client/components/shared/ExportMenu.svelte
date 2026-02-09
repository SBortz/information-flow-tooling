<script lang="ts">
  import { downloadProjectZip } from '../../lib/download-zip';
  import { downloadPptx, type PptxOrientation } from '../../lib/download-pptx';
  import { downloadSvg, type SvgOrientation } from '../../lib/download-svg';
  import type { GiraflowModel } from '../../../../shared/types';

  interface Props {
    model: GiraflowModel;
    rawJson: string;
    editedWireframes: Map<string, string>;
    currentExampleFolder: string | null;
    onDrawioExport: () => void;
  }

  let { model, rawJson, editedWireframes, currentExampleFolder, onDrawioExport }: Props = $props();

  let isOpen = $state(false);
  let menuRef: HTMLDivElement | undefined = $state();

  function toggle() {
    isOpen = !isOpen;
  }

  function closeMenu() {
    isOpen = false;
  }

  async function handleZip() {
    await downloadProjectZip(model, rawJson, editedWireframes, currentExampleFolder);
    closeMenu();
  }

  async function handlePptx(orientation: PptxOrientation) {
    await downloadPptx(model, orientation);
    closeMenu();
  }

  function handleSvg(orientation: SvgOrientation) {
    downloadSvg(model, orientation);
    closeMenu();
  }

  function handleDrawio() {
    onDrawioExport();
    closeMenu();
  }

  // Close on click outside
  function handleClickOutside(event: MouseEvent) {
    if (menuRef && !menuRef.contains(event.target as Node)) {
      closeMenu();
    }
  }

  $effect(() => {
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  });
</script>

<div class="export-menu" bind:this={menuRef}>
  <button class="export-button" onclick={toggle} title="Export options">
    <span class="icon">↓</span>
    <span class="label">Export</span>
    <span class="chevron" class:open={isOpen}>▾</span>
  </button>

  {#if isOpen}
    <div class="dropdown">
      <div class="dropdown-section">
        <button class="dropdown-item" onclick={handleZip}>
          <span class="item-icon">📦</span>
          <span class="item-label">ZIP</span>
          <span class="item-desc">HTML Wireframes</span>
        </button>
      </div>

      <div class="dropdown-divider"></div>

      <div class="dropdown-section">
        <div class="section-header">📊 PowerPoint</div>
        <div class="dropdown-row">
          <button class="dropdown-item compact" onclick={() => handlePptx('horizontal')}>
            <span class="item-icon">→</span>
            <span class="item-label">Horizontal</span>
          </button>
          <button class="dropdown-item compact" onclick={() => handlePptx('vertical')}>
            <span class="item-icon">↓</span>
            <span class="item-label">Vertikal</span>
          </button>
        </div>
      </div>

      <div class="dropdown-divider"></div>

      <div class="dropdown-section">
        <div class="section-header">◇ SVG</div>
        <div class="dropdown-row">
          <button class="dropdown-item compact" onclick={() => handleSvg('horizontal')}>
            <span class="item-icon">→</span>
            <span class="item-label">Horizontal</span>
          </button>
          <button class="dropdown-item compact" onclick={() => handleSvg('vertical')}>
            <span class="item-icon">↓</span>
            <span class="item-label">Vertikal</span>
          </button>
        </div>
      </div>

      <div class="dropdown-divider"></div>

      <div class="dropdown-section">
        <button class="dropdown-item" onclick={handleDrawio}>
          <span class="item-icon">⬡</span>
          <span class="item-label">Draw.io</span>
          <span class="item-desc">Preview & Download</span>
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .export-menu {
    position: relative;
  }

  .export-button {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    height: 2rem;
    padding: 0 0.75rem;
    border: 1px solid var(--border);
    border-radius: 0.375rem;
    background: var(--bg-primary);
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    box-shadow: var(--shadow-card);
    transition: all 0.15s;
  }

  .export-button:hover {
    border-color: var(--color-command);
    color: var(--color-command);
    background: var(--bg-card);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(122, 162, 247, 0.25);
  }

  .export-button .icon {
    font-size: 1rem;
  }

  .export-button .chevron {
    font-size: 0.7rem;
    transition: transform 0.15s;
  }

  .export-button .chevron.open {
    transform: rotate(180deg);
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    min-width: 220px;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    z-index: 100;
    overflow: hidden;
  }

  .dropdown-section {
    padding: 0.5rem;
  }

  .section-header {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-tertiary);
    padding: 0.25rem 0.5rem;
    margin-bottom: 0.25rem;
  }

  .dropdown-divider {
    height: 1px;
    background: var(--border);
  }

  .dropdown-row {
    display: flex;
    gap: 0.25rem;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: var(--text-primary);
    font-size: 0.8rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.1s;
  }

  .dropdown-item:hover {
    background: var(--bg-secondary);
    color: var(--color-command);
  }

  .dropdown-item.compact {
    flex: 1;
    justify-content: center;
    padding: 0.4rem 0.5rem;
    font-size: 0.75rem;
    border: 1px solid var(--border);
  }

  .dropdown-item.compact:hover {
    border-color: var(--color-command);
  }

  .item-icon {
    font-size: 0.9rem;
    width: 1.2rem;
    text-align: center;
  }

  .item-label {
    font-weight: 500;
  }

  .item-desc {
    margin-left: auto;
    font-size: 0.7rem;
    color: var(--text-tertiary);
  }

  /* Mobile */
  @media (max-width: 900px) {
    .export-button {
      padding: 0 0.5rem;
      height: 1.75rem;
    }

    .export-button .label {
      display: none;
    }

    .dropdown {
      min-width: 200px;
    }
  }
</style>
