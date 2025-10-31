import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Client, Project, Todo, WorkStatus, PaymentStatus, ProjectPriority } from './types';
import { CalendarIcon, ChartBarIcon, PlusIcon, TrashIcon, UsersIcon, LogOutIcon, SparklesIcon, CopyIcon, SunIcon, MoonIcon, CogIcon, DownloadIcon, UploadIcon } from './components/icons';
import Modal from './components/Modal';
import CalendarView from './components/CalendarView';
import LoginScreen from './components/LoginScreen';
import SetupScreen from './components/SetupScreen';
import Dashboard from './components/Dashboard';
import ClientView from './components/ClientView';
import SettingsView from './components/SettingsView';
import * as firebaseService from './services/firebaseService';
import { GoogleGenAI, Type } from '@google/genai';
import { User } from 'firebase/auth';


type AppState = 'loading' | 'authenticated' | 'unauthenticated';
type AppData = {
  clients: Client[];
  projects: Project[];
  todos: Todo[];
};
type Theme = 'light' | 'dark';

// --- Main Application Component (Protected) ---
const MainApp: React.FC<{ onLogout: () => void; initialData: AppData; userId: string }> = ({ onLogout, initialData, userId }) => {
  const [clients, setClients] = useState<Client[]>(initialData.clients);
  const [projects, setProjects] = useState<Project[]>(initialData.projects);
  const [todos, setTodos] = useState<Todo[]>(initialData.todos);
  const draggedClientIdRef = useRef<string | null>(null);


  // Helper function to save the current state to Firestore
  const saveDataToCloud = (updatedData: Partial<AppData>) => {
    const fullData = {
      clients,
      projects,
      todos,
      ...updatedData,
    };
    firebaseService.saveData(userId, fullData);
  };

  const [selectedView, setSelectedView] = useState<string>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<'client' | 'project' | 'todo' | null>(null);
  const [currentContextId, setCurrentContextId] = useState<string | null>(null);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiContextClientId, setAiContextClientId] = useState<string | null>(null);


  const [filterYear, setFilterYear] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'dark');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  }

  const handleAddClient = (name: string, email?: string) => {
    const newClient: Client = {
      id: crypto.randomUUID(),
      name,
      ...(email && { email }),
    };
    setClients(prev => {
      const newClients = [...prev, newClient];
      saveDataToCloud({ clients: newClients });
      return newClients;
    });
  };
  
  const handleAddProject = (clientId: string, name: string, value: number, notes?: string): Project => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      clientId,
      name,
      value,
      workStatus: WorkStatus.PreventivoDaInviare,
      paymentStatus: PaymentStatus.DaFatturare,
      priority: ProjectPriority.Media,
      createdAt: new Date().toISOString(),
      ...(notes && { notes }),
    };
    setProjects(prev => {
      const newProjects = [...prev, newProject];
      saveDataToCloud({ projects: newProjects });
      return newProjects;
    });
    return newProject;
  };

  const handleAddTodo = (projectId: string, task: string, income: number, dueDate?: string) => {
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      projectId,
      task,
      income,
      completed: false,
      ...(dueDate && { dueDate }),
    };
    setTodos(prev => {
      const newTodos = [...prev, newTodo];
      saveDataToCloud({ todos: newTodos });
      return newTodos;
    });
  };
  
  const handleDuplicateProject = (projectId: string) => {
    const originalProject = projects.find(p => p.id === projectId);
    if (!originalProject) return;

    const newProject: Project = {
        ...originalProject,
        id: crypto.randomUUID(),
        name: `${originalProject.name} (Copia)`,
        workStatus: WorkStatus.PreventivoDaInviare,
        paymentStatus: PaymentStatus.DaFatturare,
        createdAt: new Date().toISOString(),
        paidAt: undefined,
    };

    const originalTodos = todos.filter(t => t.projectId === projectId);
    const newTodos: Todo[] = originalTodos.map(todo => ({
        ...todo,
        id: crypto.randomUUID(),
        projectId: newProject.id,
        completed: false,
    }));

    setProjects(prev => {
      const newProjects = [...prev, newProject];
      setTodos(prevTodos => {
        const updatedTodos = [...prevTodos, ...newTodos];
        saveDataToCloud({ projects: newProjects, todos: updatedTodos });
        return updatedTodos;
      });
      return newProjects;
    });
  };

  const handleDeleteClient = (clientId: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo cliente? Verranno eliminati anche tutti i suoi progetti e le relative attività.')) {
        const projectsToDelete = projects.filter(p => p.clientId === clientId);
        const projectIdsToDelete = projectsToDelete.map(p => p.id);
        
        const newTodos = todos.filter(t => !projectIdsToDelete.includes(t.projectId));
        const newProjects = projects.filter(p => p.clientId !== clientId);
        const newClients = clients.filter(c => c.id !== clientId);

        setTodos(newTodos);
        setProjects(newProjects);
        setClients(newClients);
        saveDataToCloud({ clients: newClients, projects: newProjects, todos: newTodos });

        if (selectedView === clientId) {
            setSelectedView('dashboard');
        }
    }
  };

  const handleDeleteProject = (projectId: string) => {
      if (window.confirm('Sei sicuro di voler eliminare questo progetto? Verranno eliminate anche tutte le sue attività.')) {
          const newTodos = todos.filter(t => t.projectId !== projectId);
          const newProjects = projects.filter(p => p.id !== projectId);
          setTodos(newTodos);
          setProjects(newProjects);
          saveDataToCloud({ projects: newProjects, todos: newTodos });
      }
  };

  const handleDeleteTodo = (todoId: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questa attività?')) {
      setTodos(prev => {
        const newTodos = prev.filter(t => t.id !== todoId);
        saveDataToCloud({ todos: newTodos });
        return newTodos;
      });
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

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, client: Client) => {
    draggedClientIdRef.current = client.id;
    e.dataTransfer.setData("clientId", client.id);
    e.currentTarget.classList.add('opacity-50', 'bg-primary');
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => e.preventDefault();
  
  const handleDragEnter = (e: React.DragEvent<HTMLLIElement>, hoverClient: Client) => {
    e.preventDefault();
    const draggedId = draggedClientIdRef.current;
    if (!draggedId || draggedId === hoverClient.id || e.currentTarget.classList.contains('bg-primary')) return;

    const draggedPriority = clientPriorities.get(draggedId) || ProjectPriority.Bassa;
    const hoverPriority = clientPriorities.get(hoverClient.id) || ProjectPriority.Bassa;

    if (draggedPriority === hoverPriority) {
        e.currentTarget.classList.add('bg-gray-700');
    }
  }
  
  const handleDragLeave = (e: React.DragEvent<HTMLLIElement>) => e.currentTarget.classList.remove('bg-gray-700');
  
  const handleDrop = (e: React.DragEvent<HTMLLIElement>, dropClient: Client) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-gray-700');
    const draggedId = e.dataTransfer.getData("clientId");
    if (!draggedId || draggedId === dropClient.id) return;
    
    const draggedPriority = clientPriorities.get(draggedId) || ProjectPriority.Bassa;
    const dropPriority = clientPriorities.get(dropClient.id) || ProjectPriority.Bassa;

    if (draggedPriority !== dropPriority) return;

    const dragIndex = clients.findIndex(c => c.id === draggedId);
    const dropIndex = clients.findIndex(c => c.id === dropClient.id);
    
    if (dragIndex === -1 || dropIndex === -1) return;

    const reorderedClients = [...clients];
    const [draggedClient] = reorderedClients.splice(dragIndex, 1);
    reorderedClients.splice(dropIndex, 0, draggedClient);

    setClients(reorderedClients);
    saveDataToCloud({ clients: reorderedClients });
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLLIElement>) => {
    draggedClientIdRef.current = null;
    e.currentTarget.classList.remove('opacity-50', 'bg-primary');
  }
  
  const FormComponent = () => { /* ... Form implementation remains the same ... */ 
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
                    <select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 mb-4" value={currentContextId || ''} onChange={(e) => setCurrentContextId(e.target.value)} required>
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

  const AiFormComponent = ({ clientId, onComplete }: { clientId: string; onComplete: () => void }) => { /* ... AI Form implementation remains the same ... */ 
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
                    projectName: { type: Type.STRING }, projectValue: { type: Type.NUMBER }, projectNotes: { type: Type.STRING },
                    todos: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { task: { type: Type.STRING }, income: { type: Type.NUMBER } }, required: ["task", "income"] } }
                },
                required: ["projectName", "projectValue", "projectNotes", "todos"]
            };

            const prompt = `Dato il brief di progetto: "${description}", genera un nome, valore, nota e 3-5 to-do comuni. Rispondi solo in JSON.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash', contents: prompt,
                config: { responseMimeType: "application/json", responseSchema: schema }
            });

            const result = JSON.parse(response.text);
            const newProject = handleAddProject(clientId, result.projectName, result.projectValue, result.projectNotes);
            result.todos?.forEach((todo: { task: string; income: number }) => handleAddTodo(newProject.id, todo.task, todo.income));
            onComplete();
        } catch (err) {
            setError('Generazione fallita. Riprova.');
        } finally {
            setLoading(false);
        }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea placeholder="Descrivi brevemente il progetto (es. 'Sito e-commerce per un negozio di abbigliamento')" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 mb-4" rows={4} required disabled={loading}/>
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        <button type="submit" className="w-full bg-accent text-white py-2 rounded-lg font-semibold hover:bg-opacity-80 transition-opacity flex items-center justify-center disabled:bg-gray-400" disabled={loading}>
            {loading ? 'Generazione...' : <><SparklesIcon className="w-5 h-5 mr-2"/> Genera Progetto</>}
        </button>
      </form>
    );
  };

  // --- OTTIMIZZAZIONE PERFORMANCE: CALCOLI CENTRALIZZATI ---
  
  const availableYears = useMemo(() => {
    const years = new Set(projects.map(p => new Date(p.paidAt || p.createdAt).getFullYear().toString()));
    return Array.from(years).sort((a: string, b: string) => b.localeCompare(a));
  }, [projects]);
  
  const filteredProjects = useMemo(() => {
      return projects.filter(p => {
          const date = new Date(p.paidAt || p.createdAt);
          const yearMatch = filterYear === 'all' || date.getFullYear().toString() === filterYear;
          const monthMatch = filterMonth === 'all' || (date.getMonth() + 1).toString() === filterMonth;
          return yearMatch && monthMatch;
      });
  }, [projects, filterYear, filterMonth]);
  
  const allProjectTotals = useMemo(() => {
    const todoTotals = todos.reduce((acc, todo) => {
        acc.set(todo.projectId, (acc.get(todo.projectId) || 0) + todo.income);
        return acc;
    }, new Map<string, number>());

    return projects.reduce((acc, project) => {
        acc.set(project.id, project.value + (todoTotals.get(project.id) || 0));
        return acc;
    }, new Map<string, number>());
  }, [projects, todos]);

  const dashboardTotals = useMemo(() => {
    return filteredProjects.reduce((acc, p) => {
        if (p.workStatus === WorkStatus.Annullato) return acc;
        const total = allProjectTotals.get(p.id) || 0;
        if (p.paymentStatus === PaymentStatus.Pagato) acc.collected += total;
        else if (p.workStatus === WorkStatus.InLavorazione || p.workStatus === WorkStatus.Consegnato) acc.future += total;
        else acc.potential += total;
        return acc;
    }, { collected: 0, future: 0, potential: 0 });
  }, [filteredProjects, allProjectTotals]);

  const chartData = useMemo(() => {
    const dataByClient = new Map<string, { name: string; incassati: number; futuri: number; potenziali: number }>();
    clients.forEach(c => dataByClient.set(c.id, { name: c.name, incassati: 0, futuri: 0, potenziali: 0 }));

    filteredProjects.forEach(p => {
        if (p.workStatus === WorkStatus.Annullato) return;
        const clientData = dataByClient.get(p.clientId);
        if (!clientData) return;
        
        const total = allProjectTotals.get(p.id) || 0;
        if (p.paymentStatus === PaymentStatus.Pagato) clientData.incassati += total;
        else if (p.workStatus === WorkStatus.InLavorazione || p.workStatus === WorkStatus.Consegnato) clientData.futuri += total;
        else clientData.potenziali += total;
    });

    return Array.from(dataByClient.values()).filter(d => d.incassati > 0 || d.futuri > 0 || d.potenziali > 0);
  }, [clients, filteredProjects, allProjectTotals]);
  
  const inactiveClients = useMemo(() => {
    const projectsByClient = projects.reduce((acc, p) => {
        if (!acc.has(p.clientId)) acc.set(p.clientId, []);
        acc.get(p.clientId)!.push(p);
        return acc;
    }, new Map<string, Project[]>());

    return clients.reduce((acc, client) => {
        const clientProjects = projectsByClient.get(client.id) || [];
        if (clientProjects.length > 0 && clientProjects.every(p => p.paymentStatus === PaymentStatus.Pagato && p.workStatus === WorkStatus.Consegnato)) {
            acc.add(client.id);
        }
        return acc;
    }, new Set<string>());
  }, [clients, projects]);

  const clientPriorities = useMemo(() => {
    const priorityOrder = { [ProjectPriority.Bassa]: 1, [ProjectPriority.Media]: 2, [ProjectPriority.Alta]: 3 };
    const priorities = new Map<string, ProjectPriority>();

    projects.forEach(project => {
      // Un progetto è considerato "attivo" (e contribuisce alla priorità) se non è annullato
      // e non è contemporaneamente consegnato E pagato.
      const isFinished = project.workStatus === WorkStatus.Consegnato && project.paymentStatus === PaymentStatus.Pagato;
      const isActive = project.workStatus !== WorkStatus.Annullato && !isFinished;
      
      if (isActive) {
        const currentPriority = priorities.get(project.clientId);
        if (!currentPriority || priorityOrder[project.priority] > priorityOrder[currentPriority]) {
          priorities.set(project.clientId, project.priority);
        }
      }
    });
    return priorities;
  }, [projects]);
  
  const sortedClients = useMemo(() => {
    const high: Client[] = [];
    const medium: Client[] = [];
    const low: Client[] = [];
    
    clients.forEach(client => {
        const priority = clientPriorities.get(client.id);
        if (priority === ProjectPriority.Alta) {
            high.push(client);
        } else if (priority === ProjectPriority.Media) {
            medium.push(client);
        } else { // Include Bassa e priorità non definite (clienti inattivi)
            low.push(client);
        }
    });

    return [...high, ...medium, ...low];
  }, [clients, clientPriorities]);


  const handleUpdateProjectWorkStatus = (id: string, workStatus: WorkStatus) => setProjects(prev => {
    const newProjects = prev.map(p => p.id === id ? { ...p, workStatus } : p);
    saveDataToCloud({ projects: newProjects });
    return newProjects;
  });

  const handleToggleTodo = (id: string, completed: boolean) => setTodos(prev => {
    const newTodos = prev.map(t => t.id === id ? { ...t, completed } : t);
    saveDataToCloud({ todos: newTodos });
    return newTodos;
  });

  const handleUpdateProjectNotes = (id: string, notes: string) => setProjects(prev => {
    const newProjects = prev.map(p => p.id === id ? { ...p, notes } : p);
    saveDataToCloud({ projects: newProjects });
    return newProjects;
  });
  
  const handleUpdateProjectPriority = (id: string, priority: ProjectPriority) => setProjects(prev => {
    const newProjects = prev.map(p => p.id === id ? { ...p, priority } : p);
    saveDataToCloud({ projects: newProjects });
    return newProjects;
  });

  const handleUpdateProjectPaymentStatus = (id: string, paymentStatus: PaymentStatus) => {
    setProjects(prev => {
      const newProjects = prev.map(p => {
        if (p.id === id) {
          const { paidAt, ...rest } = p;
          const updatedProject: Project = { ...rest, paymentStatus, };
          if (paymentStatus === PaymentStatus.Pagato) {
            updatedProject.paidAt = p.paidAt || new Date().toISOString();
          }
          return updatedProject;
        }
        return p;
      });
      saveDataToCloud({ projects: newProjects });
      return newProjects;
    });
  };

  const selectedClient = useMemo(() => clients.find(c => c.id === selectedView), [clients, selectedView]);
  
  const getPriorityClass = (clientId: string): string => {
    const priority = clientPriorities.get(clientId);
    if (!priority) return 'border-transparent';
    switch (priority) {
      case ProjectPriority.Alta: return 'border-orange-500';
      case ProjectPriority.Media: return 'border-green-500';
      case ProjectPriority.Bassa: return 'border-gray-500';
      default: return 'border-transparent';
    }
  };


  return (
    <div className="flex h-screen font-sans bg-light dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <aside className="w-64 bg-gray-800 text-white flex flex-col p-4 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
                <img src="/logo.svg" alt="Progetta Logo" className="w-8 h-8"/>
                <h1 className="text-2xl font-bold ml-2">Progetta</h1>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-700 transition-colors" aria-label="Cambia tema">
                    {theme === 'light' ? <MoonIcon className="w-5 h-5"/> : <SunIcon className="w-5 h-5"/>}
                </button>
                 <button onClick={onLogout} className="p-2 rounded-full hover:bg-gray-700 transition-colors" aria-label="Esci">
                    <LogOutIcon className="w-5 h-5"/>
                </button>
            </div>
        </div>
        <nav className="flex-grow overflow-y-auto">
            <ul>
                <li className={`flex items-center p-3 rounded-lg cursor-pointer mb-2 transition-colors ${selectedView === 'dashboard' ? 'bg-primary' : 'hover:bg-gray-700'}`} onClick={() => setSelectedView('dashboard')}><ChartBarIcon className="w-5 h-5 mr-3"/> Dashboard</li>
                <li className={`flex items-center p-3 rounded-lg cursor-pointer mb-2 transition-colors ${selectedView === 'calendar' ? 'bg-primary' : 'hover:bg-gray-700'}`} onClick={() => setSelectedView('calendar')}><CalendarIcon className="w-5 h-5 mr-3"/> Calendario</li>
                 <li className={`flex items-center p-3 rounded-lg cursor-pointer mb-2 transition-colors ${selectedView === 'settings' ? 'bg-primary' : 'hover:bg-gray-700'}`} onClick={() => setSelectedView('settings')}><CogIcon className="w-5 h-5 mr-3"/> Impostazioni</li>
            </ul>
            <h2 className="text-sm font-semibold text-gray-400 mt-6 mb-2 px-3 uppercase">Clienti</h2>
            <ul>
                {sortedClients.map((client) => (
                    <li key={client.id} draggable="true" onDragStart={e => handleDragStart(e, client)} onDragOver={handleDragOver} onDragEnter={e => handleDragEnter(e, client)} onDragLeave={handleDragLeave} onDrop={e => handleDrop(e, client)} onDragEnd={handleDragEnd} 
                        className={`group flex items-center justify-between p-3 rounded-lg cursor-grab mb-1 transition-all text-sm border-l-4
                        ${selectedView === client.id ? 'bg-primary' : 'hover:bg-gray-700'} 
                        ${getPriorityClass(client.id)}
                        ${inactiveClients.has(client.id) ? 'opacity-60' : ''}`}>
                        <div className="flex items-center flex-1 min-w-0" onClick={() => setSelectedView(client.id)}>
                            <UsersIcon className="w-4 h-4 mr-3 flex-shrink-0"/> 
                            <span className="truncate">{client.name}</span>
                        </div>
                    </li>
                ))}
            </ul>
        </nav>
        <div className="space-y-2 mt-4 flex-shrink-0">
            <button onClick={() => openModal('client')} className="w-full bg-accent text-white py-2 rounded-lg font-semibold flex items-center justify-center hover:bg-opacity-80 transition-opacity"><PlusIcon className="w-5 h-5 mr-2"/> Nuovo Cliente</button>
        </div>
        <div className="mt-auto pt-4 text-center text-xs text-gray-400 flex-shrink-0">v1.6.0</div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {selectedView === 'dashboard' && <Dashboard 
            collectedIncome={dashboardTotals.collected} 
            futureIncome={dashboardTotals.future}
            potentialIncome={dashboardTotals.potential} 
            chartData={chartData}
            filterYear={filterYear}
            setFilterYear={setFilterYear}
            filterMonth={filterMonth}
            setFilterMonth={setFilterMonth}
            availableYears={availableYears}
        />}
        {selectedView === 'calendar' && <CalendarView todos={todos} projects={projects} clients={clients}/>}
        {selectedView === 'settings' && <SettingsView 
            userId={userId} 
            onImportSuccess={(data) => {
                setClients(data.clients);
                setProjects(data.projects);
                setTodos(data.todos);
            }}
        />}
        {selectedClient && (
            <ClientView 
                client={selectedClient} 
                projects={projects.filter(p => p.clientId === selectedClient.id)} 
                todos={todos}
                onUpdateProjectWorkStatus={handleUpdateProjectWorkStatus}
                onUpdateProjectPaymentStatus={handleUpdateProjectPaymentStatus}
                onUpdateProjectPriority={handleUpdateProjectPriority}
                onToggleTodo={handleToggleTodo}
                onAddProject={clientId => openModal('project', clientId)}
                onAiAddProject={openAiModal}
                onAddTodo={projectId => openModal('todo', projectId)}
                onDeleteProject={handleDeleteProject}
                onDuplicateProject={handleDuplicateProject}
                onDeleteTodo={handleDeleteTodo}
                onUpdateProjectNotes={handleUpdateProjectNotes}
                onDeleteClient={handleDeleteClient}
            />
        )}
      </main>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={ modalContent === 'client' ? 'Aggiungi Cliente' : modalContent === 'project' ? 'Aggiungi Progetto' : 'Aggiungi To-Do' }><FormComponent /></Modal>
      <Modal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} title="Crea Progetto con AI">{aiContextClientId && <AiFormComponent clientId={aiContextClientId} onComplete={() => setIsAiModalOpen(false)} />}</Modal>
    </div>
  );
};

export default function App() {
  const [authState, setAuthState] = useState<{ state: AppState; user: User | null; data: AppData | null }>({ state: 'loading', user: null, data: null });
  const [authView, setAuthView] = useState<'login' | 'setup'>('login');

  useEffect(() => {
    const unsubscribe = firebaseService.onAuthChange(async (user) => {
      if (user) {
        setAuthState(prev => ({ ...prev, state: 'loading' }));
        try {
            const userData = await firebaseService.getData(user.uid);
            setAuthState({ state: 'authenticated', user, data: userData });
        } catch (error) {
            console.error("Errore nel caricamento dei dati:", error);
            await firebaseService.logout();
            setAuthState({ state: 'unauthenticated', user: null, data: null });
        }
      } else {
        setAuthState({ state: 'unauthenticated', user: null, data: null });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await firebaseService.logout();
  };
  
  switch (authState.state) {
    case 'loading':
      return <div className="flex items-center justify-center h-screen bg-light dark:bg-gray-900 text-gray-800 dark:text-gray-200">Caricamento in corso...</div>;
    case 'unauthenticated':
      return authView === 'login' 
        ? <LoginScreen onNavigateToRegister={() => setAuthView('setup')} />
        : <SetupScreen onNavigateToLogin={() => setAuthView('login')} />;
    case 'authenticated':
      if (!authState.data || !authState.user) {
        return <div className="flex items-center justify-center h-screen bg-light dark:bg-gray-900 text-gray-800 dark:text-gray-200">Caricamento dati utente...</div>;
      }
      return <MainApp onLogout={handleLogout} initialData={authState.data} userId={authState.user.uid} />;
    default:
      return <LoginScreen onNavigateToRegister={() => setAuthView('setup')} />;
  }
}