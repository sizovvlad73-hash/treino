import { db, semear, setDef, VERSAO_ESQUEMA } from './db';
import { hoje } from './formato';

const TABELAS = ['perfil', 'metas', 'pesos', 'medidas', 'exercicios', 'rotinas', 'sessoes', 'series', 'definicoes'];
// Tabelas que só existem a partir de uma versão do esquema (um backup mais antigo não as tem).
const NOVAS: Record<string, number> = { dias: 2, alimentos: 2, diario: 2, modelos: 2 };
TABELAS.push(...Object.keys(NOVAS));

export interface Backup {
  app: string;
  versaoEsquema: number;
  exportadoEm: string;
  tabelas: Record<string, Record<string, unknown>[]>;
}

/** Exporta tudo para um ficheiro JSON. Devolve false se a partilha for cancelada. */
export async function exportar(): Promise<boolean> {
  const tabelas: Backup['tabelas'] = {};
  for (const t of TABELAS) tabelas[t] = (await db.table(t).toArray()).filter((r) => !r.exemplo); // sem dados de exemplo
  const agora = new Date();
  const b: Backup = { app: 'treino', versaoEsquema: VERSAO_ESQUEMA, exportadoEm: agora.toISOString(), tabelas };
  const nome = `treino-backup-${hoje()}.json`;
  const ficheiro = new File([JSON.stringify(b)], nome, { type: 'application/json' });
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [ficheiro] })) {
    try {
      await navigator.share({ files: [ficheiro] });
    } catch {
      return false;
    }
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(ficheiro);
    a.download = nome;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  await setDef('ultimoBackup', agora.toISOString());
  return true;
}

/** Valida o texto de um backup. Devolve o backup e o número de registos por tabela, ou um erro. */
export function validar(texto: string): { backup: Backup; contagens: [string, number][] } | { erro: string } {
  let b: Backup;
  try {
    b = JSON.parse(texto);
  } catch {
    return { erro: 'O ficheiro não é JSON válido.' };
  }
  if (!b || b.app !== 'treino' || typeof b.versaoEsquema !== 'number' || typeof b.tabelas !== 'object' || !b.tabelas)
    return { erro: 'Este ficheiro não é um backup desta app.' };
  if (b.versaoEsquema > VERSAO_ESQUEMA)
    return { erro: 'O backup foi feito numa versão mais recente da app. Atualiza a app primeiro.' };
  for (const t of TABELAS) {
    if (b.tabelas[t] === undefined && b.versaoEsquema < (NOVAS[t] ?? 0)) b.tabelas[t] = [];
    const linhas = b.tabelas[t];
    if (!Array.isArray(linhas)) return { erro: `Falta a tabela "${t}" no backup.` };
    const chave = t === 'definicoes' ? 'chave' : 'id';
    if (linhas.some((r) => !r || typeof r !== 'object' || typeof r[chave] !== 'string'))
      return { erro: `A tabela "${t}" tem registos inválidos.` };
  }
  return { backup: b, contagens: TABELAS.filter((t) => t !== 'definicoes').map((t) => [t, b.tabelas[t].length]) };
}

/** Substitui todos os dados pelos do backup. */
export async function restaurar(b: Backup) {
  await db.transaction('rw', db.tables, async () => {
    for (const t of TABELAS) {
      await db.table(t).clear();
      await db.table(t).bulkAdd(b.tabelas[t]);
    }
  });
  await setDef('ultimoBackup', b.exportadoEm);
  await semear();
}
