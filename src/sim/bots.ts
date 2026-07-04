/** Purpose: 3 bots de política distinta para o harness de balanceamento (§8) | Exports: BOTS, jogarRun, RunResult | Dependencies: engine/run, engine/config */
import { metaDaRodada, type RunConfig } from '../engine/config';
import { N_CELLS } from '../engine/dirs';
import { getSymbol } from '../engine/registry';
import { Rng, seedFromString } from '../engine/rng';
import { Run } from '../engine/run';
import type { PlacedSymbol } from '../engine/types';

export interface Bot {
  nome: string;
  construir(run: Run, rng: Rng): void; // deve terminar chamando run.resolver()
  loja(run: Run, rng: Rng): void; // deve terminar chamando run.fecharLoja()
}

interface Candidato {
  maoIdx: number;
  cell: number;
  valor: number;
}

function celulasValidas(run: Run, maoIdx: number): number[] {
  const out: number[] = [];
  for (let c = 0; c < N_CELLS; c++) if (run.podePosicionar(maoIdx, c)) out.push(c);
  return out;
}

/** valor imediato: delta de score desta rodada (política do guloso) */
function deltaImediato(run: Run, maoIdx: number, cell: number, baseScore: number): number {
  const g = run.grid.slice();
  g[cell] = { id: run.mao[maoIdx]!, mem: 0 };
  return run.simular(g).score - baseScore;
}

/**
 * Qualidade da máquina (função de valor do sinergia): sobrevivência agora,
 * folga contra a meta futura, cadeia (F8/fichas), mult e fluxo.
 */
function qualidade(run: Run, grid?: (PlacedSymbol | null)[]): number {
  const res = run.simular(grid);
  // topologia: fileiras distintas percorridas pelo fluxo — máquinas em 4 fileiras têm corredores fundos
  const rowsUsed = new Set<number>();
  for (const ev of res.eventos) rowsUsed.add(Math.floor(ev.cell / 5));
  const metaNow = run.meta;
  const proxAnte = run.rodada === 3 ? run.ante + 1 : run.ante;
  const proxRodada = run.rodada === 3 ? 1 : run.rodada + 1;
  const metaNext = metaDaRodada(run.cfg, proxAnte, proxRodada);
  const ratioNow = res.score / Math.max(1, metaNow);
  const ratioNext = res.score / Math.max(1, metaNext);
  // retornos decrescentes: acima da meta, sobreviver já está garantido — crescimento vale mais
  const sobrevive = Math.min(1.15, ratioNow) * 12 + Math.min(1, Math.max(0, ratioNow - 1.15));
  const futuro = Math.min(1.3, ratioNext) * 7 + Math.min(2, Math.max(0, ratioNext - 1.3)) * 1.5;
  // fronteira = células vazias alcançadas pelo pulso: expansibilidade da máquina
  const abertura = Math.min(4, res.fronteira.length) * 1.8;
  const bonusCadeia = (res.maxCadeia >= 10 ? 6 : 0) + Math.min(run.cfg.fichasCadeiaCap, res.maxCadeia) * 0.5; // payout de fichas/cadeia // cadeia 2 dígitos: fichas no cap + relíquias de cadeia
  return sobrevive + futuro + abertura + rowsUsed.size * 1.4 + Math.min(res.maxCadeia, 16) * 1.5 + bonusCadeia + (res.mult - 1) * 1.2 + res.disparos * 0.2 + res.fichas * 0.25;
}

// ---------- bot_aleatorio: decisões válidas uniformes (baseline de sanidade) ----------

