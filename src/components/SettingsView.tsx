import React from 'react';
import * as firebaseService from '../services/firebaseService';
import { DownloadIcon, UploadIcon } from './icons';
import { Client, Project, Todo } from '../types';

type AppData = {
  clients: Client[];
  projects: Project[];
  todos: Todo[];
};

interface SettingsViewProps {
  userId: string;
  onImportSuccess: (data: AppData) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ userId, onImportSuccess }) => {

  const handleExportData = async () => {
    try {
        const currentCloudData = await firebaseService.getData(userId);
        if (!currentCloudData || currentCloudData.clients.length === 0 && currentCloudData.projects.length === 0) {
            alert("Non ci sono dati da esportare.");
            return;
        }
        const dataStr = JSON.stringify(currentCloudData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
        link.download = `progetta_backup_${timestamp}.json`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Errore durante l'esportazione dei dati:", error);
        alert("Si è verificato un errore durante l'esportazione. Controlla la console per i dettagli.");
    }
  };

  const handleImportData = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = async (event) => {
              try {
                  const content = event.target?.result;
                  if (typeof content !== 'string') throw new Error("Contenuto del file non valido.");
                  
                  const importedData = JSON.parse(content);

                  if (!('clients' in importedData && 'projects' in importedData && 'todos' in importedData)) {
                      throw new Error("Il file di backup non è valido o è corrotto.");
                  }

                  const confirmation = window.confirm(
                      "ATTENZIONE!\n\nStai per sovrascrivere TUTTI i dati presenti sul cloud con il contenuto di questo file.\n\nQuesta azione è IRREVERSIBILE.\n\nSei assolutamente sicuro di voler procedere?"
                  );

                  if (confirmation) {
                      await firebaseService.saveData(userId, importedData);
                      onImportSuccess(importedData);
                      alert("Dati importati e salvati sul cloud con successo!");
                  }
              } catch (error) {
                  console.error("Errore durante l'importazione dei dati:", error);
                  alert(`Si è verificato un errore durante l'importazione: ${error instanceof Error ? error.message : String(error)}`);
              }
          };
          reader.readAsText(file);
      };
      input.click();
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <h1 className="text-3xl font-bold mb-6 border-b pb-4 dark:border-gray-700">Impostazioni e Backup</h1>
      
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold">Esporta Dati</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 mb-3">
            Crea un file di backup in formato JSON con tutti i tuoi clienti, progetti e attività. Conservalo in un posto sicuro.
          </p>
          <button 
            onClick={handleExportData}
            className="bg-blue-500/10 text-blue-700 dark:text-blue-400 dark:hover:bg-blue-500/20 hover:bg-blue-500/20 px-4 py-2 rounded-lg font-semibold flex items-center transition-colors text-sm"
          >
            <DownloadIcon className="w-4 h-4 mr-2" />
            Esporta Backup
          </button>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Importa Dati</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 mb-3">
            Ripristina i tuoi dati da un file di backup JSON. Questa azione sovrascriverà tutti i dati attuali.
          </p>
          <button 
            onClick={handleImportData}
            className="bg-green-500/10 text-green-700 dark:text-green-400 dark:hover:bg-green-500/20 hover:bg-green-500/20 px-4 py-2 rounded-lg font-semibold flex items-center transition-colors text-sm"
          >
            <UploadIcon className="w-4 h-4 mr-2" />
            Importa da Backup
          </button>
        </div>

        <div className="mt-10 pt-6 border-t border-red-500/20">
          <h3 className="text-lg font-semibold text-red-500">Zona Pericolo</h3>
          <p className="text-sm text-gray-500 mt-2">
            L'importazione di un backup è un'azione permanente e non può essere annullata. Assicurati di aver selezionato il file corretto prima di procedere.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
