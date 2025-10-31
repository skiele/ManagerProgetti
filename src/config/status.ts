
import { WorkStatus, PaymentStatus } from '../types';

export const workStatusConfig: Record<WorkStatus, { color: string; label: string }> = {
  [WorkStatus.PreventivoDaInviare]: { color: 'bg-gray-500', label: 'Preventivo da Inviare' },
  [WorkStatus.PreventivoInviato]: { color: 'bg-yellow-500', label: 'Preventivo Inviato' },
  [WorkStatus.InLavorazione]: { color: 'bg-blue-500', label: 'In Lavorazione' },
  [WorkStatus.Consegnato]: { color: 'bg-purple-500', label: 'Consegnato' },
  [WorkStatus.Annullato]: { color: 'bg-red-500', label: 'Annullato' },
};

export const paymentStatusConfig: Record<PaymentStatus, { color: string; label: string }> = {
  [PaymentStatus.DaFatturare]: { color: 'bg-indigo-500', label: 'Da Fatturare' },
  [PaymentStatus.Fatturato]: { color: 'bg-teal-500', label: 'Fatturato' },
  [PaymentStatus.Pagato]: { color: 'bg-green-500', label: 'Pagato' },
};