import { auth, db } from '../firebaseConfig';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  deleteDoc,
  DocumentReference,
  DocumentData,
  WriteBatch,
} from "firebase/firestore";
import { AppData, BusinessProfile, Client, ClaudeActivity, DocumentRevision, Project, Quote, Shot, ShotImage, Shotlist, TextDocument, Todo, WorkStatus, PaymentStatus, ProjectPriority } from '../types';

/*
 * Struttura dati (schemaVersion 2):
 *
 *   users/{uid}                  -> { schemaVersion: 2, ... }  (metadati; i vecchi array restano come backup)
 *   users/{uid}/clients/{id}     -> Client
 *   users/{uid}/projects/{id}    -> Project (i pagamenti restano annidati nel progetto)
 *   users/{uid}/todos/{id}       -> Todo
 *   users/{uid}/quotes/{id}      -> Quote (preventivi, legati a un progetto)
 *   users/{uid}/documents/{id}   -> TextDocument (soggetti, trattamenti, note: testo Markdown)
 *   users/{uid}/revisions/{id}   -> DocumentRevision (versioni precedenti dei documenti)
 *   users/{uid}/shotlists/{id}   -> Shotlist (storyboard di un progetto)
 *   users/{uid}/shots/{id}       -> Shot (inquadrature)
 *   users/{uid}/shotImages/{id}  -> ShotImage (immagine dell'inquadratura, JPEG ridotto; non incluso nei backup)
 *   users/{uid}/activity/{id}    -> ClaudeActivity (registro delle azioni di Claude)
 *   mcpTokens/{sha256}           -> { uid } collegamenti del connettore Claude (solo l'hash del segreto)
 *   users/{uid}/settings/profile -> BusinessProfile (dati di chi emette i preventivi)
 *
 * Ogni modifica scrive SOLO il documento interessato: niente più riscrittura dell'intero stato,
 * niente limite di 1 MiB sul totale dei dati, niente sovrascritture con stato obsoleto.
 */

export const SCHEMA_VERSION = 2;
export type CollectionName = 'clients' | 'projects' | 'todos' | 'quotes' | 'documents' | 'revisions' | 'shotlists' | 'shots' | 'shotImages';
type DataKey = keyof AppData;
const COLLECTIONS: DataKey[] = ['clients', 'projects', 'todos', 'quotes', 'documents', 'shotlists', 'shots'];

const userDocRef = (uid: string) => doc(db, 'users', uid);
const colRef = (uid: string, name: CollectionName | 'activity') => collection(db, 'users', uid, name);
export const entityRef = (uid: string, name: CollectionName, id: string) => doc(db, 'users', uid, name, id);

// Firestore accetta al massimo 500 operazioni per batch: spezza le scritture in blocchi.
// NB: i blocchi non sono atomici tra loro, quindi va usato solo per operazioni idempotenti.
class ChunkedBatch {
  private ops: ((b: WriteBatch) => void)[] = [];
  set(ref: DocumentReference, data: DocumentData) { this.ops.push(b => b.set(ref, data)); }
  update(ref: DocumentReference, data: DocumentData) { this.ops.push(b => b.update(ref, data)); }
  delete(ref: DocumentReference) { this.ops.push(b => b.delete(ref)); }
  async commit() {
    for (let i = 0; i < this.ops.length; i += 400) {
      const batch = writeBatch(db);
      this.ops.slice(i, i + 400).forEach(op => op(batch));
      await batch.commit();
    }
  }
}

// Rimuove `id` dal payload: l'id è già il nome del documento.
const withoutId = <T extends { id: string }>(entity: T) => {
  const { id, ...rest } = entity;
  return rest;
};

// --- Normalizzazione dei progetti (formati legacy) ---

const mapOldStatus = (oldStatus: string) => {
    switch (oldStatus) {
        case 'preventivo da inviare': return { workStatus: WorkStatus.PreventivoDaInviare, paymentStatus: PaymentStatus.DaFatturare };
        case 'preventivo inviato': return { workStatus: WorkStatus.PreventivoInviato, paymentStatus: PaymentStatus.DaFatturare };
        case 'preventivo accettato': return { workStatus: WorkStatus.InLavorazione, paymentStatus: PaymentStatus.DaFatturare };
        case 'progetto consegnato': return { workStatus: WorkStatus.Consegnato, paymentStatus: PaymentStatus.DaFatturare };
        case 'attesa di pagamento': return { workStatus: WorkStatus.Consegnato, paymentStatus: PaymentStatus.Fatturato };
        case 'pagato': return { workStatus: WorkStatus.Consegnato, paymentStatus: PaymentStatus.Pagato };
        default: return { workStatus: WorkStatus.PreventivoDaInviare, paymentStatus: PaymentStatus.DaFatturare };
    }
};

