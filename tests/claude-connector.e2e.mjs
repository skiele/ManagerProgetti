// Test end-to-end del connettore Claude (MCP) e dei documenti, contro gli emulatori Firebase.
// Uso:
//   VITE_USE_EMULATOR=true npx vite build
//   npx firebase-tools emulators:start --only auth,firestore,functions,hosting --project progetta-800ca
//   node tests/claude-connector.e2e.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const requireFromFunctions = createRequire(path.join(here, '../functions/package.json'));
const { Client } = await import(requireFromFunctions.resolve('@modelcontextprotocol/sdk/client/index.js'));
const { StreamableHTTPClientTransport } = await import(requireFromFunctions.resolve('@modelcontextprotocol/sdk/client/streamableHttp.js'));
const { chromium } = createRequire(import.meta.url)('playwright');

const APP = 'http://127.0.0.1:5000';
const FS = 'http://127.0.0.1:8080/v1/projects/progetta-800ca/databases/(default)/documents';
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
const listCol = async p => {
  const j = await (await fetch(`${FS}/${p}?pageSize=300`, { headers: { Authorization: 'Bearer owner' } })).json();
  return (j.documents || []).map(d => ({ id: d.name.split('/').pop(), ...Object.fromEntries(Object.entries(d.fields || {}).map(([k, x]) => [k, fromV(x)])) }));
};

const connect = async url => {
  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(url)));
  return client;
};
const call = async (client, name, args = {}) => {
  const r = await client.callTool({ name, arguments: args });
  const body = r.content?.[0]?.text ?? '';
  let data = null; try { data = JSON.parse(body); } catch { /* testo semplice */ }
  return { error: !!r.isError, text: body, data };
};

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
page.on('dialog', d => d.accept());
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));
const nav = page.getByRole('navigation');

