import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Client, Project, Todo, WorkStatus, PaymentStatus, ProjectPriority } from '../types';
import { BriefcaseIcon, ChevronLeftIcon, DollarSignIcon, EditIcon, FlagIcon, PlusIcon, TrashIcon } from './icons';
import { workStatusConfig, paymentStatusConfig, projectPriorityConfig } from '../config/status';
import { formatCurrency } from '../utils/formatting';
import StatusChip from './StatusChip';
import TodoItem from './TodoItem';
import PageHeader from './PageHeader';

export type ProjectTab = 'overview' | 'tasks' | 'payments' | 'quotes' | 'documents';

interface ProjectDetailProps {
  project: Project;
  client?: Client;
  todos: Todo[];
  quotesTab?: React.ReactNode;
  quotesCount?: number;
  documentsTab?: React.ReactNode;
  documentsCount?: number;
  onBack: () => void;
  onUpdateProjectWorkStatus: (id: string, status: WorkStatus) => void;
  onUpdateProjectPaymentStatus: (id: string, status: PaymentStatus) => void;
  onUpdateProjectPriority: (id: string, priority: ProjectPriority) => void;
  onUpdateProjectNotes: (id: string, notes: string) => void;
  onEditProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onToggleTodo: (id: string, completed: boolean) => void;
  onDeleteTodo: (id: string) => void;
  onAddTodo: (projectId: string) => void;
  onAddPayment: (projectId: string) => void;
  onDeletePayment: (projectId: string, paymentId: string) => void;
}

const Stat: React.FC<{ label: string; value: string; className?: string; first?: boolean }> = ({ label, value, className = '', first }) => (
  <div className={first ? '' : 'sm:pl-6 sm:border-l-2 border-foreground'}>
    <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">{label}</p>
    <p className={`mt-2 text-4xl font-extrabold tracking-[-0.04em] leading-none ${className}`}>{value}</p>
  </div>
);

