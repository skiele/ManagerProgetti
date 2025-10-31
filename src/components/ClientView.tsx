

import React from 'react';
import { Client, Project, Todo, WorkStatus, PaymentStatus } from '../types';
import { PlusIcon, SparklesIcon } from './icons';
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
}

const ClientView: React.FC<ClientViewProps> = ({ client, projects, todos, onUpdateProjectWorkStatus, onUpdateProjectPaymentStatus, onToggleTodo, onAddProject, onAiAddProject, onAddTodo, onDeleteProject, onDuplicateProject, onDeleteTodo, onUpdateProjectNotes }) => (
    <div>
        <div className="flex justify-between items-center mb-6 gap-2 flex-wrap">
            <div>
                <h1 className="text-3xl font-bold">{client.name}</h1>
                {client.email && <p className="text-gray-500">{client.email}</p>}
            </div>
            <div className="flex gap-2">
                <button onClick={() => onAddProject(client.id)} className="bg-primary text-white px-4 py-2 rounded-lg font-semibold flex items-center hover:bg-secondary transition-colors shadow-lg">
                    <PlusIcon className="w-5 h-5 mr-2"/> Nuovo Progetto
                </button>
                <button onClick={() => onAiAddProject(client.id)} className="bg-accent text-white px-4 py-2 rounded-lg font-semibold flex items-center hover:bg-opacity-80 transition-colors shadow-lg">
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
             {projects.length === 0 && <p className="text-center text-gray-500 py-8">Nessun progetto per questo cliente.</p>}
        </div>
    </div>
);

export default ClientView;
