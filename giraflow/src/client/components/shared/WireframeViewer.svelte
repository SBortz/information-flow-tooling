<script lang="ts">
  import { onDestroy } from "svelte";
  import { wireframeReloadSignal, modelStore } from "../../stores/model.svelte";
  import hljs from "highlight.js/lib/core";
  import xml from "highlight.js/lib/languages/xml";
  import HtmlEditor from "../editor/HtmlEditor.svelte";

  // Register HTML/XML language
  hljs.registerLanguage("xml", xml);

  interface Props {
    src: string;
    title?: string;
  }
  let { src, title = "Wireframe" }: Props = $props();

  let showCode = $state(false);
  let code = $state("");
  let editedCode = $state("");
  let highlightedCode = $state("");
  let loading = $state(false);
  let hasUnsavedChanges = $state(false);
  let isSaving = $state(false);
  let saveError = $state<string | null>(null);
  let saveSuccess = $state(false);
  let blobUrl = $state<string | null>(null);

  // Extract filename for display
  let displayFilename = $derived(src.split("/").pop() || src);

  // Check if the file is an image
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
  let isImage = $derived(
    imageExtensions.some(ext => src.toLowerCase().endsWith(ext))
  );

  // Extract relative path within wireframes folder (for API calls)
  // src is like "/wireframes/subdir/file.html" - we need "subdir/file.html"
  let relativePath = $derived(
    src.startsWith("/wireframes/") ? src.slice("/wireframes/".length) : src.split("/").pop() || src
  );

  // Add cache-buster query param to force fresh load
  let cacheBustedSrc = $derived(
    wireframeReloadSignal.value > 0
      ? `${src}${src.includes("?") ? "&" : "?"}_t=${wireframeReloadSignal.value}`
      : src,
  );

  async function loadCode() {
    if (code && wireframeReloadSignal.value === 0) return;
    loading = true;
    try {
      const res = await fetch(cacheBustedSrc);
      code = await res.text();
      editedCode = code;
      hasUnsavedChanges = false;
      highlightedCode = hljs.highlight(code, { language: "xml" }).value;
    } catch (e) {
      code = "// Failed to load source";
      editedCode = code;
      highlightedCode = code;
    }
    loading = false;
  }

  function handleCodeChange(newCode: string) {
    editedCode = newCode;
    hasUnsavedChanges = editedCode !== code;
    saveError = null;
    saveSuccess = false;
  }

  async function saveWireframe() {
    if (!hasUnsavedChanges || isSaving) return;

    if (modelStore.isPublicMode) {
      // Session-only: store in memory and create blob URL for preview
      modelStore.setEditedWireframe(src, editedCode);
      code = editedCode;
      hasUnsavedChanges = false;
      saveSuccess = true;

      // Create blob URL for preview
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      const blob = new Blob([editedCode], { type: 'text/html' });
      blobUrl = URL.createObjectURL(blob);

      setTimeout(() => { saveSuccess = false; }, 2000);
      return;
    }

    isSaving = true;
    saveError = null;
    saveSuccess = false;

    try {
      const res = await fetch('/api/wireframe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: relativePath, content: editedCode }),
      });

      if (!res.ok) {
        const data = await res.json();
        saveError = data.error || 'Failed to save';
      } else {
        code = editedCode;
        hasUnsavedChanges = false;
        saveSuccess = true;
        // Clear success message after 2 seconds
        setTimeout(() => { saveSuccess = false; }, 2000);
      }
    } catch (e) {
      saveError = e instanceof Error ? e.message : 'Network error';
    } finally {
      isSaving = false;
    }
  }

  // Reload code when wireframe changes
  $effect(() => {
    if (wireframeReloadSignal.value > 0 && showCode) {
      loadCode();
    }
  });

  // Initialize blob URL from stored edits in public mode
  $effect(() => {
    if (modelStore.isPublicMode) {
      const edited = modelStore.getEditedWireframe(src);
      if (edited && !blobUrl) {
        const blob = new Blob([edited], { type: 'text/html' });
        blobUrl = URL.createObjectURL(blob);
        // Also sync the code state
        code = edited;
        editedCode = edited;
      }
    }
  });

  // Cleanup blob URL on destroy
  onDestroy(() => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  });
</script>

