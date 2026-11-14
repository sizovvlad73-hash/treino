<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    aberta = $bindable(false),
    titulo = '',
    children,
  }: { aberta: boolean; titulo?: string; children: Snippet } = $props();
</script>

{#if aberta}
  <button class="fundo" aria-label="Fechar" onclick={() => (aberta = false)}></button>
  <div class="folha" role="dialog" aria-modal="true" aria-label={titulo}>
    <header class="linha entre">
      <h2>{titulo}</h2>
      <button class="btn fino" aria-label="Fechar" onclick={() => (aberta = false)}>✕</button>
    </header>
    {@render children()}
  </div>
{/if}

<style>
  .fundo {
    position: fixed;
    inset: 0;
    z-index: 20;
    border: 0;
    background: #000a;
    animation: aparece 0.15s;
  }
  .folha {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 21;
    max-width: 560px;
    max-height: 92dvh;
    margin: 0 auto;
    overflow-y: auto;
    background: var(--cartao);
    border-radius: 20px 20px 0 0;
    padding: 12px 16px calc(16px + env(safe-area-inset-bottom));
    animation: sobe 0.2s ease-out;
  }
  header {
    margin-bottom: 8px;
  }
  @media (min-width: 900px) {
    .folha {
      bottom: 5vh;
      border-radius: 20px;
      padding-bottom: 16px;
    }
  }
  @keyframes aparece {
    from {
      opacity: 0;
    }
  }
  @keyframes sobe {
    from {
      transform: translateY(40%);
      opacity: 0;
    }
  }
</style>
