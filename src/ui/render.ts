/** Purpose: render Canvas 2D — grade, chips procedurais, pulsos, partículas, shake (§5-§7) | Exports: Render | Dependencies: engine/dirs, registry, palette */
import { GRID_H, GRID_W, cellX, cellY } from '../engine/dirs';
import { getSymbol } from '../engine/registry';
import type { Run } from '../engine/run';
import { COR } from './palette';

const CS = 84; // célula
const PAD = 10;
const EMISSOR_W = 34;

interface Particula { x: number; y: number; vx: number; vy: number; vida: number; cor: string; r: number }
interface Flutuante { x: number; y: number; texto: string; cor: string; vida: number }
interface PulsoVisual { x: number; y: number; alpha: number }

export class Render {
  private ctx: CanvasRenderingContext2D;
  readonly W = PAD * 2 + EMISSOR_W + GRID_W * CS;
  readonly H = PAD * 2 + GRID_H * CS;
  private particulas: Particula[] = [];
  private flutuantes: Flutuante[] = [];
  private flashes = new Map<number, number>(); // cell → intensidade 0..1
  pulsos: PulsoVisual[] = [];
  private shakeAmp = 0;
  private shakeAte = 0;
  celulaDestacada = -1;
  emissorDireita = false;
  emissorRows: number[] = [1];

