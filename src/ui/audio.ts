/** Purpose: áudio 100% sintetizado via WebAudio (§5) — pitch sobe com a cadeia (F3-áudio) | Exports: pitchDaCadeia, Som */

/** frequência do bipe de disparo: sobe com o elo da cadeia (testável, Gate 4) */
export function pitchDaCadeia(depth: number): number {
  return 220 * Math.pow(2, Math.min(24, depth) / 12);
}

export class Som {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  mudo = false;

  private garantir(): AudioContext | null {
    if (this.mudo) return null;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private tocar(freq: number, tipo: OscillatorType, dur: number, ganho = 1, bend = 0): void {
    const ctx = this.garantir();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, t);
    if (bend !== 0) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * (1 + bend)), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(ganho, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  disparo(depth: number): void {
    this.tocar(pitchDaCadeia(depth), 'square', 0.09, 0.5);
  }

  multiplicador(depth: number): void {
    this.tocar(pitchDaCadeia(depth) * 1.5, 'sawtooth', 0.16, 0.55, 0.3);
  }

  ficha(): void {
    this.tocar(1240, 'triangle', 0.1, 0.5, 0.15);
  }

  metaBatida(): void {
    for (const [i, f] of [523.25, 659.25, 783.99].entries()) {
      setTimeout(() => this.tocar(f, 'triangle', 0.5, 0.5), i * 55);
    }
  }

  overflow(): void {
    for (let i = 0; i < 9; i++) {
      setTimeout(() => this.tocar(880 + i * 130, 'triangle', 0.12, 0.45, 0.2), i * 60);
    }
  }

  derrota(): void {
    this.tocar(196, 'sawtooth', 0.7, 0.5, -0.45);
  }

  clique(): void {
    this.tocar(660, 'square', 0.04, 0.25);
  }

  posiciona(): void {
    this.tocar(330, 'triangle', 0.08, 0.45, 0.12);
  }
}
