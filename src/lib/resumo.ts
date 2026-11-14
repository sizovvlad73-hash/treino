// Dados da Fase 3: resumo semanal, TDEE adaptativo, check-in semanal e texto para o Claude.
import { obterPerfil } from './acoes';
import { adere, idade, melhorSerie, pesoReferencia, tdeeAdaptativo, tendencia, tmbMifflin } from './calculos';
import { nutri, somar, type Nutri } from './comida';
import { ativos, db } from './db';
import { diaSemana, fmt, fmtData, fmtDataCurta, fmtSerie, hoje, inicioSemana, somaDias } from './formato';
import type { Dia, Meta, Serie } from './tipos';

/** Carrega de uma vez tudo o que os resumos precisam (os dados são poucos). */
export async function carregarTudo() {
  const alimentos = new Map((await db.alimentos.toArray()).map((a) => [a.id, a]));
  const porDia = new Map<string, Nutri[]>();
  for (const e of await ativos(db.diario)) {
    if (!porDia.has(e.data)) porDia.set(e.data, []);
    porDia.get(e.data)!.push(nutri(e, alimentos.get(e.alimentoId ?? '')));
  }
  const series = new Map<string, Serie[]>();
  for (const s of await ativos(db.series)) {
    if (!series.has(s.sessaoId)) series.set(s.sessaoId, []);
    series.get(s.sessaoId)!.push(s);
  }
  return {
    perfil: await obterPerfil(),
    metas: (await ativos(db.metas))
      .filter((m) => m.estado === 'aceite')
      .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1)),
    pesos: await ativos(db.pesos),
    medidas: (await ativos(db.medidas)).sort((a, b) => (a.data < b.data ? -1 : 1)),
    dias: new Map((await ativos(db.dias)).map((d) => [d.data, d])),
    comida: new Map([...porDia].map(([d, l]) => [d, somar(l)])),
    sessoes: (await ativos(db.sessoes)).filter((s) => s.fim).sort((a, b) => (a.inicio < b.inicio ? -1 : 1)),
    series,
    rotinas: await ativos(db.rotinas),
    exercicios: new Map((await db.exercicios.toArray()).map((e) => [e.id, e])),
  };
}
export type Tudo = Awaited<ReturnType<typeof carregarTudo>>;

/** Meta em vigor num dia: a aceite mais recente com data igual ou anterior. */
export const metaDoDia = (t: Tudo, data: string): Meta | undefined =>
  t.metas.find((m) => m.data <= data) ?? t.metas.at(-1);

export function tipoDoDia(t: Tudo, data: string): 'treino' | 'descanso' {
  const escolhido = t.dias.get(data)?.tipo;
  if (escolhido) return escolhido;
  const treinou = t.sessoes.some((s) => s.data === data);
  return treinou || t.rotinas.some((r) => r.diasSemana.includes(diaSemana(data))) ? 'treino' : 'descanso';
}

export function tdeeAte(t: Tudo, ate: string) {
  const completos = [...t.dias.values()]
    .filter((d) => d.completo)
    .map((d) => ({ data: d.data, kcal: t.comida.get(d.data)?.kcal ?? 0 }));
  return tdeeAdaptativo(completos, t.pesos, ate);
}

