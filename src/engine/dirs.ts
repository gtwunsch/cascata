/** Purpose: bússola de 8 direções e helpers de rotação (D2) | Exports: Dir, DX, DY, rot, GRID_W, GRID_H, cellIdx, inBounds */

/** 0=R, 1=DR, 2=D, 3=DL, 4=L, 5=UL, 6=U, 7=UR (horário a partir da direita) */
export type Dir = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const DIR_R = 0 as Dir;
export const DIR_DR = 1 as Dir;
export const DIR_D = 2 as Dir;
export const DIR_DL = 3 as Dir;
export const DIR_L = 4 as Dir;
export const DIR_UL = 5 as Dir;
export const DIR_U = 6 as Dir;
export const DIR_UR = 7 as Dir;

export const DX: readonly number[] = [1, 1, 0, -1, -1, -1, 0, 1];
export const DY: readonly number[] = [0, 1, 1, 1, 0, -1, -1, -1];

/** rotação em passos de 45°; k>0 = horário */
export function rot(d: Dir, k: number): Dir {
  return (((d + k) % 8) + 8) % 8 as Dir;
}

export const GRID_W = 5;
export const GRID_H = 4;
export const N_CELLS = GRID_W * GRID_H;

export function cellIdx(x: number, y: number): number {
  return y * GRID_W + x;
}

export function cellX(idx: number): number {
  return idx % GRID_W;
}

export function cellY(idx: number): number {
  return Math.floor(idx / GRID_W);
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < GRID_W && y >= 0 && y < GRID_H;
}
