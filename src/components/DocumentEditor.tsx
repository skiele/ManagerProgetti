import React, { useEffect, useRef, useState } from 'react';
import { Client, DocumentKind, DocumentRevision, Project, TextDocument } from '../types';
import { ChevronLeftIcon, SparklesIcon, TrashIcon } from './icons';
import * as firebaseService from '../services/firebaseService';

export const documentKindLabels: Record<DocumentKind, string> = {
  [DocumentKind.Soggetto]: 'Soggetto',
  [DocumentKind.Trattamento]: 'Trattamento',
  [DocumentKind.Sceneggiatura]: 'Sceneggiatura',
  [DocumentKind.Note]: 'Note',
  [DocumentKind.Altro]: 'Altro',
};

type Fields = Pick<TextDocument, 'title' | 'content' | 'kind' | 'projectId'>;
const fieldsOf = (d: TextDocument): Fields => ({ title: d.title, content: d.content, kind: d.kind, projectId: d.projectId ?? null });
const sameFields = (a: Fields, b: Fields) => a.title === b.title && a.content === b.content && a.kind === b.kind && a.projectId === b.projectId;

interface DocumentEditorProps {
  userId: string;
  document: TextDocument;
  projects: Project[];
  clients: Client[];
  onBack: () => void;
  onDelete: (doc: TextDocument) => void;
  persist: (op: Promise<unknown>) => void;
}

const SAVE_DELAY_MS = 800;

/*
 * Sincronizzazione con le modifiche esterne (Claude o un altro dispositivo):
 * - `base` è la revisione da cui parte la copia locale.
 * - Se arriva una revisione nuova e non ci sono modifiche locali, la si adotta.
 * - Se ci sono modifiche locali non salvate, si mostra un conflitto e si lascia scegliere.
 * - Prima della prima scrittura di ogni sessione si salva la versione corrente tra le revisioni.
 */
