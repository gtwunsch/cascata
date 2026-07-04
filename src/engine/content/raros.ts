/** Purpose: 12 símbolos raros | Exports: (registra no registry) | Dependencies: effects, registry */
import { addFichas, addMult, addPontos, emDiag2, emNada, emTridente, mulMult } from '../effects';
import { registerSymbol } from '../registry';
import { PAPEIS } from '../types';
import type { SymbolDef } from '../types';

const defs: SymbolDef[] = [
  // ---- GERADORES (3) ----
  {
    id: 'estrela', nome: 'Estrela', raridade: 'raro', custo: 10, papel: 'gerador',
    desc: '+20 pontos. Triplica o pulso (frontal e diagonais), cada um com 80% da potência.',
    onTrigger: (c) => addPontos(c, 20),
    emitir: (d) => emTridente(d).map((o) => ({ ...o, potenciaMul: 0.8 })),
  },
  {
    id: 'fenda', nome: 'Fenda', raridade: 'raro', custo: 8, papel: 'gerador',
    desc: '+34 pontos, mas o pulso sai com 60% da potência.',
    onTrigger: (c) => addPontos(c, 34),
    emitir: (d) => [{ dir: d, potenciaMul: 0.6 }],
  },
  {
    id: 'colosso', nome: 'Colosso', raridade: 'raro', custo: 9, papel: 'gerador',
    desc: '+45 pontos. Termina o ramo.',
    onTrigger: (c) => addPontos(c, 45),
    emitir: emNada,
  },

  // ---- CONDUTORES (2) ----
  {
    id: 'hidra', nome: 'Hidra', raridade: 'raro', custo: 10, papel: 'condutor',
    desc: 'Duplica para as 2 diagonais frontais, cada pulso com potência ×1.35.',
    emitir: (d) => emDiag2(d).map((o) => ({ ...o, potenciaMul: 1.35 })),
  },
  {
    id: 'portal', nome: 'Portal', raridade: 'raro', custo: 9, papel: 'condutor',
    desc: '+8 pontos. Reinjeta o pulso no Emissor, mantendo a cadeia.',
    onTrigger: (c) => addPontos(c, 8),
    emitir: () => [{ dir: 0, reinjetar: true }],
  },

  // ---- AMPLIFICADORES (3) ----
  {
    id: 'quadratico', nome: 'Quadrático', raridade: 'raro', custo: 11, papel: 'amplificador',
    desc: 'Mult ×1.4.',
    onTrigger: (c) => mulMult(c, 1.4),
  },
  {
    id: 'octava', nome: 'Octava', raridade: 'raro', custo: 11, papel: 'amplificador',
    desc: 'Mult ×1.25. Duplica para as diagonais frontais, cada pulso com 85% da potência.',
    onTrigger: (c) => mulMult(c, 1.25),
    emitir: (d) => emDiag2(d).map((o) => ({ ...o, potenciaMul: 0.85 })),
  },
  {
    id: 'gravitacional', nome: 'Lente Gravitacional', raridade: 'raro', custo: 10, papel: 'amplificador',
    desc: 'Mult +0.4 por Gerador já disparado nesta cascata.',
    onTrigger: (c) => addMult(c, 0.4 * c.res.disparosPorPapel.gerador),
  },

  // ---- GATILHOS (3) ----
  {
    id: 'detonador', nome: 'Detonador', raridade: 'raro', custo: 10, papel: 'gatilho',
    desc: 'Se este é o 7º elo ou além: mult ×1.5.',
    onTrigger: (c) => {
      if (c.depth >= 7) mulMult(c, 1.5);
    },
  },
  {
    id: 'simbiose', nome: 'Simbiose', raridade: 'raro', custo: 9, papel: 'gatilho',
    desc: '+10 pontos por papel distinto já disparado nesta cascata.',
    onTrigger: (c) => {
      let n = 0;
      for (const papel of PAPEIS) if (c.res.disparosPorPapel[papel] > 0) n++;
      addPontos(c, 10 * n);
    },
  },
  {
    id: 'avalanche', nome: 'Avalanche', raridade: 'raro', custo: 10, papel: 'gatilho',
    desc: 'Se já houve 9+ disparos nesta cascata: +60 pontos e mult +0.5.',
    onTrigger: (c) => {
      if (c.res.disparos >= 9) {
        addPontos(c, 60);
        addMult(c, 0.5);
      }
    },
  },

  // ---- ECONÔMICOS (1) ----
  {
    id: 'tesouro', nome: 'Tesouro', raridade: 'raro', custo: 8, papel: 'economico',
    desc: '+3 fichas. Termina o ramo.',
    onTrigger: (c) => addFichas(c, 3),
    emitir: emNada,
  },
];

for (const d of defs) registerSymbol(d);
