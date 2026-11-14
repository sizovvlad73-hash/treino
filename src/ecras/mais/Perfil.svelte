<script lang="ts">
  import { onMount } from 'svelte';
  import Num from '../../componentes/Num.svelte';
  import Topo from '../../componentes/Topo.svelte';
  import { obterPerfil } from '../../lib/acoes';
  import { FATORES, idade, pesoReferencia, projecao, ritmoAlto, tendencia, tmbMifflin } from '../../lib/calculos';
  import { ativos, atualizar, criar, db } from '../../lib/db';
  import { fmt, fmtData, hoje } from '../../lib/formato';
  import type { Fase, Sexo } from '../../lib/tipos';
  import { vivo } from '../../lib/vivo.svelte';

  let f = $state({
    dataNascimento: '',
    alturaCm: null as number | null,
    sexo: 'h' as Sexo,
    dataInicio: hoje(),
    pesoInicialKg: null as number | null,
    pesoAlvoKg: null as number | null,
    gorduraAlvoPct: null as number | null,
    ritmoAlvoKgSem: null as number | null,
    fase: 'cut' as Fase,
    faseInicio: hoje(),
    fatorAtividade: 1.375,
  });
  let id = $state<string | null>(null);
  let estado = $state('');
  const pesos = vivo(() => ativos(db.pesos), []);

  onMount(async () => {
    const p = await obterPerfil();
    if (!p) return;
    id = p.id;
    for (const k of Object.keys(f)) (f as Record<string, unknown>)[k] = (p as unknown as Record<string, unknown>)[k];
  });

  async function guardar() {
    if (!f.dataNascimento || !f.alturaCm) {
      estado = 'Preenche pelo menos a data de nascimento e a altura.';
      return;
    }
    if (id) await atualizar(db.perfil, id, { ...f });
    else {
      // Défice inicial a partir do ritmo alvo (1 kg ≈ 7700 kcal); edita-se nas Metas.
      const sinal = f.fase === 'cut' ? 1 : f.fase === 'bulk' ? -1 : 0;
      const deficeKcal = Math.round((sinal * Math.abs(f.ritmoAlvoKgSem ?? 0) * 7700) / 7 / 50) * 50;
      id = (await criar(db.perfil, { ...f, deficeKcal, extraTreinoKcal: 150 })).id;
    }
    estado = 'Guardado.';
  }

  const anos = $derived(f.dataNascimento ? idade(f.dataNascimento) : null);
  const ref = $derived(pesoReferencia(pesos.v) ?? f.pesoInicialKg);
  const tmb = $derived(ref && f.alturaCm && anos != null ? tmbMifflin(ref, f.alturaCm, anos, f.sexo) : null);
  const tend = $derived(tendencia(pesos.v));
  const chegada = $derived(
    tend.media != null && f.pesoAlvoKg ? projecao(tend.media, tend.variacao, f.pesoAlvoKg) : null,
  );
</script>

<Topo titulo="Perfil" voltar="#/mais" />

<div class="duas">
  <section class="cartao">
    <div class="grelha2">
      <label class="campo"><span>Data de nascimento</span><input type="date" bind:value={f.dataNascimento} /></label>
      <label class="campo">
        <span>Sexo</span>
        <select bind:value={f.sexo}><option value="h">Homem</option><option value="m">Mulher</option></select>
      </label>
      <label class="campo"><span>Altura (cm)</span><Num bind:valor={f.alturaCm} /></label>
      <label class="campo"><span>Data de início</span><input type="date" bind:value={f.dataInicio} /></label>
      <label class="campo"><span>Peso inicial (kg)</span><Num bind:valor={f.pesoInicialKg} /></label>
      <label class="campo"><span>Peso alvo (kg)</span><Num bind:valor={f.pesoAlvoKg} /></label>
      <label class="campo"><span>% de gordura alvo</span><Num bind:valor={f.gorduraAlvoPct} /></label>
      <label class="campo"><span>Ritmo alvo (kg/semana)</span><Num bind:valor={f.ritmoAlvoKgSem} casas={2} /></label>
      <label class="campo">
        <span>Fase atual</span>
        <select bind:value={f.fase}>
          <option value="cut">Cut</option><option value="manutencao">Manutenção</option><option value="bulk">Bulk</option>
        </select>
      </label>
      <label class="campo"><span>Início da fase</span><input type="date" bind:value={f.faseInicio} /></label>
    </div>
    <label class="campo">
      <span>Nível de atividade</span>
      <select bind:value={f.fatorAtividade}>
        {#each FATORES as [v, nome] (v)}<option value={v}>{nome} (× {fmt(v, 3)})</option>{/each}
      </select>
    </label>
    {#if f.ritmoAlvoKgSem && ref && ritmoAlto(f.ritmoAlvoKgSem, ref)}
      <p class="nota-aviso">O ritmo alvo é superior a 1 % do peso por semana ({fmt(ref * 0.01, 2)} kg).</p>
    {/if}
    {#if estado}<p class="sub" role="status">{estado}</p>{/if}
    <button class="btn pri largo gr" onclick={guardar}>Guardar perfil</button>
  </section>

  <section class="cartao">
    <h2>Calculadoras</h2>
    {#if tmb != null}
      <ul class="lista">
        <li class="item"><span class="cresce sub">Idade</span><b class="num">{anos} anos</b></li>
        <li class="item">
          <span class="cresce sub">Peso de referência{pesos.v.length ? ' (média 7 dias)' : ' (inicial)'}</span>
          <b class="num">{fmt(ref, 1, true)} kg</b>
        </li>
        <li class="item"><span class="cresce sub">TMB (Mifflin-St Jeor)</span><b class="num">{fmt(tmb, 0)} kcal</b></li>
        <li class="item">
          <span class="cresce sub">TDEE estimado (× {fmt(f.fatorAtividade, 3)})</span>
          <b class="num destaque">{fmt(tmb * f.fatorAtividade, 0)} kcal</b>
        </li>
      </ul>
      <p class="sub espaco">
        {#if chegada}
          Ao ritmo atual chegas ao peso alvo em {fmtData(chegada)}.
        {:else if tend.variacao == null}
          A projeção aparece quando tiveres duas semanas de pesos.
        {:else if f.pesoAlvoKg}
          Ao ritmo atual não te estás a aproximar do peso alvo.
        {:else}
          Indica o peso alvo para veres a projeção.
        {/if}
      </p>
    {:else}
      <p class="vazio">Preenche a data de nascimento, a altura e o peso inicial para veres a TMB e o TDEE.</p>
    {/if}
  </section>
</div>
