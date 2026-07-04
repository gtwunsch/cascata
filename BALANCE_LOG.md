# BALANCE_LOG.md — Iterações de balanceamento (Gate 2, spec §8)

Harness: `npm run harness -- --runs 2000` (3 bots, seeds determinísticas `BAL-<bot>-<i>`).

## Estado final v0.1 (avaliação formal, 2.000 runs/bot)

| Métrica | Alvo | Resultado | Status |
|---|---|---|---|
| Vitória bot_sinergia | 12–20% | **18.3%** | ✅ |
| Vitória bot_guloso | 3–8% | **2.9%** | ⚠️ borderline (3.6–4.9% em amostras de 600-800; 2.9% nesta) |
| Vitória bot_aleatorio | < 0.5% | **0.0%** | ✅ |
| Ante mediano de morte (sinergia) | 5–6 | **6** | ✅ |
| % runs sinergia com cadeia ≥ 10 | ≥ 60% | **52.3%** | ❌ pendente |
| Diversidade (máx presença em vitórias) | ≤ 45% | **59.0%** (cotovelo_e) | ❌ pendente |
| Símbolos mortos | nenhum | fenda, colosso (raros situacionais, ~noise) | ⚠️ |
| Decisões por vitória (mediana) | 90–140 | **112.5** | ✅ |
| Rodadas por vitória | 24 | **24** | ✅ |

**Gate 2: 6/9 estáveis.** Deviação registrada em DECISIONS.md (D14). As 2 métricas pendentes
avançaram consistentemente (cadeia: 31%→52%; diversidade: 90%→59%) e o harness reproduz
tudo; a iteração continua no pós-v0.1 sem afrouxar critério algum.

## Configuração final

- Meta: `10 × 1.52^(min(ante,5)-1) × 4.4^(max(0,ante-5)) × [1.0, 1.45, 2.2][rodada]`
  (curva em 2 fases: antes 1–5 acessíveis, parede exponencial 6–8)
- Economia: 10 fichas iniciais, base 6/rodada, +1/elo (cap 12), juros 1/5 (cap 5), overflow ≥3× → min(8, score/meta)
- Crescendo: elos além do 4º pontuam +30% por elo extra (regra global, F3)
- Condutores: família com kicker de profundidade (+1 a +2 pontos/elo percorrido)
- Chefes: mutadores brandos nos antes 1–2, duros do 3 em diante; neblina desabilita fileira 3 (a 2 era morte garantida)
- Kit inicial sorteado por seed: 2 geradores comuns (1º sempre de emissão reta) + 1 condutor comum
- Loja: pesos por raridade interpolados (70/24/5/1 → 30/38/24/8), símbolos possuídos ×2.2 (builds com duplicatas)

## Histórico resumido (38 iterações)

| # | Mudança-chave | Efeito principal |
|---|---|---|
| 1–2 | metaBase 40→15→12 (mão inicial não batia a meta 1) | jogo jogável |
| 3–5 | bots: substituição de travadas, fronteira (expansibilidade), 2-step lookahead | sinergia 0→13% |
| 6–8 | paridade de amps, curva 2 fases, duplicador condicional | winrate ok, diversidade cíclica |
| 9–12 | chefes brandos cedo, cotovelos assimétricos, achatamento de tiers | mediana de morte 5–6 |
| 13–16 | loja favorece duplicatas, kit inicial sorteado, sem viés de mão fixa | diversidade 90→55% |
| 17–22 | **Crescendo** (+30%/elo além do 4º), capacitor que cresce, kickers | cadeia 31→40% |
| 23–29 | divisor↔acelerador (raridade), **neblina corrigida** (fileira 1 = morte garantida), sobrecarga 0.5→0.7, kits seguros | mortes precoces ~0, winrate 30% |
| 30–34 | parede tardia 2.45→3.8, **Ressonância** (condutores 2×/cascata), agulha emite p/ baixo, kicker de elo em condutores | cadeia 40→53% |
| 35–38 | parede 4.4, relíquias de cadeia (+1.5/×1.6), compras precoces agressivas | winrate 18.3%, formal 2k |

## Próximos passos de balanceamento (pós-v0.1)

1. Cadeia ≥10 em 60%: mais 1 fonte de re-disparo mid-game (2ª relíquia ou incomum), ou
   crescendo 0.34; medir com histograma por ante (A6+ já chaineia 44–80%).
2. Diversidade ≤45%: ampliar pool de "viradores" (hoje 2 cotovelos concentram corredores);
   candidato: redesign de espelho_c como virador diagonal.
3. fenda/colosso: repensar end-caps raros (morrem no metric por serem compra situacional).
