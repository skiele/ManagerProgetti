import { Quote, QuoteItem } from '../types';

// Marca da bollo: dovuta sulle fatture senza IVA di importo superiore a 77,47 €.
export const STAMP_DUTY_THRESHOLD = 77.47;
export const STAMP_DUTY_AMOUNT = 2;

export const DEFAULT_TAX_NOTE =
  "Operazione effettuata ai sensi dell'art. 1, commi da 54 a 89, della Legge n. 190/2014 (regime forfettario). " +
  "Operazione senza applicazione dell'IVA e non soggetta a ritenuta d'acconto.";

const round2 = (n: number) => Math.round(n * 100) / 100;

export const itemAmount = (item: QuoteItem) => round2((item.quantity || 0) * (item.unitPrice || 0));

export const quoteTotals = (quote: Pick<Quote, 'items' | 'chargeStampDuty'>) => {
  const subtotal = round2(quote.items.reduce((sum, item) => sum + itemAmount(item), 0));
  const stampDuty = quote.chargeStampDuty && subtotal > STAMP_DUTY_THRESHOLD ? STAMP_DUTY_AMOUNT : 0;
  return { subtotal, stampDuty, total: round2(subtotal + stampDuty) };
};

// Numerazione progressiva per anno: 2026-001, 2026-002, ...
export const nextQuoteNumber = (quotes: Quote[], date: string) => {
  const year = date.slice(0, 4);
  const max = quotes.reduce((m, q) => {
    const match = q.number.match(new RegExp(`^${year}-(\\d+)$`));
    return match ? Math.max(m, Number(match[1])) : m;
  }, 0);
  return `${year}-${String(max + 1).padStart(3, '0')}`;
};

export const addDays = (isoDate: string, days: number) => {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const formatDate = (isoDate: string) => new Date(`${isoDate}T12:00:00`).toLocaleDateString('it-IT');
