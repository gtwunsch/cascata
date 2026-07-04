/** Purpose: orquestrador da UI — 1 tela, loja como overlay, drag&drop, tooltips, fim de run (§3, §6, §7) | Exports: (bootstrap) | Dependencies: engine, ui/* */
import './engine/content';
import { allSymbols, getSymbol } from './engine/registry';
import { resolve } from './engine/resolve';
import { Run } from './engine/run';
import { randomSeedString } from './engine/rng';
import { EMITTERS, relicById, emitterById } from './engine/content';
import type { SymbolDef } from './engine/types';
import { COR } from './ui/palette';
import { Render } from './ui/render';
import { Animacao } from './ui/anim';
import { Som } from './ui/audio';
import { Meta, CONQUISTAS, UPGRADES } from './ui/meta';

const POOL = allSymbols().map((s) => s.id);
const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;

const metaP = new Meta();
const som = new Som();
const prefs = metaP.prefs();
som.mudo = prefs.mudo;
let vel = prefs.vel;

let run = restaurarOuNovaRun();
const render = new Render($<HTMLCanvasElement>('jogo'));
const anim = new Animacao(render, som, {
  atualizar: (p, m, s) => hudScore(p, m, s),
  banner: (t) => banner(t),
});
let ultimoPosicionado: number[] = [];
let simCache: { pontos: number; mult: number; score: number } | null = null;

function restaurarOuNovaRun(): Run {
  const salvo = metaP.cargarRunSalva();
  if (salvo) {
    try {
      const r = Run.deserialize(salvo);
      if (r.status === 'construindo' || r.status === 'loja') return r;
    } catch { /* save corrompido: nova run */ }
  }
  return novaRunInterna();
}

function bonusMeta(): { fichas?: number; mao?: number; rerollGratis?: boolean } {
  return {
    fichas: metaP.state.upgrades.fichas_extra ? 2 : 0,
    mao: metaP.state.upgrades.mao_extra ? 1 : 0,
    rerollGratis: !!metaP.state.upgrades.reroll_gratis,
  };
}

function novaRunInterna(seed?: string): Run {
  const s = seed && seed.trim() ? seed.trim().toUpperCase() : randomSeedString((Date.now() ^ (Math.random() * 1e9)) >>> 0);
  return new Run(s, { pool: POOL, emitterId: metaP.state.emissorAtivo, bonus: bonusMeta() });
}

// ---------- HUD ----------
function fmt(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e4) return `${(n / 1e3).toFixed(1)}k`;
  return String(Math.round(n));
}

function hudScore(pontos: number, mult: number, score: number): void {
  $('pontos').textContent = fmt(pontos);
  $('mult').textContent = mult.toFixed(mult >= 10 ? 0 : 1);
  $('score').textContent = fmt(score);
}

function atualizarHud(): void {
  if (!anim.rodando) {
    if (!simCache) {
      const r = run.simular();
      simCache = { pontos: r.pontos, mult: r.mult, score: r.score };
    }
    hudScore(simCache.pontos, simCache.mult, simCache.score);
  }
  $('meta').textContent = fmt(run.meta);
  $('fichas').textContent = `⬡ ${run.fichas}`;
  $('ante').textContent = `ANTE ${run.ante}·${run.rodada}${run.anteInfinito ? '∞' : ''}`;
  $('posicoes').textContent = '◆'.repeat(run.placementsLeft) + '◇'.repeat(Math.max(0, run.placementsBase() - run.placementsLeft));
  $('btn-desfazer').hidden = ultimoPosicionado.length === 0 || run.status !== 'construindo';
  ($('btn-resolver') as HTMLButtonElement).disabled = run.status !== 'construindo' || anim.rodando;
  const m = run.ehChefe && run.status === 'construindo' ? run.mutadorAtual : null;
  $('mutador').hidden = !m;
  if (m) $('mutador').textContent = `CHEFE — ${m.nome}: ${m.desc}`;
  document.body.classList.toggle('chefe', run.ehChefe && run.status === 'construindo');
  render.emissorDireita = !!(run.ehChefe && run.mutadorAtual?.emissorDireita);
  render.emissorRows = emitterById(run.emitterId).rows;
}

