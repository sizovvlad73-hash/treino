<script lang="ts">
  // Um exercício dentro da sessão: séries feitas, última vez, sugestão e registo da série seguinte.
  import { onMount } from 'svelte';
  import Folha from '../../componentes/Folha.svelte';
  import Num from '../../componentes/Num.svelte';
  import { sugestao } from '../../lib/calculos';
  import { apagar, atualizar, criar, db } from '../../lib/db';
  import { iniciarDescanso } from '../../lib/descanso.svelte';
  import { fmt, fmtSerie } from '../../lib/formato';
  import { GRUPOS, type Exercicio, type ItemRotina, type Serie } from '../../lib/tipos';

  let {
    exercicio,
    sessaoId,
    series,
    anterior,
    item,
    alvo,
    ativa,
    ordem,
    aoMover,
    aoTrocar,
    aoRemover,
  }: {
    exercicio: Exercicio;
    sessaoId: string;
    series: Serie[];
    anterior: Serie[];
    item?: ItemRotina; // da rotina desta sessão
    alvo?: ItemRotina; // intervalo de reps de qualquer rotina (para a sugestão em treino livre)
    ativa: boolean;
    ordem: number;
    aoMover: (dir: number) => void;
    aoTrocar: () => void;
    aoRemover: () => void;
  } = $props();

  const tipo = $derived(exercicio.tipoCarga);
  const comKg = $derived(tipo !== 'reps' && tipo !== 'tempo');
  const rotuloKg = $derived(tipo === 'halter' ? 'kg por halter' : tipo === 'lastro' ? 'kg de lastro' : 'kg');
  const trabalhoAnterior = $derived(anterior.filter((s) => !s.aquecimento));
  const sug = $derived(comKg ? sugestao(anterior, item ?? alvo, !!exercicio.composto) : null);
  const passoKg = $derived(exercicio.passoKg || 2.5);

  // Opções guardadas no exercício: salto de carga e nota fixa.
  let mPasso = $state<number | null>(null);
  let mNota = $state('');
  function abrirMenu() {
    menu = !menu;
    mPasso = passoKg;
    mNota = exercicio.nota ?? '';
  }
  async function guardarOpcoes() {
    await atualizar(db.exercicios, exercicio.id, { passoKg: mPasso || 2.5, nota: mNota.trim() });
    menu = false;
  }

  // Série a registar.
  let kg = $state<number | null>(null);
  let reps = $state<number | null>(null);
  let tempo = $state<number | null>(null);
  let rir = $state<number | null>(null);
  let aquec = $state(false);

  // Preenche com a última série desta sessão; se não houver, com a última vez e a sugestão.
  onMount(() => {
    const ult = series.at(-1);
    const ant = trabalhoAnterior[0] ?? anterior[0];
    if (ult) {
      kg = ult.kg;
      reps = ult.reps || null;
      tempo = ult.tempoSeg;
      rir = ult.rir;
      aquec = !!ult.aquecimento;
    } else if (ant) {
      kg = sug?.kg ?? ant.kg;
      reps = (sug?.sobe ? (item ?? alvo)?.repsMin : ant.reps) || null;
      tempo = ant.tempoSeg;
    } else if (item) reps = item.repsMin;
  });

  const passo = (v: number | null, d: number) => Math.max(0, (v ?? 0) + d);

  async function gravar() {
    if (tipo === 'tempo' ? !tempo : !reps) return;
    await criar(db.series, {
      sessaoId,
      exercicioId: exercicio.id,
      ordem,
      kg: comKg ? (kg ?? 0) : 0,
      reps: tipo === 'tempo' ? 0 : (reps ?? 0),
      tempoSeg: tipo === 'tempo' ? tempo : null,
      rir,
      aquecimento: aquec ? 1 : 0,
    });
    if (ativa) iniciarDescanso(item?.descansoSeg ?? 120);
  }

  // Edição de uma série já gravada.
  let menu = $state(false);
  let folha = $state(false);
  let ed = $state.raw<Serie | null>(null);
  let eKg = $state<number | null>(null);
  let eReps = $state<number | null>(null);
  let eTempo = $state<number | null>(null);
  let eRir = $state<number | null>(null);
  let eAquec = $state(false);

  function abrirEd(s: Serie) {
    ed = s;
    eKg = s.kg;
    eReps = s.reps;
    eTempo = s.tempoSeg;
    eRir = s.rir;
    eAquec = !!s.aquecimento;
    folha = true;
  }
  async function guardarEd() {
    if (!ed) return;
    await atualizar(db.series, ed.id, {
      kg: eKg ?? 0,
      reps: eReps ?? 0,
      tempoSeg: tipo === 'tempo' ? eTempo : null,
      rir: eRir,
      aquecimento: eAquec ? 1 : 0,
    });
    folha = false;
  }
  async function apagarEd() {
    if (ed) await apagar(db.series, ed.id);
    folha = false;
  }
  /** Número da série de trabalho (o aquecimento não conta). */
  const numero = (i: number) => series.slice(0, i + 1).filter((s) => !s.aquecimento).length;
</script>

