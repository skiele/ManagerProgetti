// Test end-to-end della migrazione e del nuovo layer dati, contro gli emulatori Firebase.
// Uso: avvia emulatori e app (vedi README, sezione emulatori), poi: node tests/migration.e2e.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const FS = 'http://127.0.0.1:8080/v1/projects/progetta-800ca/databases/(default)/documents';
const APP = process.env.APP_URL || 'http://127.0.0.1:5173';
const OUT = require('os').tmpdir();

let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failures++; };

// --- conversione JSON <-> valori REST Firestore ---
const toV = v => {
  if (v === null) return { nullValue: null };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toV) } };
  if (typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toV(x)])) } };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  return { stringValue: v };
};
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

const admin = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const getDoc = async p => { const r = await fetch(`${FS}/${p}`, { headers: admin }); return r.ok ? docFields(await r.json()) : null; };
const listCol = async p => {
  const r = await fetch(`${FS}/${p}?pageSize=300`, { headers: admin });
  const j = await r.json();
  return Object.fromEntries((j.documents || []).map(d => [d.name.split('/').pop(), docFields(d)]));
};
const putDoc = (p, obj, headers = admin) => fetch(`${FS}/${p}`, {
  method: 'PATCH', headers, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toV(v)])) }),
});
const signUp = async (email, password) => {
  const r = await fetch(`${AUTH}/accounts:signUp?key=fake`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
  return r.json();
};

const legacy = {
  clients: [{ id: 'c1', name: 'Alfa Film' }, { id: 'c2', name: 'Beta Srl', email: 'b@b.it' }],
  projects: [
    { id: 'p1', clientId: 'c1', name: 'Spot TV', value: 1000, status: 'attesa di pagamento', createdAt: '2025-01-10T10:00:00.000Z', notes: 'nota', payments: [{ id: 'pay1', amount: 300, date: '2025-02-01' }] },
    { id: 'p2', clientId: 'c1', name: 'Videoclip', value: 2000, workStatus: 'in lavorazione', paymentStatus: 'da fatturare', priority: 'alta', createdAt: '2025-03-01T10:00:00.000Z', payments: [] },
    { id: 'p3', clientId: 'c2', name: 'Corporate', value: 500, workStatus: 'preventivo inviato', paymentStatus: 'da fatturare', priority: 'bassa', createdAt: '2025-04-01T10:00:00.000Z' },
  ],
  todos: [
    { id: 't1', projectId: 'p1', task: 'Montaggio', income: 200, completed: false, dueDate: '2025-02-10' },
    { id: 't2', projectId: 'p2', task: 'Riprese', income: 0, completed: true, order: 5 },
    { id: 't3', projectId: 'p3', task: 'Sopralluogo', income: 0, completed: false },
  ],
};

(async () => {
  const email = `legacy${Date.now()}@test.it`, password = 'password123';
  const user = await signUp(email, password);
  const uid = user.localId;
  // Documento nel VECCHIO formato (scritto come admin: le nuove regole non lo permetterebbero)
  await putDoc(`users/${uid}`, legacy);

  const browser = await chromium.launch();
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  page.on('dialog', d => d.accept());
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(String(e)));

  // 1. Login -> migrazione
  await page.goto(APP);
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type=submit]');
  await page.getByRole('heading', { name: 'Dashboard' }).waitFor({ timeout: 20000 });

  const cardValue = async label => page.locator('p', { hasText: label }).first().locator('xpath=following-sibling::p[1]').innerText();
  const norm = s => s.replace(/\s/g, ' ');
  check(norm(await cardValue('Incassato totale')) === '300 €', `dashboard Incassato = 300 (got ${await cardValue('Incassato totale')})`);
  check(norm(await cardValue('Da incassare')) === '2.900 €', `dashboard Da incassare = 2.900 (got ${await cardValue('Da incassare')})`);
  check(norm(await cardValue('In preventivo')) === '500 €', `dashboard In preventivo = 500 (got ${await cardValue('In preventivo')})`);
  await page.screenshot({ path: path.join(OUT, 'shot-dashboard.png') });

  const userDoc = await getDoc(`users/${uid}`);
  check(userDoc.schemaVersion === 2, 'documento utente marcato schemaVersion 2');
  check(Array.isArray(userDoc.clients) && userDoc.clients.length === 2 && userDoc.projects.length === 3 && userDoc.todos.length === 3, 'array legacy conservati come backup');
  let clients = await listCol(`users/${uid}/clients`);
  let projects = await listCol(`users/${uid}/projects`);
  let todos = await listCol(`users/${uid}/todos`);
  check(Object.keys(clients).length === 2 && Object.keys(projects).length === 3 && Object.keys(todos).length === 3, 'sottocollezioni: 2 clienti, 3 progetti, 3 attività');
  check(clients.c1.order === 0 && clients.c2.order === 1, 'ordine clienti preservato');
  check(projects.p1.workStatus === 'consegnato' && projects.p1.paymentStatus === 'fatturato' && projects.p1.priority === 'media' && !('status' in projects.p1), 'stato legacy di p1 convertito');
  check(projects.p1.payments.length === 1 && projects.p1.payments[0].amount === 300 && projects.p1.notes === 'nota', 'pagamenti e note di p1 preservati');
  check(!('id' in projects.p1), 'id non duplicato dentro il documento');
  check(todos.t2.order === 5 && todos.t1.dueDate === '2025-02-10' && !('order' in todos.t3), 'campi delle attività preservati senza aggiunte');

  // 2. Il form non si svuota quando arrivano aggiornamenti (bug precedente)
  await page.click('button[aria-label="Aggiungi Cliente"]');
  await page.fill('input[placeholder="Nome Cliente"]', 'Gamma Studio');
  await putDoc(`users/${uid}/todos/t3`, { projectId: 'p3', task: 'Sopralluogo (modificato altrove)', income: 0, completed: false });
  await page.waitForTimeout(1500);
  check(await page.inputValue('input[placeholder="Nome Cliente"]') === 'Gamma Studio', 'il testo nel form resta dopo un aggiornamento remoto');
  await page.click('form button[type=submit]');
  await page.waitForTimeout(1500);
  clients = await listCol(`users/${uid}/clients`);
  const gamma = Object.values(clients).find(c => c.name === 'Gamma Studio');
  check(!!gamma && gamma.order === 2, 'nuovo cliente salvato come documento con order 2');

  // 3. Pagamento su Spot TV -> stato Pagato
  await page.getByRole('navigation').getByText('Alfa Film', { exact: true }).click();
  await page.click('button[aria-label="Apri progetto Spot TV"]');
  await page.getByRole('tab', { name: /Pagamenti/ }).click();
  await page.getByRole('button', { name: 'Aggiungi pagamento' }).click();
  await page.fill('input[placeholder="Importo Pagamento (€)"]', '900');
  await page.click('form button[type=submit]');
  await page.waitForTimeout(1500);
  projects = await listCol(`users/${uid}/projects`);
  check(projects.p1.payments.length === 2 && projects.p1.paymentStatus === 'pagato', 'pagamento aggiunto e stato -> pagato');
  check(projects.p2.name === 'Videoclip' && projects.p3.value === 500, 'gli altri progetti non sono stati toccati');

  // 4. Ricarica: nessuna ri-migrazione, i dati nuovi restano
  await page.reload();
  await page.getByRole('heading', { name: 'Dashboard' }).waitFor({ timeout: 20000 });
  check(norm(await cardValue('Incassato totale')) === '1.200 €', `dopo il reload Incassato = 1.200 (got ${await cardValue('Incassato totale')})`);
  projects = await listCol(`users/${uid}/projects`);
  check(projects.p1.payments.length === 2, 'il reload non ha riapplicato i vecchi array');

  // 5. Eliminazione progetto con le sue attività
  await page.getByRole('navigation').getByText('Alfa Film', { exact: true }).click();
  await page.click('button[aria-label="Apri progetto Videoclip"]');
  await page.click('button[aria-label="Elimina progetto Videoclip"]');
  await page.waitForTimeout(1500);
  projects = await listCol(`users/${uid}/projects`);
  todos = await listCol(`users/${uid}/todos`);
  check(!projects.p2 && !todos.t2 && !!projects.p1 && !!todos.t1, 'progetto p2 e attività t2 eliminati, il resto intatto');

  // 6. Regole di sicurezza
  const login = await (await fetch(`${AUTH}/accounts:signInWithPassword?key=fake`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) })).json();
  const asUser = { Authorization: `Bearer ${login.idToken}`, 'Content-Type': 'application/json' };
  const oldAppWrite = await putDoc(`users/${uid}`, { clients: [], projects: [], todos: [] }, asUser);
  check(oldAppWrite.status === 403, `vecchia app che riscrive il documento utente: bloccata (HTTP ${oldAppWrite.status})`);
  const intruder = await signUp(`intruder${Date.now()}@test.it`, password);
  const asIntruder = { Authorization: `Bearer ${intruder.idToken}` };
  const steal = await fetch(`${FS}/users/${uid}/projects/p1`, { headers: asIntruder });
  check(steal.status === 403, `altro utente che legge i tuoi progetti: bloccato (HTTP ${steal.status})`);
  const ownWrite = await putDoc(`users/${uid}/clients/cX`, { name: 'Test regola', order: 9 }, asUser);
  check(ownWrite.status === 200, `il proprietario può scrivere nelle sottocollezioni (HTTP ${ownWrite.status})`);
  await fetch(`${FS}/users/${uid}/clients/cX`, { method: 'DELETE', headers: admin });

  // 7. Backup: export, poi import di una versione senza il cliente c2
  await page.getByRole('navigation').getByText('Impostazioni', { exact: true }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Esporta Backup' }).click()]);
  const backupPath = path.join(OUT, 'backup.json');
  await download.saveAs(backupPath);
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  check(backup.clients.length === 3 && backup.projects.length === 2 && backup.todos.length === 2, 'export contiene 3 clienti, 2 progetti, 2 attività');
  const reduced = { clients: backup.clients.filter(c => c.id !== 'c2'), projects: backup.projects.filter(p => p.id !== 'p3'), todos: backup.todos.filter(t => t.id !== 't3') };
  const reducedPath = path.join(OUT, 'backup-reduced.json');
  fs.writeFileSync(reducedPath, JSON.stringify(reduced));
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Importa da Backup' }).click()]);
  await chooser.setFiles(reducedPath);
  await page.waitForTimeout(3000);
  clients = await listCol(`users/${uid}/clients`);
  projects = await listCol(`users/${uid}/projects`);
  todos = await listCol(`users/${uid}/todos`);
  check(!clients.c2 && !projects.p3 && !todos.t3 && !!clients.c1 && !!projects.p1 && !!todos.t1, 'import: rimossi gli elementi assenti dal backup, mantenuti gli altri');
  check(!(await page.getByRole('navigation').getByText('Beta Srl').count()), 'la barra laterale si aggiorna da sola dopo l\'import');

  // 8. Registrazione di un nuovo utente dall'interfaccia
  await page.click('button[aria-label="Esci"]');
  await page.getByRole('button', { name: 'Registrati' }).click();
  const newEmail = `nuovo${Date.now()}@test.it`;
  await page.fill('#email', newEmail);
  await page.fill('#password', password);
  await page.fill('#confirm-password', password);
  await page.click('button[type=submit]');
  await page.getByRole('heading', { name: 'Dashboard' }).waitFor({ timeout: 20000 });
  await page.click('button[aria-label="Aggiungi Cliente"]');
  await page.fill('input[placeholder="Nome Cliente"]', 'Primo Cliente');
  await page.click('form button[type=submit]');
  await page.getByRole('navigation').getByText('Primo Cliente').waitFor({ timeout: 5000 });
  const newLogin = await (await fetch(`${AUTH}/accounts:signInWithPassword?key=fake`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: newEmail, password, returnSecureToken: true }) })).json();
  const newDoc = await getDoc(`users/${newLogin.localId}`);
  const newClients = await listCol(`users/${newLogin.localId}/clients`);
  check(newDoc && newDoc.schemaVersion === 2 && !('clients' in newDoc), 'nuovo utente: documento creato direttamente nel nuovo formato');
  check(Object.values(newClients).some(c => c.name === 'Primo Cliente'), 'nuovo utente: primo cliente salvato');

  const relevantErrors = consoleErrors.filter(e => !/favicon|index\.css|404/.test(e));
  check(relevantErrors.length === 0, `nessun errore nella console del browser${relevantErrors.length ? ': ' + relevantErrors.join(' | ') : ''}`);

  await browser.close();
  console.log(failures ? `\n${failures} controlli FALLITI` : '\nTutti i controlli superati');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
