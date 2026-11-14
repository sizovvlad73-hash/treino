<script lang="ts">
  import { comecarSessao, sessaoAtiva } from '../../lib/acoes';
  import { ativos, db } from '../../lib/db';
  import { DIAS } from '../../lib/formato';
  import { ir } from '../../lib/rota.svelte';
  import type { Rotina } from '../../lib/tipos';
  import { vivo } from '../../lib/vivo.svelte';

  const rotinas = vivo(async () => (await ativos(db.rotinas)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt')), []);
  const ativa = vivo(sessaoAtiva, undefined);

  const comecar = async (r?: Rotina) => ir('ginasio/sessao/' + (await comecarSessao(r)));
  const dias = (r: Rotina) => r.diasSemana.map((d) => DIAS[d - 1]).join(', ') || 'sem dias fixos';
</script>

{#if ativa.v}
  <section class="cartao aviso">
    <b>Sessão em curso</b>
    <p class="sub">Termina-a ou cancela-a antes de começares outra.</p>
    <button class="btn pri largo" onclick={() => ir('ginasio/sessao/' + ativa.v!.id)}>Continuar sessão</button>
  </section>
{/if}

<div class="duas">
  {#each rotinas.v as r (r.id)}
    <section class="cartao linha">
      <a class="cresce" href={'#/ginasio/rotina/' + r.id}>
        <b>{r.nome}</b>
        <p class="sub">{dias(r)} · {r.itens.length} exercícios · editar ›</p>
      </a>
      <button class="btn pri" disabled={!!ativa.v} onclick={() => comecar(r)}>Começar</button>
    </section>
  {:else}
    <p class="cartao vazio">
      Sem rotinas. Cria uma (ex. «Push A») com os exercícios, as séries e o intervalo de repetições.
    </p>
  {/each}
</div>

<div class="grelha2">
  <a class="btn" href="#/ginasio/rotina/nova">+ Nova rotina</a>
  <button class="btn" disabled={!!ativa.v} onclick={() => comecar()}>Treino vazio</button>
</div>
