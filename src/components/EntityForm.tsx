import React, { useState } from 'react';
import { Client, Project } from '../types';

export type FormType = 'client' | 'project' | 'todo' | 'payment' | 'editProject';

interface EntityFormProps {
  type: FormType;
  contextId: string | null;
  clients: Client[];
  projects: Project[];
  onAddClient: (name: string, email?: string) => void;
  onAddProject: (clientId: string, name: string, value: number, isOpportunity: boolean) => void;
  onUpdateProject: (projectId: string, data: { name: string; value: number }) => void;
  onAddTodo: (projectId: string, task: string, income: number, dueDate?: string) => void;
  onAddPayment: (projectId: string, amount: number, date: string) => void;
  onDone: () => void;
}

const today = () => new Date().toISOString().split('T')[0];

// Componente definito a livello di modulo: il suo stato non viene perso quando l'app si aggiorna.
// I valori iniziali sono letti una sola volta al montaggio (la modale lo rimonta a ogni apertura).
const EntityForm: React.FC<EntityFormProps> = ({
  type, contextId, clients, projects,
  onAddClient, onAddProject, onUpdateProject, onAddTodo, onAddPayment, onDone,
}) => {
  const projectToEdit = type === 'editProject' ? projects.find(p => p.id === contextId) : undefined;

  const [name, setName] = useState(projectToEdit?.name ?? '');
  const [email, setEmail] = useState('');
  const [clientId, setClientId] = useState(type === 'project' ? contextId ?? '' : '');
  const [projectValue, setProjectValue] = useState(projectToEdit?.value ?? 0);
  const [isOpportunity, setIsOpportunity] = useState(false);
  const [task, setTask] = useState('');
  const [income, setIncome] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(today());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'client' && name) {
      onAddClient(name, email || undefined);
    } else if (type === 'project' && name && clientId) {
      onAddProject(clientId, name, projectValue, isOpportunity);
    } else if (type === 'editProject' && name && contextId) {
      onUpdateProject(contextId, { name, value: projectValue });
    } else if (type === 'todo' && task && contextId) {
      onAddTodo(contextId, task, income, dueDate || undefined);
    } else if (type === 'payment' && paymentAmount > 0 && contextId) {
      onAddPayment(contextId, paymentAmount, paymentDate);
    } else {
      return;
    }
    onDone();
  };

  const renderFields = () => {
    switch (type) {
      case 'client':
        return <>
          <input type="text" placeholder="Nome Cliente" value={name} onChange={e => setName(e.target.value)} required />
          <input type="email" placeholder="Email Cliente (Opzionale)" value={email} onChange={e => setEmail(e.target.value)} />
        </>;
      case 'project':
      case 'editProject':
        return <>
          {type === 'project' && (
            <select value={clientId} onChange={e => setClientId(e.target.value)} required>
              <option value="" disabled>Seleziona Cliente</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <input type="text" placeholder="Nome Progetto" value={name} onChange={e => setName(e.target.value)} required />
          <input type="number" placeholder="Valore Progetto (€)" value={projectValue} onChange={e => setProjectValue(Number(e.target.value))} required />
          {type === 'project' && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={isOpportunity} onChange={e => setIsOpportunity(e.target.checked)} className="mt-0.5 h-4 w-4 accent-black dark:accent-white" />
              <span><strong>È un'opportunità</strong><br /><span className="text-muted-foreground">Trattativa incerta: non conta negli incassi e nei grafici finché non la passi a preventivo.</span></span>
            </label>
          )}
        </>;
      case 'todo':
        return <>
          <input type="text" placeholder="Attività" value={task} onChange={e => setTask(e.target.value)} required />
          <input type="number" placeholder="Incasso (€) - Opzionale" value={income} onChange={e => setIncome(Number(e.target.value))} />
          <input type="date" placeholder="Data di scadenza" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </>;
      case 'payment':
        return <>
          <input type="number" placeholder="Importo Pagamento (€)" value={paymentAmount} onChange={e => setPaymentAmount(Number(e.target.value))} required />
          <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required />
        </>;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {renderFields()}
      <div className="flex justify-end pt-4">
        <button type="submit" className="btn btn-primary px-4 py-2">
          {type === 'editProject' ? 'Salva Modifiche' : 'Aggiungi'}
        </button>
      </div>
    </form>
  );
};

export default EntityForm;
