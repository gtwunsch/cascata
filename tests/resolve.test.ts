/** Gate 1 — regras de propagação (§4.3): entrada, interrupção, 1 disparo, ordem determinística, mods */
import { describe, expect, it } from 'vitest';
import { resolve } from '../src/engine/resolve';
import { DIR_D, DIR_L, DIR_R, GRID_W } from '../src/engine/dirs';
import { at, rv } from './helpers';

describe('propagação básica', () => {
  it('grade vazia: zero disparos, score 0', () => {
    const r = resolve(rv([]));
    expect(r.disparos).toBe(0);
    expect(r.score).toBe(0);
  });

  it('pulso entra pelo emissor na fileira 2 (y=1) com potência 1', () => {
    const r = resolve(rv([[0, 1, 'faisca']]));
    expect(r.disparos).toBe(1);
    expect(r.eventos[0]!.potencia).toBe(1);
    expect(r.score).toBe(8);
  });

  it('símbolo fora do caminho do pulso não dispara', () => {
    const r = resolve(rv([[0, 0, 'faisca'], [0, 2, 'faisca']]));
    expect(r.disparos).toBe(0);
  });

  it('célula vazia interrompe o ramo (§4.3.3)', () => {
    const r = resolve(rv([[0, 1, 'faisca'], [2, 1, 'celula']]));
    expect(r.disparos).toBe(1);
    expect(r.score).toBe(8);
  });

  it('cadeia contígua dispara em sequência e soma pontos', () => {
    const r = resolve(rv([[0, 1, 'faisca'], [1, 1, 'celula']]));
    expect(r.disparos).toBe(2);
    expect(r.score).toBe(18);
    expect(r.maxCadeia).toBe(2);
  });

  it('potência inicial multiplica pontos (mods.potenciaInicial)', () => {
    const r = resolve(rv([[0, 1, 'faisca']]), { potenciaInicial: 2 });
    expect(r.score).toBe(26); // faísca: (8+5 com potência ≥1.5) × 2
  });

  it('cada símbolo dispara no máximo 1x por resolução (§4.3.4)', () => {
    // cano → espelho reflete de volta; cano já disparou → atravessa e sai
    const r = resolve(rv([[0, 1, 'cano'], [1, 1, 'espelho_c']]));
    expect(r.disparos).toBe(2);
    expect(r.disparosPorCelula[at(0, 1)]).toBe(1);
  });

  it('pass-through preserva direção e não gera evento (D3)', () => {
    const r = resolve(rv([[0, 1, 'cano'], [1, 1, 'cano'], [2, 1, 'espelho_c']]));
    // espelho reflete; pulso atravessa os 2 canos já disparados e sai pela esquerda
    expect(r.disparos).toBe(3);
    expect(r.eventos.length).toBe(3);
  });

  it('maxCadeia = profundidade da linhagem, não nº de disparos', () => {
    const r = resolve(rv([[0, 1, 'cano'], [1, 1, 'cano'], [2, 1, 'cano']]));
    expect(r.maxCadeia).toBe(3);
  });

  it('pontuação = pontos × mult (§4.3.6)', () => {
    const r = resolve(rv([[0, 1, 'faisca'], [1, 1, 'lente_x'], [2, 1, 'faisca']]));
    expect(r.pontos).toBe(16);
    expect(r.mult).toBeCloseTo(1.7);
    expect(r.score).toBe(27);
  });

  it('scoreParcial dos eventos sobe elo a elo (F3)', () => {
    const r = resolve(rv([[0, 1, 'faisca'], [1, 1, 'faisca'], [2, 1, 'faisca']]));
    const parciais = r.eventos.map((e) => e.scoreParcial);
    expect(parciais).toEqual([8, 16, 24]);
  });
});

describe('duplicação e ordem determinística (§4.3.5, D7)', () => {
  it('divisor duplica para as 2 diagonais frontais', () => {
    const r = resolve(rv([[0, 1, 'divisor'], [1, 0, 'faisca'], [1, 2, 'faisca']]));
    expect(r.disparos).toBe(3);
    expect(r.score).toBe(Math.round(4 + 2 * 8 * 0.8));
  });

  it('pulsos duplicados resolvem cima→baixo', () => {
    const r = resolve(rv([[0, 1, 'divisor'], [1, 0, 'faisca'], [1, 2, 'celula']]));
    expect(r.eventos[1]!.cell).toBe(at(1, 0));
    expect(r.eventos[2]!.cell).toBe(at(1, 2));
  });

  it('pulsos na mesma fileira resolvem esquerda→direita', () => {
    const r = resolve(rv([[0, 1, 'faisca'], [2, 0, 'faisca']]), {
      emitters: [
        { x: -1, y: 1, dir: DIR_R },
        { x: 2, y: -1, dir: DIR_D },
      ],
    });
    // tick 1: pulsos em (0,1) e (2,0) → (2,0) tem y menor, dispara primeiro
    expect(r.eventos[0]!.cell).toBe(at(2, 0));
    expect(r.eventos[1]!.cell).toBe(at(0, 1));
  });

  it('dois pulsos convergindo no mesmo símbolo: 1º dispara, 2º atravessa', () => {
    const r = resolve(rv([[0, 1, 'trifurcador'], [1, 0, 'funil'], [1, 2, 'funil'], [1, 1, 'faisca']]));
    expect(r.disparosPorCelula[at(1, 1)]).toBe(1);
    expect(r.disparos).toBe(4);
  });

  it('resultado é idêntico entre execuções (determinismo total)', () => {
    const grade: [number, number, string][] = [[0, 1, 'trifurcador'], [1, 0, 'dinamo'], [1, 1, 'prisma'], [1, 2, 'geiser'], [2, 2, 'lente_x'], [2, 0, 'celula']];
    const a = resolve(rv(grade));
    const b = resolve(rv(grade));
    expect(b.score).toBe(a.score);
    expect(b.eventos.map((e) => e.cell)).toEqual(a.eventos.map((e) => e.cell));
  });
});

