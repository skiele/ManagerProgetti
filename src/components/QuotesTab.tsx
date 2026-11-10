import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BusinessProfile, Client, Project, Quote, QuoteItem, QuoteStatus } from '../types';
import { CopyIcon, DownloadIcon, EditIcon, PlusIcon, TrashIcon, XIcon } from './icons';
import { formatCurrency } from '../utils/formatting';
import { addDays, formatDate, itemAmount, nextQuoteNumber, quoteTotals, STAMP_DUTY_AMOUNT, STAMP_DUTY_THRESHOLD } from '../utils/quotes';

export const quoteStatusConfig: Record<QuoteStatus, { color: string; label: string }> = {
  [QuoteStatus.Bozza]: { color: 'bg-transparent text-foreground border border-foreground', label: 'Bozza' },
  [QuoteStatus.Inviato]: { color: 'bg-signal text-black border border-signal', label: 'Inviato' },
  [QuoteStatus.Accettato]: { color: 'bg-foreground text-background border border-foreground', label: 'Accettato' },
  [QuoteStatus.Rifiutato]: { color: 'bg-muted text-muted-foreground border border-muted line-through', label: 'Rifiutato' },
};

interface QuotesTabProps {
  project: Project;
  client?: Client;
  quotes: Quote[];        // preventivi di questo progetto
  allQuotes: Quote[];     // tutti, per la numerazione progressiva
  profile: BusinessProfile | null;
  onSave: (quote: Quote) => void;
  onDelete: (quote: Quote) => void;
  onChangeStatus: (quote: Quote, status: QuoteStatus) => void;
  onOpenSettings: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const newItem = (): QuoteItem => ({ id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 });

const recipientFor = (client?: Client) => [client?.name, client?.email].filter(Boolean).join('\n');

// ---------------------------------------------------------------------------
// Documento stampabile (usato per "Salva PDF" tramite la stampa del browser)
// ---------------------------------------------------------------------------

export const QuoteDocument: React.FC<{ quote: Quote; project: Project; profile: BusinessProfile | null }> = ({ quote, project, profile }) => {
  const { subtotal, stampDuty, total } = quoteTotals(quote);
  return (
    <div className="quote-doc">
      <header className="qd-header">
        <div>
          <p className="qd-issuer">{profile?.name || 'Inserisci i tuoi dati in Impostazioni'}</p>
          {profile?.address && <p className="qd-pre">{profile.address}</p>}
          {profile?.vatNumber && <p>P. IVA {profile.vatNumber}</p>}
          {profile?.fiscalCode && <p>C.F. {profile.fiscalCode}</p>}
          {(profile?.email || profile?.phone) && <p>{[profile?.email, profile?.phone].filter(Boolean).join(' · ')}</p>}
        </div>
        <div className="qd-meta">
          <p className="qd-title">Preventivo</p>
          <p>N. {quote.number}</p>
          <p>Data {formatDate(quote.date)}</p>
          <p>Valido fino al {formatDate(addDays(quote.date, quote.validityDays))}</p>
        </div>
      </header>

      <section className="qd-recipient">
        <p className="qd-label">Spett.le</p>
        <p className="qd-pre">{quote.recipient}</p>
      </section>

      <p className="qd-subject"><span className="qd-label">Oggetto:</span> {project.name}</p>

      <table className="qd-table">
        <thead>
          <tr><th>Descrizione</th><th className="num">Q.tà</th><th className="num">Prezzo</th><th className="num">Importo</th></tr>
        </thead>
        <tbody>
          {quote.items.map(item => (
            <tr key={item.id}>
              <td className="qd-pre">{item.description}</td>
              <td className="num">{item.quantity.toLocaleString('it-IT')}</td>
              <td className="num">{formatCurrency(item.unitPrice)}</td>
              <td className="num">{formatCurrency(itemAmount(item))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="qd-totals">
        <tbody>
          <tr><td>Imponibile</td><td className="num">{formatCurrency(subtotal)}</td></tr>
          {stampDuty > 0 && <tr><td>Rimborso marca da bollo</td><td className="num">{formatCurrency(stampDuty)}</td></tr>}
          <tr className="qd-grand"><td>Totale</td><td className="num">{formatCurrency(total)}</td></tr>
        </tbody>
      </table>

      {quote.notes && <section><p className="qd-label">Note</p><p className="qd-pre">{quote.notes}</p></section>}
      {profile?.iban && <p>Pagamento tramite bonifico: IBAN {profile.iban}</p>}
      {profile?.taxNote && <p className="qd-small">{profile.taxNote}</p>}

      <section className="qd-sign">
        <p>Per accettazione</p>
        <div className="qd-line" />
        <p className="qd-small">Data e firma</p>
      </section>
    </div>
  );
};

const PrintPortal: React.FC<{ children: React.ReactNode; onDone: () => void }> = ({ children, onDone }) => {
  const [container] = useState(() => {
    const el = document.createElement('div');
    el.id = 'print-root';
    return el;
  });
  // onDone in un ref: l'effetto (e quindi la stampa) deve partire una sola volta
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    document.body.appendChild(container);
    const done = () => onDoneRef.current();
    window.addEventListener('afterprint', done);
    // Lascia il tempo al browser di disegnare il documento prima di stampare
    const t = setTimeout(() => window.print(), 50);
    return () => {
      clearTimeout(t);
      window.removeEventListener('afterprint', done);
      container.remove();
    };
  }, [container]);
  return createPortal(children, container);
};

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

const QuoteEditor: React.FC<{ initial: Quote; onSave: (q: Quote) => void; onCancel: () => void }> = ({ initial, onSave, onCancel }) => {
  const [quote, setQuote] = useState<Quote>(initial);
  const set = <K extends keyof Quote>(key: K, value: Quote[K]) => setQuote(q => ({ ...q, [key]: value }));
  const setItem = (id: string, patch: Partial<QuoteItem>) =>
    setQuote(q => ({ ...q, items: q.items.map(it => it.id === id ? { ...it, ...patch } : it) }));
  const { subtotal, stampDuty, total } = quoteTotals(quote);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const items = quote.items.filter(it => it.description.trim() || it.unitPrice);
    onSave({ ...quote, items });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-card dark:bg-dark-card p-4 rounded-lg border border-muted/50 dark:border-dark-muted/50">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-sm">Numero<input type="text" value={quote.number} onChange={e => set('number', e.target.value)} required className="mt-1" /></label>
        <label className="text-sm">Data<input type="date" value={quote.date} onChange={e => set('date', e.target.value)} required className="mt-1" /></label>
        <label className="text-sm">Validità (giorni)<input type="number" min={1} value={quote.validityDays} onChange={e => set('validityDays', Number(e.target.value))} required className="mt-1" /></label>
      </div>
      <label className="block text-sm">Intestatario
        <textarea value={quote.recipient} onChange={e => set('recipient', e.target.value)} rows={3} className="mt-1" placeholder="Ragione sociale, indirizzo, P. IVA del cliente" />
      </label>

      <div>
        <p className="text-sm font-semibold mb-2">Voci</p>
        <div className="space-y-3">
          {quote.items.map((item, index) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-start">
              <textarea aria-label={`Descrizione voce ${index + 1}`} value={item.description} onChange={e => setItem(item.id, { description: e.target.value })} rows={2} placeholder="Descrizione" className="col-span-12 sm:col-span-6" />
              <input aria-label={`Quantità voce ${index + 1}`} type="number" step="any" min={0} value={item.quantity} onChange={e => setItem(item.id, { quantity: Number(e.target.value) })} className="col-span-3 sm:col-span-2" />
              <input aria-label={`Prezzo voce ${index + 1}`} type="number" step="any" min={0} value={item.unitPrice} onChange={e => setItem(item.id, { unitPrice: Number(e.target.value) })} className="col-span-4 sm:col-span-2" />
              <p className="col-span-4 sm:col-span-1 text-sm text-right pt-2">{formatCurrency(itemAmount(item))}</p>
              <button type="button" onClick={() => set('items', quote.items.filter(it => it.id !== item.id))} className="col-span-1 pt-2 text-muted-foreground hover:text-destructive" aria-label={`Rimuovi voce ${index + 1}`}>
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => set('items', [...quote.items, newItem()])} className="mt-2 p-2 text-primary hover:bg-primary/10 rounded-md flex items-center text-sm font-semibold">
          <PlusIcon className="w-4 h-4 mr-2" /> Aggiungi voce
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={quote.chargeStampDuty} onChange={e => set('chargeStampDuty', e.target.checked)} className="h-4 w-4" />
        Addebita la marca da bollo ({formatCurrency(STAMP_DUTY_AMOUNT)}, solo sopra {formatCurrency(STAMP_DUTY_THRESHOLD)})
      </label>

      <label className="block text-sm">Note (tempi, modalità di pagamento, condizioni)
        <textarea value={quote.notes || ''} onChange={e => set('notes', e.target.value)} rows={3} className="mt-1" />
      </label>

      <div className="text-right text-sm space-y-0.5">
        <p>Imponibile: <strong>{formatCurrency(subtotal)}</strong></p>
        {stampDuty > 0 && <p>Marca da bollo: {formatCurrency(stampDuty)}</p>}
        <p className="text-lg">Totale: <strong>{formatCurrency(total)}</strong></p>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn px-4 py-2 border border-muted dark:border-dark-muted">Annulla</button>
        <button type="submit" className="btn btn-primary px-4 py-2">Salva preventivo</button>
      </div>
    </form>
  );
};

// ---------------------------------------------------------------------------
// Scheda Preventivi
// ---------------------------------------------------------------------------

const QuotesTab: React.FC<QuotesTabProps> = ({ project, client, quotes, allQuotes, profile, onSave, onDelete, onChangeStatus, onOpenSettings }) => {
  const [editing, setEditing] = useState<Quote | null>(null);
  const [printing, setPrinting] = useState<Quote | null>(null);

  const startNew = (base?: Quote) => {
    const date = today();
    setEditing({
      id: crypto.randomUUID(),
      projectId: project.id,
      number: nextQuoteNumber(allQuotes, date),
      date,
      validityDays: base?.validityDays ?? 30,
      status: QuoteStatus.Bozza,
      recipient: base?.recipient ?? recipientFor(client),
      items: base ? base.items.map(it => ({ ...it, id: crypto.randomUUID() })) : [newItem()],
      notes: base?.notes,
      chargeStampDuty: base?.chargeStampDuty ?? true,
      createdAt: new Date().toISOString(),
    });
  };

  if (editing) {
    return <QuoteEditor key={editing.id} initial={editing} onCancel={() => setEditing(null)} onSave={q => { onSave(q); setEditing(null); }} />;
  }

  return (
    <div className="space-y-3">
      {!profile?.name && (
        <div className="p-3 rounded-md bg-yellow-500/10 text-sm flex flex-wrap items-center justify-between gap-2">
          <span>Inserisci i tuoi dati (nome, P. IVA, IBAN) per stamparli sui preventivi.</span>
          <button onClick={onOpenSettings} className="font-semibold text-primary dark:text-dark-primary hover:underline">Vai alle impostazioni</button>
        </div>
      )}

      {quotes.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nessun preventivo per questo progetto.</p>}

      {quotes.map(quote => {
        const { total } = quoteTotals(quote);
        return (
          <div key={quote.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-muted/50 dark:bg-dark-muted/50 rounded-md">
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Preventivo {quote.number}</p>
              <p className="text-sm text-muted-foreground">{formatDate(quote.date)} · {quote.items.length} {quote.items.length === 1 ? 'voce' : 'voci'} · {formatCurrency(total)}</p>
            </div>
            <select value={quote.status} onChange={e => onChangeStatus(quote, e.target.value as QuoteStatus)} aria-label={`Stato preventivo ${quote.number}`}
              className={`!w-auto self-start sm:self-auto !py-1 !text-[11px] font-semibold uppercase tracking-wider ${quoteStatusConfig[quote.status].color}`}>
              {Object.values(QuoteStatus).map(s => <option key={s} value={s} className="text-black">{quoteStatusConfig[s].label}</option>)}
            </select>
            <div className="flex items-center gap-1">
              <button onClick={() => setPrinting(quote)} className="p-2 text-muted-foreground hover:text-primary" aria-label={`Scarica PDF preventivo ${quote.number}`} title="Salva PDF / Stampa"><DownloadIcon className="w-4 h-4" /></button>
              <button onClick={() => setEditing(quote)} className="p-2 text-muted-foreground hover:text-primary" aria-label={`Modifica preventivo ${quote.number}`} title="Modifica"><EditIcon className="w-4 h-4" /></button>
              <button onClick={() => startNew(quote)} className="p-2 text-muted-foreground hover:text-primary" aria-label={`Nuova versione del preventivo ${quote.number}`} title="Nuova versione"><CopyIcon className="w-4 h-4" /></button>
              <button onClick={() => onDelete(quote)} className="p-2 text-muted-foreground hover:text-destructive" aria-label={`Elimina preventivo ${quote.number}`} title="Elimina"><TrashIcon className="w-4 h-4" /></button>
            </div>
          </div>
        );
      })}

      <button onClick={() => startNew()} className="w-full p-2 text-primary hover:bg-primary/10 rounded-md flex items-center justify-center text-sm font-semibold">
        <PlusIcon className="w-4 h-4 mr-2" /> Nuovo preventivo
      </button>

      {printing && (
        <PrintPortal onDone={() => setPrinting(null)}>
          <QuoteDocument quote={printing} project={project} profile={profile} />
        </PrintPortal>
      )}
    </div>
  );
};

export default QuotesTab;
