<script lang="ts">
  import { modelStore } from '../stores/model.svelte';
  import { examples, getEmptyTemplate } from '../lib/examples';
  import { buildSliceViewModel } from '../lib/models/slice-model';
  import { downloadProjectZip } from '../lib/download-zip';

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

    const newModel = {
      ...template.model,
      name,
      description: '',
    };

    const sessionId = `session-${Date.now()}`;
    const json = JSON.stringify(newModel, null, 2);

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
      await modelStore.selectFile(result.fileName);
    } else if (result.error) {
      alert(`Error: ${result.error}`);
    }
  }

  async function handleDownload() {
    if (!modelStore.model) return;
    await downloadProjectZip(
      modelStore.model,
      modelStore.rawJson,
      modelStore.editedWireframes,
      modelStore.currentExampleFolder
    );
  }
</script>

<header class="header">
  <div class="header-left">
    <img src="/logo.svg" alt="Giraflow" class="logo" />
  </div>
  <div class="header-right">
    {#if modelStore.isPublicMode}
      <div class="file-selector">
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
        <button class="icon-button" onclick={handleCreateNew} title="Create new Giraflow">+</button>
        <button class="icon-button" onclick={handleDownload} title="Download as ZIP">⬇</button>
      </div>
    {:else}
      <div class="file-selector">
        {#if modelStore.availableFiles.length > 1}
          <select
            id="file-select"
            value={modelStore.watchedFile}
            onchange={handleFileSelect}
          >
            {#each modelStore.availableFiles as file}
              <option value={file}>{file.replace('.giraflow.json', '')}</option>
            {/each}
          </select>
        {:else}
          <span class="status">
            Watching {modelStore.watchedFile}
          </span>
        {/if}
        <button class="icon-button" onclick={handleCreateNew} title="Create new Giraflow">+</button>
      </div>
    {/if}
  </div>
</header>

<style>
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 2rem;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
  }

  .logo {
    width: 150px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .file-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
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

  .icon-button {
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

  .icon-button:hover {
    border-color: var(--color-command);
    color: var(--color-command);
    background: var(--bg-card);
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

  /* Mobile responsive styles */
  @media (max-width: 900px) {
    .header {
      padding: 0.5rem 1rem;
    }

    .logo {
      width: 120px;
    }

    .status {
      font-size: 0.7rem;
    }

    .file-selector select {
      max-width: 150px;
    }
  }

  @media (max-width: 500px) {
    .logo {
      width: 100px;
    }

    .file-selector select {
      max-width: 120px;
    }
  }
</style>
