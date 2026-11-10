import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AspectRatio, Client, Project, Shot, ShotImage, SHOT_MOVES, SHOT_SIZES, ShotMove, ShotSize, Shotlist } from '../types';
import * as firebaseService from '../services/firebaseService';
import { BatchOp } from '../services/firebaseService';
import { ASPECTS, aspectCss, formatDuration, groupByScene, MOVE_LABELS, resizeImage, SIZE_LABELS } from '../utils/storyboard';
import { ChevronLeftIcon, ChevronRightIcon, EditIcon, PlusIcon, TrashIcon, UploadIcon, XIcon } from './icons';
import PageHeader from './PageHeader';
import Modal from './Modal';
import PrintPortal from './PrintPortal';

type View = 'board' | 'table';

interface StoryboardViewProps {
  userId: string;
  shotlist: Shotlist;
  shots: Shot[];
  project?: Project;
  client?: Client;
  persist: (op: Promise<unknown>) => void;
  onBack: () => void;
  onDeleted: () => void;
}

const VIEW_KEY = 'progetta.storyboardView';
const tag = 'inline-flex items-center text-[11px] font-semibold uppercase tracking-wider px-1.5 py-0.5 border border-foreground';

// ---------------------------------------------------------------------------
// Modulo di modifica di un'inquadratura
// ---------------------------------------------------------------------------

interface EditorProps {
  shot: Shot;
  sceneTitle: string;
  onSave: (shot: Shot, sceneTitle: string) => void;
  onCancel: () => void;
}

const ShotEditor: React.FC<EditorProps> = ({ shot, sceneTitle, onSave, onCancel }) => {
  const [form, setForm] = useState<Shot>(shot);
  const [title, setTitle] = useState(sceneTitle);
  const set = <K extends keyof Shot>(k: K, v: Shot[K]) => setForm(f => ({ ...f, [k]: v }));
  return (
    <form className="space-y-3" onSubmit={e => { e.preventDefault(); onSave(form, title); }}>
      <div className="grid grid-cols-3 gap-3">
        <label className="text-sm">Scena<input type="number" min={1} value={form.scene} onChange={e => set('scene', Math.max(1, Number(e.target.value) || 1))} className="mt-1" required /></label>
        <label className="text-sm col-span-2">Titolo della scena<input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="es. Il lago all'alba" className="mt-1" /></label>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <label className="text-sm">Campo
          <select value={form.size ?? ''} onChange={e => set('size', (e.target.value || undefined) as ShotSize | undefined)} className="mt-1">
            <option value="">—</option>
            {SHOT_SIZES.map(s => <option key={s} value={s}>{s} · {SIZE_LABELS[s]}</option>)}
          </select>
        </label>
        <label className="text-sm">Movimento
          <select value={form.move ?? ''} onChange={e => set('move', (e.target.value || undefined) as ShotMove | undefined)} className="mt-1">
            <option value="">—</option>
            {SHOT_MOVES.map(m => <option key={m} value={m}>{MOVE_LABELS[m]}</option>)}
          </select>
        </label>
        <label className="text-sm">Ottica<input type="text" value={form.lens ?? ''} onChange={e => set('lens', e.target.value || undefined)} placeholder="35mm" className="mt-1" /></label>
      </div>
      <label className="block text-sm">Cosa si vede<textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className="mt-1" placeholder="Azione, inquadratura, dettagli" /></label>
      <label className="block text-sm">Audio<textarea value={form.audio ?? ''} onChange={e => set('audio', e.target.value || undefined)} rows={2} className="mt-1" placeholder="Dialoghi, suono, musica" /></label>
      <div className="grid grid-cols-3 gap-3 items-end">
        <label className="text-sm">Durata (secondi)<input type="number" min={0} step="0.5" value={form.duration ?? ''} onChange={e => set('duration', e.target.value === '' ? undefined : Number(e.target.value))} className="mt-1" /></label>
        <label className="text-sm col-span-2">Note<input type="text" value={form.notes ?? ''} onChange={e => set('notes', e.target.value || undefined)} className="mt-1" /></label>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.done} onChange={e => set('done', e.target.checked)} className="h-4 w-4 accent-black dark:accent-white" /> Girata</label>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="h-10 px-4 border-2 border-foreground font-semibold hover:bg-muted">Annulla</button>
        <button type="submit" className="h-10 px-4 border-2 border-foreground bg-foreground text-background font-semibold hover:bg-primary-hover">Salva</button>
      </div>
    </form>
  );
};

// ---------------------------------------------------------------------------
// Vista di stampa
// ---------------------------------------------------------------------------

