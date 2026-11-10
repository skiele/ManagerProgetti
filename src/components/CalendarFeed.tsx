import React, { useEffect, useState } from 'react';
import * as firebaseService from '../services/firebaseService';
import { ClaudeLink } from '../services/firebaseService';
import { CalendarIcon, CopyIcon, TrashIcon } from './icons';

// Impostazioni → Calendario: link da aggiungere in Google Calendar ("Da URL")
const CalendarFeed: React.FC<{ userId: string }> = ({ userId }) => {
  const [links, setLinks] = useState<ClaudeLink[] | null>(null);
  const [newUrl, setNewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => firebaseService.subscribeLinks('calendarTokens', userId, setLinks, e => { console.error(e); setError(e.message); }), [userId]);

  const generate = async () => {
    setError(null);
    try {
      const token = await firebaseService.createLink('calendarTokens', userId, 'Google Calendar');
      setNewUrl(`${window.location.origin}/cal/${token}.ics`);
      setCopied(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const copy = async () => {
    if (!newUrl) return;
    try { await navigator.clipboard.writeText(newUrl); setCopied(true); } catch { /* il testo resta selezionabile */ }
  };

  const revoke = (link: ClaudeLink) => {
    if (window.confirm('Revocare questo link? Il calendario abbonato smetterà di aggiornarsi.')) {
      firebaseService.revokeLink('calendarTokens', link.id).catch(e => setError(e.message));
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Le scadenze delle attività compaiono in Google Calendar come eventi di un giorno intero, in un calendario a parte chiamato "Progetta · scadenze".
        Si aggiornano da sole quando cambi una data o completi un'attività, ma Google le rilegge con qualche ora di ritardo.
        Per un'aggiunta immediata usa il pulsante con il calendario accanto alla singola attività.
      </p>
      <ol className="list-decimal pl-5 text-sm space-y-1">
        <li>Genera il link qui sotto e copialo.</li>
        <li>Su Google Calendar dal computer: a sinistra, accanto a "Altri calendari", clicca <strong>+</strong> e poi <strong>Da URL</strong>.</li>
        <li>Incolla il link e clicca <strong>Aggiungi calendario</strong>.</li>
      </ol>

      {newUrl ? (
        <div className="p-3 border-2 border-foreground space-y-2">
          <p className="text-sm font-semibold">Il tuo link (visibile solo ora). Chi lo ha può vedere le tue scadenze, nient'altro.</p>
          <div className="flex gap-2">
            <input type="text" readOnly value={newUrl} aria-label="Link del calendario" onFocus={e => e.target.select()} className="font-mono text-xs" />
            <button onClick={copy} className="px-3 border-2 border-foreground bg-foreground text-background flex-shrink-0" aria-label="Copia link del calendario"><CopyIcon className="w-4 h-4" /></button>
          </div>
          {copied && <p className="text-xs font-semibold">Copiato.</p>}
          <button onClick={() => setNewUrl(null)} className="text-xs font-semibold underline">Ho copiato il link, nascondi</button>
        </div>
      ) : (
        <button onClick={generate} className="h-10 px-4 border-2 border-foreground font-semibold flex items-center hover:bg-muted">
          <CalendarIcon className="w-4 h-4 mr-2" /> Genera link per Google Calendar
        </button>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2">Link attivi</h3>
        {links === null ? <p className="text-sm text-muted-foreground">Caricamento…</p> :
          links.length === 0 ? <p className="text-sm text-muted-foreground">Nessuno.</p> : (
            <ul className="space-y-2">
              {links.map(link => (
                <li key={link.id} className="flex items-center justify-between py-2 border-b border-foreground/15 text-sm">
                  <span>{link.label} · creato il {new Date(link.createdAt).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  <button onClick={() => revoke(link)} className="flex items-center text-muted-foreground hover:text-destructive" aria-label="Revoca link del calendario">
                    <TrashIcon className="w-4 h-4 mr-1" /> Revoca
                  </button>
                </li>
              ))}
            </ul>
          )}
      </div>
    </div>
  );
};

export default CalendarFeed;
