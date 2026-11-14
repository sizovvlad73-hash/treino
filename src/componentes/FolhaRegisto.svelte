<script lang="ts">
  // Registar ou editar um peso ou uma medida de cintura.
  import { guardarPeso } from '../lib/acoes';
  import { apagar, atualizar, criar, db } from '../lib/db';
  import { hoje } from '../lib/formato';
  import type { Medida, Peso } from '../lib/tipos';
  import Folha from './Folha.svelte';
  import Num from './Num.svelte';

  let {
    aberta = $bindable(false),
    tipo,
    registo = null,
  }: { aberta: boolean; tipo: 'peso' | 'cintura'; registo?: Peso | Medida | null } = $props();

  let data = $state(hoje());
  let valor = $state<number | null>(null);

  $effect(() => {
    if (!aberta) return;
    data = registo?.data ?? hoje();
    valor = registo ? ('kg' in registo ? registo.kg : registo.cm) : null;
  });

  async function guardar() {
    if (!valor || valor <= 0 || !data) return;
    if (tipo === 'peso') {
      if (registo && registo.data !== data) await apagar(db.pesos, registo.id);
      await guardarPeso(data, valor);
    } else if (registo) await atualizar(db.medidas, registo.id, { data, cm: valor });
    else await criar(db.medidas, { data, tipo: 'cintura', cm: valor });
    aberta = false;
  }

  async function remover() {
    if (!registo) return;
    if (tipo === 'peso') await apagar(db.pesos, registo.id);
    else await apagar(db.medidas, registo.id);
    aberta = false;
  }
</script>

<Folha bind:aberta titulo={(registo ? 'Editar ' : 'Registar ') + tipo}>
  <label class="campo">
    <span>{tipo === 'peso' ? 'Peso em jejum (kg)' : 'Cintura no umbigo (cm)'}</span>
    <Num bind:valor />
  </label>
  <label class="campo">
    <span>Data</span>
    <input type="date" bind:value={data} max={hoje()} />
  </label>
  {#if tipo === 'peso' && !registo}
    <p class="sub">Se já houver um peso nesse dia, é substituído.</p>
  {/if}
  <button class="btn pri largo gr" onclick={guardar}>Guardar</button>
  {#if registo}<button class="btn perigo largo" onclick={remover}>Apagar</button>{/if}
</Folha>
