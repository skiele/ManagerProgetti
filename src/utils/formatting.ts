// Formato euro italiano con separatore delle migliaia sempre presente (7.300,00 €).
// Con le impostazioni predefinite l'italiano non separa i numeri di 4 cifre (7300,00 €),
// e accanto a 13.500 € la colonna risulterebbe disallineata.
const euroFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', useGrouping: 'always' } as unknown as Intl.NumberFormatOptions);

export const formatCurrency = (amount: number): string => euroFormatter.format(amount);

// Per i numeri grandi a colpo d'occhio: niente ",00" quando non ci sono centesimi (9.800 €)
export const formatCurrencyShort = (amount: number): string =>
  Number.isInteger(amount) ? formatCurrency(amount).replace(/,00(?=\s?€)/, '') : formatCurrency(amount);

// Link "Aggiungi a Google Calendar" per un evento di un giorno intero (nessun accesso all'account)
export const googleCalendarLink = (title: string, isoDate: string, details?: string): string => {
  const start = isoDate.slice(0, 10);
  const next = new Date(`${start}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const dates = `${start.replace(/-/g, '')}/${next.toISOString().slice(0, 10).replace(/-/g, '')}`;
  const params = new URLSearchParams({ action: 'TEMPLATE', text: title, dates, ...(details ? { details } : {}) });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};
