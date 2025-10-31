import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Client, Project, Todo, WorkStatus, PaymentStatus } from './types';
import { CalendarIcon, ChartBarIcon, PlusIcon, TrashIcon, UsersIcon, LogOutIcon, SparklesIcon, CopyIcon, SunIcon, MoonIcon, CogIcon, DownloadIcon, UploadIcon } from './components/icons';
import Modal from './components/Modal';
import CalendarView from './components/CalendarView';
import LoginScreen from './components/LoginScreen';
import SetupScreen from './components/SetupScreen';
import Dashboard from './components/Dashboard';
import ClientView from './components/ClientView';
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
  
  // Effetto per salvare i dati ad ogni modifica
  useEffect(() => {
    if (initialData.clients === clients && initialData.projects === projects && initialData.todos === todos) {
        return;
    }
    const handler = setTimeout(() => {
      firebaseService.saveData(userId, { clients, projects, todos });
    }, 1000); // Debounce saving to avoid too many writes
    
    return () => clearTimeout(handler);
  }, [clients, projects, todos, userId, initialData]);

  // Sincronizza lo stato se i dati iniziali cambiano (es. primo caricamento)
  useEffect(() => {
      setClients(initialData.clients);
      setProjects(initialData.projects);
      setTodos(initialData.todos);
  }, [initialData]);


  const [selectedView, setSelectedView] = useState<string>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<'client' | 'project' | 'todo' | null>(null);
  const [currentContextId, setCurrentContextId] = useState<string | null>(null);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiContextClientId, setAiContextClientId] = useState<string | null>(null);


  const [filterYear, setFilterYear] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'dark');
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
            setIsSettingsMenuOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  }

  const handleExportData = async () => {
    setIsSettingsMenuOpen(false);
    try {
        const currentCloudData = await firebaseService.getData(userId);
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
      setIsSettingsMenuOpen(false);
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
                      setClients(importedData.clients);
                      setProjects(importedData.projects);
                      setTodos(importedData.todos);
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

    setProjects(prev => [...prev, newProject]);
    setTodos(prev => [...prev, ...newTodos]);
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

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
    e.dataTransfer.setData("clientIndex", index.toString());
    e.currentTarget.classList.add('opacity-50', 'bg-primary');
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => e.preventDefault();
  
  const handleDragEnter = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    if (!e.currentTarget.classList.contains('bg-primary')) {
        e.currentTarget.classList.add('bg-gray-700');
    }
  }
  
  const handleDragLeave = (e: React.DragEvent<HTMLLIElement>) => e.currentTarget.classList.remove('bg-gray-700');
  
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
  
  const handleDragEnd = (e: React.DragEvent<HTMLLIElement>) => e.currentTarget.classList.remove('opacity-50', 'bg-primary');
  
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
    // FIX: Add explicit types for sort arguments to prevent type inference issues.
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
  

  const handleUpdateProjectWorkStatus = (id: string, workStatus: WorkStatus) => setProjects(prev => prev.map(p => p.id === id ? { ...p, workStatus } : p));
  const handleToggleTodo = (id: string, completed: boolean) => setTodos(prev => prev.map(t => t.id === id ? { ...t, completed } : t));
  const handleUpdateProjectNotes = (id: string, notes: string) => setProjects(prev => prev.map(p => p.id === id ? { ...p, notes } : p));
  const handleUpdateProjectPaymentStatus = (id: string, paymentStatus: PaymentStatus) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, paymentStatus, paidAt: paymentStatus === PaymentStatus.Pagato ? (p.paidAt || new Date().toISOString()) : undefined } : p));
  };

  const selectedClient = useMemo(() => clients.find(c => c.id === selectedView), [clients, selectedView]);

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
                <div className="relative" ref={settingsMenuRef}>
                    <button onClick={() => setIsSettingsMenuOpen(prev => !prev)} className="p-2 rounded-full hover:bg-gray-700 transition-colors" aria-label="Opzioni e Backup">
                        <CogIcon className="w-5 h-5"/>
                    </button>
                    {isSettingsMenuOpen && (
                        <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-700 rounded-md shadow-lg py-1 z-10 border border-gray-600">
                            <button onClick={handleExportData} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-primary transition-colors flex items-center gap-3">
                                <DownloadIcon className="w-4 h-4" /> 
                                <span>Esporta Backup</span>
                            </button>
                            <button onClick={handleImportData} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-primary transition-colors flex items-center gap-3">
                                <UploadIcon className="w-4 h-4" /> 
                                <span>Importa Backup</span>
                            </button>
                        </div>
                    )}
                </div>
                 <button onClick={onLogout} className="p-2 rounded-full hover:bg-gray-700 transition-colors" aria-label="Esci">
                    <LogOutIcon className="w-5 h-5"/>
                </button>
            </div>
        </div>
        <nav className="flex-grow overflow-y-auto">
            <ul>
                <li className={`flex items-center p-3 rounded-lg cursor-pointer mb-2 transition-colors ${selectedView === 'dashboard' ? 'bg-primary' : 'hover:bg-gray-700'}`} onClick={() => setSelectedView('dashboard')}><ChartBarIcon className="w-5 h-5 mr-3"/> Dashboard</li>
                <li className={`flex items-center p-3 rounded-lg cursor-pointer mb-2 transition-colors ${selectedView === 'calendar' ? 'bg-primary' : 'hover:bg-gray-700'}`} onClick={() => setSelectedView('calendar')}><CalendarIcon className="w-5 h-5 mr-3"/> Calendario</li>
            </ul>
            <h2 className="text-sm font-semibold text-gray-400 mt-6 mb-2 px-3 uppercase">Clienti</h2>
            <ul>
                {clients.map((client, index) => (
                    <li key={client.id} draggable="true" onDragStart={e => handleDragStart(e, index)} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDrop={e => handleDrop(e, index)} onDragEnd={handleDragEnd} className={`group flex items-center justify-between p-3 rounded-lg cursor-grab mb-1 transition-all text-sm ${selectedView === client.id ? 'bg-primary' : 'hover:bg-gray-700'} ${inactiveClients.has(client.id) ? 'opacity-60' : ''}`}>
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
        <div className="mt-auto pt-4 text-center text-xs text-gray-400 flex-shrink-0">v1.4.0</div>
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
        {selectedClient && (
            <ClientView 
                client={selectedClient} 
                projects={projects.filter(p => p.clientId === selectedClient.id)} 
                todos={todos}
                onUpdateProjectWorkStatus={handleUpdateProjectWorkStatus}
                onUpdateProjectPaymentStatus={handleUpdateProjectPaymentStatus}
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
        return <div className="flex items-center justify-center h-screen">Errore: Dati utente non disponibili.</div>;
      }
      return <MainApp onLogout={handleLogout} initialData={authState.data} userId={authState.user.uid} />;
    default:
      return <LoginScreen onNavigateToRegister={() => setAuthView('setup')} />;
  }
}