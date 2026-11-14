<script lang="ts">
  import CheckinDia from '../../componentes/CheckinDia.svelte';
  import FolhaRegisto from '../../componentes/FolhaRegisto.svelte';
  import Folha from '../../componentes/Folha.svelte';
  import Num from '../../componentes/Num.svelte';
  import { comecarSessao, guardarPeso, obterPerfil } from '../../lib/acoes';
  import ResumoComida from '../../componentes/ResumoComida.svelte';
  import { tendencia } from '../../lib/calculos';
  import { dadosDoDia } from '../../lib/comida';
  import { ativos, db, def } from '../../lib/db';
  import { diaLocal, diaSemana, difDias, fmt, fmtDataLonga, fmtSinal, hoje, inicioSemana } from '../../lib/formato';
  import { ir } from '../../lib/rota.svelte';
  import type { Perfil, Peso, Rotina } from '../../lib/tipos';
  import { vivo } from '../../lib/vivo.svelte';

  const dia = hoje();
  const pesos = vivo(() => ativos(db.pesos), []);
  const rotinas = vivo(() => ativos(db.rotinas), []);
  const sessoes = vivo(() => ativos(db.sessoes), []);
  const info = vivo(
    async () => ({
      backup: await def<string | null>('ultimoBackup', null),
      checkin: await def<string | null>('ultimoCheckin', null),
      perfil: await obterPerfil(),
      pronto: true,
    }),
    { backup: null as string | null, checkin: null as string | null, perfil: undefined as Perfil | undefined, pronto: false },
  );

  const comida = vivo(() => dadosDoDia(dia), undefined);

  const pesoHoje = $derived(pesos.v.find((p) => p.data === dia));
  const tend = $derived(tendencia(pesos.v, dia));
  const ativa = $derived(sessoes.v.find((s) => !s.fim));
  const planeadas = $derived(rotinas.v.filter((r) => r.diasSemana.includes(diaSemana(dia))));
  const feita = (r: Rotina) => sessoes.v.some((s) => s.data === dia && s.rotinaId === r.id && s.fim);

  const diasBackup = $derived(info.v.backup ? difDias(diaLocal(new Date(info.v.backup)), dia) : null);
  const backupAntigo = $derived(
    info.v.pronto && (diasBackup == null ? pesos.v.length + sessoes.v.length > 0 : diasBackup > 7),
  );

  // Check-in semanal: fica pendente desde segunda até ser feito (só quando já há pesos).
  const checkinPendente = $derived(
    info.v.pronto && pesos.v.length > 0 && (info.v.checkin ?? '') < inicioSemana(dia),
  );

  let kg = $state<number | null>(null);
  let menu = $state(false);
  let folha = $state(false);
  let tipo = $state<'peso' | 'cintura'>('peso');
  let registo = $state.raw<Peso | null>(null);

  function abrir(t: 'peso' | 'cintura', r: Peso | null = null) {
    tipo = t;
    registo = r;
    menu = false;
    folha = true;
  }
  async function gravarPeso() {
    if (kg && kg > 0) await guardarPeso(dia, kg);
    kg = null;
  }
  const comecar = async (r: Rotina) => ir('ginasio/sessao/' + (await comecarSessao(r)));
</script>

<header class="topo">
  <div>
    <p class="sub">{fmtDataLonga(dia)}</p>
    <h1>Hoje</h1>
  </div>
</header>

