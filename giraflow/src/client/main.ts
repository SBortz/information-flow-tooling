import { mount } from 'svelte';
import App from './App.svelte';
import { modelStore } from './stores/model.svelte';
import './styles/global.css';

// Fetch model data from API
async function fetchModel() {
  try {
    const res = await fetch('/api/model');
    const data = await res.json();
    modelStore.updateModel(data);
  } catch (e) {
    modelStore.updateModel({
      model: null,
      error: 'Failed to connect to server',
      watchedFile: '',
    });
  }
}

// Connect to SSE for live updates
function connectSSE() {
  const events = new EventSource('/events');

  events.onmessage = (event) => {
    if (event.data === 'reload' || event.data === 'update') {
      fetchModel();
    }
  };

  events.onerror = () => {
    console.log('SSE connection lost, retrying...');
  };
}

// Initialize
modelStore.loadExpandAllFromStorage();
fetchModel();
connectSSE();

// Mount Svelte app
const app = mount(App, { target: document.getElementById('app')! });

export default app;
