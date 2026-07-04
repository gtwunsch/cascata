/** Purpose: 24 símbolos comuns | Exports: (registra no registry) | Dependencies: effects, registry */
import { addFichas, addMult, addPontos, emDiag2, emDiagFrontalD, emDiagFrontalE, emNada, emViraD, emViraE, emVolta } from '../effects';
import { registerSymbol } from '../registry';
import type { SymbolDef } from '../types';

const defs: SymbolDef[] = [
  // ---- GERADORES (9) ----
  {
    id: 'faisca', nome: 'Faísca', raridade: 'comum', custo: 3, papel: 'gerador',
    desc: '+6 pontos.',
    onTrigger: (c) => addPontos(c, 6),
  },
  {
    id: 'celula', nome: 'Célula', raridade: 'comum', custo: 4, papel: 'gerador',
    desc: '+10 pontos.',
    onTrigger: (c) => addPontos(c, 10),
  },
  {
    id: 'dinamo', nome: 'Dínamo', raridade: 'comum', custo: 3, papel: 'gerador',
    desc: '+8 pontos. Emite na diagonal frontal direita.',
    onTrigger: (c) => addPontos(c, 8),
    emitir: emDiagFrontalD,
  },
  {
    id: 'bobina', nome: 'Bobina', raridade: 'comum', custo: 3, papel: 'gerador',
    desc: '+8 pontos. Emite na diagonal frontal esquerda.',
    onTrigger: (c) => addPontos(c, 8),
    emitir: emDiagFrontalE,
  },
  {
    id: 'resistor', nome: 'Resistor', raridade: 'comum', custo: 4, papel: 'gerador',
    desc: '+14 pontos, mas o pulso sai com 80% da potência.',
    onTrigger: (c) => addPontos(c, 14),
    emitir: (d) => [{ dir: d, potenciaMul: 0.8 }],
  },
  {
    id: 'vela', nome: 'Vela', raridade: 'comum', custo: 4, papel: 'gerador',
    desc: '+5 pontos, +2 por elo já percorrido pela cadeia.',
    onTrigger: (c) => addPontos(c, 5 + 2 * (c.depth - 1)),
  },
  {
    id: 'capacitor', nome: 'Capacitor', raridade: 'comum', custo: 4, papel: 'gerador',
    desc: '+18 pontos. Termina o ramo.',
    onTrigger: (c) => addPontos(c, 18),
    emitir: emNada,
  },
  {
    id: 'agulha', nome: 'Agulha', raridade: 'comum', custo: 4, papel: 'gerador',
    desc: '+9 pontos.',
    onTrigger: (c) => addPontos(c, 9),
  },
  {
    id: 'brasa', nome: 'Brasa', raridade: 'comum', custo: 4, papel: 'gerador',
    desc: '+5 pontos. Cada disparo aumenta sua base em +1, para sempre.',
    onTrigger: (c) => {
      addPontos(c, 5 + c.mem());
      c.bumpMem(1);
    },
  },

  // ---- CONDUTORES (7) ----
  {
    id: 'cano', nome: 'Cano', raridade: 'comum', custo: 3, papel: 'condutor',
    desc: '+2 pontos. Continua reto.',
    onTrigger: (c) => addPontos(c, 2),
  },
  {
    id: 'cotovelo_d', nome: 'Cotovelo ⤵', raridade: 'comum', custo: 3, papel: 'condutor',
    desc: '+2 pontos. Vira 90° no sentido horário.',
    onTrigger: (c) => addPontos(c, 2),
    emitir: emViraD,
  },
  {
    id: 'cotovelo_e', nome: 'Cotovelo ⤴', raridade: 'comum', custo: 3, papel: 'condutor',
    desc: '+2 pontos. Vira 90° no sentido anti-horário.',
    onTrigger: (c) => addPontos(c, 2),
    emitir: emViraE,
  },
  {
    id: 'divisor', nome: 'Divisor', raridade: 'comum', custo: 4, papel: 'condutor',
    desc: 'Duplica o pulso para as 2 diagonais frontais.',
    emitir: emDiag2,
  },
  {
    id: 'espelho_c', nome: 'Espelho', raridade: 'comum', custo: 3, papel: 'condutor',
    desc: '+2 pontos. Reflete o pulso de volta.',
    onTrigger: (c) => addPontos(c, 2),
    emitir: emVolta,
  },
  {
    id: 'trilho', nome: 'Trilho', raridade: 'comum', custo: 4, papel: 'condutor',
    desc: '+2 pontos. Potência do pulso +0.3.',
    onTrigger: (c) => addPontos(c, 2),
    emitir: (d) => [{ dir: d, potenciaAdd: 0.3 }],
  },
  {
    id: 'funil', nome: 'Funil', raridade: 'comum', custo: 3, papel: 'condutor',
    desc: '+4 pontos. Vira o pulso rumo ao centro da grade.',
    onTrigger: (c) => addPontos(c, 4),
    emitir: (_d, c) => [{ dir: Math.floor(c.cell / 5) <= 1 ? 2 : 6 }],
  },

  // ---- AMPLIFICADORES (4) ----
  {
    id: 'lente_x', nome: 'Lente', raridade: 'comum', custo: 4, papel: 'amplificador',
    desc: 'Mult +0.5.',
    onTrigger: (c) => addMult(c, 0.5),
  },
  {
    id: 'foco', nome: 'Foco', raridade: 'comum', custo: 3, papel: 'amplificador',
    desc: 'Mult +0.3. Potência do pulso +0.2.',
    onTrigger: (c) => addMult(c, 0.3),
    emitir: (d) => [{ dir: d, potenciaAdd: 0.2 }],
  },
  {
    id: 'espiral', nome: 'Espiral', raridade: 'comum', custo: 4, papel: 'amplificador',
    desc: 'Mult +0.4. Emite na diagonal frontal direita.',
    onTrigger: (c) => addMult(c, 0.4),
    emitir: emDiagFrontalD,
  },
  {
    id: 'contrapeso', nome: 'Contrapeso', raridade: 'comum', custo: 4, papel: 'amplificador',
    desc: 'Mult +0.8. Termina o ramo.',
    onTrigger: (c) => addMult(c, 0.8),
    emitir: emNada,
  },

  // ---- GATILHOS (2) ----
  {
    id: 'sensor', nome: 'Sensor', raridade: 'comum', custo: 3, papel: 'gatilho',
    desc: 'Se este é o 5º elo ou além: +20 pontos.',
    onTrigger: (c) => {
      if (c.depth >= 5) addPontos(c, 20);
    },
  },
  {
    id: 'valvula', nome: 'Válvula', raridade: 'comum', custo: 3, papel: 'gatilho',
    desc: 'Se o mult atual é 2 ou mais: +15 pontos.',
    onTrigger: (c) => {
      if (c.res.mult >= 2) addPontos(c, 15);
    },
  },

  // ---- ECONÔMICOS (2) ----
  {
    id: 'moeda', nome: 'Moeda', raridade: 'comum', custo: 3, papel: 'economico',
    desc: '+2 pontos. +1 ficha.',
    onTrigger: (c) => {
      addPontos(c, 2);
      addFichas(c, 1);
    },
  },
  {
    id: 'cofrinho', nome: 'Cofrinho', raridade: 'comum', custo: 4, papel: 'economico',
    desc: '+2 pontos. Se este é o 4º elo ou além: +1 ficha.',
    onTrigger: (c) => {
      addPontos(c, 2);
      if (c.depth >= 4) addFichas(c, 1);
    },
  },
];

for (const d of defs) registerSymbol(d);
