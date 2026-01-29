<script lang="ts">
  import { wireframeReloadSignal } from '../../stores/model.svelte';

  interface Props {
    src: string;
    title?: string;
  }
  let { src, title = 'Wireframe' }: Props = $props();

  // Add cache-buster query param to force fresh load
  let cacheBustedSrc = $derived(
    wireframeReloadSignal.value > 0
      ? `${src}${src.includes('?') ? '&' : '?'}_t=${wireframeReloadSignal.value}`
      : src
  );
</script>

<div class="wireframe-container">
  {#key cacheBustedSrc}
    <iframe
      {title}
      src={cacheBustedSrc}
      class="wireframe-iframe"
    ></iframe>
  {/key}
</div>

<style>
  .wireframe-container {
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    overflow: hidden;
    background: white;
  }
  .wireframe-iframe {
    width: 100%;
    height: 300px;
    border: none;
  }
</style>