{#if info.v.pronto && !info.v.perfil}
  <a class="cartao aviso" href="#/mais/perfil">
    <b>Preenche o teu perfil ›</b>
    <p class="sub">A altura, a idade e o objetivo servem para calcular as metas.</p>
  </a>
{/if}
{#if backupAntigo}
  <a class="cartao aviso" href="#/mais/backup">
    <b>{diasBackup == null ? 'Ainda não fizeste um backup ›' : `Último backup há ${diasBackup} dias ›`}</b>
    <p class="sub">Os dados só existem neste aparelho. Exporta um backup.</p>
  </a>
{/if}
{#if checkinPendente}
  <a class="cartao aviso" href="#/mais/checkin">
    <b>Check-in semanal por fazer ›</b>
    <p class="sub">Vê a tendência do peso e o TDEE adaptativo, e revê as metas.</p>
  </a>
{/if}

{#if comida.v}
  {@const c = comida.v}
  <section class="cartao">
    <div class="linha entre">
      <h2>Comida · dia de {c.tipo}</h2>
      <a class="sub" href="#/comida">Diário ›</a>
    </div>
    <div class="espaco">
      <ResumoComida t={c.totais} kcalMeta={c.kcalMeta} protMeta={c.meta?.proteinaG ?? null} salMax={c.meta?.salMaxG ?? null} />
    </div>
  </section>
{/if}

<div class="duas">
  <section class="cartao">
    <h2>Treino</h2>
    {#if ativa}
      <p class="sub">Tens uma sessão em curso.</p>
      <button class="btn pri largo" onclick={() => ir('ginasio/sessao/' + ativa.id)}>Continuar sessão</button>
    {:else if planeadas.length}
      {#each planeadas as r (r.id)}
        <div class="linha entre treino">
          <div class="cresce">
            <b>{r.nome}</b>
            <p class="sub">{r.itens.length} exercícios{feita(r) ? ' · feito hoje' : ''}</p>
          </div>
          <button class="btn pri" onclick={() => comecar(r)}>Começar</button>
        </div>
      {/each}
    {:else if rotinas.v.length}
      <p class="vazio">Hoje é dia de descanso. Se quiseres treinar, começa um treino no Ginásio.</p>
    {:else}
      <p class="vazio">Ainda não tens rotinas. Cria a primeira no Ginásio e ela aparece aqui nos dias certos.</p>
      <a class="btn largo" href="#/ginasio">Ir para o Ginásio</a>
    {/if}
  </section>

  <section class="cartao">
    <div class="linha entre">
      <h2>Peso</h2>
      <a class="sub" href="#/corpo">Ver gráfico ›</a>
    </div>
    {#if pesoHoje}
      <button class="item" onclick={() => abrir('peso', pesoHoje)}>
        <span class="num grande">{fmt(pesoHoje.kg, 1, true)}</span>
        <span class="sub">kg hoje · toca para corrigir</span>
      </button>
    {:else}
      <form
        class="linha espaco"
        onsubmit={(e) => {
          e.preventDefault();
          gravarPeso();
        }}
      >
        <Num bind:valor={kg} placeholder="Peso de hoje (kg)" aria-label="Peso de hoje em kg" />
        <button class="btn pri">Guardar</button>
      </form>
    {/if}
    <div class="grelha2 espaco">
      <div>
        <p class="sub">Média 7 dias</p>
        <p class="num medio">{fmt(tend.media, 1, true)} <small>kg</small></p>
      </div>
      <div>
        <p class="sub">Variação semanal</p>
        <p class="num medio">{fmtSinal(tend.variacao, 2)} <small>kg</small></p>
      </div>
    </div>
    {#if !pesos.v.length}
      <p class="sub espaco">Pesa-te em jejum todas as manhãs. A tendência aparece ao fim de uma semana.</p>
    {/if}
  </section>
</div>

<CheckinDia data={dia} />

<button class="btn pri largo gr" onclick={() => (menu = true)}>+ Registar</button>

<Folha bind:aberta={menu} titulo="Registar">
  <button class="btn largo gr" onclick={() => ir('comida/novo')}>Comida</button>
  <button class="btn largo gr" onclick={() => ir('comida/rapida')}>Entrada rápida (kcal e proteína)</button>
  <button class="btn largo gr" onclick={() => abrir('peso')}>Peso</button>
  <button class="btn largo gr" onclick={() => abrir('cintura')}>Cintura</button>
</Folha>
<FolhaRegisto bind:aberta={folha} {tipo} {registo} />

<style>
  .treino + .treino {
    margin-top: 12px;
  }
  small {
    font-size: 14px;
    font-weight: 600;
    color: var(--texto2);
  }
</style>
