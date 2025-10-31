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

// --- Funzioni di Migrazione (per dati legacy) ---

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
            return { workStatus: WorkStatus.PreventivoDaInviare, paymentStatus: PaymentStatus.DaFatturare };
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

const migrateLegacyData = (): AppData | null => {
    const legacyClients = localStorage.getItem('clients');
    const legacyProjects = localStorage.getItem('projects');
    const legacyTodos = localStorage.getItem('todos');

    if (legacyClients && legacyProjects && legacyTodos) {
        console.log("Dati legacy trovati. Eseguo la migrazione...");
        const clients = JSON.parse(legacyClients);
        const projects = projectMigrator(JSON.parse(legacyProjects));
        const todos = JSON.parse(legacyTodos);
        
        localStorage.removeItem('clients');
        localStorage.removeItem('projects');
        localStorage.removeItem('todos');
        
        console.log("Migrazione completata. I vecchi dati sono stati rimossi.");
        return { clients, projects, todos };
    }
    return null;
}

// --- Auth Utilities ---
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Servizio Cloud Simulato ---

const networkDelay = (ms: number) => new Promise(res => setTimeout(res, ms));

const CREDENTIALS_KEY = 'userCredentials';
const SESSION_KEY = 'currentUser';

export async function register(username: string, password: string): Promise<string> {
    await networkDelay(500);
    if (localStorage.getItem(CREDENTIALS_KEY)) {
        throw new Error("Un utente è già registrato.");
    }
    const passwordHash = await hashPassword(password);
    const credentials = { username, passwordHash };
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
    localStorage.setItem(SESSION_KEY, username);
    return username;
}

export async function login(username: string, password: string): Promise<string> {
    await networkDelay(500);
    const storedCredentialsJSON = localStorage.getItem(CREDENTIALS_KEY);
    if (!storedCredentialsJSON) {
      throw new Error("Nessun utente registrato. Procedi con la configurazione.");
    }

    const storedCredentials = JSON.parse(storedCredentialsJSON);
    const hashedPassword = await hashPassword(password);

    if (username === storedCredentials.username && hashedPassword === storedCredentials.passwordHash) {
      localStorage.setItem(SESSION_KEY, username);
      return username;
    } else {
      throw new Error('Nome utente o password non validi.');
    }
}

export async function logout(): Promise<void> {
    await networkDelay(200);
    localStorage.removeItem(SESSION_KEY);
}

export async function getCurrentUser(): Promise<string | null> {
    await networkDelay(100);
    return localStorage.getItem(SESSION_KEY);
}

export async function hasCredentials(): Promise<boolean> {
    await networkDelay(100);
    return !!localStorage.getItem(CREDENTIALS_KEY);
}

export const getData = async (username: string): Promise<AppData> => {
    await networkDelay(800);
    const dataKey = `progetta_data_${username}`;
    const userDataJSON = localStorage.getItem(dataKey);

    if (userDataJSON) {
        return JSON.parse(userDataJSON);
    }
    
    const migratedData = migrateLegacyData();
    if (migratedData) {
        await saveData(username, migratedData);
        return migratedData;
    }
    
    return initialData;
};

export const saveData = async (username: string, data: AppData): Promise<void> => {
    await networkDelay(300);
    const dataKey = `progetta_data_${username}`;
    localStorage.setItem(dataKey, JSON.stringify(data));
};
