export enum ProjectStatus {
  PreventivoDaInviare = 'preventivo da inviare',
  PreventivoInviato = 'preventivo inviato',
  PreventivoAccettato = 'preventivo accettato',
  ProgettoConsegnato = 'progetto consegnato',
  AttesaDiPagamento = 'attesa di pagamento',
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
  status: ProjectStatus;
  createdAt: string;
}

export interface Todo {
  id: string;
  projectId: string;
  task: string;
  income: number;
  completed: boolean;
  dueDate?: string;
}