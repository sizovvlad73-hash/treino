<script lang="ts">
  // Lista de alimentos com pesquisa: favoritos primeiro, depois os usados recentemente.
  import { ativos, atualizar, db } from '../../lib/db';
  import { fmt, hoje, semAcentos, somaDias } from '../../lib/formato';
  import type { Alimento } from '../../lib/tipos';
  import { vivo } from '../../lib/vivo.svelte';
  import FormAlimento from './FormAlimento.svelte';

  let {
    aoEscolher,
    escolherAoCriar = true,
  }: { aoEscolher: (a: Alimento) => void; escolherAoCriar?: boolean } = $props();

  const todos = vivo(async () => {
    const recentes = (await db.diario.where('data').aboveOrEqual(somaDias(hoje(), -30)).toArray())
      .filter((e) => !e.apagado && e.alimentoId)
      .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));
    const ordem = new Map<string, number>();
    recentes.forEach((e, i) => {
      if (!ordem.has(e.alimentoId!)) ordem.set(e.alimentoId!, i);
    });
    const pos = (a: Alimento) => ordem.get(a.id) ?? 1e9;
    return (await ativos(db.alimentos)).sort(
      (a, b) => b.favorito - a.favorito || pos(a) - pos(b) || a.nome.localeCompare(b.nome, 'pt'),
    );
  }, []);

  let q = $state('');
  let criar = $state(false);
  const lista = $derived(
    todos.v.filter((a) => semAcentos(a.nome + ' ' + a.marca).includes(semAcentos(q))).slice(0, 60),
  );
</script>

<input type="search" placeholder="Procurar alimento" aria-label="Procurar alimento" bind:value={q} />
<ul class="lista">
  {#each lista as a (a.id)}
    <li>
      <button class="item" onclick={() => aoEscolher(a)}>
        <div>
          <b>{a.nome}</b>
          <p class="sub">
            {a.marca ? a.marca + ' · ' : ''}{fmt(a.kcal, 0)} kcal · P {fmt(a.proteina, 1)} g por 100 g
          </p>
        </div>
      </button>
      <button
        class="btn fino"
        class:destaque={!!a.favorito}
        aria-label={a.favorito ? 'Tirar dos favoritos' : 'Pôr nos favoritos'}
        onclick={() => atualizar(db.alimentos, a.id, { favorito: a.favorito ? 0 : 1 })}
      >
        {a.favorito ? '★' : '☆'}
      </button>
    </li>
  {:else}
    <li class="vazio">
      {todos.v.length ? 'Nenhum alimento com esse nome.' : 'Ainda não tens alimentos. Cria o primeiro a partir do rótulo.'}
    </li>
  {/each}
</ul>
<button class="btn largo" onclick={() => (criar = true)}>+ Criar alimento</button>

<FormAlimento bind:aberta={criar} aoGuardar={escolherAoCriar ? aoEscolher : undefined} />
