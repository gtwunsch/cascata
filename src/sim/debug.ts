/** Purpose: trace de uma run de bot para diagnóstico de balanceamento | uso: npx tsx src/sim/debug.ts sinergia SEED */
import '../engine/content';
import { allSymbols, getSymbol } from '../engine/registry';
import { Rng, seedFromString } from '../engine/rng';
import { Run } from '../engine/run';
import { cellX, cellY } from '../engine/dirs';
import { BOTS } from './bots';

const POOL = allSymbols().map((s) => s.id);
const botName = process.argv[2] ?? 'sinergia';
const seed = process.argv[3] ?? 'DEBUG-1';
const bot = BOTS[botName]!;

const run = new Run(seed, { pool: POOL });
const rng = new Rng(seedFromString(seed + ':bot'));

function gridStr(r: Run): string {
  const linhas: string[] = [];
  for (let y = 0; y < 4; y++) {
    const cells: string[] = [];
    for (let x = 0; x < 5; x++) {
      const p = r.grid[y * 5 + x];
      cells.push(p ? getSymbol(p.id).id.slice(0, 8).padEnd(8) : '·'.padEnd(8));
    }
    linhas.push(cells.join(' '));
  }
  return linhas.join('\n');
}

let guard = 0;
while ((run.status === 'construindo' || run.status === 'loja') && guard++ < 300) {
  if (run.status === 'construindo') {
    const antes = { ante: run.ante, rodada: run.rodada, meta: run.meta, fichas: run.fichas, mao: [...run.mao], mutador: run.mutadorAtual?.id };
    bot.construir(run, rng);
    const res = run.ultimaResolucao!;
    console.log(
      `A${antes.ante}R${antes.rodada}${antes.mutador ? `[${antes.mutador}]` : ''} meta=${antes.meta} score=${res.score} (pts=${res.pontos.toFixed(0)} mult=${res.mult.toFixed(2)} cadeia=${res.maxCadeia} disparos=${res.disparos}) fichas=${run.fichas} → ${run.status}`,
    );
    if ((run.status as string) === 'derrota' || (run.status as string) === 'vitoria') {
      console.log(`\nGRADE FINAL:\n${gridStr(run)}`);
      console.log(`mão: ${run.mao.join(',')} | relics: ${run.relics.join(',')}`);
      console.log(`decisões=${run.stats.decisoes} rodadas=${run.stats.rodadasJogadas} maxCadeia=${run.stats.maxCadeia}`);
      const ocupadas = run.grid.map((p, i) => (p ? `${getSymbol(p.id).id}@(${cellX(i)},${cellY(i)})` : null)).filter(Boolean);
      console.log(`build: ${ocupadas.join(' ')}`);
    }
  } else {
    const oferta = [...run.shop.symbols];
    const fichasAntes = run.fichas;
    bot.loja(run, rng);
    const compradosAgora = run.stats.comprados.slice(run.stats.comprados.length - Math.max(0, oferta.length - run.shop.symbols.length));
    console.log(`  loja: oferta=[${oferta.join(',')}] comprou=[${compradosAgora.join(',')}] fichas ${fichasAntes}→${run.fichas} relics=[${run.relics.join(',')}]`);
  }
}
