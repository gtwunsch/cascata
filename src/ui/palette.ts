/** Purpose: cor como linguagem estrita (§7, F11) — nenhuma cor fora da sua categoria | Exports: COR */
export const COR = {
  fundo: '#0a0e14',
  fundoChefe: '#160a18',
  painel: '#121a26',
  grade: '#1c2736',
  texto: '#9db2c7',
  textoForte: '#e8f0f8',
  pontos: '#ffb230', // âmbar
  mult: '#ff4d4d', // vermelho
  fichas: '#c8cf6a', // dourado-esverdeado
  pulso: '#37e0e8', // ciano
  perigo: '#e84cd7', // magenta (chefe)
  papel: {
    gerador: '#ffb230',
    condutor: '#37e0e8',
    amplificador: '#ff4d4d',
    gatilho: '#b08cff',
    economico: '#c8cf6a',
  } as Record<string, string>,
  raridade: {
    comum: '#4a5a6e',
    incomum: '#3f7fae',
    raro: '#8a5fd6',
    lendario: '#d4a017',
  } as Record<string, string>,
};