  constructor(private canvas: HTMLCanvasElement) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = this.W * dpr;
    canvas.height = this.H * dpr;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);
    this.ajustarCss();
    window.addEventListener('resize', () => this.ajustarCss());
  }

  private ajustarCss(): void {
    const palco = this.canvas.parentElement!;
    const escala = Math.min(palco.clientWidth / this.W, palco.clientHeight / this.H, 1.15);
    this.canvas.style.width = `${this.W * escala}px`;
    this.canvas.style.height = `${this.H * escala}px`;
  }

  centroDaCelula(idx: number): { x: number; y: number } {
    return {
      x: PAD + EMISSOR_W + cellX(idx) * CS + CS / 2,
      y: PAD + cellY(idx) * CS + CS / 2,
    };
  }

  /** célula no ponto da tela; snap magnético num raio de 70% da célula (oil §6) */
  celulaNoPonto(clientX: number, clientY: number): number {
    const r = this.canvas.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * this.W;
    const py = ((clientY - r.top) / r.height) * this.H;
    let melhor = -1;
    let melhorD = CS * 0.7;
    for (let i = 0; i < GRID_W * GRID_H; i++) {
      const c = this.centroDaCelula(i);
      const d = Math.hypot(px - c.x, py - c.y);
      if (d < melhorD) {
        melhorD = d;
        melhor = i;
      }
    }
    return melhor;
  }

  flashCell(idx: number): void {
    this.flashes.set(idx, 1);
  }

  flutuar(idx: number, texto: string, cor: string): void {
    const c = this.centroDaCelula(idx);
    const desloc = this.flutuantes.filter((f) => Math.abs(f.x - c.x) < 30 && f.vida > 0.7).length;
    this.flutuantes.push({ x: c.x, y: c.y - 14 - desloc * 13, texto, cor, vida: 1 });
  }

  explodir(idx: number, cor: string, n = 10): void {
    const c = this.centroDaCelula(idx);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 40 + Math.random() * 130;
      this.particulas.push({ x: c.x, y: c.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 1, cor, r: 1.5 + Math.random() * 2.5 });
    }
  }

  chuvaDeFichas(): void {
    for (let i = 0; i < 46; i++) {
      this.particulas.push({
        x: Math.random() * this.W,
        y: -10 - Math.random() * 120,
        vx: (Math.random() - 0.5) * 40,
        vy: 130 + Math.random() * 190,
        vida: 1.6,
        cor: COR.fichas,
        r: 3 + Math.random() * 2.5,
      });
    }
  }

  tremer(amp: number, durMs: number): void {
    this.shakeAmp = amp;
    this.shakeAte = performance.now() + durMs;
  }

  /** desenha um frame; dt em segundos */
  draw(run: Run, dt: number, resolvendo: boolean): void {
    const ctx = this.ctx;
    const chefe = run.ehChefe && run.status === 'construindo';
    ctx.save();
    ctx.clearRect(0, 0, this.W, this.H);
    if (performance.now() < this.shakeAte && this.shakeAmp > 0) {
      ctx.translate((Math.random() - 0.5) * 2 * this.shakeAmp, (Math.random() - 0.5) * 2 * this.shakeAmp);
    }

    // células
    for (let i = 0; i < GRID_W * GRID_H; i++) {
      const c = this.centroDaCelula(i);
      const x = c.x - CS / 2 + 3;
      const y = c.y - CS / 2 + 3;
      const w = CS - 6;
      ctx.fillStyle = COR.painel;
      ctx.strokeStyle = chefe ? '#3a2440' : COR.grade;
      ctx.lineWidth = 1;
      this.rr(x, y, w, w, 8);
      ctx.fill();
      ctx.stroke();
      if (run.blockedCells.has(i)) {
        ctx.strokeStyle = COR.perigo;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 12, y + 12);
        ctx.lineTo(x + w - 12, y + w - 12);
        ctx.moveTo(x + w - 12, y + 12);
        ctx.lineTo(x + 12, y + w - 12);
        ctx.stroke();
      }
      if (i === this.celulaDestacada) {
        ctx.strokeStyle = COR.pulso;
        ctx.lineWidth = 2.5;
        this.rr(x - 2, y - 2, w + 4, w + 4, 10);
        ctx.stroke();
      }
    }

    // fileira desabilitada (neblina)
    const m = run.ehChefe ? run.mutadorAtual : null;
    if (m?.disabledRow !== undefined) {
      ctx.fillStyle = '#e84cd722';
      ctx.fillRect(PAD + EMISSOR_W, PAD + m.disabledRow * CS, GRID_W * CS, CS);
    }

    // emissor
    for (const row of this.emissorRows) {
      const ey = PAD + row * CS + CS / 2;
      const ex = this.emissorDireita ? this.W - PAD + 2 : PAD + 4;
      ctx.fillStyle = COR.pulso;
      ctx.shadowColor = COR.pulso;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      const diru = this.emissorDireita ? -1 : 1;
      ctx.moveTo(ex, ey - 12);
      ctx.lineTo(ex, ey + 12);
      ctx.lineTo(ex + 22 * diru, ey);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // símbolos
    for (let i = 0; i < GRID_W * GRID_H; i++) {
      const p = run.grid[i];
      if (!p) continue;
      this.drawChip(i, p.id, p.mem, this.flashes.get(i) ?? 0);
    }

    // pulsos
    for (const pu of this.pulsos) {
      ctx.fillStyle = COR.pulso;
      ctx.shadowColor = COR.pulso;
      ctx.shadowBlur = 16;
      ctx.globalAlpha = pu.alpha;
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    // partículas
    this.particulas = this.particulas.filter((pt) => (pt.vida -= dt) > 0);
    for (const pt of this.particulas) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 60 * dt;
      ctx.globalAlpha = Math.min(1, pt.vida);
      ctx.fillStyle = pt.cor;
      ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
    }
    ctx.globalAlpha = 1;

    // números flutuantes
    this.flutuantes = this.flutuantes.filter((f) => (f.vida -= dt * 1.1) > 0);
    ctx.textAlign = 'center';
    ctx.font = '700 15px ui-monospace, monospace';
    for (const f of this.flutuantes) {
      f.y -= 26 * dt;
      ctx.globalAlpha = Math.min(1, f.vida * 1.6);
      ctx.fillStyle = f.cor;
      ctx.fillText(f.texto, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    // decaimento dos flashes
    for (const [k, v] of this.flashes) {
      const nv = v - dt * (resolvendo ? 5 : 3);
      if (nv <= 0) this.flashes.delete(k);
      else this.flashes.set(k, nv);
    }
    ctx.restore();
  }

  private drawChip(idx: number, id: string, mem: number, flash: number): void {
    const ctx = this.ctx;
    const def = getSymbol(id);
    const c = this.centroDaCelula(idx);
    const w = CS - 16;
    const x = c.x - w / 2;
    const y = c.y - w / 2;
    const corPapel = COR.papel[def.papel]!;
    ctx.fillStyle = '#0e1520';
    ctx.strokeStyle = COR.raridade[def.raridade]!;
    ctx.lineWidth = def.raridade === 'lendario' ? 3 : 2;
    if (flash > 0) {
      ctx.shadowColor = corPapel;
      ctx.shadowBlur = 26 * flash;
    }
    this.rr(x, y, w, w, 9);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (flash > 0) {
      ctx.globalAlpha = flash * 0.55;
      ctx.fillStyle = corPapel;
      this.rr(x, y, w, w, 9);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = corPapel;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 24px ui-monospace, monospace';
    ctx.fillText(def.nome.replace(/[^A-Za-zÁ-ú⤴⤵]/g, '').slice(0, 2).toUpperCase(), c.x, c.y - 4);
    ctx.font = '600 8.5px ui-monospace, monospace';
    ctx.fillStyle = COR.texto;
    ctx.fillText(def.nome.slice(0, 10), c.x, c.y + w / 2 - 10);
    if (mem > 0) {
      ctx.fillStyle = COR.pontos;
      ctx.font = '700 10px ui-monospace, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`+${mem}`, x + w - 4, y + 9);
    }
    ctx.textBaseline = 'alphabetic';
  }

  private rr(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  posicaoNaTela(idx: number): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    const c = this.centroDaCelula(idx);
    return { x: r.left + (c.x / this.W) * r.width, y: r.top + (c.y / this.H) * r.height };
  }

  gridParaTela(gx: number, gy: number): { x: number; y: number } {
    return {
      x: PAD + EMISSOR_W + gx * CS + CS / 2,
      y: PAD + gy * CS + CS / 2,
    };
  }
}
