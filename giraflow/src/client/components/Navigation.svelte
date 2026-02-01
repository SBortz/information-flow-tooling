<script lang="ts">
  import { modelStore } from '../stores/model.svelte';
  import type { ViewMode } from '../lib/types';
  import { examples, getEmptyTemplate, type Example } from '../lib/examples';
  import { buildSliceViewModel } from '../lib/models/slice-model';

  const tabs: { id: ViewMode; label: string }[] = [
    { id: 'timeline', label: 'Timeline' },
    { id: 'slice', label: 'Slices & Scenarios' },
    { id: 'table', label: 'Info' },
    { id: 'editor', label: 'Editor' },
    { id: 'howto', label: 'How-To' },
  ];

  function handleExampleSelect(e: Event) {
    const select = e.currentTarget as HTMLSelectElement;
    const selectedId = select.value;

    // Check if it's a session-based giraflow
    if (selectedId.startsWith('session-')) {
      const sessionGiraflow = modelStore.getSessionGiraflow(selectedId);
      if (sessionGiraflow) {
        modelStore.selectedExampleId = sessionGiraflow.id;
        modelStore.editedWireframes = new Map(Object.entries(sessionGiraflow.editedWireframes));
        modelStore.setCurrentExampleFolder(null);
        modelStore.loadFromJson(sessionGiraflow.rawJson);
        if (modelStore.model) {
          modelStore.updateSlices(buildSliceViewModel(modelStore.model));
        }
      }
      return;
    }

    // It's a regular example
    const example = examples.find(ex => ex.id === selectedId);
    if (example) {
      modelStore.selectedExampleId = example.id;
      modelStore.clearAllEditedWireframes();
      modelStore.setCurrentExampleFolder(example.folderName);
      const json = JSON.stringify(example.model, null, 2);
      modelStore.loadFromJson(json);
      if (modelStore.model) {
        modelStore.updateSlices(buildSliceViewModel(modelStore.model));
      }
      // loadFromJson already saves the session
    }
  }

  function handleFileSelect(e: Event) {
    const select = e.currentTarget as HTMLSelectElement;
    modelStore.selectFile(select.value);
  }

  function handleCreateNew() {
    if (modelStore.isPublicMode) {
      createNewPublic();
    } else {
      createNewLocal();
    }
  }

  function createNewPublic() {
    const name = prompt('Name for the new Giraflow:');
    if (!name) return;

    const template = getEmptyTemplate();
    if (!template) return;

    // Create a new model based on empty template
    const newModel = {
      ...template.model,
      name,
      description: '',
    };

    // Use a unique session ID (not a real example)
    const sessionId = `session-${Date.now()}`;
    const json = JSON.stringify(newModel, null, 2);

    // Add to session giraflows list
    modelStore.addOrUpdateSessionGiraflow(sessionId, name, json, new Map());

    modelStore.selectedExampleId = sessionId;
    modelStore.clearAllEditedWireframes();
    modelStore.setCurrentExampleFolder(null);
    modelStore.loadFromJson(json);
    if (modelStore.model) {
      modelStore.updateSlices(buildSliceViewModel(modelStore.model));
    }
  }

  async function createNewLocal() {
    const name = prompt('Name for the new Giraflow:');
    if (!name) return;

    const result = await modelStore.createNewFile(name);
    if (result.success && result.fileName) {
      // Select the new file
      await modelStore.selectFile(result.fileName);
    } else if (result.error) {
      alert(`Error: ${result.error}`);
    }
  }
</script>

<nav class="tabs">
  <div class="tabs-left">
    {#each tabs as tab}
      <button
        class="tab"
        class:active={modelStore.view === tab.id}
        onclick={() => modelStore.setView(tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  {#if modelStore.isPublicMode}
    <div class="example-selector">
      <label for="example-select">Example:</label>
      <select
        id="example-select"
        value={modelStore.selectedExampleId}
        onchange={handleExampleSelect}
      >
        {#each modelStore.sessionGiraflows as session}
          <option value={session.id}>{session.name}</option>
        {/each}
        {#if modelStore.sessionGiraflows.length > 0}
          <option disabled>──────────</option>
        {/if}
        {#each examples as example}
          <option value={example.id}>{example.name}</option>
        {/each}
      </select>
      <button class="add-button" onclick={handleCreateNew} title="Create new Giraflow">+</button>
    </div>
  {:else}
    <div class="file-selector">
      {#if modelStore.availableFiles.length > 1}
        <label for="file-select">File:</label>
        <select
          id="file-select"
          value={modelStore.watchedFile}
          onchange={handleFileSelect}
        >
          {#each modelStore.availableFiles as file}
            <option value={file}>{file.replace('.giraflow.json', '')}</option>
          {/each}
        </select>
      {/if}
      <button class="add-button" onclick={handleCreateNew} title="Create new Giraflow">+</button>
    </div>
  {/if}
</nav>

<style>
  .tabs {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    padding: 0 2rem;
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
  }

  .tabs-left {
    display: flex;
    align-items: stretch;
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

  .example-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0;
  }

  .example-selector label {
    font-size: 0.8rem;
    color: var(--text-tertiary);
  }

  .example-selector select {
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 0.25rem;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.8rem;
    font-family: inherit;
    cursor: pointer;
  }

  .example-selector select:hover {
    border-color: var(--text-tertiary);
  }

  .example-selector select:focus {
    outline: none;
    border-color: var(--color-command);
  }

  .add-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 0.25rem;
    background: var(--bg-primary);
    color: var(--text-secondary);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .add-button:hover {
    border-color: var(--color-command);
    color: var(--color-command);
    background: var(--bg-card);
  }

  .file-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0;
  }

  .file-selector label {
    font-size: 0.8rem;
    color: var(--text-tertiary);
  }

  .file-selector select {
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 0.25rem;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.8rem;
    font-family: inherit;
    cursor: pointer;
  }

  .file-selector select:hover {
    border-color: var(--text-tertiary);
  }

  .file-selector select:focus {
    outline: none;
    border-color: var(--color-command);
  }
</style>
