/** Purpose: máquina de estados da run — rodadas, loja, economia, mutadores (§3, §4.4-4.6) | Exports: Run, RunStatus | Dependencies: config, resolve, registry, content, rng */
import { DEFAULT_CONFIG, metaDaRodada, type RunConfig } from './config';
import { DIR_L, DIR_R, GRID_W, N_CELLS, cellX } from './dirs';
import { getSymbol } from './registry';
import { resolve } from './resolve';
import { Rng, seedFromString } from './rng';
import { MUTATORS, mutatorById } from './content/mutators';
import { RELICS } from './content/relics';
import { emitterById } from './content/emitters';
import type { Mutator, Papel, PlacedSymbol, Raridade, Resolucao, ResolveMods, RunView, SymbolDef } from './types';

export type RunStatus = 'construindo' | 'loja' | 'vitoria' | 'derrota';

export interface RunStats {
  maxCadeia: number;
  melhorScore: number;
  decisoes: number;
  rodadasJogadas: number;
  comprados: string[];
  simboloMvp: string | null;
}

export interface ShopOffer {
  symbols: string[];
  relic: string | null;
  rerollCost: number;
}

export class Run implements RunView {
  readonly cfg: RunConfig;
  readonly seedStr: string;
  rng: Rng;
  emitterId: string;
  ante = 1;
  rodada = 1;
  grid: (PlacedSymbol | null)[] = new Array(N_CELLS).fill(null);
  mao: string[] = [];
  fichas: number;
  relics: string[] = [];
  status: RunStatus = 'construindo';
  placementsLeft: number;
  remocoesUsadas = 0;
  mutadoresRun: string[];
  mutadorAtual: Mutator | null = null;
  blockedCells: Set<number> = new Set();
  skipNextShop = false;
  papeisNaRodada: Set<Papel> = new Set();
  rerollGratis = false;
  rerollCount = 0;
  comprasNaLoja = 0;
  shop: ShopOffer = { symbols: [], relic: null, rerollCost: 2 };
  ultimaResolucao: Resolucao | null = null;
  pool: string[];
  stats: RunStats = { maxCadeia: 0, melhorScore: 0, decisoes: 0, rodadasJogadas: 0, comprados: [], simboloMvp: null };
  /** modo endless pós-vitória (§3.3) */
  anteInfinito = false;

  constructor(seedStr: string, opts: { emitterId?: string; pool?: string[]; cfg?: RunConfig } = {}) {
    this.cfg = opts.cfg ?? DEFAULT_CONFIG;
    this.seedStr = seedStr;
    this.rng = new Rng(seedFromString(seedStr));
    this.emitterId = opts.emitterId ?? 'mk1';
    const em = emitterById(this.emitterId);
    this.fichas = em.fichasIniciais;
    this.mao = [...em.maoInicial];
    this.placementsLeft = this.placementsBase();
    this.pool = opts.pool ?? [];
    this.mutadoresRun = this.rng.shuffle(MUTATORS.map((m) => m.id)).slice(0, this.cfg.antes);
  }

  get meta(): number {
    return metaDaRodada(this.cfg, this.ante, this.rodada);
  }

  get ehChefe(): boolean {
    return this.rodada === 3;
  }

  placementsBase(): number {
    const em = emitterById(this.emitterId);
    let n = em.placementsBase;
    if (this.relics.includes('braco_extra')) n += 1;
    if (this.ehChefe && this.mutadorAtual?.placementDelta) n += this.mutadorAtual.placementDelta;
    return Math.max(1, n);
  }

  maoCap(): number {
    return this.cfg.maoCap + (this.relics.includes('estoque') ? 3 : 0);
  }

  /** compõe os modificadores de resolução: mutador + emissor + relíquias */
  buildMods(): ResolveMods {
    const em = emitterById(this.emitterId);
    const m = this.ehChefe ? this.mutadorAtual : null;
    const direita = m?.emissorDireita ?? false;
    const emitters = em.rows.map((y) => ({ x: direita ? GRID_W : -1, y, dir: direita ? DIR_L : DIR_R }));
    let pot = m?.potenciaInicial ?? 1;
    if (this.relics.includes('bateria')) pot += 0.5;
    const bonusPapel: Partial<Record<Papel, number>> = {};
    if (this.relics.includes('lente_polida')) bonusPapel.gerador = 4;
    if (this.relics.includes('turbina')) bonusPapel.condutor = 3;
    const mods: ResolveMods = { emitters, potenciaInicial: pot, bonusPapel };
    if (m?.chainCap !== undefined) mods.chainCap = m.chainCap;
    if (m?.disabledRow !== undefined) mods.disabledRow = m.disabledRow;
    if (m?.tetoMult !== undefined) mods.tetoMult = m.tetoMult;
    if (m?.apagao) mods.apagao = true;
    if (this.blockedCells.size > 0) mods.blockedCells = this.blockedCells;
    if (this.relics.includes('metronomo')) mods.finalMultAdd = [{ minCadeia: 8, add: 0.5 }];
    if (this.relics.includes('prisma_bruto')) mods.finalMultMul = [{ minCadeia: 10, mul: 1.25 }];
    return mods;
  }

