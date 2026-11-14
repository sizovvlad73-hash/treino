<script lang="ts">
  // Folha para juntar comida a uma refeição: alimento, refeição-modelo ou entrada rápida.
  import { untrack } from 'svelte';
  import Folha from '../../componentes/Folha.svelte';
  import Num from '../../componentes/Num.svelte';
  import { nutri, nutriGramas, somar } from '../../lib/comida';
  import { ativos, criar, db } from '../../lib/db';
  import { fmt } from '../../lib/formato';
  import type { Alimento, Modelo } from '../../lib/tipos';
  import { vivo } from '../../lib/vivo.svelte';
  import EscolherAlimento from './EscolherAlimento.svelte';

  type Modo = 'alimentos' | 'modelos' | 'rapida';
  let {
    aberta = $bindable(false),
    data,
    refeicoes,
    refeicao,
    modo,
  }: { aberta: boolean; data: string; refeicoes: string[]; refeicao: string; modo: Modo } = $props();

  const ABAS: [Modo, string][] = [
    ['alimentos', 'Alimentos'],
    ['modelos', 'Modelos'],
    ['rapida', 'Rápida'],
  ];
  const d = vivo(
    async () => ({
      modelos: (await ativos(db.modelos)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt')),
      alimentos: new Map((await db.alimentos.toArray()).map((a) => [a.id, a])),
    }),
    { modelos: [] as Modelo[], alimentos: new Map<string, Alimento>() },
  );

  let aba = $state<Modo>('alimentos');
  let ref = $state('');
  let sel = $state.raw<Alimento | null>(null);
  let qtd = $state<number | null>(100);
  let un = $state<'g' | 'un'>('g');
  let rNome = $state('');
  let rKcal = $state<number | null>(null);
  let rProt = $state<number | null>(null);

  $effect(() => {
    if (!aberta) return;
    untrack(() => {
      aba = modo;
      ref = refeicao || refeicoes[0];
      sel = null;
      rNome = '';
      rKcal = rProt = null;
    });
  });

  /** Escolhe o alimento e propõe a quantidade da última vez. */
  async function escolher(a: Alimento) {
    const ult = (await db.diario.where('alimentoId').equals(a.id).toArray())
      .filter((e) => !e.apagado)
      .sort((x, y) => (x.criadoEm < y.criadoEm ? 1 : -1))[0];
    un = ult?.unidade === 'un' && a.gPorUnidade ? 'un' : ult ? 'g' : a.gPorUnidade ? 'un' : 'g';
    qtd = ult && ult.unidade === un ? ult.quantidade : un === 'un' ? 1 : 100;
    sel = a;
  }

  const base = () => ({ data, refeicao: ref, nome: '', kcalRapida: null, proteinaRapida: null });
  const previsto = $derived(
    sel ? nutri({ alimentoId: sel.id, quantidade: qtd ?? 0, unidade: un, kcalRapida: null, proteinaRapida: null }, sel) : null,
  );

  async function adicionar() {
    if (!sel || !qtd || qtd <= 0) return;
    await criar(db.diario, { ...base(), alimentoId: sel.id, quantidade: qtd, unidade: un });
    aberta = false;
  }
  async function adicionarModelo(m: Modelo) {
    for (const i of m.itens)
      await criar(db.diario, { ...base(), alimentoId: i.alimentoId, quantidade: i.gramas, unidade: 'g' });
    aberta = false;
  }
  async function adicionarRapida() {
    if (!rKcal) return;
    await criar(db.diario, {
      ...base(),
      alimentoId: null,
      quantidade: 0,
      unidade: 'g',
      nome: rNome.trim(),
      kcalRapida: rKcal,
      proteinaRapida: rProt ?? 0,
    });
    aberta = false;
  }
  const totalModelo = (m: Modelo) => somar(m.itens.map((i) => nutriGramas(d.v.alimentos.get(i.alimentoId), i.gramas)));
</script>

<Folha bind:aberta titulo="Juntar ao diário">
  <label class="campo">
    <span>Refeição</span>
    <select bind:value={ref}>
      {#each refeicoes as r (r)}<option value={r}>{r}</option>{/each}
    </select>
  </label>

  {#if sel && previsto}
    <b>{sel.nome}</b>
    <p class="sub">{sel.marca ? sel.marca + ' · ' : ''}{fmt(sel.kcal, 0)} kcal por 100 g</p>
    <div class="linha espaco">
      <div class="cresce"><Num bind:valor={qtd} aria-label="Quantidade" /></div>
      {#if sel.gPorUnidade}
        <div class="seg unidade">
          <button class:on={un === 'g'} onclick={() => (un = 'g')}>g</button>
          <button class:on={un === 'un'} onclick={() => (un = 'un')}>un</button>
        </div>
      {:else}
        <span class="sub">gramas</span>
      {/if}
    </div>
    <p class="num espaco">
      {fmt(previsto.kcal, 0)} kcal · P {fmt(previsto.proteina, 1)} g · H {fmt(previsto.hidratos, 1)} g · G
      {fmt(previsto.gordura, 1)} g
    </p>
    <button class="btn pri largo gr" onclick={adicionar}>Adicionar</button>
    <button class="btn largo" onclick={() => (sel = null)}>Escolher outro</button>
  {:else}
    <div class="seg">
      {#each ABAS as [a, nome] (a)}
        <button class:on={aba === a} onclick={() => (aba = a)}>{nome}</button>
      {/each}
    </div>
    {#if aba === 'alimentos'}
      <EscolherAlimento aoEscolher={escolher} />
    {:else if aba === 'modelos'}
      <ul class="lista">
        {#each d.v.modelos as m (m.id)}
          {@const t = totalModelo(m)}
          <li>
            <button class="item" onclick={() => adicionarModelo(m)}>
              <div class="cresce">
                <b>{m.nome}</b>
                <p class="sub">{fmt(t.kcal, 0)} kcal · P {fmt(t.proteina, 0)} g · {m.itens.length} ingredientes</p>
              </div>
              <span class="destaque">+</span>
            </button>
          </li>
        {:else}
          <li class="vazio">Sem refeições-modelo. Cria-as no separador Modelos.</li>
        {/each}
      </ul>
    {:else}
      <p class="sub">Para restaurantes: só kcal e proteína.</p>
      <label class="campo espaco"><span>Descrição</span><input bind:value={rNome} placeholder="ex. Almoço no restaurante" /></label>
      <div class="grelha2">
        <label class="campo"><span>Kcal</span><Num bind:valor={rKcal} casas={0} /></label>
        <label class="campo"><span>Proteína (g)</span><Num bind:valor={rProt} casas={0} /></label>
      </div>
      <button class="btn pri largo gr" onclick={adicionarRapida}>Adicionar</button>
    {/if}
  {/if}
</Folha>

<style>
  .unidade {
    width: 120px;
    margin: 0;
  }
</style>
