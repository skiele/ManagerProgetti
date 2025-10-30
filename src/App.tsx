import React, { useState, useMemo, useCallback } from 'react';
import { Client, Project, Todo, WorkStatus, PaymentStatus } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import { BriefcaseIcon, CalendarIcon, ChartBarIcon, PlusIcon, TrashIcon, UsersIcon, LogOutIcon } from './components/icons';
import Modal from './components/Modal';
import CalendarView from './components/CalendarView';
import LoginScreen from './components/LoginScreen';
import SetupScreen from './components/SetupScreen';
import Dashboard from './components/Dashboard';
import ClientView from './components/ClientView';

type AppState = 'setup' | 'login' | 'authenticated';

const initialClients: Client[] = [];
const initialProjects: Project[] = [];
const initialTodos: Todo[] = [];

// --- Funzioni di Migrazione ---

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
 * Funzione migratore per i progetti. Controlla ogni progetto e lo converte al nuovo formato se necessario.
 * Viene passata all'hook useLocalStorage per essere eseguita una sola volta al caricamento iniziale dei dati.
 */
const projectMigrator = (data: any): Project[] => {
  if (!Array.isArray(data)) {
    return initialProjects;
  }
  
  return data.map(project => {
    // Se 'status' esiste e 'workStatus' non esiste, allora è un vecchio progetto da migrare.
    if (project && typeof project.status === 'string' && typeof project.workStatus === 'undefined') {
      const { status: oldStatus, ...restOfProject } = project;
      const newStatuses = mapOldStatus(oldStatus);
      return {
        ...restOfProject,
        ...newStatuses,
      };
    }
    // Altrimenti, si assume che il progetto sia già nel formato corretto o non valido (verrà filtrato dopo se necessario).
    return project;
  });
};