const aleatorio: Bot = {
  nome: 'aleatorio',
  construir(run, rng) {
    while (run.status === 'construindo' && run.placementsLeft > 0 && run.mao.length > 0) {
      const maoIdx = rng.int(run.mao.length);
      const cells = celulasValidas(run, maoIdx);
      if (cells.length === 0) break;
      run.posicionar(maoIdx, rng.pick(cells));
    }
    run.resolver();
  },
  loja(run, rng) {
    for (let i = run.shop.symbols.length - 1; i >= 0; i--) {
      const id = run.shop.symbols[i]!;
      if (rng.next() < 0.4 && run.fichas >= run.precoSimbolo(id)) run.comprar(i);
    }
    if (run.shop.relic && rng.next() < 0.3) run.comprarRelic();
    run.fecharLoja();
  },
};

// ---------- bot_guloso: maximiza pontos imediatos por posicionamento ----------

const guloso: Bot = {
  nome: 'guloso',
  construir(run) {
    while (run.status === 'construindo' && run.placementsLeft > 0 && run.mao.length > 0) {
      const base = run.simular().score;
      let best: Candidato | null = null;
      for (let m = 0; m < run.mao.length; m++) {
        for (const cell of celulasValidas(run, m)) {
          const valor = deltaImediato(run, m, cell, base);
          if (!best || valor > best.valor) best = { maoIdx: m, cell, valor };
        }
      }
      if (best && best.valor >= 1) {
        run.posicionar(best.maoIdx, best.cell);
        continue;
      }
      // nada melhora em célula vazia: tenta substituição míope (pontos imediatos)
      if (!tentarSubstituirImediato(run)) {
        if (best) run.posicionar(best.maoIdx, best.cell);
        else break;
      }
    }
    run.resolver();
  },
  loja(run) {
    // compra o símbolo de maior delta imediato enquanto puder (ganância pura; ignora juros e relíquias)
    for (let guard = 0; guard < 8; guard++) {
      const base = run.simular().score;
      let bestIdx = -1;
      let bestVal = 0;
      for (let i = 0; i < run.shop.symbols.length; i++) {
        const id = run.shop.symbols[i]!;
        if (run.fichas < run.precoSimbolo(id)) continue;
        let melhor = 0;
        for (let c = 0; c < N_CELLS; c++) {
          if (run.blockedCells.has(c)) continue;
          const g = run.grid.slice();
          g[c] = { id, mem: 0 };
          const d = run.simular(g).score - base;
          if (d > melhor) melhor = d;
        }
        if (melhor > bestVal) {
          bestVal = melhor;
          bestIdx = i;
        }
      }
      if (bestIdx < 0 || bestVal < 1) break;
      if (!run.comprar(bestIdx)) break;
    }
    // relíquias que pagam já (ganância): mais pontos ou mais posicionamentos imediatos
    const IMEDIATAS = ['braco_extra', 'lente_polida', 'turbina', 'bateria'];
    if (run.shop.relic && IMEDIATAS.includes(run.shop.relic) && run.fichas >= 12) run.comprarRelic();
    run.fecharLoja();
  },
};

// ---------- bot_sinergia: maximiza valor esperado com ~200 avaliações por decisão (D11) ----------

const RELIC_PRIORIDADE = ['ressonancia', 'braco_extra', 'prisma_bruto', 'lente_polida', 'bateria', 'turbina', 'metronomo', 'ima', 'estoque', 'cofre', 'faro', 'cupom', 'reciclagem'];

