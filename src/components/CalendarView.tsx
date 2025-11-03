
import React, { useState, useMemo } from 'react';
import { Todo, Project, Client } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

interface CalendarViewProps {
  todos: Todo[];
  projects: Project[];
  clients: Client[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ todos, projects, clients }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const daysInMonth = Array.from({ length: lastDayOfMonth.getDate() }, (_, i) => i + 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, ...

  const todosByDate = useMemo(() => {
    return todos.reduce((acc, todo) => {
      if (todo.dueDate) {
        const date = todo.dueDate;
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(todo);
      }
      return acc;
    }, {} as Record<string, Todo[]>);
  }, [todos]);
  
  const getProjectAndClientInfo = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return { projectName: 'Progetto non trovato', clientName: 'Cliente non trovato' };
    const client = clients.find(c => c.id === project.clientId);
    return {
        projectName: project.name,
        clientName: client ? client.name : 'Cliente non trovato'
    }
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  
  const weekdays = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

  return (
    <div className="bg-white dark:bg-gray-800 p-2 sm:p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        <h2 className="text-xl sm:text-2xl font-bold capitalize text-center">
          {currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}
        </h2>
        <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
          <ChevronRightIcon className="w-6 h-6" />
        </button>
      </div>
      <div className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-1 min-w-[600px] md:min-w-full">
            {weekdays.map(day => (
              <div key={day} className="text-center font-semibold text-gray-600 dark:text-gray-400 text-sm py-2">
                {day}
              </div>
            ))}
            {Array.from({ length: startingDayOfWeek }).map((_, index) => (
              <div key={`empty-${index}`} className="border-t border-gray-200 dark:border-gray-700"></div>
            ))}
            {daysInMonth.map(day => {
              const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayTodos = todosByDate[dateStr] || [];
              const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
              return (
                <div key={day} className="border-t border-gray-200 dark:border-gray-700 min-h-[90px] sm:min-h-[100px] p-1.5">
                  <div className={`font-semibold text-sm ${isToday ? 'bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>
                    {day}
                  </div>
                  <div className="space-y-1 mt-1">
                    {dayTodos.map(todo => {
                      const { projectName, clientName } = getProjectAndClientInfo(todo.projectId);
                      return (
                        <div key={todo.id} className={`p-1.5 rounded-md text-xs ${todo.completed ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'}`}>
                          <p className={`font-bold ${todo.completed ? 'line-through' : ''}`}>{todo.task}</p>
                          <p className="text-gray-600 dark:text-gray-400 truncate">{clientName} / {projectName}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
      </div>
    </div>
  );
};

export default CalendarView;
