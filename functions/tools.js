// Strumenti esposti a Claude tramite MCP.
// Regole di sicurezza:
//   - nessuno strumento elimina dati;
//   - Claude non registra pagamenti e non cambia lo stato dei preventivi (lo fai tu nell'app);
//   - prima di ogni modifica a un documento la versione precedente viene salvata in `revisions`;
//   - ogni scrittura viene registrata in `activity`.
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const WORK = ['preventivo da inviare', 'preventivo inviato', 'in lavorazione', 'consegnato', 'annullato'];
const PRIORITY = ['bassa', 'media', 'alta'];
const KINDS = ['soggetto', 'trattamento', 'sceneggiatura', 'note', 'altro'];
const STAMP_DUTY_THRESHOLD = 77.47;
const STAMP_DUTY_AMOUNT = 2;

const round2 = n => Math.round(n * 100) / 100;
const nowIso = () => new Date().toISOString();
const todayIso = () => new Date().toISOString().slice(0, 10);

const quoteTotals = q => {
  const subtotal = round2((q.items || []).reduce((s, it) => s + (it.quantity || 0) * (it.unitPrice || 0), 0));
  const stampDuty = q.chargeStampDuty && subtotal > STAMP_DUTY_THRESHOLD ? STAMP_DUTY_AMOUNT : 0;
  return { subtotal, stampDuty, total: round2(subtotal + stampDuty) };
};

// Stessa logica dell'app (src/App.tsx, computePaymentStatus)
const computePaymentStatus = (project, total) => {
  const paid = (project.payments || []).reduce((s, p) => s + p.amount, 0);
  if (paid > 0 && paid < total) return 'pagato parzialmente';
  if (paid > 0 && paid >= total) return 'pagato';
  if (project.paymentStatus === 'pagato' || project.paymentStatus === 'pagato parzialmente') return 'fatturato';
  return project.paymentStatus;
};

const text = value => ({ content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] });
const fail = message => ({ isError: true, content: [{ type: 'text', text: message }] });

