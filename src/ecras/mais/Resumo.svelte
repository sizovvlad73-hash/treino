<script lang="ts">
  import Topo from '../../componentes/Topo.svelte';
  import { fmt, fmtData, fmtSinal, hoje, inicioSemana, somaDias } from '../../lib/formato';
  import { carregarTudo, resumoSemana } from '../../lib/resumo';
  import { vivo } from '../../lib/vivo.svelte';

  const estaSemana = inicioSemana(hoje());
  let seg = $state(estaSemana);
  const tudo = vivo(carregarTudo, undefined);
  const r = $derived(tudo.v && resumoSemana(tudo.v, seg));
</script>

<Topo titulo="Resumo semanal" voltar="#/mais" />

<div class="estreito">
  <div class="linha entre semana">
    <button class="btn" aria-label="Semana anterior" onclick={() => (seg = somaDias(seg, -7))}>‹</button>
    <div class="centro">
      <b>{seg === estaSemana ? 'Esta semana' : seg === somaDias(estaSemana, -7) ? 'Semana passada' : 'Semana'}</b>
      <p class="sub">{fmtData(seg)} a {fmtData(somaDias(seg, 6))}</p>
    </div>
    <button class="btn" aria-label="Semana seguinte" disabled={seg >= estaSemana} onclick={() => (seg = somaDias(seg, 7))}>
      ›
    </button>
  </div>

  {#if r}
    {#snippet valor(nome: string, v: string, un: string, nota = '')}
      <div>
        <p class="sub">{nome}</p>
        <p class="num medio">{v} {#if v !== '—'}<small>{un}</small>{/if}</p>
        {#if nota}<p class="sub">{nota}</p>{/if}
      </div>
    {/snippet}

    <section class="cartao">
      <h2>Corpo</h2>
      <div class="grelha2">
        {@render valor(
          'Peso médio',
          fmt(r.peso, 1, true),
          'kg',
          r.variacaoPeso == null ? '' : `${fmtSinal(r.variacaoPeso, 2)} kg que na semana anterior`,
        )}
        {@render valor(
          'Cintura',
          fmt(r.cintura, 1),
          'cm',
          r.variacaoCintura == null ? '' : `${fmtSinal(r.variacaoCintura, 1)} cm que na semana anterior`,
        )}
      </div>
    </section>

    <section class="cartao">
      <h2>Comida · {r.completos} {r.completos === 1 ? 'dia completo' : 'dias completos'}</h2>
      <div class="grelha2">
        {@render valor('Kcal por dia', fmt(r.kcal, 0), 'kcal')}
        {@render valor('Proteína por dia', fmt(r.proteina, 0), 'g')}
        {@render valor('Sal por dia', fmt(r.sal, 1), 'g')}
        {@render valor('Adesão', fmt(r.adesao, 0), '%')}
      </div>
      <p class="sub espaco">
        {r.completos
          ? 'Médias só dos dias marcados como completos. Adesão: kcal a ±10 % da meta e proteína a 90 % ou mais.'
          : 'Sem dias completos nesta semana. Marca «dia completo» no diário para entrarem nas médias.'}
      </p>
    </section>

    <section class="cartao">
      <h2>Atividade e treino</h2>
      <div class="grelha2">
        {@render valor('Passos por dia', fmt(r.passos, 0), '')}
        {@render valor('Sono por noite', fmt(r.sono, 1), 'h')}
        {@render valor('Energia', fmt(r.energia, 1), 'de 5')}
        {@render valor('Treinos', `${r.feitos} de ${r.planeados}`, 'planeados')}
      </div>
    </section>

    <section class="cartao">
      <h2>TDEE adaptativo</h2>
      {#if r.tdee.tdee != null}
        <p class="num grande">{fmt(r.tdee.tdee, 0)} <small>kcal</small></p>
        <p class="sub">
          Pelos {r.tdee.completos} dias completos e pela variação do peso nos 28 dias até {fmtData(
            r.dom < hoje() ? r.dom : hoje(),
          )}.
        </p>
      {:else if r.tdee.faltam}
        <p class="vazio">Faltam {r.tdee.faltam} dias completos (são precisos 14 nos últimos 28).</p>
      {:else}
        <p class="vazio">Faltam pesos no início ou no fim dos 28 dias para calcular.</p>
      {/if}
    </section>
  {/if}
</div>

<style>
  .semana {
    margin-bottom: 12px;
  }
  .centro {
    text-align: center;
  }
  small {
    font-size: 14px;
    font-weight: 600;
    color: var(--texto2);
  }
</style>
