<script lang="ts">
  import { rota } from '../../lib/rota.svelte';
  import { definirTema, tema, type Tema } from '../../lib/tema.svelte';
  import { apagarExemplo, carregarExemplo, contarExemplo } from '../../lib/exemplo';
  import { vivo } from '../../lib/vivo.svelte';
  import Backup from './Backup.svelte';
  import CheckinSemanal from './CheckinSemanal.svelte';
  import Exportar from './Exportar.svelte';
  import Resumo from './Resumo.svelte';
  import Metas from './Metas.svelte';
  import Perfil from './Perfil.svelte';

  const TEMAS: [Tema, string][] = [
    ['escuro', 'Escuro'],
    ['claro', 'Claro'],
    ['sistema', 'Sistema'],
  ];
  const ENTRADAS = [
    ['perfil', 'Perfil', 'Dados pessoais, objetivo, TMB e TDEE'],
    ['metas', 'Metas', 'Kcal, proteína e sal, com histórico'],
    ['resumo', 'Resumo semanal', 'Médias da semana, adesão e TDEE adaptativo'],
    ['checkin', 'Check-in semanal', 'Tendência do peso e revisão das metas'],
    ['exportar', 'Exportar para o Claude', 'Texto com os teus dados, pronto a copiar'],
    ['backup', 'Backup', 'Exportar e restaurar os dados'],
  ];

  const exemplo = vivo(contarExemplo, 0);
  let ocupado = $state(false);
  async function fazer(f: () => Promise<void>) {
    ocupado = true;
    try {
      await f();
    } finally {
      ocupado = false;
    }
  }
</script>

{#if rota.p[1] === 'perfil'}
  <Perfil />
{:else if rota.p[1] === 'metas'}
  <Metas />
{:else if rota.p[1] === 'resumo'}
  <Resumo />
{:else if rota.p[1] === 'checkin'}
  <CheckinSemanal />
{:else if rota.p[1] === 'exportar'}
  <Exportar />
{:else if rota.p[1] === 'backup'}
  <Backup />
{:else}
  <header class="topo"><h1>Mais</h1></header>
  <div class="estreito">
    <ul class="cartao lista">
      {#each ENTRADAS as [id, nome, texto] (id)}
        <li>
          <a class="item" href={'#/mais/' + id}>
            <div class="cresce"><b>{nome}</b><p class="sub">{texto}</p></div>
            <span class="sub">›</span>
          </a>
        </li>
      {/each}
    </ul>
    <section class="cartao">
      <h2>Tema</h2>
      <div class="seg">
        {#each TEMAS as [id, nome] (id)}
          <button class:on={tema.v === id} onclick={() => definirTema(id)}>{nome}</button>
        {/each}
      </div>
    </section>
    <section class="cartao">
      <h2>Dados de exemplo</h2>
      <p class="sub">
        {exemplo.v
          ? `Há ${exemplo.v} registos de exemplo carregados. Não entram no backup.`
          : 'Carrega 30 dias de peso, comida, atividade e treinos para experimentares a app. Não entram no backup e os teus dados não são alterados.'}
      </p>
      <button class="btn largo gr" disabled={ocupado} onclick={() => fazer(carregarExemplo)}>
        {exemplo.v ? 'Carregar dados de exemplo outra vez' : 'Carregar dados de exemplo'}
      </button>
      {#if exemplo.v}
        <button class="btn perigo largo" disabled={ocupado} onclick={() => fazer(apagarExemplo)}>
          Apagar dados de exemplo
        </button>
      {/if}
    </section>
  </div>
{/if}
