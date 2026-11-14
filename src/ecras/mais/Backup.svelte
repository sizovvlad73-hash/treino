<script lang="ts">
  import { onMount } from 'svelte';
  import Folha from '../../componentes/Folha.svelte';
  import Topo from '../../componentes/Topo.svelte';
  import { exportar, restaurar, validar, type Backup } from '../../lib/backup';
  import { def } from '../../lib/db';
  import { diaLocal, fmtData } from '../../lib/formato';
  import { vivo } from '../../lib/vivo.svelte';

  const ultimo = vivo(() => def<string | null>('ultimoBackup', null), null);
  let pendente = $state.raw<{ backup: Backup; contagens: [string, number][] } | null>(null);
  let confirmar = $state(false);
  let erro = $state('');
  let persistente = $state<boolean | null>(null);

  onMount(async () => {
    persistente = (await navigator.storage?.persisted?.()) ?? null;
  });

  async function escolher(e: Event & { currentTarget: HTMLInputElement }) {
    const ficheiro = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!ficheiro) return;
    const r = validar(await ficheiro.text());
    if ('erro' in r) {
      erro = r.erro;
      return;
    }
    erro = '';
    pendente = r;
    confirmar = true;
  }

  async function substituir() {
    if (!pendente) return;
    await restaurar(pendente.backup);
    location.reload();
  }
</script>

<Topo titulo="Backup" voltar="#/mais" />

<div class="estreito">
  <section class="cartao">
    <h2>Exportar</h2>
    <p class="sub">
      {ultimo.v ? `Último backup: ${fmtData(diaLocal(new Date(ultimo.v)))}.` : 'Ainda não fizeste nenhum backup.'}
      Guarda o ficheiro fora deste aparelho (iCloud, e-mail, PC).
    </p>
    <button class="btn pri largo gr" onclick={exportar}>Exportar backup (JSON)</button>
  </section>

  <section class="cartao">
    <h2>Restaurar</h2>
    <p class="sub">Substitui todos os dados da app pelos de um backup. Pergunta antes de substituir.</p>
    {#if erro}<p class="erro">{erro}</p>{/if}
    <label class="btn largo">
      Escolher ficheiro de backup…
      <input type="file" accept="application/json,.json" hidden onchange={escolher} />
    </label>
  </section>

  {#if persistente != null}
    <p class="sub">
      {persistente
        ? 'O armazenamento é persistente: o sistema não apaga os dados sozinho.'
        : 'O armazenamento ainda não é persistente. Instala a app no ecrã principal e faz backups regulares.'}
    </p>
  {/if}
</div>

<Folha bind:aberta={confirmar} titulo="Substituir todos os dados?">
  {#if pendente}
    <p class="sub">
      Backup de {fmtData(diaLocal(new Date(pendente.backup.exportadoEm)))}. Os dados atuais deste aparelho são
      apagados e substituídos por:
    </p>
    <ul class="lista">
      {#each pendente.contagens as [tabela, n] (tabela)}
        <li class="item"><span class="cresce">{tabela}</span><b class="num">{n}</b></li>
      {/each}
    </ul>
    <button class="btn perigo largo gr" onclick={substituir}>Substituir tudo</button>
    <button class="btn largo" onclick={() => (confirmar = false)}>Cancelar</button>
  {/if}
</Folha>
