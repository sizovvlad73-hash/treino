<script lang="ts">
  // Biblioteca com pesquisa, filtros e favoritos. Serve de ecrã e de seletor.
  import { ativos, atualizar, db } from '../../lib/db';
  import { EQUIPAMENTOS, GRUPOS, type Equipamento, type Exercicio, type Grupo } from '../../lib/tipos';
  import { vivo } from '../../lib/vivo.svelte';
  import FormExercicio from './FormExercicio.svelte';

  let { aoEscolher }: { aoEscolher: (e: Exercicio) => void } = $props();

  const todos = vivo(
    async () =>
      (await ativos(db.exercicios)).sort((a, b) => b.favorito - a.favorito || a.nome.localeCompare(b.nome, 'pt')),
    [],
  );
  let q = $state('');
  let grupo = $state<Grupo | ''>('');
  let equip = $state<Equipamento | ''>('');
  let favs = $state(false);
  let arquivados = $state(false);
  let criar = $state(false);

  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase();
  const lista = $derived(
    todos.v.filter(
      (e) =>
        !!e.arquivado === arquivados &&
        (!favs || e.favorito) &&
        (!grupo || e.grupoPrimario === grupo) &&
        (!equip || e.equipamento === equip) &&
        norm(e.nome).includes(norm(q)),
    ),
  );
</script>

<input type="search" placeholder="Procurar exercício" aria-label="Procurar exercício" bind:value={q} />
<div class="chips espaco">
  <button class="chip" class:on={favs} onclick={() => (favs = !favs)}>★ Favoritos</button>
  {#each Object.entries(GRUPOS) as [g, nome] (g)}
    <button class="chip" class:on={grupo === g} onclick={() => (grupo = grupo === g ? '' : (g as Grupo))}>
      {nome}
    </button>
  {/each}
  <button class="chip" class:on={arquivados} onclick={() => (arquivados = !arquivados)}>Arquivados</button>
</div>
<select bind:value={equip} aria-label="Equipamento">
  <option value="">Todo o equipamento</option>
  {#each Object.entries(EQUIPAMENTOS) as [e, nome] (e)}<option value={e}>{nome}</option>{/each}
</select>

<ul class="lista">
  {#each lista as e (e.id)}
    <li>
      <button class="item" onclick={() => aoEscolher(e)}>
        <div>
          <b>{e.nome}</b>
          <p class="sub">{GRUPOS[e.grupoPrimario]} · {EQUIPAMENTOS[e.equipamento]}{e.meu ? ' · meu' : ''}</p>
        </div>
      </button>
      <button
        class="btn fino"
        class:destaque={!!e.favorito}
        aria-label={e.favorito ? 'Tirar dos favoritos' : 'Pôr nos favoritos'}
        onclick={() => atualizar(db.exercicios, e.id, { favorito: e.favorito ? 0 : 1 })}
      >
        {e.favorito ? '★' : '☆'}
      </button>
    </li>
  {:else}
    <li class="vazio">Nenhum exercício com estes filtros. Muda os filtros ou cria o teu.</li>
  {/each}
</ul>
<button class="btn largo" onclick={() => (criar = true)}>+ Criar exercício</button>

<FormExercicio bind:aberta={criar} />
