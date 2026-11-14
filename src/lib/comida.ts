// Dados e contas da área Comida.
import { ativos, atualizar, criar, db, def } from './db';
import { diaSemana, lerNum, semAcentos } from './formato';
import type { Alimento, Base, Dia, EntradaDiario } from './tipos';

export const REFEICOES = ['Pré-treino', 'Pequeno-almoço', 'Lanche 11h', 'Almoço', 'Lanche 17h', 'Lanche 20h', 'Jantar'];
export const obterRefeicoes = () => def<string[]>('refeicoes', REFEICOES);

const CHAVES = ['kcal', 'proteina', 'hidratos', 'gordura', 'fibra', 'sal'] as const;
export type Nutri = Record<(typeof CHAVES)[number], number>;
const zero = (): Nutri => ({ kcal: 0, proteina: 0, hidratos: 0, gordura: 0, fibra: 0, sal: 0 });

type Quantidade = Pick<EntradaDiario, 'alimentoId' | 'quantidade' | 'unidade' | 'kcalRapida' | 'proteinaRapida'>;

/** Nutrientes de uma entrada do diário (a entrada rápida só tem kcal e proteína). */
export function nutri(e: Quantidade, a?: Alimento): Nutri {
  const n = zero();
  if (!e.alimentoId) {
    n.kcal = e.kcalRapida ?? 0;
    n.proteina = e.proteinaRapida ?? 0;
  } else if (a) {
    const f = (e.unidade === 'un' ? e.quantidade * (a.gPorUnidade ?? 0) : e.quantidade) / 100;
    for (const k of CHAVES) n[k] = a[k] * f;
  }
  return n;
}

export const nutriGramas = (a: Alimento | undefined, gramas: number) =>
  nutri({ alimentoId: 'x', quantidade: gramas, unidade: 'g', kcalRapida: null, proteinaRapida: null }, a);

export function somar(l: Nutri[]): Nutri {
  const t = zero();
  for (const n of l) for (const k of CHAVES) t[k] += n[k];
  return t;
}

/** Altera (ou cria) o registo de um dia. */
export async function mudarDia(data: string, m: Partial<Dia>) {
  const d = (await db.dias.where('data').equals(data).toArray()).find((x) => !x.apagado);
  if (d) await atualizar(db.dias, d.id, m);
  else await criar(db.dias, { data, tipo: null, fome: null, nota: '', completo: 0, ...m } as Omit<Dia, keyof Base>);
}

/** Tudo o que os ecrãs precisam sobre a comida de um dia. */
export async function dadosDoDia(data: string) {
  const entradas = (await db.diario.where('data').equals(data).toArray())
    .filter((e) => !e.apagado)
    .sort((a, b) => (a.criadoEm < b.criadoEm ? -1 : 1));
  const alimentos = new Map((await db.alimentos.toArray()).map((a) => [a.id, a]));
  const dia = (await db.dias.where('data').equals(data).toArray()).find((x) => !x.apagado);

  // Meta em vigor nesse dia: a aceite mais recente com data igual ou anterior.
  const aceites = (await ativos(db.metas))
    .filter((m) => m.estado === 'aceite')
    .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));
  const meta = aceites.find((m) => m.data <= data) ?? aceites.at(-1);

  // Treino ou descanso: o que foi escolhido; senão, treino se houve sessão ou há rotina nesse dia da semana.
  let tipo = dia?.tipo ?? null;
  if (!tipo) {
    const treinou = (await db.sessoes.where('data').equals(data).toArray()).some((s) => !s.apagado);
    const planeado = (await ativos(db.rotinas)).some((r) => r.diasSemana.includes(diaSemana(data)));
    tipo = treinou || planeado ? 'treino' : 'descanso';
  }

  return {
    entradas,
    alimentos,
    dia,
    meta,
    tipo,
    totais: somar(entradas.map((e) => nutri(e, alimentos.get(e.alimentoId ?? '')))),
    kcalMeta: meta ? (tipo === 'treino' ? meta.kcalTreino : meta.kcalDescanso) : null,
  };
}

