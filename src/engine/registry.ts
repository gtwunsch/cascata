/** Purpose: registro global de definições de símbolos (evita import circular content↔resolve) | Exports: registerSymbol, getSymbol, allSymbols */
import type { SymbolDef } from './types';

const SYMBOLS = new Map<string, SymbolDef>();

export function registerSymbol(def: SymbolDef): SymbolDef {
  if (SYMBOLS.has(def.id)) throw new Error(`símbolo duplicado: ${def.id}`);
  if (def.desc.length > 140) throw new Error(`desc > 140 chars: ${def.id}`);
  SYMBOLS.set(def.id, def);
  return def;
}

export function getSymbol(id: string): SymbolDef {
  const def = SYMBOLS.get(id);
  if (!def) throw new Error(`símbolo desconhecido: ${id}`);
  return def;
}

export function hasSymbol(id: string): boolean {
  return SYMBOLS.has(id);
}

export function allSymbols(): SymbolDef[] {
  return [...SYMBOLS.values()];
}
