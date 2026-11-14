<script lang="ts">
  import {
    CategoryScale,
    Chart,
    Legend,
    LinearScale,
    LineController,
    LineElement,
    PointElement,
    Tooltip,
  } from 'chart.js';
  import { fmt } from '../lib/formato';
  import { tema } from '../lib/tema.svelte';

  Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

  type Linha = { nome: string; dados: (number | null)[]; destaque?: boolean };
  let { rotulos, linhas }: { rotulos: string[]; linhas: Linha[] } = $props();
  let canvas: HTMLCanvasElement;

  $effect(() => {
    tema.v; // redesenha com as cores do tema
    const css = getComputedStyle(document.documentElement);
    const cor = (n: string) => css.getPropertyValue(n).trim();
    const g = new Chart(canvas, {
      type: 'line',
      data: {
        labels: rotulos,
        datasets: linhas.map((l) => ({
          label: l.nome,
          data: l.dados,
          borderColor: cor(l.destaque ? '--destaque' : '--texto2'),
          backgroundColor: cor(l.destaque ? '--destaque' : '--texto2'),
          borderWidth: l.destaque ? 3 : 1,
          pointRadius: l.destaque ? 0 : 2.5,
          pointHitRadius: 12,
          tension: 0.3,
          spanGaps: true,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: cor('--texto2'), usePointStyle: true, boxHeight: 6 } },
          tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.parsed.y, 1)}` } },
        },
        scales: {
          x: { ticks: { color: cor('--texto2'), maxTicksLimit: 6, maxRotation: 0 }, grid: { display: false } },
          y: { ticks: { color: cor('--texto2'), callback: (v) => fmt(Number(v), 1) }, grid: { color: cor('--linha') } },
        },
      },
    });
    return () => g.destroy();
  });
</script>

<div class="grafico"><canvas bind:this={canvas}></canvas></div>

<style>
  .grafico {
    position: relative;
    height: 240px;
  }
</style>