const sinergia: Bot = {
  nome: 'sinergia',
  construir(run, rng) {
    while (run.status === 'construindo' && run.placementsLeft > 0 && run.mao.length > 0) {
      const qPass = qualidade(run);
      const candidatos: Candidato[] = [];
      for (let m = 0; m < run.mao.length; m++) {
        for (const cell of celulasValidas(run, m)) {
          const g = run.grid.slice();
          g[cell] = { id: run.mao[m]!, mem: 0 };
          candidatos.push({ maoIdx: m, cell, valor: qualidade(run, g) });
        }
      }
      candidatos.sort((a, b) => b.valor - a.valor);
      // desempate: opções dentro de 0.4 de qualidade são equivalentes — sorteia (diversidade de builds)
      const topo = candidatos[0]?.valor ?? 0;
      const empatados = candidatos.filter((c) => c.valor >= topo - 1.0);
      if (empatados.length > 1) {
        const emb = rng.shuffle(empatados);
        candidatos.splice(0, empatados.length, ...emb);
      }
      // lookahead de 2 passos: um capacitor pode vencer no passo 1 e matar a expansão
      let best: Candidato | null = candidatos[0] ?? null;
      if (run.placementsLeft >= 2 && run.mao.length >= 2 && candidatos.length > 1) {
        let bestV2 = -Infinity;
        for (const c of candidatos.slice(0, 6)) {
          const g1 = run.grid.slice();
          g1[c.cell] = { id: run.mao[c.maoIdx]!, mem: 0 };
          let melhor2 = qualidade(run, g1);
          let avals = 0;
          for (let m2 = 0; m2 < run.mao.length && avals < 40; m2++) {
            if (m2 === c.maoIdx) continue;
            for (let cell2 = 0; cell2 < N_CELLS && avals < 40; cell2++) {
              if (g1[cell2] || !run.podePosicionar(m2, cell2)) continue;
              const g2 = g1.slice();
              g2[cell2] = { id: run.mao[m2]!, mem: 0 };
              const v2 = qualidade(run, g2);
              avals++;
              if (v2 > melhor2) melhor2 = v2;
            }
          }
          if (melhor2 > bestV2) {
            bestV2 = melhor2;
            best = c;
          }
        }
      }
      if (best && best.valor > qPass + 0.05) {
        run.posicionar(best.maoIdx, best.cell);
        continue;
      }
      // grade travada (ex.: capacitor bloqueou o fluxo): tenta remover-e-substituir
      if (!tentarSubstituir(run)) break;
    }
    run.resolver();
  },
  loja(run, rng) {
    let rerolls = 0;
    for (let guard = 0; guard < 14; guard++) {
      const qBase = qualidade(run);
      // 1) melhor símbolo comprável (símbolos têm prioridade sobre relíquias);
      //    avalia posicionar em célula vazia E substituir símbolo existente (máquinas travadas)
      const ofertas: { i: number; ganho: number; preco: number }[] = [];
      for (let i = 0; i < run.shop.symbols.length; i++) {
        const id = run.shop.symbols[i]!;
        const preco = run.precoSimbolo(id);
        if (run.fichas < preco) continue;
        let melhor = 0;
        for (let c = 0; c < N_CELLS; c++) {
          if (run.blockedCells.has(c)) continue;
          const ocupada = run.grid[c] !== null;
          const g = run.grid.slice();
          g[c] = { id, mem: 0 };
          const q = qualidade(run, g) - qBase - (ocupada ? 2.2 : 0); // desconto alto: substituir custa remoção e churn concentra builds
          if (q > melhor) melhor = q;
        }
        ofertas.push({ i, ganho: melhor, preco });
      }
      ofertas.sort((a, b) => b.ganho / b.preco - a.ganho / a.preco);
      // desempate aleatório entre ofertas quase-iguais (dentro de 10% de valor/ficha)
      const topoR = ofertas[0] ? ofertas[0].ganho / ofertas[0].preco : 0;
      const quase = ofertas.filter((o) => o.ganho / o.preco >= topoR * 0.75);
      const escolhida = quase.length > 1 ? quase[rng.int(quase.length)]! : ofertas[0];
      const bestIdx = escolhida ? escolhida.i : -1;
      const bestGanho = escolhida ? escolhida.ganho : 0;
      const bestPreco = escolhida ? escolhida.preco : 1;
      const colchao = run.ante <= 3 ? 4 : 10; // tempo cedo compõe mais que juros
      const gate = run.ante <= 3 ? 0.05 : 0.15;
      const furaJuros = run.fichas - bestPreco < colchao;
      if (bestIdx >= 0 && bestGanho > gate && (!furaJuros || bestGanho > 1.2) && run.mao.length < run.maoCap()) {
        if (!run.comprar(bestIdx)) break;
        continue;
      }
      // 2) relíquia só quando não há símbolo bom e o caixa está folgado
      if (run.shop.relic && bestGanho <= 0.15 && run.fichas >= 16 + 2 * RELIC_PRIORIDADE.indexOf(run.shop.relic)) {
        if (run.comprarRelic()) continue;
      }
      // 3) reroll se nada presta e há caixa
      if (bestGanho <= 0.15 && rerolls < 2 && run.fichas >= 14 + run.rerollCostAtual()) {
        if (run.reroll()) {
          rerolls++;
          continue;
        }
      }
      break;
    }
    run.fecharLoja();
  },
};

