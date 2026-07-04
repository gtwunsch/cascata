/** Purpose: playback da cascata com hierarquia de juice (§6) — hit-stop SÓ no nível 5 | Exports: Animacao | Dependencies: render, audio, palette */
import type { Resolucao } from '../engine/types';
import { COR } from './palette';
import type { Render } from './render';
import type { Som } from './audio';

export interface HudAnim {
  atualizar(pontos: number, mult: number, score: number): void;
  banner(texto: string): void;
}

const TICK_MS = 230;

export class Animacao {
  rodando = false;

  constructor(private render: Render, private som: Som, private hud: HudAnim) {}

  private espera(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  /** reproduz a resolução elo a elo; velocidade divide durações mantendo a hierarquia (F10) */
  async play(res: Resolucao, meta: number, vel: number): Promise<void> {
    this.rodando = true;
    const tickMs = TICK_MS / vel;
    const maxTick = Math.max(0, ...res.eventos.map((e) => e.tick), ...res.rastro.map((r) => r.tick));
    let pontos = 0;
    let mult = 1;
    let metaBatida = false;

    for (let t = 1; t <= maxTick; t++) {
      // pulsos deste tick deslizam para suas células
      const pulsos = res.rastro.filter((r) => r.tick === t);
      const passos = Math.max(3, Math.floor(6 / vel));
      for (let s = 0; s <= passos; s++) {
        const frac = s / passos;
        this.render.pulsos = pulsos.map((p) => {
          const de = this.render.gridParaTela(p.x - Math.cos(0), p.y); // origem aproximada: célula anterior
          const para = this.render.gridParaTela(p.x, p.y);
          void de;
          return { x: para.x - (1 - frac) * 30, y: para.y, alpha: 0.35 + 0.65 * frac };
        });
        await this.espera(tickMs / (passos + 1) / 2);
      }

      // eventos (disparos) deste tick
      const evs = res.eventos.filter((e) => e.tick === t);
      for (const e of evs) {
        pontos = pontos + e.pontosDelta;
        mult = e.multDepois;
        this.render.flashCell(e.cell);
        // nível 1: flash + bipe + número flutuante
        if (e.pontosDelta > 0) this.render.flutuar(e.cell, `+${Math.round(e.pontosDelta)}`, COR.pontos);
        if (e.fichasDelta > 0) {
          this.render.flutuar(e.cell, `+${e.fichasDelta}⬡`, COR.fichas);
          this.som.ficha();
        }
        const multSubiu = e.multDepois > e.multAntes + 1e-9;
        if (multSubiu) {
          // nível 2: + pulso do placar + pitch acima
          this.render.flutuar(e.cell, e.multDepois / Math.max(0.01, e.multAntes) > 1.9 ? `×${(e.multDepois / e.multAntes).toFixed(1)}` : `+${(e.multDepois - e.multAntes).toFixed(1)}×`, COR.mult);
          this.som.multiplicador(e.depth);
          document.getElementById('score')?.classList.add('pulsa');
          setTimeout(() => document.getElementById('score')?.classList.remove('pulsa'), 90);
        } else {
          this.som.disparo(e.depth);
        }
        // nível 3: cadeia ≥ 8 → shake sutil (≤4px) + partículas
        if (e.depth >= 8) {
          this.render.tremer(Math.min(4, 2 + (e.depth - 8) * 0.4), 160 / vel);
          this.render.explodir(e.cell, multSubiu ? COR.mult : COR.pontos, 8);
        }
        this.hud.atualizar(pontos, mult, Math.round(pontos * mult));
        // nível 4: meta batida → banner + acorde (1x)
        if (!metaBatida && Math.round(pontos * mult) >= meta) {
          metaBatida = true;
          this.hud.banner('META BATIDA');
          this.som.metaBatida();
        }
        await this.espera(Math.min(150, tickMs * 0.55) / Math.max(1, evs.length > 3 ? 2 : 1));
      }
    }
    this.render.pulsos = [];
    this.hud.atualizar(res.pontos, res.mult, res.score);

    // nível 5: Overflow (3x+) → hit-stop de 120ms ANTES + chuva de fichas
    if (res.score >= 3 * meta && res.score >= meta) {
      await this.espera(120); // hit-stop: exclusivo deste nível (§6)
      this.render.chuvaDeFichas();
      this.render.tremer(4, 300 / vel);
      this.hud.banner('OVERFLOW');
      this.som.overflow();
      await this.espera(600 / vel);
    } else {
      await this.espera(280 / vel);
    }
    this.rodando = false;
  }
}
