/** Gate 4 — pitch escala com a cadeia (F3-áudio) e as 15 conquistas disparam nas condições certas */
import { beforeEach, describe, expect, it } from 'vitest';
import { pitchDaCadeia } from '../src/ui/audio';
import { Meta, CONQUISTAS } from '../src/ui/meta';
import { Run } from '../src/engine/run';
import { allSymbols } from '../src/engine/registry';
import { novaResolucao } from '../src/engine/resolve';
import { at } from './helpers';
import type { Resolucao } from '../src/engine/types';

// stub de localStorage para ambiente node
const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

const POOL = allSymbols().map((s) => s.id);

describe('pitch da cadeia (teste automatizado de frequência)', () => {
  it('sobe monotonicamente com o tamanho da cadeia', () => {
    for (let d = 1; d < 24; d++) {
      expect(pitchDaCadeia(d + 1)).toBeGreaterThan(pitchDaCadeia(d));
    }
  });

  it('dobra a cada 12 elos (oitava)', () => {
    expect(pitchDaCadeia(13) / pitchDaCadeia(1)).toBeCloseTo(2);
  });
});

describe('as 15 conquistas disparam corretamente', () => {
  let meta: Meta;
  let run: Run;
  let res: Resolucao;

  beforeEach(() => {
    store.clear();
    meta = new Meta();
    run = new Run('CONQ', { pool: POOL });
    res = novaResolucao();
  });

  function ids(cs: { id: string }[]): string[] {
    return cs.map((c) => c.id);
  }

  it('primeira_cascata, overflow, milhar, boss_perfeito, minimalista', () => {
    run.rodada = 3;
    run.grid[at(0, 1)] = { id: 'celula', mem: 0 };
    res.score = Math.max(1000, 3 * run.meta);
    run.stats.melhorScore = res.score;
    const novas = ids(meta.verificar(run, res));
    for (const q of ['primeira_cascata', 'overflow', 'milhar', 'boss_perfeito', 'minimalista']) {
      expect(novas).toContain(q);
    }
  });

  it('ante3/ante5, cadeias, economista, colecionador, lendario, eco_total, dezena_milhar', () => {
    run.ante = 5;
    run.fichas = 30;
    run.relics = ['ima', 'cofre', 'cupom', 'faro', 'estoque'];
    run.grid[at(0, 1)] = { id: 'eco', mem: 0 };
    run.stats.maxCadeia = 16;
    run.stats.melhorScore = 10000;
    res.disparos = 25;
    res.score = 0; // rodada perdida: conquistas de estado ainda valem
    const novas = ids(meta.verificar(run, res));
    for (const q of ['ante3', 'ante5', 'cadeia_10', 'cadeia_16', 'economista', 'colecionador', 'lendario', 'eco_total', 'dezena_milhar']) {
      expect(novas).toContain(q);
    }
  });

  it('primeira_vitoria ao vencer a run; conquistas não repetem e pagam sucata', () => {
    run.status = 'vitoria';
    const antes = meta.state.sucata;
    const novas = ids(meta.verificar(run, null));
    expect(novas).toContain('primeira_vitoria');
    expect(meta.state.sucata).toBeGreaterThan(antes);
    expect(ids(meta.verificar(run, null))).not.toContain('primeira_vitoria');
  });

  it('são exatamente 15 conquistas com recompensa concreta', () => {
    expect(CONQUISTAS.length).toBe(15);
    for (const c of CONQUISTAS) expect(c.sucata).toBeGreaterThan(0);
  });

  it('estado persiste entre "reloads" (novo Meta lê o mesmo storage)', () => {
    run.status = 'vitoria';
    meta.verificar(run, null);
    const meta2 = new Meta();
    expect(meta2.state.conquistas.primeira_vitoria).toBe(true);
    expect(meta2.state.sucata).toBe(meta.state.sucata);
  });
});
