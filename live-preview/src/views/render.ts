import { CSS } from './styles.js';
import { InformationFlowModel, ViewMode } from '../types.js';
import { escapeHtml } from './utils.js';
import { renderSliceView } from './sliceView.js';
import { renderTimelineView } from './timelineView.js';
import { renderTableView } from './tableView.js';

export function renderHtml(model: InformationFlowModel, view: ViewMode, error?: string, watchedFile?: string): string {
  const viewContent = error
    ? `<div class="error"><h2>Error</h2><pre>${escapeHtml(error)}</pre></div>`
    : view === 'slice' ? renderSliceView(model)
    : view === 'timeline' ? renderTimelineView(model)
    : renderTableView(model);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(model.name)} - Information Flow Live Preview</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>${CSS}</style>
</head>
<body>
  <header class="header">
    <div>
      <h1>${escapeHtml(model.name)}</h1>
      ${model.description ? `<p class="meta">${escapeHtml(model.description)}</p>` : ''}
    </div>
    <div>
      ${model.version ? `<span class="meta">v${escapeHtml(model.version)}</span>` : ''}
      <span class="status">Watching ${watchedFile ? `${escapeHtml(watchedFile)}` : ''}</span>
    </div>
  </header>

  <nav class="tabs">
    <button class="tab ${view === 'timeline' ? 'active' : ''}" onclick="setView('timeline')">Timeline</button>
    <button class="tab ${view === 'slice' ? 'active' : ''}" onclick="setView('slice')">Slices & Scenarios</button>
    <button class="tab ${view === 'table' ? 'active' : ''}" onclick="setView('table')">Consolidated</button>

    <label class="toggle-expand">
      <input type="checkbox" id="expandAll" onchange="toggleExpandAll(this.checked)">
      <span>Expand All</span>
    </label>
  </nav>

  <main>
    ${viewContent}
  </main>

  <script>
    // Live reload via Server-Sent Events
    const events = new EventSource('/events');
    events.onmessage = () => location.reload();
    events.onerror = () => console.log('SSE connection lost, retrying...');

    // View switching
    function setView(view) {
      const url = new URL(window.location);
      url.searchParams.set('view', view);
      window.location = url;
    }

    // Toggle expand all details elements
    function toggleExpandAll(expand) {
      document.querySelectorAll('details').forEach(el => {
        el.open = expand;
      });
      localStorage.setItem('expandAll', expand);
    }

    // Restore expand preference
    const savedExpand = localStorage.getItem('expandAll');
    if (savedExpand === 'true') {
      document.getElementById('expandAll').checked = true;
      toggleExpandAll(true);
    }
  </script>
</body>
</html>`;
}
