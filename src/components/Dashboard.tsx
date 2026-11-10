import React, { useMemo } from 'react';
import { Client, PaymentStatus, Project, Todo, WorkStatus } from '../types';
import { formatCurrencyShort } from '../utils/formatting';
import { tagClass } from '../config/status';
import PageHeader from './PageHeader';

interface ChartData {
  name: string;
  incassati: number;
  futuri: number;
  potenziali: number;
}

interface DashboardProps {
  collectedIncome: number;
  futureIncome: number;
  potentialIncome: number;
  chartData: ChartData[];
  filterYear: string;
  setFilterYear: (year: string) => void;
  filterMonth: string;
  setFilterMonth: (month: string) => void;
  availableYears: string[];
  projects: Project[];
  clients: Client[];
  todos: Todo[];
  projectTotals: Map<string, number>;
  onOpenProject: (id: string) => void;
  onOpenTasks: () => void;
  onOpenProjects: () => void;
  onNewProject: () => void;
}

const euro = formatCurrencyShort;
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const shortDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;

const Kpi: React.FC<{ index: string; label: string; value: number; note: string; highlight?: boolean; first?: boolean }> = ({ index, label, value, note, highlight, first }) => {
  const whole = euro(value).replace(/\s?€$/, '');
  return (
    <div className={first ? 'pr-6' : 'sm:px-6 sm:border-l-2 border-foreground'}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">{index} · {label}</p>
      <p className={`mt-2.5 text-5xl lg:text-[64px] font-extrabold tracking-[-0.05em] leading-none ${highlight ? 'text-signal' : ''}`}>
        {whole}<span className="text-2xl lg:text-[28px] font-medium tracking-normal"> €</span>
      </p>
      <p className="mt-2 text-muted-foreground">{note}</p>
    </div>
  );
};

const SectionTitle: React.FC<{ id: string; title: string; action?: React.ReactNode }> = ({ id, title, action }) => (
  <div className="flex justify-between items-baseline pb-2 border-b-2 border-foreground">
    <h2 id={id} className="text-xl font-extrabold tracking-[-0.02em]">{title}</h2>
    {action}
  </div>
);

const LinkButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button onClick={onClick} className="text-[13px] font-medium underline underline-offset-[3px] hover:text-muted-foreground">{children}</button>
);