function sujo(): void {
  simCache = null;
  atualizarHud();
  renderMao();
  metaP.salvarRun(run);
}

function banner(texto: string): void {
  const b = $('banner');
  b.textContent = texto;
  b.hidden = false;
  b.style.animation = 'none';
  void b.offsetWidth;
  b.style.animation = '';
  setTimeout(() => (b.hidden = true), 800);
}

// ---------- mão + drag ----------
function chipHtml(def: SymbolDef): string {
  const cor = COR.papel[def.papel]!;
  const borda = COR.raridade[def.raridade]!;
  return `<div class="glifo" style="color:${cor}">${def.nome.replace(/[^A-Za-zÁ-ú⤴⤵]/g, '').slice(0, 2).toUpperCase()}</div><div class="nome">${def.nome}</div><div style="color:${borda};font-size:8px">${def.raridade}</div>`;
}

function renderMao(): void {
  const maoEl = $('mao');
  maoEl.innerHTML = '';
  run.mao.forEach((id, idx) => {
    const def = getSymbol(id);
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.style.borderColor = COR.raridade[def.raridade]!;
    chip.innerHTML = chipHtml(def);
    chip.addEventListener('pointerdown', (e) => iniciarDrag(e, idx, chip));
    ligaTooltip(chip, def);
    maoEl.appendChild(chip);
  });
}

let previewEl: HTMLElement | null = null;

function iniciarDrag(e: PointerEvent, maoIdx: number, chip: HTMLElement): void {
  if (run.status !== 'construindo' || anim.rodando) return;
  e.preventDefault();
  escondeTooltip();
  const ghost = chip.cloneNode(true) as HTMLElement;
  ghost.classList.add('ghost');
  ghost.style.width = '64px';
  document.body.appendChild(ghost);
  chip.classList.add('arrastando');
  if (!previewEl) {
    previewEl = document.createElement('div');
    previewEl.id = 'preview-delta';
    document.body.appendChild(previewEl);
  }
  const mover = (ev: PointerEvent) => {
    ghost.style.transform = `translate(${ev.clientX - 32}px, ${ev.clientY - 60}px)`;
    const cell = render.celulaNoPonto(ev.clientX, ev.clientY);
    const ok = cell >= 0 && run.podePosicionar(maoIdx, cell);
    render.celulaDestacada = ok ? cell : -1;
    if (ok && previewEl) {
      const { antes, depois } = run.previewPlacement(maoIdx, cell);
      const delta = depois - antes;
      previewEl.textContent = `${delta >= 0 ? '+' : ''}${fmt(delta)}`;
      previewEl.style.color = delta >= 0 ? COR.pontos : COR.mult;
      previewEl.style.left = `${ev.clientX + 14}px`;
      previewEl.style.top = `${ev.clientY - 30}px`;
      previewEl.hidden = false;
    } else if (previewEl) {
      previewEl.hidden = true;
    }
  };
  const soltar = (ev: PointerEvent) => {
    window.removeEventListener('pointermove', mover);
    window.removeEventListener('pointerup', soltar);
    ghost.remove();
    chip.classList.remove('arrastando');
    if (previewEl) previewEl.hidden = true;
    const cell = render.celulaDestacada;
    render.celulaDestacada = -1;
    if (cell >= 0 && run.posicionar(maoIdx, cell)) {
      ultimoPosicionado.push(cell);
      som.posiciona();
      sujo();
      mostrarHint(1);
    }
    void ev;
  };
  window.addEventListener('pointermove', mover);
  window.addEventListener('pointerup', soltar);
  mover(e);
}

// ---------- tooltip (≤100ms, §6) ----------
const tooltip = $('tooltip');
let tooltipTimer = 0;

function tooltipHtml(def: SymbolDef, extra = ''): string {
  return `<div class="tt-nome" style="color:${COR.papel[def.papel]}">${def.nome}</div>
    <div class="tt-extra">${def.papel} · ${def.raridade} · custo ${def.custo}</div>
    <div class="tt-desc">${def.desc}</div>${extra}`;
}

