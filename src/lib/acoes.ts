// Operações sobre a base de dados usadas por mais de um ecrã.
import { apagar, ativos, atualizar, criar, db } from './db';
import { hoje } from './formato';
import type { Rotina, Serie, Sessao } from './tipos';

export const obterPerfil = async () => (await ativos(db.perfil))[0];

/** Só um peso por dia: registar outra vez no mesmo dia substitui o anterior. */
export async function guardarPeso(data: string, kg: number) {
  const existente = (await db.pesos.where('data').equals(data).toArray()).find((p) => !p.apagado);
  if (existente) await atualizar(db.pesos, existente.id, { kg });
  else await criar(db.pesos, { data, kg });
}

export const sessaoAtiva = async () => (await ativos(db.sessoes)).find((s) => !s.fim);

/** Começa uma sessão (ou devolve a que já está em curso). */
export async function comecarSessao(rotina?: Rotina): Promise<string> {
  const ativa = await sessaoAtiva();
  if (ativa) return ativa.id;
  const s = await criar(db.sessoes, {
    rotinaId: rotina?.id ?? null,
    data: hoje(),
    inicio: new Date().toISOString(),
    fim: null,
    exercicioIds: rotina?.itens.map((i) => i.exercicioId) ?? [],
    nota: '',
    notaDor: '',
  });
  return s.id;
}

export async function apagarSessao(id: string) {
  const series = await db.series.where('sessaoId').equals(id).toArray();
  for (const s of series) await apagar(db.series, s.id);
  await apagar(db.sessoes, id);
}

/** Sessões (da mais antiga para a mais recente) com as séries de um exercício. */
export async function historicoExercicio(exercicioId: string): Promise<{ sessao: Sessao; series: Serie[] }[]> {
  const sessoes = new Map((await ativos(db.sessoes)).map((s) => [s.id, s]));
  const grupos = new Map<string, Serie[]>();
  for (const s of await db.series.where('exercicioId').equals(exercicioId).toArray()) {
    if (s.apagado || !sessoes.has(s.sessaoId)) continue;
    if (!grupos.has(s.sessaoId)) grupos.set(s.sessaoId, []);
    grupos.get(s.sessaoId)!.push(s);
  }
  return [...grupos]
    .map(([id, series]) => ({ sessao: sessoes.get(id)!, series: series.sort((a, b) => a.ordem - b.ordem) }))
    .sort((a, b) => (a.sessao.inicio < b.sessao.inicio ? -1 : 1));
}

/** Para cada exercício da sessão, as séries da última sessão terminada antes dela. */
export async function ultimaVez(s: Sessao): Promise<Record<string, Serie[]>> {
  const r: Record<string, Serie[]> = {};
  for (const e of s.exercicioIds) {
    const h = (await historicoExercicio(e)).filter((x) => x.sessao.fim && x.sessao.inicio < s.inicio);
    if (h.length) r[e] = h[h.length - 1].series;
  }
  return r;
}
