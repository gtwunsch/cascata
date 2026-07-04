/** Purpose: 12 relíquias — modificadores passivos de run (D10) | Exports: RELICS, relicById */
import type { RelicDef } from '../types';

export const RELICS: readonly RelicDef[] = [
  { id: 'braco_extra', nome: 'Braço Extra', custo: 9, desc: '+1 posicionamento por rodada.' },
  { id: 'ima', nome: 'Ímã', custo: 6, desc: 'O teto de juros sobe de 5 para 8 fichas.' },
  { id: 'lente_polida', nome: 'Lente Polida', custo: 8, desc: 'Geradores dão +4 pontos ao disparar.' },
  { id: 'bateria', nome: 'Bateria', custo: 8, desc: 'O pulso inicial entra com potência +0.5.' },
  { id: 'estoque', nome: 'Estoque', custo: 6, desc: 'Sua mão comporta +3 símbolos.' },
  { id: 'cupom', nome: 'Cupom', custo: 6, desc: 'O 1º item comprado em cada loja custa 2 a menos.' },
  { id: 'reciclagem', nome: 'Reciclagem', custo: 7, desc: 'Remover símbolos da grade é sempre grátis.' },
  { id: 'turbina', nome: 'Turbina', custo: 8, desc: 'Condutores dão +3 pontos ao disparar.' },
  { id: 'metronomo', nome: 'Metrônomo', custo: 9, desc: 'Se a maior cadeia chegou a 8 elos: mult +1.5 no final.' },
  { id: 'cofre', nome: 'Cofre', custo: 7, desc: '+2 fichas por rodada vencida.' },
  { id: 'prisma_bruto', nome: 'Prisma Bruto', custo: 10, desc: 'Se a maior cadeia chegou a 10 elos: mult ×1.6 no final.' },
  { id: 'faro', nome: 'Faro', custo: 7, desc: 'A loja passa a oferecer 4 símbolos.' },
  { id: 'ressonancia', nome: 'Ressonância', custo: 10, desc: 'Condutores podem disparar 2× por cascata.' },
];

export function relicById(id: string): RelicDef {
  const r = RELICS.find((x) => x.id === id);
  if (!r) throw new Error(`relíquia desconhecida: ${id}`);
  return r;
}
