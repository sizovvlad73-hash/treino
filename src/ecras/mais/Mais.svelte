<script lang="ts">
  import { rota } from '../../lib/rota.svelte';
  import { definirTema, tema, type Tema } from '../../lib/tema.svelte';
  import Backup from './Backup.svelte';
  import Metas from './Metas.svelte';
  import Perfil from './Perfil.svelte';

  const TEMAS: [Tema, string][] = [
    ['escuro', 'Escuro'],
    ['claro', 'Claro'],
    ['sistema', 'Sistema'],
  ];
  const ENTRADAS = [
    ['perfil', 'Perfil', 'Dados pessoais, objetivo, TMB e TDEE'],
    ['metas', 'Metas', 'Kcal, proteína e sal, com histórico'],
    ['backup', 'Backup', 'Exportar e restaurar os dados'],
  ];
</script>

{#if rota.p[1] === 'perfil'}
  <Perfil />
{:else if rota.p[1] === 'metas'}
  <Metas />
{:else if rota.p[1] === 'backup'}
  <Backup />
{:else}
  <header class="topo"><h1>Mais</h1></header>
  <div class="estreito">
    <ul class="cartao lista">
      {#each ENTRADAS as [id, nome, texto] (id)}
        <li>
          <a class="item" href={'#/mais/' + id}>
            <div class="cresce"><b>{nome}</b><p class="sub">{texto}</p></div>
            <span class="sub">›</span>
          </a>
        </li>
      {/each}
    </ul>
    <section class="cartao">
      <h2>Tema</h2>
      <div class="seg">
        {#each TEMAS as [id, nome] (id)}
          <button class:on={tema.v === id} onclick={() => definirTema(id)}>{nome}</button>
        {/each}
      </div>
    </section>
  </div>
{/if}
