<script lang="ts">
  import type { CommandScenario, StateViewScenario, TimelineScenario } from '../../lib/types';
  import { modelStore } from '../../stores/model.svelte';
  import JsonDisplay from './JsonDisplay.svelte';

  interface Props {
    scenario: CommandScenario | StateViewScenario | TimelineScenario;
    type: 'command' | 'state';
    sliceName?: string;
  }

  let { scenario, type, sliceName }: Props = $props();

  // Timeline scenario uses 'rows' with command.name/data and producedEvents
  function isTimelineScenario(s: CommandScenario | StateViewScenario | TimelineScenario): s is TimelineScenario {
    return 'rows' in s && Array.isArray(s.rows);
  }

  // Explicit command scenarios use 'steps' with type/when/produces
  function isCommandStepsScenario(s: CommandScenario | StateViewScenario | TimelineScenario): s is CommandScenario {
    return 'steps' in s && Array.isArray(s.steps) && s.steps.length > 0 && 'type' in s.steps[0];
  }

  // State view scenarios use 'steps' with given/then structure
  function isStateViewScenario(s: CommandScenario | StateViewScenario | TimelineScenario): s is StateViewScenario {
    return 'steps' in s && Array.isArray(s.steps) && s.steps.length > 0 && 'given' in s.steps[0];
  }

  let timelineScenario = $derived(isTimelineScenario(scenario) ? scenario : null);
  let commandStepsScenario = $derived(isCommandStepsScenario(scenario) ? scenario : null);
  let stateScenario = $derived(isStateViewScenario(scenario) ? scenario : null);

  // Check if any step has a failure
  let isSuccess = $derived(() => {
    if (commandStepsScenario) {
      return !commandStepsScenario.steps.some(step => step.type === 'command' && step.fails);
    }
    if (timelineScenario) {
      return !timelineScenario.rows.some(row => row.type === 'command' && row.fails);
    }
    return true;
  });
</script>

