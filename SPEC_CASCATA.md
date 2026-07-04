# CASCATA — Spec de Design para Execução Autônoma
### Roguelike engine-builder de reações em cadeia | Browser | Zero assets externos
**Versão 1.0 — Documento de handoff para execução autônoma por agente (Claude Code / Fable 5)**

---

## 0. Como ler este documento

Este documento é uma spec executável. Ele define O QUÊ e POR QUÊ, e deliberadamente não define COMO implementar (arquitetura de código é decisão do agente executor). As únicas exceções são as restrições técnicas da Seção 10 e o protocolo da Seção 9, que são vinculantes.

Regra de interpretação: quando houver conflito entre "ficar bonito" e qualquer critério mensurável deste documento, o critério mensurável vence. Quando houver ambiguidade não coberta aqui, decida pelo princípio da Seção 2 mais aplicável e registre a decisão em `DECISIONS.md`.

---

## 1. Identidade

**Conceito em uma frase:** você constrói uma máquina de reações em cadeia numa grade, aperta um botão, e assiste sua engenhoca destruir metas de pontuação cada vez mais absurdas — até que a máquina falhe e você comece de novo.

**Fantasia central:** não é sorte, é inevitabilidade. O jogador não aposta contra a banca — ele CONSTRÓI a banca. O prazer é empilhar probabilidade a seu favor até que o resultado pareça quebrado, e saber que foi você que quebrou.

**Pilares (invioláveis, em ordem de prioridade):**

1. **O momento RESOLVER é sagrado.** Todo o jogo existe para o momento em que o jogador aperta o botão e assiste a cascata disparar. Qualquer decisão que dilua esse momento está errada.
2. **Um verbo.** A interação primária é uma só: posicionar peças na grade. Sem timing, sem mira, sem reflexo. Toda a profundidade vem de ONDE e O QUE posicionar.
3. **Fricção zero entre runs.** Morrer → nova run em 1 clique e < 2 segundos. Sem telas intermediárias obrigatórias, sem confirmações, sem loading perceptível.
4. **Legibilidade antes de espetáculo.** O jogador precisa ler o estado do jogo em qualquer momento. Juice que atrapalha leitura é bug, não feature.
5. **Design limpo.** Zero dark patterns: sem timers de retenção, sem recompensa por login, sem punição por ausência, sem loops de culpa. O jogo respeita o tempo do jogador; ele volta porque a mecânica recompensa, não porque foi manipulado.

---

## 2. Fundamentos de design (derivados de pesquisa — cada regra tem um porquê)

Estes princípios foram extraídos da análise dos casos de maior sucesso do gênero (Balatro: 7M+ cópias, GOTY GDC 2025; Vampire Survivors; literatura acadêmica de game feel). Cada um vira requisito verificável mais adiante.

**F1 — Recompensa variável em três camadas.** O motor de compulsão do Balatro opera recompensa variável em três níveis simultâneos: dentro da mão (quanto vai pontuar?), na loja (o que vai aparecer?), e na run (a build vai fechar?). CASCATA replica: dentro da cascata (até onde a cadeia vai?), no draft (o que vem?), na run (a máquina escala?).

**F2 — Interação de modificadores > modificadores.** O vício do Balatro não vem dos Jokers individuais, vem do que acontece quando eles interagem — cada um muda uma regra simples, e em combinação produzem cadeias que escalam de centenas a milhões. Requisito: todo símbolo de CASCATA deve ser trivial isolado e explosivo em combinação. Se um símbolo é forte sozinho, ele está mal desenhado.

**F3 — Escalação numérica visível.** Números que crescem exponencialmente E são mostrados crescendo (não apenas o total final) são o payoff sensorial. A cascata resolve passo a passo, com o placar subindo em tempo real.

**F4 — Cadência de recompensa < 10s.** Vampire Survivors quase nunca deixa passar segundos sem algo bom acontecer. Em CASCATA: durante a fase de construção, cada peça posicionada dá preview de impacto; durante a resolução, algo dispara na tela continuamente.

**F5 — 3 a 4 opções por escolha.** O criador de Vampire Survivors testou e concluiu: 2 opções é pouco, mais de 4 sobrecarrega. Todo draft/loja de CASCATA oferece exatamente 3 opções (+1 slot de reroll pago).

