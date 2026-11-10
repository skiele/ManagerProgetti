// Test end-to-end di opportunità e calendario, contro gli emulatori Firebase (con hosting e functions).
// Uso: come tests/claude-connector.e2e.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const APP = process.env.APP_URL || 'http://127.0.0.1:5000';
let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failures++; };
const norm = s => s.replace(/\s/g, ' ');

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
page.on('dialog', d => d.accept());
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));
const nav = page.getByRole('navigation');
const kpi = async label => norm(await page.locator('p', { hasText: label }).first().locator('xpath=following-sibling::p[1]').innerText());

try {
  const email = `opp${Date.now()}@test.it`, password = 'password123';
  await page.goto(APP);
  await page.getByRole('button', { name: 'Registrati' }).click();
  await page.fill('#email', email); await page.fill('#password', password); await page.fill('#confirm-password', password);
  await page.click('button[type=submit]');
  await page.getByRole('heading', { name: 'Dashboard' }).waitFor({ timeout: 20000 });

  await page.click('button[aria-label="Aggiungi Cliente"]');
  await page.fill('input[placeholder="Nome Cliente"]', 'Benelli');
  await page.click('form button[type=submit]');
  await nav.getByText('Benelli').click();

  // Progetto normale (preventivo da inviare) da 3.000 €
  await page.click('button[aria-label="Aggiungi Progetto"]');
  await page.fill('input[placeholder="Nome Progetto"]', 'Spot moto');
  await page.fill('input[placeholder="Valore Progetto (€)"]', '3000');
  await page.click('form button[type=submit]');
  // Opportunità da 40.000 €
  await page.click('button[aria-label="Aggiungi Progetto"]');
  await page.fill('input[placeholder="Nome Progetto"]', 'Campagna istituzionale');
  await page.fill('input[placeholder="Valore Progetto (€)"]', '40000');
  await page.getByLabel(/È un'opportunità/).check();
  await page.click('form button[type=submit]');
  await page.getByText('Opportunità · non contano negli incassi').waitFor({ timeout: 5000 });
  check(true, 'pagina cliente: sezione Opportunità separata');

  await nav.getByText('Dashboard', { exact: true }).click();
  await page.getByRole('heading', { name: 'Dashboard' }).waitFor();
  check(await kpi('In preventivo') === '3.000 €', `In preventivo resta 3.000 € (got ${await kpi('In preventivo')})`);
  check(norm(await page.locator('#dash-opportunities').innerText()).includes('40.000 €'), 'blocco Opportunità con 40.000 €');
  check(norm(await page.locator('li', { hasText: 'Benelli' }).last().innerText()).includes('3.000 €'), 'barra per cliente: Benelli 3.000 €, senza l\'opportunità');

  // Vista Progetti: le opportunità non stanno tra gli Attivi
  await nav.getByText('Progetti', { exact: true }).click();
  check(await page.locator('button[aria-label="Apri progetto Campagna istituzionale"]').count() === 0, 'filtro Attivi: opportunità esclusa');
  await page.getByRole('button', { name: 'Opportunità', exact: true }).click();
  check(await page.locator('button[aria-label="Apri progetto Campagna istituzionale"]').count() === 1, 'filtro Opportunità: la mostra');

  // Diventa concreta: passa a "preventivo inviato" ed entra nei conti
  await page.click('button[aria-label="Apri progetto Campagna istituzionale"]');
  await page.selectOption('select[aria-label^="Cambia stato Opportunità"]', 'preventivo inviato');
  await page.waitForTimeout(800);
  await nav.getByText('Dashboard', { exact: true }).click();
  check(await kpi('In preventivo') === '43.000 €', `dopo il passaggio a preventivo: 43.000 € (got ${await kpi('In preventivo')})`);
  check(await page.locator('#dash-opportunities').count() === 0, 'nessuna opportunità rimasta');

  // Attività con scadenza: pulsante Google Calendar
  await nav.getByText('Progetti', { exact: true }).click();
  await page.click('button[aria-label="Apri progetto Spot moto"]');
  await page.click('button[aria-label="Aggiungi Attività"]');
  await page.fill('input[placeholder="Attività"]', 'Consegna master, versione finale');
  await page.fill('input[type="date"]', '2026-12-03');
  await page.click('form button[type=submit]');
  await page.click('button[aria-label="Aggiungi Attività"]');
  await page.fill('input[placeholder="Attività"]', 'Attività senza data');
  await page.click('form button[type=submit]');
  await page.getByRole('tab', { name: /Attività/ }).click();
  const href = await page.locator('a[aria-label="Aggiungi a Google Calendar: Consegna master, versione finale"]').getAttribute('href');
  check(href.startsWith('https://calendar.google.com/calendar/render?') && href.includes('dates=20261203%2F20261204'), 'link Google Calendar con la data giusta');

  // Abbonamento al calendario
  await nav.getByText('Impostazioni', { exact: true }).click();
  await page.getByRole('button', { name: 'Genera link per Google Calendar' }).click();
  const url = await page.getByLabel('Link del calendario', { exact: true }).inputValue();
  check(/\/cal\/[A-Za-z0-9_-]{40,}\.ics$/.test(url), 'link del calendario generato');
  const res = await fetch(url);
  const ics = await res.text();
  check(res.ok && (res.headers.get('content-type') || '').startsWith('text/calendar'), `il link risponde in formato calendario (HTTP ${res.status})`);
  check(ics.includes('SUMMARY:Consegna master\\, versione finale') && ics.includes('DTSTART;VALUE=DATE:20261203'), 'il calendario contiene la scadenza');
  check(!ics.includes('Attività senza data'), 'le attività senza data non compaiono');
  check(ics.includes('Benelli / Spot moto'), 'nella descrizione cliente e progetto');

  await page.getByRole('button', { name: 'Revoca link del calendario' }).click();
  await page.waitForTimeout(800);
  check((await fetch(url)).status === 404, 'dopo la revoca il link non funziona più');

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
