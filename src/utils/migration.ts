import { WorkStatus, PaymentStatus } from '../types';

// Questa funzione mappa i vecchi stati dei progetti al nuovo formato più dettagliato.
const mapOldStatus = (oldStatus: string) => {
    switch (oldStatus) {
        case 'preventivo da inviare':
            return { workStatus: WorkStatus.PreventivoDaInviare, paymentStatus: PaymentStatus.DaFatturare };
        case 'preventivo inviato':
            return { workStatus: WorkStatus.PreventivoInviato, paymentStatus: PaymentStatus.DaFatturare };
        case 'preventivo accettato':
            return { workStatus: WorkStatus.InLavorazione, paymentStatus: PaymentStatus.DaFatturare };
        case 'progetto consegnato':
            return { workStatus: WorkStatus.Consegnato, paymentStatus: PaymentStatus.DaFatturare };
        case 'attesa di pagamento':
            return { workStatus: WorkStatus.Consegnato, paymentStatus: PaymentStatus.Fatturato };
        case 'pagato':
            return { workStatus: WorkStatus.Consegnato, paymentStatus: PaymentStatus.Pagato };
        default:
            // Un fallback sicuro per stati sconosciuti o vecchi.
            return { workStatus: WorkStatus.PreventivoDaInviare, paymentStatus: PaymentStatus.DaFatturare };
    }
};

/**
 * Controlla i progetti nel localStorage e, se sono nel vecchio formato, li migra al nuovo.
 * Questa funzione viene eseguita all'avvio dell'applicazione, prima del rendering di React.
 */
export const runDataMigration = () => {
  try {
    const projectsJSON = localStorage.getItem('projects');
    if (!projectsJSON) {
      return; // Nessun progetto da migrare
    }

    const projects = JSON.parse(projectsJSON) as any[];
    // La migrazione è necessaria se esiste almeno un progetto con la vecchia chiave 'status' e senza la nuova 'workStatus'.
    const isMigrationNeeded = projects.length > 0 && projects.some(p => 'status' in p && !('workStatus' in p));

    if (isMigrationNeeded) {
      console.log('Inizio migrazione dati progetto...');
      
      const migratedProjects = projects.map(project => {
        // Se il progetto è già nel formato nuovo o non è un progetto valido, lo saltiamo.
        if (!('status' in project) || 'workStatus' in project) {
          return project;
        }

        const { status: oldStatus, ...restOfProject } = project;
        const newStatuses = mapOldStatus(oldStatus);
        
        return {
          ...restOfProject,
          ...newStatuses,
        };
      });

      localStorage.setItem('projects', JSON.stringify(migratedProjects));
      console.log('Migrazione dati completata con successo.');
    }
  } catch (error) {
    console.error('Errore critico durante la migrazione dei dati:', error);
  }
};