function mostraTooltipEm(x: number, y: number, html: string, interativo = false): void {
  tooltip.innerHTML = html;
  tooltip.hidden = false;
  tooltip.classList.toggle('interativo', interativo);
  const tw = tooltip.offsetWidth;
  tooltip.style.left = `${Math.min(window.innerWidth - tw - 8, Math.max(6, x - tw / 2))}px`;
  tooltip.style.top = `${Math.max(6, y - tooltip.offsetHeight - 12)}px`;
}

function ligaTooltip(el: HTMLElement, def: SymbolDef): void {
  el.addEventListener('pointerenter', (e) => {
    clearTimeout(tooltipTimer);
    tooltipTimer = window.setTimeout(() => {
      const r = el.getBoundingClientRect();
      mostraTooltipEm(r.left + r.width / 2, r.top, tooltipHtml(def));
      void e;
    }, 60);
  });
  el.addEventListener('pointerleave', () => {
    clearTimeout(tooltipTimer);
    escondeTooltip();
  });
}

function escondeTooltip(): void {
  tooltip.hidden = true;
}

// tooltip/remoção na grade
const canvas = $<HTMLCanvasElement>('jogo');
canvas.addEventListener('pointermove', (e) => {
  if (anim.rodando) return;
  const cell = render.celulaNoPonto(e.clientX, e.clientY);
  if (cell >= 0 && run.grid[cell]) {
    const def = getSymbol(run.grid[cell]!.id);
    const mem = run.grid[cell]!.mem;
    const pos = render.posicaoNaTela(cell);
    mostraTooltipEm(pos.x, pos.y - 30, tooltipHtml(def, mem > 0 ? `<div class="tt-extra">memória: +${mem}</div>` : ''));
  } else if (!tooltip.classList.contains('interativo')) {
    escondeTooltip();
  }
});
canvas.addEventListener('pointerleave', () => {
  if (!tooltip.classList.contains('interativo')) escondeTooltip();
});
canvas.addEventListener('pointerdown', (e) => {
  if (anim.rodando || run.status !== 'construindo') return;
  const cell = render.celulaNoPonto(e.clientX, e.clientY);
  if (cell < 0 || !run.grid[cell]) return;
  const def = getSymbol(run.grid[cell]!.id);
  const custo = run.custoRemocao();
  const pos = render.posicaoNaTela(cell);
  mostraTooltipEm(pos.x, pos.y - 30, tooltipHtml(def) + `<button id="tt-remover">REMOVER ${custo > 0 ? `(${custo}⬡)` : '(grátis)'}</button>`, true);
  document.getElementById('tt-remover')?.addEventListener('click', () => {
    if (run.remover(cell)) {
      som.clique();
      ultimoPosicionado = ultimoPosicionado.filter((c) => c !== cell);
      sujo();
    }
    escondeTooltip();
    tooltip.classList.remove('interativo');
  });
});

// ---------- RESOLVER ----------
$('btn-resolver').addEventListener('click', () => void resolverRodada());

async function resolverRodada(): Promise<void> {
  if (run.status !== 'construindo' || anim.rodando) return;
  escondeTooltip();
  mostrarHint(2);
  const mods = run.buildMods();
  mods.trace = true;
  const res = resolve(run, mods);
  const metaAlvo = run.meta;
  atualizarHud();
  await anim.play(res, metaAlvo, vel);
  run.resolver();
  ultimoPosicionado = [];
  const novas = metaP.verificar(run, res);
  for (const c of novas) setTimeout(() => banner(`⭐ ${c.nome}`), 300);
  const status = run.status as string;
  if (status === 'loja') {
    abrirLojaUI();
  } else if (status === 'derrota' || status === 'vitoria') {
    metaP.limparRunSalva();
    const ganho = metaP.fimDeRun(run);
    telaFim(res.score, ganho);
    if (status === 'derrota') som.derrota();
  }
  sujo();
}

$('btn-desfazer').addEventListener('click', () => {
  const cell = ultimoPosicionado.pop();
  if (cell !== undefined && run.desfazerPosicionamento(cell)) {
    som.clique();
    sujo();
  }
});

