import { mount } from 'svelte';
import App from './App.svelte';
import { modelStore, triggerWireframeReload } from './stores/model.svelte';
import './styles/global.css';

// Fetch model data from API
async function fetchModel() {
  try {
    const res = await fetch('/api/model');
    const data = await res.json();
    modelStore.updateModel(data);
    // Sync raw JSON for editor view
    modelStore.syncRawJsonFromModel();
  } catch (e) {
    modelStore.updateModel({
      model: null,
      error: 'Failed to connect to server',
      watchedFile: '',
    });
  }
}

// Fetch slices from API
async function fetchSlices() {
  try {
    const res = await fetch('/api/slices');
    const data = await res.json();
    modelStore.updateSlices(data);
  } catch (e) {
    modelStore.updateSlices(null);
  }
}

// Fetch both model and slices
async function fetchAll() {
  await Promise.all([fetchModel(), fetchSlices()]);
}

// Connect to SSE for live updates
function connectSSE() {
  const events = new EventSource('/events');

  events.onmessage = (event) => {
    if (event.data === 'reload' || event.data === 'update') {
      fetchAll();
    } else if (event.data === 'wireframe-reload') {
      // Also fetch model to handle case where wireframes were added to actors
      fetchAll();
      triggerWireframeReload();
    }
  };

  events.onerror = () => {
    console.log('SSE connection lost, retrying...');
  };
}

// Initialize
modelStore.loadExpandAllFromStorage();
fetchAll();
connectSSE();

// Mount Svelte app
const app = mount(App, { target: document.getElementById('app')! });

export default app;
