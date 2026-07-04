/** Purpose: agrega RunResults e avalia os critérios do Gate 2 (§8) | Exports: agregar, avaliarCriterios, Agregado */
import { allSymbols } from '../engine/registry';
import type { RunResult } from './bots';

export interface Agregado {
  bot: string;
  runs: number;
  winrate: number;
  anteMedianoMorte: number;
  pctCadeia10: number;
  maxPresencaVitorias: { simbolo: string; pct: number };
  topPresencas: { simbolo: string; pct: number }[];
  simbolosMortos: { id: string; winrate: number; compras: number }[];
  mediaWinrateComprado: number;
  decisoesVitoriaMediana: number;
  rodadasVitoriaMediana: number;
  scoreMedianoFinal: number;
  mortesPorAnte: number[];
}

function mediana(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

export function agregar(bot: string, rs: RunResult[]): Agregado {
  const wins = rs.filter((r) => r.win);
  const deaths = rs.filter((r) => !r.win);
  // diversidade: presença de cada símbolo nas builds vencedoras
  const presenca = new Map<string, number>();
  for (const w of wins) for (const id of new Set(w.buildFinal)) presenca.set(id, (presenca.get(id) ?? 0) + 1);
  let maxPres = { simbolo: '-', pct: 0 };
  const topPresencas: { simbolo: string; pct: number }[] = [];
  for (const [id, n] of presenca) {
    const pct = n / Math.max(1, wins.length);
    topPresencas.push({ simbolo: id, pct });
    if (pct > maxPres.pct) maxPres = { simbolo: id, pct };
  }
  topPresencas.sort((a, b) => b.pct - a.pct).splice(10);
  // símbolos mortos: winrate-quando-comprado < 70% da média (entre símbolos com amostra)
  const compras = new Map<string, { n: number; wins: number }>();
  for (const r of rs) {
    for (const id of new Set(r.comprados)) {
      const e = compras.get(id) ?? { n: 0, wins: 0 };
      e.n++;
      if (r.win) e.wins++;
      compras.set(id, e);
    }
  }
  const AMOSTRA_MIN = 20;
  const taxas: { id: string; winrate: number; compras: number }[] = [];
  for (const s of allSymbols()) {
    const e = compras.get(s.id);
    if (e && e.n >= AMOSTRA_MIN) taxas.push({ id: s.id, winrate: e.wins / e.n, compras: e.n });
  }
  const media = taxas.length ? taxas.reduce((s, t) => s + t.winrate, 0) / taxas.length : 0;
  const mortos = taxas.filter((t) => t.winrate < 0.7 * media);

  return {
    bot,
    runs: rs.length,
    winrate: wins.length / rs.length,
    anteMedianoMorte: mediana(deaths.map((d) => d.ante)),
    pctCadeia10: rs.filter((r) => r.maxCadeia >= 10).length / rs.length,
    maxPresencaVitorias: maxPres,
    topPresencas,
    simbolosMortos: mortos,
    mediaWinrateComprado: media,
    decisoesVitoriaMediana: mediana(wins.map((w) => w.decisoes)),
    rodadasVitoriaMediana: mediana(wins.map((w) => w.rodadas)),
    scoreMedianoFinal: mediana(rs.map((r) => r.scoreFinal)),
    mortesPorAnte: Array.from({ length: 9 }, (_, a) => deaths.filter((d) => d.ante === a).length),
  };
}

export interface Criterio {
  nome: string;
  valor: string;
  alvo: string;
  ok: boolean;
}

export function avaliarCriterios(sin: Agregado, gul: Agregado, ale: Agregado): Criterio[] {
  const pct = (x: number) => `${(100 * x).toFixed(1)}%`;
  return [
    { nome: 'vitória sinergia', valor: pct(sin.winrate), alvo: '12–20%', ok: sin.winrate >= 0.12 && sin.winrate <= 0.2 },
    { nome: 'vitória guloso', valor: pct(gul.winrate), alvo: '3–8%', ok: gul.winrate >= 0.03 && gul.winrate <= 0.08 },
    { nome: 'vitória aleatório', valor: pct(ale.winrate), alvo: '< 0.5%', ok: ale.winrate < 0.005 },
    { nome: 'ante mediano de morte (sin)', valor: String(sin.anteMedianoMorte), alvo: '5–6', ok: sin.anteMedianoMorte >= 5 && sin.anteMedianoMorte <= 6 },
    { nome: 'runs sin com cadeia ≥10', valor: pct(sin.pctCadeia10), alvo: '≥ 60%', ok: sin.pctCadeia10 >= 0.6 },
    {
      nome: 'diversidade (máx presença em vitórias)',
      valor: `${sin.maxPresencaVitorias.simbolo} ${pct(sin.maxPresencaVitorias.pct)}`,
      alvo: '≤ 45%',
      ok: sin.maxPresencaVitorias.pct <= 0.45,
    },
    {
      nome: 'símbolos mortos (winrate<70% da média)',
      valor: sin.simbolosMortos.length === 0 ? 'nenhum' : sin.simbolosMortos.map((m) => m.id).join(','),
      alvo: 'nenhum',
      ok: sin.simbolosMortos.length === 0,
    },
    {
      nome: 'decisões por vitória (mediana)',
      valor: String(sin.decisoesVitoriaMediana),
      alvo: '90–140',
      ok: sin.decisoesVitoriaMediana >= 90 && sin.decisoesVitoriaMediana <= 140,
    },
    {
      nome: 'rodadas por vitória',
      valor: String(sin.rodadasVitoriaMediana),
      alvo: '24',
      ok: sin.rodadasVitoriaMediana === 24,
    },
  ];
}
