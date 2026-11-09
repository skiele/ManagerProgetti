import React, { useMemo, useState } from 'react';
import { Client, Project, ProjectPriority, WorkStatus, PaymentStatus } from '../types';
import { workStatusConfig, paymentStatusConfig, projectPriorityConfig } from '../config/status';
import { formatCurrency } from '../utils/formatting';

type Filter = 'active' | 'all' | 'done' | 'cancelled';

interface ProjectsViewProps {
  projects: Project[];
  clients: Client[];
  projectTotals: Map<string, number>;
  onOpenProject: (id: string) => void;
}

const priorityRank: Record<ProjectPriority, number> = { [ProjectPriority.Alta]: 0, [ProjectPriority.Media]: 1, [ProjectPriority.Bassa]: 2 };

export const isProjectDone = (p: Project) => p.workStatus === WorkStatus.Consegnato && p.paymentStatus === PaymentStatus.Pagato;

const Badge: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <span className={`inline-block text-[11px] font-medium text-white px-2 py-0.5 rounded-full ${color}`}>{label}</span>
);

const ProjectsView: React.FC<ProjectsViewProps> = ({ projects, clients, projectTotals, onOpenProject }) => {
  const [filter, setFilter] = useState<Filter>('active');
  const [search, setSearch] = useState('');

  const clientName = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects
      .filter(p => {
        const cancelled = p.workStatus === WorkStatus.Annullato;
        if (filter === 'active' && (cancelled || isProjectDone(p))) return false;
        if (filter === 'done' && !isProjectDone(p)) return false;
        if (filter === 'cancelled' && !cancelled) return false;
        if (!q) return true;
        return p.name.toLowerCase().includes(q) || (clientName.get(p.clientId) || '').toLowerCase().includes(q);
      })
      .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || b.createdAt.localeCompare(a.createdAt));
  }, [projects, filter, search, clientName]);

  const filters: { id: Filter; label: string }[] = [
    { id: 'active', label: 'Attivi' },
    { id: 'done', label: 'Conclusi' },
    { id: 'cancelled', label: 'Annullati' },
    { id: 'all', label: 'Tutti' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Progetti</h1>
        <input type="text" placeholder="Cerca progetto o cliente..." value={search} onChange={e => setSearch(e.target.value)} className="md:max-w-xs" />
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border ${filter === f.id ? 'bg-primary text-primary-foreground border-primary dark:bg-dark-primary dark:border-dark-primary' : 'border-muted dark:border-dark-muted text-muted-foreground hover:text-foreground'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="text-center text-muted-foreground py-10 border-2 border-dashed border-muted dark:border-dark-muted rounded-lg">Nessun progetto.</div>
      ) : (
        <ul className="space-y-2">
          {visible.map(p => {
            const total = projectTotals.get(p.id) ?? p.value;
            const paid = (p.payments || []).reduce((s, x) => s + x.amount, 0);
            const remaining = total - paid;
            return (
              <li key={p.id}>
                <button onClick={() => onOpenProject(p.id)}
                  className={`w-full text-left flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 rounded-lg bg-card dark:bg-dark-card border border-muted/50 dark:border-dark-muted/50 hover:shadow-md border-l-4 ${p.priority === ProjectPriority.Alta ? 'border-l-orange-500' : p.priority === ProjectPriority.Media ? 'border-l-green-500' : 'border-l-gray-500'}`}
                  aria-label={`Apri progetto ${p.name}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{p.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{clientName.get(p.clientId) ?? 'Cliente sconosciuto'}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge {...workStatusConfig[p.workStatus]} />
                    <Badge {...paymentStatusConfig[p.paymentStatus]} />
                  </div>
                  <div className="sm:text-right sm:w-36 flex-shrink-0">
                    <p className="font-semibold">{formatCurrency(total)}</p>
                    {remaining > 0 && paid > 0 && <p className="text-xs text-orange-500">da incassare {formatCurrency(remaining)}</p>}
                  </div>
                  <span className="sr-only">Priorità {projectPriorityConfig[p.priority].label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ProjectsView;
