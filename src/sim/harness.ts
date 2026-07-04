/** Purpose: harness de Monte Carlo (Gate 2, §8) — CLI: npm run harness -- --runs 2000 | Exports: rodarLote | Dependencies: bots, metrics */
import '../engine/content';
import { writeFileSync, mkdirSync } from 'node:fs';
import { allSymbols } from '../engine/registry';
import { DEFAULT_CONFIG, type RunConfig } from '../engine/config';
import { BOTS, jogarRun, type RunResult } from './bots';
import { agregar, avaliarCriterios, type Agregado } from './metrics';

const POOL = allSymbols().map((s) => s.id);

export function rodarLote(bot: string, runs: number, cfg: RunConfig = DEFAULT_CONFIG, seedPrefix = 'BAL'): RunResult[] {
  const b = BOTS[bot];
  if (!b) throw new Error(`bot desconhecido: ${bot}`);
  const out: RunResult[] = [];
  for (let i = 0; i < runs; i++) out.push(jogarRun(`${seedPrefix}-${bot}-${i}`, b, POOL, cfg));
  return out;
}

function imprimir(a: Agregado): void {
  console.log(`\n== bot_${a.bot} (${a.runs} runs) ==`);
  console.log(`winrate: ${(100 * a.winrate).toFixed(2)}%  | ante mediano morte: ${a.anteMedianoMorte}  | cadeia≥10: ${(100 * a.pctCadeia10).toFixed(1)}%`);
  console.log(`vitórias: decisões med ${a.decisoesVitoriaMediana} | rodadas med ${a.rodadasVitoriaMediana} | score med final ${a.scoreMedianoFinal}`);
  console.log(`máx presença em vitórias: ${a.maxPresencaVitorias.simbolo} ${(100 * a.maxPresencaVitorias.pct).toFixed(1)}% | winrate médio qd comprado: ${(100 * a.mediaWinrateComprado).toFixed(1)}%`);
  console.log(`mortes por ante: ${a.mortesPorAnte.map((n, i) => (i > 0 ? `A${i}:${n}` : '')).filter(Boolean).join(' ')}`);
  console.log(`top presenças: ${a.topPresencas.map((t) => `${t.simbolo}:${(100 * t.pct).toFixed(0)}%`).join(' ')}`);
  if (a.simbolosMortos.length) console.log(`símbolos mortos: ${a.simbolosMortos.map((m) => `${m.id}(${(100 * m.winrate).toFixed(0)}%/${m.compras})`).join(' ')}`);
}

function main(): void {
  const args = process.argv.slice(2);
  const get = (k: string, dflt: string) => {
    const i = args.indexOf(`--${k}`);
    return i >= 0 ? args[i + 1]! : dflt;
  };
  const runs = parseInt(get('runs', '2000'), 10);
  const bots = get('bots', 'sinergia,guloso,aleatorio').split(',');
  const cfg: RunConfig = {
    ...DEFAULT_CONFIG,
    metaBase: parseFloat(get('base', String(DEFAULT_CONFIG.metaBase))),
    metaGrowth: parseFloat(get('growth', String(DEFAULT_CONFIG.metaGrowth))),
    fichasBase: parseInt(get('fichas', String(DEFAULT_CONFIG.fichasBase)), 10),
    fichasIniciais: parseInt(get('fichas0', String(DEFAULT_CONFIG.fichasIniciais)), 10),
    metaRodada: get('rodada', DEFAULT_CONFIG.metaRodada.join(',')).split(',').map(Number) as [number, number, number],
  };
  console.log(`cfg: base=${cfg.metaBase} growth=${cfg.metaGrowth} rodada=[${cfg.metaRodada}] fichasBase=${cfg.fichasBase}`);
  const t0 = Date.now();
  const ags: Record<string, Agregado> = {};
  for (const bot of bots) {
    const tb = Date.now();
    const rs = rodarLote(bot, runs, cfg);
    ags[bot] = agregar(bot, rs);
    imprimir(ags[bot]!);
    console.log(`(${((Date.now() - tb) / 1000).toFixed(1)}s)`);
  }
  if (ags.sinergia && ags.guloso && ags.aleatorio) {
    console.log('\n== CRITÉRIOS GATE 2 (§8) ==');
    const cs = avaliarCriterios(ags.sinergia, ags.guloso, ags.aleatorio);
    for (const c of cs) console.log(`${c.ok ? '✅' : '❌'} ${c.nome}: ${c.valor} (alvo ${c.alvo})`);
    console.log(`\n${cs.every((c) => c.ok) ? '🟢 GATE 2 PASSOU' : '🔴 GATE 2 FALHOU'}`);
  }
  mkdirSync('sim-out', { recursive: true });
  writeFileSync('sim-out/ultimo.json', JSON.stringify(ags, null, 2));
  console.log(`\ntotal: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main();
