/** Purpose: 6 símbolos lendários — cada um quebra 1 regra estrutural (§4.2, D12) | Exports: (registra no registry) | Dependencies: effects, registry */
import { addPontos, emAbs, mulMult } from '../effects';
import { registerSymbol } from '../registry';
import { DIR_D, DIR_L, DIR_R, DIR_U } from '../dirs';
import type { SymbolDef } from '../types';

const defs: SymbolDef[] = [
  {
    id: 'fantasma', nome: 'Fantasma', raridade: 'lendario', custo: 15, papel: 'condutor',
    desc: '+5 pontos. Enquanto na grade: pulsos atravessam células vazias.',
    global: { ghost: true },
    onTrigger: (c) => addPontos(c, 5),
  },
  {
    id: 'eco', nome: 'Eco', raridade: 'lendario', custo: 17, papel: 'gatilho',
    desc: '+10 pontos. Enquanto na grade: cada símbolo pode disparar 2× por cascata.',
    global: { maxFires: 2 },
    onTrigger: (c) => addPontos(c, 10),
  },
  {
    id: 'nucleo', nome: 'Núcleo Duplo', raridade: 'lendario', custo: 16, papel: 'condutor',
    desc: '+5 pontos. Enquanto na grade: o Emissor dispara um 2º pulso na fileira oposta.',
    global: { emissorEspelhado: true },
    onTrigger: (c) => addPontos(c, 5),
  },
  {
    id: 'singularidade', nome: 'Singularidade', raridade: 'lendario', custo: 18, papel: 'amplificador',
    desc: 'Mult ×3.',
    onTrigger: (c) => mulMult(c, 3),
  },
  {
    id: 'reator', nome: 'Reator', raridade: 'lendario', custo: 16, papel: 'gerador',
    desc: '+8 pontos, +1 por ficha guardada. Emite nas 4 direções ortogonais.',
    onTrigger: (c) => addPontos(c, 8 + c.run.fichas),
    emitir: () => emAbs(DIR_R, DIR_D, DIR_L, DIR_U),
  },
  {
    id: 'midas', nome: 'Midas', raridade: 'lendario', custo: 15, papel: 'economico',
    desc: '+5 pontos. Enquanto na grade: cada aumento de mult dá +1 ficha (máx. 8/cascata).',
    global: { midas: true },
    onTrigger: (c) => addPontos(c, 5),
  },
];

for (const d of defs) registerSymbol(d);
