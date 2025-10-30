import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { runDataMigration } from './utils/migration';

// Esegui la migrazione dei dati prima di montare l'applicazione React.
// Questo assicura che i componenti ricevano sempre dati nel formato corretto fin dal primo rendering.
runDataMigration();


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);