type NovoAlimento = Omit<Alimento, keyof Base>;

/** Lê alimentos de um CSV com cabeçalho. Aceita ; , ou tabulação e vírgula decimal. */
export function lerCsv(texto: string): { alimentos: NovoAlimento[]; ignoradas: number } | { erro: string } {
  const linhas = texto
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (linhas.length < 2) return { erro: 'O ficheiro não tem linhas de dados.' };
  const sep = linhas[0].includes(';') ? ';' : linhas[0].includes('\t') ? '\t' : ',';
  const partir = (l: string) => {
    const r: string[] = [];
    let atual = '';
    let aspas = false;
    for (const c of l) {
      if (c === '"') aspas = !aspas;
      else if (c === sep && !aspas) {
        r.push(atual);
        atual = '';
      } else atual += c;
    }
    r.push(atual);
    return r.map((s) => s.trim());
  };
  const cab = partir(linhas[0]).map((c) => semAcentos(c).replace(/[^a-z]/g, ''));
  const col = (...nomes: string[]) => cab.findIndex((c) => nomes.some((n) => c.startsWith(n)));
  const i = {
    nome: col('nome', 'alimento'),
    marca: col('marca'),
    kcal: col('kcal', 'energia', 'calorias'),
    proteina: col('prot'),
    hidratos: col('hidrat', 'carb'),
    gordura: col('gord', 'lip'),
    fibra: col('fibra'),
    sal: col('sal'),
    un: col('gporunidade', 'pesoporunidade', 'unidade', 'porcao'),
    cod: col('codigo', 'barras', 'ean'),
  };
  if (i.nome < 0 || i.kcal < 0) return { erro: 'O CSV precisa pelo menos das colunas «nome» e «kcal».' };

  const alimentos: NovoAlimento[] = [];
  let ignoradas = 0;
  for (const l of linhas.slice(1)) {
    const c = partir(l);
    const num = (j: number) => (j < 0 ? 0 : (lerNum(c[j] ?? '') ?? 0));
    const kcal = lerNum(c[i.kcal] ?? '');
    if (!c[i.nome] || kcal == null) {
      ignoradas++;
      continue;
    }
    alimentos.push({
      nome: c[i.nome],
      marca: i.marca < 0 ? '' : (c[i.marca] ?? ''),
      kcal,
      proteina: num(i.proteina),
      hidratos: num(i.hidratos),
      gordura: num(i.gordura),
      fibra: num(i.fibra),
      sal: num(i.sal),
      gPorUnidade: num(i.un) || null,
      codigoBarras: i.cod < 0 ? '' : (c[i.cod] ?? ''),
      fonte: 'rotulo',
      favorito: 0,
    });
  }
  return { alimentos, ignoradas };
}

/** Procura um produto no Open Food Facts pelo código de barras. Devolve null se não existir. */
export async function procurarCodigo(codigo: string): Promise<Partial<NovoAlimento> | null> {
  const r = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(codigo)}.json?fields=product_name,brands,nutriments,serving_quantity`,
  );
  const j = await r.json();
  if (j.status !== 1) return null;
  const n = j.product.nutriments ?? {};
  const v = (k: string) => Math.round((Number(n[k]) || 0) * 10) / 10;
  return {
    nome: j.product.product_name ?? '',
    marca: String(j.product.brands ?? '').split(',')[0],
    kcal: v('energy-kcal_100g'),
    proteina: v('proteins_100g'),
    hidratos: v('carbohydrates_100g'),
    gordura: v('fat_100g'),
    fibra: v('fiber_100g'),
    sal: v('salt_100g'),
    gPorUnidade: Number(j.product.serving_quantity) || null,
    fonte: 'off',
  };
}
