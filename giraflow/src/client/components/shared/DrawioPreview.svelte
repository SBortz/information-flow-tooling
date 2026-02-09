<script lang="ts">
  import type { GiraflowModel } from '../../lib/types';
  import { generateDrawioXml, downloadDrawio } from '../../lib/download-drawio';

  interface Props {
    model: GiraflowModel;
    onClose: () => void;
  }

  let { model, onClose }: Props = $props();

  let viewerError = $state(false);
  let iframeLoaded = $state(false);

  // Generate the XML and create viewer URL
  const xml = $derived(generateDrawioXml(model));
  
  // Create the viewer URL with URL-encoded XML
  // Note: We use a data URL approach for larger diagrams
  const viewerUrl = $derived(() => {
    try {
      // Base64 encode the XML for the viewer
      const base64Xml = btoa(unescape(encodeURIComponent(xml)));
      return `https://viewer.diagrams.net/?highlight=0000ff&edit=_blank&layers=1&nav=1&title=${encodeURIComponent(model.name || 'Giraflow')}.drawio#R${base64Xml}`;
    } catch (e) {
      console.error('Failed to create viewer URL:', e);
      viewerError = true;
      return '';
    }
  });

  function handleDownload() {
    downloadDrawio(model);
  }

  function handleIframeLoad() {
    iframeLoaded = true;
  }

  function handleIframeError() {
    viewerError = true;
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={handleBackdropClick}>
  <div class="modal-container">
    <div class="modal-header">
      <h2>Draw.io Preview: {model.name || 'Giraflow Timeline'}</h2>
      <div class="header-actions">
        <button class="download-button" onclick={handleDownload} title="Download .drawio file">
          <span class="icon">↓</span>
          <span>Download .drawio</span>
        </button>
        <button class="close-button" onclick={onClose} title="Close">
          <span>✕</span>
        </button>
      </div>
    </div>
    
    <div class="modal-content">
      {#if viewerError}
        <div class="error-message">
          <p>⚠️ Could not load Draw.io viewer.</p>
          <p>You can still download the file:</p>
          <button class="download-button large" onclick={handleDownload}>
            <span class="icon">↓</span>
            <span>Download .drawio file</span>
          </button>
        </div>
      {:else}
        {#if !iframeLoaded}
          <div class="loading">
            <div class="spinner"></div>
            <p>Loading Draw.io viewer...</p>
          </div>
        {/if}
        <iframe
          src={viewerUrl()}
          title="Draw.io Preview"
          class="viewer-iframe"
          class:loaded={iframeLoaded}
          onload={handleIframeLoad}
          onerror={handleIframeError}
          sandbox="allow-scripts allow-same-origin"
        ></iframe>
      {/if}
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
  }

  .modal-container {
    width: 90vw;
    height: 85vh;
    max-width: 1400px;
    background: var(--bg-primary, #fff);
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border, #e2e5ea);
    background: var(--bg-secondary, #f8f9fb);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary, #1a1d26);
  }

  .header-actions {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .download-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid var(--color-command, #7aa2f7);
    border-radius: 6px;
    background: var(--color-command, #7aa2f7);
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .download-button:hover {
    background: #5a8fe7;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(122, 162, 247, 0.35);
  }

  .download-button.large {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  }

  .download-button .icon {
    font-size: 1.1rem;
  }

  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: 1px solid var(--border, #e2e5ea);
    border-radius: 6px;
    background: var(--bg-primary, #fff);
    color: var(--text-secondary, #6b7280);
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .close-button:hover {
    border-color: var(--text-tertiary, #9ca3af);
    color: var(--text-primary, #1a1d26);
    background: var(--bg-card, #f5f5f5);
  }

  .modal-content {
    flex: 1;
    position: relative;
    background: #f0f0f0;
    overflow: hidden;
  }

  .viewer-iframe {
    width: 100%;
    height: 100%;
    border: none;
    opacity: 0;
    transition: opacity 0.3s;
  }

  .viewer-iframe.loaded {
    opacity: 1;
  }

  .loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    color: var(--text-secondary, #6b7280);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border, #e2e5ea);
    border-top-color: var(--color-command, #7aa2f7);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-message {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
    color: var(--text-secondary, #6b7280);
  }

  .error-message p {
    margin: 0;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .modal-container {
      width: 100%;
      height: 100%;
      border-radius: 0;
    }

    .modal-header {
      padding: 0.75rem 1rem;
    }

    .modal-header h2 {
      font-size: 0.95rem;
    }

    .download-button {
      padding: 0.4rem 0.75rem;
      font-size: 0.8rem;
    }

    .download-button span:not(.icon) {
      display: none;
    }
  }
</style>
