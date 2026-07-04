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
  /** bônus permanentes de meta-progressão (F9) */
  maoBonus = 0;

  constructor(seedStr: string, opts: { emitterId?: string; pool?: string[]; cfg?: RunConfig; bonus?: { fichas?: number; mao?: number; rerollGratis?: boolean } } = {}) {
    this.cfg = opts.cfg ?? DEFAULT_CONFIG;
    this.seedStr = seedStr;
    this.rng = new Rng(seedFromString(seedStr));
    this.emitterId = opts.emitterId ?? 'mk1';
    const em = emitterById(this.emitterId);
    this.fichas = em.fichasIniciais;
    // tokens 'ger_comum'/'cond_comum' viram sorteios seedados — cada run começa com um kit diferente
    const KIT_RETOS = ['faisca', 'celula', 'resistor'];
    const KIT_GERADORES = [...KIT_RETOS, 'agulha', 'dinamo', 'bobina'];
    const KIT_CONDUTORES = ['cano', 'cotovelo_d', 'cotovelo_e', 'trilho'];
    let primeiroGer = true;
    this.mao = em.maoInicial.map((id) => {
      if (id === 'ger_comum') {
        // o 1º gerador do kit é sempre de emissão reta (kits 100% diagonais são armadilha)
        const pool = primeiroGer ? KIT_RETOS : KIT_GERADORES;
        primeiroGer = false;
        return this.rng.pick(pool);
      }
      if (id === 'cond_comum') return this.rng.pick(KIT_CONDUTORES);
      return id;
    });
    this.placementsLeft = this.placementsBase();
    this.pool = opts.pool ?? [];
    if (opts.bonus?.fichas) this.fichas += opts.bonus.fichas;
    if (opts.bonus?.mao) this.maoBonus = opts.bonus.mao;
    if (opts.bonus?.rerollGratis) this.rerollGratis = true;
    // chefes: mutadores brandos nos antes 1-2, os duros vêm depois (mortes cedo por sorteio não são interessantes)
    const brandos = ['curto_circuito', 'sobrecarga', 'pedagio', 'imposto', 'teto', 'escassez'];
    const suaves = this.rng.shuffle(MUTATORS.filter((m) => brandos.includes(m.id)).map((m) => m.id));
    const duros = this.rng.shuffle(MUTATORS.filter((m) => !brandos.includes(m.id)).map((m) => m.id));
    this.mutadoresRun = [suaves[0]!, suaves[1]!, ...this.rng.shuffle([...suaves.slice(2), ...duros])].slice(0, this.cfg.antes);
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
    return this.cfg.maoCap + this.maoBonus + (this.relics.includes('estoque') ? 3 : 0);
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
    if (this.relics.includes('ressonancia')) mods.condutor2x = true;
    if (this.relics.includes('metronomo')) mods.finalMultAdd = [{ minCadeia: 8, add: 1.5 }];
    if (this.relics.includes('prisma_bruto')) mods.finalMultMul = [{ minCadeia: 10, mul: 1.6 }];
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

  podePosicionar(maoIdx: number, cell: number, ignorarOcupada = false): boolean {
    if (this.status !== 'construindo' || this.placementsLeft <= 0) return false;
    if (maoIdx < 0 || maoIdx >= this.mao.length) return false;
    if (this.grid[cell] && !ignorarOcupada) return false;
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

  /** gira (espelha) uma peça posicionada — grátis, só na fase de construção */
  girar(cell: number): boolean {
    if (this.status !== 'construindo' || !this.grid[cell]) return false;
    this.grid[cell]!.inv = !this.grid[cell]!.inv;
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
    const possuidos = new Set<string>(this.mao);
    for (const p of this.grid) if (p) possuidos.add(p.id);
    // a loja conhece sua máquina: o que você já possui aparece mais (builds com duplicatas)
    const peso = (id: string) => pesos[getSymbol(id).raridade] * (possuidos.has(id) ? 2.2 : 1);
    const total = candidatos.reduce((s, id) => s + peso(id), 0);
    let r = this.rng.next() * total;
    for (const id of candidatos) {
      r -= peso(id);
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

  /** desfaz o último posicionamento (oil §6: undo antes de RESOLVER) */
  desfazerPosicionamento(cell: number): boolean {
    if (this.status !== 'construindo' || !this.grid[cell]) return false;
    const p = this.grid[cell]!;
    if (this.mao.length >= this.maoCap()) return false;
    this.grid[cell] = null;
    this.mao.push(p.id);
    this.placementsLeft++;
    this.stats.decisoes = Math.max(0, this.stats.decisoes - 1);
    return true;
  }

  /** estado completo serializável em JSON (§10) */
  serialize(): Record<string, unknown> {
    return {
      v: 1,
      seedStr: this.seedStr,
      rng: this.rng.getState(),
      emitterId: this.emitterId,
      ante: this.ante,
      rodada: this.rodada,
      grid: this.grid,
      mao: this.mao,
      fichas: this.fichas,
      relics: this.relics,
      status: this.status,
      placementsLeft: this.placementsLeft,
      remocoesUsadas: this.remocoesUsadas,
      mutadoresRun: this.mutadoresRun,
      mutadorAtualId: this.mutadorAtual?.id ?? null,
      blockedCells: [...this.blockedCells],
      skipNextShop: this.skipNextShop,
      papeisNaRodada: [...this.papeisNaRodada],
      rerollGratis: this.rerollGratis,
      rerollCount: this.rerollCount,
      comprasNaLoja: this.comprasNaLoja,
      shop: this.shop,
      pool: this.pool,
      stats: this.stats,
      anteInfinito: this.anteInfinito,
      maoBonus: this.maoBonus,
    };
  }

  static deserialize(d: Record<string, unknown>): Run {
    const r = new Run(d.seedStr as string, { emitterId: d.emitterId as string, pool: d.pool as string[] });
    r.rng = Rng.fromState(d.rng as number);
    r.ante = d.ante as number;
    r.rodada = d.rodada as number;
    r.grid = (d.grid as (PlacedSymbol | null)[]).map((p) => (p ? { ...p } : null));
    r.mao = [...(d.mao as string[])];
    r.fichas = d.fichas as number;
    r.relics = [...(d.relics as string[])];
    r.status = d.status as RunStatus;
    r.placementsLeft = d.placementsLeft as number;
    r.remocoesUsadas = d.remocoesUsadas as number;
    r.mutadoresRun = [...(d.mutadoresRun as string[])];
    r.mutadorAtual = d.mutadorAtualId ? mutatorById(d.mutadorAtualId as string) : null;
    r.blockedCells = new Set(d.blockedCells as number[]);
    r.skipNextShop = d.skipNextShop as boolean;
    r.papeisNaRodada = new Set(d.papeisNaRodada as Papel[]);
    r.rerollGratis = d.rerollGratis as boolean;
    r.rerollCount = d.rerollCount as number;
    r.comprasNaLoja = d.comprasNaLoja as number;
    r.shop = d.shop as ShopOffer;
    r.stats = d.stats as RunStats;
    r.anteInfinito = d.anteInfinito as boolean;
    r.maoBonus = (d.maoBonus as number) ?? 0;
    return r;
  }

  /** cópia profunda para rollouts de bots — RNG clonado no mesmo estado */
  clone(): Run {
    const c = new Run(this.seedStr, { emitterId: this.emitterId, pool: this.pool, cfg: this.cfg });
    c.rng = Rng.fromState(this.rng.getState());
    c.ante = this.ante;
    c.rodada = this.rodada;
    c.grid = this.grid.map((p) => (p ? { ...p } : null));
    c.mao = [...this.mao];
    c.fichas = this.fichas;
    c.relics = [...this.relics];
    c.status = this.status;
    c.placementsLeft = this.placementsLeft;
    c.remocoesUsadas = this.remocoesUsadas;
    c.mutadoresRun = [...this.mutadoresRun];
    c.mutadorAtual = this.mutadorAtual;
    c.blockedCells = new Set(this.blockedCells);
    c.skipNextShop = this.skipNextShop;
    c.papeisNaRodada = new Set(this.papeisNaRodada);
    c.rerollGratis = this.rerollGratis;
    c.rerollCount = this.rerollCount;
    c.comprasNaLoja = this.comprasNaLoja;
    c.shop = { symbols: [...this.shop.symbols], relic: this.shop.relic, rerollCost: this.shop.rerollCost };
    c.anteInfinito = this.anteInfinito;
    c.stats = { ...this.stats, comprados: [...this.stats.comprados] };
    return c;
  }
}