const normalizeProject = (project: any): Project => {
  let migrated: any = { ...project };
  if (typeof project.status === 'string' && typeof project.workStatus === 'undefined') {
    const { status: oldStatus, ...rest } = project;
    migrated = { ...rest, ...mapOldStatus(oldStatus) };
  }
  if (typeof migrated.priority === 'undefined') {
    migrated.priority = ProjectPriority.Media;
  }
  return migrated as Project;
};

const isEntity = (x: any): boolean => !!x && typeof x === 'object' && typeof x.id === 'string' && x.id.length > 0;

const sortClients = (clients: Client[]) =>
  [...clients].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
const sortProjects = (projects: Project[]) =>
  [...projects].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
const sortTodos = (todos: Todo[]) =>
  [...todos].sort((a, b) =>
    (a.order ?? 0) - (b.order ?? 0) ||
    (a.dueDate || '').localeCompare(b.dueDate || '') ||
    a.task.localeCompare(b.task));
const sortQuotes = (quotes: Quote[]) =>
  [...quotes].sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number));

const sorters: { [K in DataKey]: (items: any[]) => AppData[K] } = {
  clients: sortClients,
  projects: (items) => sortProjects(items.map(normalizeProject)),
  todos: sortTodos,
  quotes: sortQuotes,
  documents: (items: TextDocument[]) => [...items].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
  shotlists: (items: Shotlist[]) => [...items].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')),
  shots: (items: Shot[]) => [...items].sort((a, b) => a.order - b.order),
};

// --- Scrittura di un insieme completo di dati nelle sottocollezioni ---

const writeCollection = (batch: ChunkedBatch, uid: string, name: DataKey, items: any[]) => {
  items.filter(isEntity).forEach((item, i) => {
    let data: any = item;
    if (name === 'clients') data = { ...item, order: item.order ?? i };
    if (name === 'projects') data = normalizeProject(item);
    batch.set(entityRef(uid, name, item.id), withoutId(data));
  });
};

const writeAll = (batch: ChunkedBatch, uid: string, data: AppData) =>
  COLLECTIONS.forEach(name => writeCollection(batch, uid, name, data[name]));

const asArrays = (raw: any): AppData => ({
  clients: Array.isArray(raw?.clients) ? raw.clients : [],
  projects: Array.isArray(raw?.projects) ? raw.projects : [],
  todos: Array.isArray(raw?.todos) ? raw.todos : [],
  quotes: Array.isArray(raw?.quotes) ? raw.quotes : [],
  documents: Array.isArray(raw?.documents) ? raw.documents : [],
  shotlists: Array.isArray(raw?.shotlists) ? raw.shotlists : [],
  shots: Array.isArray(raw?.shots) ? raw.shots : [],
});

/**
 * Migra i dati dal vecchio formato (un unico documento users/{uid} con tre array) alle sottocollezioni.
 * - Non distruttiva: gli array originali restano nel documento utente come backup.
 * - Idempotente: gli id sono preservati, quindi se si interrompe può essere ripetuta senza duplicati.
 * - Il flag schemaVersion viene scritto solo DOPO che tutte le entità sono state salvate.
 */
export const ensureMigrated = async (uid: string): Promise<void> => {
  const snap = await getDoc(userDocRef(uid));
  const raw = snap.exists() ? snap.data() : null;

  if (raw && (raw.schemaVersion ?? 1) >= SCHEMA_VERSION) return;

  if (raw) {
    const legacy = asArrays(raw);
    const batch = new ChunkedBatch();
    writeAll(batch, uid, legacy);
    await batch.commit();
    console.log(`Migrazione completata: ${legacy.clients.length} clienti, ${legacy.projects.length} progetti, ${legacy.todos.length} attività.`);
  }

  await setDoc(userDocRef(uid), {
    schemaVersion: SCHEMA_VERSION,
    ...(raw ? { migratedAt: new Date().toISOString() } : {}),
  }, { merge: true });
};

