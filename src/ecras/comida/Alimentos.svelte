<script lang="ts">
  import { lerCsv } from '../../lib/comida';
  import { criar, db } from '../../lib/db';
  import type { Alimento } from '../../lib/tipos';
  import EscolherAlimento from './EscolherAlimento.svelte';
  import FormAlimento from './FormAlimento.svelte';

  let editar = $state(false);
  let alimento = $state.raw<Alimento | null>(null);
  let estado = $state('');

  async function importar(e: Event & { currentTarget: HTMLInputElement }) {
    const ficheiro = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!ficheiro) return;
    const r = lerCsv(await ficheiro.text());
    if ('erro' in r) {
      estado = r.erro;
      return;
    }
    for (const a of r.alimentos) await criar(db.alimentos, a);
    estado = `Importados ${r.alimentos.length} alimentos` + (r.ignoradas ? `; ${r.ignoradas} linhas ignoradas.` : '.');
  }
</script>

<div class="estreito">
  <section class="cartao">
    <EscolherAlimento
      escolherAoCriar={false}
      aoEscolher={(a) => {
        alimento = a;
        editar = true;
      }}
    />
  </section>
  <section class="cartao">
    <h2>Importar CSV</h2>
    <p class="sub">
      Primeira linha com os nomes das colunas: nome; marca; kcal; proteina; hidratos; gordura; fibra; sal;
      g por unidade; codigo. Valores por 100 g. Só «nome» e «kcal» são obrigatórias.
    </p>
    {#if estado}<p class="sub" role="status">{estado}</p>{/if}
    <label class="btn largo">
      Escolher ficheiro CSV…
      <input type="file" accept=".csv,text/csv,text/plain" hidden onchange={importar} />
    </label>
  </section>
</div>

<FormAlimento bind:aberta={editar} {alimento} />