**F6 — O "momento ímã".** Um único evento que converte esforço acumulado numa enxurrada visível de recompensa é mais satisfatório que qualquer recompensa individual. CASCATA precisa do seu: o **Overflow** — quando a cascata excede a meta em 3x+, o excedente vira moeda extra em chuva visível de fichas.

**F7 — Sessão curta com fim natural.** Runs de 20–40 minutos são o comprimento ideal — satisfatório mas encaixável entre compromissos, e a base do "one more run", o loop de retenção mais poderoso do gênero. Meta: run completa (vitória) em 25–35 min; derrota mediana em 12–18 min.

**F8 — Emergência gera histórias.** Sistemas que interagem de formas não planejadas fazem o jogador contar para os amigos — "você não vai acreditar na minha run" é marketing que se gera sozinho. Requisito estrutural: o espaço de combinações deve ser grande o suficiente para que builds inéditas surjam (ver critério de diversidade na Seção 8).

**F9 — Meta-progressão de baseline, não de conteúdo pago.** Vampire Survivors mantém o ouro entre runs para upgrades incrementais minúsculos que, somados, dobram o baseline — progresso sem grind percebido. CASCATA: desbloqueios de símbolos novos + upgrades permanentes pequenos (< 3% cada).

**F10 — Velocidade ajustável.** Balatro permite comprimir animações de espera — encurtar o loop de reforço positivo respeita o tempo do jogador veterano. CASCATA: 3 velocidades de resolução (1x, 2x, 4x), persistente.

**F11 — Cor como sistema de informação.** Categorias de matiz comunicam estado e urgência sem ambiguidade; o olho volta para o que importa sem fadiga visual. Paleta de CASCATA na Seção 7.

**F12 — Juice com orçamento.** Feedback audiovisual abundante amplifica interatividade, mas juice demais impede distinguir o que tem importância mecânica. Todo efeito de CASCATA tem orçamento e hierarquia (Seção 6).

---

## 3. Core loop

### 3.1 Loop de segundos (fase de construção)
1. Jogador vê a grade, a mão de símbolos, e a meta da rodada.
2. Arrasta símbolo da mão para célula da grade → preview instantâneo do impacto estimado (delta de pontuação projetada, calculado por simulação interna de 1 rollout).
3. Repete até esgotar posicionamentos da rodada (base: 3 por rodada).
4. Aperta **RESOLVER**.

### 3.2 Loop de minutos (rodada)
1. Pulso entra na grade pelo **Emissor** (célula fixa, borda esquerda).
2. Cascata propaga (regras na Seção 4.3), placar sobe em tempo real com juice crescente.
3. Pontuação ≥ meta → recompensa em fichas + loja (3 símbolos, 1 relíquia, reroll pago). Overflow se 3x+.
4. Pontuação < meta → fim da run. Tela de morte mostra: pontuação final, melhor cadeia, símbolo MVP, e botão NOVA RUN gigante.
5. Próxima rodada: meta escala.

### 3.3 Loop de run
- **8 antes**, 3 rodadas cada (pequena, grande, **chefe**). Total: 24 rodadas para vencer.
- Rodadas de chefe têm um **mutador** que restringe opções (ex.: "símbolos da fileira central não disparam", "cadeias máximas de 6 elos") — força adaptação da build, no espírito dos boss blinds do Balatro que desabilitam recursos do jogador.
- Vitória no ante 8 → estatísticas da run + desbloqueio + oferta de **Ante Infinito** (endless para leaderboard local).

### 3.4 Loop de meta-progressão
- Fichas excedentes ao fim da run (vitória ou derrota) viram **Sucata**, moeda permanente.
- Sucata compra: novos símbolos para o pool global (conteúdo), upgrades de baseline minúsculos (+1 reroll inicial, +2% fichas, etc.), e novos Emissores (equivalente aos decks do Balatro — cada um muda uma regra inicial).
- 15 conquistas com recompensa concreta (desbloqueio), organizadas como desafios ótimos: cada uma alcançável dentro de ~1h da anterior.

---

## 4. Sistemas

