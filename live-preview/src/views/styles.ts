export const CSS = `
:root {
  --bg-primary: #1a1b26;
  --bg-secondary: #24283b;
  --bg-card: #1f2335;
  --text-primary: #c0caf5;
  --text-secondary: #565f89;
  --border: #3b4261;
  
  --color-event: #ff9e64;
  --color-state: #9ece6a;
  --color-command: #7aa2f7;
  --color-actor: #c0caf5;
  --color-success: #9ece6a;
  --color-error: #f7768e;
  --color-warning: #e0af68;
  
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-sans);
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
  min-height: 100vh;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header h1 {
  font-size: 1.25rem;
  font-weight: 600;
}

.header .meta {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.header .status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-success);
}

.header .status::before {
  content: '';
  width: 8px;
  height: 8px;
  background: var(--color-success);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* View Tabs */
.tabs {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 2rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.tab {
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.tab:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.tab.active {
  background: var(--color-command);
  border-color: var(--color-command);
  color: var(--bg-primary);
}

/* Details Toggle */
.toggle-details {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
  padding: 0.4rem 0.75rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.toggle-details:hover {
  color: var(--text-primary);
  border-color: var(--text-secondary);
}

.toggle-details input {
  accent-color: var(--color-command);
  cursor: pointer;
}

/* Hide details when toggled off */
.hide-details .tl-details,
.hide-details .tl-json,
.hide-details .slice-json,
.hide-details .scenarios {
  display: none;
}

/* Slice View */
.slice-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 2rem;
}

.slice-panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  overflow: hidden;
}

.slice-panel.state {
  border-left: 4px solid var(--color-state);
}

.slice-panel.command {
  border-left: 4px solid var(--color-command);
}

.slice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.slice-header .name {
  font-weight: 600;
  font-size: 1.1rem;
}

.slice-header .tick {
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-family: var(--font-mono);
}

.slice-header .symbol {
  font-size: 1.25rem;
  margin-right: 0.5rem;
}

.slice-header .symbol.state { color: var(--color-state); }
.slice-header .symbol.command { color: var(--color-command); }

.slice-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  padding: 1.5rem;
}

@media (max-width: 900px) {
  .slice-content {
    grid-template-columns: 1fr;
  }
}

.slice-json {
  background: var(--bg-primary);
  border-radius: 0.5rem;
  padding: 1rem;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  overflow-x: auto;
}

.slice-json .key { color: var(--color-command); }
.slice-json .string { color: var(--color-warning); }
.slice-json .number { color: var(--color-event); }
.slice-json .boolean { color: var(--color-state); }

.slice-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-section h4 {
  color: var(--text-secondary);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  padding: 0.25rem 0;
}

.detail-item .event { color: var(--color-event); }
.detail-item .state { color: var(--color-state); }
.detail-item .command { color: var(--color-command); }
.detail-item .actor { color: var(--color-actor); }

.detail-item .tick-ref {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.detail-item .muted-ref {
  color: var(--text-muted);
  opacity: 0.6;
  font-size: 0.8rem;
}

/* Scenarios */
.scenarios {
  grid-column: 1 / -1;
  border-top: 1px solid var(--border);
  padding-top: 1.5rem;
}

.scenarios h3 {
  font-size: 0.875rem;
  color: var(--color-warning);
  margin-bottom: 1rem;
}

.scenario {
  background: var(--bg-primary);
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
  border: 1px solid var(--border);
}

.scenario-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  user-select: none;
  list-style: none;
}

.scenario-header::-webkit-details-marker {
  display: none;
}

.scenario-header::before {
  content: '▶';
  font-size: 0.6rem;
  color: var(--text-secondary);
  transition: transform 0.2s;
  flex-shrink: 0;
}

details.scenario[open] > .scenario-header::before {
  transform: rotate(90deg);
}

.scenario-header:hover {
  background: var(--bg-secondary);
}

.scenario-header .icon { font-size: 1rem; }
.scenario-header .icon.success { color: var(--color-success); }
.scenario-header .icon.failure { color: var(--color-error); }

.scenario-header .name {
  font-weight: 500;
  color: var(--color-warning);
}

.scenario-body {
  padding: 0 1rem 1rem 1rem;
  border-top: 1px solid var(--border);
}

.scenario-step {
  font-size: 0.85rem;
  padding: 0.75rem 0 0.25rem 0;
}

.scenario-step .label {
  color: var(--text-secondary);
  font-weight: 500;
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  display: block;
  margin-bottom: 0.5rem;
}

.scenario-step .step-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.scenario-step .step-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.scenario-step .event {
  color: var(--color-event);
  font-weight: 500;
}

.scenario-step .command {
  color: var(--color-command);
  font-weight: 500;
}

.scenario-json {
  background: var(--bg-secondary);
  padding: 0.75rem;
  border-radius: 0.375rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  overflow-x: auto;
  margin-top: 0.25rem;
  white-space: pre;
}

.scenario-json .key { color: var(--color-command); }
.scenario-json .string { color: var(--color-warning); }
.scenario-json .number { color: var(--color-event); }
.scenario-json .boolean { color: var(--color-state); }

/* Timeline View - CLI Style */
.timeline-view {
  padding: 2rem;
  font-family: var(--font-mono);
}

/* Timeline List with central line */
.tl-list {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  overflow: hidden;
}

/* Two parallel vertical lines creating a "channel" for states/commands */
.tl-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  pointer-events: none;
  z-index: 2;
}

.tl-line::before,
.tl-line::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--text-secondary);
  opacity: 0.4;
}

.tl-line::before {
  left: 24px;  /* Left line */
}

.tl-line::after {
  left: 56px;  /* Right line - channel width 32px, center at 40px */
}

/* Timeline Item */
.tl-item {
  display: flex;
  align-items: flex-start;
  padding: 0.75rem 1rem 0.75rem 0;
  border-bottom: 1px solid var(--border);
  position: relative;
  gap: 0.75rem;
}

.tl-item:last-child {
  border-bottom: none;
}

.tl-item:hover {
  background: var(--bg-secondary);
}

/* Symbol positioning based on element type */
.tl-symbol {
  width: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: bold;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.tl-symbol.event { color: var(--color-event); }
.tl-symbol.state { color: var(--color-state); }
.tl-symbol.command { color: var(--color-command); }
.tl-symbol.actor { color: var(--color-actor); }


/* Position adjustments: events left of channel, state/cmd IN channel, actors right of channel */
/* Left line at 24px, right line at 56px, channel center at 40px */
.tl-left .tl-symbol {
  padding-left: 6px;   /* Event: left of left line */
}

.tl-center .tl-symbol {
  padding-left: 34px;  /* State/Command: center of channel (40px - ~6px half-symbol) */
}

.tl-right .tl-symbol {
  padding-left: 66px;  /* Actor: right of right line */
}

/* Tick */
.tl-tick {
  color: var(--text-secondary);
  font-size: 0.85rem;
  flex-shrink: 0;
  width: 3.5rem;
}

/* Content */
.tl-content {
  flex: 1;
  min-width: 0;
}

.tl-name {
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 0.25rem;
}

.tl-name.event { color: var(--color-event); }
.tl-name.state { color: var(--color-state); }
.tl-name.actor { color: var(--color-actor); }
.tl-name.command { color: var(--color-command); }

/* Details */
.tl-details {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.tl-detail {
  margin: 0.125rem 0;
}

.tl-detail .event { color: var(--color-event); }
.tl-detail .state { color: var(--color-state); }
.tl-detail .actor { color: var(--color-actor); }
.tl-detail .command { color: var(--color-command); }

/* JSON in Timeline */
.tl-json {
  background: var(--bg-primary);
  padding: 0.5rem 0.75rem;
  border-radius: 0.25rem;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  overflow-x: auto;
  white-space: pre;
}

.tl-json .key { color: var(--color-command); }
.tl-json .string { color: var(--color-warning); }
.tl-json .number { color: var(--color-event); }
.tl-json .boolean { color: var(--color-state); }

/* Table View */
.table-view {
  padding: 2rem;
}

.table-section {
  margin-bottom: 2rem;
}

.table-section h2 {
  font-size: 1rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.table-section h2 .symbol { font-size: 1.25rem; }
.table-section h2.events .symbol { color: var(--color-event); }
.table-section h2.states .symbol { color: var(--color-state); }
.table-section h2.commands .symbol { color: var(--color-command); }
.table-section h2.actors .symbol { color: var(--color-actor); }

table {
  width: 100%;
  border-collapse: collapse;
  background: var(--bg-card);
  border-radius: 0.5rem;
  overflow: hidden;
}

th, td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

th {
  background: var(--bg-secondary);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

tr:last-child td {
  border-bottom: none;
}

tr:hover td {
  background: var(--bg-secondary);
}

/* Error State */
.error {
  background: var(--bg-card);
  border: 1px solid var(--color-error);
  border-radius: 0.5rem;
  padding: 2rem;
  margin: 2rem;
  text-align: center;
}

.error h2 {
  color: var(--color-error);
  margin-bottom: 1rem;
}

.error pre {
  background: var(--bg-primary);
  padding: 1rem;
  border-radius: 0.5rem;
  text-align: left;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  overflow-x: auto;
}
`;
