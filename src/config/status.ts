import { WorkStatus, PaymentStatus, ProjectPriority } from '../types';

// Classi complete (fondo + testo + bordo) per i tag di stato, stile "grafico svizzero":
// pieno nero = in corso, contorno = in attesa, grigio = chiuso, arancio segnale = attenzione.
const SOLID = 'bg-foreground text-background border border-foreground';
const OUTLINE = 'bg-transparent text-foreground border border-foreground';
const MUTED = 'bg-muted text-muted-foreground border border-muted';
const SIGNAL = 'bg-signal text-black border border-signal';

export const workStatusConfig: Record<WorkStatus, { color: string; label: string }> = {
  [WorkStatus.PreventivoDaInviare]: { color: OUTLINE, label: 'Preventivo da inviare' },
  [WorkStatus.PreventivoInviato]: { color: OUTLINE, label: 'Preventivo inviato' },
  [WorkStatus.InLavorazione]: { color: SOLID, label: 'In lavorazione' },
  [WorkStatus.Consegnato]: { color: MUTED, label: 'Consegnato' },
  [WorkStatus.Annullato]: { color: `${MUTED} line-through`, label: 'Annullato' },
};

export const paymentStatusConfig: Record<PaymentStatus, { color: string; label: string }> = {
  [PaymentStatus.DaFatturare]: { color: OUTLINE, label: 'Da fatturare' },
  [PaymentStatus.Fatturato]: { color: SOLID, label: 'Fatturato' },
  [PaymentStatus.ParzialmentePagato]: { color: SIGNAL, label: 'Pagato in parte' },
  [PaymentStatus.Pagato]: { color: MUTED, label: 'Pagato' },
};

export const projectPriorityConfig: Record<ProjectPriority, { color: string; label: string }> = {
  [ProjectPriority.Bassa]: { color: MUTED, label: 'Bassa' },
  [ProjectPriority.Media]: { color: OUTLINE, label: 'Media' },
  [ProjectPriority.Alta]: { color: SIGNAL, label: 'Alta' },
};

// Tag statico (non modificabile) con lo stesso stile
export const tagClass = 'inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2 py-1';
