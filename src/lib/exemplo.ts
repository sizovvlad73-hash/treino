// Dados de exemplo para experimentar a app: 30 dias de peso, comida, atividade e treinos.
// Todos os registos levam `exemplo: 1`; não entram no backup e apagam-se de uma vez.
import { obterRefeicoes } from './comida';
import { ativos, db, uuid } from './db';
import { diaSemana, hoje, paraData, somaDias } from './formato';

const TABELAS = ['metas', 'pesos', 'medidas', 'rotinas', 'sessoes', 'series', 'dias', 'alimentos', 'diario'];

export const contarExemplo = async () => {
  let n = 0;
  for (const t of TABELAS) n += await db.table(t).filter((r) => r.exemplo === 1).count();
  return n;
};

/** Remove só os registos marcados como exemplo. */
export async function apagarExemplo() {
  await db.transaction('rw', db.tables, async () => {
    for (const t of TABELAS) await db.table(t).filter((r) => r.exemplo === 1).delete();
  });
}

// nome, kcal, proteína, hidratos, gordura, fibra, sal (por 100 g), gramas por unidade
const ALIMENTOS: [string, number, number, number, number, number, number, number | null][] = [
  ['Flocos de aveia', 370, 13, 59, 7, 10, 0.02, null],
  ['Iogurte grego natural', 97, 9, 4, 5, 0, 0.1, null],
  ['Banana', 89, 1.1, 23, 0.3, 2.6, 0, 120],
  ['Peito de frango grelhado', 110, 23, 0, 1.5, 0, 0.2, null],
  ['Arroz branco cozido', 130, 2.7, 28, 0.3, 0.4, 0.01, null],
  ['Azeite', 884, 0, 0, 100, 0, 0, null],
  ['Pão de mistura', 250, 9, 47, 2, 5, 1.2, null],
  ['Ovo cozido', 143, 12.6, 0.7, 9.5, 0, 0.36, 55],
  ['Proteína whey', 380, 78, 7, 5, 0, 0.5, null],
];
// refeição, índice do alimento, quantidade, unidade; o arroz (índice 4) varia de dia para dia
const MENU: [string, number, number, 'g' | 'un'][] = [
  ['Pequeno-almoço', 0, 80, 'g'],
  ['Pequeno-almoço', 1, 200, 'g'],
  ['Pequeno-almoço', 2, 1, 'un'],
  ['Almoço', 3, 200, 'g'],
  ['Almoço', 4, 300, 'g'],
  ['Almoço', 5, 10, 'g'],
  ['Lanche 17h', 6, 80, 'g'],
  ['Lanche 17h', 7, 2, 'un'],
  ['Lanche 17h', 8, 30, 'g'],
  ['Jantar', 3, 180, 'g'],
  ['Jantar', 4, 250, 'g'],
  ['Jantar', 5, 10, 'g'],
];
// nome, dias da semana, [exercício, kg inicial]
const ROTINAS: [string, number[], [string, number][]][] = [
  ['Exemplo · Tronco', [1, 4], [['bib-supino-com-barra', 70], ['bib-remada-com-barra', 60], ['bib-press-militar-com-barra', 40]]],
  ['Exemplo · Pernas', [2, 5], [['bib-agachamento-com-barra', 90], ['bib-peso-morto', 110], ['bib-curl-com-barra', 30]]],
];