/**
 * Ascolta in tempo reale le tre collezioni. La callback riceve i dati solo quando
 * tutte e tre hanno risposto almeno una volta. Le scritture locali vengono notificate
 * subito (anche offline), quindi questo è l'unico "stato" dell'app.
 */
export const subscribeUserData = (
  uid: string,
  onData: (data: AppData) => void,
  onError: (error: Error) => void,
): (() => void) => {
  const state: Partial<AppData> = {};
  const emit = () => {
    if (COLLECTIONS.every(name => state[name])) onData({ ...state } as AppData);
  };

  const unsubscribers = COLLECTIONS.map(name =>
    onSnapshot(colRef(uid, name), snap => {
      const docs = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      (state as any)[name] = sorters[name](docs);
      emit();
    }, onError)
  );

  return () => unsubscribers.forEach(u => u());
};

// --- Scritture puntuali ---

export const saveEntity = <T extends { id: string }>(uid: string, name: CollectionName, entity: T) =>
  setDoc(entityRef(uid, name, entity.id), withoutId(entity));

export const updateEntity = (uid: string, name: CollectionName, id: string, data: DocumentData) =>
  updateDoc(entityRef(uid, name, id), data);

export type BatchOp =
  | { type: 'set'; name: CollectionName; entity: { id: string } }
  | { type: 'update'; name: CollectionName; id: string; data: DocumentData }
  | { type: 'delete'; name: CollectionName; id: string };

/** Più scritture atomiche (tutte o nessuna). Max 500 operazioni. */
export const commitOps = (uid: string, ops: BatchOp[]) => {
  if (ops.length > 500) throw new Error('Troppe operazioni in un singolo batch.');
  const batch = writeBatch(db);
  ops.forEach(op => {
    if (op.type === 'set') batch.set(entityRef(uid, op.name, op.entity.id), withoutId(op.entity));
    if (op.type === 'update') batch.update(entityRef(uid, op.name, op.id), op.data);
    if (op.type === 'delete') batch.delete(entityRef(uid, op.name, op.id));
  });
  return batch.commit();
};

// --- Backup ---

export type BackupData = AppData & { profile?: BusinessProfile | null };

export const exportData = async (uid: string): Promise<BackupData> => {
  const lists = await Promise.all(COLLECTIONS.map(async name => {
    const snap = await getDocs(colRef(uid, name));
    return sorters[name](snap.docs.map(d => ({ ...d.data(), id: d.id })));
  }));
  const data = Object.fromEntries(COLLECTIONS.map((name, i) => [name, lists[i]])) as AppData;
  const profile = await getDoc(profileRef(uid));
  return { ...data, profile: profile.exists() ? (profile.data() as BusinessProfile) : null };
};

/**
 * Sostituisce i dati con quelli del backup.
 * - Vengono toccate solo le collezioni presenti nel file: un backup vecchio senza preventivi
 *   non cancella i preventivi esistenti.
 * - Prima scrive tutte le entità importate, poi elimina quelle che non sono nel backup:
 *   se l'operazione si interrompe a metà non si perde nulla, al massimo restano elementi in più.
 */
export const importData = async (uid: string, raw: any): Promise<void> => {
  const present = COLLECTIONS.filter(name => Array.isArray(raw?.[name]));
  const current = await exportData(uid);

  const batch = new ChunkedBatch();
  present.forEach(name => writeCollection(batch, uid, name, raw[name]));
  if (raw?.profile && typeof raw.profile === 'object') batch.set(profileRef(uid), raw.profile);
  await batch.commit();

  const cleanup = new ChunkedBatch();
  present.forEach(name => {
    const keep = new Set((raw[name] as any[]).filter(isEntity).map(e => e.id));
    (current[name] as { id: string }[]).forEach(e => {
      if (!keep.has(e.id)) cleanup.delete(entityRef(uid, name, e.id));
    });
  });
  await cleanup.commit();
};

// --- Versioni dei documenti ---

export const listRevisions = async (uid: string, documentId: string): Promise<DocumentRevision[]> => {
  const snap = await getDocs(query(colRef(uid, 'revisions'), where('documentId', '==', documentId)));
  return snap.docs
    .map(d => ({ ...d.data(), id: d.id }) as DocumentRevision)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
};

// --- Immagini delle inquadrature (caricate solo nella pagina della storyboard) ---