/** Média dos valores que existem; null se não houver nenhum (um valor em falta nunca conta como 0). */
function media(l: (number | null | undefined)[]): number | null {
  const v = l.filter((x): x is number => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

const cinturaDaSemana = (t: Tudo, seg: string) =>
  t.medidas.filter((m) => m.tipo === 'cintura' && m.data >= seg && m.data <= somaDias(seg, 6)).at(-1)?.cm ?? null;

const pesoDaSemana = (t: Tudo, seg: string) =>
  media(t.pesos.filter((p) => p.data >= seg && p.data <= somaDias(seg, 6)).map((p) => p.kg));

/** Resumo de uma semana (segunda a domingo). */
export function resumoSemana(t: Tudo, seg: string) {
  const dom = somaDias(seg, 6);
  const datas = Array.from({ length: 7 }, (_, i) => somaDias(seg, i));
  const completos = datas.filter((d) => t.dias.get(d)?.completo);
  const com = (k: keyof Nutri) => media(completos.map((d) => t.comida.get(d)?.[k] ?? 0));
  const ativ = (k: 'passos' | 'sonoH' | 'energia') => media(datas.map((d) => t.dias.get(d)?.[k]));

  const comMeta = completos.filter((d) => metaDoDia(t, d));
  const aderiu = comMeta.filter((d) => {
    const m = metaDoDia(t, d)!;
    const c = t.comida.get(d);
    return adere(c?.kcal ?? 0, c?.proteina ?? 0, tipoDoDia(t, d) === 'treino' ? m.kcalTreino : m.kcalDescanso, m.proteinaG);
  });

  const peso = pesoDaSemana(t, seg);
  const pesoAntes = pesoDaSemana(t, somaDias(seg, -7));
  const cintura = cinturaDaSemana(t, seg);
  const cinturaAntes = cinturaDaSemana(t, somaDias(seg, -7));
  const ate = dom < hoje() ? dom : hoje();
  return {
    seg,
    dom,
    peso,
    variacaoPeso: peso != null && pesoAntes != null ? peso - pesoAntes : null,
    cintura,
    variacaoCintura: cintura != null && cinturaAntes != null ? cintura - cinturaAntes : null,
    kcal: com('kcal'),
    proteina: com('proteina'),
    sal: com('sal'),
    passos: ativ('passos'),
    sono: ativ('sonoH'),
    energia: ativ('energia'),
    completos: completos.length,
    adesao: comMeta.length ? (aderiu.length / comMeta.length) * 100 : null,
    feitos: t.sessoes.filter((s) => s.data >= seg && s.data <= dom).length,
    planeados: t.rotinas.reduce((n, r) => n + r.diasSemana.length, 0),
    tdee: tdeeAte(t, ate),
  };
}

const arred = (v: number) => Math.round(v / 10) * 10;

/** Check-in semanal: tendência e TDEE adaptativo até domingo; propõe metas se a diferença passar 150 kcal. */
export function checkin(t: Tudo, dia = hoje()) {
  const seg = inicioSemana(dia);
  const dom = somaDias(seg, -1);
  const tend = tendencia(t.pesos, dom);
  const tdee = tdeeAte(t, dom);
  const meta = t.metas[0];
  const dif = tdee.tdee != null && meta?.tdeeUsado != null ? tdee.tdee - meta.tdeeUsado : null;
  // A proposta mantém o défice e a diferença entre treino e descanso: só desloca as kcal.
  const proposta =
    meta && dif != null && Math.abs(dif) > 150
      ? {
          kcalTreino: arred(meta.kcalTreino + dif),
          kcalDescanso: arred(meta.kcalDescanso + dif),
          tdeeUsado: Math.round(tdee.tdee!),
        }
      : null;
  return { seg, dom, tend, tdee, meta, dif, proposta };
}

// ---------- Exportar para o Claude ----------

const n = (v: number | null | undefined, casas = 0) => fmt(v, casas);
const palavras = (s: string) => s.split(/\s+/).filter(Boolean).length;
const FASES = { cut: 'cut', manutencao: 'manutenção', bulk: 'bulk' };

/** Texto Markdown para colar no Claude. Se passar das 4000 palavras, corta primeiro as sessões de treino mais antigas. */
export function textoClaude(t: Tudo, pergunta: string, dia = hoje()) {
  const p = t.perfil;
  const meta = t.metas[0];
  const ref = pesoReferencia(t.pesos);
  const tdee = tdeeAte(t, dia);
  const l: string[] = [`# Dados de treino e dieta — ${fmtData(dia)}`, '', '## Perfil e metas'];

  if (p) {
    const anos = p.dataNascimento ? idade(p.dataNascimento, dia) : null;
    const kg = ref ?? p.pesoInicialKg;
    const tmb = kg && p.alturaCm && anos != null ? tmbMifflin(kg, p.alturaCm, anos, p.sexo) : null;
    l.push(
      `- ${p.sexo === 'h' ? 'Homem' : 'Mulher'}, ${n(anos)} anos, ${n(p.alturaCm, 1)} cm`,
      `- Fase: ${FASES[p.fase]}${p.faseInicio ? ` desde ${fmtData(p.faseInicio)}` : ''}`,
      `- Início ${p.dataInicio ? fmtData(p.dataInicio) : '—'} com ${n(p.pesoInicialKg, 1)} kg; alvo ${n(p.pesoAlvoKg, 1)} kg, ${n(p.gorduraAlvoPct, 1)} % de gordura; ritmo alvo ${n(p.ritmoAlvoKgSem, 2)} kg/semana`,
      `- Peso de referência (média de 7 dias): ${n(ref, 1)} kg`,
      `- TMB (Mifflin-St Jeor): ${n(tmb)} kcal; TDEE estimado: ${n(tmb == null ? null : tmb * p.fatorAtividade)} kcal (fator ${n(p.fatorAtividade, 3)})`,
    );
  } else l.push('- Perfil por preencher.');
  l.push(
    `- TDEE adaptativo (28 dias): ${
      tdee.tdee != null
        ? `${n(tdee.tdee)} kcal (${tdee.completos} dias completos)`
        : tdee.faltam
          ? `ainda não há (faltam ${tdee.faltam} dias completos)`
          : 'ainda não há (faltam pesos)'
    }`,
  );
  l.push(
    meta
      ? `- Metas desde ${fmtData(meta.data)}: treino ${n(meta.kcalTreino)} kcal, descanso ${n(meta.kcalDescanso)} kcal, proteína ${n(meta.proteinaG)} g, sal máx. ${n(meta.salMaxG, 1)} g; TDEE usado ${n(meta.tdeeUsado)} kcal`
      : '- Metas por definir.',
  );

  l.push(
    '',
    '## Últimos 14 dias',
    'Kcal com * = dia não marcado como completo. — = sem registo.',
    'data | tipo | peso | kcal | P | H | G | sal | passos | sono | energia | nota',
  );
  for (let i = 13; i >= 0; i--) {
    const d = somaDias(dia, -i);
    const x: Dia | undefined = t.dias.get(d);
    const c = t.comida.get(d);
    l.push(
      [
        fmtDataCurta(d),
        tipoDoDia(t, d),
        n(t.pesos.find((q) => q.data === d)?.kg, 1),
        n(c?.kcal) + (c && !x?.completo ? '*' : ''),
        n(c?.proteina),
        n(c?.hidratos),
        n(c?.gordura),
        n(c?.sal, 1),
        n(x?.passos),
        n(x?.sonoH, 1),
        n(x?.energia),
        x?.nota.replace(/\s+/g, ' ').trim() || '—',
      ].join(' | '),
    );
  }

  l.push(
    '',
    '## Últimas 12 semanas',
    'Médias da semana; kcal e proteína só de dias completos.',
    'semana | peso médio | cintura | kcal | proteína | passos | sono | treinos feitos/planeados | TDEE adaptativo',
  );
  for (let i = 11; i >= 0; i--) {
    const r = resumoSemana(t, somaDias(inicioSemana(dia), -7 * i));
    if (r.peso == null && r.kcal == null && r.passos == null && r.cintura == null && !r.feitos) continue; // semana sem dados
    l.push(
      [
        fmtDataCurta(r.seg),
        n(r.peso, 1),
        n(r.cintura, 1),
        n(r.kcal),
        n(r.proteina),
        n(r.passos),
        n(r.sono, 1),
        `${r.feitos}/${r.planeados}`,
        n(r.tdee.tdee),
      ].join(' | '),
    );
  }

  // Treino: uma linha por sessão, com a melhor série de cada exercício.
  const melhor = (series: Serie[], exId: string) => {
    const e = t.exercicios.get(exId);
    const m = e && melhorSerie(series.filter((s) => s.exercicioId === exId), e.tipoCarga);
    return e && m ? `${e.nome} ${fmtSerie(m, e.tipoCarga)}` : null;
  };
  const de = somaDias(dia, -27);
  const sessoes = t.sessoes
    .filter((s) => s.data >= de && s.data <= dia)
    .map((s) => {
      const series = t.series.get(s.id) ?? [];
      const exs = s.exercicioIds.map((e) => melhor(series, e)).filter(Boolean);
      const rotina = t.rotinas.find((r) => r.id === s.rotinaId)?.nome;
      return `- ${fmtDataCurta(s.data)}${rotina ? ` ${rotina}` : ''}: ${exs.join('; ') || 'sem séries'}${s.notaDor ? ` (dor: ${s.notaDor})` : ''}`;
    });

  const fim: string[] = ['', '## Recordes de sempre (melhor série)'];
  const todas = new Map<string, Serie[]>();
  const validas = new Set(t.sessoes.map((s) => s.id));
  for (const [id, ss] of t.series)
    if (validas.has(id))
      for (const s of ss) {
        if (!todas.has(s.exercicioId)) todas.set(s.exercicioId, []);
        todas.get(s.exercicioId)!.push(s);
      }
  const recordes = [...todas].map(([e, ss]) => melhor(ss, e)).filter(Boolean).sort();
  fim.push(...(recordes.length ? recordes.map((r) => `- ${r}`) : ['Sem treinos registados.']));

  fim.push('', '## Medidas e % de gordura');
  // Uma linha por mês e por tipo de medida (a última desse mês).
  const porMes = new Map<string, string>();
  for (const m of t.medidas) porMes.set(`${m.data.slice(0, 7)} ${m.tipo}`, `- ${fmtData(m.data)} ${m.tipo}: ${n(m.cm, 1)} cm`);
  fim.push(...(porMes.size ? porMes.values() : ['Sem medidas registadas.']), '% de gordura: sem registos.');
  fim.push('', '## A minha pergunta:', pergunta.trim());

  // Encurtar: tirar as sessões mais antigas até caber em 4000 palavras.
  const juntar = (ss: string[], omitidas: number) =>
    [
      ...l,
      '',
      '## Treino das últimas 4 semanas (melhor série por exercício, carga × reps @RIR)',
      ...(omitidas ? [`(${omitidas} sessões mais antigas omitidas para encurtar)`] : []),
      ...(ss.length || omitidas ? ss : ['Sem treinos neste período.']),
      ...fim,
    ].join('\n');
  let omitidas = 0;
  let texto = juntar(sessoes, 0);
  while (palavras(texto) > 4000 && omitidas < sessoes.length) texto = juntar(sessoes.slice(++omitidas), omitidas);
  return { texto, palavras: palavras(texto), omitidas };
}
