<script lang="ts">
  // Sessão de treino: em curso (modo ginásio) ou já terminada (consulta e correção).
  import Folha from '../../componentes/Folha.svelte';
  import Num from '../../componentes/Num.svelte';
  import Topo from '../../componentes/Topo.svelte';
  import { apagarSessao, ultimaVez } from '../../lib/acoes';
  import { apagar, ativos, atualizar, db } from '../../lib/db';
  import { pararDescanso } from '../../lib/descanso.svelte';
  import { fmtData, minutosEntre } from '../../lib/formato';
  import { ir } from '../../lib/rota.svelte';
  import type { Exercicio } from '../../lib/tipos';
  import { vivo } from '../../lib/vivo.svelte';
  import ExercicioSessao from './ExercicioSessao.svelte';
  import ListaExercicios from './ListaExercicios.svelte';

  let { id }: { id: string } = $props();

  const d = vivo(async () => {
    const sessao = await db.sessoes.get(id);
    if (!sessao || sessao.apagado) return null;
    const series = (await db.series.where('sessaoId').equals(id).toArray())
      .filter((s) => !s.apagado)
      .sort((a, b) => a.ordem - b.ordem);
    const exs = new Map((await db.exercicios.toArray()).map((e) => [e.id, e]));
    const rotina = sessao.rotinaId ? await db.rotinas.get(sessao.rotinaId) : undefined;
    const rotinas = await ativos(db.rotinas);
    return { sessao, series, exs, rotina, rotinas, anteriores: await ultimaVez(sessao) };
  }, undefined);

  const ativa = $derived(!!d.v && !d.v.sessao.fim);

  /** Intervalo de reps alvo: o da rotina da sessão ou, em treino livre, o de qualquer rotina com o exercício. */
  const alvoDe = (exId: string) =>
    d.v!.rotinas.flatMap((r) => r.itens).find((i) => i.exercicioId === exId);

  // Mantém o ecrã ligado durante a sessão em curso.
  $effect(() => {
    if (!ativa || !('wakeLock' in navigator)) return;
    let trinco: WakeLockSentinel | undefined;
    const pedir = () => {
      if (document.visibilityState !== 'visible') return;
      navigator.wakeLock
        .request('screen')
        .then((t) => (trinco = t))
        .catch(() => {});
    };
    pedir();
    document.addEventListener('visibilitychange', pedir);
    return () => {
      document.removeEventListener('visibilitychange', pedir);
      trinco?.release();
    };
  });

  // Relógio da sessão em curso.
  let agora = $state(Date.now());
  $effect(() => {
    if (!ativa) return;
    const t = setInterval(() => (agora = Date.now()), 15000);
    return () => clearInterval(t);
  });

  let seletor = $state(false);
  let trocar = $state<string | null>(null);
  let folhaFim = $state(false);
  let duracao = $state<number | null>(null);
  let nota = $state('');
  let notaDor = $state('');

  const guardarOrdem = (ids: string[]) => atualizar(db.sessoes, id, { exercicioIds: ids });
  const seriesDe = (exId: string) => d.v!.series.filter((s) => s.exercicioId === exId);

  async function escolhido(e: Exercicio) {
    const ids = d.v!.sessao.exercicioIds;
    seletor = false;
    if (ids.includes(e.id)) return;
    if (trocar) {
      // As séries já feitas passam para o exercício novo.
      for (const s of seriesDe(trocar)) await atualizar(db.series, s.id, { exercicioId: e.id });
      await guardarOrdem(ids.map((x) => (x === trocar ? e.id : x)));
    } else await guardarOrdem([...ids, e.id]);
  }

  function mover(i: number, dir: number) {
    const ids = [...d.v!.sessao.exercicioIds];
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    guardarOrdem(ids);
  }

  async function remover(exId: string) {
    const series = seriesDe(exId);
    if (series.length && !confirm(`Remover o exercício e as suas ${series.length} séries?`)) return;
    for (const s of series) await apagar(db.series, s.id);
    await guardarOrdem(d.v!.sessao.exercicioIds.filter((x) => x !== exId));
  }

  function abrirFim() {
    const s = d.v!.sessao;
    duracao = minutosEntre(s.inicio, s.fim);
    nota = s.nota;
    notaDor = s.notaDor;
    folhaFim = true;
  }

  async function terminar() {
    const s = d.v!.sessao;
    const estavaAtiva = ativa;
    const fim = new Date(Date.parse(s.inicio) + Math.max(1, duracao ?? 1) * 60000).toISOString();
    await atualizar(db.sessoes, id, { fim, nota: nota.trim(), notaDor: notaDor.trim() });
    folhaFim = false;
    if (estavaAtiva) {
      pararDescanso();
      ir('ginasio');
    }
  }

  async function apagarTudo() {
    if (!confirm(ativa ? 'Cancelar a sessão e apagar as séries registadas?' : 'Apagar esta sessão e as suas séries?'))
      return;
    if (ativa) pararDescanso();
    await apagarSessao(id);
    ir('ginasio');
  }
