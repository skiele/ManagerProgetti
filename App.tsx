import React from 'react';

export default function App() {
  return (
    <div style={{ padding: '40px', margin: '20px', fontFamily: 'sans-serif', backgroundColor: '#fff0f0', border: '2px solid #d00', borderRadius: '8px', color: '#333' }}>
        <h1 style={{ color: '#d00', borderBottom: '2px solid #d00', paddingBottom: '10px' }}>ERRORE DI CARICAMENTO</h1>
        <p style={{ fontSize: '1.1em', lineHeight: '1.6' }}>
            <strong>Stai caricando il componente sbagliato:</strong> <code>/App.tsx</code>.
        </p>
        <p style={{ fontSize: '1.1em', lineHeight: '1.6' }}>
            L'applicazione corretta e tutte le sue nuove funzionalità si trovano dentro la cartella <code>/src</code>.
        </p>
        <p style={{ fontSize: '1.1em', lineHeight: '1.6', marginTop: '20px' }}>
            Questo indica un problema di configurazione nel tuo ambiente di sviluppo che sta ignorando il percorso corretto (<code>/src/index.tsx</code>) specificato in <code>index.html</code>. Segui i passaggi suggeriti nel messaggio principale.
        </p>
    </div>
  );
}
