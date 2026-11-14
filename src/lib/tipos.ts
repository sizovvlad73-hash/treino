// Tipos das tabelas. Campos sim/não indexados são 0/1 (o IndexedDB não indexa booleanos).
export type Bit = 0 | 1;

export interface Base {
  id: string;
  criadoEm: string; // instante ISO
  atualizadoEm: string;
  apagado: Bit;
  exemplo?: 1; // dado de exemplo: não entra no backup e apaga-se em Mais
}

export const GRUPOS = {
  peito: 'Peito',
  costas: 'Costas',
  ombros: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  antebracos: 'Antebraços',
  quadriceps: 'Quadríceps',
  posteriores: 'Posteriores',
  gluteos: 'Glúteos',
  gemeos: 'Gémeos',
  abdominais: 'Abdominais',
  lombar: 'Lombar',
} as const;
export type Grupo = keyof typeof GRUPOS;

export const EQUIPAMENTOS = {
  barra: 'Barra',
  halteres: 'Halteres',
  maquina: 'Máquina',
  cabo: 'Cabo',
  corporal: 'Peso corporal',
  kettlebell: 'Kettlebell',
  elastico: 'Elástico',
} as const;
export type Equipamento = keyof typeof EQUIPAMENTOS;

export const CARGAS = {
  total: 'kg total',
  halter: 'kg por halter',
  lastro: 'Peso corporal + lastro',
  reps: 'Só reps',
  tempo: 'Tempo',
} as const;
export type TipoCarga = keyof typeof CARGAS;

export type Sexo = 'h' | 'm';
export type Fase = 'cut' | 'manutencao' | 'bulk';

export interface Perfil extends Base {
  dataNascimento: string; // AAAA-MM-DD
  alturaCm: number | null;
  sexo: Sexo;
  dataInicio: string;
  pesoInicialKg: number | null;
  pesoAlvoKg: number | null;
  gorduraAlvoPct: number | null;
  ritmoAlvoKgSem: number | null;
  fase: Fase;
  faseInicio: string;
  fatorAtividade: number;
  deficeKcal: number; // negativo = excedente
  extraTreinoKcal: number;
}

export interface Meta extends Base {
  data: string;
  kcalTreino: number;
  kcalDescanso: number;
  proteinaG: number;
  salMaxG: number | null;
  tdeeUsado: number | null;
  motivo: string;
  origem: 'manual' | 'checkin';
  estado: 'aceite' | 'recusada';
}

export interface Peso extends Base {
  data: string;
  kg: number;
}

export type TipoMedida = 'cintura' | 'peito' | 'braco' | 'coxa' | 'anca' | 'pescoco';
export interface Medida extends Base {
  data: string;
  tipo: TipoMedida;
  cm: number;
}

export interface Exercicio extends Base {
  nome: string;
  grupoPrimario: Grupo;
  gruposSecundarios: Grupo[];
  equipamento: Equipamento;
  tipoCarga: TipoCarga;
  composto: Bit;
  favorito: Bit;
  arquivado: Bit;
  meu: Bit;
  passoKg?: number; // salto dos botões +/− (por omissão 2,5)
  nota?: string; // nota fixa do exercício (ex. posição do banco)
}

export interface ItemRotina {
  exercicioId: string;
  series: number;
  repsMin: number;
  repsMax: number;
  descansoSeg: number;
}

export interface Rotina extends Base {
  nome: string;
  diasSemana: number[]; // 1 = segunda … 7 = domingo
  itens: ItemRotina[];
}

export interface Sessao extends Base {
  rotinaId: string | null;
  data: string; // dia local
  inicio: string; // instante ISO
  fim: string | null; // null = sessão em curso
  exercicioIds: string[];
  nota: string;
  notaDor: string;
}

export interface Serie extends Base {
  sessaoId: string;
  exercicioId: string;
  ordem: number;
  kg: number;
  reps: number;
  tempoSeg: number | null;
  rir: number | null;
  aquecimento: Bit;
}

export interface Dia extends Base {
  data: string;
  tipo: 'treino' | 'descanso' | null; // null = automático (rotinas e sessões)
  fome: number | null;
  nota: string;
  completo: Bit;
  // Atividade e recuperação (Fase 3), tudo opcional.
  passos?: number | null;
  sonoH?: number | null;
  energia?: number | null; // 1–5
  kcalAtivas?: number | null; // só informativas
  sonoQualidade?: number | null; // 1–5
  hrv?: number | null;
  fcRepouso?: number | null;
  stress?: number | null; // 1–5
}

export interface Alimento extends Base {
  nome: string;
  marca: string;
  // por 100 g
  kcal: number;
  proteina: number;
  hidratos: number;
  gordura: number;
  fibra: number;
  sal: number;
  gPorUnidade: number | null;
  codigoBarras: string;
  fonte: 'rotulo' | 'off' | 'estimado';
  favorito: Bit;
}

export interface EntradaDiario extends Base {
  data: string;
  refeicao: string;
  alimentoId: string | null; // null = entrada rápida
  quantidade: number;
  unidade: 'g' | 'un';
  nome: string; // descrição da entrada rápida
  kcalRapida: number | null;
  proteinaRapida: number | null;
}

export interface Modelo extends Base {
  nome: string;
  itens: { alimentoId: string; gramas: number }[];
}

export interface Definicao {
  chave: string;
  valor: unknown;
}
