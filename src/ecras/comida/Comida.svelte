<script lang="ts" module>
  let abaGuardada = 'diario';
</script>

<script lang="ts">
  import { rota } from '../../lib/rota.svelte';
  import Alimentos from './Alimentos.svelte';
  import Diario from './Diario.svelte';
  import Modelos from './Modelos.svelte';

  const ABAS = [
    ['diario', 'Diário'],
    ['alimentos', 'Alimentos'],
    ['modelos', 'Modelos'],
  ];
  // #/comida/novo e #/comida/rapida abrem o diário já com a folha de adicionar.
  const abrir = rota.p[1] ?? '';
  let aba = $state(abrir ? 'diario' : abaGuardada);
  $effect(() => {
    abaGuardada = aba;
  });
</script>

<header class="topo"><h1>Comida</h1></header>
<div class="seg">
  {#each ABAS as [a, nome] (a)}
    <button class:on={aba === a} onclick={() => (aba = a)}>{nome}</button>
  {/each}
</div>
{#if aba === 'diario'}
  <Diario {abrir} />
{:else if aba === 'alimentos'}
  <Alimentos />
{:else}
  <Modelos />
{/if}
