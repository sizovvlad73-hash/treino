<script lang="ts">
  import { untrack } from 'svelte';
  import Folha from '../../componentes/Folha.svelte';
  import Num from '../../componentes/Num.svelte';
  import { procurarCodigo } from '../../lib/comida';
  import { apagar, atualizar, criar, db } from '../../lib/db';
  import type { Alimento } from '../../lib/tipos';

  let {
    aberta = $bindable(false),
    alimento = null,
    aoGuardar,
  }: { aberta: boolean; alimento?: Alimento | null; aoGuardar?: (a: Alimento) => void } = $props();

  const vazio = () => ({
    nome: '',
    marca: '',
    kcal: null as number | null,
    proteina: null as number | null,
    hidratos: null as number | null,
    gordura: null as number | null,
    fibra: null as number | null,
    sal: null as number | null,
    gPorUnidade: null as number | null,
    codigoBarras: '',
    fonte: 'rotulo' as Alimento['fonte'],
  });
  let f = $state(vazio());
  let estado = $state('');

  $effect(() => {
    if (!aberta) return;
    untrack(() => {
      estado = '';
      f = vazio();
      if (alimento) for (const k of Object.keys(f)) (f as Record<string, unknown>)[k] = alimento[k as keyof Alimento];
    });
  });

  async function procurar() {
    if (!f.codigoBarras.trim()) return;
    estado = 'A procurar…';
    try {
      const r = await procurarCodigo(f.codigoBarras.trim());
      if (r) Object.assign(f, r);
      estado = r ? 'Encontrado no Open Food Facts. Confirma os valores pelo rótulo.' : 'Código não encontrado.';
    } catch {
      estado = 'Sem ligação à internet.';
    }
  }

  async function guardar() {
    if (!f.nome.trim() || f.kcal == null) {
      estado = 'Preenche pelo menos o nome e as kcal.';
      return;
    }
    const d = {
      ...f,
      nome: f.nome.trim(),
      marca: f.marca.trim(),
      kcal: f.kcal,
      proteina: f.proteina ?? 0,
      hidratos: f.hidratos ?? 0,
      gordura: f.gordura ?? 0,
      fibra: f.fibra ?? 0,
      sal: f.sal ?? 0,
      gPorUnidade: f.gPorUnidade || null,
    };
    let a: Alimento;
    if (alimento) {
      await atualizar(db.alimentos, alimento.id, d);
      a = { ...alimento, ...d };
    } else a = await criar(db.alimentos, { ...d, favorito: 0 });
    aberta = false;
    aoGuardar?.(a);
  }

  async function remover() {
    if (!alimento || !confirm('Apagar este alimento? Os dias já registados mantêm os valores.')) return;
    await apagar(db.alimentos, alimento.id);
    aberta = false;
  }
</script>

<Folha bind:aberta titulo={alimento ? 'Editar alimento' : 'Criar alimento'}>
  <label class="campo"><span>Nome</span><input bind:value={f.nome} placeholder="ex. Iogurte grego natural" /></label>
  <label class="campo"><span>Marca</span><input bind:value={f.marca} /></label>
  <p class="sub">Valores por 100 g</p>
  <div class="tres">
    <label class="campo"><span>Kcal</span><Num bind:valor={f.kcal} /></label>
    <label class="campo"><span>Proteína (g)</span><Num bind:valor={f.proteina} /></label>
    <label class="campo"><span>Hidratos (g)</span><Num bind:valor={f.hidratos} /></label>
    <label class="campo"><span>Gordura (g)</span><Num bind:valor={f.gordura} /></label>
    <label class="campo"><span>Fibra (g)</span><Num bind:valor={f.fibra} /></label>
    <label class="campo"><span>Sal (g)</span><Num bind:valor={f.sal} casas={2} /></label>
  </div>
  <div class="grelha2">
    <label class="campo"><span>Peso por unidade (g)</span><Num bind:valor={f.gPorUnidade} /></label>
    <label class="campo">
      <span>Fonte</span>
      <select bind:value={f.fonte}>
        <option value="rotulo">Rótulo</option><option value="off">Open Food Facts</option>
        <option value="estimado">Estimado</option>
      </select>
    </label>
  </div>
  <div class="campo">
    <span>Código de barras</span>
    <div class="linha">
      <input bind:value={f.codigoBarras} inputmode="numeric" placeholder="número do código" />
      <button class="btn" onclick={procurar}>Procurar</button>
    </div>
  </div>
  {#if estado}<p class="sub" role="status">{estado}</p>{/if}
  <button class="btn pri largo gr" onclick={guardar}>Guardar</button>
  {#if alimento}<button class="btn perigo largo" onclick={remover}>Apagar</button>{/if}
</Folha>

<style>
  .tres {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-top: 6px;
  }
</style>
