import React, { useMemo } from 'react';
import { Todo, Project, Client, WorkStatus } from '../types';
import TodoItem from './TodoItem';

interface TaskViewProps {
    todos: Todo[];
    projects: Project[];
    clients: Client[];
    onToggleTodo: (id: string, completed: boolean) => void;
    onDeleteTodo: (id: string) => void;
}

const TaskView: React.FC<TaskViewProps> = ({ todos, projects, clients, onToggleTodo, onDeleteTodo }) => {
    
    const getContext = (projectId: string) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return '';
        const client = clients.find(c => c.id === project.clientId);
        return `${client ? client.name : 'Cliente Sconosciuto'} / ${project.name}`;
    };

    // Raggruppa le task
    const groupedTodos = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const groups = {
            overdue: [] as Todo[],
            today: [] as Todo[],
            upcoming: [] as Todo[],
            noDate: [] as Todo[],
        };

        todos.forEach(todo => {
            // Ignora task completate
            if (todo.completed) return;

            // Ignora task di progetti annullati
            const project = projects.find(p => p.id === todo.projectId);
            if (project?.workStatus === WorkStatus.Annullato) return;

            if (!todo.dueDate) {
                groups.noDate.push(todo);
                return;
            }

            const dueDate = new Date(todo.dueDate);
            dueDate.setHours(0, 0, 0, 0);

            if (dueDate < today) {
                groups.overdue.push(todo);
            } else if (dueDate.getTime() === today.getTime()) {
                groups.today.push(todo);
            } else {
                groups.upcoming.push(todo);
            }
        });

        // Sort function: per data asc (se presente), poi per income desc
        const sortFn = (a: Todo, b: Todo) => {
            if (a.dueDate && b.dueDate) {
                if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
            }
            return b.income - a.income;
        };

        groups.overdue.sort(sortFn);
        groups.today.sort(sortFn);
        groups.upcoming.sort(sortFn);
        groups.noDate.sort((a, b) => b.income - a.income); // Solo per valore economico

        return groups;
    }, [todos, projects]);

    const hasAnyTask = Object.values(groupedTodos).some((group: Todo[]) => group.length > 0);

    if (!hasAnyTask) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-xl font-bold mb-2">Tutto fatto!</h2>
                <p>Non ci sono attività in sospeso al momento.</p>
            </div>
        );
    }

    const renderSection = (title: string, list: Todo[], colorClass: string = '') => {
        if (list.length === 0) return null;
        return (
            <div className="mb-8">
                <h3 className={`text-lg font-bold mb-4 flex items-center ${colorClass}`}>
                    {title} 
                    <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full text-foreground font-normal border dark:border-gray-700">
                        {list.length}
                    </span>
                </h3>
                <div className="space-y-2">
                    {list.map(todo => (
                        <TodoItem 
                            key={todo.id} 
                            todo={todo} 
                            onToggle={onToggleTodo} 
                            onDelete={onDeleteTodo}
                            context={getContext(todo.projectId)}
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Le tue Attività</h1>
                <p className="text-muted-foreground mt-1">Panoramica di tutte le attività aperte nei progetti attivi.</p>
            </div>

            {renderSection('Scaduti', groupedTodos.overdue, 'text-red-500')}
            {renderSection('Oggi', groupedTodos.today, 'text-green-500')}
            {renderSection('Prossimi', groupedTodos.upcoming, 'text-blue-500')}
            {renderSection('Senza Scadenza', groupedTodos.noDate, 'text-gray-500')}
        </div>
    );
};

export default TaskView;