// --- Main Application Component (Protected) ---
const MainApp: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [clients, setClients] = useLocalStorage<Client[]>('clients', initialClients);
  const [projects, setProjects] = useLocalStorage<Project[]>('projects', initialProjects, projectMigrator);
  const [todos, setTodos] = useLocalStorage<Todo[]>('todos', initialTodos);

  const [selectedView, setSelectedView] = useState<string>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<'client' | 'project' | 'todo' | null>(null);
  const [currentContextId, setCurrentContextId] = useState<string | null>(null);

  const [filterYear, setFilterYear] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');

  const handleAddClient = (name: string, email?: string) => {
    const newClient: Client = { id: crypto.randomUUID(), name, email };
    setClients(prev => [...prev, newClient]);
  };
  
  const handleAddProject = (clientId: string, name: string, value: number) => {
    const newProject: Project = { 
      id: crypto.randomUUID(), 
      clientId, 
      name, 
      value, 
      workStatus: WorkStatus.PreventivoDaInviare, 
      paymentStatus: PaymentStatus.DaFatturare, 
      createdAt: new Date().toISOString() 
    };
    setProjects(prev => [...prev, newProject]);
  };

  const handleAddTodo = (projectId: string, task: string, income: number, dueDate?: string) => {
    const newTodo: Todo = { id: crypto.randomUUID(), projectId, task, income, completed: false, dueDate };
    setTodos(prev => [...prev, newTodo]);
  };

  const handleDeleteClient = (clientId: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo cliente? Verranno eliminati anche tutti i suoi progetti e le relative attività.')) {
        const projectsToDelete = projects.filter(p => p.clientId === clientId);
        const projectIdsToDelete = projectsToDelete.map(p => p.id);
        
        setTodos(prev => prev.filter(t => !projectIdsToDelete.includes(t.projectId)));
        setProjects(prev => prev.filter(p => p.clientId !== clientId));
        setClients(prev => prev.filter(c => c.id !== clientId));

        if (selectedView === clientId) {
            setSelectedView('dashboard');
        }
    }
  };

  const handleDeleteProject = (projectId: string) => {
      if (window.confirm('Sei sicuro di voler eliminare questo progetto? Verranno eliminate anche tutte le sue attività.')) {
          setTodos(prev => prev.filter(t => t.projectId !== projectId));
          setProjects(prev => prev.filter(p => p.id !== projectId));
      }
  };

  const handleDeleteTodo = (todoId: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questa attività?')) {
      setTodos(prev => prev.filter(t => t.id !== todoId));
    }
  };

  const openModal = (type: 'client' | 'project' | 'todo', contextId: string | null = null) => {
    setModalContent(type);
    setCurrentContextId(contextId);
    setIsModalOpen(true);
  };

  const FormComponent = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [projectValue, setProjectValue] = useState(0);
    const [task, setTask] = useState('');
    const [income, setIncome] = useState(0);
    const [dueDate, setDueDate] = useState('');


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (modalContent === 'client' && name) {
            handleAddClient(name, email || undefined);
        } else if (modalContent === 'project' && name && currentContextId) {
            handleAddProject(currentContextId, name, projectValue);
        } else if (modalContent === 'todo' && task && currentContextId) {
            handleAddTodo(currentContextId, task, income, dueDate || undefined);
        }
        setIsModalOpen(false);
    };

    const renderFormFields = () => {
        switch (modalContent) {
            case 'client':
                return <>
                    <input type="text" placeholder="Nome Cliente" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 mb-4" required/>
                    <input type="email" placeholder="Email Cliente (Opzionale)" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                </>;
            case 'project':
                return <>
                    <select
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 mb-4"
                        value={currentContextId || ''}
                        onChange={(e) => setCurrentContextId(e.target.value)}
                        required
                    >
                        <option value="" disabled>Seleziona Cliente</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input type="text" placeholder="Nome Progetto" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 mb-4" required/>
                    <input type="number" placeholder="Valore Progetto (€)" value={projectValue} onChange={e => setProjectValue(Number(e.target.value))} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" required/>
                </>;
            case 'todo':
                 return <>
                    <input type="text" placeholder="Attività" value={task} onChange={e => setTask(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 mb-4" required/>
                    <input type="number" placeholder="Incasso (€) - Opzionale" value={income} onChange={e => setIncome(Number(e.target.value))} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 mb-4" />
                    <input type="date" placeholder="Data di scadenza" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                </>;
            default: return null;
        }
    };

    return <form onSubmit={handleSubmit} className="space-y-4">
        {renderFormFields()}
        <button type="submit" className="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-secondary transition-colors">Aggiungi</button>
    </form>
  };

  const availableYears = useMemo(() => {
    const years = new Set(projects.map(p => new Date(p.createdAt).getFullYear().toString()));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [projects]);
  
  const filteredProjects = useMemo(() => {
      return projects.filter(project => {
          const projectDate = new Date(project.createdAt);
          const yearMatch = filterYear === 'all' || projectDate.getFullYear().toString() === filterYear;
          const monthMatch = filterMonth === 'all' || (projectDate.getMonth() + 1).toString() === filterMonth;
          return yearMatch && monthMatch;
      });
  }, [projects, filterYear, filterMonth]);


  const getProjectTotal = useCallback((projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return 0;
    
    const tasksTotal = todos
      .filter(todo => todo.projectId === projectId)
      .reduce((sum, todo) => sum + todo.income, 0);

    return project.value + tasksTotal;
  }, [projects, todos]);

 const { collectedIncome, futureIncome, potentialIncome } = useMemo(() => {
    let collected = 0;
    let future = 0;
    let potential = 0;

    filteredProjects.forEach(p => {
      if (p.workStatus === WorkStatus.Annullato) return;

      const projectTotal = getProjectTotal(p.id);
      
      if (p.paymentStatus === PaymentStatus.Pagato) {
        collected += projectTotal;
      } else if (p.workStatus === WorkStatus.InLavorazione || p.workStatus === WorkStatus.Consegnato) {
        future += projectTotal;
      } else if (p.workStatus === WorkStatus.PreventivoDaInviare || p.workStatus === WorkStatus.PreventivoInviato) {
        potential += projectTotal;
      }
    });

    return { collectedIncome: collected, futureIncome: future, potentialIncome: potential };
  }, [filteredProjects, getProjectTotal]);

  const handleUpdateProjectWorkStatus = (id: string, workStatus: WorkStatus) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, workStatus } : p));
  };
  
  const handleUpdateProjectPaymentStatus = (id: string, paymentStatus: PaymentStatus) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, paymentStatus } : p));
  };
  
  const handleToggleTodo = (id: string, completed: boolean) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed } : t));
  };

  const selectedClient = useMemo(() => clients.find(c => c.id === selectedView), [clients, selectedView]);

  return (
    <div className="flex h-screen font-sans">
      <aside className="w-64 bg-gray-800 text-white flex flex-col p-4 shadow-2xl">
        <div className="flex items-center mb-8">
            <BriefcaseIcon className="w-8 h-8 text-accent"/>
            <h1 className="text-xl font-bold ml-2">Gestione Lavori</h1>
        </div>
        <nav className="flex-grow">
            <ul>
                <li 
                    className={`flex items-center p-3 rounded-lg cursor-pointer mb-2 transition-colors ${selectedView === 'dashboard' ? 'bg-primary' : 'hover:bg-gray-700'}`}
                    onClick={() => setSelectedView('dashboard')}>
                    <ChartBarIcon className="w-5 h-5 mr-3"/> Dashboard
                </li>
                 <li 
                    className={`flex items-center p-3 rounded-lg cursor-pointer mb-2 transition-colors ${selectedView === 'calendar' ? 'bg-primary' : 'hover:bg-gray-700'}`}
                    onClick={() => setSelectedView('calendar')}>
                    <CalendarIcon className="w-5 h-5 mr-3"/> Calendario
                </li>
            </ul>
            <h2 className="text-sm font-semibold text-gray-400 mt-6 mb-2 px-3 uppercase">Clienti</h2>
            <ul>
                {clients.map(client => (
                    <li key={client.id}
                        className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer mb-1 transition-colors text-sm ${selectedView === client.id ? 'bg-primary' : 'hover:bg-gray-700'}`}>
                        <div className="flex items-center flex-1 min-w-0" onClick={() => setSelectedView(client.id)}>
                            <UsersIcon className="w-4 h-4 mr-3 flex-shrink-0"/> 
                            <span className="truncate">{client.name}</span>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClient(client.id);
                            }}
                            className="text-gray-400 hover:text-red-500 ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            aria-label={`Elimina cliente ${client.name}`}
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
        <div className="space-y-2">
            <button onClick={() => openModal('client')} className="w-full bg-accent text-white py-2 rounded-lg font-semibold flex items-center justify-center hover:bg-opacity-80 transition-opacity">
                <PlusIcon className="w-5 h-5 mr-2"/> Nuovo Cliente
            </button>
             <button onClick={onLogout} className="w-full bg-gray-600 text-white py-2 rounded-lg font-semibold flex items-center justify-center hover:bg-gray-500 transition-colors">
                <LogOutIcon className="w-5 h-5 mr-2"/> Esci
            </button>
        </div>
        <div className="mt-auto pt-4 text-center text-xs text-gray-400">
          v1.0.0
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto bg-light dark:bg-gray-900">
        {selectedView === 'dashboard' && <Dashboard 
            collectedIncome={collectedIncome} 
            futureIncome={futureIncome}
            potentialIncome={potentialIncome} 
            clients={clients} 
            projects={filteredProjects} 
            todos={todos}
            filterYear={filterYear}
            setFilterYear={setFilterYear}
            filterMonth={filterMonth}
            setFilterMonth={setFilterMonth}
            availableYears={availableYears}
        />}
         {selectedView === 'calendar' && <CalendarView todos={todos} projects={projects} clients={clients}/>}
        {selectedClient && (
            <ClientView 
                client={selectedClient} 
                projects={projects.filter(p => p.clientId === selectedClient.id)} 
                todos={todos}
                onUpdateProjectWorkStatus={handleUpdateProjectWorkStatus}
                onUpdateProjectPaymentStatus={handleUpdateProjectPaymentStatus}
                onToggleTodo={handleToggleTodo}
                onAddProject={(clientId) => openModal('project', clientId)}
                onAddTodo={(projectId) => openModal('todo', projectId)}
                onDeleteProject={handleDeleteProject}
                onDeleteTodo={handleDeleteTodo}
            />
        )}
      </main>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={
            modalContent === 'client' ? 'Aggiungi Cliente' :
            modalContent === 'project' ? 'Aggiungi Progetto' :
            'Aggiungi To-Do'
        }
      >
        <FormComponent />
      </Modal>
    </div>
  );
};


// --- Authentication Controller Component ---

const getInitialAppState = (): AppState => {
  try {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated');
    if (isAuthenticated === 'true') {
      return 'authenticated';
    }
    const hasCredentials = !!localStorage.getItem('userCredentials');
    if (hasCredentials) {
      return 'login';
    }
    return 'setup';
  } catch (e) {
    console.error("Errore durante la lettura dallo storage:", e);
    return 'setup';
  }
};

export default function App() {
  const [appState, setAppState] = useState<AppState>(getInitialAppState());

  const handleSetupComplete = () => {
    setAppState('login');
  };

  const handleLoginSuccess = () => {
    sessionStorage.setItem('isAuthenticated', 'true');
    setAppState('authenticated');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    setAppState('login');
  };
  
  switch (appState) {
    case 'setup':
      return <SetupScreen onSetupComplete={handleSetupComplete} />;
    case 'login':
      return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
    case 'authenticated':
      return <MainApp onLogout={handleLogout} />;
    default:
       // Fallback in case of an unexpected state
      return <SetupScreen onSetupComplete={handleSetupComplete} />;
  }
}