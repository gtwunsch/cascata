/** Gate 1 (bônus) — máquina de estados da run: economia, loja, metas, mutadores, vitória/derrota */
import { describe, expect, it } from 'vitest';
import '../src/engine/content';
import { Run } from '../src/engine/run';
import { allSymbols } from '../src/engine/registry';
import { metaDaRodada, DEFAULT_CONFIG } from '../src/engine/config';
import { at } from './helpers';

const POOL = allSymbols().map((s) => s.id);

function novaRun(seed = 'TESTE1'): Run {
  return new Run(seed, { pool: POOL });
}

describe('início de run e posicionamento', () => {
  it('começa com a mão e as fichas do emissor MK-1', () => {
    const r = novaRun();
    expect(r.mao).toEqual(['faisca', 'celula', 'cano']);
    expect(r.fichas).toBe(6);
    expect(r.placementsLeft).toBe(3);
    expect(r.ante).toBe(1);
    expect(r.rodada).toBe(1);
  });

  it('posicionar move da mão para a grade e consome posicionamento', () => {
    const r = novaRun();
    expect(r.posicionar(0, at(0, 1))).toBe(true);
    expect(r.mao.length).toBe(2);
    expect(r.grid[at(0, 1)]!.id).toBe('faisca');
    expect(r.placementsLeft).toBe(2);
  });

  it('não posiciona em célula ocupada nem sem posicionamentos', () => {
    const r = novaRun();
    r.posicionar(0, at(0, 1));
    expect(r.posicionar(0, at(0, 1))).toBe(false);
    r.posicionar(0, at(1, 1));
    r.posicionar(0, at(2, 1));
    expect(r.placementsLeft).toBe(0);
    expect(r.posicionar(0, at(3, 1))).toBe(false);
  });

  it('remover: 1ª grátis, depois custa 2 fichas', () => {
    const r = novaRun();
    r.posicionar(0, at(0, 1));
    r.posicionar(0, at(1, 1));
    expect(r.custoRemocao()).toBe(0);
    expect(r.remover(at(0, 1))).toBe(true);
    expect(r.fichas).toBe(6);
    expect(r.custoRemocao()).toBe(2);
    expect(r.remover(at(1, 1))).toBe(true);
    expect(r.fichas).toBe(4);
  });

  it('preview de impacto reporta delta sem mutar a run (§3.1)', () => {
    const r = novaRun();
    const { antes, depois } = r.previewPlacement(0, at(0, 1));
    expect(antes).toBe(0);
    expect(depois).toBeGreaterThan(0);
    expect(r.grid[at(0, 1)]).toBeNull();
    expect(r.mao.length).toBe(3);
  });
});

describe('resolução e economia (§4.4)', () => {
  it('score abaixo da meta → derrota', () => {
    const r = novaRun();
    r.resolver(); // grade vazia: score 0 < 40
    expect(r.status).toBe('derrota');
  });

  it('bater a meta paga base + cadeia + juros e abre a loja', () => {
    const r = novaRun();
    r.posicionar(0, at(0, 1)); // faisca 6
    r.posicionar(0, at(1, 1)); // celula 10
    // insuficiente para meta 40 — monta com mult
    r.grid[at(2, 1)] = { id: 'duplicador', mem: 0 };
    r.grid[at(3, 1)] = { id: 'celula', mem: 0 };
    const res = r.resolver();
    expect(res.score).toBeGreaterThanOrEqual(40);
    expect(r.status).toBe('loja');
    // fichas: 6 iniciais + base 4 + cadeia 4 + juros floor(6/5)=1
    expect(r.fichas).toBe(6 + 4 + 4 + 1);
  });

  it('overflow (≥3× meta) paga fichas extras (F6, D8)', () => {
    const r = novaRun();
    r.grid[at(0, 1)] = { id: 'celula', mem: 0 };
    r.grid[at(1, 1)] = { id: 'celula', mem: 0 };
    r.grid[at(2, 1)] = { id: 'celula', mem: 0 };
    r.grid[at(3, 1)] = { id: 'singularidade', mem: 0 };
    r.grid[at(4, 1)] = { id: 'celula', mem: 0 };
    const res = r.resolver();
    expect(res.score).toBeGreaterThanOrEqual(3 * 40); // 40 pontos × mult 3 = 120
    const base = 4 + 5 + 1;
    const overflow = Math.min(8, Math.floor(res.score / 40));
    expect(r.fichas).toBe(6 + base + overflow);
  });

  it('derrota não paga fichas (nem as de símbolos econômicos)', () => {
    const r = novaRun();
    r.grid[at(0, 1)] = { id: 'moeda', mem: 0 };
    r.resolver();
    expect(r.status).toBe('derrota');
    expect(r.fichas).toBe(6); // derrota: nada é pago
  });
});

