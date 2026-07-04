/** Purpose: 18 símbolos incomuns | Exports: (registra no registry) | Dependencies: effects, registry */
import { addFichas, addMult, addPontos, emAbs, emDiag2, emTridente } from '../effects';
import { registerSymbol } from '../registry';
import { DIR_D, DIR_U } from '../dirs';
import type { SymbolDef } from '../types';

const defs: SymbolDef[] = [
  // ---- GERADORES (5) ----
  {
    id: 'gemeo', nome: 'Gêmeo', raridade: 'incomum', custo: 6, papel: 'gerador',
    desc: '+14 pontos. Duplica para as diagonais frontais, cada pulso com 85% da potência.',
    onTrigger: (c) => addPontos(c, 14),
    emitir: (d) => emDiag2(d).map((o) => ({ ...o, potenciaMul: 0.85 })),
  },
  {
    id: 'forja', nome: 'Forja', raridade: 'incomum', custo: 6, papel: 'gerador',
    desc: '+10 pontos, +7 por Amplificador já disparado nesta cascata.',
    onTrigger: (c) => addPontos(c, 10 + 7 * c.res.disparosPorPapel.amplificador),
  },
  {
    id: 'cristal', nome: 'Cristal', raridade: 'incomum', custo: 6, papel: 'gerador',
    desc: '+8 pontos. Potência do pulso +0.5.',
    onTrigger: (c) => addPontos(c, 8),
    emitir: (d) => [{ dir: d, potenciaAdd: 0.5 }],
  },
  {
    id: 'usina', nome: 'Usina', raridade: 'incomum', custo: 7, papel: 'gerador',
    desc: '+28 pontos. Só dispara do 4º elo em diante (antes, o pulso atravessa).',
    podeDisparar: (c) => c.depth >= 4,
    onTrigger: (c) => addPontos(c, 28),
  },
  {
    id: 'geiser', nome: 'Gêiser', raridade: 'incomum', custo: 5, papel: 'gerador',
    desc: '+9 pontos. Emite para cima e para baixo, cada um com 80% da potência.',
    onTrigger: (c) => addPontos(c, 9),
    emitir: () => emAbs(DIR_U, DIR_D).map((o) => ({ ...o, potenciaMul: 0.8 })),
  },

  // ---- CONDUTORES (4) ----
  {
    id: 'prisma', nome: 'Prisma', raridade: 'incomum', custo: 5, papel: 'condutor',
    tags: ['multiplicador_de_fluxo'],
    desc: '+15 pontos. Duplica o pulso para as 2 diagonais frontais.',
    onTrigger: (c) => addPontos(c, 15),
    emitir: emDiag2,
  },
  {
    id: 'trifurcador', nome: 'Trifurcador', raridade: 'incomum', custo: 7, papel: 'condutor',
    desc: 'Triplica o pulso: frontal e diagonais frontais, cada um com 75% da potência.',
    emitir: (d) => emTridente(d).map((o) => ({ ...o, potenciaMul: 0.75 })),
  },
  {
    id: 'divisor', nome: 'Divisor', raridade: 'incomum', custo: 6, papel: 'condutor',
    desc: '+4 pontos. Duplica para as diagonais frontais, cada pulso com 80% da potência.',
    onTrigger: (c) => addPontos(c, 4),
    emitir: (d) => emDiag2(d).map((o) => ({ ...o, potenciaMul: 0.8 })),
  },
  {
    id: 'funil', nome: 'Funil', raridade: 'incomum', custo: 5, papel: 'condutor',
    desc: '+4 pontos, +1 por elo já percorrido. Vira o pulso rumo ao centro da grade.',
    onTrigger: (c) => addPontos(c, 4 + (c.depth - 1)),
    emitir: (_d, c) => [{ dir: Math.floor(c.cell / 5) <= 1 ? 2 : 6 }],
  },

  // ---- AMPLIFICADORES (4) ----
  {
    id: 'duplicador', nome: 'Duplicador', raridade: 'incomum', custo: 6, papel: 'amplificador',
    desc: 'Mult +0.5; +1.2 no total se este é o 5º elo ou além.',
    onTrigger: (c) => addMult(c, c.depth >= 5 ? 1.2 : 0.5),
  },
  {
    id: 'ressonador', nome: 'Ressonador', raridade: 'incomum', custo: 6, papel: 'amplificador',
    desc: 'Mult +0.25 por Condutor já disparado nesta cascata.',
    onTrigger: (c) => addMult(c, 0.25 * c.res.disparosPorPapel.condutor),
  },
  {
    id: 'polaridade', nome: 'Polaridade', raridade: 'incomum', custo: 7, papel: 'amplificador',
    desc: 'Mult +1.0, mas o pulso sai com 60% da potência.',
    onTrigger: (c) => addMult(c, 1.0),
    emitir: (d) => [{ dir: d, potenciaMul: 0.6 }],
  },
  {
    id: 'amplivela', nome: 'Amplivela', raridade: 'incomum', custo: 6, papel: 'amplificador',
    desc: 'Mult +0.2. Cada disparo aumenta seu bônus em +0.1, para sempre.',
    onTrigger: (c) => {
      addMult(c, 0.2 + 0.1 * c.mem());
      c.bumpMem(1);
    },
  },

  // ---- GATILHOS (3) ----
  {
    id: 'rele', nome: 'Relé', raridade: 'incomum', custo: 6, papel: 'gatilho',
    desc: 'Se 3+ Geradores já dispararam nesta cascata: mult +0.8.',
    onTrigger: (c) => {
      if (c.res.disparosPorPapel.gerador >= 3) addMult(c, 0.8);
    },
  },
  {
    id: 'disjuntor', nome: 'Disjuntor', raridade: 'incomum', custo: 6, papel: 'gatilho',
    desc: 'Se a potência do pulso é 2 ou mais: +30 pontos.',
    onTrigger: (c) => {
      if (c.potencia >= 2) addPontos(c, 30);
    },
  },
  {
    id: 'cronometro', nome: 'Cronômetro', raridade: 'incomum', custo: 5, papel: 'gatilho',
    desc: '+4 pontos. Em elos pares, duplica para as diagonais frontais (80% da potência).',
    onTrigger: (c) => addPontos(c, 4),
    emitir: (d, c) => (c.depth % 2 === 0 ? emDiag2(d).map((o) => ({ ...o, potenciaMul: 0.8 })) : [{ dir: d }]),
  },

  // ---- ECONÔMICOS (2) ----
  {
    id: 'banqueiro', nome: 'Banqueiro', raridade: 'incomum', custo: 6, papel: 'economico',
    desc: '+4 pontos. +1 ficha por 2 Amplificadores disparados nesta cascata (máx. 3).',
    onTrigger: (c) => {
      addPontos(c, 4);
      addFichas(c, Math.min(3, Math.floor(c.res.disparosPorPapel.amplificador / 2)));
    },
  },
  {
    id: 'cupom_vivo', nome: 'Cupom Vivo', raridade: 'incomum', custo: 5, papel: 'economico',
    desc: '+6 pontos. O próximo reroll da loja é grátis.',
    onTrigger: (c) => {
      addPontos(c, 6);
      c.res.rerollGratis = true;
    },
  },
];

for (const d of defs) registerSymbol(d);