export const subscribeShotImages = (uid: string, shotlistId: string, onImages: (images: Map<string, string>) => void, onError: (e: Error) => void) =>
  onSnapshot(query(colRef(uid, 'shotImages'), where('shotlistId', '==', shotlistId)), snap =>
    onImages(new Map(snap.docs.map(d => [d.id, (d.data() as ShotImage).dataUrl]))), onError);

export const listShotImageIds = async (uid: string, shotlistId: string): Promise<string[]> =>
  (await getDocs(query(colRef(uid, 'shotImages'), where('shotlistId', '==', shotlistId)))).docs.map(d => d.id);

// --- Connettore Claude ---

const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const sha256Hex = async (text: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
};

export interface ClaudeLink { id: string; label: string; createdAt: string }
export type LinkKind = 'mcpTokens' | 'calendarTokens';

/** Crea un nuovo segreto (Claude o calendario). Su Firestore viene salvato solo l'hash. */
export const createLink = async (kind: LinkKind, uid: string, label: string): Promise<string> => {
  const token = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  await setDoc(doc(db, kind, await sha256Hex(token)), { uid, label, createdAt: new Date().toISOString() });
  return token;
};

export const subscribeLinks = (kind: LinkKind, uid: string, onLinks: (links: ClaudeLink[]) => void, onError: (e: Error) => void) =>
  onSnapshot(query(collection(db, kind), where('uid', '==', uid)), snap =>
    onLinks(snap.docs.map(d => ({ id: d.id, label: d.data().label, createdAt: d.data().createdAt }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))), onError);

export const revokeLink = (kind: LinkKind, id: string) => deleteDoc(doc(db, kind, id));

// Nomi storici, usati dalla sezione Claude
export const createClaudeLink = (uid: string, label: string) => createLink('mcpTokens', uid, label);
export const subscribeClaudeLinks = (uid: string, onLinks: (links: ClaudeLink[]) => void, onError: (e: Error) => void) => subscribeLinks('mcpTokens', uid, onLinks, onError);
export const revokeClaudeLink = (id: string) => revokeLink('mcpTokens', id);

export const subscribeClaudeActivity = (uid: string, onItems: (items: ClaudeActivity[]) => void, onError: (e: Error) => void) =>
  onSnapshot(query(colRef(uid, 'activity'), orderBy('at', 'desc'), limit(30)), snap =>
    onItems(snap.docs.map(d => ({ ...d.data(), id: d.id }) as ClaudeActivity)), onError);

// --- Profilo (dati di chi emette i preventivi) ---

const profileRef = (uid: string) => doc(db, 'users', uid, 'settings', 'profile');

export const subscribeProfile = (uid: string, onProfile: (p: BusinessProfile | null) => void, onError: (e: Error) => void) =>
  onSnapshot(profileRef(uid), snap => onProfile(snap.exists() ? (snap.data() as BusinessProfile) : null), onError);

export const saveProfile = (uid: string, profile: BusinessProfile) => setDoc(profileRef(uid), profile);

// --- Autenticazione ---

// Migra eventuali dati di una versione molto vecchia salvati in localStorage.
const migrateLegacyDataFromLocalStorage = async (uid: string): Promise<boolean> => {
    const legacyClients = localStorage.getItem('clients');
    const legacyProjects = localStorage.getItem('projects');
    const legacyTodos = localStorage.getItem('todos');

    if (!(legacyClients && legacyProjects && legacyTodos)) return false;

    try {
        const data = asArrays({
          clients: JSON.parse(legacyClients),
          projects: JSON.parse(legacyProjects),
          todos: JSON.parse(legacyTodos),
        });
        const batch = new ChunkedBatch();
        writeAll(batch, uid, data);
        await batch.commit();

        // Solo dopo il salvataggio riuscito si puliscono i dati locali
        ['clients', 'projects', 'todos', 'userCredentials'].forEach(k => localStorage.removeItem(k));
        return true;
    } catch (error) {
        console.error("Errore durante la migrazione dei dati locali. I dati locali non sono stati rimossi.", error);
        return false;
    }
};

export const register = async (email: string, password: string): Promise<User> => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await migrateLegacyDataFromLocalStorage(user.uid);
  await setDoc(userDocRef(user.uid), { schemaVersion: SCHEMA_VERSION }, { merge: true });
  return user;
};

export const login = async (email: string, password: string): Promise<User> => {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
};

export const logout = (): Promise<void> => signOut(auth);

export const onAuthChange = (callback: (user: User | null) => void) => onAuthStateChanged(auth, callback);
