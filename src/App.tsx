import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Client, Project, Todo, WorkStatus, PaymentStatus } from './types';
import { CalendarIcon, ChartBarIcon, PlusIcon, TrashIcon, UsersIcon, LogOutIcon, SparklesIcon, DownloadIcon, UploadIcon, CopyIcon } from './components/icons';
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

// --- Main Application Component (Protected) ---
const MainApp: React.FC<{ onLogout: () => void; initialData: AppData; userId: string }> = ({ onLogout, initialData, userId }) => {
  const [clients, setClients] = useState<Client[]>(initialData.clients);
  const [projects, setProjects] = useState<Project[]>(initialData.projects);
  const [todos, setTodos] = useState<Todo[]>(initialData.todos);
  
  // Effetto per salvare i dati ad ogni modifica
  useEffect(() => {
    // Non salvare se i dati iniziali non sono ancora stati processati
    if (initialData.clients === clients && initialData.projects === projects && initialData.todos === todos) {
        return;
    }
    firebaseService.saveData(userId, { clients, projects, todos });
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

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        paidAt: undefined, // Resetta la data di pagamento
    };

    const originalTodos = todos.filter(t => t.projectId === projectId);
    const newTodos: Todo[] = originalTodos.map(todo => ({
        ...todo,
        id: crypto.randomUUID(),
        projectId: newProject.id,
        completed: false, // Resetta lo stato del to-do
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

  const handleExportData = () => {
    try {
        const dataToExport = { clients, projects, todos };
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
          JSON.stringify(dataToExport, null, 2)
        )}`;
        const link = document.createElement("a");
        link.href = jsonString;
        const date = new Date().toISOString().slice(0, 10);
        link.download = `progetta_backup_${date}.json`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error("Errore durante l'esportazione:", error);
        alert("Si è verificato un errore durante l'esportazione dei dati.");
    }
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const text = e.target?.result;
              if (typeof text !== 'string') throw new Error("Il file non può essere letto.");
              
              const importedData = JSON.parse(text);

              // Basic validation
              if (!importedData.clients || !importedData.projects || !importedData.todos || !Array.isArray(importedData.clients) || !Array.isArray(importedData.projects) || !Array.isArray(importedData.todos)) {
                  throw new Error("Il file JSON non ha la struttura corretta (deve contenere 'clients', 'projects', 'todos').");
              }

              if (window.confirm("Sei sicuro di voler importare questi dati? L'operazione sovrascriverà tutti i dati attuali. Si consiglia di esportare un backup prima di procedere.")) {
                  setClients(importedData.clients);
                  setProjects(importedData.projects);
                  setTodos(importedData.todos);
                  firebaseService.saveData(userId, importedData); // Salva i dati importati su Firebase
                  alert("Dati importati con successo e salvati sul cloud!");
                  setSelectedView('dashboard');
              }
          } catch (error) {
              console.error("Errore durante l'importazione:", error);
              alert(`Errore durante l'importazione del file: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
          } finally {
              if (event.target) {
                  event.target.value = '';
              }
          }
      };
      reader.onerror = () => {
          alert("Errore durante la lettura del file.");
           if (event.target) {
              event.target.value = '';
          }
      }
      reader.readAsText(file);
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
    const years = new Set(projects.map(p => {
        const dateToUse = p.paymentStatus === PaymentStatus.Pagato && p.paidAt ? p.paidAt : p.createdAt;
        return new Date(dateToUse).getFullYear().toString();
    }));
    return Array.from(years).sort((a: string, b: string) => b.localeCompare(a));
  }, [projects]);
  
  const filteredProjects = useMemo(() => {
      return projects.filter(project => {
          const dateToUse = project.paymentStatus === PaymentStatus.Pagato && project.paidAt ? project.paidAt : project.createdAt;
          const projectDate = new Date(dateToUse);
          const yearMatch = filterYear === 'all' || projectDate.getFullYear().toString() === filterYear;
          const monthMatch = filterMonth === 'all' || (projectDate.getMonth() + 1).toString() === filterMonth;
          return yearMatch && monthMatch;
      });
  }, [projects, filterYear, filterMonth]);

 const { collectedIncome, futureIncome, potentialIncome } = useMemo(() => {
    // Ottimizzazione: Pre-calcola i totali dei to-do per ogni progetto
    const todoTotals = new Map<string, number>();
    todos.forEach(todo => {
        todoTotals.set(todo.projectId, (todoTotals.get(todo.projectId) || 0) + todo.income);
    });

    let collected = 0;
    let future = 0;
    let potential = 0;

    filteredProjects.forEach(p => {
      if (p.workStatus === WorkStatus.Annullato) return;

      const tasksTotal = todoTotals.get(p.id) || 0;
      const projectTotal = p.value + tasksTotal;
      
      if (p.paymentStatus === PaymentStatus.Pagato) {
        collected += projectTotal;
      } else if (p.workStatus === WorkStatus.InLavorazione || p.workStatus === WorkStatus.Consegnato) {
        future += projectTotal;
      } else if (p.workStatus === WorkStatus.PreventivoDaInviare || p.workStatus === WorkStatus.PreventivoInviato) {
        potential += projectTotal;
      }
    });

    return { collectedIncome: collected, futureIncome: future, potentialIncome: potential };
  }, [filteredProjects, todos]);

  const handleUpdateProjectWorkStatus = (id: string, workStatus: WorkStatus) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, workStatus } : p));
  };
  
  const handleUpdateProjectPaymentStatus = (id: string, paymentStatus: PaymentStatus) => {
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        const isNowPaid = paymentStatus === PaymentStatus.Pagato;
        const wasAlreadyPaid = p.paymentStatus === PaymentStatus.Pagato;
        return { 
          ...p, 
          paymentStatus,
          paidAt: isNowPaid && !wasAlreadyPaid ? new Date().toISOString() : (isNowPaid ? p.paidAt : undefined)
        };
      }
      return p;
    }));
  };
  
  const handleToggleTodo = (id: string, completed: boolean) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed } : t));
  };
  
  const handleUpdateProjectNotes = (id: string, notes: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, notes } : p));
  };

  const selectedClient = useMemo(() => clients.find(c => c.id === selectedView), [clients, selectedView]);

  const inactiveClients = useMemo(() => {
    const projectsByClient = new Map<string, Project[]>();
    projects.forEach(p => {
        if (!projectsByClient.has(p.clientId)) {
            projectsByClient.set(p.clientId, []);
        }
        projectsByClient.get(p.clientId)!.push(p);
    });

    const inactiveSet = new Set<string>();
    clients.forEach(client => {
        const clientProjects = projectsByClient.get(client.id) || [];
        if (clientProjects.length > 0 && clientProjects.every(p => p.paymentStatus === PaymentStatus.Pagato)) {
            inactiveSet.add(client.id);
        }
    });
    return inactiveSet;
  }, [clients, projects]);

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
                    const isInactive = inactiveClients.has(client.id);

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
            
            <hr className="!my-4 border-gray-700" />
            
            <input type="file" ref={fileInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".json" />
            <button onClick={handleImportClick} className="w-full bg-gray-600 text-white py-2 rounded-lg font-semibold flex items-center justify-center hover:bg-gray-500 transition-colors text-sm">
                <UploadIcon className="w-4 h-4 mr-2"/> Importa Dati
            </button>
            <button onClick={handleExportData} className="w-full bg-gray-600 text-white py-2 rounded-lg font-semibold flex items-center justify-center hover:bg-gray-500 transition-colors text-sm">
                <DownloadIcon className="w-4 h-4 mr-2"/> Esporta Dati
            </button>
            
            <hr className="!my-4 border-gray-700" />
            
             <button onClick={onLogout} className="w-full bg-gray-600 text-white py-2 rounded-lg font-semibold flex items-center justify-center hover:bg-red-500 transition-colors">
                <LogOutIcon className="w-5 h-5 mr-2"/> Esci
            </button>
        </div>
        <div className="mt-auto pt-4 text-center text-xs text-gray-400">
          v1.2.0-cloud
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
                onDuplicateProject={handleDuplicateProject}
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
  const [authState, setAuthState] = useState<{ state: AppState; user: User | null; data: AppData | null }>({
    state: 'loading',
    user: null,
    data: null,
  });
  
  const [authView, setAuthView] = useState<'login' | 'setup'>('login');

  useEffect(() => {
    const unsubscribe = firebaseService.onAuthChange(async (user) => {
      if (user) {
        setAuthState(prev => ({ ...prev, state: 'loading' })); // Mostra caricamento mentre si prendono i dati
        try {
            const userData = await firebaseService.getData(user.uid);
            setAuthState({ state: 'authenticated', user, data: userData });
        } catch (error) {
            console.error("Errore nel caricamento dei dati:", error);
            // Se c'è un errore (es. permessi), non bloccare l'utente
            await firebaseService.logout();
            setAuthState({ state: 'unauthenticated', user: null, data: null });
        }
      } else {
        setAuthState({ state: 'unauthenticated', user: null, data: null });
      }
    });

    // Pulisci il listener quando il componente viene smontato
    return () => unsubscribe();
  }, []);


  const handleLogout = async () => {
    await firebaseService.logout();
    // Lo stato si aggiornerà automaticamente grazie a onAuthStateChanged
  };
  
  switch (authState.state) {
    case 'loading':
      return <div className="flex items-center justify-center h-screen bg-light dark:bg-gray-900 text-gray-800 dark:text-gray-200">Caricamento in corso...</div>;
    case 'unauthenticated':
        if (authView === 'login') {
            return <LoginScreen onNavigateToRegister={() => setAuthView('setup')} />;
        }
        return <SetupScreen onNavigateToLogin={() => setAuthView('login')} />;
    case 'authenticated':
      if (!authState.data || !authState.user) {
        return <div className="flex items-center justify-center h-screen">Errore: Dati utente non disponibili. Ricaricamento in corso...</div>;
      }
      return <MainApp onLogout={handleLogout} initialData={authState.data} userId={authState.user.uid} />;
    default:
      return <LoginScreen onNavigateToRegister={() => setAuthView('setup')} />;
  }
}