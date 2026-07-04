/** Purpose: 12 mutadores de chefe (§4.6) — cada um remove uma opção | Exports: MUTATORS, mutatorById */
import type { Mutator } from '../types';

export const MUTATORS: readonly Mutator[] = [
  { id: 'curto_circuito', nome: 'Curto-circuito', desc: 'Cadeias com mais de 7 elos param.', chainCap: 7 },
  { id: 'estatica', nome: 'Estática', desc: '3 células aleatórias estão bloqueadas.', blockedRandom: 3 },
  { id: 'imposto', nome: 'Imposto', desc: 'A loja seguinte não existe.', semLojaDepois: true },
  { id: 'espelho_m', nome: 'Espelho', desc: 'O Emissor muda para a borda direita.', emissorDireita: true },
  { id: 'neblina', nome: 'Neblina', desc: 'Símbolos da 3ª fileira não disparam.', disabledRow: 2 },
  { id: 'sobrecarga', nome: 'Sobrecarga', desc: 'O pulso inicial entra com 70% da potência.', potenciaInicial: 0.7 },
  { id: 'escassez', nome: 'Escassez', desc: '1 posicionamento a menos nesta rodada.', placementDelta: -1 },
  { id: 'pedagio', nome: 'Pedágio', desc: 'Esta rodada não paga fichas.', semFichas: true },
  { id: 'gelo', nome: 'Gelo', desc: 'As 2 colunas da direita não aceitam novos símbolos nesta rodada.', bloqueiaColunasDireita: true },
  { id: 'monotonia', nome: 'Monotonia', desc: 'Não repita papel nos posicionamentos desta rodada.', monotonia: true },
  { id: 'teto', nome: 'Teto', desc: 'O mult não passa de 4 nesta rodada.', tetoMult: 4 },
  { id: 'apagao', nome: 'Apagão', desc: 'O 1º elo da cascata não dispara.', apagao: true },
];

export function mutatorById(id: string): Mutator {
  const m = MUTATORS.find((x) => x.id === id);
  if (!m) throw new Error(`mutador desconhecido: ${id}`);
  return m;
}
