
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

export type AppData = {
  clients: Client[];
  projects: Project[];
  todos: Todo[];
  quotes: Quote[];
};
