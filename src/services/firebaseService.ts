import { auth, db } from '../firebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Client, Project, Todo, WorkStatus, PaymentStatus, ProjectPriority } from '../types';

type AppData = {
  clients: Client[];
  projects: Project[];
  todos: Todo[];
};

const initialData: AppData = {
  clients: [],
  projects: [],
  todos: [],
};

// --- Funzioni di Migrazione (per dati legacy da localStorage) ---

const mapOldStatus = (oldStatus: string) => {
    switch (oldStatus) {
        case 'preventivo da inviare': return { workStatus: WorkStatus.PreventivoDaInviare, paymentStatus: PaymentStatus.DaFatturare };
        case 'preventivo inviato': return { workStatus: WorkStatus.PreventivoInviato, paymentStatus: PaymentStatus.DaFatturare };
        case 'preventivo accettato': return { workStatus: WorkStatus.InLavorazione, paymentStatus: PaymentStatus.DaFatturare };
        case 'progetto consegnato': return { workStatus: WorkStatus.Consegnato, paymentStatus: PaymentStatus.DaFatturare };
        case 'attesa di pagamento': return { workStatus: WorkStatus.Consegnato, paymentStatus: PaymentStatus.Fatturato };
        case 'pagato': return { workStatus: WorkStatus.Consegnato, paymentStatus: PaymentStatus.Pagato };
        default: return { workStatus: WorkStatus.PreventivoDaInviare, paymentStatus: PaymentStatus.DaFatturare };
    }
};

const projectMigrator = (projectsData: any): Project[] => {
  if (!Array.isArray(projectsData)) return [];

  return projectsData.map(project => {
    if (!project) return project;

    let migratedProject: Project = { ...project };

    // Migrazione status legacy
    if (typeof project.status === 'string' && typeof project.workStatus === 'undefined') {
      const { status: oldStatus, ...restOfProject } = project;
      const newStatuses = mapOldStatus(oldStatus);
      migratedProject = { ...restOfProject, ...newStatuses };
    }

    // Aggiunta priorità di default se mancante
    if (typeof migratedProject.priority === 'undefined') {
      migratedProject.priority = ProjectPriority.Media;
    }

    return migratedProject;
  });
};

const migrateLegacyDataFromLocalStorage = async (userId: string): Promise<AppData | null> => {
    const legacyClients = localStorage.getItem('clients');
    const legacyProjects = localStorage.getItem('projects');
    const legacyTodos = localStorage.getItem('todos');
    const legacyUser = localStorage.getItem('userCredentials'); // Per pulizia completa

    if (legacyClients && legacyProjects && legacyTodos) {
        console.log("Dati legacy trovati. Eseguo la migrazione su Firestore...");
        try {
            const clients = JSON.parse(legacyClients);
            const todos = JSON.parse(legacyTodos);
            const projects = projectMigrator(JSON.parse(legacyProjects));
            
            const dataToMigrate = { clients, projects, todos };

            // 1. Salva i dati su Firestore PRIMA di cancellarli localmente
            await setDoc(doc(db, "users", userId), dataToMigrate);

            // 2. Solo se il salvataggio ha successo, procedi con la pulizia
            localStorage.removeItem('clients');
            localStorage.removeItem('projects');
            localStorage.removeItem('todos');
            if (legacyUser) localStorage.removeItem('userCredentials');
            
            console.log("Migrazione completata con successo. I vecchi dati locali sono stati rimossi.");
            return dataToMigrate;

        } catch (error) {
            console.error("Errore critico durante la migrazione dei dati. I dati locali non sono stati rimossi.", error);
            // Non ritornare nulla in caso di errore per forzare il caricamento di dati vuoti/esistenti.
            return null;
        }
    }
    return null;
}

// --- Funzioni di Autenticazione Reali ---

export const register = async (email: string, password: string): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Controlla se ci sono dati legacy da migrare e li salva in modo sicuro
  const migratedData = await migrateLegacyDataFromLocalStorage(user.uid);
  
  // Se non ci sono dati migrati, crea il documento utente vuoto
  if (!migratedData) {
      await setDoc(doc(db, "users", user.uid), initialData);
  }
  
  return user;
}

export const login = async (email: string, password: string): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export const logout = (): Promise<void> => {
  return signOut(auth);
}

// --- Funzioni Dati Reali ---

export const getData = async (userId: string): Promise<AppData> => {
  const userDocRef = doc(db, "users", userId);
  const userDocSnap = await getDoc(userDocRef);

  if (userDocSnap.exists()) {
    const data = userDocSnap.data() as AppData;
    // Esegue una migrazione interna non distruttiva
    const migratedProjects = projectMigrator(data.projects || []);
    
    // Controlla se la migrazione ha effettivamente cambiato qualcosa
    const needsUpdate = JSON.stringify(migratedProjects) !== JSON.stringify(data.projects || []);
    
    if (needsUpdate) {
        console.log("Formato dati obsoleto rilevato. L'aggiornamento avverrà al prossimo salvataggio automatico.");
    }

    return { ...data, projects: migratedProjects };

  } else {
    // REGOLA DI SICUREZZA CRITICA: Non creare mai un documento qui.
    // La creazione avviene solo durante la registrazione. Questo previene la sovrascrittura
    // di dati in caso di errori di rete temporanei o race conditions.
    console.warn(`Documento utente non trovato per l'UID: ${userId}. Verrà restituito uno stato vuoto. I dati NON verranno sovrascritti sul cloud.`);
    return initialData;
  }
};

export const saveData = (userId: string, data: AppData): Promise<void> => {
  const userDocRef = doc(db, "users", userId);
  // `setDoc` sovrascrive, che è il comportamento desiderato per salvare l'intero stato dell'app.
  return setDoc(userDocRef, data);
};

// Funzione per ascoltare i cambiamenti dello stato di autenticazione
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};