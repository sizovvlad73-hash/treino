<script lang="ts">
  import { onMount } from 'svelte';
  import Folha from '../../componentes/Folha.svelte';
  import Num from '../../componentes/Num.svelte';
  import ResumoComida from '../../componentes/ResumoComida.svelte';
  import { adere } from '../../lib/calculos';
  import { dadosDoDia, mudarDia, nutri, obterRefeicoes, REFEICOES, somar } from '../../lib/comida';
  import { apagar, atualizar, criar, db, setDef } from '../../lib/db';
  import { fmt, fmtDataLonga, hoje, somaDias } from '../../lib/formato';
  import type { EntradaDiario } from '../../lib/tipos';
  import { vivo } from '../../lib/vivo.svelte';
  import AdicionarComida from './AdicionarComida.svelte';

  let { abrir = '' }: { abrir?: string } = $props();

  let data = $state(hoje());
  const d = vivo(
    () => dadosDoDia(data),
    undefined,
    () => data,
  );
  const lista = vivo(obterRefeicoes, REFEICOES);
  // As refeições configuradas e, a seguir, as que só existem em entradas antigas.
  const refeicoes = $derived([
    ...lista.v,
    ...new Set((d.v?.entradas ?? []).map((e) => e.refeicao).filter((r) => !lista.v.includes(r))),
  ]);

  let add = $state(false);
  let addRef = $state('');
  let addModo = $state<'alimentos' | 'modelos' | 'rapida'>('alimentos');
  function juntar(refeicao: string, modo: typeof addModo = 'alimentos') {
    addRef = refeicao;
    addModo = modo;
    add = true;
  }
  onMount(() => {
    if (!abrir) return;
    juntar('', abrir === 'rapida' ? 'rapida' : 'alimentos');
    history.replaceState(null, '', '#/comida');
  });

  const n = (e: EntradaDiario) => nutri(e, d.v!.alimentos.get(e.alimentoId ?? ''));
  const nomeDe = (e: EntradaDiario) =>
    e.alimentoId ? (d.v!.alimentos.get(e.alimentoId)?.nome ?? 'Alimento') : e.nome || 'Entrada rápida';
  const qtdDe = (e: EntradaDiario) =>
    !e.alimentoId ? 'rápida' : e.unidade === 'un' ? `${fmt(e.quantidade, 2)} un` : `${fmt(e.quantidade, 0)} g`;

  async function copiarDeOntem(refeicao: string) {
    const ontem = (await db.diario.where('data').equals(somaDias(data, -1)).toArray()).filter(
      (e) => !e.apagado && e.refeicao === refeicao,
    );
    if (!ontem.length) {
      alert('No dia anterior não há nada registado nesta refeição.');
      return;
    }
    for (const e of ontem) {
      const { alimentoId, quantidade, unidade, nome, kcalRapida, proteinaRapida } = e;
      await criar(db.diario, { data, refeicao, alimentoId, quantidade, unidade, nome, kcalRapida, proteinaRapida });
    }
  }

  // Edição de uma entrada.
  let folha = $state(false);
  let ed = $state.raw<EntradaDiario | null>(null);
  let eQtd = $state<number | null>(null);
  let eUn = $state<'g' | 'un'>('g');
  let eRef = $state('');
  let eNome = $state('');
  let eKcal = $state<number | null>(null);
  let eProt = $state<number | null>(null);
  function editar(e: EntradaDiario) {
    ed = e;
    eQtd = e.quantidade;
    eUn = e.unidade;
    eRef = e.refeicao;
    eNome = e.nome;
    eKcal = e.kcalRapida;
    eProt = e.proteinaRapida;
    folha = true;
  }
  async function guardar() {
    if (!ed) return;
    await atualizar(
      db.diario,
      ed.id,
      ed.alimentoId
        ? { refeicao: eRef, quantidade: eQtd ?? 0, unidade: eUn }
        : { refeicao: eRef, nome: eNome.trim(), kcalRapida: eKcal ?? 0, proteinaRapida: eProt ?? 0 },
    );
    folha = false;
  }
  async function remover() {
    if (ed) await apagar(db.diario, ed.id);
    folha = false;
  }

  // Lista de refeições editável (uma por linha).
  let folhaRef = $state(false);
  let textoRef = $state('');
  async function guardarRefeicoes() {
    const l = [...new Set(textoRef.split('\n').map((s) => s.trim()).filter(Boolean))];
    if (l.length) await setDef('refeicoes', l);
    folhaRef = false;
  }
</script>

<div class="linha nav">
  <button class="btn" aria-label="Dia anterior" onclick={() => (data = somaDias(data, -1))}>‹</button>
  <button class="btn cresce" onclick={() => (data = hoje())}>
    {data === hoje() ? 'Hoje' : fmtDataLonga(data)}
  </button>
  <button class="btn" aria-label="Dia seguinte" disabled={data >= hoje()} onclick={() => (data = somaDias(data, 1))}>
    ›
  </button>
</div>