{#snippet rirChips(v: number | null, mudar: (r: number | null) => void, a: boolean, mudarA: (x: boolean) => void)}
  <div class="chips">
    <span class="sub rotulo">RIR</span>
    {#each [0, 1, 2, 3, 4, 5] as r (r)}
      <button class="chip" class:on={v === r} onclick={() => mudar(v === r ? null : r)}>{r}{r === 5 ? '+' : ''}</button>
    {/each}
    <button class="chip" class:on={a} onclick={() => mudarA(!a)}>Aquecimento</button>
  </div>
{/snippet}

<section class="cartao">
  <div class="linha">
    <div class="cresce">
      <h2>{exercicio.nome}</h2>
      <p class="sub">
        {item ? `${item.series} × ${item.repsMin}–${item.repsMax} · descanso ${item.descansoSeg} s` : GRUPOS[exercicio.grupoPrimario]}
      </p>
    </div>
    <button class="btn fino" aria-label="Opções do exercício" aria-expanded={menu} onclick={abrirMenu}>⋯</button>
  </div>
  {#if exercicio.nota && !menu}<p class="sub nota">Nota: {exercicio.nota}</p>{/if}
  {#if menu}
    <div class="linha espaco">
      <button class="btn" aria-label="Subir" onclick={() => aoMover(-1)}>▲</button>
      <button class="btn" aria-label="Descer" onclick={() => aoMover(1)}>▼</button>
      <button class="btn cresce" onclick={aoTrocar}>Trocar</button>
      <button class="btn perigo cresce" onclick={aoRemover}>Remover</button>
    </div>
    <div class="opcoes espaco">
      {#if comKg}
        <label class="campo"><span>Salto +/− (kg)</span><Num bind:valor={mPasso} casas={2} /></label>
      {/if}
      <label class="campo">
        <span>Nota fixa do exercício</span>
        <input bind:value={mNota} placeholder="ex. banco na posição 4" />
      </label>
    </div>
    <button class="btn largo" onclick={guardarOpcoes}>Guardar opções</button>
  {/if}

  {#if trabalhoAnterior.length}
    <p class="sub espaco">Última vez: {trabalhoAnterior.map((s) => fmtSerie(s, tipo)).join(' · ')}</p>
  {/if}
  {#if sug}
    <p class="destaque sugestao">
      {sug.sobe
        ? `Sugestão: sobe para ${fmt(sug.kg, 2)} kg`
        : `Sugestão: mantém ${fmt(sug.kg, 2)} kg e tenta mais reps`}
    </p>
  {/if}

  {#if series.length}
    <ul class="lista espaco">
      {#each series as s, i (s.id)}
        <li>
          <button class="item" onclick={() => abrirEd(s)}>
            <span class="n" class:aq={!!s.aquecimento}>{s.aquecimento ? 'A' : numero(i)}</span>
            <b class="num cresce">{fmtSerie(s, tipo)}</b>
            <span class="sub">editar</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="entrada espaco">
    {#if comKg}
      <div class="passo">
        <button class="btn" aria-label="Menos {fmt(passoKg, 2)} kg" onclick={() => (kg = passo(kg, -passoKg))}>−</button>
        <label><Num bind:valor={kg} casas={2} /><span class="sub">{rotuloKg}</span></label>
        <button class="btn" aria-label="Mais {fmt(passoKg, 2)} kg" onclick={() => (kg = passo(kg, passoKg))}>+</button>
      </div>
    {/if}
    {#if tipo === 'tempo'}
      <div class="passo">
        <button class="btn" aria-label="Menos 5 segundos" onclick={() => (tempo = passo(tempo, -5))}>−</button>
        <label><Num bind:valor={tempo} casas={0} /><span class="sub">segundos</span></label>
        <button class="btn" aria-label="Mais 5 segundos" onclick={() => (tempo = passo(tempo, 5))}>+</button>
      </div>
    {:else}
      <div class="passo">
        <button class="btn" aria-label="Menos 1 rep" onclick={() => (reps = passo(reps, -1))}>−</button>
        <label><Num bind:valor={reps} casas={0} /><span class="sub">reps</span></label>
        <button class="btn" aria-label="Mais 1 rep" onclick={() => (reps = passo(reps, 1))}>+</button>
      </div>
    {/if}
  </div>
  {@render rirChips(rir, (r) => (rir = r), aquec, (x) => (aquec = x))}
  <button class="btn pri largo" onclick={gravar}>Gravar série</button>
</section>

<Folha bind:aberta={folha} titulo="Editar série">
  <div class="grelha2">
    {#if comKg}<label class="campo"><span>{rotuloKg}</span><Num bind:valor={eKg} casas={2} /></label>{/if}
    {#if tipo === 'tempo'}
      <label class="campo"><span>Segundos</span><Num bind:valor={eTempo} casas={0} /></label>
    {:else}
      <label class="campo"><span>Reps</span><Num bind:valor={eReps} casas={0} /></label>
    {/if}
  </div>
  {@render rirChips(eRir, (r) => (eRir = r), eAquec, (x) => (eAquec = x))}
  <button class="btn pri largo gr" onclick={guardarEd}>Guardar</button>
  <button class="btn perigo largo" onclick={apagarEd}>Apagar série</button>
</Folha>

<style>
  .sugestao {
    font-size: 14px;
    font-weight: 650;
  }
  .nota {
    margin-top: 4px;
  }
  .opcoes {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 8px;
  }
  .opcoes .campo {
    margin: 0;
  }
  .n {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--cartao2);
    display: grid;
    place-items: center;
    font-size: 13px;
    font-weight: 700;
  }
  .n.aq {
    color: var(--aviso);
  }
  .entrada {
    display: flex;
    gap: 12px;
  }
  .passo {
    flex: 1;
    display: grid;
    grid-template-columns: 44px 1fr 44px;
    gap: 4px;
    align-items: start;
  }
  .passo .btn {
    padding: 0;
    font-size: 22px;
  }
  .passo label {
    text-align: center;
  }
  .passo :global(input) {
    padding: 8px 2px;
    text-align: center;
    font-size: 20px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .passo .sub {
    font-size: 12px;
  }
  .rotulo {
    align-self: center;
  }
  .chips {
    margin-top: 8px;
  }
</style>
