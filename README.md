# ⚡ CASCATA

Roguelike engine-builder de reações em cadeia. Você constrói uma máquina numa grade 5×4,
aperta **RESOLVER**, e assiste sua engenhoca destruir metas de pontuação cada vez mais
absurdas — até a máquina falhar e você começar de novo.

100% browser, single-page, zero assets externos (arte procedural em Canvas, áudio
sintetizado via WebAudio), funciona offline após o primeiro load. PT-BR.

## Como jogar

```bash
npm install
npm run dev        # abre em http://localhost:5173
```

1. **Arraste** símbolos da mão para a grade. O pulso entra pela **seta ciano** (fileira 2)
   e percorre a máquina de peça em peça — célula vazia interrompe o ramo.
2. Cada símbolo tem um **Disparo** (o que faz) e uma **Emissão** (para onde manda o pulso).
   Segure/hover para ver o tooltip.
3. Aperte **RESOLVER**. Pontuação = pontos × mult, elo a elo. Bata a meta → fichas + loja.
   Falhe → fim da run (a seed fica na tela de morte; cole-a numa nova run para repetir).
4. A cada 3 rodadas, um **chefe** muda uma regra. A cada ante, a meta escala. 8 antes = vitória
   (e o Ante Infinito te espera).

Regras que valem ouro: **Crescendo** (elos além do 4º pontuam +30% por elo — cadeias fundas
pagam), juros (1 ficha a cada 5 guardadas), e Overflow (3× a meta → chuva de fichas).

Dicas de leitura: âmbar = pontos · vermelho = mult · dourado = fichas · ciano = fluxo ·
magenta = chefe. Velocidade 1×/2×/4× no topo. Sucata (⚙) compra upgrades e Emissores na Oficina.

## Desenvolvimento

```bash
npm test                        # suite (91 casos): propagação, símbolos, lendários, run, Gate 4
npm run build                   # tsc --noEmit + vite build (dist/ ~60 KB)
npm run harness -- --runs 2000  # Monte Carlo de balanceamento (3 bots, critérios do Gate 2)
npx tsx src/sim/debug.ts sinergia SEED   # trace de uma run de bot
node scripts/autoplay.mjs 50    # bot_sinergia DENTRO da UI real (headless chromium)
```

- `src/engine/` — motor headless puro e determinístico (seed → mesma run, sempre).
- `src/sim/` — bots (aleatório/guloso/sinergia) + harness de critérios (§8 da spec).
- `src/ui/` — Canvas, juice (5 níveis com orçamento), áudio, meta-progressão.
- `SPEC_CASCATA.md` — a spec executável. `DECISIONS.md` — decisões de design do agente.
  `BALANCE_LOG.md` — histórico das 38 iterações de balanceamento e estado do Gate 2.

## Arquitetura em 5 linhas

Motor e render são separados: `resolve(grid, mods)` é uma função pura que devolve a lista
de eventos da cascata (determinística, testável, usada por igual pelo jogo, pelos bots do
harness e pelo preview de impacto). A UI só reproduz esses eventos com juice. Todo o estado
é serializável em JSON (save automático de run em `localStorage`). RNG próprio (mulberry32)
com seed visível e compartilhável.
