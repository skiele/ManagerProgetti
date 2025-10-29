import React from 'react';
import { Todo } from '../types';
import { TrashIcon } from './icons';
import { formatCurrency } from '../utils/formatting';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onToggle, onDelete }) => {
  return (
    <div className="group flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <div className="flex items-center min-w-0">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={(e) => onToggle(todo.id, e.target.checked)}
          className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary flex-shrink-0"
        />
        <span className={`ml-3 truncate ${todo.completed ? 'line-through text-gray-500' : ''}`}>{todo.task}</span>
      </div>
      <div className="flex items-center flex-shrink-0 ml-4">
         {todo.dueDate && <span className="text-xs text-gray-500 mr-4">{new Date(todo.dueDate).toLocaleDateString('it-IT')}</span>}
        <span className="font-semibold text-gray-700 dark:text-gray-300 mr-4">{formatCurrency(todo.income)}</span>
        <button onClick={() => onDelete(todo.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Elimina task ${todo.task}`}>
            <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default TodoItem;
