<script lang="ts">
  import Folha from '../../componentes/Folha.svelte';
  import { atualizar, criar, db } from '../../lib/db';
  import {
    CARGAS,
    EQUIPAMENTOS,
    GRUPOS,
    type Equipamento,
    type Exercicio,
    type Grupo,
    type TipoCarga,
  } from '../../lib/tipos';

  let { aberta = $bindable(false), exercicio = null }: { aberta: boolean; exercicio?: Exercicio | null } = $props();

  let nome = $state('');
  let grupoPrimario = $state<Grupo>('peito');
  let gruposSecundarios = $state<Grupo[]>([]);
  let equipamento = $state<Equipamento>('barra');
  let tipoCarga = $state<TipoCarga>('total');
  let composto = $state(true);

  $effect(() => {
    if (!aberta) return;
    const e = exercicio;
    nome = e?.nome ?? '';
    grupoPrimario = e?.grupoPrimario ?? 'peito';
    gruposSecundarios = [...(e?.gruposSecundarios ?? [])];
    equipamento = e?.equipamento ?? 'barra';
    tipoCarga = e?.tipoCarga ?? 'total';
    composto = e ? !!e.composto : true;
  });

  function alternar(g: Grupo) {
    gruposSecundarios = gruposSecundarios.includes(g)
      ? gruposSecundarios.filter((x) => x !== g)
      : [...gruposSecundarios, g];
  }

  async function guardar() {
    if (!nome.trim()) return;
    const d = {
      nome: nome.trim(),
      grupoPrimario,
      gruposSecundarios: gruposSecundarios.filter((g) => g !== grupoPrimario),
      equipamento,
      tipoCarga,
      composto: (composto ? 1 : 0) as 0 | 1,
    };
    if (exercicio) await atualizar(db.exercicios, exercicio.id, d);
    else await criar(db.exercicios, { ...d, favorito: 0, arquivado: 0, meu: 1 });
    aberta = false;
  }
</script>

<Folha bind:aberta titulo={exercicio ? 'Editar exercício' : 'Criar exercício'}>
  <label class="campo"><span>Nome</span><input bind:value={nome} placeholder="ex. Remada no TRX" /></label>
  <div class="grelha2">
    <label class="campo">
      <span>Grupo primário</span>
      <select bind:value={grupoPrimario}>
        {#each Object.entries(GRUPOS) as [g, n] (g)}<option value={g}>{n}</option>{/each}
      </select>
    </label>
    <label class="campo">
      <span>Equipamento</span>
      <select bind:value={equipamento}>
        {#each Object.entries(EQUIPAMENTOS) as [e, n] (e)}<option value={e}>{n}</option>{/each}
      </select>
    </label>
  </div>
  <div class="campo">
    <span>Grupos secundários</span>
    <div class="chips quebra">
      {#each Object.entries(GRUPOS) as [g, n] (g)}
        {#if g !== grupoPrimario}
          <button class="chip" class:on={gruposSecundarios.includes(g as Grupo)} onclick={() => alternar(g as Grupo)}>
            {n}
          </button>
        {/if}
      {/each}
    </div>
  </div>
  <label class="campo">
    <span>Tipo de carga</span>
    <select bind:value={tipoCarga}>
      {#each Object.entries(CARGAS) as [c, n] (c)}<option value={c}>{n}</option>{/each}
    </select>
  </label>
  <div class="seg">
    <button class:on={composto} onclick={() => (composto = true)}>Composto</button>
    <button class:on={!composto} onclick={() => (composto = false)}>Isolamento</button>
  </div>
  <button class="btn pri largo gr" onclick={guardar}>Guardar</button>
</Folha>
