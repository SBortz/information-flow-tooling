<script lang="ts">
  import { syntaxHighlightJson } from '../../lib/utils';

  interface Props {
    data: unknown;
    class?: string;
  }

  let { data, class: className = '' }: Props = $props();

  let html = $derived(syntaxHighlightJson(data));
</script>

<pre class="json-display {className}">{@html html}</pre>

<style>
  .json-display {
    background: var(--bg-primary);
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    overflow-x: auto;
    white-space: pre;
  }
</style>
