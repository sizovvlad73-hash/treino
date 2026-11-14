# Projeto: app pessoal de treino, dieta e composição corporal

Responde sempre em português de Portugal. Esta pasta é só para esta app.

## Como trabalhar (tenho poucos tokens)
- Faz só a fase que eu pedir. Não comeces a seguinte.
- Não uses subagentes. Não escrevas testes automáticos. Documentação: só um README curto.
- Não acrescentes nada fora desta especificação. Se tiveres ideias, escreve-as numa linha no fim e não as implementes.
- Código simples e direto. Nada de abstrações "para o futuro" além das pedidas no modelo de dados.
- No fim da fase, corre `npm run build` e corrige os erros. Faz no máximo uma verificação visual.
- Não pares a meio por obstáculos normais (erros, dependências, tipos): diagnostica e resolve. Pára só se precisares de uma decisão minha.
- No fim de cada fase: resumo curto em frases simples (o que fizeste, como testar, o que falta) e atualiza `PROGRESSO.md`.

## Passo 0 (agora, sem escrever código)
1. Guarda esta especificação completa em `SPEC.md`. As fases seguintes vão ser feitas noutros chats a partir desse ficheiro.
2. Propõe, numa resposta curta (máx. ~60 linhas), o modelo de dados (tabelas e campos) e a estrutura de pastas.
3. Espera pela minha aprovação. Quando eu escrever «Aprovado, implementa a Fase 1», implementa a Fase 1 completa e cria `PROGRESSO.md`.

## Stack e dados
- Vite + Svelte 5 + TypeScript. Dexie (IndexedDB). vite-plugin-pwa. Chart.js para gráficos. CSS próprio com variáveis (sem framework de CSS). Sem backend.
- PWA instalável no iPhone (ecrã principal) e usável no PC. Funciona offline.
- Dados só no aparelho, em IndexedDB. Pedir `navigator.storage.persist()`.
- Preparado para sincronização futura: cada registo tem `id` (UUID), `criadoEm`, `atualizadoEm` e `apagado` (apagar = marcar como apagado).
- Backup: exportar e restaurar em JSON, com `versaoEsquema`. Ao restaurar, validar e perguntar antes de substituir. Aviso no ecrã "Hoje" se o último backup tiver mais de 7 dias.
- Formatos PT-PT: vírgula decimal, datas DD/MM/AAAA, semana de segunda a domingo, kg e cm.
- Tudo o que se regista é editável e apagável. O histórico guarda tudo, sem limite.

## Design
- Mobile-first para iPhone instalado: `viewport-fit=cover`, safe areas, barra inferior com 5 entradas: Hoje, Ginásio, Comida, Corpo, Mais. No PC, a mesma app, centrada, com 2 colunas onde fizer sentido.
- Tema escuro por omissão, tema claro, segue o sistema, com interruptor.
- Estilo desportivo premium, limpo, nada de aspeto de template: fonte do sistema (-apple-system), números grandes com `tabular-nums`, cartões com cantos de 16 px, uma só cor de destaque (verde-lima no escuro, versão mais escura no claro), uma cor fixa para proteína, hidratos e gordura.
- Botões de 44 px ou mais, usável com uma mão. Animações curtas, só `transform` e `opacity`; respeitar `prefers-reduced-motion`.
- Estados vazios com uma frase útil sobre o que fazer.

## Regras de cálculo (definidas só aqui)
- Idade calculada a partir da data de nascimento.
- TMB Mifflin-St Jeor: 10×kg + 6,25×cm − 5×idade + 5 (homem) ou −161 (mulher).
- TMB Katch-McArdle: 370 + 21,6 × massa magra (kg). Só aparece quando houver % de gordura.
- TDEE estimado = TMB × fator de atividade (1,2 / 1,375 / 1,55 / 1,725 / 1,9, à escolha). As kcal ativas do relógio são só informativas; nunca se somam.
- Peso de referência = média móvel de 7 dias (nunca o peso de um só dia).
- Metas de kcal: média diária = TDEE − défice escolhido. O dia de treino tem +X kcal (X editável, por omissão 150); o dia de descanso compensa para que a média semanal se mantenha.
- Dia completo: o diário tem um botão "dia completo". Só os dias completos entram nos cálculos de kcal médias.
- TDEE adaptativo (só com ≥14 dias completos nos últimos 28): média de kcal dos dias completos − ((média de peso dos últimos 7 dias − média de peso dos primeiros 7 dias do período) × 7700 / nº de dias entre esses dois períodos). Atenção ao sinal: perder peso deve dar TDEE MAIOR do que o que se comeu.
- Check-in semanal (à segunda): se |TDEE adaptativo − TDEE usado na meta| > 150 kcal, propõe nova meta. Aceitar ou recusar fica no histórico das metas.
- Avisos: meta abaixo de 1800 kcal; ritmo acima de 1 % do peso por semana.
- 1RM estimado (Epley): kg × (1 + reps/30), só com séries de 12 reps ou menos e sem aquecimento.
- Volume semanal por grupo = séries efetivas (RIR ≤ 3, sem aquecimento). Grupo primário conta 1, grupo secundário conta 0,5.
- Dupla progressão: se todas as séries chegaram ao topo do intervalo de reps, sugere +2,5 kg (+1 kg em exercícios de isolamento); senão, mantém a carga e tenta mais reps.
- Adesão diária: kcal dentro de ±10 % da meta e proteína ≥ 90 % da meta.

## Áreas da app

### Hoje (ecrã inicial)
- Kcal e proteína que faltam hoje (barras de progresso), hidratos, gordura, fibra e sal.
- Treino planeado para hoje, com botão "Começar".
- Peso de hoje (registo rápido) e tendência (média de 7 dias e variação semanal).
- Botão grande "+ registar" (peso, comida, entrada rápida, medida).
- Avisos: backup antigo, check-in semanal pendente.

