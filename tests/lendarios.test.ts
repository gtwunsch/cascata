/** Gate 1 — os 6 lendários e suas quebras de regra estrutural (§4.2, D12) */
import { describe, expect, it } from 'vitest';
import { resolve } from '../src/engine/resolve';
import { at, rv } from './helpers';

describe('lendários', () => {
  it('fantasma: pulsos atravessam células vazias enquanto ele está na grade', () => {
    const sem = resolve(rv([[0, 1, 'faisca'], [2, 1, 'celula']]));
    expect(sem.disparos).toBe(1);
    const com = resolve(rv([[0, 1, 'fantasma'], [2, 1, 'celula'], [4, 1, 'faisca']]));
    expect(com.disparos).toBe(3); // atravessou (1,1) e (3,1) vazias
    expect(com.pontos).toBe(5 + 10 + 8);
  });

  it('fantasma vale mesmo fora do caminho do pulso', () => {
    const r = resolve(rv([[0, 3, 'fantasma'], [0, 1, 'faisca'], [2, 1, 'celula']]));
    expect(r.disparos).toBe(2); // fantasma não disparou, mas o efeito global vale
    expect(r.disparosPorCelula[at(0, 3)]).toBe(0);
  });

  it('eco: cada símbolo pode disparar 2× por resolução', () => {
    // eco → espelho reflete → eco dispara de novo (agora indo para a esquerda) → sai
    const r = resolve(rv([[0, 1, 'eco'], [1, 1, 'espelho_c']]));
    expect(r.disparosPorCelula[at(0, 1)]).toBe(2);
    expect(r.disparosPorCelula[at(1, 1)]).toBe(1);
    expect(r.maxCadeia).toBe(3);
  });

  it('nucleo: o emissor dispara um 2º pulso na fileira oposta (y=2)', () => {
    const r = resolve(rv([[0, 1, 'nucleo'], [0, 2, 'faisca']]));
    expect(r.disparos).toBe(2);
    expect(r.disparosPorCelula[at(0, 2)]).toBe(1);
  });

  it('singularidade: mult ×3', () => {
    const r = resolve(rv([[0, 1, 'faisca'], [1, 1, 'singularidade'], [2, 1, 'faisca']]));
    expect(r.mult).toBe(3);
    expect(r.score).toBe(48);
  });

  it('reator: +8 +1/ficha guardada, emite nas 4 ortogonais', () => {
    const r = resolve(rv([[0, 1, 'reator'], [1, 1, 'faisca'], [0, 2, 'faisca'], [0, 0, 'faisca']], 10));
    expect(r.disparos).toBe(4);
    expect(r.pontos).toBe(18 + 8 * 3);
  });

  it('midas: aumentos de mult geram fichas (cap 8)', () => {
    const r = resolve(rv([[0, 1, 'midas'], [1, 1, 'lente_x'], [2, 1, 'duplicador']]));
    expect(r.fichas).toBe(2);
    expect(r.midasFichas).toBe(2);
    const sem = resolve(rv([[0, 1, 'lente_x']]));
    expect(sem.fichas).toBe(0);
  });

  it('midas respeita o cap de 8 fichas por resolução', () => {
    // eco + midas + 4 lentes num ciclo com espelho: muitos aumentos de mult
    const grade: [number, number, string][] = [
      [0, 1, 'midas'], [1, 1, 'lente_x'], [2, 1, 'lente_x'], [3, 1, 'lente_x'], [4, 1, 'lente_x'],
    ];
    const r = resolve(rv(grade));
    expect(r.fichas).toBe(4); // 4 aumentos, abaixo do cap
    expect(r.midasFichas).toBeLessThanOrEqual(8);
  });
});
