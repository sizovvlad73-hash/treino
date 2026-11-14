<script lang="ts">
  // Refeições-modelo: nome, ingredientes com gramas e totais.
  import Folha from '../../componentes/Folha.svelte';
  import Num from '../../componentes/Num.svelte';
  import { nutriGramas, somar } from '../../lib/comida';
  import { apagar, ativos, atualizar, criar, db } from '../../lib/db';
  import { fmt } from '../../lib/formato';
  import type { Alimento, Modelo } from '../../lib/tipos';
  import { vivo } from '../../lib/vivo.svelte';
  import EscolherAlimento from './EscolherAlimento.svelte';

  const d = vivo(
    async () => ({
      modelos: (await ativos(db.modelos)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt')),
      alimentos: new Map((await db.alimentos.toArray()).map((a) => [a.id, a])),
    }),
    { modelos: [] as Modelo[], alimentos: new Map<string, Alimento>() },
  );

  type Item = { alimentoId: string; gramas: number | null };
  let folha = $state(false);
  let escolher = $state(false);
  let id = $state<string | null>(null);
  let nome = $state('');
  let itens = $state<Item[]>([]);

  const total = (l: Item[]) => somar(l.map((i) => nutriGramas(d.v.alimentos.get(i.alimentoId), i.gramas ?? 0)));
  const resumo = (l: Item[]) => {
    const t = total(l);
    return `${fmt(t.kcal, 0)} kcal · P ${fmt(t.proteina, 0)} g · H ${fmt(t.hidratos, 0)} g · G ${fmt(t.gordura, 0)} g`;
  };

  function abrir(m?: Modelo) {
    id = m?.id ?? null;
    nome = m?.nome ?? '';
    itens = m ? m.itens.map((i) => ({ ...i })) : [];
    folha = true;
  }
  async function guardar() {
    if (!nome.trim() || !itens.length) return;
    const m = { nome: nome.trim(), itens: itens.map((i) => ({ alimentoId: i.alimentoId, gramas: i.gramas ?? 0 })) };
    if (id) await atualizar(db.modelos, id, m);
    else await criar(db.modelos, m);
    folha = false;
  }
  async function remover() {
    if (id && confirm('Apagar esta refeição-modelo?')) {
      await apagar(db.modelos, id);
      folha = false;
    }
  }
</script>

<div class="estreito">
  <ul class="cartao lista">
    {#each d.v.modelos as m (m.id)}
      <li>
        <button class="item" onclick={() => abrir(m)}>
          <div class="cresce"><b>{m.nome}</b><p class="sub">{resumo(m.itens)}</p></div>
          <span class="sub">›</span>
        </button>
      </li>
    {:else}
      <li class="vazio">Sem refeições-modelo. Cria as que repetes muito e junta-as ao diário com um toque.</li>
    {/each}
  </ul>
  <button class="btn largo" onclick={() => abrir()}>+ Nova refeição-modelo</button>
</div>

<Folha bind:aberta={folha} titulo={id ? 'Editar refeição-modelo' : 'Nova refeição-modelo'}>
  <label class="campo"><span>Nome</span><input bind:value={nome} placeholder="ex. Pequeno-almoço habitual" /></label>
  <ul class="lista">
    {#each itens as item, i (item.alimentoId)}
      <li>
        <span class="cresce">{d.v.alimentos.get(item.alimentoId)?.nome ?? 'Alimento'}</span>
        <span class="gramas"><Num bind:valor={item.gramas} casas={0} aria-label="Gramas" /></span>
        <span class="sub">g</span>
        <button class="btn fino perigo" aria-label="Remover" onclick={() => itens.splice(i, 1)}>✕</button>
      </li>
    {:else}
      <li class="vazio">Junta os ingredientes e as gramas de cada um.</li>
    {/each}
  </ul>
  <button class="btn largo" onclick={() => (escolher = true)}>+ Ingrediente</button>
  {#if itens.length}<p class="num espaco">{resumo(itens)}</p>{/if}
  <button class="btn pri largo gr" onclick={guardar}>Guardar</button>
  {#if id}<button class="btn perigo largo" onclick={remover}>Apagar</button>{/if}
</Folha>

<Folha bind:aberta={escolher} titulo="Escolher ingrediente">
  <EscolherAlimento
    aoEscolher={(a) => {
      if (!itens.some((i) => i.alimentoId === a.id)) itens.push({ alimentoId: a.id, gramas: a.gPorUnidade ?? 100 });
      escolher = false;
    }}
  />
</Folha>

<style>
  .gramas {
    width: 84px;
  }
  .gramas :global(input) {
    text-align: center;
  }
</style>
