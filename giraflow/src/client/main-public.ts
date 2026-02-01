import { mount } from 'svelte';
import App from './App.svelte';
import { modelStore } from './stores/model.svelte';
import { getDefaultExample } from './lib/examples';
import { buildSliceViewModel } from './lib/models/slice-model';
import './styles/global.css';

// Set public mode
modelStore.setPublicMode(true);

// Load default example
const defaultExample = getDefaultExample();
modelStore.setCurrentExampleFolder(defaultExample.folderName);
const json = JSON.stringify(defaultExample.model, null, 2);
modelStore.loadFromJson(json);

// Build slices for the default example
if (modelStore.model) {
  modelStore.updateSlices(buildSliceViewModel(modelStore.model));
}

// Set initial view to timeline if no hash
if (!window.location.hash) {
  modelStore.view = 'timeline';
}

// Load expandAll preference from storage
modelStore.loadExpandAllFromStorage();

// Mount Svelte app
const app = mount(App, { target: document.getElementById('app')! });

export default app;