<details class="scenario" open={modelStore.expandAll}>
  <summary class="scenario-header">
    <span class="icon" class:success={isSuccess()} class:failure={!isSuccess()}>
      {isSuccess() ? '✓' : '✗'}
    </span>
    <span class="name">{scenario.name}</span>
  </summary>

  <div class="scenario-body">
    <!-- STEPS (for state scenarios) -->
    {#if stateScenario}
      <div class="scenario-step">
        <span class="label">Steps</span>
        <div class="steps-grid">
          {#each stateScenario.steps as step}
            <div class="step-row">
              <div class="event-column">
                <span class="event">● {step.given.event}</span>
                {#if step.given.data}
                  <JsonDisplay data={step.given.data} class="scenario-json" />
                {/if}
              </div>
              <div class="arrow">→</div>
              <div class="state-column">
                <JsonDisplay data={step.then} class="scenario-json" />
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- STEPS (for timeline scenarios - chronological timeline with command.name/data) -->
    {#if timelineScenario}
      <div class="scenario-step">
        <span class="label">Steps</span>
        <div class="timeline-scenario">
          {#each timelineScenario.rows as row}
            <div class="timeline-row">
              <!-- Left column: Command (or empty) -->
              <div class="command-column">
                {#if row.type === 'command' && row.command}
                  <span class="command">▶ {row.command.name}</span>
                  {#if row.command.data}
                    <JsonDisplay data={row.command.data} class="scenario-json" />
                  {/if}
                {/if}
              </div>

              <!-- Right column: Events -->
              <div class="events-column">
                {#if row.type === 'events-only' && row.events}
                  <!-- Context events (no border) -->
                  {#each row.events as eventRef}
                    <div class="event-item">
                      <span class="event">● {eventRef.event}</span>
                      {#if eventRef.data}
                        <JsonDisplay data={eventRef.data} class="scenario-json" />
                      {/if}
                    </div>
                  {/each}
                {:else if row.type === 'command'}
                  {#if row.fails}
                    <div class="produced-box failure">
                      <span class="error">✗ {row.fails}</span>
                    </div>
                  {:else if row.producedEvents && row.producedEvents.length > 0}
                    <!-- Produced events (with border) -->
                    <div class="produced-box">
                      {#each row.producedEvents as eventRef}
                        <div class="event-item">
                          <span class="event">● {eventRef.event}</span>
                          {#if eventRef.data}
                            <JsonDisplay data={eventRef.data} class="scenario-json" />
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {:else}
                    <span class="muted">(no events)</span>
                  {/if}
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- STEPS (for explicit command scenarios - with sliceName and when/produces) -->
    {#if commandStepsScenario}
      <div class="scenario-step">
        <span class="label">Steps</span>
        <div class="timeline-scenario">
          {#each commandStepsScenario.steps as step}
            <div class="timeline-row">
              <!-- Left column: Command with sliceName (or empty for events-only) -->
              <div class="command-column">
                {#if step.type === 'command'}
                  <span class="command">▶ {sliceName || 'Command'}</span>
                  {#if step.when !== undefined}
                    <JsonDisplay data={step.when} class="scenario-json" />
                  {/if}
                {/if}
              </div>

              <!-- Right column: Events -->
              <div class="events-column">
                {#if step.type === 'events-only' && step.events}
                  <!-- Context events (no border) -->
                  {#each step.events as eventRef}
                    <div class="event-item">
                      <span class="event">● {eventRef.event}</span>
                      {#if eventRef.data}
                        <JsonDisplay data={eventRef.data} class="scenario-json" />
                      {/if}
                    </div>
                  {/each}
                {:else if step.type === 'command'}
                  {#if step.fails}
                    <div class="produced-box failure">
                      <span class="error">✗ {step.fails}</span>
                    </div>
                  {:else if step.produces && step.produces.length > 0}
                    <!-- Produced events (with border) -->
                    <div class="produced-box">
                      {#each step.produces as eventRef}
                        <div class="event-item">
                          <span class="event">● {eventRef.event}</span>
                          {#if eventRef.data}
                            <JsonDisplay data={eventRef.data} class="scenario-json" />
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {:else}
                    <span class="muted">(no events)</span>
                  {/if}
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</details>

<style>
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

  .scenario[open] > .scenario-header::before {
    transform: rotate(90deg);
  }

  .scenario-header:hover {
    background: var(--bg-secondary);
  }

  .scenario-header .icon {
    font-size: 1rem;
  }

  .scenario-header .icon.success {
    color: var(--color-success);
  }

  .scenario-header .icon.failure {
    color: var(--color-error);
  }

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

  .steps-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .timeline-scenario {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .timeline-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border);
  }

  .timeline-row:last-child {
    border-bottom: none;
  }

  .command-column {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .command-column .command {
    color: var(--color-command);
    font-weight: 500;
  }

  .events-column {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .events-column .event {
    color: var(--color-event);
    font-weight: 500;
  }

  /* Rahmen für produzierte Events */
  .produced-box {
    border: 2px solid var(--color-event);
    border-radius: 0.375rem;
    padding: 0.5rem;
    background: var(--bg-secondary);
  }

  .produced-box.failure {
    border-color: var(--color-error);
  }

  .produced-box .error {
    color: var(--color-error);
    font-weight: 500;
  }

  .event-item {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .step-row {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 1rem;
    align-items: start;
  }

  .event-column,
  .state-column {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .muted {
    color: var(--text-secondary);
    font-style: italic;
  }

  .arrow {
    color: var(--text-secondary);
    font-size: 1.25rem;
    padding-top: 0.1rem;
  }

  .event-column .event {
    color: var(--color-event);
    font-weight: 500;
  }

  :global(.scenario-json) {
    background: var(--bg-secondary) !important;
    padding: 0.75rem !important;
    font-size: 0.75rem !important;
    margin-top: 0.25rem;
  }
</style>