<div class="wireframe-container">
  <div class="wireframe-header">
    <div class="wireframe-label">
      <span class="wireframe-filename">{displayFilename}</span>
    </div>
    {#if !isImage}
      <label class="toggle-switch">
        <span class="toggle-label">Preview</span>
        <input
          type="checkbox"
          bind:checked={showCode}
          onchange={() => showCode && !code && loadCode()}
        />
        <span class="toggle-slider"></span>
        <span class="toggle-label">Code</span>
      </label>
    {/if}
  </div>

  {#if isImage}
    <div class="wireframe-image">
      {#key cacheBustedSrc}
        <img src={cacheBustedSrc} alt={title} />
      {/key}
    </div>
  {:else if showCode}
    <div class="code-view">
      {#if loading}
        <span class="loading">Loading...</span>
      {:else}
        <div class="code-toolbar">
          <button
            class="save-button"
            onclick={saveWireframe}
            disabled={!hasUnsavedChanges || isSaving}
          >
            {#if isSaving}
              Saving...
            {:else if modelStore.isPublicMode}
              Apply
            {:else}
              Save
            {/if}
          </button>
          {#if hasUnsavedChanges}
            <span class="unsaved-indicator">Unsaved changes</span>
          {/if}
          {#if saveError}
            <span class="save-error">{saveError}</span>
          {/if}
          {#if saveSuccess}
            <span class="save-success">{modelStore.isPublicMode ? 'Applied!' : 'Saved!'}</span>
          {/if}
          <span class="save-hint">
            {modelStore.isPublicMode ? 'Ctrl+S to apply (session only)' : 'Ctrl+S to save'}
          </span>
        </div>
        <div class="editor-wrapper">
          <HtmlEditor value={editedCode} onChange={handleCodeChange} onSave={saveWireframe} />
        </div>
      {/if}
    </div>
  {:else}
    {#key blobUrl || cacheBustedSrc}
      <iframe {title} src={blobUrl || cacheBustedSrc} class="wireframe-iframe"></iframe>
    {/key}
  {/if}
</div>

<style>
  .wireframe-container {
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    overflow: hidden;
    background: white;
  }

  .wireframe-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    background: var(--bg-secondary, #f5f5f5);
    border-bottom: 1px solid var(--border);
  }

  .wireframe-label {
    display: flex;
    align-items: center;
    font-size: 0.8rem;
    color: var(--text-secondary, #666);
  }

  .wireframe-filename {
    font-family: var(--font-mono, monospace);
    font-weight: 500;
  }

  .toggle-switch {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.75rem;
  }

  .toggle-label {
    color: var(--text-secondary, #666);
  }

  .toggle-switch input {
    display: none;
  }

  .toggle-slider {
    position: relative;
    width: 36px;
    height: 20px;
    background: var(--border, #ddd);
    border-radius: 10px;
    transition: background 0.2s;
  }

  .toggle-slider::after {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    transition: transform 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .toggle-switch input:checked + .toggle-slider {
    background: var(--color-command, #3b82f6);
  }

  .toggle-switch input:checked + .toggle-slider::after {
    transform: translateX(16px);
  }

  .wireframe-iframe {
    width: 100%;
    height: 800px;
    border: none;
    display: block;
  }

  .wireframe-image {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 1rem;
    background: var(--bg-secondary, #f9f9f9);
    min-height: 200px;
    max-height: 800px;
    overflow: auto;
  }

  .wireframe-image img {
    max-width: 100%;
    height: auto;
    border-radius: 0.25rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .code-view {
    height: 800px;
    overflow: auto;
    background: var(--bg-card, #fafafa);
    border-top: 1px solid var(--border, #eee);
    display: flex;
    flex-direction: column;
  }

  .code-toolbar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: var(--bg-secondary, #f0f0f0);
    border-bottom: 1px solid var(--border, #ddd);
    flex-shrink: 0;
  }

  .save-button {
    padding: 0.35rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 500;
    border: 1px solid var(--border, #ccc);
    border-radius: 4px;
    background: var(--color-command, #3b82f6);
    color: white;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .save-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .save-button:not(:disabled):hover {
    opacity: 0.9;
  }

  .unsaved-indicator {
    font-size: 0.75rem;
    color: var(--color-event, #f59e0b);
    font-weight: 500;
  }

  .save-error {
    font-size: 0.75rem;
    color: #dc2626;
    font-weight: 500;
  }

  .save-success {
    font-size: 0.75rem;
    color: #16a34a;
    font-weight: 500;
  }

  .save-hint {
    font-size: 0.7rem;
    color: var(--text-tertiary, #999);
    margin-left: auto;
  }

  .editor-wrapper {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .code-view pre {
    margin: 0;
    padding: 1rem;
  }

  .code-view code {
    font-family: var(--font-mono, monospace);
    font-size: 0.8rem;
    color: var(--text-primary, #333);
    white-space: pre;
  }

  .loading {
    display: block;
    padding: 1rem;
    color: var(--text-secondary);
  }

  /* highlight.js GitHub-style theme */
  .code-view :global(.hljs-tag) {
    color: #22863a;
  }
  .code-view :global(.hljs-name) {
    color: #22863a;
  }
  .code-view :global(.hljs-attr) {
    color: #6f42c1;
  }
  .code-view :global(.hljs-string) {
    color: #032f62;
  }
  .code-view :global(.hljs-comment) {
    color: #6a737d;
    font-style: italic;
  }
  .code-view :global(.hljs-doctag) {
    color: #6a737d;
  }
  .code-view :global(.hljs-keyword) {
    color: #d73a49;
  }
  .code-view :global(.hljs-meta) {
    color: #6a737d;
  }
</style>
