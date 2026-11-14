<script lang="ts">
  import { rota } from './lib/rota.svelte';
  import Descanso from './componentes/Descanso.svelte';
  import Hoje from './ecras/hoje/Hoje.svelte';
  import Ginasio from './ecras/ginasio/Ginasio.svelte';
  import Comida from './ecras/comida/Comida.svelte';
  import Corpo from './ecras/corpo/Corpo.svelte';
  import Mais from './ecras/mais/Mais.svelte';

  const abas = [
    { id: 'hoje', nome: 'Hoje', icone: 'M3 11l9-8 9 8M5 10v10h14V10' },
    { id: 'ginasio', nome: 'Ginásio', icone: 'M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11' },
    { id: 'comida', nome: 'Comida', icone: 'M6 3v7a3 3 0 0 0 6 0V3M9 3v18M18 3c-2.5 2-2.5 7 0 9v9' },
    { id: 'corpo', nome: 'Corpo', icone: 'M3 17l5-6 4 4 8-9M3 21h18' },
    { id: 'mais', nome: 'Mais', icone: 'M5 12h.01M12 12h.01M19 12h.01' },
  ];
  const seccao = $derived(rota.p[0] ?? 'hoje');
</script>

{#key rota.p.join('/')}
  <main class="pagina">
    {#if seccao === 'ginasio'}
      <Ginasio />
    {:else if seccao === 'comida'}
      <Comida />
    {:else if seccao === 'corpo'}
      <Corpo />
    {:else if seccao === 'mais'}
      <Mais />
    {:else}
      <Hoje />
    {/if}
  </main>
{/key}

<Descanso />

<nav class="barra" aria-label="Navegação principal">
  {#each abas as a (a.id)}
    <a href={'#/' + a.id} class:on={seccao === a.id} aria-current={seccao === a.id ? 'page' : undefined}>
      <svg viewBox="0 0 24 24" aria-hidden="true" stroke-width={a.id === 'mais' ? 3 : 2}><path d={a.icone} /></svg>
      {a.nome}
    </a>
  {/each}
</nav>
