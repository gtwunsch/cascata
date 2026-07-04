# DECISIONS.md — Registro de decisões do agente executor

Formato: `D<N> — <decisão>` com racional curto. Decisões que interpretam ambiguidade da spec
(SPEC_CASCATA.md v1.0) sem violar Pilares (§1) nem critérios (§8).

---

**D1 — Repositório e branch.** O jogo vive no repo dedicado `gtwunsch/cascata` (criado pelo
usuário durante a sessão), branch `main` — repo novo e vazio, dedicado ao projeto.

**D2 — Direções em bússola de 8 pontos.** Pulsos têm direção ∈ {R, DR, D, DL, L, UL, U, UR}
(índices 0–7, rotação = ±k·45°). "Diagonais frontais" = rotate(±1); "virar" = rotate(±2).
Emissões são relativas à direção de entrada do pulso (spec §4.2 usa "frontais"), exceto
símbolos que declaram direções absolutas.

**D3 — Símbolo já disparado é atravessável.** Pulso que atinge símbolo já disparado passa
através sem disparar, mantendo direção e potência. Racional: célula ocupada não deve virar
parede acidental; sem rotação em pass-through não há loops infinitos (término garantido).

**D4 — Potência multiplica pontos de disparo.** Pulso carrega `potencia` (float, inicia 1).
Pontos de Gerador = base × potência. Duplicação de pulso preserva potência (F2: combinação
explosiva). Condutores podem modificar potência.

**D5 — Elo e cadeia.** "Elo" = 1 disparo na linhagem de um pulso (`depth`). "Maior cadeia" =
maior depth atingido na resolução. Mutadores de cap de cadeia usam depth.

**D6 — Fórmula da meta.** `meta(ante,rodada) = 40 × 2.1^(ante-1) × [1.0,1.5,2.2][rodada]`
(§4.5). Nota: o "Ante 8 chefe ≈ 200k+" da spec não bate com a própria fórmula (dá ≈15.8k);
a fórmula + harness (§8, autoridade final) governam. Valores finais em BALANCE_LOG.md.

**D7 — Ordem determinística de pulsos.** A cada tick, todos os pulsos avançam 1 célula e são
processados em ordem (fileira↑, coluna↑, dir↑). Dois pulsos no mesmo símbolo no mesmo tick:
o primeiro dispara, o segundo atravessa (D3).

**D8 — Overflow.** Se pontuação ≥ 3× meta: fichas extras = min(8, floor(pontuação/meta)).

**D9 — Mão e início de run.** Símbolos comprados vão para a "mão" (cap 8). Run inicia com mão
definida pelo Emissor escolhido (padrão: 2 geradores básicos + 1 condutor) e 6 fichas.

**D10 — Relíquias.** Spec cita "1 relíquia" na loja (§3.2) sem detalhar. Definidas como
modificadores passivos de run (12 no pool v1), preço 6–10, máx. 5 por run, 1 oferta por loja.

**D11 — bot_sinergia e os 200 rollouts.** Resolução é determinística (§11), então rollouts
só têm variância via lojas/drafts futuros. Implementação: por decisão, candidatos são
pré-filtrados por avaliação imediata (1 resolução cada) e os top-K recebem rollouts com
política de playout barata até o fim do ante corrente, num total de ≈200 rollouts por decisão.

**D12 — Lendários como quebras de regra estrutural (§4.2).** fantasma: pulso atravessa células
vazias; eco: cada símbolo dispara até 2×; nucleo: Emissor emite 2º pulso na fileira oposta;
singularidade: ×3 mult; reator: emite nas 4 ortogonais e pontua por ficha guardada; midas:
aumento de mult gera fichas.

**D14 — Gate 2 parcial, deviação transparente.** Após 38 iterações e ~40k runs simuladas,
6/9 critérios estáveis; cadeia≥10 (52.3% vs 60%) e diversidade (59% vs 45%) pendentes,
com progresso monotônico documentado. Decisão: prosseguir para as Fases 3–5 (o usuário
pediu jogabilidade nesta sessão) SEM afrouxar critérios — BALANCE_LOG.md guarda o estado
exato, o harness é reproduzível (`npm run harness`), e o plano de fechamento está listado.
Novas regras nascidas do balanceamento: **Crescendo** (elos 5+ pontuam +30%/elo),
kicker de profundidade em condutores, relíquia Ressonância, kit inicial sorteado por seed,
loja com viés para duplicatas, chefes brandos nos antes 1–2.

**D15 — Crescendo como regra global.** `pontos = base × potência × (1 + 0.30 × max(0, elo-4))`.
Nasceu no balanceamento para tornar profundidade competitiva com splits; vira elemento de
identidade (a cascata cresce em crescendo — F3).

**D16 — Evidência dos Gates 3/4/5 (medida, não presumida).** Gate 3: preview de impacto no
drag; NOVA RUN em 81ms (≤2s); 3 velocidades persistentes; tooltips em 100% dos símbolos
(mão/grade/loja); hierarquia de juice auditada contra a tabela §6 (hit-stop APENAS no
Overflow, shake nunca na fase de decisão); 60.0 FPS médio / 57.0 mínimo durante resoluções
(Performance API, headless). Gate 4: pitch sobe monotonicamente com a cadeia (teste de
frequência); estado persiste entre reloads; as 15 conquistas cobertas por testes unitários
E todas dispararam nas 50 runs automatizadas. Fase 5 (DoD): 50 runs do bot_sinergia DENTRO
da UI real → zero erros de console, zero estados impossíveis, 10 vitórias; build de
produção ~70 KB (< 500 KB). Deviação v0.1: desbloqueio de símbolos por Sucata adiado
(pool completo desde o início; Sucata compra emissores e upgrades) — o balanceamento foi
medido no pool cheio.

**D17 — Girar peças + fluxo projetado (feedback de playtest do usuário).** (a) Toda peça
posicionada pode ser GIRADA (grátis, na construção): a emissão é espelhada no eixo do
movimento do pulso — cotovelo ⤵ vira ⤴, dínamo emite na diagonal oposta, agulha passa a
emitir para cima; peças simétricas não mudam. Mantém o "um verbo" (§1.2): girar é parte de
posicionar, como orientar peça em Tetris. (b) A grade agora desenha o caminho projetado do
pulso durante a construção (ciano translúcido) — torna visível por que um símbolo fora do
fluxo não dispara e que cadeias múltiplas nascem de divisores/Emissor Gêmeo, não de mais
geradores. Bots ainda não usam girar (leve vantagem humana; anotado no BALANCE_LOG).

**D13 — Grid persiste, placar zera.** O grid (a máquina) persiste entre rodadas e antes da
mesma run. A pontuação de cada rodada é a de uma única resolução.
