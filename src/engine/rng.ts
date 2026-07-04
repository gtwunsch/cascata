/** Purpose: RNG determinístico com seed (mulberry32) | Exports: Rng, seedFromString, randomSeed */

export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  /** mulberry32 — float em [0, 1) */
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** inteiro em [0, n) */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('pick em array vazio');
    return arr[this.int(arr.length)]!;
  }

  /** Fisher-Yates, retorna cópia embaralhada */
  shuffle<T>(arr: readonly T[]): T[] {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
  }

  /** estado serializável */
  getState(): number {
    return this.s;
  }

  static fromState(state: number): Rng {
    return new Rng(state);
  }

  /** fork independente (para rollouts sem perturbar o RNG da run) */
  fork(): Rng {
    return new Rng((this.next() * 4294967296) >>> 0);
  }
}

/** hash simples de string para seed numérica (FNV-1a) */
export function seedFromString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** seed "aleatória" legível (6 chars alfanuméricos) — só para UI, nunca dentro do motor */
export function randomSeedString(entropy: number): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  let x = entropy >>> 0;
  for (let i = 0; i < 6; i++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    s += chars[x % chars.length];
  }
  return s;
}
