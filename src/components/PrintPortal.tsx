import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Mostra i figli solo in stampa (vedi #print-root in index.css), apre la finestra di stampa
 * del browser ("Salva come PDF") e chiama onDone quando la stampa si chiude.
 */
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
    // Lascia al browser il tempo di disegnare il documento e decodificare le immagini prima di stampare
    let cancelled = false;
    const t = setTimeout(async () => {
      const images = Array.from(container.querySelectorAll('img'));
      await Promise.all(images.map(img => (img.decode ? img.decode().catch(() => undefined) : Promise.resolve())));
      if (!cancelled) window.print();
    }, 50);
    return () => {
      cancelled = true;
      clearTimeout(t);
      window.removeEventListener('afterprint', done);
      container.remove();
    };
  }, [container]);
  return createPortal(children, container);
};

export default PrintPortal;
