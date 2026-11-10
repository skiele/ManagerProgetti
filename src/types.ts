
export enum WorkStatus {
  PreventivoDaInviare = 'preventivo da inviare',
  PreventivoInviato = 'preventivo inviato',
  InLavorazione = 'in lavorazione',
  Consegnato = 'consegnato',
  Annullato = 'annullato',
}

export enum PaymentStatus {
  DaFatturare = 'da fatturare',
  Fatturato = 'fatturato',
  ParzialmentePagato = 'pagato parzialmente',
  Pagato = 'pagato',
}

export enum ProjectPriority {
  Bassa = 'bassa',
  Media = 'media',
  Alta = 'alta',
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  order?: number;
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  value: number;
  workStatus: WorkStatus;
  paymentStatus: PaymentStatus;
  priority: ProjectPriority;
  createdAt: string;
  notes?: string;
  paidAt?: string;
  payments?: Payment[];
}

export interface Todo {
  id: string;
  projectId: string;
  task: string;
  income: number;
  completed: boolean;
  dueDate?: string;
  order?: number;
}

export enum QuoteStatus {
  Bozza = 'bozza',
  Inviato = 'inviato',
  Accettato = 'accettato',
  Rifiutato = 'rifiutato',
}

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Quote {
  id: string;
  projectId: string;
  number: string;        // es. "2026-001"
  date: string;          // YYYY-MM-DD
  validityDays: number;
  status: QuoteStatus;
  recipient: string;     // intestatario (testo libero, più righe)
  items: QuoteItem[];
  notes?: string;
  chargeStampDuty: boolean; // marca da bollo addebitata al cliente
  createdAt: string;
}

// Dati di chi emette il preventivo (users/{uid}/settings/profile)
export interface BusinessProfile {
  name: string;
  vatNumber?: string;
  fiscalCode?: string;
  address?: string;
  email?: string;
  phone?: string;
  iban?: string;
  taxNote?: string;      // dicitura fiscale in calce
}

export enum DocumentKind {
  Soggetto = 'soggetto',
  Trattamento = 'trattamento',
  Sceneggiatura = 'sceneggiatura',
  Note = 'note',
  Altro = 'altro',
}

// Testo (Markdown) in users/{uid}/documents/{id}
export interface TextDocument {
  id: string;
  projectId: string | null;   // null = non legato a un progetto
  title: string;
  kind: DocumentKind;
  content: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: 'app' | 'claude';
  revision: number;           // cresce a ogni salvataggio
}

// Versione precedente di un documento, in users/{uid}/revisions/{id}
export interface DocumentRevision {
  id: string;
  documentId: string;
  title: string;
  content: string;
  revision: number;
  savedAt: string;
  reason: string;
}

// Azione eseguita da Claude tramite il connettore, in users/{uid}/activity/{id}
export interface ClaudeActivity {
  id: string;
  at: string;
  tool: string;
  summary: string;
}

// --- Storyboard / shot list ---

export type AspectRatio = '16:9' | '2.39:1' | '4:3' | '1:1' | '4:5' | '9:16';

export const SHOT_SIZES = ['EWS', 'WS', 'MS', 'MCU', 'CU', 'ECU', 'INS'] as const;
export type ShotSize = typeof SHOT_SIZES[number];

export const SHOT_MOVES = ['fissa', 'panoramica', 'tilt', 'carrello', 'a mano', 'gimbal', 'drone', 'zoom'] as const;
export type ShotMove = typeof SHOT_MOVES[number];

// Una storyboard per progetto (o più, se servono versioni): users/{uid}/shotlists/{id}
export interface Shotlist {
  id: string;
  projectId: string;
  title: string;
  aspect: AspectRatio;
  createdAt: string;
  updatedAt: string;
}

// Un'inquadratura: users/{uid}/shots/{id}. Il codice (1A, 1B, 2A…) si calcola da scena + ordine.
// L'immagine sta a parte in users/{uid}/shotImages/{id dell'inquadratura}, per non appesantire gli elenchi.
export interface Shot {
  id: string;
  shotlistId: string;
  projectId: string;
  order: number;
  scene: number;
  sceneTitle?: string;     // intestazione della scena (letta dalla prima inquadratura della scena)
  size?: ShotSize;
  move?: ShotMove;
  lens?: string;           // es. "35mm"
  description: string;     // azione / cosa si vede
  audio?: string;          // dialoghi, suono, musica
  duration?: number;       // secondi (facoltativo)
  notes?: string;
  done: boolean;           // girata
  hasImage: boolean;
}

export interface ShotImage {
  id: string;              // = id dell'inquadratura
  shotlistId: string;
  dataUrl: string;         // JPEG ridimensionato nel browser (max ~1280 px)
}

export type AppData = {
  clients: Client[];
  projects: Project[];
  todos: Todo[];
  quotes: Quote[];
  documents: TextDocument[];
  shotlists: Shotlist[];
  shots: Shot[];
};