### 4.1 A grade
- 5 colunas × 4 fileiras (20 células). Pequena o suficiente para leitura instantânea, grande o suficiente para topologia importar.
- O Emissor ocupa célula fixa fora da grade (borda esquerda, fileira 2). Emite 1 pulso por resolução (upgradável).

### 4.2 Símbolos (as peças)
Todo símbolo tem: custo, raridade, **Disparo** (o que faz quando o pulso o atinge) e **Emissão** (para onde propaga o pulso depois). Formato canônico legível por máquina:

```
id: prisma
raridade: incomum
custo: 5
disparo: +15 pontos
emissao: duplica o pulso para as 2 diagonais frontais
tags: [multiplicador_de_fluxo]
```

**Taxonomia de papéis (todo símbolo pertence a exatamente 1):**
| Papel | Função | % do pool |
|---|---|---|
| Gerador | pontos brutos ao disparar | 30% |
| Condutor | redireciona/duplica/acelera o pulso | 25% |
| Amplificador | multiplica pontos de símbolos subsequentes na cadeia | 20% |
| Gatilho | efeitos condicionais (se X na cadeia, então Y) | 15% |
| Econômico | gera fichas, rerolls, ou manipula a loja | 10% |

**Conteúdo mínimo v1: 60 símbolos** (24 comuns, 18 incomuns, 12 raros, 6 lendários). Lendários quebram uma regra estrutural cada (ex.: "o pulso atravessa células vazias", "cadeias podem revisitar símbolos 1x").

### 4.3 Regras de propagação (o coração — determinístico)
1. Pulso entra pelo Emissor com **potência 1**.
2. Ao atingir célula ocupada: símbolo dispara (efeitos aplicam), depois emite conforme sua regra de Emissão.
3. Célula vazia interrompe aquele ramo do pulso.
4. Cada símbolo dispara no máximo 1x por resolução (salvo efeitos que digam o contrário).
5. Pulsos duplicados resolvem em ordem determinística: cima→baixo, esquerda→direita.
6. Pontuação = Σ(pontos de disparo) × Π(multiplicadores ativos), calculada elo a elo.

Determinismo total (dado seed + estado da grade) é requisito inegociável: é o que torna o preview honesto e a validação por simulação possível.

### 4.4 Economia
- Fichas ganhas por rodada: base 4 + 1/elo da maior cadeia (cap 10) + juros (1 ficha por 5 guardadas, cap 5 — cria a tensão gastar-vs-poupar do Balatro).
- Preços: comum 3–4, incomum 5–7, raro 8–11, lendário 14–18. Reroll: 2, +1 por uso na mesma loja.
- Remover símbolo da grade: grátis 1x/rodada (evita builds travadas), depois 2 fichas.

### 4.5 Escalação de metas
Curva-alvo (sujeita a ajuste pelo harness da Seção 8, que tem autoridade final):
`meta(ante, rodada) = 40 × 2.1^(ante-1) × [1.0, 1.5, 2.2][rodada]`
Racional: crescimento geométrico que a pontuação linear não acompanha — obriga o jogador a encontrar multiplicação (F2). Ante 8 chefe ≈ 200k+.

### 4.6 Mutadores de chefe (mínimo 12 no pool, 8 usados por run, sorteio sem reposição)
Cada mutador remove uma opção em vez de inflar números. Exemplos vinculantes: "Curto-circuito: cadeias > 7 elos param", "Estática: 3 células aleatórias bloqueadas", "Imposto: a loja seguinte não existe", "Espelho: o Emissor muda para a borda direita".

---

## 5. Estética (zero assets externos)

- **100% procedural**: formas geométricas, gradientes e partículas via Canvas. Nenhum arquivo de imagem, nenhuma fonte externa além de 1 system font stack monoespaçada.
- Direção de arte: "painel de máquina retrofuturista" — fundo escuro (quase-preto azulado), símbolos como chips/válvulas geométricas com glow, estética de fosforescência de osciloscópio. Referência de mood, não de fidelidade: Balatro prova que CRT-retro coeso vence fidelidade alta.
- **Áudio 100% sintetizado** via WebAudio (osciladores + envelopes). Sem samples. Regra F3-áudio: o pitch dos bipes de pontuação sobe com o tamanho da cadeia — a sincronia número-pitch é multiplicador comprovado de satisfação.
- Consistência de fidelidade uniforme: nada pode parecer de outro jogo. Um "meio consistente" lê melhor que um herói polido cercado de partes toscas.

