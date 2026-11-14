<script lang="ts">
  import Num from '../../componentes/Num.svelte';
  import Topo from '../../componentes/Topo.svelte';
  import { obterPerfil } from '../../lib/acoes';
  import { idade, metasKcal, pesoReferencia, tmbMifflin } from '../../lib/calculos';
  import { apagar, ativos, atualizar, criar, db } from '../../lib/db';
  import { fmt, fmtData, hoje } from '../../lib/formato';
  import type { Meta } from '../../lib/tipos';
  import { vivo } from '../../lib/vivo.svelte';

  const metas = vivo(async () => (await ativos(db.metas)).sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1)), []);
  const perfil = vivo(obterPerfil, undefined);
  const pesos = vivo(() => ativos(db.pesos), []);
  const rotinas = vivo(() => ativos(db.rotinas), []);

  const atual = $derived(metas.v.find((m) => m.estado === 'aceite'));
  let f = $state({
    kcalTreino: null as number | null,
    kcalDescanso: null as number | null,
    proteinaG: null as number | null,
    salMaxG: null as number | null,
    motivo: '',
  });
  let defice = $state<number | null>(null);
  let extra = $state<number | null>(null);
  let erro = $state('');

  // Preenche o formulário uma vez, quando os dados chegam.
  let temMeta = false;
  let temPerfil = false;
  $effect(() => {
    if (atual && !temMeta) {
      temMeta = true;
      Object.assign(f, {
        kcalTreino: atual.kcalTreino,
        kcalDescanso: atual.kcalDescanso,
        proteinaG: atual.proteinaG,
        salMaxG: atual.salMaxG,
      });
    }
    if (perfil.v && !temPerfil) {
      temPerfil = true;
      defice = perfil.v.deficeKcal;
      extra = perfil.v.extraTreinoKcal;
    }
  });

  const diasTreino = $derived(new Set(rotinas.v.flatMap((r) => r.diasSemana)).size);
  const tdee = $derived.by(() => {
    const p = perfil.v;
    const kg = pesoReferencia(pesos.v) ?? p?.pesoInicialKg;
    if (!p || !kg || !p.alturaCm || !p.dataNascimento) return null;
    return tmbMifflin(kg, p.alturaCm, idade(p.dataNascimento), p.sexo) * p.fatorAtividade;
  });
  const sug = $derived(tdee == null ? null : metasKcal(tdee, defice ?? 0, extra ?? 0, diasTreino));
  const arred = (v: number) => Math.round(v / 10) * 10;

  async function usarSugestao() {
    if (!sug || !perfil.v) return;
    f.kcalTreino = arred(sug.treino);
    f.kcalDescanso = arred(sug.descanso);
    await atualizar(db.perfil, perfil.v.id, { deficeKcal: defice ?? 0, extraTreinoKcal: extra ?? 0 });
  }

  async function guardar() {
    if (!f.kcalTreino || !f.kcalDescanso || !f.proteinaG) {
      erro = 'Preenche as kcal de treino, as kcal de descanso e a proteína.';
      return;
    }
    erro = '';
    const media = (diasTreino * f.kcalTreino + (7 - diasTreino) * f.kcalDescanso) / 7;
    await criar(db.metas, {
      data: hoje(),
      kcalTreino: f.kcalTreino,
      kcalDescanso: f.kcalDescanso,
      proteinaG: f.proteinaG,
      salMaxG: f.salMaxG,
      tdeeUsado: Math.round(media + (defice ?? 0)),
      motivo: f.motivo.trim(),
      origem: 'manual',
      estado: 'aceite',
    });
    f.motivo = '';
  }

  const CAMPOS: [keyof Meta, string, string][] = [
    ['kcalTreino', 'Kcal treino', 'kcal'],
    ['kcalDescanso', 'Kcal descanso', 'kcal'],
    ['proteinaG', 'Proteína', 'g'],
    ['salMaxG', 'Sal máximo', 'g'],
  ];
  /** Linhas "valor antigo → valor novo" em relação à meta aceite anterior. */
  function mudancas(m: Meta, i: number): string[] {
    const ant = metas.v.slice(i + 1).find((x) => x.estado === 'aceite');
    const v = (x: Meta, k: keyof Meta) => fmt(x[k] as number | null, 1);
    return CAMPOS.filter(([k]) => !ant || ant[k] !== m[k]).map(([k, nome, un]) =>
      ant ? `${nome}: ${v(ant, k)} → ${v(m, k)} ${un}` : `${nome}: ${v(m, k)} ${un}`,
    );
  }
