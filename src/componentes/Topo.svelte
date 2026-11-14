<script lang="ts">
  import type { Snippet } from 'svelte';
  let { titulo, voltar = '', children }: { titulo: string; voltar?: string; children?: Snippet } = $props();
</script>

<header class="topo">
  {#if voltar}<a class="btn fino" href={voltar} aria-label="Voltar">‹</a>{/if}
  <h1 class="cresce" class:menor={!!voltar}>{titulo}</h1>
  {@render children?.()}
</header>

<style>
  .menor {
    font-size: 22px;
  }
</style>
