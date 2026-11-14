<script lang="ts" module>
  let abaGuardada = 'treinar';
</script>

<script lang="ts">
  import { ir, rota } from '../../lib/rota.svelte';
  import DetalheExercicio from './DetalheExercicio.svelte';
  import EditarRotina from './EditarRotina.svelte';
  import Historico from './Historico.svelte';
  import ListaExercicios from './ListaExercicios.svelte';
  import Sessao from './Sessao.svelte';
  import Treinar from './Treinar.svelte';

  const ABAS = [
    ['treinar', 'Treinar'],
    ['exercicios', 'Exercícios'],
    ['historico', 'Histórico'],
  ];
  const sub = $derived(rota.p[1]);
  const id = $derived(rota.p[2]);
  let aba = $state(abaGuardada);
  $effect(() => {
    abaGuardada = aba;
  });
</script>

{#if sub === 'sessao' && id}
  <Sessao {id} />
{:else if sub === 'rotina' && id}
  <EditarRotina {id} />
{:else if sub === 'exercicio' && id}
  <DetalheExercicio {id} />
{:else}
  <header class="topo"><h1>Ginásio</h1></header>
  <div class="seg">
    {#each ABAS as [a, nome] (a)}
      <button class:on={aba === a} onclick={() => (aba = a)}>{nome}</button>
    {/each}
  </div>
  {#if aba === 'treinar'}
    <Treinar />
  {:else if aba === 'exercicios'}
    <div class="cartao"><ListaExercicios aoEscolher={(e) => ir('ginasio/exercicio/' + e.id)} /></div>
  {:else}
    <Historico />
  {/if}
{/if}
