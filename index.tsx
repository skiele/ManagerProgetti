import React from 'react';
import ReactDOM from 'react-dom/client';

const ErrorComponent = () => (
    <div style={{ padding: '40px', margin: '20px', fontFamily: 'sans-serif', backgroundColor: '#fff0f0', border: '2px solid #d00', borderRadius: '8px', color: '#333' }}>
        <h1 style={{ color: '#d00', borderBottom: '2px solid #d00', paddingBottom: '10px' }}>ERRORE DI CARICAMENTO</h1>
        <p style={{ fontSize: '1.1em', lineHeight: '1.6' }}>
            <strong>Stai caricando il file sbagliato:</strong> <code>/index.tsx</code>.
        </p>
        <p style={{ fontSize: '1.1em', lineHeight: '1.6' }}>
            Il tuo ambiente di sviluppo dovrebbe caricare il file corretto che si trova in 
            <code>/src/index.tsx</code>, come specificato nel file <code>index.html</code>.
        </p>
        <p style={{ fontSize: '1.1em', lineHeight: '1.6', marginTop: '20px' }}>
            Questo indica un problema di configurazione del tuo ambiente locale (Vite, server di sviluppo, o cache del browser), non un errore nel codice dell'applicazione.
        </p>
        <h3 style={{ marginTop: '30px', color: '#333' }}>Cosa fare?</h3>
        <ul style={{ listStyleType: 'disc', marginLeft: '20px' }}>
            <li>Ferma il server di sviluppo (di solito con Ctrl+C nel terminale).</li>
            <li>Prova a cancellare la cache del browser.</li>
            <li>Cerca e cancella eventuali cartelle generate come <code>.vite</code> o <code>dist</code> nel tuo progetto.</li>
            <li>Riavvia il server di sviluppo (es. <code>npm run dev</code>).</li>
        </ul>
    </div>
);


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorComponent />
  </React.StrictMode>
);
