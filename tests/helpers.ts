/** Purpose: helpers de teste — monta RunView a partir de coordenadas | Exports: rv, at */
import '../src/engine/content';
import { cellIdx, N_CELLS } from '../src/engine/dirs';
import type { PlacedSymbol, RunView } from '../src/engine/types';

export interface TestView extends RunView {
  grid: (PlacedSymbol | null)[];
  fichas: number;
  relics: string[];
}

/** rv([[x, y, 'faisca'], ...]) — emissor padrão entra em (0,1) indo para a direita */
export function rv(entries: [number, number, string][], fichas = 0): TestView {
  const grid: (PlacedSymbol | null)[] = new Array(N_CELLS).fill(null);
  for (const [x, y, id] of entries) grid[cellIdx(x, y)] = { id, mem: 0 };
  return { grid, fichas, relics: [] };
}

export const at = cellIdx;