const ProjectDetail: React.FC<ProjectDetailProps> = ({
  project, client, todos, quotesTab, quotesCount = 0, documentsTab, documentsCount = 0, onBack,
  onUpdateProjectWorkStatus, onUpdateProjectPaymentStatus, onUpdateProjectPriority, onUpdateProjectNotes,
  onEditProject, onDeleteProject, onToggleTodo, onDeleteTodo, onAddTodo, onAddPayment, onDeletePayment,
}) => {
  const [tab, setTab] = useState<ProjectTab>('overview');
  const activeTabRef = useRef<HTMLButtonElement>(null);
  // Su schermi stretti porta in vista la scheda selezionata
  useEffect(() => { activeTabRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); }, [tab]);
  const [noteContent, setNoteContent] = useState(project.notes || '');
  useEffect(() => setNoteContent(project.notes || ''), [project.notes]);

  const projectTotal = useMemo(() => project.value + todos.reduce((sum, t) => sum + t.income, 0), [project.value, todos]);
  const paidAmount = useMemo(() => (project.payments || []).reduce((sum, p) => sum + p.amount, 0), [project.payments]);
  const completedTodos = todos.filter(t => t.completed).length;
  const progress = todos.length > 0 ? (completedTodos / todos.length) * 100 : 0;
  const payments = useMemo(() => [...(project.payments || [])].sort((a, b) => a.date.localeCompare(b.date)), [project.payments]);

  const tabs: { id: ProjectTab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Panoramica' },
    { id: 'tasks', label: 'Attività', count: todos.filter(t => !t.completed).length },
    { id: 'payments', label: 'Pagamenti', count: payments.length },
    ...(quotesTab ? [{ id: 'quotes' as ProjectTab, label: 'Preventivi', count: quotesCount }] : []),
    ...(documentsTab ? [{ id: 'documents' as ProjectTab, label: 'Documenti', count: documentsCount }] : []),
  ];

  return (
    <div className="max-w-[1120px]">
      <button onClick={onBack} className="flex items-center text-[13px] font-medium underline underline-offset-[3px] mb-4 hover:text-muted-foreground">
        <ChevronLeftIcon className="w-4 h-4 mr-0.5" /> {client ? client.name : 'Indietro'}
      </button>

      <PageHeader
        overline={`${client?.name ?? 'Cliente sconosciuto'} · creato il ${new Date(project.createdAt).toLocaleDateString('it-IT')}`}
        title={project.name}
        actions={<>
          <button onClick={() => onEditProject(project.id)} className="p-2 border-2 border-foreground hover:bg-muted" aria-label={`Modifica progetto ${project.name}`}>
            <EditIcon className="w-5 h-5" />
          </button>
          <button onClick={() => onDeleteProject(project.id)} className="p-2 border-2 border-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive" aria-label={`Elimina progetto ${project.name}`}>
            <TrashIcon className="w-5 h-5" />
          </button>
        </>}
      />

      <div className="flex flex-wrap gap-2 mb-6">
        <StatusChip value={project.priority} onChange={(val) => onUpdateProjectPriority(project.id, val as ProjectPriority)} config={projectPriorityConfig} options={Object.values(ProjectPriority)} icon={<FlagIcon className="w-3 h-3" />} />
        <StatusChip value={project.workStatus} onChange={(val) => onUpdateProjectWorkStatus(project.id, val as WorkStatus)} config={workStatusConfig} options={Object.values(WorkStatus)} icon={<BriefcaseIcon className="w-3 h-3" />} />
        <StatusChip value={project.paymentStatus} onChange={(val) => onUpdateProjectPaymentStatus(project.id, val as PaymentStatus)} config={paymentStatusConfig} options={Object.values(PaymentStatus)} icon={<DollarSignIcon className="w-3 h-3" />} />
      </div>

      <div role="tablist" className="flex gap-6 border-b-2 border-foreground mb-8 overflow-x-auto no-scrollbar">
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            ref={tab === t.id ? activeTabRef : undefined}
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`py-2.5 -mb-[2px] border-b-4 text-[12px] font-semibold uppercase tracking-[0.1em] whitespace-nowrap ${tab === t.id ? 'border-signal text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {t.label}{t.count ? <span className="ml-1.5 text-xs font-normal">({t.count})</span> : null}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Stat first label="Totale" value={formatCurrency(projectTotal)} />
            <Stat label="Incassato" value={formatCurrency(paidAmount)} />
            <Stat label="Da incassare" value={formatCurrency(Math.max(0, projectTotal - paidAmount))} className={projectTotal - paidAmount > 0 ? 'text-signal' : ''} />
          </div>
          <p className="text-xs text-muted-foreground">Totale = valore del progetto ({formatCurrency(project.value)}) + incassi delle attività.</p>

          <div>
            <div className="flex justify-between items-center text-sm text-muted-foreground mb-1">
              <span>Attività completate: {completedTodos} di {todos.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-muted h-2">
              <div className="bg-foreground h-2" style={{ width: `${progress}%` }}></div>
            </div>
          </div>

          <div>
            <label htmlFor={`detail-notes-${project.id}`} className="text-sm font-semibold text-muted-foreground">Note</label>
            <textarea
              id={`detail-notes-${project.id}`}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              onBlur={() => { if (noteContent !== (project.notes || '')) onUpdateProjectNotes(project.id, noteContent); }}
              placeholder="Aggiungi una nota..."
              rows={6}
              className="mt-1"
            />
          </div>
        </div>
      )}

      {tab === 'tasks' && (
        <div className="space-y-2">
          {todos.length > 0
            ? todos.map(todo => <TodoItem key={todo.id} todo={todo} onToggle={onToggleTodo} onDelete={onDeleteTodo} />)
            : <p className="text-sm text-muted-foreground text-center py-6">Nessuna attività.</p>}
          <button onClick={() => onAddTodo(project.id)} className="w-full p-2 text-primary hover:bg-primary/10 rounded-md flex items-center justify-center text-sm font-semibold">
            <PlusIcon className="w-4 h-4 mr-2" /> Aggiungi attività
          </button>
        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-2">
          {payments.length > 0 ? payments.map(payment => (
            <div key={payment.id} className="group flex items-center justify-between p-3 bg-muted/50 dark:bg-dark-muted/50 rounded-md">
              <div className="text-sm">
                <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                <span className="text-muted-foreground ml-2">il {new Date(payment.date).toLocaleDateString('it-IT')}</span>
              </div>
              <button onClick={() => onDeletePayment(project.id, payment.id)} className="text-muted-foreground hover:text-destructive md:opacity-0 md:group-hover:opacity-100" aria-label="Elimina pagamento">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          )) : <p className="text-sm text-muted-foreground text-center py-6">Nessun pagamento.</p>}
          <div className="flex justify-between items-center pt-2 text-sm">
            <span className="text-muted-foreground">Incassato {formatCurrency(paidAmount)} su {formatCurrency(projectTotal)}</span>
            <button onClick={() => onAddPayment(project.id)} className="p-2 text-primary hover:bg-primary/10 rounded-md flex items-center font-semibold">
              <PlusIcon className="w-4 h-4 mr-2" /> Aggiungi pagamento
            </button>
          </div>
        </div>
      )}

      {tab === 'quotes' && quotesTab}
      {tab === 'documents' && documentsTab}
    </div>
  );
};

export default ProjectDetail;
