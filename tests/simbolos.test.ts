/** Gate 1 — comportamento de símbolos: emissões, potência, gatilhos, econômicos, mem persistente */
import { describe, expect, it } from 'vitest';
import { resolve } from '../src/engine/resolve';
import { allSymbols } from '../src/engine/registry';
import { at, rv } from './helpers';

describe('emissões e potência', () => {
  it('cotovelo_d vira 90° horário (R→D)', () => {
    const r = resolve(rv([[0, 1, 'cotovelo_d'], [0, 2, 'faisca']]));
    expect(r.disparos).toBe(2);
  });

  it('cotovelo_e vira 90° anti-horário (R→U)', () => {
    const r = resolve(rv([[0, 1, 'cotovelo_e'], [0, 0, 'faisca']]));
    expect(r.disparos).toBe(2);
  });

  it('trilho soma potência (+0.3)', () => {
    const r = resolve(rv([[0, 1, 'trilho'], [1, 1, 'faisca']]));
    expect(r.pontos).toBeCloseTo(2 + 6 * 1.3);
  });

  it('acelerador multiplica potência (×1.5)', () => {
    const r = resolve(rv([[0, 1, 'acelerador'], [1, 1, 'celula']]));
    expect(r.pontos).toBeCloseTo(15);
  });

  it('resistor pontua alto mas degrada a potência (×0.8)', () => {
    const r = resolve(rv([[0, 1, 'resistor'], [1, 1, 'faisca']]));
    expect(r.pontos).toBeCloseTo(14 + 4.8);
  });

  it('capacitor termina o ramo', () => {
    const r = resolve(rv([[0, 1, 'capacitor'], [1, 1, 'faisca']]));
    expect(r.disparos).toBe(1);
    expect(r.score).toBe(18);
  });

  it('geiser emite para cima e para baixo (absolutas)', () => {
    const r = resolve(rv([[0, 1, 'geiser'], [0, 0, 'faisca'], [0, 2, 'faisca']]));
    expect(r.disparos).toBe(3);
  });

  it('funil converge rumo ao centro', () => {
    const r = resolve(rv([[0, 1, 'trifurcador'], [1, 0, 'funil'], [1, 2, 'funil'], [1, 1, 'capacitor'], [2, 1, 'faisca']]));
    // trifurcador → frontal dispara capacitor; funis viram para o centro e atravessam capacitor já disparado
    expect(r.disparosPorCelula[at(1, 0)]).toBe(1);
    expect(r.disparosPorCelula[at(1, 2)]).toBe(1);
  });

  it('hidra duplica com potência ×1.3', () => {
    const r = resolve(rv([[0, 1, 'hidra'], [1, 0, 'faisca'], [1, 2, 'faisca']]));
    expect(r.pontos).toBeCloseTo(6 * 1.3 * 2);
  });

  it('portal reinjeta o pulso no emissor mantendo a cadeia', () => {
    const r = resolve(rv([[0, 1, 'portal'], [1, 1, 'faisca']]));
    // portal (elo 1) reinjeta; pulso atravessa portal e dispara a faísca (elo 2)
    expect(r.disparos).toBe(2);
    expect(r.maxCadeia).toBe(2);
  });

  it('vela escala com elos percorridos', () => {
    const r = resolve(rv([[0, 1, 'cano'], [1, 1, 'vela']]));
    expect(r.pontos).toBe(2 + 7);
  });

  it('ziguezague alterna direção entre disparos (mem)', () => {
    const view = rv([[0, 1, 'ziguezague'], [0, 2, 'faisca'], [0, 0, 'celula']]);
    const r1 = resolve(view);
    expect(r1.eventos.some((e) => e.symbolId === 'faisca')).toBe(true); // 1º: vira à direita (baixo)
    view.grid[at(0, 1)]!.mem += r1.memDeltas[at(0, 1)]!;
    const r2 = resolve(view);
    expect(r2.eventos.some((e) => e.symbolId === 'celula')).toBe(true); // 2º: vira à esquerda (cima)
  });

  it('brasa cresce permanentemente via memDeltas — resolve é puro', () => {
    const view = rv([[0, 1, 'brasa']]);
    const r1 = resolve(view);
    expect(r1.score).toBe(5);
    expect(view.grid[at(0, 1)]!.mem).toBe(0); // puro: não mutou
    view.grid[at(0, 1)]!.mem += r1.memDeltas[at(0, 1)]!;
    const r2 = resolve(view);
    expect(r2.score).toBe(6);
  });
});

