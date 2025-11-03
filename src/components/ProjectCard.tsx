
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex-1 mr-4 w-full">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{project.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Creato il: {new Date(project.createdAt).toLocaleDateString('it-IT')}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-shrink-0 w-full sm:w-auto">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2" title="Priorità">
                <FlagIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <select 
                  value={project.priority} 
                  onChange={(e) => onUpdateProjectPriority(project.id, e.target.value as ProjectPriority)}
                  className={`text-sm font-medium text-white px-2 py-1 rounded-full border-none focus:ring-2 focus:ring-white/50 appearance-none ${projectPriorityConfig[project.priority].color}`}
                  aria-label="Priorità"
                >
                  {Object.values(ProjectPriority).map(p => (
                    <option key={p} value={p} className="text-black bg-white dark:bg-gray-700 dark:text-white">{projectPriorityConfig[p].label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2" title="Stato Lavorazione">
                <BriefcaseIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <select 
                  value={project.workStatus} 
                  onChange={(e) => onUpdateProjectWorkStatus(project.id, e.target.value as WorkStatus)}
                  className={`text-sm font-medium text-white px-2 py-1 rounded-full border-none focus:ring-2 focus:ring-white/50 appearance-none ${workStatusConfig[project.workStatus].color}`}
                  aria-label="Stato Lavorazione"
                >
                  {Object.values(WorkStatus).map(s => (
                    <option key={s} value={s} className="text-black bg-white dark:bg-gray-700 dark:text-white">{workStatusConfig[s].label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2" title="Stato Pagamento">
                <DollarSignIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <select 
                  value={project.paymentStatus} 
                  onChange={(e) => onUpdateProjectPaymentStatus(project.id, e.target.value as PaymentStatus)}
                  className={`text-sm font-medium text-white px-2 py-1 rounded-full border-none focus:ring-2 focus:ring-white/50 appearance-none ${paymentStatusConfig[project.paymentStatus].color}`}
                  aria-label="Stato Pagamento"
                >
                  {Object.values(PaymentStatus).map(s => (
                    <option key={s} value={s} className="text-black bg-white dark:bg-gray-700 dark:text-white">{paymentStatusConfig[s].label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center self-end sm:self-center">
                <button onClick={() => onEditProject(project.id)} className="text-gray-400 hover:text-blue-500 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label={`Modifica progetto ${project.name}`}>
                    <EditIcon className="w-5 h-5" />
                </button>
                <button onClick={() => onDeleteProject(project.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label={`Elimina progetto ${project.name}`}>
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300 mb-1">
            <span>Progresso</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-gray-700/50">
        <label htmlFor={`notes-${project.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note</label>
        <textarea
            id={`notes-${project.id}`}
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            onBlur={handleNoteBlur}
            placeholder="Aggiungi una nota..."
            className="w-full p-2 border border-yellow-300 rounded-md bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700/50 dark:text-gray-200 focus:ring-primary focus:border-primary transition"
            rows={3}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 p-4 border-t border-gray-100 dark:border-gray-700/50">
          {/* Colonna To-Do */}
          <div className="flex flex-col space-y-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">To-Do List</h4>
              <div className="flex-grow space-y-2">
                  {todos.length > 0 ? (
                      todos.map(todo => <TodoItem key={todo.id} todo={todo} onToggle={onToggleTodo} onDelete={onDeleteTodo} />)
                  ) : (
                      <p className="text-sm text-gray-500 text-center py-2">Nessuna attività aggiunta.</p>
                  )}
              </div>
              <button onClick={() => onAddTodo(project.id)} className="w-full mt-auto p-2 text-primary hover:bg-primary/10 rounded-md transition-colors flex items-center justify-center text-sm font-semibold">
                  <PlusIcon className="w-4 h-4 mr-2"/> Aggiungi To-Do
              </button>
          </div>

          {/* Colonna Pagamenti */}
          <div className="flex flex-col space-y-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Pagamenti Ricevuti</h4>
              <div className="flex-grow space-y-2">
                  {(project.payments && project.payments.length > 0) ? (
                      project.payments.map(payment => (
                          <div key={payment.id} className="group flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                              <div className="text-sm">
                                  <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                                  <span className="text-gray-500 dark:text-gray-400 ml-2">il {new Date(payment.date).toLocaleDateString('it-IT')}</span>
                              </div>
                              <button onClick={() => onDeletePayment(project.id, payment.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Elimina pagamento">
                                  <TrashIcon className="w-4 h-4" />
                              </button>
                          </div>
                      ))
                  ) : (
                      <p className="text-sm text-gray-500 text-center py-2">Nessun pagamento registrato.</p>
                  )}
              </div>
              <button onClick={() => onAddPayment(project.id)} className="w-full mt-auto p-2 text-primary hover:bg-primary/10 rounded-md transition-colors flex items-center justify-center text-sm font-semibold">
                  <PlusIcon className="w-4 h-4 mr-2"/> Aggiungi Pagamento
              </button>
          </div>
      </div>


      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center gap-4 flex-wrap">
        <div className="text-right flex-grow">
          <span className="text-lg font-bold text-gray-800 dark:text-gray-100">Totale: {formatCurrency(projectTotal)}</span>
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