</script>

{#if d.v === null}
  <Topo titulo="Sessão" voltar="#/ginasio" />
  <p class="cartao vazio">Esta sessão já não existe.</p>
{:else if d.v}
  {@const s = d.v.sessao}
  {@const dados = d.v}
  <Topo titulo={dados.rotina?.nome ?? 'Treino livre'} voltar="#/ginasio">
    <button class="btn pri" onclick={abrirFim}>{ativa ? 'Terminar' : 'Editar'}</button>
  </Topo>
  <p class="sub info">
    {fmtData(s.data)} ·
    {ativa ? `em curso há ${Math.max(0, Math.round((agora - Date.parse(s.inicio)) / 60000))} min` : `${minutosEntre(s.inicio, s.fim)} min`}
  </p>
  {#if s.nota || s.notaDor}
    <section class="cartao">
      {#if s.nota}<p><span class="sub">Nota:</span> {s.nota}</p>{/if}
      {#if s.notaDor}<p><span class="sub">Dor:</span> {s.notaDor}</p>{/if}
    </section>
  {/if}

  <div class="duas">
    {#each s.exercicioIds as exId, i (exId)}
      {@const e = dados.exs.get(exId)}
      {#if e}
        <ExercicioSessao
          exercicio={e}
          sessaoId={id}
          series={dados.series.filter((x) => x.exercicioId === exId)}
          anterior={dados.anteriores[exId] ?? []}
          item={dados.rotina?.itens.find((x) => x.exercicioId === exId)}
          alvo={alvoDe(exId)}
          {ativa}
          ordem={(dados.series.at(-1)?.ordem ?? 0) + 1}
          aoMover={(dir) => mover(i, dir)}
          aoTrocar={() => {
            trocar = exId;
            seletor = true;
          }}
          aoRemover={() => remover(exId)}
        />
      {/if}
    {:else}
      <p class="cartao vazio">Sessão vazia. Junta o primeiro exercício.</p>
    {/each}
  </div>

  <button
    class="btn largo gr"
    onclick={() => {
      trocar = null;
      seletor = true;
    }}
  >
    + Exercício
  </button>
  <button class="btn perigo largo" onclick={apagarTudo}>{ativa ? 'Cancelar sessão' : 'Apagar sessão'}</button>

  <Folha bind:aberta={seletor} titulo={trocar ? 'Trocar exercício' : 'Juntar exercício'}>
    <ListaExercicios aoEscolher={escolhido} />
  </Folha>

  <Folha bind:aberta={folhaFim} titulo={ativa ? 'Terminar treino' : 'Editar sessão'}>
    <label class="campo"><span>Duração (min)</span><Num bind:valor={duracao} casas={0} /></label>
    <label class="campo">
      <span>Nota livre</span>
      <textarea bind:value={nota} placeholder="Como correu?"></textarea>
    </label>
    <label class="campo">
      <span>Nota de dor</span>
      <textarea bind:value={notaDor} placeholder="ex. ombro direito no supino"></textarea>
    </label>
    <button class="btn pri largo gr" onclick={terminar}>{ativa ? 'Terminar e guardar' : 'Guardar'}</button>
  </Folha>
{/if}

<style>
  .info {
    margin: -8px 0 12px;
  }
</style>
