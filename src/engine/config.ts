/** Purpose: knobs de balanceamento centralizados — o harness (§8) ajusta AQUI | Exports: RunConfig, DEFAULT_CONFIG */

export interface RunConfig {
  metaBase: number;
  metaGrowth: number;
  metaRodada: readonly [number, number, number];
  antes: number;
  fichasBase: number;
  fichasCadeiaCap: number;
  jurosDiv: number;
  jurosCap: number;
  overflowMin: number; // score ≥ overflowMin × meta → overflow (F6)
  overflowCap: number;
  rerollBase: number;
  maoCap: number;
  placementsBase: number;
  remocoesGratis: number;
  custoRemocao: number;
  fichasIniciais: number;
  maxRelics: number;
  /** pesos de raridade na loja, por ante (interpolado linear 1→8) */
  pesoLojaInicio: { comum: number; incomum: number; raro: number; lendario: number };
  pesoLojaFim: { comum: number; incomum: number; raro: number; lendario: number };
}

export const DEFAULT_CONFIG: RunConfig = {
  metaBase: 40,
  metaGrowth: 2.1,
  metaRodada: [1.0, 1.5, 2.2],
  antes: 8,
  fichasBase: 4,
  fichasCadeiaCap: 10,
  jurosDiv: 5,
  jurosCap: 5,
  overflowMin: 3,
  overflowCap: 8,
  rerollBase: 2,
  maoCap: 8,
  placementsBase: 3,
  remocoesGratis: 1,
  custoRemocao: 2,
  fichasIniciais: 6,
  maxRelics: 5,
  pesoLojaInicio: { comum: 70, incomum: 24, raro: 5, lendario: 1 },
  pesoLojaFim: { comum: 30, incomum: 38, raro: 24, lendario: 8 },
};

export function metaDaRodada(cfg: RunConfig, ante: number, rodada: number): number {
  return Math.round(cfg.metaBase * Math.pow(cfg.metaGrowth, ante - 1) * cfg.metaRodada[rodada - 1]!);
}
