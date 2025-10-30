
import React, { useMemo, useState, useEffect } from 'react';
import { Project, Todo, WorkStatus, PaymentStatus } from '../types';
import { PlusIcon, TrashIcon } from './icons';
import { workStatusConfig, paymentStatusConfig } from '../config/status';
import { formatCurrency } from '../utils/formatting';
import TodoItem from './TodoItem';

interface ProjectCardProps {
  project: Project;
  todos: Todo[];
  onUpdateProjectWorkStatus: (id: string, status: WorkStatus) => void;
  onUpdateProjectPaymentStatus: (id: string, status: PaymentStatus) => void;
  onToggleTodo: (id: string, completed: boolean) => void;
  onAddTodo: (projectId: string) => void;
  onDeleteProject: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onUpdateProjectNotes: (id: string, notes: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  todos, 
  onUpdateProjectWorkStatus, 
  onUpdateProjectPaymentStatus, 
  onToggleTodo, 
  onAddTodo, 
  onDeleteProject, 
  onDeleteTodo,
  onUpdateProjectNotes
}) => {
  const projectTotal = useMemo(() => project.value + todos.reduce((sum, todo) => sum + todo.income, 0), [project.value, todos]);
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
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 mr-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{project.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Creato il: {new Date(project.createdAt).toLocaleDateString('it-IT')}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <select 
                value={project.workStatus} 
                onChange={(e) => onUpdateProjectWorkStatus(project.id, e.target.value as WorkStatus)}
                className={`text-sm font-medium text-white px-2 py-1 rounded-full border-none focus:ring-2 focus:ring-white/50 appearance-none ${workStatusConfig[project.workStatus].color}`}
              >
                {Object.values(WorkStatus).map(s => (
                  <option key={s} value={s} className="text-black bg-white dark:bg-gray-700 dark:text-white">{workStatusConfig[s].label}</option>
                ))}
              </select>
              <select 
                value={project.paymentStatus} 
                onChange={(e) => onUpdateProjectPaymentStatus(project.id, e.target.value as PaymentStatus)}
                className={`text-sm font-medium text-white px-2 py-1 rounded-full border-none focus:ring-2 focus:ring-white/50 appearance-none ${paymentStatusConfig[project.paymentStatus].color}`}
              >
                {Object.values(PaymentStatus).map(s => (
                  <option key={s} value={s} className="text-black bg-white dark:bg-gray-700 dark:text-white">{paymentStatusConfig[s].label}</option>
                ))}
              </select>
            </div>
            <button onClick={() => onDeleteProject(project.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label={`Elimina progetto ${project.name}`}>
                <TrashIcon className="w-5 h-5" />
            </button>
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

      <div className="p-4 space-y-2 bg-gray-50 dark:bg-gray-800/50">
        {todos.map(todo => <TodoItem key={todo.id} todo={todo} onToggle={onToggleTodo} onDelete={onDeleteTodo} />)}
        <button onClick={() => onAddTodo(project.id)} className="w-full text-left p-2 text-primary hover:bg-primary/10 rounded-md transition-colors flex items-center">
            <PlusIcon className="w-4 h-4 mr-2"/> Aggiungi To-Do
        </button>
      </div>
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center">
        <span className="text-lg font-bold text-gray-800 dark:text-gray-100">Totale: {formatCurrency(projectTotal)}</span>
      </div>
    </div>
  );
};

export default ProjectCard;