  /** simulação pura (preview de impacto, bots) — não muta nada */
  simular(gridOverride?: (PlacedSymbol | null)[]): Resolucao {
    const view: RunView = gridOverride ? { grid: gridOverride, fichas: this.fichas, relics: this.relics } : this;
    return resolve(view, this.buildMods());
  }

  /** delta de pontuação projetada ao posicionar mao[maoIdx] em cell (§3.1, 1 rollout) */
  previewPlacement(maoIdx: number, cell: number): { antes: number; depois: number } {
    const antes = this.simular().score;
    const g = this.grid.slice();
    g[cell] = { id: this.mao[maoIdx]!, mem: 0 };
    return { antes, depois: this.simular(g).score };
  }

  podePosicionar(maoIdx: number, cell: number): boolean {
    if (this.status !== 'construindo' || this.placementsLeft <= 0) return false;
    if (maoIdx < 0 || maoIdx >= this.mao.length || this.grid[cell]) return false;
    if (this.blockedCells.has(cell)) return false;
    const m = this.ehChefe ? this.mutadorAtual : null;
    if (m?.bloqueiaColunasDireita && cellX(cell) >= GRID_W - 2) return false;
    if (m?.monotonia && this.papeisNaRodada.has(getSymbol(this.mao[maoIdx]!).papel)) return false;
    return true;
  }

  posicionar(maoIdx: number, cell: number): boolean {
    if (!this.podePosicionar(maoIdx, cell)) return false;
    const id = this.mao.splice(maoIdx, 1)[0]!;
    this.grid[cell] = { id, mem: 0 };
    this.papeisNaRodada.add(getSymbol(id).papel);
    this.placementsLeft--;
    this.stats.decisoes++;
    return true;
  }

  custoRemocao(): number {
    if (this.relics.includes('reciclagem')) return 0;
    return this.remocoesUsadas < this.cfg.remocoesGratis ? 0 : this.cfg.custoRemocao;
  }

  remover(cell: number): boolean {
    if (this.status !== 'construindo' || !this.grid[cell]) return false;
    const custo = this.custoRemocao();
    if (this.fichas < custo) return false;
    this.fichas -= custo;
    this.remocoesUsadas++;
    this.grid[cell] = null;
    this.stats.decisoes++;
    return true;
  }

  /** RESOLVER — o momento sagrado (§1.1) */
  resolver(): Resolucao {
    if (this.status !== 'construindo') throw new Error('resolver fora da fase de construção');
    const res = this.simular();
    this.ultimaResolucao = res;
    this.stats.rodadasJogadas++;
    if (res.maxCadeia > this.stats.maxCadeia) this.stats.maxCadeia = res.maxCadeia;
    if (res.score > this.stats.melhorScore) this.stats.melhorScore = res.score;
    // comita efeitos persistentes (resolve é puro)
    for (let i = 0; i < N_CELLS; i++) {
      const d = res.memDeltas[i]!;
      if (d !== 0 && this.grid[i]) this.grid[i]!.mem += d;
    }
    if (res.rerollGratis) this.rerollGratis = true;

    if (res.score >= this.meta) {
      const m = this.ehChefe ? this.mutadorAtual : null;
      if (!m?.semFichas) {
        let ganho = this.cfg.fichasBase;
        ganho += Math.min(this.cfg.fichasCadeiaCap, res.maxCadeia);
        const jurosCap = this.relics.includes('ima') ? 8 : this.cfg.jurosCap;
        ganho += Math.min(jurosCap, Math.floor(this.fichas / this.cfg.jurosDiv));
        if (res.score >= this.cfg.overflowMin * this.meta) {
          ganho += Math.min(this.cfg.overflowCap, Math.floor(res.score / this.meta)); // Overflow (F6, D8)
        }
        if (this.relics.includes('cofre')) ganho += 2;
        this.fichas += ganho + res.fichas;
      } else {
        this.fichas += res.fichas;
      }
      if (m?.semLojaDepois) this.skipNextShop = true;
      if (this.ante === this.cfg.antes && this.rodada === 3 && !this.anteInfinito) {
        this.status = 'vitoria';
      } else if (this.skipNextShop) {
        this.skipNextShop = false;
        this.proximaRodada();
      } else {
        this.abrirLoja();
      }
    } else {
      this.status = 'derrota';
      this.computarMvp(res);
    }
    return res;
  }

  private computarMvp(res: Resolucao): void {
    const pontosPorSimbolo = new Map<string, number>();
    for (const e of res.eventos) {
      pontosPorSimbolo.set(e.symbolId, (pontosPorSimbolo.get(e.symbolId) ?? 0) + e.pontosDelta + (e.multDepois - e.multAntes) * 20);
    }
    let best: string | null = null;
    let bestV = -1;
    for (const [id, v] of pontosPorSimbolo) if (v > bestV) { bestV = v; best = id; }
    this.stats.simboloMvp = best;
  }

