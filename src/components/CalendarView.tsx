import React, { useState, useMemo } from 'react';
import { Todo, Project, Client } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

interface CalendarViewProps {
  todos: Todo[];
  projects: Project[];
  clients: Client[];
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const isoDate = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const CalendarView: React.FC<CalendarViewProps> = ({ todos, projects, clients }) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Settimana che inizia di lunedì: 0 = lunedì … 6 = domenica
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7;
  const todayIso = isoDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const todosByDate = useMemo(() => todos.reduce((acc, todo) => {
    if (todo.dueDate) (acc[todo.dueDate] ||= []).push(todo);
    return acc;
  }, {} as Record<string, Todo[]>), [todos]);

  const contextOf = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return 'Progetto non trovato';
    const client = clients.find(c => c.id === project.clientId);
    return `${client ? client.name : 'Cliente non trovato'} / ${project.name}`;
  };

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const iso = isoDate(year, month, day);
    return { day, iso, todos: todosByDate[iso] || [], isToday: iso === todayIso };
  });

  const TodoChip: React.FC<{ todo: Todo }> = ({ todo }) => (
    <div className={`p-1.5 text-xs border-l-2 ${todo.completed ? 'border-muted-foreground/40 bg-muted/60 text-muted-foreground' : 'border-foreground bg-muted'}`}>
      <p className={`font-semibold ${todo.completed ? 'line-through' : ''}`}>{todo.task}</p>
      <p className="text-muted-foreground truncate">{contextOf(todo.projectId)}</p>
    </div>
  );

  const monthLabel = currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' });
  const daysWithTodos = days.filter(d => d.todos.length > 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 rounded-full hover:bg-muted" aria-label="Mese precedente">
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-extrabold tracking-[-0.02em] capitalize text-center">{monthLabel}</h2>
        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 rounded-full hover:bg-muted" aria-label="Mese successivo">
          <ChevronRightIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Schermi stretti: elenco dei soli giorni con scadenze */}
      <div className="md:hidden space-y-4">
        {daysWithTodos.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nessuna scadenza in questo mese.</p>}
        {daysWithTodos.map(d => (
          <div key={d.iso}>
            <p className={`text-sm font-semibold mb-1.5 capitalize ${d.isToday ? 'text-primary dark:text-dark-primary' : 'text-muted-foreground'}`}>
              {new Date(year, month, d.day).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric' })}{d.isToday ? ' · oggi' : ''}
            </p>
            <div className="space-y-1.5">{d.todos.map(t => <TodoChip key={t.id} todo={t} />)}</div>
          </div>
        ))}
      </div>

      {/* Schermi larghi: griglia del mese */}
      <div className="hidden md:grid grid-cols-7 gap-1">
        {WEEKDAYS.map(day => (
          <div key={day} className="text-center font-semibold text-muted-foreground text-sm py-2">{day}</div>
        ))}
        {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`empty-${i}`} className="border-t border-muted" />)}
        {days.map(d => (
          <div key={d.iso} className="border-t border-muted min-h-[100px] p-1.5 min-w-0">
            <div className={`font-semibold text-sm ${d.isToday ? 'bg-signal text-black w-6 h-6 flex items-center justify-center' : ''}`}>{d.day}</div>
            <div className="space-y-1 mt-1">{d.todos.map(t => <TodoChip key={t.id} todo={t} />)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarView;