describe('gatilhos condicionais', () => {
  it('usina só dispara do 4º elo em diante (podeDisparar)', () => {
    const perto = resolve(rv([[0, 1, 'usina']]));
    expect(perto.disparos).toBe(0);
    const longe = resolve(rv([[0, 1, 'cano'], [1, 1, 'cano'], [2, 1, 'cano'], [3, 1, 'usina']]));
    expect(longe.eventos.at(-1)!.symbolId).toBe('usina');
    expect(longe.pontos).toBe(6 + 25);
  });

  it('sensor: +20 só no 5º elo ou além', () => {
    const cedo = resolve(rv([[0, 1, 'sensor']]));
    expect(cedo.pontos).toBe(0);
    const tarde = resolve(rv([[0, 1, 'cano'], [1, 1, 'cano'], [2, 1, 'cano'], [3, 1, 'cano'], [4, 1, 'sensor']]));
    expect(tarde.pontos).toBe(8 + 20);
  });

  it('valvula exige mult ≥ 2', () => {
    const baixo = resolve(rv([[0, 1, 'lente_x'], [1, 1, 'valvula']]));
    expect(baixo.pontos).toBe(0);
    const alto = resolve(rv([[0, 1, 'lente_x'], [1, 1, 'lente_x'], [2, 1, 'valvula']]));
    expect(alto.pontos).toBe(15);
  });

  it('rele: mult +0.8 com 3+ geradores disparados', () => {
    const r = resolve(rv([[0, 1, 'faisca'], [1, 1, 'faisca'], [2, 1, 'faisca'], [3, 1, 'rele']]));
    expect(r.mult).toBeCloseTo(1.8);
  });

  it('disjuntor: +30 com potência ≥ 2', () => {
    const r = resolve(rv([[0, 1, 'acelerador'], [1, 1, 'acelerador'], [2, 1, 'disjuntor']]));
    expect(r.pontos).toBeCloseTo(30 * 2.25);
  });

  it('cronometro duplica em elos pares', () => {
    const r = resolve(rv([[0, 1, 'cano'], [1, 1, 'cronometro'], [2, 0, 'faisca'], [2, 2, 'faisca']]));
    expect(r.disparos).toBe(4);
  });

  it('detonador: mult ×1.5 do 8º elo em diante', () => {
    const cedo = resolve(rv([[0, 1, 'detonador'], [1, 1, 'faisca']]));
    expect(cedo.mult).toBe(1);
    const longa: [number, number, string][] = [
      [0, 1, 'cano'], [1, 1, 'cano'], [2, 1, 'cano'], [3, 1, 'cano'],
      [4, 1, 'cotovelo_d'], [4, 2, 'cotovelo_d'], [3, 2, 'cano'], [2, 2, 'detonador'],
    ];
    const r = resolve(rv(longa));
    expect(r.maxCadeia).toBe(8);
    expect(r.mult).toBeCloseTo(1.5);
  });

  it('simbiose: +8 por papel distinto já disparado', () => {
    const r = resolve(rv([[0, 1, 'faisca'], [1, 1, 'cano'], [2, 1, 'lente_x'], [3, 1, 'simbiose']]));
    // papéis JÁ disparados: gerador, condutor, amplificador (a própria simbiose não se conta)
    expect(r.pontos).toBe(6 + 2 + 8 * 3);
  });

  it('forja: +6 por amplificador já disparado', () => {
    const r = resolve(rv([[0, 1, 'lente_x'], [1, 1, 'forja']]));
    expect(r.pontos).toBe(16);
  });

  it('ressonador: mult +0.25 por condutor disparado', () => {
    const r = resolve(rv([[0, 1, 'cano'], [1, 1, 'cano'], [2, 1, 'ressonador']]));
    expect(r.mult).toBeCloseTo(1.5);
  });

  it('gravitacional: mult +0.5 por gerador disparado', () => {
    const r = resolve(rv([[0, 1, 'faisca'], [1, 1, 'faisca'], [2, 1, 'gravitacional']]));
    expect(r.mult).toBeCloseTo(2);
  });

  it('avalanche exige 10+ disparos', () => {
    const r = resolve(rv([[0, 1, 'faisca'], [1, 1, 'avalanche']]));
    expect(r.pontos).toBe(6);
    expect(r.mult).toBe(1);
  });
});

describe('econômicos', () => {
  it('moeda gera 1 ficha', () => {
    const r = resolve(rv([[0, 1, 'moeda']]));
    expect(r.fichas).toBe(1);
    expect(r.pontos).toBe(2);
  });

  it('cofrinho paga ficha só do 4º elo em diante', () => {
    const cedo = resolve(rv([[0, 1, 'cofrinho']]));
    expect(cedo.fichas).toBe(0);
    const tarde = resolve(rv([[0, 1, 'cano'], [1, 1, 'cano'], [2, 1, 'cano'], [3, 1, 'cofrinho']]));
    expect(tarde.fichas).toBe(1);
  });

  it('banqueiro: +1 ficha por 2 amplificadores (cap 3)', () => {
    const r = resolve(rv([[0, 1, 'lente_x'], [1, 1, 'lente_x'], [2, 1, 'banqueiro']]));
    expect(r.fichas).toBe(1);
  });

  it('tesouro: +3 fichas e termina o ramo', () => {
    const r = resolve(rv([[0, 1, 'tesouro'], [1, 1, 'faisca']]));
    expect(r.fichas).toBe(3);
    expect(r.disparos).toBe(1);
  });

  it('cupom_vivo marca reroll grátis na resolução', () => {
    const r = resolve(rv([[0, 1, 'cupom_vivo']]));
    expect(r.rerollGratis).toBe(true);
  });
});

describe('sanidade do conteúdo', () => {
  it('há exatamente 60 símbolos: 24/18/12/6 por raridade e 30/25/20/15/10% por papel', () => {
    const all = allSymbols();
    expect(all.length).toBe(60);
    const por = (k: 'raridade' | 'papel') =>
      all.reduce<Record<string, number>>((acc, s) => ((acc[s[k]] = (acc[s[k]] ?? 0) + 1), acc), {});
    expect(por('raridade')).toEqual({ comum: 24, incomum: 18, raro: 12, lendario: 6 });
    expect(por('papel')).toEqual({ gerador: 18, condutor: 15, amplificador: 12, gatilho: 9, economico: 6 });
  });

  it('descrições ≤ 140 caracteres e custos dentro das faixas (§4.4, §11)', () => {
    const faixa = { comum: [3, 4], incomum: [5, 7], raro: [8, 11], lendario: [14, 18] } as const;
    for (const s of allSymbols()) {
      expect(s.desc.length).toBeLessThanOrEqual(140);
      const [min, max] = faixa[s.raridade];
      expect(s.custo).toBeGreaterThanOrEqual(min);
      expect(s.custo).toBeLessThanOrEqual(max);
    }
  });
});
