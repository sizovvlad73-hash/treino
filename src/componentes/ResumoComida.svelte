<script lang="ts">
  // Kcal e proteína que faltam (barras) e os restantes nutrientes do dia.
  import type { Nutri } from '../lib/comida';
  import { fmt } from '../lib/formato';

  let {
    t,
    kcalMeta,
    protMeta,
    salMax,
  }: { t: Nutri; kcalMeta: number | null; protMeta: number | null; salMax: number | null } = $props();
</script>

{#snippet barra(nome: string, valor: number, meta: number | null, un: string, cor: string)}
  <div class="b">
    <div class="linha entre">
      <span class="sub">{nome}</span>
      <span class="sub">{fmt(valor, 0)}{meta ? ` de ${fmt(meta, 0)}` : ''} {un}</span>
    </div>
    <p class="num medio">
      {#if !meta}
        {fmt(valor, 0)} {un}
      {:else if meta - valor >= 0}
        faltam {fmt(meta - valor, 0)} {un}
      {:else}
        {fmt(valor - meta, 0)} {un} acima
      {/if}
    </p>
    <div class="trilho">
      <div class="cheio" style:background={cor} style:transform="scaleX({meta ? Math.min(1, valor / meta) : 0})"></div>
    </div>
  </div>
{/snippet}

{@render barra('Kcal', t.kcal, kcalMeta, 'kcal', 'var(--destaque)')}
{@render barra('Proteína', t.proteina, protMeta, 'g', 'var(--prot)')}
<div class="quatro">
  <div><p class="sub">Hidratos</p><p class="num" style:color="var(--hid)">{fmt(t.hidratos, 0)} g</p></div>
  <div><p class="sub">Gordura</p><p class="num" style:color="var(--gord)">{fmt(t.gordura, 0)} g</p></div>
  <div><p class="sub">Fibra</p><p class="num">{fmt(t.fibra, 0)} g</p></div>
  <div>
    <p class="sub">Sal{salMax ? ` (máx. ${fmt(salMax, 1)})` : ''}</p>
    <p class="num" class:acima={!!salMax && t.sal > salMax}>{fmt(t.sal, 1)} g</p>
  </div>
</div>
{#if !kcalMeta}
  <a class="sub" href="#/mais/metas">Define as metas para veres o que falta ›</a>
{/if}

<style>
  .b {
    margin-bottom: 14px;
  }
  .trilho {
    height: 10px;
    margin-top: 6px;
    border-radius: 5px;
    background: var(--cartao2);
    overflow: hidden;
  }
  .cheio {
    height: 100%;
    border-radius: 5px;
    transform-origin: left;
    transition: transform 0.2s;
  }
  .quatro {
    display: grid;
    grid-template-columns: repeat(4, auto);
    gap: 8px;
    margin-bottom: 4px;
  }
  .acima {
    color: var(--perigo);
  }
</style>
