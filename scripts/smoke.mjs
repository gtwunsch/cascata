import { chromium } from 'playwright';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 420, height: 820 } });
const erros = [];
page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
// estado inicial
const mao = await page.locator('.chip').count();
const resolver = await page.locator('#btn-resolver').isEnabled();
console.log('chips na mão:', mao, '| RESOLVER habilitado:', resolver);
// arrasta 1º chip para a célula (0,1) via drag&drop simulado
const chip = page.locator('.chip').first();
const cb = await chip.boundingBox();
const canvas = await page.locator('#jogo').boundingBox();
// célula (0,1): x = pad+emissor+cs/2 → proporcional
const W = 514, H = 356; // logical
const cx = canvas.x + ((10 + 34 + 42) / W) * canvas.width;
const cy = canvas.y + ((10 + 84 + 42) / H) * canvas.height;
await page.mouse.move(cb.x + 20, cb.y + 20);
await page.mouse.down();
await page.mouse.move(cx, cy, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(300);
const maoDepois = await page.locator('.chip').count();
console.log('chips após posicionar:', maoDepois);
// resolve
await page.click('#btn-resolver');
await page.waitForTimeout(4000);
const lojaVisivel = await page.locator('#loja').isHidden().then(h => !h);
const fimVisivel = await page.locator('#fim').isHidden().then(h => !h);
console.log('loja visível:', lojaVisivel, '| fim visível:', fimVisivel);
console.log('score HUD:', await page.locator('#score').textContent());
await page.screenshot({ path: process.argv[2] || 'smoke.png' });
console.log('erros de console:', erros.length ? erros : 'nenhum');
await browser.close();