// ---------- loja ----------
function abrirLojaUI(): void {
  const el = $('loja');
  el.hidden = false;
  const cartasSimbolos = run.shop.symbols
    .map((id, i) => {
      const def = getSymbol(id);
      const preco = run.precoSimbolo(id);
      const pode = run.fichas >= preco && run.mao.length < run.maoCap();
      return `<div class="carta ${pode ? '' : 'esgotada'}" data-idx="${i}" data-id="${id}" style="border-color:${COR.raridade[def.raridade]}">${chipHtml(def)}<div class="preco">${preco}⬡</div></div>`;
    })
    .join('');
  const relic = run.shop.relic ? relicById(run.shop.relic) : null;
  const cartaRelic = relic
    ? `<div class="carta reliquia ${run.fichas >= relic.custo ? '' : 'esgotada'}" data-relic="1" style="border-color:${COR.fichas}"><div class="glifo" style="color:${COR.fichas}">✦</div><div class="nome">${relic.nome}</div><div style="font-size:9px">${relic.desc}</div><div class="preco">${relic.custo}⬡</div></div>`
    : '';
  el.innerHTML = `<div class="caixa"><h2>LOJA <span style="float:right;color:${COR.fichas}">⬡ ${run.fichas}</span></h2>
    <div class="loja-grade">${cartasSimbolos}${cartaRelic}</div>
    <div class="loja-acoes">
      <button id="btn-reroll">REROLL (${run.rerollCostAtual()}⬡)</button>
      <button id="btn-fechar-loja">PRÓXIMA RODADA →</button>
    </div></div>`;
  el.querySelectorAll<HTMLElement>('.carta[data-idx]').forEach((c) => {
    ligaTooltip(c, getSymbol(c.dataset.id!));
    c.addEventListener('click', () => {
      if (run.comprar(parseInt(c.dataset.idx!, 10))) {
        som.ficha();
        escondeTooltip();
        abrirLojaUI();
        sujo();
      }
    });
  });
  el.querySelector<HTMLElement>('.carta[data-relic]')?.addEventListener('click', () => {
    if (run.comprarRelic()) {
      som.ficha();
      abrirLojaUI();
      sujo();
    }
  });
  el.querySelector('#btn-reroll')?.addEventListener('click', () => {
    if (run.reroll()) {
      som.clique();
      abrirLojaUI();
      sujo();
    }
  });
  el.querySelector('#btn-fechar-loja')?.addEventListener('click', () => {
    run.fecharLoja();
    el.hidden = true;
    som.clique();
    mostrarHint(0);
    sujo();
  });
}

// ---------- fim de run (fricção zero: NOVA RUN em 1 clique, §1.3) ----------
function telaFim(scoreFinal: number, sucataGanha: number): void {
  const el = $('fim');
  const vitoria = run.status === 'vitoria';
  const mvp = run.stats.simboloMvp ? getSymbol(run.stats.simboloMvp).nome : '—';
  el.hidden = false;
  el.innerHTML = `<div class="caixa ${vitoria ? 'vitoria' : 'morte'}">
    <h1>${vitoria ? 'MÁQUINA PERFEITA' : 'A MÁQUINA PAROU'}</h1>
    <div class="stats">
      pontuação final <b>${fmt(scoreFinal)}</b> · melhor <b>${fmt(run.stats.melhorScore)}</b><br/>
      melhor cadeia <b>${run.stats.maxCadeia} elos</b> · MVP <b>${mvp}</b><br/>
      ante <b>${run.ante}</b> · rodadas <b>${run.stats.rodadasJogadas}</b> · sucata +<b>${sucataGanha}</b>
    </div>
    <button id="btn-nova">NOVA RUN</button>
    ${vitoria && !run.anteInfinito ? '<button id="btn-infinito" style="margin-top:8px">ANTE INFINITO →</button>' : ''}
    <div class="seed-linha">seed <input id="seed-input" value="${run.seedStr}" maxlength="12" /> <button id="btn-copiar-seed">copiar</button></div>
  </div>`;
  el.querySelector('#btn-nova')?.addEventListener('click', () => {
    const seedIn = (el.querySelector('#seed-input') as HTMLInputElement).value;
    const usarSeed = seedIn && seedIn !== run.seedStr ? seedIn : undefined;
    run = novaRunInterna(usarSeed);
    ultimoPosicionado = [];
    el.hidden = true;
    sujo();
  });
  el.querySelector('#btn-infinito')?.addEventListener('click', () => {
    run.iniciarAnteInfinito();
    el.hidden = true;
    abrirLojaUI();
    sujo();
  });
  el.querySelector('#btn-copiar-seed')?.addEventListener('click', () => {
    void navigator.clipboard?.writeText(run.seedStr);
  });
}