---

## 6. Spec de juice (mensurável e com orçamento)

Hierarquia de intensidade — eventos maiores ganham mais juice, e NADA abaixo pode usar o juice do nível acima:

| Nível | Evento | Efeitos permitidos | Duração |
|---|---|---|---|
| 1 | disparo comum | flash do símbolo + bipe + número flutuante | ≤ 150ms |
| 2 | multiplicador ativa | nível 1 + pulso de escala do placar + pitch sobe | ≤ 250ms |
| 3 | cadeia ≥ 8 elos | nível 2 + screen shake sutil (≤ 4px) + partículas | ≤ 400ms |
| 4 | meta batida | nível 3 + banner + acorde resolvido | ≤ 800ms |
| 5 | Overflow (3x+) | tudo + chuva de fichas + hit-stop de 120ms antes | ≤ 1500ms |

Regras vinculantes:
- **Hit-stop** (congelamento breve) reservado EXCLUSIVAMENTE para o nível 5 — é o que o torna especial.
- Screen shake nunca durante decisão do jogador, apenas durante resolução.
- Toda animação de interface tem easing (nada linear); peças arrastadas têm inércia simulada e snap magnético com damping — a "tangibilidade" das microinterações do Balatro.
- **Oil além de juice** (suavizadores invisíveis): drag tolerante a soltar perto da célula (snap num raio de 40% da célula), hover mostra tooltip em ≤ 100ms, undo do último posicionamento antes de RESOLVER.
- Nas velocidades 2x/4x, durações dividem proporcionalmente mas hierarquia se mantém.

---

## 7. Legibilidade e UX

- **Cor como linguagem estrita**: pontos = âmbar; multiplicadores = vermelho; fichas/economia = dourado-esverdeado; pulso/fluxo = ciano; perigo/chefe = magenta. Nenhuma cor usada fora de sua categoria, nunca.
- **Divulgação progressiva**: zero tutorial em texto corrido. Tooltip instantâneo em hover/long-press em qualquer símbolo, a qualquer momento. Primeira run tem 3 hints contextuais de 1 frase, descartáveis.
- Fundo muda de tom em rodada de chefe (âncora visual de mudança de modo, sem popup).
- O estado completo (pontos atuais, meta, fichas, posicionamentos restantes) legível em 1 olhada, tipografia com hierarquia de 3 tamanhos.
- Uma tela só. Loja é overlay, não navegação.
- Mobile-first no layout (grade funciona em portrait), mouse/touch equivalentes.

---

## 8. Balanceamento como critérios testáveis (gate obrigatório)

O agente executor DEVE construir, antes da UI, um **motor headless** + **harness de Monte Carlo** com 3 bots de política distinta:
- `bot_guloso`: maximiza pontos imediatos por posicionamento.
- `bot_sinergia`: maximiza valor esperado de 200 rollouts por decisão.
- `bot_aleatorio`: decisões válidas uniformes (baseline de sanidade).

**Critérios de aceite (rodar ≥ 2.000 runs simuladas por bot por iteração de balanceamento):**

| Métrica | Alvo | Racional |
|---|---|---|
| Taxa de vitória `bot_sinergia` | 12–20% | jogo difícil mas vencível com skill |
| Taxa de vitória `bot_guloso` | 3–8% | ganância pura deve perder para construção |
| Taxa de vitória `bot_aleatorio` | < 0.5% | decisões precisam importar |
| Ante mediano de morte (sinergia) | 5–6 | morte no meio > morte no começo (quase-vitória motiva) |
| % de runs de sinergia com cadeia ≥ 10 elos | ≥ 60% | o momento espetacular precisa ser frequente |
| Diversidade de builds vencedoras | nenhum símbolo em > 45% das vitórias | sem estratégia dominante (F8) |
| Símbolos "mortos" | nenhum símbolo com winrate-quando-comprado < 70% da média | todo conteúdo é viável |
| Duração simulada de vitória | 24 rodadas com ~90–140 decisões totais | proxy dos 25–35 min reais |

