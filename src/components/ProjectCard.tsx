import React, { useMemo, useState, useEffect } from 'react';
import { Project, Todo, WorkStatus, PaymentStatus, ProjectPriority } from '../types';
import { PlusIcon, TrashIcon, FlagIcon, BriefcaseIcon, DollarSignIcon, EditIcon } from './icons';
import { workStatusConfig, paymentStatusConfig, projectPriorityConfig } from '../config/status';
import { formatCurrency } from '../utils/formatting';
import TodoItem from './TodoItem';

interface ProjectCardProps {
  project: Project;
  todos: Todo[];
  onUpdateProjectWorkStatus: (id: string, status: WorkStatus) => void;
  onUpdateProjectPaymentStatus: (id: string, status: PaymentStatus) => void;
  onUpdateProjectPriority: (id: string, priority: ProjectPriority) => void;
  onToggleTodo: (id: string, completed: boolean) => void;
  onAddTodo: (projectId: string) => void;
  onAddPayment: (projectId: string) => void;
  onDeletePayment: (projectId: string, paymentId: string) => void;
  onDeleteProject: (id: string) => void;
  onEditProject: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onUpdateProjectNotes: (id: string, notes: string) => void;
}

const StatusChip: React.FC<{
  value: string;
  onChange: (value: any) => void;
  config: Record<string, { color: string; label: string }>;
  options: string[];
  icon: React.ReactNode;
}> = ({ value, onChange, config, options, icon }) => (
  <div className={`relative group inline-flex items-center gap-2 text-xs font-medium text-white px-2.5 py-1.5 rounded-full cursor-pointer transition-all ${config[value].color}`}>
    {icon}
    <span>{config[value].label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      aria-label={`Cambia stato ${config[value].label}`}
    >
      {options.map(opt => <option key={opt} value={opt}>{config[opt].label}</option>)}
    </select>
  </div>
);


const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  todos, 
  onUpdateProjectWorkStatus, 
  onUpdateProjectPaymentStatus, 
  onUpdateProjectPriority,
  onToggleTodo, 
  onAddTodo,
  onAddPayment,
  onDeletePayment,
  onDeleteProject,
  onEditProject,
  onDeleteTodo,
  onUpdateProjectNotes
}) => {
  const projectTotal = useMemo(() => project.value + todos.reduce((sum, todo) => sum + todo.income, 0), [project.value, todos]);
  const paidAmount = useMemo(() => project.payments?.reduce((sum, p) => sum + p.amount, 0) || 0, [project.payments]);
  const remainingAmount = projectTotal - paidAmount;
  const completedTodos = useMemo(() => todos.filter(t => t.completed).length, [todos]);
  const progress = todos.length > 0 ? (completedTodos / todos.length) * 100 : 0;
  
  const [noteContent, setNoteContent] = useState(project.notes || '');

  useEffect(() => {
    setNoteContent(project.notes || '');
  }, [project.notes]);
  
  const handleNoteBlur = () => {
    if (noteContent !== project.notes) {
      onUpdateProjectNotes(project.id, noteContent);
    }
  };

  return (
    <div className="bg-card dark:bg-dark-card rounded-lg shadow-md hover:shadow-xl transition-shadow border border-muted/50 dark:border-dark-muted/50">
      {/* Header */}
      <div className="p-4 border-b border-muted/50 dark:border-dark-muted/50">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex-1 mr-4 w-full">
            <h3 className="text-xl font-bold text-card-foreground dark:text-dark-card-foreground">{project.name}</h3>
            <p className="text-sm text-muted-foreground dark:text-dark-muted-foreground mt-1">
              Creato il: {new Date(project.createdAt).toLocaleDateString('it-IT')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => onEditProject(project.id)} className="text-muted-foreground hover:text-primary p-2 rounded-full" aria-label={`Modifica progetto ${project.name}`}>
                <EditIcon className="w-5 h-5" />
            </button>
            <button onClick={() => onDeleteProject(project.id)} className="text-muted-foreground hover:text-destructive p-2 rounded-full" aria-label={`Elimina progetto ${project.name}`}>
                <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
            <StatusChip 
              value={project.priority} 
              onChange={(val) => onUpdateProjectPriority(project.id, val as ProjectPriority)}
              config={projectPriorityConfig}
              options={Object.values(ProjectPriority)}
              icon={<FlagIcon className="w-3 h-3" />}
            />
            <StatusChip 
              value={project.workStatus} 
              onChange={(val) => onUpdateProjectWorkStatus(project.id, val as WorkStatus)}
              config={workStatusConfig}
              options={Object.values(WorkStatus)}
              icon={<BriefcaseIcon className="w-3 h-3" />}
            />
            <StatusChip 
              value={project.paymentStatus} 
              onChange={(val) => onUpdateProjectPaymentStatus(project.id, val as PaymentStatus)}
              config={paymentStatusConfig}
              options={Object.values(PaymentStatus)}
              icon={<DollarSignIcon className="w-3 h-3" />}
            />
        </div>
      </div>
      
      {/* Progresso e Note */}
      <div className="p-4 space-y-4">
        <div>
          <div className="flex justify-between items-center text-sm text-muted-foreground mb-1">
            <span>Progresso</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-muted dark:bg-dark-muted rounded-full h-2">
            <div className="bg-primary dark:bg-dark-primary h-2 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
        <div>
          <label htmlFor={`notes-${project.id}`} className="sr-only">Note</label>
          <textarea
              id={`notes-${project.id}`}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              onBlur={handleNoteBlur}
              placeholder="Aggiungi una nota..."
              className="w-full p-2 text-sm border rounded-md bg-transparent border-muted/50 dark:border-dark-muted/50 focus:border-primary focus:ring-1 focus:ring-primary"
              rows={2}
          />
        </div>
      </div>
      
      {/* To-Do e Pagamenti */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 p-4 border-t border-muted/50 dark:border-dark-muted/50">
          <div className="flex flex-col space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">To-Do List</h4>
              <div className="flex-grow space-y-2">
                  {todos.length > 0 ? (
                      todos.map(todo => <TodoItem key={todo.id} todo={todo} onToggle={onToggleTodo} onDelete={onDeleteTodo} />)
                  ) : (
                      <p className="text-sm text-muted-foreground text-center py-2">Nessuna attività.</p>
                  )}
              </div>
              <button onClick={() => onAddTodo(project.id)} className="w-full mt-auto p-2 text-primary hover:bg-primary/10 rounded-md flex items-center justify-center text-sm font-semibold">
                  <PlusIcon className="w-4 h-4 mr-2"/> Aggiungi To-Do
              </button>
          </div>

          <div className="flex flex-col space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">Pagamenti</h4>
              <div className="flex-grow space-y-2">
                  {(project.payments && project.payments.length > 0) ? (
                      project.payments.map(payment => (
                          <div key={payment.id} className="group flex items-center justify-between p-2 bg-muted/50 dark:bg-dark-muted/50 rounded-md">
                              <div className="text-sm">
                                  <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                                  <span className="text-muted-foreground ml-2">il {new Date(payment.date).toLocaleDateString('it-IT')}</span>
                              </div>
                              <button onClick={() => onDeletePayment(project.id, payment.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" aria-label="Elimina pagamento">
                                  <TrashIcon className="w-4 h-4" />
                              </button>
                          </div>
                      ))
                  ) : (
                      <p className="text-sm text-muted-foreground text-center py-2">Nessun pagamento.</p>
                  )}
              </div>
              <button onClick={() => onAddPayment(project.id)} className="w-full mt-auto p-2 text-primary hover:bg-primary/10 rounded-md flex items-center justify-center text-sm font-semibold">
                  <PlusIcon className="w-4 h-4 mr-2"/> Aggiungi Pagamento
              </button>
          </div>
      </div>

      {/* Footer Riepilogo */}
      <div className="p-4 bg-muted/50 dark:bg-dark-muted/50 border-t border-muted/50 dark:border-dark-muted/50 flex justify-end items-center gap-4 flex-wrap">
        <div className="text-right">
          <span className="text-lg font-bold">Totale: {formatCurrency(projectTotal)}</span>
          {paidAmount > 0 && (
            <div className="text-sm">
                <span className="text-green-600 dark:text-green-400">Pagato: {formatCurrency(paidAmount)}</span>
                {remainingAmount > 0 && <span className="text-red-600 dark:text-red-400 ml-2">Restante: {formatCurrency(remainingAmount)}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;