  private pesosRaridade(): Record<Raridade, number> {
    const t = (this.ante - 1) / Math.max(1, this.cfg.antes - 1);
    const a = this.cfg.pesoLojaInicio;
    const b = this.cfg.pesoLojaFim;
    const lerp = (x: number, y: number) => x + (y - x) * t;
    return { comum: lerp(a.comum, b.comum), incomum: lerp(a.incomum, b.incomum), raro: lerp(a.raro, b.raro), lendario: lerp(a.lendario, b.lendario) };
  }

  private sortearSimbolo(exclude: string[]): string {
    const pesos = this.pesosRaridade();
    const candidatos = this.pool.filter((id) => !exclude.includes(id));
    const total = candidatos.reduce((s, id) => s + pesos[getSymbol(id).raridade], 0);
    let r = this.rng.next() * total;
    for (const id of candidatos) {
      r -= pesos[getSymbol(id).raridade];
      if (r <= 0) return id;
    }
    return candidatos[candidatos.length - 1]!;
  }

  private nOfertas(): number {
    const em = emitterById(this.emitterId);
    return 3 + (em.lojaExtra || this.relics.includes('faro') ? 1 : 0); // F5: 3 opções (+extra por desbloqueio)
  }

  abrirLoja(): void {
    this.status = 'loja';
    this.rerollCount = 0;
    this.comprasNaLoja = 0;
    const symbols: string[] = [];
    for (let i = 0; i < this.nOfertas(); i++) symbols.push(this.sortearSimbolo(symbols));
    const relicsDisp = RELICS.filter((r) => !this.relics.includes(r.id));
    const relic = this.relics.length < this.cfg.maxRelics && relicsDisp.length > 0 ? this.rng.pick(relicsDisp).id : null;
    this.shop = { symbols, relic, rerollCost: this.rerollCostAtual() };
  }

  rerollCostAtual(): number {
    if (this.rerollGratis) return 0;
    const em = emitterById(this.emitterId);
    return this.cfg.rerollBase + this.rerollCount + (em.id === 'sortudo' ? 1 : 0);
  }

  precoSimbolo(id: string): number {
    let p = getSymbol(id).custo;
    if (this.relics.includes('cupom') && this.comprasNaLoja === 0) p = Math.max(1, p - 2);
    return p;
  }

  comprar(idx: number): boolean {
    if (this.status !== 'loja') return false;
    const id = this.shop.symbols[idx];
    if (!id || this.mao.length >= this.maoCap()) return false;
    const preco = this.precoSimbolo(id);
    if (this.fichas < preco) return false;
    this.fichas -= preco;
    this.mao.push(id);
    this.shop.symbols.splice(idx, 1);
    this.comprasNaLoja++;
    this.stats.comprados.push(id);
    this.stats.decisoes++;
    return true;
  }

  comprarRelic(): boolean {
    if (this.status !== 'loja' || !this.shop.relic) return false;
    const def = RELICS.find((r) => r.id === this.shop.relic)!;
    let preco = def.custo;
    if (this.relics.includes('cupom') && this.comprasNaLoja === 0) preco = Math.max(1, preco - 2);
    if (this.fichas < preco || this.relics.length >= this.cfg.maxRelics) return false;
    this.fichas -= preco;
    this.relics.push(def.id);
    this.shop.relic = null;
    this.comprasNaLoja++;
    this.stats.decisoes++;
    return true;
  }

  reroll(): boolean {
    if (this.status !== 'loja') return false;
    const custo = this.rerollCostAtual();
    if (this.fichas < custo) return false;
    this.fichas -= custo;
    if (this.rerollGratis) this.rerollGratis = false;
    else this.rerollCount++;
    const symbols: string[] = [];
    for (let i = 0; i < this.nOfertas(); i++) symbols.push(this.sortearSimbolo(symbols));
    this.shop.symbols = symbols;
    this.shop.rerollCost = this.rerollCostAtual();
    this.stats.decisoes++;
    return true;
  }

  fecharLoja(): void {
    if (this.status !== 'loja') return;
    this.proximaRodada();
  }

  proximaRodada(): void {
    this.rodada++;
    if (this.rodada > 3) {
      this.rodada = 1;
      this.ante++;
    }
    this.status = 'construindo';
    this.remocoesUsadas = 0;
    this.papeisNaRodada.clear();
    this.blockedCells = new Set();
    this.mutadorAtual = null;
    if (this.ehChefe) {
      const idx = Math.min(this.ante - 1, this.mutadoresRun.length - 1);
      this.mutadorAtual = mutatorById(this.mutadoresRun[idx]!);
      if (this.mutadorAtual.blockedRandom) {
        const livres = [...Array(N_CELLS).keys()].filter((i) => !this.grid[i]);
        for (const c of this.rng.shuffle(livres).slice(0, this.mutadorAtual.blockedRandom)) this.blockedCells.add(c);
      }
    }
    this.placementsLeft = this.placementsBase();
  }

  /** vitória → continuar em endless (§3.3) */
  iniciarAnteInfinito(): void {
    if (this.status !== 'vitoria') return;
    this.anteInfinito = true;
    this.abrirLoja();
  }

  simbolosNaGrade(): SymbolDef[] {
    const out: SymbolDef[] = [];
    for (const p of this.grid) if (p) out.push(getSymbol(p.id));
    return out;
  }
}
