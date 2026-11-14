# Progresso

## Fase 1 — feita (13/11/2026)

- Base: Vite + Svelte 5 + TypeScript, Dexie, Chart.js, vite-plugin-pwa. Navegação por hash com barra inferior.
- Temas escuro, claro e sistema (em Mais). Layout de 2 colunas no PC.
- Backup: exportar e restaurar JSON com validação e confirmação. Aviso no Hoje se o backup tiver mais de 7 dias.
- Perfil e metas: formulário, TMB Mifflin-St Jeor, TDEE estimado, projeção, sugestão de kcal de treino e descanso, histórico de metas, avisos (meta < 1800 kcal, ritmo > 1 %).
- Hoje: treino planeado com «Começar», peso do dia, tendência, «+ Registar», avisos.
- Corpo: peso diário, gráfico com média de 7 dias, cintura.
- Ginásio: biblioteca de 112 exercícios, pesquisa, filtros, favoritos, exercícios meus, rotinas, sessão ativa com temporizador de descanso, histórico, recordes, volume semanal.

## Melhorias ao Ginásio (14/11/2026)

- Som (três bips) no fim do descanso. No iPhone não toca com o interruptor de silêncio ligado nem com o ecrã bloqueado.
- O ecrã fica ligado durante a sessão em curso (Wake Lock).
- Salto dos botões +/− configurável por exercício, e nota fixa por exercício (menu ⋯ na sessão). Campos novos opcionais em `exercicios`: `passoKg`, `nota`.
- A sugestão de carga também aparece em treino livre, usando o intervalo de reps de qualquer rotina que tenha o exercício.

## Fase 2 — feita (14/11/2026)

- Esquema na versão 2, com as tabelas `dias`, `alimentos`, `diario`, `modelos`. Um backup da versão 1 continua a poder ser restaurado.
- Alimentos: criar, editar, apagar, favoritos, pesquisa, importar CSV.
- Diário por dia: refeições (lista editável), alimento em gramas ou unidades, proteína e kcal por refeição, «Copiar de ontem» por refeição, treino/descanso, fome 1–5, nota, «dia completo» com indicação de adesão.
- Folha de juntar: favoritos e recentes no topo, quantidade da última vez, refeições-modelo com um toque, entrada rápida.
- Refeições-modelo: nome, ingredientes com gramas, totais.
- Hoje: kcal e proteína que faltam, hidratos, gordura, fibra e sal; «+ Registar» com Comida e Entrada rápida.
- Fora da SPEC original (pedido no chat): procurar um alimento no Open Food Facts pelo número do código de barras, no formulário do alimento. Leitura com a câmara ainda não existe.

Verificado: `npm run check` e `npm run build` sem erros. No browser: sessão de treino, séries, descanso, histórico, peso; diário com alimento em gramas, em unidades e entrada rápida; totais; Hoje com comida; restauro de backup (versões 1 e 2) e recusa de um ficheiro errado.
Não verificado: instalação no iPhone, modo offline, som e ecrã ligado num iPhone real, importação de CSV, pesquisa no Open Food Facts.

## Decisões tomadas

- Sim/não indexados guardados como 0/1. Dias (AAAA-MM-DD) sempre na hora local. Um só peso por dia.
- O tema fica em `localStorage` (não em `definicoes`) para se aplicar antes de a página desenhar.
- A sessão em curso é a que tem `fim` vazio; não existe `sessaoAtivaId`.
- A tabela `sessoes` tem também `data` (dia local) além de `inicio` e `fim`.
- Uma série sem RIR preenchido conta como efetiva no volume semanal.
- Dias de treino por semana = dias distintos marcados nas rotinas.
- `tdeeUsado` de uma meta = média semanal das kcal da meta + défice.
- O défice inicial vem do ritmo alvo (1 kg ≈ 7700 kcal) e edita-se em Metas. Défice negativo = excedente.
- «Trocar» um exercício na sessão passa as séries já feitas para o exercício novo.
- Um exercício não se repete na mesma rotina nem na mesma sessão.
- TypeScript fixado na versão 6 (o svelte-check ainda não aceita a 7).
- Tipo do dia (treino/descanso): o escolhido no diário; se não houver escolha, é treino quando há sessão nesse dia ou rotina nesse dia da semana.
- A meta de um dia é a meta aceite mais recente com data igual ou anterior a esse dia.
- Apagar um alimento não altera os dias já registados (os valores continuam a ser calculados).
- A entrada rápida fica, por omissão, na primeira refeição da lista; muda-se na folha.
- A lista de refeições fica em `definicoes.refeicoes`.

## Falta

- **Publicar em HTTPS e instalar no iPhone** (falta escolher o alojamento).
- **Fase 3:** Atividade, resumo semanal, TDEE adaptativo, check-in semanal, exportar para o Claude. A tabela `dias` vai receber os campos de atividade.
- **Fase 4:** medidas mensais, % de gordura (com TMB Katch-McArdle, já em `calculos.ts`), fotos, backup de fotos, polimento offline e instalação no iPhone.
- **Para depois:** importar do Apple Health por Atalho; leitura do código de barras com a câmara.
