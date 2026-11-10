
import React from 'react';
import { Todo } from '../types';
import { TrashIcon, GripVerticalIcon, CalendarIcon } from './icons';
import { formatCurrency, googleCalendarLink } from '../utils/formatting';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  context?: string;
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ 
  todo, 
  onToggle, 
  onDelete, 
  context,
  isDraggable,
  onDragStart,
  onDragOver,
  onDrop
}) => {
  return (
    <div 
        className={`group flex items-center justify-between py-3 pr-1 border-b border-foreground/15 hover:bg-muted/60 ${isDraggable ? 'cursor-move' : ''}`}
        draggable={isDraggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
    >
      <div className="flex items-center min-w-0">
        {isDraggable && (
            <div className="mr-2 text-muted-foreground/50 cursor-grab active:cursor-grabbing">
                <GripVerticalIcon className="w-4 h-4" />
            </div>
        )}
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={(e) => onToggle(todo.id, e.target.checked)}
          className="h-[18px] w-[18px] flex-shrink-0 accent-black dark:accent-white"
        />
        <div className="ml-3 flex flex-col min-w-0">
            {context && <span className="text-xs text-muted-foreground truncate mb-0.5">{context}</span>}
            <span className={`truncate font-medium ${todo.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{todo.task}</span>
        </div>
      </div>
      <div className="flex items-center flex-shrink-0 ml-4">
         {todo.dueDate && <span className={`text-[13px] mr-4 tabular-nums ${new Date(todo.dueDate) < new Date(new Date().setHours(0,0,0,0)) && !todo.completed ? 'text-signal font-extrabold' : 'font-semibold'}`}>{new Date(todo.dueDate).toLocaleDateString('it-IT')}</span>}
        {todo.income > 0 && <span className="font-extrabold text-foreground mr-4">{formatCurrency(todo.income)}</span>}
        {todo.dueDate && !todo.completed && (
          <a href={googleCalendarLink(todo.task, todo.dueDate, context)} target="_blank" rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground mr-3 md:opacity-0 md:group-hover:opacity-100"
            aria-label={`Aggiungi a Google Calendar: ${todo.task}`} title="Aggiungi a Google Calendar">
            <CalendarIcon className="w-4 h-4" />
          </a>
        )}
        <button onClick={() => onDelete(todo.id)} className="text-muted-foreground hover:text-destructive md:opacity-0 md:group-hover:opacity-100" aria-label={`Elimina task ${todo.task}`}>
            <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default TodoItem;