// ---------- oficina (meta-progressão) ----------
$('btn-meta-panel').addEventListener('click', () => abrirOficina());

function abrirOficina(): void {
  const el = $('oficina');
  el.hidden = false;
  const ups = UPGRADES.map((u) => {
    const tem = !!metaP.state.upgrades[u.id];
    return `<div class="oficina-item ${tem ? 'feita' : ''}"><span><b style="color:${COR.textoForte}">${u.nome}</b> — ${u.desc}</span>${tem ? '<span style="color:' + COR.fichas + '">✓</span>' : `<button data-up="${u.id}">${u.custo}⚙</button>`}</div>`;
  }).join('');
  const ems = EMITTERS.map((em) => {
    const tem = metaP.state.emissores.includes(em.id);
    const ativo = metaP.state.emissorAtivo === em.id;
    return `<div class="oficina-item ${ativo ? 'feita' : ''}"><span><b style="color:${COR.textoForte}">${em.nome}</b> — ${em.desc}</span>${
      tem ? (ativo ? `<span style="color:${COR.pulso}">ativo</span>` : `<button data-em="${em.id}">usar</button>`) : `<button data-em-buy="${em.id}">${em.custoSucata}⚙</button>`
    }</div>`;
  }).join('');
  const conq = CONQUISTAS.map((c) => {
    const tem = !!metaP.state.conquistas[c.id];
    return `<div class="oficina-item ${tem ? 'feita' : ''}"><span><b style="color:${tem ? COR.pontos : COR.texto}">${tem ? '⭐' : '☆'} ${c.nome}</b> — ${c.desc}</span><span style="color:${COR.fichas}">+${c.sucata}⚙</span></div>`;
  }).join('');
  el.innerHTML = `<div class="caixa"><h2>OFICINA <span style="float:right;color:${COR.fichas}">⚙ ${metaP.state.sucata}</span></h2>
    <div class="oficina-lista">${ups}<h2 style="margin-top:8px">EMISSORES</h2>${ems}<h2 style="margin-top:8px">CONQUISTAS</h2>${conq}</div>
    <button id="btn-fechar-oficina" style="margin-top:12px;width:100%">FECHAR</button></div>`;
  el.querySelectorAll<HTMLElement>('button[data-up]').forEach((b) =>
    b.addEventListener('click', () => {
      if (metaP.comprarUpgrade(b.dataset.up!)) abrirOficina();
    }),
  );
  el.querySelectorAll<HTMLElement>('button[data-em-buy]').forEach((b) =>
    b.addEventListener('click', () => {
      const em = EMITTERS.find((x) => x.id === b.dataset.emBuy)!;
      if (metaP.comprarEmissor(em.id, em.custoSucata)) abrirOficina();
    }),
  );
  el.querySelectorAll<HTMLElement>('button[data-em]').forEach((b) =>
    b.addEventListener('click', () => {
      metaP.state.emissorAtivo = b.dataset.em!;
      metaP.save();
      abrirOficina();
    }),
  );
  el.querySelector('#btn-fechar-oficina')?.addEventListener('click', () => (el.hidden = true));
}

// ---------- hints (3, 1 frase, descartáveis — §7) ----------
const HINTS = [
  'Arraste peças da mão para a grade.',
  'O pulso entra pela seta ciano e segue de peça em peça.',
  'Aperte RESOLVER e assista à cascata.',
];