/** substituição míope do guloso: troca se o score imediato desta rodada subir */
function tentarSubstituirImediato(run: Run): boolean {
  if (run.mao.length === 0 || run.fichas < run.custoRemocao()) return false;
  const base = run.simular().score;
  let best: { cell: number; maoIdx: number; valor: number } | null = null;
  for (let c = 0; c < N_CELLS; c++) {
    if (!run.grid[c]) continue;
    for (let m = 0; m < run.mao.length; m++) {
      if (!run.podePosicionar(m, c, true)) continue;
      const g = run.grid.slice();
      g[c] = { id: run.mao[m]!, mem: 0 };
      const valor = run.simular(g).score - base;
      if (!best || valor > best.valor) best = { cell: c, maoIdx: m, valor };
    }
  }
  if (!best || best.valor < 1) return false;
  if (!run.remover(best.cell)) return false;
  return run.posicionar(best.maoIdx, best.cell);
}

/** remove o símbolo que mais limita a máquina e coloca o melhor da mão no lugar */
function tentarSubstituir(run: Run): boolean {
  if (run.mao.length === 0 || run.fichas < run.custoRemocao()) return false;
  const qBase = qualidade(run);
  let best: { cell: number; maoIdx: number; valor: number } | null = null;
  for (let c = 0; c < N_CELLS; c++) {
    if (!run.grid[c]) continue;
    for (let m = 0; m < run.mao.length; m++) {
      if (!run.podePosicionar(m, c, true)) continue; // válido mesmo após remoção (gelo/monotonia/estática)
      const g = run.grid.slice();
      g[c] = { id: run.mao[m]!, mem: 0 };
      const valor = qualidade(run, g);
      if (!best || valor > best.valor) best = { cell: c, maoIdx: m, valor };
    }
  }
  if (!best || best.valor <= qBase + 2.5) return false;
  if (!run.remover(best.cell)) return false;
  return run.posicionar(best.maoIdx, best.cell);
}

export const BOTS: Record<string, Bot> = { aleatorio, guloso, sinergia };

export interface RunResult {
  seed: string;
  win: boolean;
  ante: number;
  rodada: number;
  maxCadeia: number;
  decisoes: number;
  rodadas: number;
  comprados: string[];
  buildFinal: string[];
  scoreFinal: number;
}

export function jogarRun(seed: string, bot: Bot, pool: string[], cfg?: RunConfig): RunResult {
  const run = new Run(seed, { pool, cfg });
  const rng = new Rng(seedFromString(seed + ':bot'));
  let guard = 0;
  while ((run.status === 'construindo' || run.status === 'loja') && guard++ < 300) {
    if (run.status === 'construindo') bot.construir(run, rng);
    else bot.loja(run, rng);
  }
  return {
    seed,
    win: run.status === 'vitoria',
    ante: run.ante,
    rodada: run.rodada,
    maxCadeia: run.stats.maxCadeia,
    decisoes: run.stats.decisoes,
    rodadas: run.stats.rodadasJogadas,
    comprados: run.stats.comprados,
    buildFinal: run.grid.filter((p): p is PlacedSymbol => p !== null).map((p) => p.id),
    scoreFinal: run.stats.melhorScore,
  };
}

/** util para relatórios */
export function papelDe(id: string): string {
  return getSymbol(id).papel;
}
