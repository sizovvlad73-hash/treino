// Formatos PT-PT. Os dias são texto AAAA-MM-DD, sempre calculados na hora local.
import type { TipoCarga } from './tipos';

const p2 = (n: number) => String(n).padStart(2, '0');

export const diaLocal = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const hoje = () => diaLocal(new Date());

export function paraData(dia: string): Date {
  const [a, m, d] = dia.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function somaDias(dia: string, n: number): string {
  const d = paraData(dia);
  d.setDate(d.getDate() + n);
  return diaLocal(d);
}

/** Dias de `a` até `b` (positivo se b for depois). */
export function difDias(a: string, b: string): number {
  const u = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((u(b) - u(a)) / 86400000);
}

/** 1 = segunda … 7 = domingo. */
export const diaSemana = (dia: string) => paraData(dia).getDay() || 7;
export const inicioSemana = (dia: string) => somaDias(dia, 1 - diaSemana(dia));
export const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function fmtData(dia: string): string {
  const [a, m, d] = dia.split('-');
  return `${d}/${m}/${a}`;
}
export const fmtDataCurta = (dia: string) => fmtData(dia).slice(0, 5);
export const fmtDataLonga = (dia: string) =>
  paraData(dia).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });

/** Número com vírgula decimal. `fixo` mantém os zeros à direita. */
export function fmt(v: number | null | undefined, casas = 1, fixo = false): string {
  if (v == null || !isFinite(v)) return '—';
  return (fixo ? v.toFixed(casas) : String(+v.toFixed(casas))).replace('.', ',').replace('-', '−');
}

export function fmtSinal(v: number | null | undefined, casas = 1): string {
  if (v == null || !isFinite(v)) return '—';
  return (v > 0 ? '+' : '') + fmt(v, casas, true);
}

export function lerNum(t: string): number | null {
  const n = parseFloat(t.replace('−', '-').replace(',', '.').replace(/[^\d.-]/g, ''));
  return isFinite(n) ? n : null;
}

/** Texto sem acentos e em minúsculas, para pesquisas. */
export const semAcentos = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();

export function fmtRelogio(seg: number): string {
  const s = Math.max(0, Math.ceil(seg));
  return `${Math.floor(s / 60)}:${p2(s % 60)}`;
}

export const minutosEntre = (inicio: string, fim: string | null) =>
  Math.max(1, Math.round(((fim ? Date.parse(fim) : Date.now()) - Date.parse(inicio)) / 60000));

export function fmtSerie(
  s: { kg: number; reps: number; tempoSeg: number | null; rir: number | null },
  tipo: TipoCarga,
): string {
  const base =
    tipo === 'tempo'
      ? `${s.tempoSeg ?? 0} s`
      : tipo === 'reps'
        ? `${s.reps} reps`
        : tipo === 'lastro'
          ? `PC${s.kg ? ` + ${fmt(s.kg, 2)} kg` : ''} × ${s.reps}`
          : `${fmt(s.kg, 2)} kg × ${s.reps}`;
  return base + (s.rir != null ? ` @${s.rir}` : '');
}
