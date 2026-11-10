import React, { useMemo, useState } from 'react';
import { Client, Project, ProjectPriority, WorkStatus, PaymentStatus } from '../types';
import { workStatusConfig, paymentStatusConfig, projectPriorityConfig, tagClass } from '../config/status';
import { formatCurrency } from '../utils/formatting';
import PageHeader from './PageHeader';

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
  <span className={`${tagClass} ${color}`}>{label}</span>
);

// Riga di progetto riutilizzata nella vista Progetti e nella pagina cliente
export const ProjectRow: React.FC<{ project: Project; subtitle: string; total: number; onOpen: (id: string) => void }> = ({ project: p, subtitle, total, onOpen }) => {
  const paid = (p.payments || []).reduce((s, x) => s + x.amount, 0);
  const remaining = total - paid;
  return (
    <li>
      <button onClick={() => onOpen(p.id)}
        className={`w-full text-left flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-4 pl-4 pr-2 border-b border-foreground hover:bg-muted/60 border-l-4 ${p.priority === ProjectPriority.Alta ? 'border-l-signal' : p.priority === ProjectPriority.Media ? 'border-l-foreground' : 'border-l-transparent'}`}
        aria-label={`Apri progetto ${p.name}`}>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{p.name}</p>
          <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge {...workStatusConfig[p.workStatus]} />
          <Badge {...paymentStatusConfig[p.paymentStatus]} />
        </div>
        <div className="sm:text-right sm:w-36 flex-shrink-0">
          <p className="text-lg font-extrabold tracking-[-0.02em]">{formatCurrency(total)}</p>
          {remaining > 0 && paid > 0 && <p className="text-xs font-semibold">da incassare {formatCurrency(remaining)}</p>}
        </div>
        <span className="sr-only">Priorità {projectPriorityConfig[p.priority].label}</span>
      </button>
    </li>
  );
};

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
    <div className="max-w-[1120px]">
      <PageHeader overline={`${projects.length} progetti`} title="Progetti"
        actions={<input type="text" placeholder="Cerca progetto o cliente…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Cerca" className="md:!w-72 !border-2 !border-foreground !ring-0" />} />

      <div className="flex gap-2 mb-4 flex-wrap">
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider border-2 border-foreground ${filter === f.id ? 'bg-foreground text-background' : 'text-foreground hover:bg-muted'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-muted-foreground border-t-2 border-foreground">Nessun progetto.</p>
      ) : (
        <ul className="border-t-2 border-foreground">
          {visible.map(p => (
            <ProjectRow key={p.id} project={p} subtitle={clientName.get(p.clientId) ?? 'Cliente sconosciuto'}
              total={projectTotals.get(p.id) ?? p.value} onOpen={onOpenProject} />
          ))}
        </ul>
      )}
    </div>
  );
};

export default ProjectsView;
