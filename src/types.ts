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
}
