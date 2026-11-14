<script lang="ts">
  import { onMount } from 'svelte';
  import Folha from '../../componentes/Folha.svelte';
  import Num from '../../componentes/Num.svelte';
  import Topo from '../../componentes/Topo.svelte';
  import { apagar, atualizar, criar, db } from '../../lib/db';
  import { DIAS } from '../../lib/formato';
  import { ir } from '../../lib/rota.svelte';
  import type { Exercicio } from '../../lib/tipos';
  import { vivo } from '../../lib/vivo.svelte';
  import ListaExercicios from './ListaExercicios.svelte';

  let { id }: { id: string } = $props();
  const nova = $derived(id === 'nova');

  type Item = {
    exercicioId: string;
    series: number | null;
    repsMin: number | null;
    repsMax: number | null;
    descansoSeg: number | null;
  };
  let nome = $state('');
  let dias = $state<number[]>([]);
  let itens = $state<Item[]>([]);
  let escolher = $state(false);
  let erro = $state('');
  const nomes = vivo(async () => new Map((await db.exercicios.toArray()).map((e) => [e.id, e.nome])), new Map());

  onMount(async () => {
    const r = nova ? undefined : await db.rotinas.get(id);
    if (!r) return;
    nome = r.nome;
    dias = [...r.diasSemana];
    itens = r.itens.map((i) => ({ ...i }));
  });

  function juntar(e: Exercicio) {
    const composto = !!e.composto;
    escolher = false;
    if (itens.some((i) => i.exercicioId === e.id)) return;
    itens.push({
      exercicioId: e.id,
      series: 3,
      repsMin: composto ? 6 : 10,
      repsMax: composto ? 10 : 15,
      descansoSeg: composto ? 150 : 90,
    });
    escolher = false;
  }
  function mover(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= itens.length) return;
    [itens[i], itens[j]] = [itens[j], itens[i]];
  }

  async function guardar() {
    if (!nome.trim()) {
      erro = 'Dá um nome à rotina.';
      return;
    }
    const d = {
      nome: nome.trim(),
      diasSemana: [...dias].sort(),
      itens: itens.map((i) => {
        const repsMin = i.repsMin || 8;
        return {
          exercicioId: i.exercicioId,
          series: i.series || 3,
          repsMin,
          repsMax: Math.max(repsMin, i.repsMax || repsMin),
          descansoSeg: i.descansoSeg || 120,
        };
      }),
    };
    if (nova) await criar(db.rotinas, d);
    else await atualizar(db.rotinas, id, d);
    ir('ginasio');
  }

  async function remover() {
    if (!confirm('Apagar esta rotina? As sessões já feitas ficam no histórico.')) return;
    await apagar(db.rotinas, id);
    ir('ginasio');
  }
</script>

<Topo titulo={nova ? 'Nova rotina' : 'Editar rotina'} voltar="#/ginasio" />

<div class="estreito">
  <section class="cartao">
    <label class="campo"><span>Nome</span><input bind:value={nome} placeholder="ex. Push A" /></label>
    <div class="campo">
      <span>Dias da semana</span>
      <div class="chips">
        {#each DIAS as d, i (d)}
          <button
            class="chip"
            class:on={dias.includes(i + 1)}
            onclick={() => (dias = dias.includes(i + 1) ? dias.filter((x) => x !== i + 1) : [...dias, i + 1])}
          >
            {d}
          </button>
        {/each}
      </div>
    </div>
  </section>

  {#each itens as item, i (item.exercicioId)}
    <section class="cartao">
      <div class="linha">
        <b class="cresce">{i + 1}. {nomes.v.get(item.exercicioId) ?? 'Exercício'}</b>
        <button class="btn" aria-label="Subir" disabled={i === 0} onclick={() => mover(i, -1)}>▲</button>
        <button class="btn" aria-label="Descer" disabled={i === itens.length - 1} onclick={() => mover(i, 1)}>▼</button>
        <button class="btn perigo" aria-label="Remover" onclick={() => itens.splice(i, 1)}>✕</button>
      </div>
      <div class="quatro espaco">
        <label class="campo"><span>Séries</span><Num bind:valor={item.series} casas={0} /></label>
        <label class="campo"><span>Reps mín.</span><Num bind:valor={item.repsMin} casas={0} /></label>
        <label class="campo"><span>Reps máx.</span><Num bind:valor={item.repsMax} casas={0} /></label>
        <label class="campo"><span>Descanso (s)</span><Num bind:valor={item.descansoSeg} casas={0} /></label>
      </div>
    </section>
  {:else}
    <p class="cartao vazio">Sem exercícios. Junta-os pela ordem em que os fazes.</p>
  {/each}

  <button class="btn largo" onclick={() => (escolher = true)}>+ Juntar exercício</button>
  {#if erro}<p class="erro">{erro}</p>{/if}
  <button class="btn pri largo gr" onclick={guardar}>Guardar rotina</button>
  {#if !nova}<button class="btn perigo largo" onclick={remover}>Apagar rotina</button>{/if}
</div>

<Folha bind:aberta={escolher} titulo="Juntar exercício">
  <ListaExercicios aoEscolher={juntar} />
</Folha>

<style>
  .quatro {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .quatro .campo {
    margin: 0;
  }
  .quatro :global(input) {
    padding: 8px 6px;
    text-align: center;
  }
</style>
