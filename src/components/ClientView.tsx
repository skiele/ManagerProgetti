
import React from 'react';
import { Client, Project, Todo, WorkStatus, PaymentStatus } from '../types';
import { PlusIcon } from './icons';
import ProjectCard from './ProjectCard';

interface ClientViewProps {
    client: Client;
    projects: Project[];
    todos: Todo[];
    onUpdateProjectWorkStatus: (id: string, status: WorkStatus) => void;
    onUpdateProjectPaymentStatus: (id: string, status: PaymentStatus) => void;
    onToggleTodo: (id: string, completed: boolean) => void;
    onAddProject: (clientId: string) => void;
    onAddTodo: (projectId: string) => void;
    onDeleteProject: (id: string) => void;
    onDeleteTodo: (id: string) => void;
    onUpdateProjectNotes: (id: string, notes: string) => void;
}

const ClientView: React.FC<ClientViewProps> = ({ client, projects, todos, onUpdateProjectWorkStatus, onUpdateProjectPaymentStatus, onToggleTodo, onAddProject, onAddTodo, onDeleteProject, onDeleteTodo, onUpdateProjectNotes }) => (
    <div>
        <div className="flex justify-between items-center mb-6">
            <div>
                <h1 className="text-3xl font-bold">{client.name}</h1>
                {client.email && <p className="text-gray-500">{client.email}</p>}
            </div>
            <button onClick={() => onAddProject(client.id)} className="bg-primary text-white px-4 py-2 rounded-lg font-semibold flex items-center hover:bg-secondary transition-colors shadow-lg">
                <PlusIcon className="w-5 h-5 mr-2"/> Nuovo Progetto
            </button>
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
                    onDeleteTodo={onDeleteTodo}
                    onUpdateProjectNotes={onUpdateProjectNotes}
                />
            ))}
             {projects.length === 0 && <p className="text-center text-gray-500 py-8">Nessun progetto per questo cliente.</p>}
        </div>
    </div>
);

export default ClientView;