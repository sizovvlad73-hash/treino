// Todas as regras de cálculo da SPEC ficam aqui.
import { hoje, somaDias } from './formato';
import type { Exercicio, Grupo, Serie, Sexo, TipoCarga } from './tipos';

export function idade(nascimento: string, em = hoje()): number {
  const [a, m, d] = nascimento.split('-').map(Number);
  const [A, M, D] = em.split('-').map(Number);
  return A - a - (M < m || (M === m && D < d) ? 1 : 0);
}

export const tmbMifflin = (kg: number, cm: number, anos: number, sexo: Sexo) =>
  10 * kg + 6.25 * cm - 5 * anos + (sexo === 'h' ? 5 : -161);

/** Só se usa quando houver % de gordura (Fase 4). */
export const tmbKatch = (kg: number, pctGordura: number) => 370 + 21.6 * kg * (1 - pctGordura / 100);

export const FATORES: [number, string][] = [
  [1.2, 'Sedentário'],
  [1.375, 'Ligeiramente ativo'],
  [1.55, 'Moderadamente ativo'],
  [1.725, 'Muito ativo'],
  [1.9, 'Extremamente ativo'],
];

type P = { data: string; kg: number };

/** Média dos pesos registados nos 7 dias que acabam em `dia`. */
export function mediaMovel(pesos: P[], dia: string): number | null {
  const de = somaDias(dia, -6);
  const v = pesos.filter((p) => p.data >= de && p.data <= dia);
  return v.length ? v.reduce((s, p) => s + p.kg, 0) / v.length : null;
}

/** Média de 7 dias e variação em relação à média de há uma semana. */
export function tendencia(pesos: P[], dia = hoje()) {
  const media = mediaMovel(pesos, dia);
  const antes = mediaMovel(pesos, somaDias(dia, -7));
  return { media, variacao: media != null && antes != null ? media - antes : null };
}

/** Peso de referência: média de 7 dias até ao último dia com registo. */
export function pesoReferencia(pesos: P[]): number | null {
  if (!pesos.length) return null;
  return mediaMovel(pesos, pesos.reduce((a, b) => (a.data > b.data ? a : b)).data);
}

/** Média = TDEE − défice. Treino tem +extra; o descanso compensa para manter a média semanal. */
export function metasKcal(tdee: number, defice: number, extra: number, diasTreino: number) {
  const media = tdee - defice;
  if (diasTreino <= 0 || diasTreino >= 7) return { media, treino: media, descanso: media };
  return { media, treino: media + extra, descanso: media - (extra * diasTreino) / (7 - diasTreino) };
}

/** Dia em que se chega ao peso alvo ao ritmo atual, ou null se o ritmo não aproxima do alvo. */
export function projecao(media: number, variacaoSem: number | null, alvo: number, dia = hoje()): string | null {
  const falta = alvo - media;
  if (Math.abs(falta) < 0.05) return dia;
  if (!variacaoSem || Math.sign(falta) !== Math.sign(variacaoSem)) return null;
  const dias = Math.ceil((falta / variacaoSem) * 7);
  return dias > 3650 ? null : somaDias(dia, dias);
}

/** Adesão diária: kcal dentro de ±10 % da meta e proteína ≥ 90 % da meta. */
export const adere = (kcal: number, proteina: number, kcalMeta: number, proteinaMeta: number) =>
  Math.abs(kcal - kcalMeta) <= kcalMeta * 0.1 && proteina >= proteinaMeta * 0.9;

/**
 * TDEE adaptativo nos 28 dias que acabam em `ate`. Só com 14 ou mais dias completos.
 * Média de kcal − (variação do peso médio × 7700 / dias). Perder peso dá um TDEE maior do que o que se comeu.
 */
export function tdeeAdaptativo(completos: { data: string; kcal: number }[], pesos: P[], ate: string) {
  const de = somaDias(ate, -27);
  const dias = completos.filter((d) => d.data >= de && d.data <= ate);
  const faltam = Math.max(0, 14 - dias.length);
  const fim = mediaMovel(pesos, ate);
  const inicio = mediaMovel(pesos, somaDias(ate, -21)); // primeiros 7 dias do período
  let tdee: number | null = null;
  if (!faltam && fim != null && inicio != null) {
    const kcal = dias.reduce((s, d) => s + d.kcal, 0) / dias.length;
    tdee = kcal - ((fim - inicio) * 7700) / 21; // 21 dias entre os dois períodos de 7 dias
  }
  return { tdee, completos: dias.length, faltam, semPeso: fim == null || inicio == null };
}

export const ritmoAlto =(kgSem: number, peso: number) => Math.abs(kgSem) > peso * 0.01;

/** Epley, só com 12 reps ou menos. */
export const e1rm = (kg: number, reps: number) => (kg > 0 && reps > 0 && reps <= 12 ? kg * (1 + reps / 30) : null);

/** Série efetiva: sem aquecimento e RIR ≤ 3 (RIR por preencher conta como efetiva). */
export const efetiva = (s: Serie) => !s.aquecimento && (s.rir == null || s.rir <= 3);

export function volumePorGrupo(series: Serie[], exs: Map<string, Exercicio>) {
  const v: Partial<Record<Grupo, number>> = {};
  for (const s of series) {
    const e = exs.get(s.exercicioId);
    if (!e || !efetiva(s)) continue;
    v[e.grupoPrimario] = (v[e.grupoPrimario] ?? 0) + 1;
    for (const g of e.gruposSecundarios) v[g] = (v[g] ?? 0) + 0.5;
  }
  return v;
}

function pontos(s: Serie, tipo: TipoCarga): number {
  if (tipo === 'tempo') return s.tempoSeg ?? 0;
  if (tipo === 'reps') return s.reps;
  if (tipo === 'lastro') return s.kg * 1000 + s.reps;
  return e1rm(s.kg, s.reps) ?? s.kg;
}

/** Melhor série sem aquecimento (maior 1RM estimado; reps ou tempo nos outros tipos de carga). */
export function melhorSerie(series: Serie[], tipo: TipoCarga): Serie | null {
  const t = series.filter((s) => !s.aquecimento);
  return t.length ? t.reduce((a, b) => (pontos(b, tipo) > pontos(a, tipo) ? b : a)) : null;
}

/** Dupla progressão a partir das séries da última vez. */
export function sugestao(
  ultimas: Serie[],
  alvo: { repsMin: number; repsMax: number } | undefined,
  composto: boolean,
): { kg: number; sobe: boolean } | null {
  const t = ultimas.filter((s) => !s.aquecimento);
  if (!t.length || !alvo) return null;
  const kg = Math.max(...t.map((s) => s.kg));
  const sobe = t.every((s) => s.reps >= alvo.repsMax);
  return { kg: sobe ? kg + (composto ? 2.5 : 1) : kg, sobe };
}
