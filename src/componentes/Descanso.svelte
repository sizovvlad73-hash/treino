<script lang="ts">
  import { descanso, maisDescanso, pararDescanso } from '../lib/descanso.svelte';
  import { fmtRelogio } from '../lib/formato';

  let agora = $state(Date.now());

  $effect(() => {
    const fim = descanso.fim;
    if (!fim) return;
    let vibrou = false;
    agora = Date.now();
    const t = setInterval(() => {
      agora = Date.now();
      if (agora >= fim && !vibrou) {
        vibrou = true;
        navigator.vibrate?.([200, 100, 200]);
      }
      if (agora >= fim + 5000) pararDescanso();
    }, 250);
    return () => clearInterval(t);
  });

  const falta = $derived((descanso.fim - agora) / 1000);
</script>

{#if descanso.fim}
  <div class="descanso" role="timer">
    <div class="cresce">
      <p class="sub">{falta > 0 ? 'Descanso' : 'Descanso terminado'}</p>
      <p class="num medio" class:destaque={falta <= 0}>{fmtRelogio(falta)}</p>
    </div>
    <button class="btn" onclick={() => maisDescanso(30)}>+30 s</button>
    <button class="btn" aria-label="Fechar temporizador" onclick={pararDescanso}>✕</button>
    <div class="progresso" style:transform="scaleX({Math.min(1, Math.max(0, falta / descanso.total))})"></div>
  </div>
{/if}

<style>
  .descanso {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: calc(env(safe-area-inset-bottom) + 66px);
    z-index: 9;
    max-width: 536px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px 12px 16px;
    background: var(--cartao2);
    border: 1px solid var(--linha);
    border-radius: 16px;
    overflow: hidden;
  }
  .progresso {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 3px;
    background: var(--destaque);
    transform-origin: left;
  }
</style>
