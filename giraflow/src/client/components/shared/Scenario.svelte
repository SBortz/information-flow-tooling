<script lang="ts">
  import type { CommandScenario, StateViewScenario } from '../../lib/types';
  import { modelStore } from '../../stores/model.svelte';
  import JsonDisplay from './JsonDisplay.svelte';

  interface Props {
    scenario: CommandScenario | StateViewScenario;
    type: 'command' | 'state';
  }

  let { scenario, type }: Props = $props();

  function isCommandScenario(s: CommandScenario | StateViewScenario): s is CommandScenario {
    return 'then' in s && typeof s.then === 'object' && s.then !== null && ('produces' in s.then || 'fails' in s.then);
  }

  let isCommand = $derived(isCommandScenario(scenario));
  let commandScenario = $derived(isCommand ? scenario as CommandScenario : null);
  let stateScenario = $derived(!isCommand ? scenario as StateViewScenario : null);

  let isSuccess = $derived(
    commandScenario ? !commandScenario.then.fails : true
  );
</script>

<details class="scenario" open={modelStore.expandAll}>
  <summary class="scenario-header">
    <span class="icon" class:success={isSuccess} class:failure={!isSuccess}>
      {isSuccess ? '✓' : '✗'}
    </span>
    <span class="name">{scenario.name}</span>
  </summary>

  <div class="scenario-body">
    <!-- GIVEN -->
    {#if scenario.given && scenario.given.length > 0}
      <div class="scenario-step">
        <span class="label">Given</span>
        <div class="step-items">
          {#each scenario.given as ref}
            <div class="step-item">
              <span class="event">● {ref.event}</span>
              {#if ref.data}
                <JsonDisplay data={ref.data} class="scenario-json" />
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- WHEN (for commands) -->
    {#if commandScenario?.when !== undefined}
      <div class="scenario-step">
        <span class="label">When</span>
        <div class="step-items">
          <div class="step-item">
            <span class="command">▶ Command received</span>
            <JsonDisplay data={commandScenario.when} class="scenario-json" />
          </div>
        </div>
      </div>
    {/if}

    <!-- THEN -->
    <div class="scenario-step">
      <span class="label">Then</span>
      <div class="step-items">
        {#if commandScenario}
          {#if commandScenario.then.produces && commandScenario.then.produces.length > 0}
            {#each commandScenario.then.produces as ref}
              <div class="step-item">
                <span class="event">● {ref.event}</span>
                {#if ref.data}
                  <JsonDisplay data={ref.data} class="scenario-json" />
                {/if}
              </div>
            {/each}
          {/if}
          {#if commandScenario.then.fails}
            <div class="step-item">
              <span class="error">✗ Fails: {commandScenario.then.fails}</span>
            </div>
          {/if}
        {:else if stateScenario?.then !== undefined}
          <div class="step-item">
            <span class="state">◆ View state</span>
            <JsonDisplay data={stateScenario.then} class="scenario-json" />
          </div>
        {/if}
      </div>
    </div>
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

  .step-items {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .step-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .step-item .event {
    color: var(--color-event);
    font-weight: 500;
  }

  .step-item .command {
    color: var(--color-command);
    font-weight: 500;
  }

  .step-item .state {
    color: var(--color-state);
    font-weight: 500;
  }

  .step-item .error {
    color: var(--color-error);
    font-weight: 500;
  }

  :global(.scenario-json) {
    background: var(--bg-secondary) !important;
    padding: 0.75rem !important;
    font-size: 0.75rem !important;
    margin-top: 0.25rem;
  }
</style>
