// Test end-to-end di pagina progetto e preventivi, contro gli emulatori Firebase.
// Uso: avvia emulatori e app (vedi README, sezione emulatori), poi: node tests/projects-quotes.e2e.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const FS = 'http://127.0.0.1:8080/v1/projects/progetta-800ca/databases/(default)/documents';
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const APP = 'http://127.0.0.1:5173';
const OUT = process.env.E2E_OUT || os.tmpdir();

let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failures++; };

const fromV = v => {
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromV);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, fromV(x)]));
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  return v.stringValue;
};
const docFields = d => Object.fromEntries(Object.entries(d.fields || {}).map(([k, x]) => [k, fromV(x)]));
const admin = { Authorization: 'Bearer owner' };
const listCol = async p => {
  const j = await (await fetch(`${FS}/${p}?pageSize=300`, { headers: admin })).json();
  return (j.documents || []).map(d => ({ id: d.name.split('/').pop(), ...docFields(d) }));
};
const getDoc = async p => { const r = await fetch(`${FS}/${p}`, { headers: admin }); return r.ok ? docFields(await r.json()) : null; };
const norm = s => s.replace(/\s/g, ' ');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  page.on('dialog', d => d.accept());
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(String(e)));
  const nav = page.getByRole('navigation');

  // Registrazione
  const email = `quotes${Date.now()}@test.it`, password = 'password123';
  await page.goto(APP);
  await page.getByRole('button', { name: 'Registrati' }).click();
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.fill('#confirm-password', password);
  await page.click('button[type=submit]');
  await page.getByRole('heading', { name: 'Dashboard' }).waitFor({ timeout: 20000 });
  const login = await (await fetch(`${AUTH}/accounts:signInWithPassword?key=fake`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) })).json();
  const uid = login.localId;

  // Cliente
  await page.click('button[aria-label="Aggiungi Cliente"]');
  await page.fill('input[placeholder="Nome Cliente"]', 'Studio Rossi');
  await page.fill('input[placeholder="Email Cliente (Opzionale)"]', 'info@rossi.it');
  await page.click('form button[type=submit]');
  await nav.getByText('Studio Rossi').waitFor();

  // Vista Progetti + nuovo progetto dal pulsante +
  await nav.getByText('Progetti', { exact: true }).click();
  await page.getByRole('heading', { name: 'Progetti' }).waitFor();
  check(await page.getByText('Nessun progetto.').isVisible(), 'vista Progetti vuota');
  await page.click('button[aria-label="Aggiungi Progetto"]');
  await page.selectOption('form select', { label: 'Studio Rossi' });
  await page.fill('input[placeholder="Nome Progetto"]', 'Documentario');
  await page.click('form button[type=submit]');
  await page.click('button[aria-label="Apri progetto Documentario"]');
  await page.getByRole('heading', { name: 'Documentario' }).waitFor();
  check(await page.getByRole('tab', { name: /Panoramica/ }).isVisible(), 'pagina progetto con schede');

  // Attività dal pulsante + nella pagina progetto
  await page.click('button[aria-label="Aggiungi Attività"]');
  await page.fill('input[placeholder="Attività"]', 'Sopralluogo');
  await page.click('form button[type=submit]');
  await page.getByRole('tab', { name: /Attività/ }).click();
  await page.getByText('Sopralluogo').waitFor();
  check(true, 'attività aggiunta e visibile nella scheda Attività');

  // Pagamento dalla scheda Pagamenti
  await page.getByRole('tab', { name: /Pagamenti/ }).click();
  await page.getByRole('button', { name: 'Aggiungi pagamento' }).click();
  await page.fill('input[placeholder="Importo Pagamento (€)"]', '500');
  await page.click('form button[type=submit]');
  await page.getByText('500,00 €', { exact: true }).waitFor();
  check(true, 'pagamento aggiunto dalla scheda Pagamenti');

  // Preventivi: avviso dati mancanti -> impostazioni
  await page.getByRole('tab', { name: /Preventivi/ }).click();
  await page.getByRole('button', { name: 'Vai alle impostazioni' }).click();
  await page.getByLabel('Nome e cognome / nome attività').fill('Mario Bianchi Video');
  await page.getByLabel('Partita IVA').fill('01234567890');
  await page.getByLabel('IBAN').fill('IT60X0542811101000000123456');
  check((await page.getByLabel('Dicitura fiscale in calce').inputValue()).includes('190/2014'), 'dicitura forfettario proposta di default');
  await page.getByRole('button', { name: 'Salva dati' }).click();
  await page.getByText('Salvato').waitFor();
  await page.waitForTimeout(800);
  const profile = await getDoc(`users/${uid}/settings/profile`);
  check(profile && profile.name === 'Mario Bianchi Video' && profile.vatNumber === '01234567890', 'profilo salvato in settings/profile');

  // Torna al progetto e crea il preventivo
  await nav.getByText('Progetti', { exact: true }).click();
  await page.click('button[aria-label="Apri progetto Documentario"]');
  await page.getByRole('tab', { name: /Preventivi/ }).click();
  await page.getByRole('button', { name: 'Nuovo preventivo' }).click();
  const number = await page.getByLabel('Numero').inputValue();
  check(/^\d{4}-001$/.test(number), `numero proposto ${number}`);
  check((await page.getByLabel('Intestatario').inputValue()) === 'Studio Rossi\ninfo@rossi.it', 'intestatario precompilato dal cliente');
  await page.getByLabel('Descrizione voce 1').fill('Riprese\n2 giornate con operatore');
  await page.getByLabel('Quantità voce 1').fill('2');
  await page.getByLabel('Prezzo voce 1').fill('600');
  await page.getByRole('button', { name: 'Aggiungi voce' }).click();
  await page.getByLabel('Descrizione voce 2').fill('Montaggio e color');
  await page.getByLabel('Prezzo voce 2').fill('800');
  await page.getByRole('button', { name: 'Aggiungi voce' }).click(); // voce vuota: va scartata al salvataggio
  check(norm(await page.locator('form').getByText(/^Totale:/).innerText()).includes('2002,00 €'), 'totale in editor 2000 + 2 bollo = 2002');
  await page.getByRole('button', { name: 'Salva preventivo' }).click();
  await page.getByText(`Preventivo ${number}`).waitFor();
  await page.waitForTimeout(800);
  let quotes = await listCol(`users/${uid}/quotes`);
  check(quotes.length === 1 && quotes[0].items.length === 2 && quotes[0].status === 'bozza' && quotes[0].chargeStampDuty === true, 'preventivo salvato con 2 voci (vuota scartata), stato bozza');

  // Cambio stato: inviato -> progetto "preventivo inviato"
  await page.selectOption(`select[aria-label="Stato preventivo ${number}"]`, 'inviato');
  await page.waitForTimeout(800);
  let project = (await listCol(`users/${uid}/projects`))[0];
  check(project.workStatus === 'preventivo inviato', 'preventivo inviato -> stato progetto aggiornato');

  // Accettato -> valore progetto = imponibile, stato in lavorazione
  await page.selectOption(`select[aria-label="Stato preventivo ${number}"]`, 'accettato');
  await page.waitForTimeout(800);
  project = (await listCol(`users/${uid}/projects`))[0];
  check(project.value === 2000 && project.workStatus === 'in lavorazione', 'preventivo accettato -> valore 2000 e stato in lavorazione');
  check(project.paymentStatus === 'pagato parzialmente', `pagati 500 su 2000 -> stato pagamento ricalcolato (got ${project.paymentStatus})`);

  // PDF: intercetta window.print e controlla il documento
  await page.evaluate(() => { window.__printCalls = 0; window.print = () => { window.__printCalls++; }; });
  await page.click(`button[aria-label="Scarica PDF preventivo ${number}"]`);
  await page.waitForTimeout(500);
  check(await page.evaluate(() => window.__printCalls) === 1, 'stampa avviata una sola volta');
  const doc = norm(await page.locator('#print-root').innerText());
  check(doc.includes('Mario Bianchi Video') && doc.includes('P. IVA 01234567890'), 'PDF: intestazione con i tuoi dati');
  check(doc.includes('Studio Rossi') && doc.includes('Documentario'), 'PDF: cliente e oggetto');
  check(doc.includes('2002,00 €') && doc.includes('Rimborso marca da bollo'), 'PDF: totale e marca da bollo');
  check(doc.includes('190/2014') && doc.includes('IT60X0542811101000000123456'), 'PDF: dicitura forfettario e IBAN');
  await page.emulateMedia({ media: 'print' });
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.screenshot({ path: path.join(OUT, 'quote-print.png') });
  await page.pdf({ path: path.join(OUT, 'preventivo-esempio.pdf'), format: 'A4' });
  await page.emulateMedia({ media: 'screen' });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await page.waitForTimeout(300);
  check(await page.locator('#print-root').count() === 0, 'documento di stampa rimosso dopo la stampa');

  // Nuova versione
  await page.click(`button[aria-label="Nuova versione del preventivo ${number}"]`);
  const number2 = await page.getByLabel('Numero').inputValue();
  check(number2 === number.replace(/001$/, '002'), `nuova versione numerata ${number2}`);
  check(await page.getByLabel('Descrizione voce 2').inputValue() === 'Montaggio e color', 'nuova versione copia le voci');
  await page.getByRole('button', { name: 'Salva preventivo' }).click();
  await page.getByText(`Preventivo ${number2}`).waitFor();
  await page.waitForTimeout(800);

  // Schermata mobile della pagina progetto
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600); // fine dell'animazione del menu laterale
  await page.screenshot({ path: path.join(OUT, 'project-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.screenshot({ path: path.join(OUT, 'project-quotes.png') });

  // Backup: export contiene preventivi e profilo; import di un backup vecchio (senza preventivi) non li cancella
  await nav.getByText('Impostazioni', { exact: true }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Esporta Backup' }).click()]);
  const backupPath = path.join(OUT, 'quotes-backup.json');
  await download.saveAs(backupPath);
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  check(backup.quotes.length === 2 && backup.profile && backup.profile.name === 'Mario Bianchi Video', 'export include 2 preventivi e il profilo');
  const oldStyle = { clients: backup.clients, projects: backup.projects, todos: backup.todos };
  const oldPath = path.join(OUT, 'quotes-old-backup.json');
  fs.writeFileSync(oldPath, JSON.stringify(oldStyle));
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Importa da Backup' }).click()]);
  await chooser.setFiles(oldPath);
  await page.waitForTimeout(2500);
  quotes = await listCol(`users/${uid}/quotes`);
  check(quotes.length === 2, 'import di un backup senza preventivi: preventivi conservati');

  // Eliminazione progetto -> cancella anche attività e preventivi, torna al cliente
  await nav.getByText('Progetti', { exact: true }).click();
  await page.click('button[aria-label="Apri progetto Documentario"]');
  await page.click('button[aria-label="Elimina progetto Documentario"]');
  await page.getByRole('heading', { name: 'Studio Rossi' }).waitFor();
  await page.waitForTimeout(800);
  const [projects, todos] = [await listCol(`users/${uid}/projects`), await listCol(`users/${uid}/todos`)];
  quotes = await listCol(`users/${uid}/quotes`);
  check(projects.length === 0 && todos.length === 0 && quotes.length === 0, 'progetto eliminato con attività e preventivi; ritorno alla pagina cliente');

  const relevantErrors = consoleErrors.filter(e => !/favicon|index\.css|404/.test(e));
  check(relevantErrors.length === 0, `nessun errore nella console${relevantErrors.length ? ': ' + relevantErrors.join(' | ') : ''}`);

  await browser.close();
  console.log(failures ? `\n${failures} controlli FALLITI` : '\nTutti i controlli superati');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
