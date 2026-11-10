import React, { useEffect, useState } from 'react';
import * as firebaseService from '../services/firebaseService';
import { DownloadIcon, UploadIcon } from './icons';
import { BusinessProfile } from '../types';
import { DEFAULT_TAX_NOTE } from '../utils/quotes';
import ClaudeConnector from './ClaudeConnector';

interface SettingsViewProps {
  userId: string;
  profile: BusinessProfile | null;
  onSaveProfile: (profile: BusinessProfile) => void;
}

const emptyProfile: BusinessProfile = { name: '', vatNumber: '', fiscalCode: '', address: '', email: '', phone: '', iban: '', taxNote: DEFAULT_TAX_NOTE };

const ProfileForm: React.FC<{ profile: BusinessProfile | null; onSave: (p: BusinessProfile) => void }> = ({ profile, onSave }) => {
  const [form, setForm] = useState<BusinessProfile>({ ...emptyProfile, ...profile });
  const [saved, setSaved] = useState(false);
  useEffect(() => setForm({ ...emptyProfile, ...profile }), [profile]);
  const field = (key: keyof BusinessProfile, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block text-sm">{label}
      <input type="text" value={form[key] || ''} onChange={e => { setSaved(false); setForm(f => ({ ...f, [key]: e.target.value })); }} className="mt-1" {...props} />
    </label>
  );
  return (
    <form className="space-y-3" onSubmit={e => { e.preventDefault(); onSave(form); setSaved(true); }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field('name', 'Nome e cognome / nome attività', { required: true })}
        {field('vatNumber', 'Partita IVA')}
        {field('fiscalCode', 'Codice fiscale')}
        {field('iban', 'IBAN')}
        {field('email', 'Email', { type: 'email' })}
        {field('phone', 'Telefono')}
      </div>
      <label className="block text-sm">Indirizzo
        <textarea value={form.address || ''} onChange={e => { setSaved(false); setForm(f => ({ ...f, address: e.target.value })); }} rows={2} className="mt-1" />
      </label>
      <label className="block text-sm">Dicitura fiscale in calce
        <textarea value={form.taxNote || ''} onChange={e => { setSaved(false); setForm(f => ({ ...f, taxNote: e.target.value })); }} rows={3} className="mt-1" />
      </label>
      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-green-600 dark:text-green-400">Salvato</span>}
        <button type="submit" className="btn btn-primary px-4 py-2">Salva dati</button>
      </div>
    </form>
  );
};

const SettingsView: React.FC<SettingsViewProps> = ({ userId, profile, onSaveProfile }) => {

  const handleExportData = async () => {
    try {
        const currentCloudData = await firebaseService.exportData(userId);
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

                  if (!(importedData && Array.isArray(importedData.clients) && Array.isArray(importedData.projects) && Array.isArray(importedData.todos))) {
                      throw new Error("Il file di backup non è valido o è corrotto.");
                  }

                  const confirmation = window.confirm(
                      "ATTENZIONE!\n\nStai per sovrascrivere TUTTI i dati presenti sul cloud con il contenuto di questo file.\n\nQuesta azione è IRREVERSIBILE.\n\nSei assolutamente sicuro di voler procedere?"
                  );

                  if (confirmation) {
                      // L'interfaccia si aggiorna da sola tramite gli snapshot in tempo reale
                      await firebaseService.importData(userId, importedData);
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
    <div className="bg-card p-6 rounded-lg shadow-md border border-muted">
      <h1 className="text-3xl font-bold mb-6 border-b pb-4">Impostazioni e Backup</h1>
      
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold">Dati per i preventivi</h2>
          <p className="text-muted-foreground mt-1 mb-3">
            Compaiono nell'intestazione e in calce di ogni preventivo. La dicitura proposta è quella del regime forfettario: verificala con il tuo commercialista.
          </p>
          <ProfileForm profile={profile} onSave={onSaveProfile} />
        </div>

        <div>
          <h2 className="text-xl font-semibold">Claude</h2>
          <ClaudeConnector userId={userId} />
        </div>

        <div>
          <h2 className="text-xl font-semibold">Esporta Dati</h2>
          <p className="text-muted-foreground mt-1 mb-3">
            Crea un file di backup in formato JSON con clienti, progetti, attività, preventivi, documenti e i tuoi dati (le versioni precedenti dei documenti non sono incluse). Conservalo in un posto sicuro.
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
          <p className="text-muted-foreground mt-1 mb-3">
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
          <p className="text-sm text-muted-foreground mt-2">
            L'importazione di un backup è un'azione permanente e non può essere annullata. Assicurati di aver selezionato il file corretto prima di procedere.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
