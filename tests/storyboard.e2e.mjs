// Test end-to-end della storyboard (app + strumenti Claude), contro gli emulatori Firebase.
// Uso: come tests/claude-connector.e2e.mjs (emulatori auth, firestore, functions, hosting).
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const requireFromFunctions = createRequire(path.join(here, '../functions/package.json'));
const { Client } = await import(requireFromFunctions.resolve('@modelcontextprotocol/sdk/client/index.js'));
const { StreamableHTTPClientTransport } = await import(requireFromFunctions.resolve('@modelcontextprotocol/sdk/client/streamableHttp.js'));
const { chromium } = createRequire(import.meta.url)('playwright');

const APP = process.env.APP_URL || 'http://127.0.0.1:5000';
const OUT = process.env.E2E_OUT || os.tmpdir();
// PNG 1×1 come immagine di prova
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failures++; };

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
page.on('dialog', d => d.accept());
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));
const nav = page.getByRole('navigation');
const codes = async () => page.locator('li span.bg-foreground').allInnerTexts();

try {
  const email = `sb${Date.now()}@test.it`, password = 'password123';
  await page.goto(APP);
  await page.getByRole('button', { name: 'Registrati' }).click();
  await page.fill('#email', email); await page.fill('#password', password); await page.fill('#confirm-password', password);
  await page.click('button[type=submit]');
  await page.getByRole('heading', { name: 'Dashboard' }).waitFor({ timeout: 20000 });
  await page.click('button[aria-label="Aggiungi Cliente"]');
  await page.fill('input[placeholder="Nome Cliente"]', 'Birrificio Valle Scura');
  await page.click('form button[type=submit]');
  await nav.getByText('Birrificio Valle Scura').click();
  await page.click('button[aria-label="Aggiungi Progetto"]');
  await page.fill('input[placeholder="Nome Progetto"]', 'Spot primavera');
  await page.click('form button[type=submit]');
  await page.click('button[aria-label="Apri progetto Spot primavera"]');

  // Nuova storyboard dalla scheda del progetto
  await page.getByRole('tab', { name: /Storyboard/ }).click();
  await page.getByRole('button', { name: 'Nuova storyboard' }).click();
  await page.getByRole('button', { name: 'Prima inquadratura' }).click();
  await page.getByLabel('Titolo della scena').fill('Il birrificio all\'alba');
  await page.getByLabel('Campo').selectOption('WS');
  await page.getByLabel('Movimento').selectOption('drone');
  await page.getByLabel('Ottica').fill('24mm');
  await page.getByLabel('Cosa si vede').fill('Il birrificio tra le colline, nebbia bassa');
  await page.getByLabel('Durata (secondi)').fill('4');
  await page.getByRole('button', { name: 'Salva', exact: true }).click();
  await page.getByText('Il birrificio tra le colline, nebbia bassa').waitFor();

  await page.getByRole('button', { name: 'Inquadratura' }).click();
  await page.getByLabel('Campo').selectOption('CU');
  await page.getByLabel('Cosa si vede').fill('Mani che versano la birra');
  await page.getByLabel('Audio').fill('Schiuma, musica che entra');
  await page.getByLabel('Durata (secondi)').fill('3');
  await page.getByRole('button', { name: 'Salva', exact: true }).click();
  await page.getByText('Mani che versano la birra').waitFor();
  check(JSON.stringify(await codes()) === JSON.stringify(['1A', '1B']), `codici automatici ${await codes()}`);
  check(await page.getByText('2 inquadrature · 1 scene · durata 7″ · girate 0/2').count() === 1, 'riepilogo: 2 inquadrature, durata 7″');

  // Immagine caricata dal pulsante sul fotogramma vuoto
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: /Carica o trascina/ }).first().click()]);
  await chooser.setFiles({ name: 'frame.png', mimeType: 'image/png', buffer: PNG });
  await page.locator('img[alt="Inquadratura 1A"]').waitFor({ timeout: 5000 });
  check(true, 'immagine caricata e mostrata nel fotogramma 1A');

  // Riordino: 1B prima di 1A
  await page.click('button[aria-label="Sposta 1B prima"]');
  await page.waitForTimeout(800);
  check((await page.locator('li', { has: page.getByText('Mani che versano la birra') }).locator('span.bg-foreground').innerText()) === '1A', 'dopo lo spostamento la ripresa delle mani diventa 1A');

  // Nuova scena e "girata"
  await page.getByRole('button', { name: 'Nuova scena' }).click();
  await page.getByLabel('Titolo della scena').fill('Il brindisi');
  await page.getByLabel('Cosa si vede').fill('Amici che brindano in giardino');
  await page.getByRole('button', { name: 'Salva', exact: true }).click();
  await page.getByText('Amici che brindano in giardino').waitFor();
  check((await codes()).includes('2A'), 'la nuova scena parte da 2A');
  await page.locator('li', { has: page.getByText('Amici che brindano') }).getByLabel('Girata').click();
  await page.getByText('girate 1/3').waitFor({ timeout: 5000 });
  check(true, '"girata" aggiorna il contatore');

  // Vista shot list e stampa
  await page.getByRole('button', { name: 'Shot list' }).click();
  check(await page.locator('table').count() === 2, 'vista shot list: una tabella per scena');
  await page.screenshot({ path: path.join(OUT, 'storyboard-table.png'), fullPage: true });
  await page.getByRole('button', { name: 'Storyboard', exact: true }).click();
  await page.evaluate(() => { window.__prints = 0; window.print = () => { window.__prints++; }; });
  await page.getByRole('button', { name: 'Stampa / PDF' }).click();
  await page.waitForTimeout(800);
  check(await page.evaluate(() => window.__prints) === 1, 'stampa avviata una volta');
  check(await page.locator('#print-root .sb-frame').count() === 3 && await page.locator('#print-root img').count() === 1, 'documento di stampa: 3 fotogrammi, 1 immagine');
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: path.join(OUT, 'storyboard-esempio.pdf'), format: 'A4', landscape: true });
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));

  // Claude: aggiunge inquadrature alla storyboard
  await nav.getByText('Impostazioni', { exact: true }).click();
  await page.getByRole('button', { name: 'Genera link per Claude' }).click();
  const url = await page.getByLabel('Link del connettore').inputValue();
  const claude = new Client({ name: 'test', version: '1.0.0' });
  await claude.connect(new StreamableHTTPClientTransport(new URL(url)));
  const lists = JSON.parse((await claude.callTool({ name: 'list_storyboards', arguments: {} })).content[0].text);
  check(lists.length === 1 && lists[0].shots === 3, 'Claude vede la storyboard con 3 inquadrature');
  const added = await claude.callTool({ name: 'add_shots', arguments: { storyboardId: lists[0].id, shots: [
    { scene: 2, description: 'Primo piano del logo sulla bottiglia', size: 'ECU', duration: 2 },
    { scene: 3, sceneTitle: 'Chiusura', description: 'Logo su fondo nero', size: 'INS', audio: 'Voce: "Valle Scura, dal 1998"' },
  ] } });
  check(!added.isError, 'add_shots riuscito');
  const board = JSON.parse((await claude.callTool({ name: 'get_storyboard', arguments: { storyboardId: lists[0].id } })).content[0].text);
  check(JSON.stringify(board.shots.map(s => s.code)) === JSON.stringify(['1A', '1B', '2A', '2B', '3A']), `get_storyboard restituisce i codici ${board.shots.map(s => s.code)}`);

  await nav.getByText('Progetti', { exact: true }).click();
  await page.click('button[aria-label="Apri progetto Spot primavera"]');
  await page.getByRole('tab', { name: /Storyboard/ }).click();
  await page.click('button[aria-label^="Apri storyboard"]');
  await page.getByText('Logo su fondo nero').waitFor({ timeout: 5000 });
  check((await codes()).join(',') === '1A,1B,2A,2B,3A', 'le inquadrature di Claude compaiono nell\'app con i codici giusti');
  await page.screenshot({ path: path.join(OUT, 'storyboard-board.png'), fullPage: true });

  const relevant = consoleErrors.filter(e => !/favicon|index\.css|404/.test(e));
  check(relevant.length === 0, `nessun errore nella console${relevant.length ? ': ' + relevant.join(' | ') : ''}`);
} catch (e) {
  console.error(e);
  failures++;
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} controlli FALLITI` : '\nTutti i controlli superati');
process.exit(failures ? 1 : 0);
