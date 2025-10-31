import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Client, Project, Todo, WorkStatus, PaymentStatus } from './types';
import { CalendarIcon, ChartBarIcon, PlusIcon, TrashIcon, UsersIcon, LogOutIcon, SparklesIcon } from './components/icons';
import Modal from './components/Modal';
import CalendarView from './components/CalendarView';
import LoginScreen from './components/LoginScreen';
import SetupScreen from './components/SetupScreen';
import Dashboard from './components/Dashboard';
import ClientView from './components/ClientView';
import * as firebaseService from './services/firebaseService';
import { GoogleGenAI, Type } from '@google/genai';

type AppState = 'setup' | 'login' | 'loading' | 'authenticated';
type AppData = {
  clients: Client[];
  projects: Project[];
  todos: Todo[];
};

// --- Main Application Component (Protected) ---
const MainApp: React.FC<{ onLogout: () => void; initialData: AppData; currentUser: string }> = ({ onLogout, initialData, currentUser }) => {
  const [clients, setClients] = useState<Client[]>(initialData.clients);
  const [projects, setProjects] = useState<Project[]>(initialData.projects);
  const [todos, setTodos] = useState<Todo[]>(initialData.todos);
  
  // Effetto per salvare i dati ad ogni modifica
  useEffect(() => {
    firebaseService.saveData(currentUser, { clients, projects, todos });
  }, [clients, projects, todos, currentUser]);


  const [selectedView, setSelectedView] = useState<string>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<'client' | 'project' | 'todo' | null>(null);
  const [currentContextId, setCurrentContextId] = useState<string | null>(null);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiContextClientId, setAiContextClientId] = useState<string | null>(null);


  const [filterYear, setFilterYear] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');

  const handleAddClient = (name: string, email?: string) => {
    const newClient: Client = { id: crypto.randomUUID(), name, email };
    setClients(prev => [...prev, newClient]);
  };
  
  const handleAddProject = (clientId: string, name: string, value: number, notes?: string): Project => {
    const newProject: Project = { 
      id: crypto.randomUUID(), 
      clientId, 
      name, 
      value, 
      workStatus: WorkStatus.PreventivoDaInviare, 
      paymentStatus: PaymentStatus.DaFatturare, 
      createdAt: new Date().toISOString(),
      notes
    };
    setProjects(prev => [...prev, newProject]);
    return newProject;
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
  
  const openAiModal = (clientId: string) => {
    setAiContextClientId(clientId);
    setIsAiModalOpen(true);
  };

  // Drag and drop handlers for client reordering
  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
    e.dataTransfer.setData("clientIndex", index.toString());
    e.currentTarget.classList.add('opacity-50', 'bg-primary');
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault(); // Necessary to allow dropping
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    if (!e.currentTarget.classList.contains('bg-primary')) {
        e.currentTarget.classList.add('bg-gray-700');
    }
  }
  
  const handleDragLeave = (e: React.DragEvent<HTMLLIElement>) => {
    e.currentTarget.classList.remove('bg-gray-700');
  }

  const handleDrop = (e: React.DragEvent<HTMLLIElement>, dropIndex: number) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-gray-700');
    const dragIndexStr = e.dataTransfer.getData("clientIndex");
    if (dragIndexStr === "") return;
    
    const dragIndex = parseInt(dragIndexStr, 10);
    if (dragIndex === dropIndex) return;

    const reorderedClients = [...clients];
    const [draggedClient] = reorderedClients.splice(dragIndex, 1);
    reorderedClients.splice(dropIndex, 0, draggedClient);

    setClients(reorderedClients);
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLLIElement>) => {
    e.currentTarget.classList.remove('opacity-50', 'bg-primary');
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

  const AiFormComponent = ({ clientId, onComplete }: { clientId: string; onComplete: () => void }) => {
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description) return;
        setLoading(true);
        setError('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const schema = {
                type: Type.OBJECT,
                properties: {
                    projectName: { type: Type.STRING, description: "Nome conciso e professionale per il progetto." },
                    projectValue: { type: Type.NUMBER, description: "Valore economico di partenza plausibile in Euro." },
                    projectNotes: { type: Type.STRING, description: "Breve nota iniziale per contestualizzare il progetto." },
                    todos: {
                        type: Type.ARRAY,
                        description: "Lista di 3-5 to-do comuni per questo tipo di progetto.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                task: { type: Type.STRING, description: "Descrizione dell'attività da svolgere." },
                                income: { type: Type.NUMBER, description: "Piccolo incasso associato, 0 se non applicabile." }
                            },
                            required: ["task", "income"]
                        }
                    }
                },
                required: ["projectName", "projectValue", "projectNotes", "todos"]
            };

            const prompt = `Sei un assistente per un project manager freelance.
            Dato il seguente brief di progetto, genera:
            1. Un nome conciso e professionale per il progetto.
            2. Un valore economico di partenza plausibile in Euro (solo il numero).
            3. Una breve nota iniziale per il progetto.
            4. Una lista di 3-5 to-do comuni per questo tipo di progetto, con un piccolo incasso associato a ciascuno (0 se non applicabile).
            
            Brief del progetto: "${description}"
            
            Fornisci la risposta esclusivamente in formato JSON, rispettando lo schema fornito.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                }
            });

            const result = JSON.parse(response.text);

            const newProject = handleAddProject(clientId, result.projectName, result.projectValue, result.projectNotes);

            if (result.todos && Array.isArray(result.todos)) {
                result.todos.forEach((todo: { task: string; income: number }) => {
                    handleAddTodo(newProject.id, todo.task, todo.income);
                });
            }
            onComplete();
        } catch (err) {
            console.error("Errore durante la generazione AI:", err);
            setError('Non è stato possibile generare il progetto. Riprova.');
        } finally {
            setLoading(false);
        }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          placeholder="Descrivi brevemente il progetto (es. 'Sito e-commerce per un negozio di abbigliamento')"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 mb-4"
          rows={4}
          required
          disabled={loading}
        />
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        <button type="submit" className="w-full bg-accent text-white py-2 rounded-lg font-semibold hover:bg-opacity-80 transition-opacity flex items-center justify-center disabled:bg-gray-400" disabled={loading}>
            {loading ? 'Generazione in corso...' : <><SparklesIcon className="w-5 h-5 mr-2"/> Genera Progetto</>}
        </button>
      </form>
    );
  };

  const availableYears = useMemo(() => {
    const years = new Set(projects.map(p => new Date(p.createdAt).getFullYear().toString()));
    return Array.from(years).sort((a, b) => String(b).localeCompare(String(a)));
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
  
  const handleUpdateProjectNotes = (id: string, notes: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, notes } : p));
  };

  const selectedClient = useMemo(() => clients.find(c => c.id === selectedView), [clients, selectedView]);

  return (
    <div className="flex h-screen font-sans">
      <aside className="w-64 bg-gray-800 text-white flex flex-col p-4 shadow-2xl">
        <div className="flex items-center mb-8">
            <img src="/logo.svg" alt="Progetta Logo" className="w-8 h-8"/>
            <h1 className="text-2xl font-bold ml-2">Progetta</h1>
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
                {clients.map((client, index) => {
                    const clientProjects = projects.filter(p => p.clientId === client.id);
                    const isInactive = clientProjects.length > 0 && clientProjects.every(
                        p => p.workStatus === WorkStatus.Consegnato && p.paymentStatus === PaymentStatus.Pagato
                    );

                    return (
                        <li key={client.id}
                            draggable="true"
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={handleDragOver}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`group flex items-center justify-between p-3 rounded-lg cursor-grab mb-1 transition-all text-sm 
                                ${selectedView === client.id ? 'bg-primary' : 'hover:bg-gray-700'}
                                ${isInactive ? 'opacity-60' : ''}`}
                            >
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
                    );
                })}
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
          v1.0.1
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
                onAiAddProject={openAiModal}
                onAddTodo={(projectId) => openModal('todo', projectId)}
                onDeleteProject={handleDeleteProject}
                onDeleteTodo={handleDeleteTodo}
                onUpdateProjectNotes={handleUpdateProjectNotes}
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

      <Modal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        title="Crea Progetto con AI"
      >
        {aiContextClientId && <AiFormComponent clientId={aiContextClientId} onComplete={() => setIsAiModalOpen(false)} />}
      </Modal>

    </div>
  );
};


// --- Authentication Controller Component ---
export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [initialData, setInitialData] = useState<AppData | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  
  useEffect(() => {
    const initialize = async () => {
      try {
        const sessionUser = await firebaseService.getCurrentUser();
        if (sessionUser) {
          const data = await firebaseService.getData(sessionUser);
          setInitialData(data);
          setCurrentUser(sessionUser);
          setAppState('authenticated');
        } else {
          const hasCreds = await firebaseService.hasCredentials();
          setAppState(hasCreds ? 'login' : 'setup');
        }
      } catch (error) {
        console.error("Errore durante l'inizializzazione:", error);
        setAppState('setup');
      }
    };
    initialize();
  }, []);


  const handleSetupComplete = (username: string) => {
    // Dopo il setup, considero l'utente come loggato e carico i suoi dati.
    handleLoginSuccess(username);
  };

  const handleLoginSuccess = (username: string) => {
    setAppState('loading');
    const loadUserData = async () => {
        try {
          const data = await firebaseService.getData(username);
          setInitialData(data);
          setCurrentUser(username);
          setAppState('authenticated');
        } catch (error) {
           console.error("Errore durante il recupero dei dati post-login:", error);
           setAppState('login');
        }
    };
    loadUserData();
  };

  const handleLogout = async () => {
    await firebaseService.logout();
    setAppState('login');
    setInitialData(null);
    setCurrentUser(null);
  };
  
  switch (appState) {
    case 'loading':
      return <div className="flex items-center justify-center h-screen">Caricamento...</div>;
    case 'setup':
      return <SetupScreen onSetupComplete={handleSetupComplete} />;
    case 'login':
      return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
    case 'authenticated':
      if (!initialData || !currentUser) {
        return <div className="flex items-center justify-center h-screen">Errore: Dati non disponibili.</div>;
      }
      return <MainApp onLogout={handleLogout} initialData={initialData} currentUser={currentUser} />;
    default:
      return <SetupScreen onSetupComplete={handleSetupComplete} />;
  }
}