function mostrarHint(n: number): void {
  if (prefs.hints > n || prefs.hints >= HINTS.length) return;
  prefs.hints = n + 1;
  metaP.salvarPrefs(prefs);
  const el = $('hint');
  el.textContent = HINTS[n]!;
  el.hidden = false;
  const fechar = () => (el.hidden = true);
  el.onclick = fechar;
  setTimeout(fechar, 6000);
}

// ---------- velocidade + som ----------
$('btn-vel').addEventListener('click', () => {
  vel = vel === 1 ? 2 : vel === 2 ? 4 : 1;
  $('btn-vel').textContent = `${vel}×`;
  prefs.vel = vel;
  metaP.salvarPrefs(prefs);
});
$('btn-vel').textContent = `${vel}×`;
$('btn-som').addEventListener('click', () => {
  som.mudo = !som.mudo;
  prefs.mudo = som.mudo;
  metaP.salvarPrefs(prefs);
  $('btn-som').style.opacity = som.mudo ? '0.4' : '1';
});
$('btn-som').style.opacity = som.mudo ? '0.4' : '1';

// ---------- loop ----------
let ultimoT = performance.now();
function frame(t: number): void {
  const dt = Math.min(0.05, (t - ultimoT) / 1000);
  ultimoT = t;
  render.draw(run, dt, anim.rodando);
  requestAnimationFrame(frame);
}

// bootstrap
if (run.status === 'loja') abrirLojaUI();
sujo();
if (prefs.hints === 0) setTimeout(() => mostrarHint(0), 600);
requestAnimationFrame(frame);

// ---------- auto-playtest (Fase 5): ?autobot=N roda o bot_sinergia DENTRO da UI real ----------
declare global {
  interface Window {
    __cascata?: { runs: number; erros: string[]; fps: number[]; concluido: boolean; vitorias: number };
  }
}

const params = new URLSearchParams(location.search);
if (params.has('autobot')) {
  void autobot(parseInt(params.get('autobot') || '1', 10));
}

async function autobot(totalRuns: number): Promise<void> {
  const { colocarPecasSinergia, BOTS } = await import('./sim/bots');
  const { Rng, seedFromString } = await import('./engine/rng');
  vel = 20; // playback comprimido para o teste automatizado
  const estado = { runs: 0, erros: [] as string[], fps: [] as number[], concluido: false, vitorias: 0 };
  window.__cascata = estado;
  // medidor de FPS durante resoluções (Gate 3: 60fps)
  let frames = 0;
  let fpsT0 = performance.now();
  const medirFps = () => {
    frames++;
    const agora = performance.now();
    if (agora - fpsT0 >= 1000) {
      if (anim.rodando) estado.fps.push(frames / ((agora - fpsT0) / 1000));
      frames = 0;
      fpsT0 = agora;
    }
    if (!estado.concluido) requestAnimationFrame(medirFps);
  };
  requestAnimationFrame(medirFps);

  for (let i = 0; i < totalRuns; i++) {
    metaP.limparRunSalva();
    run = novaRunInterna(`AUTOBOT-${i}`);
    ultimoPosicionado = [];
    $('fim').hidden = true;
    $('loja').hidden = true;
    sujo();
    const rng = new Rng(seedFromString(`AUTOBOT-${i}:bot`));
    let guard = 0;
    try {
      while ((run.status === 'construindo' || run.status === 'loja') && guard++ < 300) {
        if (run.status === 'construindo') {
          colocarPecasSinergia(run, rng);
          sujo();
          await resolverRodada(); // caminho REAL da UI: animação, juice, telas
        } else {
          BOTS.sinergia!.loja(run, rng);
          $('loja').hidden = true;
          sujo();
        }
        // estados impossíveis
        if (run.fichas < 0) throw new Error(`fichas negativas: ${run.fichas}`);
        if (run.placementsLeft < 0) throw new Error('posicionamentos negativos');
      }
      if (guard >= 300) throw new Error('run não terminou em 300 iterações');
      if (run.status === 'vitoria') estado.vitorias++;
    } catch (e) {
      estado.erros.push(`run ${i}: ${String(e)}`);
    }
    estado.runs = i + 1;
  }
  estado.concluido = true;
}
