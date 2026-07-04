import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 420, height: 820 } });
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);
// posiciona os 3 chips em linha na fileira do emissor
for (let i = 0; i < 3; i++) {
  const chip = page.locator('.chip').first();
  const cb = await chip.boundingBox();
  const canvas = await page.locator('#jogo').boundingBox();
  const W = 514, H = 356;
  const cx = canvas.x + ((10 + 34 + i * 84 + 42) / W) * canvas.width;
  const cy = canvas.y + ((10 + 84 + 42) / H) * canvas.height;
  await page.mouse.move(cb.x + 20, cb.y + 20);
  await page.mouse.down();
  await page.mouse.move(cx, cy, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(200);
}
await page.screenshot({ path: process.argv[2] });
// resolve e captura a loja
await page.click('#btn-resolver');
await page.waitForTimeout(5000);
await page.screenshot({ path: process.argv[3] });
await browser.close();
