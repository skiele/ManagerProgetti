
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
  Pagato = 'pagato',
}

export interface Client {
  id: string;
  name: string;
  email?: string;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  value: number;
  workStatus: WorkStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  notes?: string;
  paidAt?: string;
}

export interface Todo {
  id: string;
  projectId: string;
  task: string;
  income: number;
  completed: boolean;
  dueDate?: string;
}
