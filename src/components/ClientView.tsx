import React from 'react';
import { Client, Project, Todo } from '../types';
import { SparklesIcon, TrashIcon } from './icons';
import PageHeader from './PageHeader';
import { isProjectClosed, LayoutToggle, ProjectRow, ProjectTile, projectGridClass, useProjectLayout } from './ProjectsView';

interface ClientViewProps {
    client: Client;
    projects: Project[];
    projectTotals: Map<string, number>;
    todos: Todo[];
    onOpenProject: (id: string) => void;
    onAiAddProject: (clientId: string) => void;
    onDeleteClient: (clientId: string) => void;
}

// Pagina cliente: elenco compatto dei progetti; attività, pagamenti e preventivi si gestiscono nella pagina progetto.
const ClientView: React.FC<ClientViewProps> = ({ client, projects, projectTotals, todos, onOpenProject, onAiAddProject, onDeleteClient }) => {
    const [layout, setLayout] = useProjectLayout();
    const sorted = [...projects].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const open = sorted.filter(p => !isProjectClosed(p));
    const closed = sorted.filter(isProjectClosed);
    const created = (p: Project) => `Creato il ${new Date(p.createdAt).toLocaleDateString('it-IT')}`;
    const renderGroup = (list: Project[]) => layout === 'grid'
        ? <ul className={projectGridClass}>
            {list.map(p => (
                <ProjectTile key={p.id} project={p} total={projectTotals.get(p.id) ?? p.value} onOpen={onOpenProject}
                    todos={todos.filter(t => t.projectId === p.id)} overline={created(p)} />
            ))}
          </ul>
        : <ul className="border-t-2 border-foreground">
            {list.map(p => (
                <ProjectRow key={p.id} project={p} total={projectTotals.get(p.id) ?? p.value} onOpen={onOpenProject} subtitle={created(p)} />
            ))}
          </ul>;
    return (
        <div className="max-w-[1120px]">
            <PageHeader
                overline={`Cliente · ${projects.length} ${projects.length === 1 ? 'progetto' : 'progetti'}`}
                title={client.name}
                subtitle={client.email}
                actions={
                    <button onClick={() => onAiAddProject(client.id)} className="h-10 px-4 border-2 border-foreground font-semibold flex items-center hover:bg-muted">
                        <SparklesIcon className="w-4 h-4 mr-2"/> Crea con AI
                    </button>
                }
            />

            {sorted.length === 0
                ? <p className="py-10 text-muted-foreground border-t-2 border-foreground">Nessun progetto per questo cliente. Aggiungine uno con il pulsante +.</p>
                : <>
                    <div className="flex justify-end mb-6"><LayoutToggle layout={layout} onChange={setLayout} /></div>
                    {open.length > 0
                        ? renderGroup(open)
                        : <p className="py-6 text-muted-foreground border-t-2 border-foreground">Nessun progetto in corso.</p>}
                    {closed.length > 0 && (
                        <section aria-labelledby="closed-projects" className="mt-14">
                            <h2 id="closed-projects" className="flex items-baseline justify-between pb-2 mb-6 border-b border-foreground/40 text-muted-foreground">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">Conclusi</span>
                                <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">{closed.length}</span>
                            </h2>
                            {renderGroup(closed)}
                        </section>
                    )}
                  </>}

            <section aria-labelledby="danger-zone" className="mt-16 pt-4 border-t-2 border-destructive">
                <h2 id="danger-zone" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-destructive">Zona pericolo</h2>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-3 gap-4">
                    <p className="text-sm text-muted-foreground">Elimina il cliente con tutti i suoi progetti, attività e preventivi. Non si può annullare.</p>
                    <button onClick={() => onDeleteClient(client.id)} className="h-10 px-4 border-2 border-destructive text-destructive font-semibold flex items-center hover:bg-destructive hover:text-destructive-foreground flex-shrink-0">
                        <TrashIcon className="w-4 h-4 mr-2"/> Elimina cliente
                    </button>
                </div>
            </section>
        </div>
    );
};

export default ClientView;