export function registerTools(server, db, uid) {
  const user = db.collection('users').doc(uid);
  const col = name => user.collection(name);
  const all = async name => (await col(name).get()).docs.map(d => ({ id: d.id, ...d.data() }));
  const one = async (name, id) => {
    const snap = await col(name).doc(id).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  };
  const log = (tool, summary) => col('activity').doc(randomUUID()).set({ at: nowIso(), tool, summary });

  const projectTotal = async project => {
    const todos = (await col('todos').where('projectId', '==', project.id).get()).docs.map(d => d.data());
    return project.value + todos.reduce((s, t) => s + (t.income || 0), 0);
  };

  const describeProject = (p, clientsById, total) => ({
    id: p.id, name: p.name, client: clientsById.get(p.clientId)?.name ?? null, clientId: p.clientId,
    value: p.value, total, paid: (p.payments || []).reduce((s, x) => s + x.amount, 0),
    workStatus: p.workStatus, paymentStatus: p.paymentStatus, priority: p.priority ?? 'media',
    createdAt: p.createdAt, notes: p.notes ?? '',
  });

  const reg = (name, config, handler) => server.registerTool(name, config, async args => {
    try { return await handler(args ?? {}); }
    catch (e) { console.error(name, e); return fail(`Errore: ${e.message}`); }
  });

  const readOnly = { readOnlyHint: true, destructiveHint: false };
  const writes = { readOnlyHint: false, destructiveHint: false };

  // ------------------------------------------------------------------ lettura

  reg('list_clients', { title: 'Elenco clienti', description: 'Elenca i clienti.', annotations: readOnly }, async () => {
    const clients = await all('clients');
    return text(clients.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(({ id, name, email }) => ({ id, name, email: email ?? null })));
  });

  reg('list_projects', {
    title: 'Elenco progetti',
    description: 'Elenca i progetti con cliente, valori economici e stati. Per default solo quelli attivi (non annullati e non consegnati+pagati).',
    inputSchema: {
      filter: z.enum(['attivi', 'tutti', 'conclusi', 'annullati']).optional().describe('Default: attivi'),
      clientId: z.string().optional(),
    },
    annotations: readOnly,
  }, async ({ filter = 'attivi', clientId }) => {
    const [projects, clients, todos] = await Promise.all([all('projects'), all('clients'), all('todos')]);
    const clientsById = new Map(clients.map(c => [c.id, c]));
    const done = p => p.workStatus === 'consegnato' && p.paymentStatus === 'pagato';
    const keep = p => (!clientId || p.clientId === clientId) && (
      filter === 'tutti' ? true :
      filter === 'conclusi' ? done(p) :
      filter === 'annullati' ? p.workStatus === 'annullato' :
      p.workStatus !== 'annullato' && !done(p));
    const incomeBy = new Map();
    todos.forEach(t => incomeBy.set(t.projectId, (incomeBy.get(t.projectId) || 0) + (t.income || 0)));
    return text(projects.filter(keep).map(p => describeProject(p, clientsById, p.value + (incomeBy.get(p.id) || 0))));
  });

  reg('get_project', {
    title: 'Dettaglio progetto',
    description: 'Restituisce un progetto con attività, pagamenti, preventivi ed elenco dei documenti collegati (senza il testo: usa read_document).',
    inputSchema: { projectId: z.string() },
    annotations: readOnly,
  }, async ({ projectId }) => {
    const project = await one('projects', projectId);
    if (!project) return fail('Progetto non trovato.');
    const [client, todos, quotes, documents] = await Promise.all([
      one('clients', project.clientId),
      col('todos').where('projectId', '==', projectId).get(),
      col('quotes').where('projectId', '==', projectId).get(),
      col('documents').where('projectId', '==', projectId).get(),
    ]);
    const clientsById = new Map(client ? [[client.id, client]] : []);
    return text({
      ...describeProject(project, clientsById, await projectTotal(project)),
      payments: project.payments || [],
      todos: todos.docs.map(d => ({ id: d.id, ...d.data() })),
      quotes: quotes.docs.map(d => { const q = d.data(); return { id: d.id, number: q.number, date: q.date, status: q.status, ...quoteTotals(q) }; }),
      documents: documents.docs.map(d => { const x = d.data(); return { id: d.id, title: x.title, kind: x.kind, updatedAt: x.updatedAt, words: (x.content || '').split(/\s+/).filter(Boolean).length }; }),
    });
  });

  reg('list_documents', {
    title: 'Elenco documenti',
    description: 'Elenca i documenti di testo (soggetti, trattamenti, sceneggiature, note). Senza projectId li elenca tutti.',
    inputSchema: { projectId: z.string().optional() },
    annotations: readOnly,
  }, async ({ projectId }) => {
    const q = projectId ? col('documents').where('projectId', '==', projectId) : col('documents');
    const docs = (await q.get()).docs.map(d => { const x = d.data(); return { id: d.id, title: x.title, kind: x.kind, projectId: x.projectId ?? null, updatedAt: x.updatedAt, revision: x.revision }; });
    return text(docs.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')));
  });

  reg('read_document', {
    title: 'Leggi documento',
    description: 'Restituisce titolo, tipo e testo completo (Markdown) di un documento, con il numero di revisione da passare alle modifiche.',
    inputSchema: { documentId: z.string() },
    annotations: readOnly,
  }, async ({ documentId }) => {
    const d = await one('documents', documentId);
    if (!d) return fail('Documento non trovato.');
    return text({ id: d.id, title: d.title, kind: d.kind, projectId: d.projectId ?? null, revision: d.revision, updatedAt: d.updatedAt, updatedBy: d.updatedBy, content: d.content });
  });

  reg('get_quote', {
    title: 'Dettaglio preventivo',
    description: 'Restituisce un preventivo con voci e totali (regime forfettario: senza IVA; marca da bollo da 2 € sopra 77,47 € se addebitata).',
    inputSchema: { quoteId: z.string() },
    annotations: readOnly,
  }, async ({ quoteId }) => {
    const q = await one('quotes', quoteId);
    if (!q) return fail('Preventivo non trovato.');
    return text({ ...q, ...quoteTotals(q) });
  });

  // ---------------------------------------------------------------- scrittura

  reg('create_client', {
    title: 'Crea cliente', description: 'Crea un nuovo cliente.',
    inputSchema: { name: z.string().min(1), email: z.string().email().optional() },
    annotations: writes,
  }, async ({ name, email }) => {
    const clients = await all('clients');
    const id = randomUUID();
    await col('clients').doc(id).set({ name, ...(email ? { email } : {}), order: Math.max(0, ...clients.map(c => c.order ?? 0)) + 1 });
    await log('create_client', `Creato il cliente "${name}"`);
    return text({ id, name });
  });

  reg('create_project', {
    title: 'Crea progetto',
    description: 'Crea un progetto per un cliente esistente. Stato iniziale: "preventivo da inviare", "da fatturare".',
    inputSchema: {
      clientId: z.string(), name: z.string().min(1),
      value: z.number().min(0).optional().describe('Valore in euro, default 0'),
      notes: z.string().optional(), priority: z.enum(PRIORITY).optional(),
    },
    annotations: writes,
  }, async ({ clientId, name, value = 0, notes, priority = 'media' }) => {
    const client = await one('clients', clientId);
    if (!client) return fail('Cliente non trovato.');
    const id = randomUUID();
    await col('projects').doc(id).set({
      clientId, name, value, workStatus: 'preventivo da inviare', paymentStatus: 'da fatturare',
      priority, createdAt: nowIso(), payments: [], ...(notes ? { notes } : {}),
    });
    await log('create_project', `Creato il progetto "${name}" per ${client.name}`);
    return text({ id, name });
  });

  reg('update_project', {
    title: 'Modifica progetto',
    description: 'Modifica nome, valore, note, stato di lavorazione o priorità di un progetto. Non modifica pagamenti né stato di pagamento (si ricalcola da solo se cambia il valore).',
    inputSchema: {
      projectId: z.string(), name: z.string().min(1).optional(), value: z.number().min(0).optional(),
      notes: z.string().optional(), workStatus: z.enum(WORK).optional(), priority: z.enum(PRIORITY).optional(),
    },
    annotations: writes,
  }, async ({ projectId, ...changes }) => {
    const project = await one('projects', projectId);
    if (!project) return fail('Progetto non trovato.');
    const update = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined));
    if (!Object.keys(update).length) return fail('Nessuna modifica indicata.');
    if (update.value !== undefined && (project.payments || []).length) {
      const total = (await projectTotal(project)) - project.value + update.value;
      update.paymentStatus = computePaymentStatus(project, total);
    }
    await col('projects').doc(projectId).update(update);
    await log('update_project', `Modificato il progetto "${project.name}": ${Object.keys(changes).filter(k => changes[k] !== undefined).join(', ')}`);
    return text({ id: projectId, ...update });
  });

  reg('add_todo', {
    title: 'Aggiungi attività', description: 'Aggiunge un\'attività (to-do) a un progetto.',
    inputSchema: {
      projectId: z.string(), task: z.string().min(1),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('YYYY-MM-DD'),
      income: z.number().min(0).optional().describe('Incasso aggiuntivo in euro, default 0'),
    },
    annotations: writes,
  }, async ({ projectId, task, dueDate, income = 0 }) => {
    const project = await one('projects', projectId);
    if (!project) return fail('Progetto non trovato.');
    const todos = await all('todos');
    const id = randomUUID();
    await col('todos').doc(id).set({ projectId, task, income, completed: false, ...(dueDate ? { dueDate } : {}), order: Math.max(0, ...todos.map(t => t.order ?? 0)) + 1 });
    await log('add_todo', `Aggiunta l'attività "${task}" a "${project.name}"`);
    return text({ id, task });
  });

  reg('update_todo', {
    title: 'Modifica attività', description: 'Modifica testo, scadenza, incasso o completamento di un\'attività.',
    inputSchema: {
      todoId: z.string(), task: z.string().min(1).optional(), completed: z.boolean().optional(),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), income: z.number().min(0).optional(),
    },
    annotations: writes,
  }, async ({ todoId, ...changes }) => {
    const todo = await one('todos', todoId);
    if (!todo) return fail('Attività non trovata.');
    const update = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined));
    if (!Object.keys(update).length) return fail('Nessuna modifica indicata.');
    await col('todos').doc(todoId).update(update);
    await log('update_todo', `Modificata l'attività "${todo.task}"`);
    return text({ id: todoId, ...update });
  });

  reg('create_document', {
    title: 'Crea documento',
    description: 'Crea un documento di testo in Markdown (soggetto, trattamento, sceneggiatura, note). Può essere legato a un progetto.',
    inputSchema: {
      title: z.string().min(1), kind: z.enum(KINDS), content: z.string(),
      projectId: z.string().optional(),
    },
    annotations: writes,
  }, async ({ title, kind, content, projectId }) => {
    if (projectId && !(await one('projects', projectId))) return fail('Progetto non trovato.');
    const id = randomUUID();
    const now = nowIso();
    await col('documents').doc(id).set({ title, kind, content, projectId: projectId ?? null, createdAt: now, updatedAt: now, updatedBy: 'claude', revision: 1 });
    await log('create_document', `Creato il documento "${title}"`);
    return text({ id, title, revision: 1 });
  });

  // Modifica con controllo di concorrenza: se il documento è cambiato dopo la lettura, non sovrascrive.
  const modifyDocument = async (tool, documentId, expectedRevision, mutate) => {
    const ref = col('documents').doc(documentId);
    return db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) return fail('Documento non trovato.');
      const current = snap.data();
      if (expectedRevision !== undefined && current.revision !== expectedRevision) {
        return fail(`Il documento è stato modificato (revisione attuale ${current.revision}, attesa ${expectedRevision}). Rileggilo con read_document prima di modificarlo.`);
      }
      const result = mutate(current);
      if (result.error) return fail(result.error);
      const revision = (current.revision || 0) + 1;
      tx.set(col('revisions').doc(randomUUID()), {
        documentId, title: current.title, content: current.content, revision: current.revision || 0,
        savedAt: nowIso(), reason: 'Prima della modifica di Claude',
      });
      tx.update(ref, { ...result.update, revision, updatedAt: nowIso(), updatedBy: 'claude' });
      tx.set(col('activity').doc(randomUUID()), { at: nowIso(), tool, summary: `Modificato il documento "${result.update.title ?? current.title}"${result.detail ? ': ' + result.detail : ''}` });
      return text({ id: documentId, revision, ...(result.detail ? { changes: result.detail } : {}) });
    });
  };

  reg('update_document', {
    title: 'Riscrivi documento',
    description: 'Sostituisce titolo, tipo, progetto e/o l\'intero testo di un documento. Per modifiche puntuali preferisci edit_document. La versione precedente resta recuperabile dall\'app.',
    inputSchema: {
      documentId: z.string(), expectedRevision: z.number().int().optional().describe('Revisione letta con read_document; se non corrisponde la modifica viene rifiutata'),
      title: z.string().min(1).optional(), kind: z.enum(KINDS).optional(), content: z.string().optional(),
      projectId: z.string().nullable().optional(),
    },
    annotations: writes,
  }, async ({ documentId, expectedRevision, ...changes }) => {
    if (changes.projectId && !(await one('projects', changes.projectId))) return fail('Progetto non trovato.');
    return modifyDocument('update_document', documentId, expectedRevision, () => {
      const update = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined));
      if (!Object.keys(update).length) return { error: 'Nessuna modifica indicata.' };
      return { update, detail: Object.keys(update).join(', ') };
    });
  });

  reg('edit_document', {
    title: 'Modifica parti di un documento',
    description: 'Applica sostituzioni puntuali al testo: ogni "find" deve comparire esattamente una volta. Con find vuoto, "replace" viene aggiunto in fondo al testo. Tutte o nessuna.',
    inputSchema: {
      documentId: z.string(), expectedRevision: z.number().int().optional(),
      edits: z.array(z.object({ find: z.string(), replace: z.string() })).min(1),
    },
    annotations: writes,
  }, async ({ documentId, expectedRevision, edits }) =>
    modifyDocument('edit_document', documentId, expectedRevision, current => {
      let content = current.content || '';
      for (const [i, { find, replace }] of edits.entries()) {
        if (find === '') { content = content ? `${content}\n\n${replace}` : replace; continue; }
        const count = content.split(find).length - 1;
        if (count !== 1) return { error: `Modifica ${i + 1}: il testo da trovare compare ${count} volte (deve comparire esattamente una volta). Nessuna modifica applicata.` };
        content = content.replace(find, () => replace);
      }
      return { update: { content }, detail: `${edits.length} ${edits.length === 1 ? 'modifica' : 'modifiche'}` };
    }));

  const itemSchema = z.object({
    description: z.string().min(1), quantity: z.number().positive().default(1), unitPrice: z.number().min(0),
  });

  reg('create_quote', {
    title: 'Crea bozza di preventivo',
    description: 'Crea un preventivo in stato "bozza" per un progetto (regime forfettario: niente IVA). Numero progressivo automatico. Lo invio e l\'accettazione si fanno nell\'app.',
    inputSchema: {
      projectId: z.string(), items: z.array(itemSchema).min(1),
      notes: z.string().optional(), validityDays: z.number().int().positive().optional(),
      chargeStampDuty: z.boolean().optional().describe('Addebita la marca da bollo (default sì)'),
      recipient: z.string().optional().describe('Intestatario; default nome ed email del cliente'),
    },
    annotations: writes,
  }, async ({ projectId, items, notes, validityDays = 30, chargeStampDuty = true, recipient }) => {
    const project = await one('projects', projectId);
    if (!project) return fail('Progetto non trovato.');
    const client = await one('clients', project.clientId);
    const date = todayIso();
    const year = date.slice(0, 4);
    const quotes = await all('quotes');
    const max = quotes.reduce((m, q) => { const x = (q.number || '').match(new RegExp(`^${year}-(\\d+)$`)); return x ? Math.max(m, Number(x[1])) : m; }, 0);
    const number = `${year}-${String(max + 1).padStart(3, '0')}`;
    const id = randomUUID();
    const quote = {
      projectId, number, date, validityDays, status: 'bozza',
      recipient: recipient ?? [client?.name, client?.email].filter(Boolean).join('\n'),
      items: items.map(it => ({ id: randomUUID(), description: it.description, quantity: it.quantity ?? 1, unitPrice: it.unitPrice })),
      ...(notes ? { notes } : {}), chargeStampDuty, createdAt: nowIso(),
    };
    await col('quotes').doc(id).set(quote);
    await log('create_quote', `Creata la bozza di preventivo ${number} per "${project.name}"`);
    return text({ id, number, ...quoteTotals(quote) });
  });

  reg('update_quote', {
    title: 'Modifica bozza di preventivo',
    description: 'Modifica voci, note, validità, marca da bollo o intestatario di un preventivo. Solo per preventivi in stato "bozza".',
    inputSchema: {
      quoteId: z.string(), items: z.array(itemSchema).min(1).optional(),
      notes: z.string().optional(), validityDays: z.number().int().positive().optional(),
      chargeStampDuty: z.boolean().optional(), recipient: z.string().optional(),
    },
    annotations: writes,
  }, async ({ quoteId, items, ...rest }) => {
    const quote = await one('quotes', quoteId);
    if (!quote) return fail('Preventivo non trovato.');
    if (quote.status !== 'bozza') return fail(`Il preventivo ${quote.number} è in stato "${quote.status}": si possono modificare solo le bozze. Puoi crearne una nuova versione con create_quote.`);
    const update = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
    if (items) update.items = items.map(it => ({ id: randomUUID(), description: it.description, quantity: it.quantity ?? 1, unitPrice: it.unitPrice }));
    if (!Object.keys(update).length) return fail('Nessuna modifica indicata.');
    await col('quotes').doc(quoteId).update(update);
    await log('update_quote', `Modificata la bozza di preventivo ${quote.number}`);
    return text({ id: quoteId, number: quote.number, ...quoteTotals({ ...quote, ...update }) });
  });
}
