/** Fase 5 — bot_sinergia dentro da UI real: N runs, erros de console, FPS, persistência, NOVA RUN ≤ 2s. */
import { chromium } from 'playwright';

const RUNS = parseInt(process.argv[2] || '50', 10);
const URL = process.env.CASCATA_URL || 'http://localhost:4173/';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 420, height: 820 } });
const errosConsole = [];
page.on('console', (m) => { if (m.type() === 'error') errosConsole.push(m.text()); });
page.on('pageerror', (e) => errosConsole.push(String(e)));

// Gate 3: NOVA RUN em ≤ 2s (morre rápido de propósito e mede o clique)
await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.click('#btn-resolver');
await page.waitForSelector('#fim:not([hidden])', { timeout: 20000 });
const t0 = Date.now();
await page.click('#btn-nova');
await page.waitForFunction(() => document.getElementById('fim').hidden, { timeout: 5000 });
await page.waitForFunction(() => document.querySelectorAll('.chip').length > 0, { timeout: 5000 });
const novaRunMs = Date.now() - t0;
console.log(`NOVA RUN: ${novaRunMs}ms ${novaRunMs <= 2000 ? '✅' : '❌'}`);

// persistência entre reloads (Gate 4)
await page.evaluate(() => localStorage.setItem('cascata_prefs_v1', JSON.stringify({ vel: 4, mudo: true, hints: 9 })));
await page.reload({ waitUntil: 'networkidle' });
const velPersistida = await page.locator('#btn-vel').textContent();
console.log(`velocidade persistida após reload: ${velPersistida} ${velPersistida === '4×' ? '✅' : '❌'}`);

// autobot: N runs dentro da UI
await page.goto(`${URL}?autobot=${RUNS}`, { waitUntil: 'networkidle' });
const inicio = Date.now();
let ultimo = -1;
while (true) {
  const st = await page.evaluate(() => window.__cascata ?? null);
  if (st && st.runs !== ultimo) {
    ultimo = st.runs;
    process.stdout.write(`\rruns: ${st.runs}/${RUNS} vitórias: ${st.vitorias} erros: ${st.erros.length} `);
  }
  if (st && st.concluido) break;
  if (Date.now() - inicio > 40 * 60 * 1000) { console.log('\nTIMEOUT'); break; }
  await new Promise((r) => setTimeout(r, 1500));
}
const fim = await page.evaluate(() => window.__cascata);
console.log('\n---');
console.log(`runs concluídas: ${fim.runs} | vitórias: ${fim.vitorias}`);
console.log(`erros internos: ${fim.erros.length ? JSON.stringify(fim.erros.slice(0, 5)) : 'nenhum'}`);
console.log(`erros de console: ${errosConsole.length ? JSON.stringify([...new Set(errosConsole)].slice(0, 5)) : 'nenhum'} ${errosConsole.length === 0 ? '✅' : '❌'}`);
const fpsMedio = fim.fps.length ? fim.fps.reduce((a, b) => a + b, 0) / fim.fps.length : NaN;
const fpsMin = fim.fps.length ? Math.min(...fim.fps) : NaN;
console.log(`FPS durante resoluções: média ${fpsMedio.toFixed(1)} | mínimo ${fpsMin.toFixed(1)} ${fpsMin >= 55 ? '✅' : '⚠️'}`);
// conquistas persistidas
const conq = await page.evaluate(() => JSON.parse(localStorage.getItem('cascata_meta_v1') || '{}'));
console.log(`conquistas desbloqueadas: ${Object.keys(conq.conquistas || {}).length} | sucata: ${conq.sucata}`);
await browser.close();
process.exit(errosConsole.length || (fim.erros?.length ?? 1) ? 1 : 0);