const Dashboard: React.FC<DashboardProps> = ({
  collectedIncome, futureIncome, potentialIncome, chartData,
  filterYear, setFilterYear, filterMonth, setFilterMonth, availableYears,
  projects, clients, todos, projectTotals, onOpenProject, onOpenTasks, onOpenProjects, onNewProject,
}) => {
  const clientName = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);
  const projectById = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);
  const paidOf = (p: Project) => (p.payments || []).reduce((s, x) => s + x.amount, 0);
  const today = todayIso();

  // Scadenze: attività aperte con data, di progetti non annullati; le scadute in cima
  const deadlines = useMemo(() => todos
    .filter(t => !t.completed && t.dueDate && projectById.get(t.projectId)?.workStatus !== WorkStatus.Annullato)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
    .slice(0, 6), [todos, projectById]);

  // Da incassare: progetti in lavorazione o consegnati con un residuo da pagare
  const receivables = useMemo(() => projects
    .filter(p => (p.workStatus === WorkStatus.InLavorazione || p.workStatus === WorkStatus.Consegnato) && p.paymentStatus !== PaymentStatus.Pagato)
    .map(p => ({ project: p, total: projectTotals.get(p.id) ?? p.value, paid: paidOf(p) }))
    .map(r => ({ ...r, remaining: r.total - r.paid }))
    .filter(r => r.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining), [projects, projectTotals]);

  const quoteCount = projects.filter(p => p.workStatus === WorkStatus.PreventivoDaInviare || p.workStatus === WorkStatus.PreventivoInviato).length;
  const collectedCount = projects.filter(p => (p.payments || []).some(pay => {
    const d = new Date(pay.date);
    return (filterYear === 'all' || String(d.getFullYear()) === filterYear) && (filterMonth === 'all' || String(d.getMonth() + 1) === filterMonth);
  })).length;

  const rows = [...chartData]
    .map(d => ({ ...d, total: d.incassati + d.futuri + d.potenziali }))
    .sort((a, b) => b.total - a.total);
  const maxTotal = Math.max(1, ...rows.map(r => r.total));
  const pct = (n: number) => `${(n / maxTotal) * 100}%`;

  const now = new Date();
  const overline = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} — ${now.toLocaleDateString('it-IT', { weekday: 'long' })}`;
  const periodLabel = filterYear === 'all' ? 'totale' : filterYear;

  return (
    <div className="max-w-[1120px]">
      <PageHeader
        overline={<span className="capitalize">{overline}</span>}
        title="Dashboard"
        actions={<>
          <div className="flex">
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} aria-label="Anno" className="!w-auto !h-10 !border-2 !border-foreground font-semibold !ring-0">
              <option value="all">Tutti gli anni</option>
              {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} aria-label="Mese" className="!w-auto !h-10 !border-2 !border-l-0 !border-foreground font-semibold !ring-0">
              <option value="all">Tutti i mesi</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>{new Date(2000, i).toLocaleString('it-IT', { month: 'long' })}</option>
              ))}
            </select>
          </div>
          <button onClick={onNewProject} className="h-10 px-[18px] border-2 border-foreground bg-foreground text-background font-semibold hover:bg-primary-hover">+ Nuovo progetto</button>
        </>}
      />

      <section aria-label="Riepilogo economico" className="grid grid-cols-1 sm:grid-cols-3 gap-y-8 mb-10">
        <Kpi first index="01" label={`Incassato ${periodLabel}`} value={collectedIncome} note={`${collectedCount} ${collectedCount === 1 ? 'progetto' : 'progetti'}`} />
        <Kpi index="02" label="Da incassare" value={futureIncome} highlight note={`${receivables.length} ${receivables.length === 1 ? 'progetto' : 'progetti'} in corso o consegnati`} />
        <Kpi index="03" label="In preventivo" value={potentialIncome} note={`${quoteCount} ${quoteCount === 1 ? 'preventivo' : 'preventivi'} in attesa`} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
        <section aria-labelledby="dash-deadlines">
          <SectionTitle id="dash-deadlines" title="Scadenze" action={<LinkButton onClick={onOpenTasks}>Tutte →</LinkButton>} />
          {deadlines.length === 0 && <p className="py-6 text-muted-foreground">Nessuna scadenza in arrivo.</p>}
          <ul>
            {deadlines.map((t, i) => {
              const project = projectById.get(t.projectId);
              const overdue = t.dueDate! < today;
              const isToday = t.dueDate === today;
              return (
                <li key={t.id} className={`grid grid-cols-[64px_1fr_auto] gap-3 items-baseline py-3 ${i < deadlines.length - 1 ? 'border-b border-foreground' : ''}`}>
                  <span className="font-extrabold">{isToday ? 'Oggi' : shortDate(t.dueDate!)}</span>
                  <button onClick={() => project && onOpenProject(project.id)} className="min-w-0 text-left">
                    <p className="font-semibold">{t.task}</p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground truncate">{project ? `${clientName.get(project.clientId) ?? ''} / ${project.name}` : ''}</p>
                  </button>
                  {overdue ? <span className={`${tagClass} bg-foreground text-background`}>Scaduta</span>
                    : isToday ? <span aria-hidden="true" className="w-2.5 h-2.5 bg-signal"></span> : <span></span>}
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="dash-receivables">
          <SectionTitle id="dash-receivables" title="Da incassare" action={<LinkButton onClick={onOpenProjects}>Progetti →</LinkButton>} />
          {receivables.length === 0 && <p className="py-6 text-muted-foreground">Nessun incasso in sospeso.</p>}
          <ul>
            {receivables.slice(0, 6).map((r, i, list) => (
              <li key={r.project.id} className={i < list.length - 1 ? 'border-b border-foreground' : ''}>
                <button onClick={() => onOpenProject(r.project.id)} className="w-full grid grid-cols-[1fr_auto] gap-3 items-baseline py-3 text-left">
                  <span className="min-w-0">
                    <span className="block font-semibold">{r.project.name}</span>
                    <span className="block mt-0.5 text-[13px] text-muted-foreground truncate">
                      {clientName.get(r.project.clientId) ?? ''} / {r.paid > 0 ? `pagato ${euro(r.paid)} di ${euro(r.total)}` : r.project.paymentStatus === PaymentStatus.Fatturato ? 'FATTURATO' : 'da fatturare'}
                    </span>
                  </span>
                  <span className="text-xl font-extrabold tracking-[-0.02em]">{euro(r.remaining)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="dash-clients">
        <div className="flex flex-wrap justify-between items-baseline gap-3 pb-2 border-b-2 border-foreground">
          <h2 id="dash-clients" className="text-xl font-extrabold tracking-[-0.02em]">Per cliente</h2>
          <div className="flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-[0.06em]">
            <span className="flex items-center gap-1.5"><span aria-hidden="true" className="w-3 h-3 bg-foreground"></span>Incassato</span>
            <span className="flex items-center gap-1.5"><span aria-hidden="true" className="w-3 h-3 bg-signal"></span>Da incassare</span>
            <span className="flex items-center gap-1.5"><span aria-hidden="true" className="w-3 h-3 bg-muted-foreground/40"></span>In preventivo</span>
          </div>
        </div>
        {rows.length === 0 && <p className="py-6 text-muted-foreground">Nessun dato per i filtri selezionati.</p>}
        <ul className="mt-4 space-y-2.5">
          {rows.map(r => (
            <li key={r.name} className="grid grid-cols-[minmax(0,140px)_1fr_80px] sm:grid-cols-[210px_1fr_100px] gap-4 items-center"
              title={`Incassato ${euro(r.incassati)} · Da incassare ${euro(r.futuri)} · In preventivo ${euro(r.potenziali)}`}>
              <span className="font-medium truncate">{r.name}</span>
              <span className="flex h-5" aria-label={`Incassato ${euro(r.incassati)}, da incassare ${euro(r.futuri)}, in preventivo ${euro(r.potenziali)}`}>
                <span className="bg-foreground" style={{ width: pct(r.incassati) }}></span>
                <span className="bg-signal" style={{ width: pct(r.futuri) }}></span>
                <span className="bg-muted-foreground/40" style={{ width: pct(r.potenziali) }}></span>
              </span>
              <span className="text-right font-extrabold">{euro(r.total)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default Dashboard;
