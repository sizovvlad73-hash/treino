<script lang="ts">
  import Topo from '../../componentes/Topo.svelte';
  import { carregarTudo, textoClaude } from '../../lib/resumo';
  import { vivo } from '../../lib/vivo.svelte';

  const tudo = vivo(carregarTudo, undefined);
  let pergunta = $state('');
  let copiado = $state('');
  let area = $state<HTMLTextAreaElement>();
  const r = $derived(tudo.v && textoClaude(tudo.v, pergunta));

  async function copiar() {
    if (!r) return;
    try {
      await navigator.clipboard.writeText(r.texto);
      copiado = 'Copiado. Cola no Claude.';
    } catch {
      // Sem acesso à área de transferência: seleciona o texto para copiar à mão.
      area?.select();
      copiado = 'Não deu para copiar sozinho. O texto ficou selecionado: copia-o à mão.';
    }
  }
</script>

<Topo titulo="Exportar para o Claude" voltar="#/mais" />

<div class="estreito">
  <section class="cartao">
    <label class="campo">
      <span>A minha pergunta</span>
      <textarea bind:value={pergunta} rows="3" placeholder="ex. O peso parou há duas semanas. O que mudo?"></textarea>
    </label>
    <button class="btn pri largo gr" disabled={!r} onclick={copiar}>Copiar</button>
    {#if copiado}<p class="sub" role="status">{copiado}</p>{/if}
  </section>

  {#if r}
    <section class="cartao">
      <div class="linha entre">
        <h2>Texto</h2>
        <span class="sub num">{r.palavras} palavras (máx. 4000)</span>
      </div>
      {#if r.omitidas}
        <p class="nota-aviso">Para caber, saíram as {r.omitidas} sessões de treino mais antigas.</p>
      {/if}
      {#if r.palavras > 4000}
        <p class="nota-aviso">O texto continua acima das 4000 palavras. Encurta a pergunta.</p>
      {/if}
      <textarea bind:this={area} class="texto" readonly rows="18" value={r.texto} aria-label="Texto para o Claude"
      ></textarea>
    </section>
  {/if}
</div>

<style>
  textarea {
    width: 100%;
  }
  .texto {
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 12px;
    white-space: pre;
    overflow: auto;
  }
</style>