{#if d.v}
  {@const v = d.v}
  {@const completo = !!v.dia?.completo}
  <div class="duas">
    <div>
      <section class="cartao">
        <ResumoComida t={v.totais} kcalMeta={v.kcalMeta} protMeta={v.meta?.proteinaG ?? null} salMax={v.meta?.salMaxG ?? null} />
      </section>

      <section class="cartao">
        <div class="seg">
          <button class:on={v.tipo === 'treino'} onclick={() => mudarDia(data, { tipo: 'treino' })}>Dia de treino</button>
          <button class:on={v.tipo === 'descanso'} onclick={() => mudarDia(data, { tipo: 'descanso' })}>
            Dia de descanso
          </button>
        </div>
        <div class="chips">
          <span class="sub rotulo">Fome</span>
          {#each [1, 2, 3, 4, 5] as f (f)}
            <button
              class="chip"
              class:on={v.dia?.fome === f}
              onclick={() => mudarDia(data, { fome: v.dia?.fome === f ? null : f })}
            >
              {f}
            </button>
          {/each}
        </div>
        <input
          placeholder="Nota do dia"
          aria-label="Nota do dia"
          value={v.dia?.nota ?? ''}
          onchange={(e) => mudarDia(data, { nota: e.currentTarget.value.trim() })}
        />
        <button class="btn largo" class:pri={!completo} onclick={() => mudarDia(data, { completo: completo ? 0 : 1 })}>
          {completo ? '✓ Dia completo (toca para reabrir)' : 'Marcar dia completo'}
        </button>
        {#if completo && v.kcalMeta && v.meta}
          <p class="sub espaco">
            {adere(v.totais.kcal, v.totais.proteina, v.kcalMeta, v.meta.proteinaG)
              ? 'Dentro da meta: kcal a ±10 % e proteína acima de 90 %.'
              : 'Fora da meta de adesão (kcal a ±10 % e proteína ≥ 90 %).'}
          </p>
        {:else if !completo}
          <p class="sub espaco">Só os dias completos entram nas médias de kcal.</p>
        {/if}
      </section>
    </div>

    <div>
      {#each refeicoes as r (r)}
        {@const entradas = v.entradas.filter((e) => e.refeicao === r)}
        {@const t = somar(entradas.map(n))}
        <section class="cartao">
          <div class="linha">
            <div class="cresce">
              <h2>{r}</h2>
              {#if entradas.length}
                <p class="sub">
                  <b style:color="var(--prot)">P {fmt(t.proteina, 0)} g</b> · {fmt(t.kcal, 0)} kcal
                </p>
              {/if}
            </div>
            {#if !entradas.length}
              <button class="btn" onclick={() => copiarDeOntem(r)}>Copiar de ontem</button>
            {/if}
            <button class="btn pri" aria-label="Juntar a {r}" onclick={() => juntar(r)}>+</button>
          </div>
          {#if entradas.length}
            <ul class="lista">
              {#each entradas as e (e.id)}
                <li>
                  <button class="item" onclick={() => editar(e)}>
                    <div class="cresce">
                      <span>{nomeDe(e)}</span>
                      <p class="sub">{qtdDe(e)} · P {fmt(n(e).proteina, 0)} g</p>
                    </div>
                    <b class="num">{fmt(n(e).kcal, 0)}</b>
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </section>
      {/each}
      <button
        class="btn largo"
        onclick={() => {
          textoRef = lista.v.join('\n');
          folhaRef = true;
        }}
      >
        Editar lista de refeições
      </button>
    </div>
  </div>
{/if}

<AdicionarComida bind:aberta={add} {data} {refeicoes} refeicao={addRef} modo={addModo} />

<Folha bind:aberta={folha} titulo={ed ? nomeDe(ed) : ''}>
  {#if ed}
    {@const a = d.v?.alimentos.get(ed.alimentoId ?? '')}
    {#if ed.alimentoId}
      <div class="linha">
        <div class="cresce"><Num bind:valor={eQtd} aria-label="Quantidade" /></div>
        {#if a?.gPorUnidade}
          <div class="seg unidade">
            <button class:on={eUn === 'g'} onclick={() => (eUn = 'g')}>g</button>
            <button class:on={eUn === 'un'} onclick={() => (eUn = 'un')}>un</button>
          </div>
        {:else}
          <span class="sub">gramas</span>
        {/if}
      </div>
    {:else}
      <label class="campo"><span>Descrição</span><input bind:value={eNome} /></label>
      <div class="grelha2">
        <label class="campo"><span>Kcal</span><Num bind:valor={eKcal} casas={0} /></label>
        <label class="campo"><span>Proteína (g)</span><Num bind:valor={eProt} casas={0} /></label>
      </div>
    {/if}
    <label class="campo espaco">
      <span>Refeição</span>
      <select bind:value={eRef}>
        {#each refeicoes as r (r)}<option value={r}>{r}</option>{/each}
      </select>
    </label>
    <button class="btn pri largo gr" onclick={guardar}>Guardar</button>
    <button class="btn perigo largo" onclick={remover}>Apagar</button>
  {/if}
</Folha>

<Folha bind:aberta={folhaRef} titulo="Lista de refeições">
  <p class="sub">Uma refeição por linha, pela ordem em que aparecem no diário.</p>
  <textarea class="espaco" rows="9" bind:value={textoRef} aria-label="Refeições"></textarea>
  <button class="btn pri largo gr" onclick={guardarRefeicoes}>Guardar</button>
</Folha>

<style>
  .nav {
    margin-bottom: 12px;
  }
  .rotulo {
    align-self: center;
  }
  .unidade {
    width: 120px;
    margin: 0;
  }
  textarea {
    min-height: 220px;
  }
</style>
