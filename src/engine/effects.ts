/** Purpose: helpers de efeito usados pelos símbolos (pontos/mult/fichas com potência e relíquias) e combinadores de emissão | Exports: addPontos, addMult, mulMult, addFichas, em* | Dependencies: types, dirs */
import type { Dir } from './dirs';
import { rot } from './dirs';
import type { EmitOut, TriggerCtx } from './types';

export const MIDAS_CAP = 8;

/** pontos de disparo: base × potência (bônus de papel é aplicado pelo resolve) */
export function addPontos(ctx: TriggerCtx, base: number): void {
  ctx.res.pontos += base * ctx.potencia;
}

function midasHook(ctx: TriggerCtx): void {
  // efeito global do lendário midas: aumentos de mult geram fichas (cap por resolução)
  if (ctx.res.midasFichas < MIDAS_CAP && gridHasMidas(ctx)) {
    ctx.res.midasFichas += 1;
    ctx.res.fichas += 1;
  }
}

function gridHasMidas(ctx: TriggerCtx): boolean {
  for (const p of ctx.run.grid) if (p && p.id === 'midas') return true;
  return false;
}

export function addMult(ctx: TriggerCtx, n: number): void {
  ctx.res.mult += n;
  midasHook(ctx);
}

export function mulMult(ctx: TriggerCtx, f: number): void {
  ctx.res.mult *= f;
  midasHook(ctx);
}

export function addFichas(ctx: TriggerCtx, n: number): void {
  ctx.res.fichas += n;
}

// ---- combinadores de emissão (relativos à direção de entrada, D2) ----

export const emFrente = (d: Dir): EmitOut[] => [{ dir: d }];
export const emNada = (): EmitOut[] => [];
/** duplica para as 2 diagonais frontais */
export const emDiag2 = (d: Dir): EmitOut[] => [{ dir: rot(d, -1) }, { dir: rot(d, 1) }];
/** tridente: frontal + 2 diagonais frontais */
export const emTridente = (d: Dir): EmitOut[] => [{ dir: d }, { dir: rot(d, -1) }, { dir: rot(d, 1) }];
export const emViraD = (d: Dir): EmitOut[] => [{ dir: rot(d, 2) }];
export const emViraE = (d: Dir): EmitOut[] => [{ dir: rot(d, -2) }];
export const emVolta = (d: Dir): EmitOut[] => [{ dir: rot(d, 4) }];
export const emDiagFrontalD = (d: Dir): EmitOut[] => [{ dir: rot(d, 1) }];
export const emDiagFrontalE = (d: Dir): EmitOut[] => [{ dir: rot(d, -1) }];
/** direções absolutas */
export const emAbs = (...dirs: Dir[]): EmitOut[] => dirs.map((dir) => ({ dir }));
