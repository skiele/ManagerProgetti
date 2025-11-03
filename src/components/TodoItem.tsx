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
    <div className="group flex items-center justify-between p-3 bg-muted/50 dark:bg-dark-muted/50 rounded-md hover:bg-muted dark:hover:bg-dark-muted">
      <div className="flex items-center min-w-0">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={(e) => onToggle(todo.id, e.target.checked)}
          className="h-5 w-5 rounded border-muted-foreground/50 text-primary focus:ring-primary flex-shrink-0 bg-transparent"
        />
        <span className={`ml-3 truncate ${todo.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{todo.task}</span>
      </div>
      <div className="flex items-center flex-shrink-0 ml-4">
         {todo.dueDate && <span className="text-xs text-muted-foreground mr-4">{new Date(todo.dueDate).toLocaleDateString('it-IT')}</span>}
        <span className="font-semibold text-foreground mr-4">{formatCurrency(todo.income)}</span>
        <button onClick={() => onDelete(todo.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" aria-label={`Elimina task ${todo.task}`}>
            <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default TodoItem;