### Perfil e metas
- Data de nascimento, altura, sexo, data de início, peso inicial, peso alvo, % gordura alvo, ritmo alvo (kg/semana), fase atual (cut / manutenção / bulk) com data de início.
- Metas: kcal de treino, kcal de descanso, proteína (g), sal máximo (g). Editáveis, com histórico (data, valor antigo, valor novo, motivo).
- Calculadoras de TMB e TDEE como nas regras.
- Projeção: "ao ritmo atual chegas ao peso alvo em DD/MM/AAAA".

### Ginásio
- Biblioteca de ~100 exercícios em PT-PT, num ficheiro de dados compacto (uma linha por exercício): nome, grupo primário, grupos secundários, equipamento (barra, halteres, máquina, cabo, peso corporal, kettlebell, elástico), tipo de carga (kg total / kg por halter / peso corporal + lastro / só reps / tempo), composto ou isolamento.
- Grupos: peito, costas, ombros, bíceps, tríceps, antebraços, quadríceps, posteriores, glúteos, gémeos, abdominais, lombar.
- Pesquisa por nome, filtros por grupo e equipamento, favoritos. Criar, editar e arquivar exercícios meus.
- Rotinas: nome (ex. "Push A"), dias da semana, exercícios por ordem, séries × intervalo de reps alvo (ex. 8–12), descanso alvo.
- Sessão ativa (modo ginásio):
  - começar a partir de uma rotina ou vazia; juntar, trocar e reordenar exercícios;
  - por série: carga, reps, RIR, marca de aquecimento; botões +/− 2,5 kg e +/− 1 rep; a série nova vem preenchida com os valores da anterior;
  - mostra a última vez desse exercício (carga × reps) e a carga sugerida;
  - temporizador de descanso que arranca ao gravar a série;
  - cada série grava logo na base de dados; se a app fechar, a sessão continua ao reabrir;
  - no fim: duração, nota livre, nota de dor.
- Histórico: lista de sessões; por exercício, gráfico da melhor série e do 1RM estimado; recordes pessoais; volume semanal por grupo.

### Corpo
- Peso diário (em jejum), gráfico com o peso de cada dia e a média móvel de 7 dias.
- Cintura semanal (no umbigo). Medidas mensais: peito, braço, coxa, anca, pescoço.
- % de gordura: InBody (quando houver) e estimativa pela fórmula da US Navy (altura, pescoço, cintura).
- Rácio cintura/altura.
- Fotos mensais (frente/lado/costas), comprimidas (~1200 px, JPEG). Ao tirar a foto, a do mês anterior aparece em transparência (fantasma) para repetir a pose. Comparação lado a lado com deslizador. As fotos ficam fora do JSON principal (backup de fotos separado, em .zip).

### Comida
- Alimentos: nome, marca, kcal, proteína, hidratos, gordura, fibra e sal por 100 g, peso por unidade (g), código de barras, fonte (rótulo / Open Food Facts / estimado). Criar, editar, importar CSV.
- Diário: data, refeição (lista editável; por omissão: pré-treino, pequeno-almoço, lanche 11h, almoço, lanche 17h, lanche 20h, jantar), alimento, quantidade (g ou unidades). Por dia: treino/descanso, fome 1–5 (opcional), nota livre, botão "dia completo".
- Alimentos recentes e favoritos no topo; "copiar refeição de ontem".
- Entrada rápida: só kcal e proteína (restaurantes).
- Refeições-modelo: nome, ingredientes com gramas, totais; adicionar ao diário com um toque.
- Proteína por refeição visível no dia.

### Atividade e recuperação (tudo opcional)
- Check-in de 30 segundos: passos, horas de sono, energia 1–5.
- Em "mais": kcal ativas do relógio, qualidade do sono, HRV, FC em repouso, stress 1–5.

### Resumo semanal (automático)
- Médias de 7 dias: peso, kcal, proteína, sal, passos, sono.
- Variação do peso médio e da cintura em relação à semana anterior.
- Treinos feitos vs planeados, adesão (%), TDEE adaptativo.

### Exportar para o Claude
Botão que gera texto Markdown compacto, pronto a copiar (máx. ~4000 palavras, sem fotos):
- perfil, fase, metas atuais, TMB, TDEE estimado e adaptativo;
- últimos 14 dias, uma linha por dia: data | treino/descanso | peso | kcal | P | H | G | sal | passos | sono | energia | nota;
- resumos das últimas 12 semanas: semana | peso médio | cintura | kcal | proteína | passos | sono | treinos feitos/planeados | TDEE adaptativo;
- treino das últimas 4 semanas: por sessão, exercício e melhor série (carga × reps @RIR);
- recordes de sempre por exercício; medidas mensais e % de gordura desde o início;
- no fim, um campo "A minha pergunta:" que eu escrevo antes de copiar.

## Fases (uma por chat)
- **Fase 1:** base (navegação, temas, base de dados, backup/restauro JSON, PWA básica), Perfil e metas, ecrã Hoje (sem comida), Corpo (só peso, cintura e gráfico), Ginásio completo.
- **Fase 2:** Comida completa (alimentos, CSV, diário, entrada rápida, refeições-modelo); ecrã Hoje com comida.
- **Fase 3:** Atividade, resumo semanal, TDEE adaptativo, check-in semanal, exportar para o Claude.
- **Fase 4:** medidas mensais, % gordura, fotos com fantasma e comparação, backup de fotos, polimento offline e instalação no iPhone.
- **Futuro (não fazer):** sincronização com backend, Open Food Facts com leitura de código de barras, lista de compras, importar plano do Claude em JSON.