</script>

<Topo titulo="Metas" voltar="#/mais" />

<div class="duas">
  <div>
    <section class="cartao">
      <h2>{atual ? 'Metas atuais' : 'Definir metas'}</h2>
      <div class="grelha2">
        <label class="campo"><span>Kcal em dia de treino</span><Num bind:valor={f.kcalTreino} casas={0} /></label>
        <label class="campo"><span>Kcal em dia de descanso</span><Num bind:valor={f.kcalDescanso} casas={0} /></label>
        <label class="campo"><span>Proteína (g)</span><Num bind:valor={f.proteinaG} casas={0} /></label>
        <label class="campo"><span>Sal máximo (g)</span><Num bind:valor={f.salMaxG} /></label>
      </div>
      <label class="campo">
        <span>Motivo da alteração</span>
        <input bind:value={f.motivo} placeholder="ex. peso parado há 2 semanas" />
      </label>
      {#if (f.kcalTreino && f.kcalTreino < 1800) || (f.kcalDescanso && f.kcalDescanso < 1800)}
        <p class="nota-aviso">Aviso: tens uma meta abaixo de 1800 kcal.</p>
      {/if}
      {#if erro}<p class="erro">{erro}</p>{/if}
      <button class="btn pri largo gr" onclick={guardar}>Guardar metas</button>
    </section>

    <section class="cartao">
      <h2>Sugestão a partir do TDEE</h2>
      {#if sug && tdee != null}
        <div class="grelha2">
          <label class="campo"><span>Défice (kcal/dia)</span><Num bind:valor={defice} casas={0} /></label>
          <label class="campo"><span>Extra no dia de treino</span><Num bind:valor={extra} casas={0} /></label>
        </div>
        <p class="sub">
          TDEE estimado {fmt(tdee, 0)} kcal · média diária {fmt(sug.media, 0)} kcal · {diasTreino} dias de treino
          por semana (pelas rotinas). Um défice negativo é um excedente.
        </p>
        <div class="grelha2 espaco">
          <div><p class="sub">Treino</p><p class="num medio">{fmt(arred(sug.treino), 0)}</p></div>
          <div><p class="sub">Descanso</p><p class="num medio">{fmt(arred(sug.descanso), 0)}</p></div>
        </div>
        <button class="btn largo" onclick={usarSugestao}>Usar estes valores</button>
      {:else}
        <p class="vazio">Preenche o perfil (nascimento, altura e peso inicial) para veres uma sugestão.</p>
        <a class="btn largo" href="#/mais/perfil">Ir para o perfil</a>
      {/if}
    </section>
  </div>

  <section class="cartao">
    <h2>Histórico</h2>
    <ul class="lista">
      {#each metas.v as m, i (m.id)}
        <li>
          <div class="cresce historico">
            <p class="sub">
              {fmtData(m.data)}{m.origem === 'checkin' ? ' · check-in' : ''}{m.estado === 'recusada'
                ? ' · recusada'
                : ''}
            </p>
            {#each mudancas(m, i) as l (l)}<p class="num">{l}</p>{:else}<p class="sub">Sem alterações.</p>{/each}
            {#if m.motivo}<p class="sub">Motivo: {m.motivo}</p>{/if}
          </div>
          <button class="btn fino perigo" aria-label="Apagar esta entrada" onclick={() => apagar(db.metas, m.id)}>
            ✕
          </button>
        </li>
      {:else}
        <li class="vazio">Sem metas. Define as primeiras; cada alteração fica guardada aqui.</li>
      {/each}
    </ul>
  </section>
</div>

<style>
  .historico {
    padding: 10px 0;
  }
  .historico .num {
    font-weight: 600;
  }
</style>