describe('loja (§3.2, F5)', () => {
  function runNaLoja(): Run {
    const r = novaRun();
    r.grid[at(0, 1)] = { id: 'celula', mem: 0 };
    r.grid[at(1, 1)] = { id: 'singularidade', mem: 0 };
    r.grid[at(2, 1)] = { id: 'celula', mem: 0 };
    r.resolver();
    return r;
  }

  it('oferece exatamente 3 símbolos e 1 relíquia', () => {
    const r = runNaLoja();
    expect(r.status).toBe('loja');
    expect(r.shop.symbols.length).toBe(3);
    expect(r.shop.relic).not.toBeNull();
  });

  it('comprar debita fichas e adiciona à mão', () => {
    const r = runNaLoja();
    const fichasAntes = r.fichas;
    const id = r.shop.symbols[0]!;
    const preco = r.precoSimbolo(id);
    expect(r.comprar(0)).toBe(true);
    expect(r.fichas).toBe(fichasAntes - preco);
    expect(r.mao).toContain(id);
    expect(r.shop.symbols.length).toBe(2);
  });

  it('reroll custa 2, depois 3, depois 4 (§4.4)', () => {
    const r = runNaLoja();
    r.fichas = 30;
    expect(r.rerollCostAtual()).toBe(2);
    r.reroll();
    expect(r.rerollCostAtual()).toBe(3);
    r.reroll();
    expect(r.rerollCostAtual()).toBe(4);
  });

  it('mesma seed → mesma loja (determinismo)', () => {
    const a = runNaLoja();
    const b = runNaLoja();
    expect(a.shop.symbols).toEqual(b.shop.symbols);
    expect(a.shop.relic).toBe(b.shop.relic);
  });

  it('fechar a loja avança a rodada e restaura posicionamentos', () => {
    const r = runNaLoja();
    r.fecharLoja();
    expect(r.status).toBe('construindo');
    expect(r.rodada).toBe(2);
    expect(r.placementsLeft).toBe(3);
  });
});

describe('metas, chefes e vitória (§3.3, §4.5)', () => {
  it('a meta escala geometricamente', () => {
    expect(metaDaRodada(DEFAULT_CONFIG, 1, 1)).toBe(40);
    expect(metaDaRodada(DEFAULT_CONFIG, 1, 2)).toBe(60);
    expect(metaDaRodada(DEFAULT_CONFIG, 1, 3)).toBe(88);
    expect(metaDaRodada(DEFAULT_CONFIG, 2, 1)).toBe(84);
    expect(metaDaRodada(DEFAULT_CONFIG, 8, 3)).toBeGreaterThan(10000);
  });

  it('rodada 3 é chefe com mutador; os 8 mutadores da run são únicos', () => {
    const r = novaRun();
    expect(new Set(r.mutadoresRun).size).toBe(8);
    r.rodada = 2;
    r.proximaRodada();
    expect(r.rodada).toBe(3);
    expect(r.mutadorAtual).not.toBeNull();
  });

  it('vencer ante 8 rodada 3 → vitória', () => {
    const r = new Run('FIM', { pool: POOL, cfg: { ...DEFAULT_CONFIG, metaBase: 1, metaGrowth: 1 } });
    r.ante = 8;
    r.rodada = 3;
    r.grid[at(0, 1)] = { id: 'celula', mem: 0 };
    const res = r.resolver();
    expect(res.score).toBeGreaterThanOrEqual(r.meta);
    expect(r.status).toBe('vitoria');
  });

  it('mutador estática bloqueia 3 células livres', () => {
    const r = novaRun('ESTATIC');
    // avança até achar uma rodada de chefe com estática — força diretamente:
    r.mutadoresRun = ['estatica', ...r.mutadoresRun.filter((m) => m !== 'estatica')];
    r.rodada = 2;
    r.proximaRodada();
    expect(r.mutadorAtual!.id).toBe('estatica');
    expect(r.blockedCells.size).toBe(3);
  });

  it('mutador monotonia impede repetir papel na rodada', () => {
    const r = novaRun();
    r.mutadoresRun = ['monotonia', ...r.mutadoresRun.filter((m) => m !== 'monotonia')];
    r.rodada = 2;
    r.proximaRodada();
    r.mao = ['faisca', 'celula', 'cano'];
    expect(r.posicionar(0, at(0, 1))).toBe(true); // gerador
    expect(r.posicionar(0, at(1, 1))).toBe(false); // celula: gerador repetido
    expect(r.posicionar(1, at(1, 1))).toBe(true); // cano: condutor ok
  });

  it('mutador escassez reduz posicionamentos', () => {
    const r = novaRun();
    r.mutadoresRun = ['escassez', ...r.mutadoresRun.filter((m) => m !== 'escassez')];
    r.rodada = 2;
    r.proximaRodada();
    expect(r.placementsLeft).toBe(2);
  });
});
