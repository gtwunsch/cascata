/** Purpose: motor de propagação da cascata (§4.3) — puro e determinístico | Exports: resolve, novaResolucao, EMISSOR_PADRAO | Dependencies: dirs, registry, types */
import { DIR_R, DX, DY, GRID_H, N_CELLS, cellIdx, inBounds } from './dirs';
import { getSymbol } from './registry';
import type { Pulse, Resolucao, ResolveMods, RunView, TriggerCtx } from './types';

const TICK_CAP = 400; // trava de segurança; término é garantido por D3, isto nunca deve atingir
const PULSE_CAP = 64; // pulsos simultâneos máximos (determinístico: excedentes descartados em ordem)

export const EMISSOR_PADRAO = { x: -1, y: 1, dir: DIR_R } as const;

export function novaResolucao(): Resolucao {
  return {
    pontos: 0,
    mult: 1,
    fichas: 0,
    eventos: [],
    maxCadeia: 0,
    disparos: 0,
    disparosPorPapel: { gerador: 0, condutor: 0, amplificador: 0, gatilho: 0, economico: 0 },
    disparosPorCelula: new Array(N_CELLS).fill(0),
    midasFichas: 0,
    rerollGratis: false,
    memDeltas: new Array(N_CELLS).fill(0),
    score: 0,
  };
}

/**
 * Resolve uma cascata. Puro: não muta run nem grid (deltas de mem ficam em res.memDeltas).
 * Determinismo (D7): a cada tick todos os pulsos avançam 1 célula e são processados em
 * ordem (fileira, coluna, direção).
 */
export function resolve(run: RunView, mods: ResolveMods = {}): Resolucao {
  // efeitos globais estruturais derivados dos lendários presentes na grade
  let ghost = false;
  let maxFires = 1;
  let espelhado = false;
  for (const p of run.grid) {
    if (!p) continue;
    const g = getSymbol(p.id).global;
    if (!g) continue;
    if (g.ghost) ghost = true;
    if (g.maxFires !== undefined && g.maxFires > maxFires) maxFires = g.maxFires;
    if (g.emissorEspelhado) espelhado = true;
  }

  const emitters = mods.emitters ?? [EMISSOR_PADRAO];
  const pot0 = mods.potenciaInicial ?? 1;
  let pulses: Pulse[] = emitters.map((e) => ({ x: e.x, y: e.y, dir: e.dir, potencia: pot0, depth: 0 }));
  if (espelhado) {
    const base = emitters[0]!;
    pulses.push({ x: base.x, y: GRID_H - 1 - base.y, dir: base.dir, potencia: pot0, depth: 0 });
  }

  const res = novaResolucao();
  let apagouPrimeiro = false;

  for (let tick = 1; tick <= TICK_CAP && pulses.length > 0; tick++) {
    // 1) todos os pulsos avançam 1 célula na sua direção
    const moved: Pulse[] = [];
    for (const p of pulses) {
      const nx = p.x + DX[p.dir]!;
      const ny = p.y + DY[p.dir]!;
      if (!inBounds(nx, ny)) continue; // saiu da grade
      moved.push({ x: nx, y: ny, dir: p.dir, potencia: p.potencia, depth: p.depth });
    }
    // 2) ordem determinística: cima→baixo, esquerda→direita, direção
    moved.sort((a, b) => a.y - b.y || a.x - b.x || a.dir - b.dir);

    const next: Pulse[] = [];
    for (const p of moved) {
      if (mods.chainCap !== undefined && p.depth >= mods.chainCap) continue; // curto-circuito
      const idx = cellIdx(p.x, p.y);
      if (mods.blockedCells?.has(idx)) continue; // estática
      const placed = run.grid[idx];
      if (!placed) {
        if (ghost) next.push(p); // fantasma: atravessa vazio
        continue; // célula vazia interrompe o ramo (§4.3.3)
      }
      const def = getSymbol(placed.id);
      const ctx: TriggerCtx = {
        res,
        run,
        def,
        self: placed,
        potencia: p.potencia,
        depth: p.depth + 1,
        cell: idx,
        dirIn: p.dir,
        mem: () => placed.mem + res.memDeltas[idx]!,
        bumpMem: (n) => {
          res.memDeltas[idx] = res.memDeltas[idx]! + n;
        },
      };
      const podeFisico = res.disparosPorCelula[idx]! < maxFires && mods.disabledRow !== p.y;
      const podeCond = def.podeDisparar ? def.podeDisparar(ctx) : true;
      if (!podeFisico || !podeCond) {
        next.push(p); // atravessa sem disparar (D3)
        continue;
      }
      if (mods.apagao && !apagouPrimeiro) {
        apagouPrimeiro = true;
        next.push(p); // mutador apagão: o 1º elo não dispara
        continue;
      }

      // 3) disparo
      res.disparosPorCelula[idx] = res.disparosPorCelula[idx]! + 1;
      const multAntes = res.mult;
      const pontosAntes = res.pontos;
      const fichasAntes = res.fichas;
      def.onTrigger?.(ctx);
      const bonus = mods.bonusPapel?.[def.papel];
      if (bonus) res.pontos += bonus * p.potencia;
      if (mods.tetoMult !== undefined && res.mult > mods.tetoMult) res.mult = mods.tetoMult;
      res.disparos++;
      res.disparosPorPapel[def.papel]++;
      if (ctx.depth > res.maxCadeia) res.maxCadeia = ctx.depth;
      res.eventos.push({
        tick,
        cell: idx,
        symbolId: def.id,
        depth: ctx.depth,
        pontosDelta: res.pontos - pontosAntes,
        multAntes,
        multDepois: res.mult,
        fichasDelta: res.fichas - fichasAntes,
        potencia: p.potencia,
        scoreParcial: Math.round(res.pontos * res.mult),
      });

      // 4) emissão
      const outs = def.emitir ? def.emitir(p.dir, ctx) : [{ dir: p.dir }];
      for (const o of outs) {
        if (next.length >= PULSE_CAP) break;
        const pot = p.potencia * (o.potenciaMul ?? 1) + (o.potenciaAdd ?? 0);
        if (o.reinjetar) {
          const e0 = emitters[0]!;
          next.push({ x: e0.x, y: e0.y, dir: e0.dir, potencia: pot, depth: ctx.depth });
        } else {
          next.push({ x: p.x, y: p.y, dir: o.dir, potencia: pot, depth: ctx.depth });
        }
      }
    }
    pulses = next;
  }

  // 5) score final (relíquias de fim de resolução aplicam sobre o mult)
  let mult = res.mult;
  for (const f of mods.finalMultAdd ?? []) if (res.maxCadeia >= f.minCadeia) mult += f.add;
  for (const f of mods.finalMultMul ?? []) if (res.maxCadeia >= f.minCadeia) mult *= f.mul;
  if (mods.tetoMult !== undefined && mult > mods.tetoMult) mult = mods.tetoMult;
  res.score = Math.round(res.pontos * mult);
  return res;
}
