/** Purpose: meta-progressão — Sucata, emissores, upgrades minúsculos, 15 conquistas, persistência (§3.4, F9) | Exports: Meta, CONQUISTAS | Dependencies: engine */
import type { Run } from '../engine/run';
import type { Resolucao } from '../engine/types';

const CHAVE = 'cascata_meta_v1';
const CHAVE_RUN = 'cascata_run_v1';
const CHAVE_PREFS = 'cascata_prefs_v1';

export interface Conquista {
  id: string;
  nome: string;
  desc: string;
  sucata: number;
}

export const CONQUISTAS: readonly Conquista[] = [
  { id: 'primeira_cascata', nome: 'Primeiro Pulso', desc: 'Vença 1 rodada.', sucata: 5 },
  { id: 'ante3', nome: 'Esquenta', desc: 'Alcance o ante 3.', sucata: 8 },
  { id: 'ante5', nome: 'Metade do Caminho', desc: 'Alcance o ante 5.', sucata: 12 },
  { id: 'primeira_vitoria', nome: 'Máquina Perfeita', desc: 'Vença uma run.', sucata: 40 },
  { id: 'cadeia_10', nome: 'Dois Dígitos', desc: 'Cadeia de 10+ elos.', sucata: 10 },
  { id: 'cadeia_16', nome: 'Serpente', desc: 'Cadeia de 16+ elos.', sucata: 20 },
  { id: 'overflow', nome: 'Transbordo', desc: 'Pontue 3× a meta numa rodada.', sucata: 10 },
  { id: 'milhar', nome: 'Quatro Dígitos', desc: 'Pontue 1.000+ numa rodada.', sucata: 12 },
  { id: 'dezena_milhar', nome: 'Cinco Dígitos', desc: 'Pontue 10.000+ numa rodada.', sucata: 25 },
  { id: 'economista', nome: 'Poupança', desc: 'Guarde 25+ fichas.', sucata: 10 },
  { id: 'colecionador', nome: 'Colecionador', desc: 'Tenha 5 relíquias numa run.', sucata: 15 },
  { id: 'lendario', nome: 'Relicário', desc: 'Posicione um lendário.', sucata: 15 },
  { id: 'minimalista', nome: 'Minimalista', desc: 'Vença uma rodada com ≤5 símbolos.', sucata: 8 },
  { id: 'eco_total', nome: 'Avalanche', desc: '25+ disparos numa cascata.', sucata: 18 },
  { id: 'boss_perfeito', nome: 'Sem Suar', desc: 'Vença um chefe com 3× a meta.', sucata: 15 },
];

export interface UpgradeDef {
  id: string;
  nome: string;
  desc: string;
  custo: number;
}

/** upgrades permanentes minúsculos (F9: < 3% cada) */
export const UPGRADES: readonly UpgradeDef[] = [
  { id: 'fichas_extra', nome: 'Caixa Dupla', desc: '+2 fichas iniciais.', custo: 30 },
  { id: 'mao_extra', nome: 'Bolso Fundo', desc: '+1 de capacidade de mão.', custo: 30 },
  { id: 'reroll_gratis', nome: 'Cartela', desc: '1º reroll de cada run é grátis.', custo: 40 },
];

interface MetaState {
  sucata: number;
  emissores: string[];
  emissorAtivo: string;
  conquistas: Record<string, boolean>;
  upgrades: Record<string, boolean>;
}

export class Meta {
  state: MetaState;

  constructor() {
    this.state = this.load();
  }

  private load(): MetaState {
    try {
      const raw = localStorage.getItem(CHAVE);
      if (raw) return JSON.parse(raw) as MetaState;
    } catch { /* estado novo */ }
    return { sucata: 0, emissores: ['mk1'], emissorAtivo: 'mk1', conquistas: {}, upgrades: {} };
  }

  save(): void {
    localStorage.setItem(CHAVE, JSON.stringify(this.state));
  }

  /** fichas excedentes viram Sucata ao fim da run (§3.4) */
  fimDeRun(run: Run): number {
    const ganho = run.fichas + 2 * (run.ante - 1) + (run.status === 'vitoria' ? 20 : 0);
    this.state.sucata += ganho;
    this.save();
    return ganho;
  }

  /** verifica conquistas após uma resolução/evento; retorna novas desbloqueadas */
  verificar(run: Run, res: Resolucao | null): Conquista[] {
    const novas: Conquista[] = [];
    const marca = (id: string, cond: boolean) => {
      if (cond && !this.state.conquistas[id]) {
        this.state.conquistas[id] = true;
        const c = CONQUISTAS.find((x) => x.id === id)!;
        this.state.sucata += c.sucata;
        novas.push(c);
      }
    };
    const venceuRodada = res !== null && res.score >= run.meta;
    marca('primeira_cascata', venceuRodada);
    marca('ante3', run.ante >= 3);
    marca('ante5', run.ante >= 5);
    marca('primeira_vitoria', run.status === 'vitoria');
    marca('cadeia_10', run.stats.maxCadeia >= 10);
    marca('cadeia_16', run.stats.maxCadeia >= 16);
    marca('overflow', res !== null && res.score >= 3 * run.meta && venceuRodada);
    marca('milhar', run.stats.melhorScore >= 1000);
    marca('dezena_milhar', run.stats.melhorScore >= 10000);
    marca('economista', run.fichas >= 25);
    marca('colecionador', run.relics.length >= 5);
    marca('lendario', run.grid.some((p) => p !== null && ['fantasma', 'eco', 'nucleo', 'singularidade', 'reator', 'midas'].includes(p.id)));
    marca('minimalista', venceuRodada && run.grid.filter(Boolean).length <= 5);
    marca('eco_total', res !== null && res.disparos >= 25);
    marca('boss_perfeito', venceuRodada && run.rodada === 3 && res !== null && res.score >= 3 * run.meta);
    if (novas.length) this.save();
    return novas;
  }

  comprarEmissor(id: string, custo: number): boolean {
    if (this.state.emissores.includes(id) || this.state.sucata < custo) return false;
    this.state.sucata -= custo;
    this.state.emissores.push(id);
    this.save();
    return true;
  }

  comprarUpgrade(id: string): boolean {
    const u = UPGRADES.find((x) => x.id === id);
    if (!u || this.state.upgrades[id] || this.state.sucata < u.custo) return false;
    this.state.sucata -= u.custo;
    this.state.upgrades[id] = true;
    this.save();
    return true;
  }

  // ---- save de run em andamento (§10) ----
  salvarRun(run: Run): void {
    try {
      localStorage.setItem(CHAVE_RUN, JSON.stringify(run.serialize()));
    } catch { /* storage cheio: segue sem save */ }
  }

  cargarRunSalva(): Record<string, unknown> | null {
    try {
      const raw = localStorage.getItem(CHAVE_RUN);
      return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  limparRunSalva(): void {
    localStorage.removeItem(CHAVE_RUN);
  }

  // ---- prefs (velocidade F10, som, hints) ----
  prefs(): { vel: number; mudo: boolean; hints: number } {
    try {
      const raw = localStorage.getItem(CHAVE_PREFS);
      if (raw) return JSON.parse(raw) as { vel: number; mudo: boolean; hints: number };
    } catch { /* default */ }
    return { vel: 1, mudo: false, hints: 0 };
  }

  salvarPrefs(p: { vel: number; mudo: boolean; hints: number }): void {
    localStorage.setItem(CHAVE_PREFS, JSON.stringify(p));
  }
}
