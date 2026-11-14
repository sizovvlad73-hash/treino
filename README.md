# Treino

App pessoal de treino, dieta e composição corporal. PWA sem backend: os dados ficam só no aparelho (IndexedDB).

- Especificação: `SPEC.md`
- Estado das fases: `PROGRESSO.md`

## Comandos

```bash
npm install
npm run dev      # desenvolvimento, em http://localhost:5173
npm run build    # gera a pasta dist/
npm run preview  # serve a pasta dist/ (com service worker)
npm run check    # verificação de tipos
```

## Instalar no iPhone

A app está publicada em https://sizovvlad73-hash.github.io/treino/ (GitHub Pages). Abre o endereço no Safari e
escolhe Partilhar → «Adicionar ao ecrã principal». Cada `git push` para `main` publica uma versão nova.

## Estrutura

- `src/lib/` — base de dados (`db.ts`), regras de cálculo (`calculos.ts`), formatos PT-PT (`formato.ts`), backup.
- `src/dados/exercicios.ts` — biblioteca de exercícios, uma linha por exercício.
- `src/componentes/` — peças partilhadas.
- `src/ecras/` — um diretório por área da app.
