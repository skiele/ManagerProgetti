
import React from 'react';
import { Client, Project, Todo, WorkStatus, PaymentStatus, ProjectPriority } from '../types';
import { PlusIcon, SparklesIcon, TrashIcon } from './icons';
import ProjectCard from './ProjectCard';

interface ClientViewProps {
    client: Client;
    projects: Project[];
    todos: Todo[];
    onUpdateProjectWorkStatus: (id: string, status: WorkStatus) => void;
    onUpdateProjectPaymentStatus: (id: string, status: PaymentStatus) => void;
    onUpdateProjectPriority: (id: string, priority: ProjectPriority) => void;
    onToggleTodo: (id: string, completed: boolean) => void;
    onAddProject: (clientId: string) => void;
    onAiAddProject: (clientId: string) => void;
    onAddTodo: (projectId: string) => void;
    onAddPayment: (projectId: string) => void;
    onDeletePayment: (projectId: string, paymentId: string) => void;
    onDeleteProject: (id: string) => void;
    onEditProject: (id: string) => void;
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
    onUpdateProjectPriority, 
    onToggleTodo, 
    onAddProject, 
    onAiAddProject, 
    onAddTodo, 
    onAddPayment,
    onDeletePayment,
    onDeleteProject, 
    onEditProject, 
    onDeleteTodo, 
    onUpdateProjectNotes,
    onDeleteClient
}) => (
    <div>
        <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div>
                <h1 className="text-3xl font-bold">{client.name}</h1>
                {client.email && <p className="text-gray-500">{client.email}</p>}
            </div>
             <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button onClick={() => onAddProject(client.id)} className="bg-primary text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center hover:bg-secondary transition-colors shadow">
                    <PlusIcon className="w-5 h-5 mr-2"/> Nuovo Progetto
                </button>
                <button onClick={() => onAiAddProject(client.id)} className="bg-accent text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center hover:bg-opacity-80 transition-colors shadow">
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
                    onUpdateProjectPriority={onUpdateProjectPriority}
                    onToggleTodo={onToggleTodo}
                    onAddTodo={onAddTodo}
                    onAddPayment={onAddPayment}
                    onDeletePayment={onDeletePayment}
                    onDeleteProject={onDeleteProject}
                    onEditProject={onEditProject}
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-2 gap-4">
                <p className="text-sm text-gray-500">L'eliminazione di un cliente è un'azione permanente e non può essere annullata.</p>
                <button onClick={() => onDeleteClient(client.id)} className="bg-red-500/10 text-red-700 dark:text-red-400 dark:hover:bg-red-500/20 hover:bg-red-500/20 px-4 py-2 rounded-lg font-semibold flex items-center transition-colors text-sm flex-shrink-0">
                    <TrashIcon className="w-4 h-4 mr-2"/> Elimina Cliente
                </button>
            </div>
        </div>
    </div>
);

export default ClientView;