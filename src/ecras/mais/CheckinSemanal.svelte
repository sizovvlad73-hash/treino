<script lang="ts">
  import Topo from '../../componentes/Topo.svelte';
  import { criar, db, setDef } from '../../lib/db';
  import { fmt, fmtData, fmtSinal, hoje } from '../../lib/formato';
  import { ir } from '../../lib/rota.svelte';
  import { carregarTudo, checkin } from '../../lib/resumo';
  import { vivo } from '../../lib/vivo.svelte';

  const tudo = vivo(carregarTudo, undefined);
  const c = $derived(tudo.v && checkin(tudo.v));

  async function concluir(estado?: 'aceite' | 'recusada') {
    if (!c) return;
    if (estado && c.proposta && c.meta) {
      await criar(db.metas, {
        data: hoje(),
        kcalTreino: c.proposta.kcalTreino,
        kcalDescanso: c.proposta.kcalDescanso,
        proteinaG: c.meta.proteinaG,
        salMaxG: c.meta.salMaxG,
        tdeeUsado: c.proposta.tdeeUsado,
        motivo: `TDEE adaptativo ${fmt(c.tdee.tdee, 0)} kcal; a meta usava ${fmt(c.meta.tdeeUsado, 0)} kcal`,
        origem: 'checkin',
        estado,
      });
    }
    await setDef('ultimoCheckin', c.seg);
    ir('hoje');
  }
</script>

<Topo titulo="Check-in semanal" voltar="#/hoje" />

{#if c}
  <div class="estreito">
    <section class="cartao">
      <h2>Peso até {fmtData(c.dom)}</h2>
      <div class="grelha2">
        <div>
          <p class="sub">Média 7 dias</p>
          <p class="num medio">{fmt(c.tend.media, 1, true)} <small>kg</small></p>
        </div>
        <div>
          <p class="sub">Variação semanal</p>
          <p class="num medio">{fmtSinal(c.tend.variacao, 2)} <small>kg</small></p>
        </div>
      </div>
    </section>

    <section class="cartao">
      <h2>TDEE</h2>
      <div class="grelha2">
        <div>
          <p class="sub">Adaptativo (28 dias)</p>
          <p class="num medio">{fmt(c.tdee.tdee, 0)} <small>kcal</small></p>
        </div>
        <div>
          <p class="sub">Usado na meta</p>
          <p class="num medio">{fmt(c.meta?.tdeeUsado, 0)} <small>kcal</small></p>
        </div>
      </div>
      <p class="sub espaco">
        {#if c.tdee.faltam}
          Faltam {c.tdee.faltam} dias completos para calcular o TDEE adaptativo (são precisos 14 nos últimos 28).
        {:else if c.tdee.tdee == null}
          Faltam pesos no início ou no fim dos 28 dias para calcular o TDEE adaptativo.
        {:else if !c.meta}
          Ainda não tens metas. Define-as em Mais › Metas.
        {:else if c.dif == null}
          A meta atual não tem TDEE guardado, por isso não há comparação.
        {:else}
          Diferença: {fmtSinal(c.dif, 0)} kcal.
          {Math.abs(c.dif) > 150
            ? 'Passa das 150 kcal, por isso proponho metas novas.'
            : 'Fica dentro das 150 kcal: as metas mantêm-se.'}
        {/if}
      </p>
    </section>

    {#if c.proposta && c.meta}
      <section class="cartao">
        <h2>Metas propostas</h2>
        <div class="grelha2">
          <div>
            <p class="sub">Kcal treino</p>
            <p class="num medio">{fmt(c.meta.kcalTreino, 0)} → {fmt(c.proposta.kcalTreino, 0)}</p>
          </div>
          <div>
            <p class="sub">Kcal descanso</p>
            <p class="num medio">{fmt(c.meta.kcalDescanso, 0)} → {fmt(c.proposta.kcalDescanso, 0)}</p>
          </div>
        </div>
        <p class="sub espaco">O défice e a proteína ficam iguais. A escolha fica no histórico das metas.</p>
        {#if c.proposta.kcalTreino < 1800 || c.proposta.kcalDescanso < 1800}
          <p class="nota-aviso">Aviso: a proposta tem uma meta abaixo de 1800 kcal.</p>
        {/if}
        <button class="btn pri largo gr" onclick={() => concluir('aceite')}>Aceitar metas novas</button>
        <button class="btn largo gr" onclick={() => concluir('recusada')}>Recusar e manter as atuais</button>
      </section>
    {:else}
      <button class="btn pri largo gr" onclick={() => concluir()}>Concluir check-in</button>
    {/if}
    <a class="btn largo" href="#/mais/resumo">Ver resumo semanal</a>
  </div>
{/if}

<style>
  small {
    font-size: 14px;
    font-weight: 600;
    color: var(--texto2);
  }
</style>