const PrintBoard: React.FC<{ title: string; subtitle: string; aspect: AspectRatio; groups: ReturnType<typeof groupByScene>; images: Map<string, string>; view: View }> = ({ title, subtitle, aspect, groups, images, view }) => (
  <div className="sb-print">
    <style>{`@page { size: A4 ${view === 'board' ? 'landscape' : 'portrait'}; margin: 12mm; }`}</style>
    <header className="sb-print-head"><div><p className="sb-over">{subtitle}</p><h1>{title}</h1></div><p className="sb-over">Progetta · storyboard</p></header>
    {groups.map(g => (
      <section key={g.scene} className="sb-scene">
        <h2>Scena {g.scene}{g.title ? ` · ${g.title}` : ''}</h2>
        {view === 'board' ? (
          <div className={`sb-grid ${aspect === '9:16' || aspect === '4:5' ? 'sb-grid-4' : ''}`}>
            {g.shots.map(s => (
              <div key={s.id} className="sb-frame">
                <div className="sb-img" style={{ aspectRatio: aspectCss(aspect) }}>{images.get(s.id) && <img src={images.get(s.id)} alt="" />}</div>
                <p className="sb-code"><strong>{s.code}</strong> {[s.size, s.move, s.lens].filter(Boolean).join(' · ')}{s.duration ? ` · ${formatDuration(s.duration)}` : ''}</p>
                {s.description && <p>{s.description}</p>}
                {s.audio && <p className="sb-audio">{s.audio}</p>}
              </div>
            ))}
          </div>
        ) : (
          <table className="sb-table">
            <thead><tr><th>#</th><th>Campo</th><th>Mov.</th><th>Ottica</th><th>Cosa si vede</th><th>Audio</th><th>Durata</th><th>✓</th></tr></thead>
            <tbody>{g.shots.map(s => (
              <tr key={s.id}><td><strong>{s.code}</strong></td><td>{s.size ?? ''}</td><td>{s.move ?? ''}</td><td>{s.lens ?? ''}</td><td>{s.description}</td><td>{s.audio ?? ''}</td><td>{s.duration ? formatDuration(s.duration) : ''}</td><td>{s.done ? '✓' : '☐'}</td></tr>
            ))}</tbody>
          </table>
        )}
      </section>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Pagina della storyboard
// ---------------------------------------------------------------------------

const StoryboardView: React.FC<StoryboardViewProps> = ({ userId, shotlist, shots, project, client, persist, onBack, onDeleted }) => {
  const [view, setViewState] = useState<View>(() => { try { return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'board'; } catch { return 'board'; } });
  const setView = (v: View) => { setViewState(v); try { localStorage.setItem(VIEW_KEY, v); } catch { /* ok */ } };
  const [images, setImages] = useState<Map<string, string>>(new Map());
  const [editing, setEditing] = useState<{ shot: Shot; sceneTitle: string; isNew: boolean } | null>(null);
  const [printing, setPrinting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [title, setTitle] = useState(shotlist.title);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<string | null>(null);

  useEffect(() => firebaseService.subscribeShotImages(userId, shotlist.id, setImages, e => console.error(e)), [userId, shotlist.id]);
  useEffect(() => setTitle(shotlist.title), [shotlist.title]);

  const groups = useMemo(() => groupByScene(shots), [shots]);
  const totalDuration = shots.reduce((s, x) => s + (x.duration || 0), 0);
  const doneCount = shots.filter(s => s.done).length;
  const maxOrder = Math.max(0, ...shots.map(s => s.order));
  const maxScene = Math.max(0, ...shots.map(s => s.scene));
  const touch = () => persist(firebaseService.updateEntity(userId, 'shotlists', shotlist.id, { updatedAt: new Date().toISOString() }));

  const newShot = (scene: number, sceneTitle: string) => setEditing({
    isNew: true, sceneTitle,
    shot: { id: crypto.randomUUID(), shotlistId: shotlist.id, projectId: shotlist.projectId, order: maxOrder + 1, scene, description: '', done: false, hasImage: false },
  });

  const saveShot = (shot: Shot, sceneTitle: string) => {
    const ops: BatchOp[] = [{ type: 'set', name: 'shots', entity: { ...shot, sceneTitle: sceneTitle || undefined } as Shot }];
    // Il titolo della scena vale per tutte le sue inquadrature
    shots.filter(s => s.scene === shot.scene && s.id !== shot.id && (s.sceneTitle || '') !== sceneTitle)
      .forEach(s => ops.push({ type: 'update', name: 'shots', id: s.id, data: { sceneTitle: sceneTitle || null } }));
    persist(firebaseService.commitOps(userId, ops));
    touch();
    setEditing(null);
  };

  const deleteShot = (shot: Shot & { code: string }) => {
    if (!window.confirm(`Eliminare l'inquadratura ${shot.code}?`)) return;
    const ops: BatchOp[] = [{ type: 'delete', name: 'shots', id: shot.id }];
    if (shot.hasImage) ops.push({ type: 'delete', name: 'shotImages', id: shot.id });
    persist(firebaseService.commitOps(userId, ops));
  };

  // Sposta un'inquadratura prima/dopo la vicina nella stessa scena (scambio dell'ordine)
  const move = (shot: Shot, dir: -1 | 1) => {
    const scene = groups.find(g => g.scene === shot.scene);
    if (!scene) return;
    const i = scene.shots.findIndex(s => s.id === shot.id);
    const other = scene.shots[i + dir];
    if (!other) return;
    persist(firebaseService.commitOps(userId, [
      { type: 'update', name: 'shots', id: shot.id, data: { order: other.order } },
      { type: 'update', name: 'shots', id: other.id, data: { order: shot.order } },
    ]));
  };

  const toggleDone = (shot: Shot) => persist(firebaseService.updateEntity(userId, 'shots', shot.id, { done: !shot.done }));

  const pickImage = (shotId: string) => { uploadTarget.current = shotId; fileInput.current?.click(); };
  const uploadImage = async (shotId: string, file: File) => {
    setUploadError(null);
    try {
      const dataUrl = await resizeImage(file);
      persist(firebaseService.commitOps(userId, [
        { type: 'set', name: 'shotImages', entity: { id: shotId, shotlistId: shotlist.id, dataUrl } as ShotImage },
        { type: 'update', name: 'shots', id: shotId, data: { hasImage: true } },
      ]));
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
    }
  };
  const removeImage = (shotId: string) => persist(firebaseService.commitOps(userId, [
    { type: 'delete', name: 'shotImages', id: shotId },
    { type: 'update', name: 'shots', id: shotId, data: { hasImage: false } },
  ]));

  const deleteBoard = async () => {
    if (!window.confirm(`Eliminare la storyboard "${shotlist.title}" con tutte le sue ${shots.length} inquadrature e immagini?`)) return;
    const imageIds = await firebaseService.listShotImageIds(userId, shotlist.id);
    const ops: BatchOp[] = [
      ...shots.map((s): BatchOp => ({ type: 'delete', name: 'shots', id: s.id })),
      ...imageIds.map((id): BatchOp => ({ type: 'delete', name: 'shotImages', id })),
      { type: 'delete', name: 'shotlists', id: shotlist.id },
    ];
    for (let i = 0; i < ops.length; i += 450) persist(firebaseService.commitOps(userId, ops.slice(i, i + 450)));
    onDeleted();
  };

  const vertical = shotlist.aspect === '9:16' || shotlist.aspect === '4:5';
  const subtitle = [client?.name, project?.name].filter(Boolean).join(' / ');

  return (
    <div className="max-w-[1280px]">
      <button onClick={onBack} className="flex items-center text-[13px] font-medium underline underline-offset-[3px] mb-4 hover:text-muted-foreground">
        <ChevronLeftIcon className="w-4 h-4 mr-0.5" /> {project?.name ?? 'Indietro'}
      </button>

      <PageHeader
        overline={`Storyboard · ${subtitle}`}
        title={<input aria-label="Titolo della storyboard" value={title} onChange={e => setTitle(e.target.value)}
          onBlur={() => { if (title.trim() && title !== shotlist.title) persist(firebaseService.updateEntity(userId, 'shotlists', shotlist.id, { title: title.trim(), updatedAt: new Date().toISOString() })); }}
          className="!p-0 !border-0 !ring-0 !bg-transparent !text-[inherit] !font-[inherit] !tracking-[inherit] !leading-[inherit] w-full" />}
        subtitle={`${shots.length} inquadrature · ${groups.length} scene${totalDuration ? ` · durata ${formatDuration(totalDuration)}` : ''} · girate ${doneCount}/${shots.length}`}
        actions={<>
          <select aria-label="Formato" value={shotlist.aspect} onChange={e => persist(firebaseService.updateEntity(userId, 'shotlists', shotlist.id, { aspect: e.target.value }))}
            className="!w-auto !h-10 !border-2 !border-foreground font-semibold !ring-0">
            {ASPECTS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
          <div className="flex" role="group" aria-label="Vista">
            {(['board', 'table'] as View[]).map((v, i) => (
              <button key={v} onClick={() => setView(v)} aria-pressed={view === v}
                className={`h-10 px-3 text-[11px] font-semibold uppercase tracking-wider border-2 border-foreground ${i ? 'border-l-0' : ''} ${view === v ? 'bg-foreground text-background' : 'hover:bg-muted'}`}>
                {v === 'board' ? 'Storyboard' : 'Shot list'}
              </button>
            ))}
          </div>
          <button onClick={() => setPrinting(true)} disabled={!shots.length} className="h-10 px-4 border-2 border-foreground font-semibold hover:bg-muted disabled:opacity-40">Stampa / PDF</button>
        </>}
      />

      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={e => {
        const file = e.target.files?.[0];
        if (file && uploadTarget.current) uploadImage(uploadTarget.current, file);
        e.target.value = '';
      }} />
      {uploadError && <p role="alert" className="mb-4 text-sm text-destructive">{uploadError}</p>}

      {shots.length === 0 && (
        <div className="py-12 border-t-2 border-foreground">
          <p className="text-muted-foreground mb-4">Nessuna inquadratura. Inizia dalla prima scena, oppure chiedi a Claude di ricavarle dal soggetto.</p>
          <button onClick={() => newShot(1, '')} className="h-10 px-4 border-2 border-foreground bg-foreground text-background font-semibold flex items-center"><PlusIcon className="w-4 h-4 mr-2" /> Prima inquadratura</button>
        </div>
      )}

      {groups.map(g => (
        <section key={g.scene} className="mb-12" aria-labelledby={`scene-${g.scene}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-3 pb-2 mb-5 border-b-2 border-foreground">
            <h2 id={`scene-${g.scene}`} className="text-xl font-extrabold tracking-[-0.02em]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] mr-3 align-middle">Scena {g.scene}</span>{g.title || <span className="text-muted-foreground font-medium">senza titolo</span>}
            </h2>
            <button onClick={() => newShot(g.scene, g.title)} className="text-[13px] font-medium underline underline-offset-[3px] flex items-center"><PlusIcon className="w-3.5 h-3.5 mr-1" /> Inquadratura</button>
          </div>

          {view === 'board' ? (
            <ul className={`grid gap-6 grid-cols-1 sm:grid-cols-2 ${vertical ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
              {g.shots.map((s, i) => (
                <li key={s.id} className={`flex flex-col ${s.done ? 'opacity-60' : ''}`}>
                  <div className="relative border-2 border-foreground bg-muted/40 group" style={{ aspectRatio: aspectCss(shotlist.aspect) }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) uploadImage(s.id, f); }}>
                    {images.get(s.id)
                      ? <img src={images.get(s.id)} alt={`Inquadratura ${s.code}`} className="absolute inset-0 w-full h-full object-cover" />
                      : <button onClick={() => pickImage(s.id)} className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground text-[11px] font-semibold uppercase tracking-wider">
                          <UploadIcon className="w-5 h-5" /> Carica o trascina un'immagine
                        </button>}
                    <span className="absolute top-0 left-0 bg-foreground text-background px-2 py-1 text-sm font-extrabold">{s.code}</span>
                    {images.get(s.id) && (
                      <span className="absolute top-1 right-1 flex gap-1 md:opacity-0 md:group-hover:opacity-100">
                        <button onClick={() => pickImage(s.id)} className="p-1.5 bg-background border border-foreground" aria-label={`Sostituisci immagine ${s.code}`}><UploadIcon className="w-3.5 h-3.5" /></button>
                        <button onClick={() => removeImage(s.id)} className="p-1.5 bg-background border border-foreground" aria-label={`Rimuovi immagine ${s.code}`}><XIcon className="w-3.5 h-3.5" /></button>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    {s.size && <span className={tag} title={SIZE_LABELS[s.size]}>{s.size}</span>}
                    {s.move && <span className={tag}>{MOVE_LABELS[s.move]}</span>}
                    {s.lens && <span className={tag}>{s.lens}</span>}
                    {s.duration ? <span className="ml-auto text-[13px] font-extrabold">{formatDuration(s.duration)}</span> : null}
                  </div>
                  {s.description && <p className="mt-2 text-[15px] leading-snug">{s.description}</p>}
                  {s.audio && <p className="mt-1.5 text-[13px] text-muted-foreground"><span className="font-semibold uppercase text-[10px] tracking-wider mr-1.5">Audio</span>{s.audio}</p>}
                  {s.notes && <p className="mt-1.5 text-[13px] text-muted-foreground italic">{s.notes}</p>}
                  <div className="flex items-center gap-1 mt-auto pt-3">
                    <label className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider mr-auto cursor-pointer">
                      <input type="checkbox" checked={s.done} onChange={() => toggleDone(s)} className="h-4 w-4 accent-black dark:accent-white" /> Girata
                    </label>
                    <button onClick={() => move(s, -1)} disabled={i === 0} className="p-1.5 hover:bg-muted disabled:opacity-25" aria-label={`Sposta ${s.code} prima`}><ChevronLeftIcon className="w-4 h-4" /></button>
                    <button onClick={() => move(s, 1)} disabled={i === g.shots.length - 1} className="p-1.5 hover:bg-muted disabled:opacity-25" aria-label={`Sposta ${s.code} dopo`}><ChevronRightIcon className="w-4 h-4" /></button>
                    <button onClick={() => setEditing({ shot: s, sceneTitle: g.title, isNew: false })} className="p-1.5 hover:bg-muted" aria-label={`Modifica ${s.code}`}><EditIcon className="w-4 h-4" /></button>
                    <button onClick={() => deleteShot(s)} className="p-1.5 hover:bg-muted hover:text-destructive" aria-label={`Elimina ${s.code}`}><TrashIcon className="w-4 h-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[760px]">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.1em] border-b border-foreground">
                    <th className="py-2 pr-3 w-12">#</th><th className="py-2 pr-3 w-16">Campo</th><th className="py-2 pr-3 w-24">Mov.</th><th className="py-2 pr-3 w-16">Ottica</th>
                    <th className="py-2 pr-3">Cosa si vede</th><th className="py-2 pr-3">Audio</th><th className="py-2 pr-3 w-16">Durata</th><th className="py-2 w-28 text-right">Girata</th>
                  </tr>
                </thead>
                <tbody>
                  {g.shots.map(s => (
                    <tr key={s.id} className={`border-b border-foreground/15 align-top ${s.done ? 'text-muted-foreground' : ''}`}>
                      <td className="py-2.5 pr-3 font-extrabold">{s.code}</td>
                      <td className="py-2.5 pr-3">{s.size ?? '—'}</td>
                      <td className="py-2.5 pr-3">{s.move ? MOVE_LABELS[s.move] : '—'}</td>
                      <td className="py-2.5 pr-3">{s.lens ?? '—'}</td>
                      <td className="py-2.5 pr-3">{s.description}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{s.audio}</td>
                      <td className="py-2.5 pr-3">{s.duration ? formatDuration(s.duration) : ''}</td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <input type="checkbox" checked={s.done} onChange={() => toggleDone(s)} aria-label={`Girata ${s.code}`} className="h-4 w-4 align-middle accent-black dark:accent-white" />
                        <button onClick={() => setEditing({ shot: s, sceneTitle: g.title, isNew: false })} className="ml-2 p-1 hover:bg-muted align-middle" aria-label={`Modifica ${s.code}`}><EditIcon className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      {shots.length > 0 && (
        <button onClick={() => newShot(maxScene + 1, '')} className="h-10 px-4 border-2 border-foreground font-semibold flex items-center hover:bg-muted">
          <PlusIcon className="w-4 h-4 mr-2" /> Nuova scena
        </button>
      )}

      <section className="mt-16 pt-4 border-t-2 border-destructive">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <p className="text-sm text-muted-foreground">Elimina questa storyboard con tutte le inquadrature e le immagini.</p>
          <button onClick={deleteBoard} className="h-10 px-4 border-2 border-destructive text-destructive font-semibold flex items-center hover:bg-destructive hover:text-destructive-foreground flex-shrink-0">
            <TrashIcon className="w-4 h-4 mr-2" /> Elimina storyboard
          </button>
        </div>
      </section>

      <Modal wide isOpen={!!editing} onClose={() => setEditing(null)} title={editing?.isNew ? 'Nuova inquadratura' : 'Modifica inquadratura'}>
        {editing && <ShotEditor key={editing.shot.id} shot={editing.shot} sceneTitle={editing.sceneTitle} onSave={saveShot} onCancel={() => setEditing(null)} />}
      </Modal>

      {printing && (
        <PrintPortal onDone={() => setPrinting(false)}>
          <PrintBoard title={shotlist.title} subtitle={subtitle} aspect={shotlist.aspect} groups={groups} images={images} view={view} />
        </PrintPortal>
      )}
    </div>
  );
};

export default StoryboardView;
