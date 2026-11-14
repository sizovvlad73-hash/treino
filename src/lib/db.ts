import Dexie, { type Table } from 'dexie';
import { BIBLIOTECA } from '../dados/exercicios';
import type {
  Alimento,
  Base,
  Definicao,
  Dia,
  EntradaDiario,
  Exercicio,
  Medida,
  Meta,
  Modelo,
  Perfil,
  Peso,
  Rotina,
  Serie,
  Sessao,
} from './tipos';

export const VERSAO_ESQUEMA = 3;

class BD extends Dexie {
  perfil!: Table<Perfil, string>;
  metas!: Table<Meta, string>;
  pesos!: Table<Peso, string>;
  medidas!: Table<Medida, string>;
  exercicios!: Table<Exercicio, string>;
  rotinas!: Table<Rotina, string>;
  sessoes!: Table<Sessao, string>;
  series!: Table<Serie, string>;
  definicoes!: Table<Definicao, string>;
  dias!: Table<Dia, string>;
  alimentos!: Table<Alimento, string>;
  diario!: Table<EntradaDiario, string>;
  modelos!: Table<Modelo, string>;

  constructor() {
    super('treino');
    this.version(1).stores({
      perfil: 'id, apagado',
      metas: 'id, apagado, data',
      pesos: 'id, apagado, data',
      medidas: 'id, apagado, data, tipo',
      exercicios: 'id, apagado, grupoPrimario, favorito, arquivado',
      rotinas: 'id, apagado',
      sessoes: 'id, apagado, data',
      series: 'id, apagado, sessaoId, exercicioId',
      definicoes: 'chave',
    });
    // Fase 2: comida
    this.version(2).stores({
      dias: 'id, apagado, data, completo',
      alimentos: 'id, apagado, favorito, codigoBarras',
      diario: 'id, apagado, data, alimentoId',
      modelos: 'id, apagado',
    });
    // Fase 3: campos de atividade em `dias` e marca `exemplo` (sem índices novos).
    this.version(3).stores({});
  }
}

export const db = new BD();

const agora = () => new Date().toISOString();

export function uuid(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  // Fora de HTTPS (ex. teste na rede local) não há randomUUID.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 15) | 64;
  b[8] = (b[8] & 63) | 128;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export async function criar<T extends Base>(t: Table<T, string>, dados: Omit<T, keyof Base>): Promise<T> {
  const r = { ...dados, id: uuid(), criadoEm: agora(), atualizadoEm: agora(), apagado: 0 } as unknown as T;
  await t.add(r);
  return r;
}

export async function atualizar<T extends Base>(t: Table<T, string>, id: string, mudancas: Partial<T>) {
  await (t as Table<any, string>).update(id, { ...mudancas, atualizadoEm: agora() });
}

/** Apagar = marcar como apagado. */
export const apagar = <T extends Base>(t: Table<T, string>, id: string) =>
  atualizar(t as Table<any, string>, id, { apagado: 1 });

export const ativos = <T extends Base>(t: Table<T, string>): Promise<T[]> => t.where('apagado').equals(0).toArray();

export async function def<T>(chave: string, omissao: T): Promise<T> {
  const d = await db.definicoes.get(chave);
  return d ? (d.valor as T) : omissao;
}
export const setDef = (chave: string, valor: unknown) => db.definicoes.put({ chave, valor });

/** Copia para a base de dados os exercícios da biblioteca que ainda lá não estão. */
export async function semear() {
  const tem = new Set(await db.exercicios.toCollection().primaryKeys());
  const faltam = BIBLIOTECA.filter((e) => !tem.has(e.id));
  if (!faltam.length) return;
  const t = agora();
  await db.exercicios.bulkAdd(
    faltam.map((e) => ({ ...e, criadoEm: t, atualizadoEm: t, apagado: 0, favorito: 0, arquivado: 0, meu: 0 })),
  );
}
