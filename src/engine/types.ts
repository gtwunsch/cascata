/** Purpose: tipos centrais do motor (símbolos, pulso, resolução, run-view) | Exports: SymbolDef, PlacedSymbol, Pulse, Resolucao, TriggerCtx, ... | Dependencies: dirs */
import type { Dir } from './dirs';

export type Raridade = 'comum' | 'incomum' | 'raro' | 'lendario';
export type Papel = 'gerador' | 'condutor' | 'amplificador' | 'gatilho' | 'economico';

export const PAPEIS: readonly Papel[] = ['gerador', 'condutor', 'amplificador', 'gatilho', 'economico'];

/** símbolo posicionado na grade; `mem` é estado persistente; `inv` = peça espelhada (girada) */
export interface PlacedSymbol {
  id: string;
  mem: number;
  inv?: boolean;
}

export interface Pulse {
  x: number;
  y: number;
  dir: Dir;
  potencia: number;
  depth: number; // elos já percorridos por esta linhagem
}

export interface EmitOut {
  dir: Dir;
  potenciaMul?: number;
  potenciaAdd?: number;
  /** reinjeta na posição do emissor (portal) em vez da célula atual */
  reinjetar?: boolean;
}

export interface FireEvent {
  tick: number;
  cell: number;
  symbolId: string;
  depth: number;
  pontosDelta: number;
  multAntes: number;
  multDepois: number;
  fichasDelta: number;
  potencia: number;
  scoreParcial: number;
}

/** estado corrente de uma resolução (mutado pelos triggers) */
export interface Resolucao {
  pontos: number;
  mult: number;
  fichas: number; // fichas geradas por símbolos econômicos nesta resolução
  eventos: FireEvent[];
  maxCadeia: number;
  disparos: number;
  disparosPorPapel: Record<Papel, number>;
  disparosPorCelula: number[];
  /** fichas já concedidas pelo efeito midas nesta resolução (cap) */
  midasFichas: number;
  /** flags voláteis setadas por símbolos (ex.: reroll grátis) */
  rerollGratis: boolean;
  /** deltas de `mem` por célula — resolve() é puro; a run comita após resolução real */
  memDeltas: number[];
  /** células vazias alcançadas por pulsos — a "fronteira" expansível da máquina */
  fronteira: number[];
  /** rastro de pulsos por tick (só com mods.trace — para a animação da UI) */
  rastro: { tick: number; x: number; y: number; dir: Dir; depth: number }[];
  score: number; // preenchido ao final: round(pontos × mult), com relíquias finais
}

/** efeitos globais estruturais que um símbolo exerce enquanto está na grade (lendários) */
export interface GlobalFx {
  ghost?: boolean; // pulsos atravessam células vazias
  maxFires?: number; // eco: 2
  emissorEspelhado?: boolean; // núcleo: 2º pulso na fileira oposta
  midas?: boolean; // aumentos de mult geram fichas
}

/** visão mínima da run que o motor de resolução precisa (run.ts implementa) */
export interface RunView {
  grid: readonly (PlacedSymbol | null)[];
  fichas: number;
  relics: readonly string[];
}

export interface TriggerCtx {
  res: Resolucao;
  run: RunView;
  def: SymbolDef;
  self: PlacedSymbol;
  potencia: number;
  depth: number;
  cell: number;
  dirIn: Dir;
  /** mem efetivo (persistido + delta desta resolução) — nunca ler self.mem direto */
  mem: () => number;
  /** incrementa mem via res.memDeltas (resolve é puro; run comita depois) */
  bumpMem: (n: number) => void;
}

export interface SymbolDef {
  id: string;
  nome: string;
  desc: string; // ≤ 140 caracteres (anti-goal §11)
  raridade: Raridade;
  custo: number;
  papel: Papel;
  tags?: string[];
  global?: GlobalFx;
  onTrigger?: (ctx: TriggerCtx) => void;
  /** default: continua na direção de entrada */
  emitir?: (dirIn: Dir, ctx: TriggerCtx) => EmitOut[];
  /** condição para disparar; se falsa, pulso atravessa (ex.: usina exige depth ≥ 4) */
  podeDisparar?: (ctx: TriggerCtx) => boolean;
}

/** modificadores de resolução compostos pela run (mutador + emissor + relíquias) */
export interface ResolveMods {
  chainCap?: number;
  blockedCells?: ReadonlySet<number>;
  disabledRow?: number; // símbolos nesta fileira não disparam
  emitters?: readonly { x: number; y: number; dir: Dir }[];
  potenciaInicial?: number;
  apagao?: boolean; // 1º elo não dispara
  condutor2x?: boolean; // relíquia ressonância: condutores disparam 2×/cascata
  trace?: boolean; // grava rastro de pulsos para a animação
  tetoMult?: number;
  /** bônus de pontos-base por papel (relíquias lente_polida/turbina) */
  bonusPapel?: Partial<Record<Papel, number>>;
  /** ajustes finais de mult por relíquia: [cadeiaMinima, multAdd, multMul] */
  finalMultAdd?: { minCadeia: number; add: number }[];
  finalMultMul?: { minCadeia: number; mul: number }[];
}

export interface Mutator {
  id: string;
  nome: string;
  desc: string;
  chainCap?: number;
  blockedRandom?: number; // n células bloqueadas sorteadas no início da rodada
  emissorDireita?: boolean;
  semLojaDepois?: boolean;
  disabledRow?: number;
  potenciaInicial?: number;
  placementDelta?: number;
  semFichas?: boolean;
  bloqueiaColunasDireita?: boolean; // não pode posicionar nas colunas 3-4
  monotonia?: boolean; // não repetir papel nos posicionamentos da rodada
  tetoMult?: number;
  apagao?: boolean;
}

export interface RelicDef {
  id: string;
  nome: string;
  desc: string;
  custo: number;
}

export interface EmitterDef {
  id: string;
  nome: string;
  desc: string;
  custoSucata: number; // 0 = inicial
  fichasIniciais: number;
  maoInicial: string[];
  placementsBase: number;
  rows: number[]; // fileiras de emissão (normalmente [1])
  lojaExtra?: boolean; // 4 símbolos na loja
}
