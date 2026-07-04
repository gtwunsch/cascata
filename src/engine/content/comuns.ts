/** Purpose: 24 símbolos comuns | Exports: (registra no registry) | Dependencies: effects, registry */
import { addFichas, addMult, addPontos, emAbs, emDiagFrontalD, emDiagFrontalE, emNada, emViraD, emViraE, emVolta } from '../effects';
import { DIR_D } from '../dirs';
import { registerSymbol } from '../registry';
import type { SymbolDef } from '../types';

const defs: SymbolDef[] = [
  // ---- GERADORES (9) ----
  {
    id: 'faisca', nome: 'Faísca', raridade: 'comum', custo: 3, papel: 'gerador',
    desc: '+8 pontos; +5 se a potência do pulso é 1.5 ou mais.',
    onTrigger: (c) => addPontos(c, c.potencia >= 1.5 ? 13 : 8),
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
    desc: '+9 pontos. Emite na diagonal frontal esquerda.',
    onTrigger: (c) => addPontos(c, 9),
    emitir: emDiagFrontalE,
  },
  {
    id: 'resistor', nome: 'Resistor', raridade: 'comum', custo: 4, papel: 'gerador',
    desc: '+16 pontos, mas o pulso sai com 85% da potência.',
    onTrigger: (c) => addPontos(c, 16),
    emitir: (d) => [{ dir: d, potenciaMul: 0.85 }],
  },
  {
    id: 'vela', nome: 'Vela', raridade: 'comum', custo: 4, papel: 'gerador',
    desc: '+4 pontos, +4 por elo já percorrido pela cadeia.',
    onTrigger: (c) => addPontos(c, 4 + 4 * (c.depth - 1)),
  },
  {
    id: 'capacitor', nome: 'Capacitor', raridade: 'comum', custo: 3, papel: 'gerador',
    desc: '+16 pontos, +2 por cascata em que já disparou. Termina o ramo.',
    onTrigger: (c) => {
      addPontos(c, 16 + 2 * c.mem());
      c.bumpMem(1);
    },
    emitir: emNada,
  },
  {
    id: 'agulha', nome: 'Agulha', raridade: 'comum', custo: 4, papel: 'gerador',
    desc: '+8 pontos. Emite para baixo.',
    onTrigger: (c) => addPontos(c, 8),
    emitir: () => emAbs(DIR_D),
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
    desc: '+4 pontos, +2 por elo já percorrido. Continua reto.',
    onTrigger: (c) => addPontos(c, 4 + 2 * (c.depth - 1)),
  },
  {
    id: 'cotovelo_d', nome: 'Cotovelo ⤵', raridade: 'comum', custo: 3, papel: 'condutor',
    desc: '+4 pontos, +1 por elo já percorrido. Vira 90° no sentido horário.',
    onTrigger: (c) => addPontos(c, 4 + (c.depth - 1)),
    emitir: emViraD,
  },
  {
    id: 'cotovelo_e', nome: 'Cotovelo ⤴', raridade: 'comum', custo: 3, papel: 'condutor',
    desc: '+5 pontos, +1 por elo já percorrido. Vira 90° no sentido anti-horário.',
    onTrigger: (c) => addPontos(c, 5 + (c.depth - 1)),
    emitir: emViraE,
  },
  {
    id: 'acelerador', nome: 'Acelerador', raridade: 'comum', custo: 4, papel: 'condutor',
    desc: 'Potência do pulso ×1.3.',
    emitir: (d) => [{ dir: d, potenciaMul: 1.3 }],
  },
  {
    id: 'espelho_c', nome: 'Espelho', raridade: 'comum', custo: 3, papel: 'condutor',
    desc: '+2 pontos, +2 por elo já percorrido. Reflete o pulso de volta.',
    onTrigger: (c) => addPontos(c, 2 + 2 * (c.depth - 1)),
    emitir: emVolta,
  },
  {
    id: 'trilho', nome: 'Trilho', raridade: 'comum', custo: 4, papel: 'condutor',
    desc: '+2 pontos, +2 por elo já percorrido. Potência do pulso +0.3.',
    onTrigger: (c) => addPontos(c, 2 + 2 * (c.depth - 1)),
    emitir: (d) => [{ dir: d, potenciaAdd: 0.3 }],
  },
  {
    id: 'ziguezague', nome: 'Ziguezague', raridade: 'comum', custo: 4, papel: 'condutor',
    desc: '+5 pontos, +2 por elo já percorrido. Alterna: vira à direita, depois à esquerda.',
    onTrigger: (c) => addPontos(c, 5 + 2 * (c.depth - 1)),
    emitir: (d, c) => {
      const out = c.mem() % 2 === 0 ? emViraD(d) : emViraE(d);
      c.bumpMem(1);
      return out;
    },
  },

  // ---- AMPLIFICADORES (4) ----
  {
    id: 'lente_x', nome: 'Lente', raridade: 'comum', custo: 4, papel: 'amplificador',
    desc: 'Mult +0.7.',
    onTrigger: (c) => addMult(c, 0.7),
  },
  {
    id: 'foco', nome: 'Foco', raridade: 'comum', custo: 3, papel: 'amplificador',
    desc: 'Mult +0.4. Potência do pulso +0.2.',
    onTrigger: (c) => addMult(c, 0.4),
    emitir: (d) => [{ dir: d, potenciaAdd: 0.2 }],
  },
  {
    id: 'espiral', nome: 'Espiral', raridade: 'comum', custo: 4, papel: 'amplificador',
    desc: 'Mult +0.6. Emite na diagonal frontal direita.',
    onTrigger: (c) => addMult(c, 0.6),
    emitir: emDiagFrontalD,
  },
  {
    id: 'contrapeso', nome: 'Contrapeso', raridade: 'comum', custo: 4, papel: 'amplificador',
    desc: 'Mult +0.9. Termina o ramo.',
    onTrigger: (c) => addMult(c, 0.9),
    emitir: emNada,
  },

  // ---- GATILHOS (2) ----
  {
    id: 'sensor', nome: 'Sensor', raridade: 'comum', custo: 3, papel: 'gatilho',
    desc: 'Se este é o 4º elo ou além: +22 pontos.',
    onTrigger: (c) => {
      if (c.depth >= 4) addPontos(c, 22);
    },
  },
  {
    id: 'valvula', nome: 'Válvula', raridade: 'comum', custo: 3, papel: 'gatilho',
    desc: 'Se o mult atual é 1.5 ou mais: +20 pontos.',
    onTrigger: (c) => {
      if (c.res.mult >= 1.5) addPontos(c, 20);
    },
  },

  // ---- ECONÔMICOS (2) ----
  {
    id: 'moeda', nome: 'Moeda', raridade: 'comum', custo: 3, papel: 'economico',
    desc: '+5 pontos. +1 ficha.',
    onTrigger: (c) => {
      addPontos(c, 5);
      addFichas(c, 1);
    },
  },
  {
    id: 'cofrinho', nome: 'Cofrinho', raridade: 'comum', custo: 4, papel: 'economico',
    desc: '+3 pontos. Se este é o 3º elo ou além: +1 ficha.',
    onTrigger: (c) => {
      addPontos(c, 3);
      if (c.depth >= 3) addFichas(c, 1);
    },
  },
];

for (const d of defs) registerSymbol(d);
