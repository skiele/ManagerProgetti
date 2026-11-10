import React from 'react';
import { Shot, Shotlist } from '../types';
import { aspectCss, formatDuration } from '../utils/storyboard';
import { PlusIcon } from './icons';

interface StoryboardListProps {
  shotlists: Shotlist[];
  shots: Shot[];
  onOpen: (id: string) => void;
  onCreate: () => void;
}

// Scheda "Storyboard" del progetto: le storyboard esistenti e il pulsante per crearne una
const StoryboardList: React.FC<StoryboardListProps> = ({ shotlists, shots, onOpen, onCreate }) => (
  <div>
    {shotlists.length === 0 && <p className="py-6 text-muted-foreground">Nessuna storyboard per questo progetto.</p>}
    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
      {shotlists.map(sl => {
        const own = shots.filter(s => s.shotlistId === sl.id);
        const scenes = new Set(own.map(s => s.scene)).size;
        const duration = own.reduce((t, s) => t + (s.duration || 0), 0);
        const done = own.filter(s => s.done).length;
        return (
          <li key={sl.id} className="flex">
            <button onClick={() => onOpen(sl.id)} aria-label={`Apri storyboard ${sl.title}`}
              className="w-full text-left border-2 border-foreground p-5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_hsl(var(--foreground))] transition-transform">
              <span className="flex items-start justify-between gap-3">
                <span className="text-xl font-extrabold tracking-[-0.02em]">{sl.title}</span>
                <span aria-hidden="true" className="w-10 border-2 border-foreground flex-shrink-0" style={{ aspectRatio: aspectCss(sl.aspect) }}></span>
              </span>
              <span className="block mt-3 text-[11px] font-semibold uppercase tracking-[0.12em]">{sl.aspect} · {scenes} scene · {own.length} inquadrature</span>
              <span className="block mt-1 text-sm text-muted-foreground">{duration ? `durata ${formatDuration(duration)} · ` : ''}girate {done}/{own.length}</span>
            </button>
          </li>
        );
      })}
    </ul>
    <button onClick={onCreate} className="h-10 px-4 border-2 border-foreground font-semibold flex items-center hover:bg-muted">
      <PlusIcon className="w-4 h-4 mr-2" /> Nuova storyboard
    </button>
  </div>
);

export default StoryboardList;
