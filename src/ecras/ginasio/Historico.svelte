<script lang="ts">
  import { e1rm, melhorSerie, volumePorGrupo } from '../../lib/calculos';
  import { ativos, db } from '../../lib/db';
  import { fmt, fmtData, fmtSerie, hoje, inicioSemana, minutosEntre, somaDias } from '../../lib/formato';
  import { GRUPOS, type Grupo, type Serie } from '../../lib/tipos';
  import { vivo } from '../../lib/vivo.svelte';

  const d = vivo(async () => {
    const sessoes = (await ativos(db.sessoes)).filter((s) => s.fim).sort((a, b) => (a.inicio < b.inicio ? 1 : -1));
    const ids = new Set(sessoes.map((s) => s.id));
    const series = (await ativos(db.series)).filter((s) => ids.has(s.sessaoId));
    const exs = new Map((await db.exercicios.toArray()).map((e) => [e.id, e]));
    const rotinas = new Map((await db.rotinas.toArray()).map((r) => [r.id, r.nome]));
    return { sessoes, series, exs, rotinas };
  }, undefined);

  let semana = $state(inicioSemana(hoje()));

  const volume = $derived.by(() => {
    if (!d.v) return [];
    const fim = somaDias(semana, 6);
    const ids = new Set(d.v.sessoes.filter((s) => s.data >= semana && s.data <= fim).map((s) => s.id));
    const v = volumePorGrupo(d.v.series.filter((s) => ids.has(s.sessaoId)), d.v.exs);
    return (Object.keys(GRUPOS) as Grupo[]).map((g) => ({ g, n: v[g] ?? 0 })).filter((x) => x.n > 0);
  });
  const maximo = $derived(Math.max(1, ...volume.map((v) => v.n)));

  const recordes = $derived.by(() => {
    if (!d.v) return [];
    const porEx = new Map<string, Serie[]>();
    for (const s of d.v.series) {
      if (!porEx.has(s.exercicioId)) porEx.set(s.exercicioId, []);
      porEx.get(s.exercicioId)!.push(s);
    }
    return [...porEx]
      .flatMap(([id, series]) => {
        const e = d.v!.exs.get(id);
        const s = e && melhorSerie(series, e.tipoCarga);
        return e && s ? [{ e, s }] : [];
      })
      .sort((a, b) => a.e.nome.localeCompare(b.e.nome, 'pt'));
  });

  const nSeries = (id: string) => d.v!.series.filter((s) => s.sessaoId === id).length;
</script>

{#if d.v}
  <div class="duas">
    <div>
      <section class="cartao">
        <div class="linha">
          <button class="btn" aria-label="Semana anterior" onclick={() => (semana = somaDias(semana, -7))}>‹</button>
          <div class="cresce centro">
            <h2>Volume semanal</h2>
            <p class="sub">semana de {fmtData(semana)}</p>
          </div>
          <button
            class="btn"
            aria-label="Semana seguinte"
            disabled={semana >= inicioSemana(hoje())}
            onclick={() => (semana = somaDias(semana, 7))}
          >
            ›
          </button>
        </div>
        {#each volume as v (v.g)}
          <div class="vol">
            <span class="sub">{GRUPOS[v.g]}</span>
            <div class="trilho"><div class="cheio" style:transform="scaleX({v.n / maximo})"></div></div>
            <b class="num">{fmt(v.n, 1)}</b>
          </div>
        {:else}
          <p class="vazio">Sem séries efetivas nesta semana (RIR ≤ 3, sem aquecimento).</p>
        {/each}
      </section>

      <section class="cartao">
        <h2>Sessões</h2>
        <ul class="lista">
          {#each d.v.sessoes as s (s.id)}
            <li>
              <a class="item" href={'#/ginasio/sessao/' + s.id}>
                <div class="cresce">
                  <b>{(s.rotinaId && d.v.rotinas.get(s.rotinaId)) || 'Treino livre'}</b>
                  <p class="sub">
                    {fmtData(s.data)} · {minutosEntre(s.inicio, s.fim)} min · {nSeries(s.id)} séries{s.notaDor
                      ? ' · com nota de dor'
                      : ''}
                  </p>
                </div>
                <span class="sub">›</span>
              </a>
            </li>
          {:else}
            <li class="vazio">Sem sessões terminadas. Começa um treino no separador Treinar.</li>
          {/each}
        </ul>
      </section>
    </div>

    <section class="cartao">
      <h2>Recordes pessoais</h2>
      <ul class="lista">
        {#each recordes as r (r.e.id)}
          {@const rm = r.e.tipoCarga === 'total' || r.e.tipoCarga === 'halter' ? e1rm(r.s.kg, r.s.reps) : null}
          <li>
            <a class="item" href={'#/ginasio/exercicio/' + r.e.id}>
              <div class="cresce">
                <b>{r.e.nome}</b>
                <p class="sub">{fmtSerie(r.s, r.e.tipoCarga)}</p>
              </div>
              {#if rm}<span class="num">{fmt(rm, 1)} <small class="sub">1RM est.</small></span>{/if}
            </a>
          </li>
        {:else}
          <li class="vazio">Os recordes aparecem depois da primeira sessão terminada.</li>
        {/each}
      </ul>
    </section>
  </div>
{/if}

<style>
  .centro {
    text-align: center;
  }
  .vol {
    display: grid;
    grid-template-columns: 96px 1fr 36px;
    gap: 8px;
    align-items: center;
    margin-top: 10px;
  }
  .vol .num {
    text-align: right;
  }
  .trilho {
    height: 10px;
    border-radius: 5px;
    background: var(--cartao2);
    overflow: hidden;
  }
  .cheio {
    height: 100%;
    border-radius: 5px;
    background: var(--destaque);
    transform-origin: left;
  }
</style>
