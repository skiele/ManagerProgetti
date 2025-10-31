import React from 'react';
import { Client, Project, Todo, WorkStatus, PaymentStatus } from '../types';
import { PlusIcon, SparklesIcon, TrashIcon } from './icons';
import ProjectCard from './ProjectCard';

interface ClientViewProps {
    client: Client;
    projects: Project[];
    todos: Todo[];
    onUpdateProjectWorkStatus: (id: string, status: WorkStatus) => void;
    onUpdateProjectPaymentStatus: (id: string, status: PaymentStatus) => void;
    onToggleTodo: (id: string, completed: boolean) => void;
    onAddProject: (clientId: string) => void;
    onAiAddProject: (clientId: string) => void;
    onAddTodo: (projectId: string) => void;
    onDeleteProject: (id: string) => void;
    onDuplicateProject: (id: string) => void;
    onDeleteTodo: (id: string) => void;
    onUpdateProjectNotes: (id: string, notes: string) => void;
    onDeleteClient: (clientId: string) => void;
}

const ClientView: React.FC<ClientViewProps> = ({ 
    client, 
    projects, 
    todos, 
    onUpdateProjectWorkStatus, 
    onUpdateProjectPaymentStatus, 
    onToggleTodo, 
    onAddProject, 
    onAiAddProject, 
    onAddTodo, 
    onDeleteProject, 
    onDuplicateProject, 
    onDeleteTodo, 
    onUpdateProjectNotes,
    onDeleteClient
}) => (
    <div>
        <div className="flex justify-between items-start mb-6 gap-2 flex-wrap pb-4 border-b border-gray-200 dark:border-gray-700">
            <div>
                <h1 className="text-3xl font-bold">{client.name}</h1>
                {client.email && <p className="text-gray-500">{client.email}</p>}
            </div>
             <div className="flex gap-2">
                <button onClick={() => onAddProject(client.id)} className="bg-primary text-white px-4 py-2 rounded-lg font-semibold flex items-center hover:bg-secondary transition-colors shadow">
                    <PlusIcon className="w-5 h-5 mr-2"/> Nuovo Progetto
                </button>
                <button onClick={() => onAiAddProject(client.id)} className="bg-accent text-white px-4 py-2 rounded-lg font-semibold flex items-center hover:bg-opacity-80 transition-colors shadow">
                    <SparklesIcon className="w-5 h-5 mr-2"/> Crea con AI
                </button>
            </div>
        </div>
        <div className="space-y-6">
            {projects.map(project => (
                <ProjectCard
                    key={project.id}
                    project={project}
                    todos={todos.filter(todo => todo.projectId === project.id)}
                    onUpdateProjectWorkStatus={onUpdateProjectWorkStatus}
                    onUpdateProjectPaymentStatus={onUpdateProjectPaymentStatus}
                    onToggleTodo={onToggleTodo}
                    onAddTodo={onAddTodo}
                    onDeleteProject={onDeleteProject}
                    onDuplicateProject={onDuplicateProject}
                    onDeleteTodo={onDeleteTodo}
                    onUpdateProjectNotes={onUpdateProjectNotes}
                />
            ))}
             {projects.length === 0 && (
                <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                    <p>Nessun progetto per questo cliente.</p>
                    <p className="text-sm mt-1">Clicca su "Nuovo Progetto" per iniziare.</p>
                </div>
             )}
        </div>
        <div className="mt-10 pt-6 border-t border-red-500/20">
            <h3 className="text-lg font-semibold text-red-500">Zona Pericolo</h3>
            <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-gray-500">L'eliminazione di un cliente è un'azione permanente e non può essere annullata.</p>
                <button onClick={() => onDeleteClient(client.id)} className="bg-red-500/10 text-red-700 dark:text-red-400 dark:hover:bg-red-500/20 hover:bg-red-500/20 px-4 py-2 rounded-lg font-semibold flex items-center transition-colors text-sm">
                    <TrashIcon className="w-4 h-4 mr-2"/> Elimina Cliente
                </button>
            </div>
        </div>
    </div>
);

export default ClientView;