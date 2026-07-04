/** Purpose: Emissores — equivalente aos decks do Balatro (§3.4) | Exports: EMITTERS, emitterById */
import type { EmitterDef } from '../types';

export const EMITTERS: readonly EmitterDef[] = [
  {
    id: 'mk1', nome: 'Emissor MK-1', custoSucata: 0,
    desc: 'O padrão de fábrica. Equilibrado.',
    fichasIniciais: 10, maoInicial: ['ger_comum', 'ger_comum', 'cond_comum'], placementsBase: 3, rows: [1],
  },
  {
    id: 'mk2', nome: 'Emissor MK-2', custoSucata: 40,
    desc: '+1 posicionamento por rodada, mas começa com 3 fichas.',
    fichasIniciais: 3, maoInicial: ['ger_comum', 'ger_comum', 'cond_comum'], placementsBase: 4, rows: [1],
  },
  {
    id: 'gemeo_e', nome: 'Emissor Gêmeo', custoSucata: 80,
    desc: 'Emite 2 pulsos: fileiras 2 e 3. Mão inicial menor.',
    fichasIniciais: 6, maoInicial: ['ger_comum', 'cond_comum'], placementsBase: 3, rows: [1, 2],
  },
  {
    id: 'poupador', nome: 'Emissor Poupador', custoSucata: 60,
    desc: 'Começa com 12 fichas e mão vazia.',
    fichasIniciais: 12, maoInicial: [], placementsBase: 3, rows: [1],
  },
  {
    id: 'sortudo', nome: 'Emissor Sortudo', custoSucata: 60,
    desc: 'A loja oferece 4 símbolos, mas rerolls custam +1.',
    fichasIniciais: 6, maoInicial: ['ger_comum', 'ger_comum', 'cond_comum'], placementsBase: 3, rows: [1], lojaExtra: true,
  },
];

export function emitterById(id: string): EmitterDef {
  const e = EMITTERS.find((x) => x.id === id);
  if (!e) throw new Error(`emissor desconhecido: ${id}`);
  return e;
}