/** Carrega 30 dias de exemplo até hoje. Não toca em dias que já tenham dados teus. */
export async function carregarExemplo() {
  await apagarExemplo();
  // Números sempre iguais (gerador com semente), para o exemplo ser repetível.
  let semente = 7;
  const rnd = () => {
    semente = (semente * 1664525 + 1013904223) % 4294967296;
    return semente / 4294967296;
  };
  const novo = <T extends object>(dados: T, quando: string) => ({
    ...dados,
    id: uuid(),
    criadoEm: quando,
    atualizadoEm: quando,
    apagado: 0 as const,
    exemplo: 1 as const,
  });
  const instante = (dia: string, hora: number, min = 0) => {
    const d = paraData(dia);
    d.setHours(hora, min);
    return d.toISOString();
  };

  const fim = hoje();
  const refeicoes = await obterRefeicoes();
  const comPeso = new Set((await ativos(db.pesos)).map((p) => p.data));
  const comDia = new Set((await ativos(db.dias)).map((d) => d.data));
  const comSessao = new Set((await ativos(db.sessoes)).map((s) => s.data));
  const temMeta = (await ativos(db.metas)).some((m) => m.estado === 'aceite');

  const t: Record<string, object[]> = Object.fromEntries(TABELAS.map((n) => [n, []]));
  const inicio = somaDias(fim, -29);
  const alimentos = ALIMENTOS.map(([nome, kcal, proteina, hidratos, gordura, fibra, sal, gPorUnidade]) =>
    novo(
      { nome, marca: 'Exemplo', kcal, proteina, hidratos, gordura, fibra, sal, gPorUnidade, codigoBarras: '', fonte: 'estimado', favorito: 0 },
      instante(inicio, 8),
    ),
  );
  t.alimentos = alimentos;
  const rotinas = ROTINAS.map(([nome, diasSemana, exs]) =>
    novo(
      { nome, diasSemana, itens: exs.map(([exercicioId]) => ({ exercicioId, series: 3, repsMin: 8, repsMax: 10, descansoSeg: 120 })) },
      instante(inicio, 8),
    ),
  );
  t.rotinas = rotinas;
  if (!temMeta)
    t.metas.push(
      novo(
        { data: inicio, kcalTreino: 2450, kcalDescanso: 2300, proteinaG: 170, salMaxG: 6, tdeeUsado: 2700, motivo: 'Meta de exemplo', origem: 'manual', estado: 'aceite' },
        instante(inicio, 8),
      ),
    );

  const treinos = [0, 0]; // sessões já feitas de cada rotina
  for (let i = 0; i < 30; i++) {
    const dia = somaDias(inicio, i);
    const eHoje = dia === fim;

    if (!comPeso.has(dia) && i !== 10 && i !== 17)
      t.pesos.push(novo({ data: dia, kg: Math.round((82 - 0.07 * i + (rnd() - 0.5) * 0.6) * 10) / 10 }, instante(dia, 7)));
    if (i % 7 === 1) t.medidas.push(novo({ data: dia, tipo: 'cintura', cm: 92 - 0.25 * Math.floor(i / 7) }, instante(dia, 7)));

    if (!comDia.has(dia)) {
      const semAtividade = i % 8 === 6;
      t.dias.push(
        novo(
          {
            data: dia,
            tipo: null,
            fome: 2 + Math.floor(rnd() * 3),
            nota: i === 12 ? 'Jantar fora' : '',
            completo: eHoje || i % 9 === 4 ? 0 : 1,
            passos: semAtividade ? null : Math.round((6000 + rnd() * 5000) / 100) * 100,
            sonoH: semAtividade ? null : Math.round((6 + rnd() * 2.5) * 2) / 2,
            energia: semAtividade ? null : 2 + Math.floor(rnd() * 4),
            kcalAtivas: i % 2 ? null : Math.round(350 + rnd() * 300),
            fcRepouso: i % 2 ? null : Math.round(52 + rnd() * 6),
          },
          instante(dia, 22),
        ),
      );
      const arroz = 0.7 + rnd() * 0.6;
      // Hoje fica só com o pequeno-almoço, para se ver o que falta.
      MENU.filter(([r]) => !eHoje || r === 'Pequeno-almoço').forEach(([refeicao, a, qtd, unidade], j) =>
        t.diario.push(
          novo(
            {
              data: dia,
              refeicao: refeicoes.includes(refeicao) ? refeicao : refeicoes[0],
              alimentoId: alimentos[a].id,
              quantidade: a === 4 ? Math.round((qtd * arroz) / 10) * 10 : qtd,
              unidade,
              nome: '',
              kcalRapida: null,
              proteinaRapida: null,
            },
            instante(dia, 8, j),
          ),
        ),
      );
    }

    const r = ROTINAS.findIndex(([, dias]) => dias.includes(diaSemana(dia)));
    if (r >= 0 && !eHoje && !comSessao.has(dia)) {
      const sessao = novo(
        {
          rotinaId: rotinas[r].id,
          data: dia,
          inicio: instante(dia, 18),
          fim: instante(dia, 19),
          exercicioIds: ROTINAS[r][2].map(([e]) => e),
          nota: '',
          notaDor: '',
        },
        instante(dia, 18),
      );
      t.sessoes.push(sessao);
      ROTINAS[r][2].forEach(([exercicioId, kg], e) => {
        for (let s = 0; s < 3; s++)
          t.series.push(
            novo(
              {
                sessaoId: sessao.id,
                exercicioId,
                ordem: s,
                kg: kg + 2.5 * Math.floor(treinos[r] / 2),
                reps: 10 - s - (treinos[r] % 2 ? 0 : 1),
                tempoSeg: null,
                rir: 2,
                aquecimento: 0,
              },
              instante(dia, 18, e * 15 + s * 3),
            ),
          );
      });
      treinos[r]++;
    }
  }

  await db.transaction('rw', db.tables, async () => {
    for (const n of TABELAS) await db.table(n).bulkAdd(t[n]);
  });
}
