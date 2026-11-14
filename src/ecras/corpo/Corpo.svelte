<script lang="ts">
  import FolhaRegisto from '../../componentes/FolhaRegisto.svelte';
  import Grafico from '../../componentes/Grafico.svelte';
  import { mediaMovel, tendencia } from '../../lib/calculos';
  import { ativos, db } from '../../lib/db';
  import { fmt, fmtData, fmtDataCurta, fmtSinal, hoje, somaDias } from '../../lib/formato';
  import type { Medida, Peso } from '../../lib/tipos';
  import { vivo } from '../../lib/vivo.svelte';

  const pesos = vivo(async () => (await ativos(db.pesos)).sort((a, b) => (a.data < b.data ? -1 : 1)), []);
  const cinturas = vivo(
    async () => (await ativos(db.medidas)).filter((m) => m.tipo === 'cintura').sort((a, b) => (a.data < b.data ? 1 : -1)),
    [],
  );

  const PERIODOS: [number, string][] = [
    [30, '30 dias'],
    [90, '90 dias'],
    [365, '1 ano'],
    [0, 'Tudo'],
  ];
  let periodo = $state(90);
  let todos = $state(false);

  const visiveis = $derived(periodo ? pesos.v.filter((p) => p.data >= somaDias(hoje(), -periodo)) : pesos.v);
  const linhas = $derived([
    { nome: 'Peso do dia', dados: visiveis.map((p) => p.kg) },
    { nome: 'Média 7 dias', dados: visiveis.map((p) => mediaMovel(pesos.v, p.data)), destaque: true },
  ]);
  const tend = $derived(tendencia(pesos.v));
  const lista = $derived([...pesos.v].reverse().slice(0, todos ? undefined : 10));

  let folha = $state(false);
  let tipo = $state<'peso' | 'cintura'>('peso');
  let registo = $state.raw<Peso | Medida | null>(null);
  function abrir(t: 'peso' | 'cintura', r: Peso | Medida | null = null) {
    tipo = t;
    registo = r;
    folha = true;
  }
</script>

<header class="topo"><h1>Corpo</h1></header>

<section class="cartao">
  <div class="grelha2">
    <div>
      <p class="sub">Média 7 dias</p>
      <p class="num grande">{fmt(tend.media, 1, true)}</p>
    </div>
    <div>
      <p class="sub">Variação semanal</p>
      <p class="num grande">{fmtSinal(tend.variacao, 2)}</p>
    </div>
  </div>
  <div class="chips espaco">
    {#each PERIODOS as [dias, nome] (dias)}
      <button class="chip" class:on={periodo === dias} onclick={() => (periodo = dias)}>{nome}</button>
    {/each}
  </div>
  {#if visiveis.length >= 2}
    <Grafico rotulos={visiveis.map((p) => fmtDataCurta(p.data))} {linhas} />
  {:else}
    <p class="vazio">Regista o peso em pelo menos dois dias deste período para veres o gráfico.</p>
  {/if}
</section>

<div class="duas">
  <section class="cartao">
    <div class="linha entre">
      <h2>Peso diário</h2>
      <button class="btn pri" onclick={() => abrir('peso')}>+ Peso</button>
    </div>
    <ul class="lista">
      {#each lista as p (p.id)}
        <li>
          <button class="item" onclick={() => abrir('peso', p)}>
            <span class="cresce sub">{fmtData(p.data)}</span>
            <b class="num">{fmt(p.kg, 1, true)} kg</b>
          </button>
        </li>
      {:else}
        <li class="vazio">Sem pesos. Pesa-te em jejum, de manhã, e regista aqui.</li>
      {/each}
    </ul>
    {#if pesos.v.length > 10}
      <button class="btn largo" onclick={() => (todos = !todos)}>
        {todos ? 'Ver menos' : `Ver todos (${pesos.v.length})`}
      </button>
    {/if}
  </section>

  <section class="cartao">
    <div class="linha entre">
      <h2>Cintura</h2>
      <button class="btn pri" onclick={() => abrir('cintura')}>+ Cintura</button>
    </div>
    <ul class="lista">
      {#each cinturas.v as m, i (m.id)}
        <li>
          <button class="item" onclick={() => abrir('cintura', m)}>
            <span class="cresce sub">{fmtData(m.data)}</span>
            {#if cinturas.v[i + 1]}<span class="sub">{fmtSinal(m.cm - cinturas.v[i + 1].cm)}</span>{/if}
            <b class="num">{fmt(m.cm, 1, true)} cm</b>
          </button>
        </li>
      {:else}
        <li class="vazio">Sem medidas. Mede a cintura no umbigo, uma vez por semana.</li>
      {/each}
    </ul>
  </section>
</div>

<FolhaRegisto bind:aberta={folha} {tipo} {registo} />
