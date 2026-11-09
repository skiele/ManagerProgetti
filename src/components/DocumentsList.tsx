import React, { useMemo } from 'react';
import { Client, Project, TextDocument } from '../types';
import { PlusIcon, SparklesIcon } from './icons';
import { documentKindLabels } from './DocumentEditor';

interface DocumentsListProps {
  documents: TextDocument[];
  projects: Project[];
  clients: Client[];
  groupByProject: boolean;
  onOpen: (id: string) => void;
  onCreate: () => void;
}

const DocumentRow: React.FC<{ doc: TextDocument; onOpen: (id: string) => void }> = ({ doc, onOpen }) => (
  <li>
    <button onClick={() => onOpen(doc.id)} aria-label={`Apri documento ${doc.title}`}
      className="w-full text-left p-3 rounded-md bg-muted/50 dark:bg-dark-muted/50 hover:bg-muted dark:hover:bg-dark-muted">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold truncate">{doc.title || 'Senza titolo'}</span>
        <span className="text-xs text-muted-foreground flex-shrink-0">{documentKindLabels[doc.kind] ?? doc.kind}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
        {doc.updatedBy === 'claude' && <SparklesIcon className="w-3 h-3" />}
        Modificato il {new Date(doc.updatedAt).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
        {doc.updatedBy === 'claude' ? ' da Claude' : ''}
      </p>
    </button>
  </li>
);

const DocumentsList: React.FC<DocumentsListProps> = ({ documents, projects, clients, groupByProject, onOpen, onCreate }) => {
  const groups = useMemo(() => {
    if (!groupByProject) return [{ key: 'all', label: '', docs: documents }];
    const byProject = new Map<string, TextDocument[]>();
    documents.forEach(d => {
      const key = d.projectId && projects.some(p => p.id === d.projectId) ? d.projectId : '';
      byProject.set(key, [...(byProject.get(key) || []), d]);
    });
    const label = (projectId: string) => {
      const p = projects.find(x => x.id === projectId);
      if (!p) return 'Senza progetto';
      const c = clients.find(x => x.id === p.clientId);
      return `${c ? c.name + ' / ' : ''}${p.name}`;
    };
    return [...byProject.entries()]
      .map(([key, docs]) => ({ key, label: label(key), docs }))
      .sort((a, b) => (a.key === '' ? 1 : b.key === '' ? -1 : a.label.localeCompare(b.label)));
  }, [documents, projects, clients, groupByProject]);

  return (
    <div className="space-y-6">
      {documents.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nessun documento.</p>}
      {groups.filter(g => g.docs.length).map(g => (
        <div key={g.key}>
          {g.label && <h3 className="text-sm font-semibold text-muted-foreground mb-2">{g.label}</h3>}
          <ul className="space-y-2">{g.docs.map(d => <DocumentRow key={d.id} doc={d} onOpen={onOpen} />)}</ul>
        </div>
      ))}
      <button onClick={onCreate} className="w-full p-2 text-primary hover:bg-primary/10 rounded-md flex items-center justify-center text-sm font-semibold">
        <PlusIcon className="w-4 h-4 mr-2" /> Nuovo documento
      </button>
    </div>
  );
};

export default DocumentsList;
