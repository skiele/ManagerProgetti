import React, { useMemo, useState } from 'react';
import { Client, Project, ProjectPriority, Todo, WorkStatus, PaymentStatus } from '../types';
import { workStatusConfig, paymentStatusConfig, projectPriorityConfig, tagClass } from '../config/status';
import { formatCurrency, formatCurrencyShort } from '../utils/formatting';
import PageHeader from './PageHeader';

type Filter = 'active' | 'all' | 'done' | 'cancelled';

interface ProjectsViewProps {
  projects: Project[];
  clients: Client[];
  projectTotals: Map<string, number>;
  todos: Todo[];
  onOpenProject: (id: string) => void;
}

const priorityRank: Record<ProjectPriority, number> = { [ProjectPriority.Alta]: 0, [ProjectPriority.Media]: 1, [ProjectPriority.Bassa]: 2 };

export const isProjectDone = (p: Project) => p.workStatus === WorkStatus.Consegnato && p.paymentStatus === PaymentStatus.Pagato;
// Chiuso = consegnato e pagato, oppure annullato: va in fondo e in secondo piano
export const isProjectClosed = (p: Project) => isProjectDone(p) || p.workStatus === WorkStatus.Annullato;

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
        className={`w-full text-left flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-4 pl-4 pr-2 border-b border-foreground hover:bg-muted/60 border-l-4 ${isProjectClosed(p) ? 'border-l-transparent opacity-50 hover:opacity-100' : p.priority === ProjectPriority.Alta ? 'border-l-signal' : p.priority === ProjectPriority.Media ? 'border-l-foreground' : 'border-l-transparent'}`}
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

// --- Vista a box -----------------------------------------------------------

export type ProjectLayout = 'grid' | 'list';
const LAYOUT_KEY = 'progetta.projectsLayout';

export const useProjectLayout = (): [ProjectLayout, (l: ProjectLayout) => void] => {
  const [layout, setLayout] = useState<ProjectLayout>(() => {
    try { return localStorage.getItem(LAYOUT_KEY) === 'list' ? 'list' : 'grid'; } catch { return 'grid'; }
  });
  const update = (l: ProjectLayout) => {
    setLayout(l);
    try { localStorage.setItem(LAYOUT_KEY, l); } catch { /* preferenza non salvata: pazienza */ }
  };
  return [layout, update];
};

export const LayoutToggle: React.FC<{ layout: ProjectLayout; onChange: (l: ProjectLayout) => void }> = ({ layout, onChange }) => (
  <div className="flex" role="group" aria-label="Vista">
    {(['grid', 'list'] as ProjectLayout[]).map((l, i) => (
      <button key={l} onClick={() => onChange(l)} aria-pressed={layout === l}
        className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider border-2 border-foreground ${i > 0 ? 'border-l-0' : ''} ${layout === l ? 'bg-foreground text-background' : 'hover:bg-muted'}`}>
        {l === 'grid' ? 'Box' : 'Elenco'}
      </button>
    ))}
  </div>
);

const shortDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;

// Box di progetto: barra in alto = priorità, importo grande, barra dell'incassato, prossima scadenza
export const ProjectTile: React.FC<{ project: Project; overline: string; total: number; todos: Todo[]; onOpen: (id: string) => void }> = ({ project: p, overline, total, todos, onOpen }) => {
  const paid = (p.payments || []).reduce((s, x) => s + x.amount, 0);
  const remaining = Math.max(0, total - paid);
  const paidPct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  const open = todos.filter(t => !t.completed);
  const next = open.filter(t => t.dueDate).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))[0];
  const today = new Date().toISOString().slice(0, 10);
  const closed = isProjectClosed(p);
  // La priorità conta solo per i progetti aperti
  const priorityBar = closed ? 'bg-muted' : p.priority === ProjectPriority.Alta ? 'bg-signal' : p.priority === ProjectPriority.Media ? 'bg-foreground' : 'bg-muted';
  return (
    <li className="flex">
      <button onClick={() => onOpen(p.id)} aria-label={`Apri progetto ${p.name}`}
        className={`group w-full text-left flex flex-col border-2 border-foreground bg-card hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_hsl(var(--foreground))] transition ${closed ? 'opacity-50 hover:opacity-100 border-foreground/40' : ''}`}>
        <span aria-hidden="true" className={`h-1.5 w-full ${priorityBar}`}></span>
        <span className="flex flex-col flex-1 p-5 gap-4">
          <span>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] truncate">{overline}</span>
            <span className="block mt-2 text-2xl font-extrabold tracking-[-0.03em] leading-tight line-clamp-2">{p.name}</span>
          </span>
          <span className="flex flex-wrap gap-1.5">
            <Badge {...workStatusConfig[p.workStatus]} />
            <Badge {...paymentStatusConfig[p.paymentStatus]} />
          </span>
          <span className="mt-auto block">
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-3xl font-extrabold tracking-[-0.04em]">{formatCurrencyShort(total)}</span>
              {remaining > 0 && paid > 0 && <span className="text-xs font-semibold text-right">da incassare<br />{formatCurrencyShort(remaining)}</span>}
            </span>
            <span className="mt-2 block h-1.5 bg-muted" aria-label={`Incassato ${Math.round(paidPct)}%`}>
              <span className="block h-full bg-foreground" style={{ width: `${paidPct}%` }}></span>
            </span>
          </span>
        </span>
        <span className="flex items-baseline gap-3 px-5 py-3 border-t-2 border-foreground text-[13px] min-h-[46px]">
          {next ? <>
            <span className={`font-extrabold flex-shrink-0 ${next.dueDate! < today ? 'text-signal' : ''}`}>{next.dueDate === today ? 'Oggi' : shortDate(next.dueDate!)}</span>
            <span className="truncate">{next.task}</span>
          </> : <span className="text-muted-foreground">{open.length ? `${open.length} attività senza scadenza` : 'Nessuna attività aperta'}</span>}
        </span>
        <span className="sr-only">Priorità {projectPriorityConfig[p.priority].label}</span>
      </button>
    </li>
  );
};

export const projectGridClass = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6';

const ProjectsView: React.FC<ProjectsViewProps> = ({ projects, clients, projectTotals, todos, onOpenProject }) => {
  const [layout, setLayout] = useProjectLayout();
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
      .sort((a, b) => Number(isProjectClosed(a)) - Number(isProjectClosed(b)) || priorityRank[a.priority] - priorityRank[b.priority] || b.createdAt.localeCompare(a.createdAt));
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

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider border-2 border-foreground ${filter === f.id ? 'bg-foreground text-background' : 'text-foreground hover:bg-muted'}`}>
            {f.label}
          </button>
        ))}
      </div>
      <LayoutToggle layout={layout} onChange={setLayout} />
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-muted-foreground border-t-2 border-foreground">Nessun progetto.</p>
      ) : (
        layout === 'grid' ? (
          <ul className={projectGridClass}>
            {visible.map(p => (
              <ProjectTile key={p.id} project={p} overline={clientName.get(p.clientId) ?? 'Cliente sconosciuto'}
                total={projectTotals.get(p.id) ?? p.value} todos={todos.filter(t => t.projectId === p.id)} onOpen={onOpenProject} />
            ))}
          </ul>
        ) : (
          <ul className="border-t-2 border-foreground">
            {visible.map(p => (
              <ProjectRow key={p.id} project={p} subtitle={clientName.get(p.clientId) ?? 'Cliente sconosciuto'}
                total={projectTotals.get(p.id) ?? p.value} onOpen={onOpenProject} />
            ))}
          </ul>
        )
      )}
    </div>
  );
};

export default ProjectsView;
