<script lang="ts">
  // Check-in de 30 segundos: passos, sono e energia. O resto fica atrás de «mais». Tudo opcional.
  import { mudarDia } from '../lib/comida';
  import { db } from '../lib/db';
  import { fmt } from '../lib/formato';
  import type { Dia } from '../lib/tipos';
  import { vivo } from '../lib/vivo.svelte';
  import Num from './Num.svelte';

  let { data }: { data: string } = $props();

  const dia = vivo(
    async () => (await db.dias.where('data').equals(data).toArray()).find((x) => !x.apagado) ?? null,
    undefined,
  );

  const vazio = () => ({
    passos: null as number | null,
    sonoH: null as number | null,
    energia: null as number | null,
    kcalAtivas: null as number | null,
    sonoQualidade: null as number | null,
    hrv: null as number | null,
    fcRepouso: null as number | null,
    stress: null as number | null,
  });
  type Campo = keyof ReturnType<typeof vazio>;
  const CAMPOS = Object.keys(vazio()) as Campo[];
  const EXTRA: Campo[] = ['kcalAtivas', 'sonoQualidade', 'hrv', 'fcRepouso', 'stress'];

  let f = $state(vazio());
  let editar = $state(false);
  let mais = $state(false);

  const tem = (d: Dia | null | undefined, campos: Campo[]) => !!d && campos.some((k) => d[k] != null);
  const feito = $derived(tem(dia.v, CAMPOS));

  function abrir() {
    for (const k of CAMPOS) f[k] = dia.v?.[k] ?? null;
    mais = tem(dia.v, EXTRA);
    editar = true;
  }
  async function guardar() {
    await mudarDia(data, { ...f });
    editar = false;
  }

  const resumo = $derived.by(() => {
    const d = dia.v;
    if (!d) return '';
    return [
      d.passos != null && `${fmt(d.passos, 0)} passos`,
      d.sonoH != null && `${fmt(d.sonoH, 1)} h de sono`,
      d.energia != null && `energia ${d.energia}/5`,
      d.kcalAtivas != null && `${fmt(d.kcalAtivas, 0)} kcal ativas`,
      d.sonoQualidade != null && `sono ${d.sonoQualidade}/5`,
      d.hrv != null && `HRV ${fmt(d.hrv, 0)}`,
      d.fcRepouso != null && `FC ${fmt(d.fcRepouso, 0)}`,
      d.stress != null && `stress ${d.stress}/5`,
    ]
      .filter(Boolean)
      .join(' · ');
  });
</script>

{#snippet escala(nome: string, k: Campo)}
  <div class="campo">
    <span>{nome}</span>
    <div class="seg">
      {#each [1, 2, 3, 4, 5] as v (v)}
        <button type="button" class:on={f[k] === v} aria-pressed={f[k] === v} onclick={() => (f[k] = f[k] === v ? null : v)}>
          {v}
        </button>
      {/each}
    </div>
  </div>
{/snippet}

{#if dia.v !== undefined}
  <section class="cartao">
    <div class="linha entre">
      <h2>Check-in</h2>
      {#if feito && !editar}<button class="btn fino" onclick={abrir}>Editar</button>{/if}
    </div>
    {#if editar}
      <div class="grelha2">
        <label class="campo"><span>Passos</span><Num bind:valor={f.passos} casas={0} /></label>
        <label class="campo"><span>Sono (horas)</span><Num bind:valor={f.sonoH} /></label>
      </div>
      {@render escala('Energia (1 = sem energia, 5 = cheio de energia)', 'energia')}
      {#if mais}
        <div class="grelha2">
          <label class="campo"><span>Kcal ativas (relógio)</span><Num bind:valor={f.kcalAtivas} casas={0} /></label>
          <label class="campo"><span>HRV (ms)</span><Num bind:valor={f.hrv} casas={0} /></label>
          <label class="campo"><span>FC em repouso (bpm)</span><Num bind:valor={f.fcRepouso} casas={0} /></label>
        </div>
        {@render escala('Qualidade do sono (1–5)', 'sonoQualidade')}
        {@render escala('Stress (1 = calmo, 5 = muito stress)', 'stress')}
        <p class="sub">As kcal ativas são só informativas; não entram em nenhuma conta.</p>
      {:else}
        <button class="btn largo" onclick={() => (mais = true)}>Mais (kcal ativas, sono, HRV, FC, stress)</button>
      {/if}
      <button class="btn pri largo gr" onclick={guardar}>Guardar check-in</button>
    {:else if feito}
      <p class="num">{resumo}</p>
    {:else}
      <p class="sub">Passos, sono e energia de hoje. Demora 30 segundos e é tudo opcional.</p>
      <button class="btn largo gr" onclick={abrir}>Fazer check-in</button>
    {/if}
  </section>
{/if}