Se qualquer critério falhar: ajustar números (curva de metas, custos, valores de símbolos), NUNCA remover mecânicas para passar no teste, e re-rodar. Registrar cada iteração em `BALANCE_LOG.md` com os números de antes/depois.

---

## 9. Protocolo de execução autônoma (fases com gates)

Executar estritamente em ordem. Cada gate deve passar antes da fase seguinte. Proibido implementar UI antes do Gate 2.

**Fase 0 — Setup.** Repositório, Vite + TypeScript vanilla (sem framework de UI), estrutura de pastas, `DECISIONS.md` e `BALANCE_LOG.md` criados.

**Fase 1 — Motor headless.** Regras da Seção 4 puras, sem DOM. Seed determinística.
→ **Gate 1**: suite de testes unitários das regras de propagação (mínimo 40 casos, incluindo ordem determinística de pulsos duplicados e todos os lendários); 100% verde.

**Fase 2 — Conteúdo + balanceamento.** Os 60 símbolos, 12 mutadores, economia. Harness de Monte Carlo.
→ **Gate 2**: TODOS os critérios da Seção 8 passando. Este é o gate mais importante do projeto.

**Fase 3 — UI e juice.** Canvas, interações, spec da Seção 6 e 7.
→ **Gate 3**: checklist automatizado — preview de impacto presente; NOVA RUN em ≤ 2s (medido); 3 velocidades funcionais; tooltips em 100% dos símbolos; hierarquia de juice auditada contra a tabela (nenhum evento usando efeito de nível superior); roda a 60fps numa resolução de cascata com 15 elos (medir com Performance API).

**Fase 4 — Áudio + meta-progressão.** WebAudio sintetizado, Sucata, desbloqueios, conquistas, persistência em localStorage.
→ **Gate 4**: pitch escala com cadeia (teste automatizado de frequência); estado persiste entre reloads; as 15 conquistas disparam corretamente em runs simuladas via motor headless dirigindo a UI.

**Fase 5 — Polimento e auto-playtest.** Rodar o `bot_sinergia` DENTRO da UI real (headless browser) por 50 runs; capturar erros de console, travamentos, estados impossíveis. Corrigir. Gerar `README.md` com como jogar e como rodar o harness.
→ **Definition of Done**: zero erros de console em 50 runs automatizadas na UI; todos os gates anteriores ainda verdes; build de produção < 500KB total.

**Orçamento de decisão:** o agente tem autonomia total dentro desta spec. Mudanças que violem Pilares (Seção 1) ou critérios (Seção 8) são proibidas. Tudo mais é decidível — decidir, registrar em `DECISIONS.md`, seguir. Não parar para perguntar.

---

## 10. Restrições técnicas

- Browser puro, single-page, sem backend. TypeScript + Vite. Zero dependências de runtime além de nada (sem Three.js — o jogo é 2D; sem framework de UI; motor e render separados).
- Canvas 2D para a grade e efeitos; DOM apenas para loja/tooltips/menus.
- Todo o estado de jogo serializável em JSON (save de run em andamento incluído).
- RNG próprio com seed (mulberry32 ou equivalente); seed visível na tela de morte e inserível em nova run (compartilhamento de seeds = histórias, F8).
- localStorage para persistência. Funciona offline após primeiro load.

## 11. Anti-goals (resultados proibidos)

- ❌ Qualquer mecânica de retenção extrínseca: daily rewards, streaks, notificações, energia.
- ❌ Tempo real influenciando gameplay (exceto animações).
- ❌ Símbolo cuja descrição não caiba em 140 caracteres.
- ❌ Texto de tutorial com mais de 1 frase por hint.
- ❌ Qualquer aleatoriedade na RESOLUÇÃO da cascata (variância pertence ao draft, nunca à execução — o jogador nunca pode sentir que a máquina o traiu).
- ❌ Placeholder art "a melhorar depois": a estética procedural É a estética final.
- ❌ Passar num gate afrouxando o critério do gate.

## 12. Fora de escopo (v1)

Multiplayer, leaderboard online, mobile app nativo, mais de 1 modo além do Ante Infinito, localização além de PT-BR, acessibilidade além de daltonismo (incluir 1 paleta alternativa deutera-friendly — isto está EM escopo).

---
*Fim da spec. Executar Fase 0.*
