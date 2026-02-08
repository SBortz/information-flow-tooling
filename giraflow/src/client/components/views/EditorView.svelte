<script lang="ts">
  import { modelStore } from '../../stores/model.svelte';
  import JsonEditor from '../editor/JsonEditor.svelte';
  import { validateJson, type ValidationResult } from '../../lib/validation';
  import { buildSliceViewModel } from '../../lib/models/slice-model';

  let validationResult = $state<ValidationResult>({ valid: true, errors: [] });
  let copyFeedback = $state('');
  let isSaving = $state(false);
  let saveError = $state<string | null>(null);
  let saveSuccess = $state(false);
  let hasUnsavedChanges = $state(false);
  let originalJson = $state('');

  // Initialize editor with current model
  $effect(() => {
    if (!modelStore.rawJson && modelStore.model) {
      // Sync from existing model in local mode
      modelStore.syncRawJsonFromModel();
    }
  });

  // Track original JSON for unsaved changes detection
  $effect(() => {
    if (modelStore.rawJson && !originalJson) {
      originalJson = modelStore.rawJson;
    }
  });

  function handleJsonChange(newJson: string) {
    // Validate first
    validationResult = validateJson(newJson);

    // Always update the raw JSON
    modelStore.loadFromJson(newJson);

    // Track unsaved changes
    hasUnsavedChanges = newJson !== originalJson;
    saveError = null;
    saveSuccess = false;

    // Rebuild slices if model is valid
    if (modelStore.model && validationResult.valid) {
      modelStore.updateSlices(buildSliceViewModel(modelStore.model));
    }
  }

  async function saveModel() {
    if (!hasUnsavedChanges || isSaving || !validationResult.valid) return;

    isSaving = true;
    saveError = null;
    saveSuccess = false;

    try {
      const res = await fetch('/api/model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: modelStore.rawJson,
      });

      if (!res.ok) {
        const data = await res.json();
        saveError = data.error || 'Failed to save';
      } else {
        originalJson = modelStore.rawJson;
        hasUnsavedChanges = false;
        saveSuccess = true;
        setTimeout(() => { saveSuccess = false; }, 2000);
      }
    } catch (e) {
      saveError = e instanceof Error ? e.message : 'Network error';
    } finally {
      isSaving = false;
    }
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(modelStore.rawJson);
      copyFeedback = 'Copied!';
      setTimeout(() => copyFeedback = '', 2000);
    } catch {
      copyFeedback = 'Failed to copy';
      setTimeout(() => copyFeedback = '', 2000);
    }
  }

  function formatJson() {
    try {
      const parsed = JSON.parse(modelStore.rawJson);
      const formatted = JSON.stringify(parsed, null, 2);
      modelStore.loadFromJson(formatted);
      validationResult = validateJson(formatted);
    } catch {
      // JSON is invalid, can't format
    }
  }
</script>

<div class="editor-view">
  <div class="toolbar">
    <div class="toolbar-left">
      {#if !modelStore.isPublicMode}
        <span class="file-info">
          Editing: {modelStore.watchedFile || 'in-memory model'}
        </span>
      {/if}
    </div>

    <div class="toolbar-right">
      {#if !modelStore.isPublicMode}
        <button
          class="btn btn-primary"
          onclick={saveModel}
          disabled={!hasUnsavedChanges || isSaving || !validationResult.valid}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        {#if hasUnsavedChanges}
          <span class="unsaved-indicator">Unsaved changes</span>
        {/if}
        {#if saveError}
          <span class="save-error">{saveError}</span>
        {/if}
        {#if saveSuccess}
          <span class="save-success">Saved!</span>
        {/if}
      {/if}
      <button class="btn" onclick={formatJson} title="Format JSON">
        Format
      </button>
      <button class="btn" onclick={copyToClipboard}>
        {copyFeedback || 'Copy JSON'}
      </button>
    </div>
  </div>

  <div class="editor-wrapper">
    <JsonEditor
      value={modelStore.rawJson}
      onChange={handleJsonChange}
    />
  </div>

  {#if !validationResult.valid || modelStore.jsonError}
    <div class="validation-errors">
      <div class="error-header">Validation Errors</div>
      <div class="error-list">
        {#if modelStore.jsonError}
          <div class="error-item">JSON Parse Error: {modelStore.jsonError}</div>
        {/if}
        {#each validationResult.errors as error}
          <div class="error-item">
            <span class="error-path">{error.path || '/'}</span>
            <span class="error-message">{error.message}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .editor-view {
    display: flex;
    flex-direction: column;
    height: calc(100vh - var(--page-header-height));
    padding: 1rem 2rem;
    gap: 1rem;
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .file-info {
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-family: var(--font-mono);
  }

  .btn {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border);
    border-radius: 0.375rem;
    background: var(--bg-card);
    color: var(--text-primary);
    font-size: 0.875rem;
    font-family: inherit;
    cursor: pointer;
    transition: border-color 0.15s, background-color 0.15s;
  }

  .btn:hover:not(:disabled) {
    border-color: var(--text-tertiary);
    background: var(--bg-secondary);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--color-command, #3b82f6);
    color: white;
    border-color: var(--color-command, #3b82f6);
  }

  .btn-primary:hover:not(:disabled) {
    opacity: 0.9;
    background: var(--color-command, #3b82f6);
    border-color: var(--color-command, #3b82f6);
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

  .editor-wrapper {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .validation-errors {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid var(--color-error);
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    max-height: 150px;
    overflow-y: auto;
  }

  .error-header {
    font-weight: 600;
    color: var(--color-error);
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  .error-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .error-item {
    font-size: 0.8rem;
    font-family: var(--font-mono);
    color: var(--text-secondary);
  }

  .error-path {
    color: var(--color-error);
    margin-right: 0.5rem;
  }

  .error-message {
    color: var(--text-secondary);
  }
</style>
