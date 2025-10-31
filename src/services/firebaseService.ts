import { auth, db } from '../firebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Client, Project, Todo, WorkStatus, PaymentStatus } from '../types';

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

const projectMigrator = (data: any): Project[] => {
  if (!Array.isArray(data)) return [];
  return data.map(project => {
    if (project && typeof project.status === 'string' && typeof project.workStatus === 'undefined') {
      const { status: oldStatus, ...restOfProject } = project;
      const newStatuses = mapOldStatus(oldStatus);
      return { ...restOfProject, ...newStatuses };
    }
    return project;
  });
};

const migrateLegacyDataFromLocalStorage = (): AppData | null => {
    const legacyClients = localStorage.getItem('clients');
    const legacyProjects = localStorage.getItem('projects');
    const legacyTodos = localStorage.getItem('todos');
    const legacyUser = localStorage.getItem('userCredentials'); // Per pulizia completa

    if (legacyClients && legacyProjects && legacyTodos) {
        console.log("Dati legacy trovati. Eseguo la migrazione su Firestore...");
        const clients = JSON.parse(legacyClients);
        const projects = projectMigrator(JSON.parse(legacyProjects));
        const todos = JSON.parse(legacyTodos);
        
        localStorage.removeItem('clients');
        localStorage.removeItem('projects');
        localStorage.removeItem('todos');
        if (legacyUser) localStorage.removeItem('userCredentials');
        
        console.log("Migrazione completata. I vecchi dati locali sono stati rimossi.");
        return { clients, projects, todos };
    }
    return null;
}

// --- Funzioni di Autenticazione Reali ---

export const register = async (email: string, password: string): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Controlla se ci sono dati legacy da migrare
  const migratedData = migrateLegacyDataFromLocalStorage();
  
  // Crea il documento utente in Firestore con i dati migrati o con i dati iniziali
  await setDoc(doc(db, "users", user.uid), migratedData || initialData);
  
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
    return userDocSnap.data() as AppData;
  } else {
    // L'utente è autenticato ma non ha un documento dati (es. primo login dopo cancellazione db)
    // Provo a migrare i dati da localStorage come fallback
    const migratedData = migrateLegacyDataFromLocalStorage();
    if (migratedData) {
      await setDoc(userDocRef, migratedData);
      return migratedData;
    }
    // Se non ci sono dati da migrare, creo un documento vuoto
    await setDoc(userDocRef, initialData);
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