const DocumentEditor: React.FC<DocumentEditorProps> = ({ userId, document: doc, projects, clients, onBack, onDelete, persist }) => {
  const [fields, setFields] = useState<Fields>(() => fieldsOf(doc));
  const [saved, setSaved] = useState<Fields>(() => fieldsOf(doc));
  const [base, setBase] = useState(doc.revision);
  const [conflict, setConflict] = useState<TextDocument | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showRevisions, setShowRevisions] = useState(false);
  const [revisions, setRevisions] = useState<DocumentRevision[] | null>(null);
  const snapshotTaken = useRef(false);

  const dirty = !sameFields(fields, saved);

  // Arrivo di una versione più recente dal server
  useEffect(() => {
    if (doc.revision <= base) return;
    if (!dirty) {
      setFields(fieldsOf(doc));
      setSaved(fieldsOf(doc));
      setBase(doc.revision);
      snapshotTaken.current = false;
      if (doc.updatedBy === 'claude') setNotice('Documento aggiornato da Claude.');
    } else {
      setConflict(doc);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.revision]);

  const saveRevision = (source: Fields & { revision: number }, reason: string) =>
    firebaseService.saveEntity(userId, 'revisions', {
      id: crypto.randomUUID(), documentId: doc.id, title: source.title, content: source.content,
      revision: source.revision, savedAt: new Date().toISOString(), reason,
    } as DocumentRevision);

  const write = (next: Fields, revision: number) => {
    setBase(revision);
    setSaved(next);
    persist(firebaseService.updateEntity(userId, 'documents', doc.id, {
      ...next, revision, updatedAt: new Date().toISOString(), updatedBy: 'app',
    }));
  };

  // Salvataggio automatico
  useEffect(() => {
    if (!dirty || conflict) return;
    const t = setTimeout(() => {
      if (!snapshotTaken.current) {
        snapshotTaken.current = true;
        persist(saveRevision({ ...saved, revision: base }, 'Prima della modifica nell\'app'));
      }
      write(fields, base + 1);
    }, SAVE_DELAY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, dirty, conflict]);

  const keepMine = () => {
    if (!conflict) return;
    persist(saveRevision({ ...fieldsOf(conflict), revision: conflict.revision }, 'Versione sostituita in un conflitto'));
    write(fields, conflict.revision + 1);
    setConflict(null);
  };

  const useTheirs = () => {
    if (!conflict) return;
    persist(saveRevision({ ...fields, revision: base }, 'Modifiche locali scartate in un conflitto'));
    setFields(fieldsOf(conflict));
    setSaved(fieldsOf(conflict));
    setBase(conflict.revision);
    setConflict(null);
  };

  const openRevisions = async () => {
    setShowRevisions(v => !v);
    setRevisions(null);
    try { setRevisions(await firebaseService.listRevisions(userId, doc.id)); }
    catch (e) { console.error(e); setRevisions([]); }
  };

  const restore = (rev: DocumentRevision) => {
    if (!window.confirm(`Ripristinare la versione del ${new Date(rev.savedAt).toLocaleString('it-IT')}? La versione attuale verrà conservata tra le versioni precedenti.`)) return;
    persist(saveRevision({ ...fields, revision: base }, 'Prima di un ripristino'));
    setFields(f => ({ ...f, title: rev.title, content: rev.content }));
    setShowRevisions(false);
  };

  const status = conflict ? 'Conflitto' : dirty ? 'Modifiche non salvate…' : 'Salvato';
  const words = fields.content.trim() ? fields.content.trim().split(/\s+/).length : 0;
  const clientName = (p: Project) => clients.find(c => c.id === p.clientId)?.name ?? '';

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={onBack} className="flex items-center text-sm text-muted-foreground hover:text-primary dark:hover:text-dark-primary mb-4">
        <ChevronLeftIcon className="w-4 h-4 mr-1" /> Indietro
      </button>

      <input
        type="text"
        aria-label="Titolo del documento"
        value={fields.title}
        onChange={e => setFields(f => ({ ...f, title: e.target.value }))}
        className="!text-2xl !font-bold !border-0 !px-0 !ring-0"
      />

      <div className="flex flex-wrap items-center gap-2 mt-2 mb-4 text-sm">
        <select aria-label="Tipo di documento" value={fields.kind} onChange={e => setFields(f => ({ ...f, kind: e.target.value as DocumentKind }))} className="!w-auto !py-1">
          {Object.values(DocumentKind).map(k => <option key={k} value={k}>{documentKindLabels[k]}</option>)}
        </select>
        <select aria-label="Progetto" value={fields.projectId ?? ''} onChange={e => setFields(f => ({ ...f, projectId: e.target.value || null }))} className="!w-auto !py-1 max-w-[16rem]">
          <option value="">Nessun progetto</option>
          {projects.map(p => <option key={p.id} value={p.id}>{clientName(p)} / {p.name}</option>)}
        </select>
        <span className={`ml-auto text-xs ${conflict ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`} aria-live="polite">{status} · {words} parole</span>
      </div>

      {notice && !conflict && (
        <div className="mb-3 p-3 rounded-md bg-primary/10 text-sm flex items-center justify-between gap-2">
          <span className="flex items-center"><SparklesIcon className="w-4 h-4 mr-2" />{notice}</span>
          <button onClick={() => setNotice(null)} className="text-xs font-semibold hover:underline">OK</button>
        </div>
      )}

      {conflict && (
        <div role="alert" className="mb-3 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm space-y-2">
          <p><strong>Il documento è stato modificato altrove</strong> ({conflict.updatedBy === 'claude' ? 'da Claude' : 'da un altro dispositivo'}) mentre scrivevi. Le tue modifiche non sono ancora salvate.</p>
          <p className="text-muted-foreground">Qualunque scelta fai, l'altra versione resta recuperabile in "Versioni precedenti".</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={keepMine} className="btn btn-primary px-3 py-1.5">Tieni la mia versione</button>
            <button onClick={useTheirs} className="btn px-3 py-1.5 border border-muted dark:border-dark-muted">Usa la versione {conflict.updatedBy === 'claude' ? 'di Claude' : 'remota'}</button>
          </div>
        </div>
      )}

      <textarea
        aria-label="Testo del documento"
        value={fields.content}
        onChange={e => setFields(f => ({ ...f, content: e.target.value }))}
        placeholder="Scrivi qui. Puoi usare Markdown: # Titolo, ## Sezione, **grassetto**, - elenco"
        className="min-h-[60vh] font-serif text-base leading-relaxed"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
        <button onClick={openRevisions} className="text-sm font-semibold text-primary dark:text-dark-primary hover:underline">
          {showRevisions ? 'Nascondi versioni precedenti' : 'Versioni precedenti'}
        </button>
        <button onClick={() => onDelete(doc)} className="text-sm text-muted-foreground hover:text-destructive flex items-center">
          <TrashIcon className="w-4 h-4 mr-1" /> Elimina documento
        </button>
      </div>

      {showRevisions && (
        <div className="mt-3 space-y-2">
          {revisions === null && <p className="text-sm text-muted-foreground">Caricamento…</p>}
          {revisions?.length === 0 && <p className="text-sm text-muted-foreground">Nessuna versione precedente.</p>}
          {revisions?.map(rev => (
            <div key={rev.id} className="p-3 rounded-md bg-muted/50 dark:bg-dark-muted/50 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span><strong>{new Date(rev.savedAt).toLocaleString('it-IT')}</strong> · {rev.reason}</span>
                <button onClick={() => restore(rev)} className="font-semibold text-primary dark:text-dark-primary hover:underline">Ripristina</button>
              </div>
              <p className="text-muted-foreground mt-1 line-clamp-2 whitespace-pre-line">{rev.content.slice(0, 300) || '(vuoto)'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentEditor;
