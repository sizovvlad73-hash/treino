import type { Bit, Equipamento, Grupo, TipoCarga } from '../lib/tipos';

// Uma linha por exercício:
// nome|grupo primário|grupos secundários|equipamento|tipo de carga|c = composto, i = isolamento
const LINHAS = `
Supino com barra|peito|triceps,ombros|barra|total|c
Supino inclinado com barra|peito|ombros,triceps|barra|total|c
Supino declinado com barra|peito|triceps|barra|total|c
Supino com halteres|peito|triceps,ombros|halteres|halter|c
Supino inclinado com halteres|peito|ombros,triceps|halteres|halter|c
Supino na máquina|peito|triceps,ombros|maquina|total|c
Supino inclinado na máquina|peito|ombros,triceps|maquina|total|c
Aberturas com halteres|peito||halteres|halter|i
Peck deck|peito||maquina|total|i
Crossover no cabo|peito||cabo|total|i
Crossover de baixo para cima|peito|ombros|cabo|total|i
Flexões|peito|triceps,ombros|corporal|reps|c
Fundos em paralelas|peito|triceps,ombros|corporal|lastro|c
Elevações na barra|costas|biceps,antebracos|corporal|lastro|c
Elevações em supinação|costas|biceps|corporal|lastro|c
Puxada alta com pega larga|costas|biceps|cabo|total|c
Puxada alta com pega neutra|costas|biceps|cabo|total|c
Remada com barra|costas|biceps,lombar|barra|total|c
Remada com haltere a um braço|costas|biceps|halteres|halter|c
Remada baixa no cabo|costas|biceps|cabo|total|c
Remada na máquina|costas|biceps|maquina|total|c
Remada em barra T|costas|biceps,lombar|barra|total|c
Remada com apoio no peito|costas|biceps|halteres|halter|c
Pullover no cabo|costas||cabo|total|i
Encolhimentos com halteres|costas|antebracos|halteres|halter|i
Encolhimentos com barra|costas|antebracos|barra|total|i
Press militar com barra|ombros|triceps|barra|total|c
Press de ombros com halteres|ombros|triceps|halteres|halter|c
Press de ombros na máquina|ombros|triceps|maquina|total|c
Press Arnold|ombros|triceps|halteres|halter|c
Press com kettlebell|ombros|triceps|kettlebell|total|c
Levantamento turco|ombros|abdominais,gluteos|kettlebell|total|c
Elevações laterais com halteres|ombros||halteres|halter|i
Elevações laterais no cabo|ombros||cabo|total|i
Elevações laterais na máquina|ombros||maquina|total|i
Elevações frontais com halteres|ombros||halteres|halter|i
Voos invertidos com halteres|ombros|costas|halteres|halter|i
Peck deck invertido|ombros|costas|maquina|total|i
Face pull|ombros|costas|cabo|total|i
Face pull com elástico|ombros|costas|elastico|reps|i
Afastamento de elástico|ombros|costas|elastico|reps|i
Remada alta com barra|ombros|costas|barra|total|c
Curl com barra|biceps|antebracos|barra|total|i
Curl com barra EZ|biceps|antebracos|barra|total|i
Curl com halteres|biceps|antebracos|halteres|halter|i
Curl martelo|biceps|antebracos|halteres|halter|i
Curl inclinado com halteres|biceps||halteres|halter|i
Curl Scott com barra|biceps||barra|total|i
Curl Scott na máquina|biceps||maquina|total|i
Curl no cabo|biceps||cabo|total|i
Curl concentrado|biceps||halteres|halter|i
Extensão de tríceps no cabo com barra|triceps||cabo|total|i
Extensão de tríceps no cabo com corda|triceps||cabo|total|i
Extensão acima da cabeça no cabo|triceps||cabo|total|i
Extensão acima da cabeça com haltere|triceps||halteres|total|i
Press francês com barra EZ|triceps||barra|total|i
Supino com pega fechada|triceps|peito,ombros|barra|total|c
Fundos no banco|triceps|peito,ombros|corporal|lastro|c
Fundos na máquina|triceps|peito|maquina|total|c
Kickback com haltere|triceps||halteres|halter|i
Curl de punho com barra|antebracos||barra|total|i
Curl de punho invertido|antebracos||barra|total|i
Curl invertido com barra|antebracos|biceps|barra|total|i
Passeio do agricultor|antebracos|costas,abdominais|halteres|halter|c
Suspensão na barra|antebracos|costas|corporal|tempo|i
Agachamento com barra|quadriceps|gluteos,lombar|barra|total|c
Agachamento frontal|quadriceps|gluteos,abdominais|barra|total|c
Agachamento hack|quadriceps|gluteos|maquina|total|c
Agachamento na Smith|quadriceps|gluteos|maquina|total|c
Agachamento goblet|quadriceps|gluteos|kettlebell|total|c
Agachamento com peso corporal|quadriceps|gluteos|corporal|reps|c
Prensa de pernas|quadriceps|gluteos|maquina|total|c
Extensão de pernas|quadriceps||maquina|total|i
Agachamento búlgaro|quadriceps|gluteos|halteres|halter|c
Afundos com halteres|quadriceps|gluteos|halteres|halter|c
Afundos a andar|quadriceps|gluteos|halteres|halter|c
Step-up|quadriceps|gluteos|halteres|halter|c
Peso morto|posteriores|gluteos,lombar,costas|barra|total|c
Peso morto sumo|posteriores|gluteos,quadriceps,lombar|barra|total|c
Peso morto romeno|posteriores|gluteos,lombar|barra|total|c
Peso morto romeno com halteres|posteriores|gluteos,lombar|halteres|halter|c
Bom-dia|posteriores|lombar,gluteos|barra|total|c
Curl de pernas deitado|posteriores||maquina|total|i
Curl de pernas sentado|posteriores||maquina|total|i
Curl nórdico|posteriores||corporal|reps|i
Hip thrust com barra|gluteos|posteriores|barra|total|c
Hip thrust na máquina|gluteos|posteriores|maquina|total|c
Ponte de glúteos|gluteos|posteriores|corporal|lastro|c
Pull-through no cabo|gluteos|posteriores|cabo|total|c
Balanço com kettlebell|gluteos|posteriores,lombar|kettlebell|total|c
Coice no cabo|gluteos||cabo|total|i
Abdução na máquina|gluteos||maquina|total|i
Abdução com elástico|gluteos||elastico|reps|i
Elevação de gémeos em pé|gemeos||maquina|total|i
Elevação de gémeos sentado|gemeos||maquina|total|i
Elevação de gémeos na prensa|gemeos||maquina|total|i
Elevação de gémeos com halteres|gemeos||halteres|halter|i
Crunch|abdominais||corporal|reps|i
Crunch no cabo|abdominais||cabo|total|i
Crunch na máquina|abdominais||maquina|total|i
Elevação de pernas suspenso|abdominais|antebracos|corporal|reps|i
Elevação de pernas deitado|abdominais||corporal|reps|i
Roda abdominal|abdominais|lombar|corporal|reps|i
Rotação russa|abdominais||corporal|reps|i
Prancha|abdominais|lombar|corporal|tempo|i
Prancha lateral|abdominais||corporal|tempo|i
Pallof press|abdominais||cabo|total|i
Lenhador no cabo|abdominais||cabo|total|i
Hiperextensão lombar|lombar|gluteos,posteriores|corporal|lastro|i
Extensão lombar na máquina|lombar||maquina|total|i
Superman|lombar|gluteos|corporal|reps|i
Bird-dog|lombar|abdominais|corporal|reps|i
`;

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

export const BIBLIOTECA = LINHAS.trim()
  .split('\n')
  .map((l) => {
    const [nome, grupo, sec, equip, carga, tipo] = l.split('|');
    return {
      id: 'bib-' + slug(nome),
      nome,
      grupoPrimario: grupo as Grupo,
      gruposSecundarios: (sec ? sec.split(',') : []) as Grupo[],
      equipamento: equip as Equipamento,
      tipoCarga: carga as TipoCarga,
      composto: (tipo === 'c' ? 1 : 0) as Bit,
    };
  });