try {
  // Utente, cliente, progetto
  const email = `claude${Date.now()}@test.it`, password = 'password123';
  await page.goto(APP);
  await page.getByRole('button', { name: 'Registrati' }).click();
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.fill('#confirm-password', password);
  await page.click('button[type=submit]');
  await page.getByRole('heading', { name: 'Dashboard' }).waitFor({ timeout: 20000 });
  await page.click('button[aria-label="Aggiungi Cliente"]');
  await page.fill('input[placeholder="Nome Cliente"]', 'Fondazione Luce');
  await page.click('form button[type=submit]');
  await nav.getByText('Fondazione Luce').click();
  await page.click('button[aria-label="Aggiungi Progetto"]');
  await page.fill('input[placeholder="Nome Progetto"]', 'Corto sul lago');
  await page.click('form button[type=submit]');
  await page.click('button[aria-label="Apri progetto Corto sul lago"]');

  // Documento creato nell'app
  await page.getByRole('tab', { name: /Documenti/ }).click();
  await page.getByRole('button', { name: 'Nuovo documento' }).click();
  await page.getByLabel('Titolo del documento').fill('Soggetto - Corto sul lago');
  await page.getByLabel('Testo del documento').fill('# Il lago\n\nUna donna torna al paese dove è cresciuta.\n\nIl finale è ancora da scrivere.');
  await page.getByText('Salvato ·').waitFor({ timeout: 5000 });
  check(true, 'documento creato e salvato automaticamente dall\'app');

  // Link per Claude
  await nav.getByText('Impostazioni', { exact: true }).click();
  await page.getByRole('button', { name: 'Genera link per Claude' }).click();
  const url = await page.getByLabel('Link del connettore').inputValue();
  check(url.startsWith(`${APP}/mcp/`) && url.length > `${APP}/mcp/`.length + 40, 'link generato sul dominio dell\'app');
  await page.getByText('Collegamenti attivi').waitFor();
  check(await page.getByText(/claude\.ai · creato il/).count() === 1, 'collegamento elencato tra quelli attivi');
  const tokens = await listCol('mcpTokens');
  check(tokens.length >= 1 && !JSON.stringify(tokens).includes(url.split('/').pop()), 'su Firestore c\'è solo l\'hash, non il segreto');

  // Claude si collega
  const claude = await connect(url);
  const tools = (await claude.listTools()).tools.map(t => t.name).sort();
  check(tools.length === 16 && !tools.some(t => /delete|payment|status/i.test(t)), `16 strumenti, nessuno per eliminare/pagamenti/stati: ${tools.join(', ')}`);
  check((claude.getInstructions() || '').includes('forfettario'), 'istruzioni del server ricevute');

  const projects = (await call(claude, 'list_projects')).data;
  check(projects.length === 1 && projects[0].name === 'Corto sul lago' && projects[0].client === 'Fondazione Luce', 'list_projects vede il progetto');
  const projectId = projects[0].id;
  const detail = (await call(claude, 'get_project', { projectId })).data;
  check(detail.documents.length === 1 && detail.documents[0].title === 'Soggetto - Corto sul lago', 'get_project elenca il documento');
  const docId = detail.documents[0].id;
  const docRead = (await call(claude, 'read_document', { documentId: docId })).data;
  check(docRead.content.includes('Una donna torna'), 'read_document restituisce il testo');

  // Modifica di Claude mentre il documento è aperto nell'app (senza modifiche locali): l'app si aggiorna
  await nav.getByText('Documenti', { exact: true }).click();
  await page.click('button[aria-label="Apri documento Soggetto - Corto sul lago"]');
  await page.getByLabel('Testo del documento').waitFor();
  const edit = await call(claude, 'edit_document', {
    documentId: docId, expectedRevision: docRead.revision,
    edits: [{ find: 'Il finale è ancora da scrivere.', replace: 'Alla fine resta, e riapre la bottega del padre.' }],
  });
  check(!edit.error, `edit_document riuscito (${edit.text.slice(0, 60)})`);
  await page.getByText('Documento aggiornato da Claude.').waitFor({ timeout: 5000 });
  check((await page.getByLabel('Testo del documento').inputValue()).includes('riapre la bottega'), 'l\'editor aperto mostra subito la modifica di Claude');

  const stale = await call(claude, 'edit_document', { documentId: docId, expectedRevision: docRead.revision, edits: [{ find: 'lago', replace: 'mare' }] });
  check(stale.error && stale.text.includes('revisione'), 'modifica con revisione vecchia rifiutata');
  const ambiguous = await call(claude, 'edit_document', { documentId: docId, edits: [{ find: 'a', replace: 'b' }] });
  check(ambiguous.error && ambiguous.text.includes('volte'), 'sostituzione ambigua rifiutata, nessuna modifica');

  // Conflitto: scrivo nell'app e Claude modifica prima del salvataggio
  const textarea = page.getByLabel('Testo del documento');
  await textarea.press('End');
  await textarea.pressSequentially(' Mia aggiunta.', { delay: 5 });
  const current = (await call(claude, 'read_document', { documentId: docId })).data;
  await call(claude, 'edit_document', { documentId: docId, expectedRevision: current.revision, edits: [{ find: '', replace: '## Nota di Claude' }] });
  await page.getByText('Il documento è stato modificato altrove').waitFor({ timeout: 5000 });
  check(true, 'conflitto segnalato quando Claude modifica mentre scrivi');
  await page.getByRole('button', { name: 'Tieni la mia versione' }).click();
  await page.getByText('Salvato ·').waitFor({ timeout: 5000 });
  await page.waitForTimeout(800);
  let docs = await listCol(`users/${(await listCol('mcpTokens'))[0].uid}/documents`);
  check(docs[0].content.includes('Mia aggiunta.') && !docs[0].content.includes('Nota di Claude'), '"Tieni la mia versione" salva il testo locale');

  // Versioni precedenti: la versione di Claude scartata è recuperabile
  await page.getByRole('button', { name: 'Versioni precedenti' }).click();
  await page.getByText('Versione sostituita in un conflitto').waitFor({ timeout: 5000 });
  check(await page.getByText('Prima della modifica di Claude').count() >= 2, 'ogni modifica di Claude ha salvato la versione precedente');
  const conflictRev = page.locator('div', { has: page.getByText('Versione sostituita in un conflitto') }).last();
  await conflictRev.getByRole('button', { name: 'Ripristina' }).click();
  await page.waitForTimeout(1500);
  check((await textarea.inputValue()).includes('## Nota di Claude'), 'ripristino della versione di Claude dall\'elenco versioni');

  // Preventivo creato da Claude
  const quote = await call(claude, 'create_quote', {
    projectId, notes: 'Consegna entro 30 giorni dalle riprese.',
    items: [{ description: 'Riprese 3 giornate', quantity: 3, unitPrice: 500 }, { description: 'Montaggio', unitPrice: 900 }],
  });
  check(!quote.error && /^\d{4}-001$/.test(quote.data.number) && quote.data.total === 2402, `create_quote: ${quote.data?.number}, totale ${quote.data?.total}`);
  await nav.getByText('Progetti', { exact: true }).click();
  await page.click('button[aria-label="Apri progetto Corto sul lago"]');
  await page.getByRole('tab', { name: /Preventivi/ }).click();
  await page.getByText(`Preventivo ${quote.data.number}`).waitFor({ timeout: 5000 });
  check(await page.locator(`select[aria-label="Stato preventivo ${quote.data.number}"]`).inputValue() === 'bozza', 'il preventivo di Claude appare nell\'app come bozza');
  await page.selectOption(`select[aria-label="Stato preventivo ${quote.data.number}"]`, 'inviato');
  await page.waitForTimeout(800);
  const blocked = await call(claude, 'update_quote', { quoteId: quote.data.id, notes: 'x' });
  check(blocked.error && blocked.text.includes('bozze'), 'Claude non può modificare un preventivo già inviato');

  // Progetto e attività
  const upd = await call(claude, 'update_project', { projectId, notes: 'Riprese a fine maggio', priority: 'alta' });
  const todo = await call(claude, 'add_todo', { projectId, task: 'Sopralluogo al lago', dueDate: '2026-05-10' });
  check(!upd.error && !todo.error, 'update_project e add_todo riusciti');
  await page.getByRole('tab', { name: /Attività/ }).click();
  await page.getByText('Sopralluogo al lago').waitFor({ timeout: 5000 });
  check(true, 'attività aggiunta da Claude visibile nell\'app');

  // Registro attività
  await nav.getByText('Impostazioni', { exact: true }).click();
  await page.getByText(/Creata la bozza di preventivo/).waitFor({ timeout: 5000 });
  check(await page.getByText(/Modificato il documento/).count() >= 2, 'registro delle azioni di Claude visibile in Impostazioni');

  // Sicurezza: link sbagliato, revoca
  const bad = await fetch(`${APP}/mcp/${'x'.repeat(43)}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' });
  check(bad.status === 401, `link inventato rifiutato (HTTP ${bad.status})`);
  await page.getByRole('button', { name: 'Revoca collegamento' }).click();
  await page.getByText('Nessuno: Claude non ha accesso.').waitFor({ timeout: 5000 });
  let revokedOk = false;
  try { await connect(url); } catch { revokedOk = true; }
  check(revokedOk, 'dopo la revoca il link non funziona più');

  await page.screenshot({ path: path.join(OUT, 'claude-settings.png'), fullPage: true });
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
