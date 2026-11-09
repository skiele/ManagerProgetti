import React, { useEffect, useState } from 'react';
import { ClaudeActivity } from '../types';
import * as firebaseService from '../services/firebaseService';
import { ClaudeLink } from '../services/firebaseService';
import { CopyIcon, SparklesIcon, TrashIcon } from './icons';

const ClaudeConnector: React.FC<{ userId: string }> = ({ userId }) => {
  const [links, setLinks] = useState<ClaudeLink[] | null>(null);
  const [activity, setActivity] = useState<ClaudeActivity[]>([]);
  const [newUrl, setNewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => firebaseService.subscribeClaudeLinks(userId, setLinks, e => { console.error(e); setError(e.message); }), [userId]);
  useEffect(() => firebaseService.subscribeClaudeActivity(userId, setActivity, e => console.error(e)), [userId]);

  const generate = async () => {
    setError(null);
    try {
      const token = await firebaseService.createClaudeLink(userId, 'claude.ai');
      setNewUrl(`${window.location.origin}/mcp/${token}`);
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
    if (window.confirm('Revocare questo collegamento? Claude non potrà più accedere con questo link.')) {
      firebaseService.revokeClaudeLink(link.id).catch(e => setError(e.message));
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-500 dark:text-gray-400">
        Collega Progetta a claude.ai per lavorare con Claude su progetti, documenti e preventivi.
        Claude può leggere e modificare i dati, ma non può eliminare nulla, registrare pagamenti o inviare/accettare preventivi.
        Prima di ogni sua modifica a un documento la versione precedente viene salvata.
      </p>

      <ol className="list-decimal pl-5 text-sm space-y-1 text-gray-600 dark:text-gray-300">
        <li>Genera un link qui sotto e copialo.</li>
        <li>Su claude.ai apri Impostazioni → Connettori → Aggiungi connettore personalizzato.</li>
        <li>Incolla il link come URL del server e dai un nome (es. "Progetta").</li>
      </ol>

      {newUrl ? (
        <div className="p-3 rounded-md border border-yellow-500/40 bg-yellow-500/10 space-y-2">
          <p className="text-sm font-semibold">Il tuo link (visibile solo ora: copialo e non condividerlo, dà accesso ai tuoi dati)</p>
          <div className="flex gap-2">
            <input type="text" readOnly value={newUrl} aria-label="Link del connettore" onFocus={e => e.target.select()} className="font-mono text-xs" />
            <button onClick={copy} className="btn btn-primary px-3 flex-shrink-0" aria-label="Copia link"><CopyIcon className="w-4 h-4" /></button>
          </div>
          {copied && <p className="text-xs text-green-600 dark:text-green-400">Copiato.</p>}
          <button onClick={() => setNewUrl(null)} className="text-xs font-semibold hover:underline">Ho copiato il link, nascondi</button>
        </div>
      ) : (
        <button onClick={generate} className="bg-accent text-accent-foreground px-4 py-2 rounded-lg font-semibold flex items-center hover:bg-accent-hover text-sm">
          <SparklesIcon className="w-4 h-4 mr-2" /> Genera link per Claude
        </button>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div>
        <h3 className="text-sm font-semibold mb-2">Collegamenti attivi</h3>
        {links === null ? <p className="text-sm text-muted-foreground">Caricamento…</p> :
          links.length === 0 ? <p className="text-sm text-muted-foreground">Nessuno: Claude non ha accesso.</p> : (
            <ul className="space-y-2">
              {links.map(link => (
                <li key={link.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 dark:bg-dark-muted/50 text-sm">
                  <span>{link.label} · creato il {new Date(link.createdAt).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  <button onClick={() => revoke(link)} className="flex items-center text-muted-foreground hover:text-destructive" aria-label="Revoca collegamento">
                    <TrashIcon className="w-4 h-4 mr-1" /> Revoca
                  </button>
                </li>
              ))}
            </ul>
          )}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Ultime azioni di Claude</h3>
        {activity.length === 0 ? <p className="text-sm text-muted-foreground">Nessuna azione.</p> : (
          <ul className="space-y-1 text-sm">
            {activity.map(a => (
              <li key={a.id} className="flex gap-2">
                <span className="text-muted-foreground flex-shrink-0">{new Date(a.at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</span>
                <span>{a.summary}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ClaudeConnector;
