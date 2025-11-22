
import React, { useMemo, useRef } from 'react';
import { Todo, Project, Client, WorkStatus, ProjectPriority } from '../types';
import TodoItem from './TodoItem';

interface TaskViewProps {
    todos: Todo[];
    projects: Project[];
    clients: Client[];
    onToggleTodo: (id: string, completed: boolean) => void;
    onDeleteTodo: (id: string) => void;
    onReorderTodos: (todos: Todo[]) => void;
}

const TaskView: React.FC<TaskViewProps> = ({ todos, projects, clients, onToggleTodo, onDeleteTodo, onReorderTodos }) => {
    
    const getContext = (projectId: string) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return '';
        const client = clients.find(c => c.id === project.clientId);
        return `${client ? client.name : 'Cliente Sconosciuto'} / ${project.name}`;
    };

    const getProjectPriorityValue = (projectId: string): number => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return 1; // Bassa default
        switch (project.priority) {
            case ProjectPriority.Alta: return 3;
            case ProjectPriority.Media: return 2;
            case ProjectPriority.Bassa: return 1;
            default: return 1;
        }
    };

    // Raggruppa le task
    const groupedTodos = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const groups = {
            overdue: [] as Todo[],
            today: [] as Todo[],
            upcoming: [] as Todo[],
            noDate: [] as Todo[],
        };

        todos.forEach(todo => {
            if (todo.completed) return;
            const project = projects.find(p => p.id === todo.projectId);
            if (project?.workStatus === WorkStatus.Annullato) return;

            let targetGroup: Todo[] = groups.noDate;
            if (todo.dueDate) {
                const dueDate = new Date(todo.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                if (dueDate < today) targetGroup = groups.overdue;
                else if (dueDate.getTime() === today.getTime()) targetGroup = groups.today;
                else targetGroup = groups.upcoming;
            }
            targetGroup.push(todo);
        });

        // Logica di ordinamento
        // 1. Order Manuale (se presente)
        // 2. Priorità Progetto (Alta > Media > Bassa)
        // 3. Data/Income
        const sortFn = (a: Todo, b: Todo) => {
            // 1. Check manual order difference only if both have order defined
            // Se uno ha order e l'altro no, quello con order "vince" (o perde, dipenda da come vogliamo gestire i legacy)
            // Assumiamo che order undefined = 0 per compatibilità
            
            const orderA = a.order ?? 0;
            const orderB = b.order ?? 0;

            // Se gli ordini sono diversi, usa l'ordine manuale
            if (orderA !== orderB) {
                return orderA - orderB;
            }

            // 2. Priorità Progetto
            const prioA = getProjectPriorityValue(a.projectId);
            const prioB = getProjectPriorityValue(b.projectId);
            if (prioA !== prioB) return prioB - prioA; // Descending (3 > 1)

            // 3. Fallback: Date or Income
            if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
                return a.dueDate.localeCompare(b.dueDate);
            }
            return b.income - a.income;
        };

        groups.overdue.sort(sortFn);
        groups.today.sort(sortFn);
        groups.upcoming.sort(sortFn);
        groups.noDate.sort(sortFn);

        return groups;
    }, [todos, projects]);

    const hasAnyTask = Object.values(groupedTodos).some((group: Todo[]) => group.length > 0);

    // --- Drag and Drop Logic ---
    const draggedItemRef = useRef<string | null>(null);
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
        draggedItemRef.current = id;
        e.dataTransfer.effectAllowed = 'move';
        // Hack per nascondere l'immagine fantasma di default se volessimo customizzarla, ma qui lasciamo default
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string, listType: keyof typeof groupedTodos) => {
        e.preventDefault();
        const draggedId = draggedItemRef.current;
        if (!draggedId || draggedId === targetId) return;

        const currentList = groupedTodos[listType];
        const draggedIndex = currentList.findIndex(t => t.id === draggedId);
        const targetIndex = currentList.findIndex(t => t.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) return; // Item dropped in wrong list

        // Creiamo una copia della lista per manipolarla
        const newList = [...currentList];
        const [movedItem] = newList.splice(draggedIndex, 1);
        newList.splice(targetIndex, 0, movedItem);

        // Riassegnamo gli ordini basandoci sulla nuova posizione
        // Usiamo un timestamp base + index per garantire unicità e ordine
        const baseOrder = Date.now();
        const updatedTodos = newList.map((todo, index) => ({
            ...todo,
            order: baseOrder + index
        }));

        onReorderTodos(updatedTodos);
        draggedItemRef.current = null;
    };


    if (!hasAnyTask) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-xl font-bold mb-2">Tutto fatto!</h2>
                <p>Non ci sono attività in sospeso al momento.</p>
            </div>
        );
    }

    const renderSection = (title: string, list: Todo[], type: keyof typeof groupedTodos, colorClass: string = '') => {
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
                            isDraggable={true}
                            onDragStart={(e) => handleDragStart(e, todo.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, todo.id, type)}
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
                <p className="text-muted-foreground mt-1">
                    Panoramica attività. Ordinate automaticamente per priorità progetto, ma puoi trascinarle per riordinarle manualmente.
                </p>
            </div>

            {renderSection('Scaduti', groupedTodos.overdue, 'overdue', 'text-red-500')}
            {renderSection('Oggi', groupedTodos.today, 'today', 'text-green-500')}
            {renderSection('Prossimi', groupedTodos.upcoming, 'upcoming', 'text-blue-500')}
            {renderSection('Senza Scadenza', groupedTodos.noDate, 'noDate', 'text-gray-500')}
        </div>
    );
};

export default TaskView;