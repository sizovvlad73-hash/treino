<script lang="ts">
  import Grafico from '../../componentes/Grafico.svelte';
  import Topo from '../../componentes/Topo.svelte';
  import { historicoExercicio } from '../../lib/acoes';
  import { e1rm, melhorSerie } from '../../lib/calculos';
  import { atualizar, db } from '../../lib/db';
  import { fmt, fmtData, fmtDataCurta, fmtSerie } from '../../lib/formato';
  import { CARGAS, EQUIPAMENTOS, GRUPOS } from '../../lib/tipos';
  import { vivo } from '../../lib/vivo.svelte';
  import FormExercicio from './FormExercicio.svelte';

  let { id }: { id: string } = $props();

  const ex = vivo(() => db.exercicios.get(id), undefined);
  const hist = vivo(async () => (await historicoExercicio(id)).filter((h) => h.sessao.fim), []);
  let editar = $state(false);

  const tipo = $derived(ex.v?.tipoCarga ?? 'total');
  const comRm = $derived(tipo === 'total' || tipo === 'halter');
  /** Melhor série de cada sessão. */
  const melhores = $derived(
    hist.v.flatMap((h) => {
      const s = melhorSerie(h.series, tipo);
      return s ? [{ data: h.sessao.data, s }] : [];
    }),
  );
  const valor = (s: { kg: number; reps: number; tempoSeg: number | null }) =>
    tipo === 'tempo' ? s.tempoSeg : tipo === 'reps' ? s.reps : s.kg;
  const linhas = $derived([
    { nome: `Melhor série (${tipo === 'tempo' ? 's' : tipo === 'reps' ? 'reps' : 'kg'})`, dados: melhores.map((m) => valor(m.s)) },
    ...(comRm ? [{ nome: '1RM estimado (kg)', dados: melhores.map((m) => e1rm(m.s.kg, m.s.reps)), destaque: true }] : []),
  ]);
  const recorde = $derived(melhorSerie(melhores.map((m) => m.s), tipo));
  const dataRecorde = $derived(melhores.find((m) => m.s === recorde)?.data);
  const maisPesada = $derived(
    melhores.length && tipo !== 'reps' && tipo !== 'tempo'
      ? hist.v
          .flatMap((h) => h.series.filter((s) => !s.aquecimento))
          .reduce((a, b) => (b.kg > a.kg ? b : a))
      : null,
  );
</script>

{#if ex.v}
  {@const e = ex.v}
  <Topo titulo={e.nome} voltar="#/ginasio">
    <button
      class="btn fino"
      class:destaque={!!e.favorito}
      aria-label="Favorito"
      onclick={() => atualizar(db.exercicios, id, { favorito: e.favorito ? 0 : 1 })}
    >
      {e.favorito ? '★' : '☆'}
    </button>
  </Topo>
  <p class="sub">
    {GRUPOS[e.grupoPrimario]}{e.gruposSecundarios.length
      ? ' (+ ' + e.gruposSecundarios.map((g) => GRUPOS[g]).join(', ') + ')'
      : ''} · {EQUIPAMENTOS[e.equipamento]} · {CARGAS[e.tipoCarga]} · {e.composto ? 'composto' : 'isolamento'}
  </p>
  {#if e.meu}
    <div class="grelha2 espaco">
      <button class="btn" onclick={() => (editar = true)}>Editar</button>
      <button class="btn" onclick={() => atualizar(db.exercicios, id, { arquivado: e.arquivado ? 0 : 1 })}>
        {e.arquivado ? 'Desarquivar' : 'Arquivar'}
      </button>
    </div>
    <FormExercicio bind:aberta={editar} exercicio={e} />
  {/if}

  <div class="duas espaco">
    <div>
      <section class="cartao">
        <h2>Recordes pessoais</h2>
        {#if recorde}
          <ul class="lista">
            <li class="item">
              <span class="cresce sub">Melhor série · {dataRecorde ? fmtData(dataRecorde) : ''}</span>
              <b class="num">{fmtSerie(recorde, tipo)}</b>
            </li>
            {#if comRm && e1rm(recorde.kg, recorde.reps)}
              <li class="item">
                <span class="cresce sub">1RM estimado</span>
                <b class="num destaque">{fmt(e1rm(recorde.kg, recorde.reps), 1)} kg</b>
              </li>
            {/if}
            {#if maisPesada}
              <li class="item">
                <span class="cresce sub">Maior carga</span><b class="num">{fmtSerie(maisPesada, tipo)}</b>
              </li>
            {/if}
          </ul>
        {:else}
          <p class="vazio">Sem séries registadas. Junta este exercício a um treino para começares o histórico.</p>
        {/if}
      </section>
      {#if melhores.length >= 2}
        <section class="cartao">
          <h2>Evolução</h2>
          <Grafico rotulos={melhores.map((m) => fmtDataCurta(m.data))} {linhas} />
        </section>
      {/if}
    </div>

    {#if hist.v.length}
      <section class="cartao">
        <h2>Últimas sessões</h2>
        <ul class="lista">
          {#each [...hist.v].reverse().slice(0, 12) as h (h.sessao.id)}
            <li>
              <a class="item" href={'#/ginasio/sessao/' + h.sessao.id}>
                <span class="sub">{fmtDataCurta(h.sessao.data)}</span>
                <span class="cresce num series">
                  {h.series.map((s) => (s.aquecimento ? 'A ' : '') + fmtSerie(s, tipo)).join(' · ')}
                </span>
              </a>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
{/if}

<style>
  .series {
    font-weight: 600;
    font-size: 14px;
  }
</style>