describe('modificadores de resolução (mutadores §4.6)', () => {
  const linha4: [number, number, string][] = [[0, 1, 'cano'], [1, 1, 'cano'], [2, 1, 'cano'], [3, 1, 'cano']];

  it('chainCap (curto-circuito): cadeia para no limite', () => {
    const r = resolve(rv(linha4), { chainCap: 2 });
    expect(r.disparos).toBe(2);
    expect(r.maxCadeia).toBe(2);
  });

  it('célula bloqueada (estática) mata o pulso', () => {
    const r = resolve(rv(linha4), { blockedCells: new Set([at(1, 1)]) });
    expect(r.disparos).toBe(1);
  });

  it('fileira desabilitada (neblina): não dispara, mas pulso atravessa', () => {
    const r = resolve(rv([[0, 1, 'faisca'], [1, 1, 'faisca']]), { disabledRow: 1 });
    expect(r.disparos).toBe(0);
  });

  it('apagão: o 1º elo não dispara, o 2º sim', () => {
    const r = resolve(rv([[0, 1, 'faisca'], [1, 1, 'celula']]), { apagao: true });
    expect(r.disparos).toBe(1);
    expect(r.eventos[0]!.symbolId).toBe('celula');
  });

  it('teto de mult limita durante e no final', () => {
    const r = resolve(rv([[0, 1, 'duplicador'], [1, 1, 'duplicador'], [2, 1, 'faisca']]), { tetoMult: 1.5 });
    expect(r.mult).toBe(1.5);
    expect(r.score).toBe(12);
  });

  it('emissor espelhado (mutador espelho): entra pela direita', () => {
    const r = resolve(rv([[GRID_W - 1, 1, 'faisca']]), {
      emitters: [{ x: GRID_W, y: 1, dir: DIR_L }],
    });
    expect(r.disparos).toBe(1);
  });

  it('bônus de papel (relíquias) soma aos pontos do disparo', () => {
    const r = resolve(rv([[0, 1, 'faisca']]), { bonusPapel: { gerador: 4 } });
    expect(r.score).toBe(12);
  });

  it('finalMultAdd (metrônomo) só aplica com cadeia mínima', () => {
    const semCadeia = resolve(rv([[0, 1, 'faisca']]), { finalMultAdd: [{ minCadeia: 8, add: 0.5 }] });
    expect(semCadeia.score).toBe(8);
    const linha8: [number, number, string][] = [];
    for (let x = 0; x < 5; x++) linha8.push([x, 1, 'cano']);
    // cotovelos para estender a cadeia além de 8: (4,1) vira para baixo e volta
    linha8[4] = [4, 1, 'cotovelo_d'];
    linha8.push([4, 2, 'cotovelo_d'], [3, 2, 'cano'], [2, 2, 'cano'], [1, 2, 'faisca']);
    const r = resolve(rv(linha8), { finalMultAdd: [{ minCadeia: 8, add: 0.5 }] });
    expect(r.maxCadeia).toBeGreaterThanOrEqual(8);
    expect(r.score).toBe(Math.round(r.pontos * 1.5));
  });
});

describe('peças giradas (espelhadas) — feedback de playtest', () => {
  it('cotovelo_d girado vira para o outro lado (R→U em vez de R→D)', () => {
    const view = rv([[0, 1, 'cotovelo_d'], [0, 0, 'faisca'], [0, 2, 'celula']]);
    const normal = resolve(view);
    expect(normal.eventos.some((e) => e.symbolId === 'celula')).toBe(true); // vira p/ baixo
    view.grid[at(0, 1)]!.inv = true;
    const girado = resolve(view);
    expect(girado.eventos.some((e) => e.symbolId === 'faisca')).toBe(true); // girado: p/ cima
    expect(girado.eventos.some((e) => e.symbolId === 'celula')).toBe(false);
  });

  it('dinamo girado emite na diagonal oposta', () => {
    const view = rv([[0, 1, 'dinamo'], [1, 2, 'faisca'], [1, 0, 'celula']]);
    expect(resolve(view).eventos.some((e) => e.symbolId === 'faisca')).toBe(true);
    view.grid[at(0, 1)]!.inv = true;
    expect(resolve(view).eventos.some((e) => e.symbolId === 'celula')).toBe(true);
  });

  it('peças simétricas não mudam ao girar (cano segue reto)', () => {
    const view = rv([[0, 1, 'cano'], [1, 1, 'faisca']]);
    const a = resolve(view).score;
    view.grid[at(0, 1)]!.inv = true;
    expect(resolve(view).score).toBe(a);
  });

  it('agulha girada emite para cima', () => {
    const view = rv([[0, 1, 'agulha'], [0, 0, 'faisca'], [0, 2, 'celula']]);
    expect(resolve(view).eventos.some((e) => e.symbolId === 'celula')).toBe(true);
    view.grid[at(0, 1)]!.inv = true;
    expect(resolve(view).eventos.some((e) => e.symbolId === 'faisca')).toBe(true);
  });
});
