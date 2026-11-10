import { AspectRatio, Shot, ShotMove, ShotSize } from '../types';

export const ASPECTS: { value: AspectRatio; label: string; css: string }[] = [
  { value: '16:9', label: '16:9', css: '16 / 9' },
  { value: '2.39:1', label: '2.39:1 (cinemascope)', css: '2.39 / 1' },
  { value: '4:3', label: '4:3', css: '4 / 3' },
  { value: '1:1', label: '1:1 (quadrato)', css: '1 / 1' },
  { value: '4:5', label: '4:5 (social verticale)', css: '4 / 5' },
  { value: '9:16', label: '9:16 (reel, storie)', css: '9 / 16' },
];
export const aspectCss = (a: AspectRatio) => ASPECTS.find(x => x.value === a)?.css ?? '16 / 9';

export const SIZE_LABELS: Record<ShotSize, string> = {
  EWS: 'Campo lunghissimo', WS: 'Campo lungo', MS: 'Piano medio', MCU: 'Primo piano largo',
  CU: 'Primo piano', ECU: 'Dettaglio', INS: 'Inserto',
};
export const MOVE_LABELS: Record<ShotMove, string> = {
  fissa: 'Fissa', panoramica: 'Panoramica', tilt: 'Tilt', carrello: 'Carrello',
  'a mano': 'A mano', gimbal: 'Gimbal', drone: 'Drone', zoom: 'Zoom',
};

const letter = (i: number) => {
  // 0 → A … 25 → Z, 26 → AA
  let s = '';
  let n = i;
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return s;
};

export interface SceneGroup {
  scene: number;
  title: string;
  shots: (Shot & { code: string })[];
}

/** Raggruppa per scena (nell'ordine delle inquadrature) e calcola i codici 1A, 1B, 2A… */
export const groupByScene = (shots: Shot[]): SceneGroup[] => {
  const sorted = [...shots].sort((a, b) => a.scene - b.scene || a.order - b.order);
  const groups: SceneGroup[] = [];
  sorted.forEach(shot => {
    let g = groups[groups.length - 1];
    if (!g || g.scene !== shot.scene) {
      g = { scene: shot.scene, title: '', shots: [] };
      groups.push(g);
    }
    if (!g.title && shot.sceneTitle) g.title = shot.sceneTitle;
    g.shots.push({ ...shot, code: `${shot.scene}${letter(g.shots.length)}` });
  });
  return groups;
};

export const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m ? `${m}′${String(s).padStart(2, '0')}″` : `${s}″`;
};

/**
 * Riduce un'immagine nel browser a JPEG (lato lungo max 1280 px) per salvarla su Firestore.
 * Un documento Firestore ha un limite di 1 MiB: se serve abbassa qualità e dimensione.
 */
export const resizeImage = (file: File): Promise<string> => new Promise((resolve, reject) => {
  if (!file.type.startsWith('image/')) { reject(new Error('Il file non è un\'immagine.')); return; }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    let max = 1280;
    let quality = 0.82;
    for (let attempt = 0; attempt < 6; attempt++) {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Impossibile elaborare l\'immagine.')); return; }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length < 700_000) { resolve(dataUrl); return; }
      max = Math.round(max * 0.8);
      quality = Math.max(0.5, quality - 0.08);
    }
    reject(new Error('Immagine troppo pesante anche dopo la riduzione.'));
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Immagine non leggibile.')); };
  img.src = url;
});
