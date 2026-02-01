import { mount } from 'svelte';
import App from './App.svelte';
import { modelStore } from './stores/model.svelte';
import { getDefaultExample, getExampleById } from './lib/examples';
import { buildSliceViewModel } from './lib/models/slice-model';
import './styles/global.css';

// Set public mode
modelStore.setPublicMode(true);

// Try to load session from localStorage
const sessionLoaded = modelStore.loadPublicSession();

if (sessionLoaded) {
  // Validate that the example still exists
  const example = getExampleById(modelStore.selectedExampleId);
  if (!example) {
    // Example no longer exists, clear session and load default
    modelStore.clearPublicSession();
    loadDefaultExample();
  } else {
    // Build slices for the restored model
    if (modelStore.model) {
      modelStore.updateSlices(buildSliceViewModel(modelStore.model));
    }
  }
} else {
  // No session found, load default example
  loadDefaultExample();
}

function loadDefaultExample() {
  const defaultExample = getDefaultExample();
  modelStore.selectedExampleId = defaultExample.id;
  modelStore.setCurrentExampleFolder(defaultExample.folderName);
  const json = JSON.stringify(defaultExample.model, null, 2);
  modelStore.loadFromJson(json);

  // Build slices for the default example
  if (modelStore.model) {
    modelStore.updateSlices(buildSliceViewModel(modelStore.model));
  }
}

// Set initial view to timeline if no hash (and no session restored view)
if (!window.location.hash && !sessionLoaded) {
  modelStore.view = 'timeline';
}

// Load expandAll preference from storage
modelStore.loadExpandAllFromStorage();

// Mount Svelte app
const app = mount(App, { target: document.getElementById('app')! });

export default app;
