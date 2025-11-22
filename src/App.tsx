import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Client, Project, Todo, WorkStatus, PaymentStatus, ProjectPriority, Payment } from './types';
import { CalendarIcon, ChartBarIcon, PlusIcon, TrashIcon, UsersIcon, LogOutIcon, SparklesIcon, CopyIcon, SunIcon, MoonIcon, CogIcon, DownloadIcon, UploadIcon, MenuIcon, XIcon, EditIcon, ListTodoIcon } from './components/icons';
import Modal from './components/Modal';
import CalendarView from './components/CalendarView';
import TaskView from './components/TaskView';
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
  const navRef = useRef<HTMLElement>(null);
  const [isNavScrollable, setIsNavScrollable] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);


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
  const [modalContent, setModalContent] = useState<'client' | 'project' | 'todo' | 'payment' | 'editProject' | null>(null);
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
  
  useEffect(() => {
    const navElement = navRef.current;
    if (!navElement) return;

    const checkScrollable = () => {
        requestAnimationFrame(() => {
            setIsNavScrollable(navElement.scrollHeight > navElement.clientHeight);
        });
    };

    const resizeObserver = new ResizeObserver(checkScrollable);
    resizeObserver.observe(navElement);
    checkScrollable();
    return () => resizeObserver.disconnect();
  }, [clients]);

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
      payments: [],
    };
    setProjects(prev => {
      const newProjects = [...prev, newProject];
      saveDataToCloud({ projects: newProjects });
      return newProjects;
    });
    return newProject;
  };

  const handleUpdateProject = (projectId: string, data: { name: string; value: number }) => {
    setProjects(prev => {
      const newProjects = prev.map(p =>
        p.id === projectId ? { ...p, name: data.name, value: data.value } : p
      );
      saveDataToCloud({ projects: newProjects });
      return newProjects;
    });
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
  
  const handleAddPayment = (projectId: string, amount: number, date: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    setProjects(prev => {
      const newProjects = prev.map(p => {
        if (p.id === projectId) {
          const newPayment: Payment = { id: crypto.randomUUID(), amount, date };
          const updatedPayments = [...(p.payments || []), newPayment];
          const totalPaid = updatedPayments.reduce((sum, payment) => sum + payment.amount, 0);

          const projectTodos = todos.filter(t => t.projectId === projectId);
          const projectTotal = p.value + projectTodos.reduce((sum, todo) => sum + todo.income, 0);

          let newPaymentStatus = p.paymentStatus;
          if (totalPaid > 0 && totalPaid < projectTotal) {
            newPaymentStatus = PaymentStatus.ParzialmentePagato;
          } else if (totalPaid >= projectTotal) {
            newPaymentStatus = PaymentStatus.Pagato;
          } else if (totalPaid <= 0 && (p.paymentStatus === PaymentStatus.Pagato || p.paymentStatus === PaymentStatus.ParzialmentePagato)) {
             newPaymentStatus = PaymentStatus.Fatturato;
          }
          
          return { ...p, payments: updatedPayments, paymentStatus: newPaymentStatus };
        }
        return p;
      });
      saveDataToCloud({ projects: newProjects });
      return newProjects;
    });
  };
  
  const handleDeletePayment = (projectId: string, paymentId: string) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo pagamento?")) return;
    
    setProjects(prev => {
        const newProjects = prev.map(p => {
            if (p.id === projectId) {
                const updatedPayments = (p.payments || []).filter(payment => payment.id !== paymentId);
                const totalPaid = updatedPayments.reduce((sum, payment) => sum + payment.amount, 0);

                const projectTodos = todos.filter(t => t.projectId === projectId);
                const projectTotal = p.value + projectTodos.reduce((sum, todo) => sum + todo.income, 0);

                let newPaymentStatus = p.paymentStatus;
                if (totalPaid <= 0) {
                   if (p.paymentStatus !== PaymentStatus.DaFatturare) {
                     newPaymentStatus = PaymentStatus.Fatturato;
                   }
                } else if (totalPaid > 0 && totalPaid < projectTotal) {
                    newPaymentStatus = PaymentStatus.ParzialmentePagato;
                } else if (totalPaid >= projectTotal) {
                    newPaymentStatus = PaymentStatus.Pagato;
                }

                return { ...p, payments: updatedPayments, paymentStatus: newPaymentStatus };
            }
            return p;
        });
        saveDataToCloud({ projects: newProjects });
        return newProjects;
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
        payments: [],
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

  const openModal = (type: 'client' | 'project' | 'todo' | 'payment' | 'editProject', contextId: string | null = null) => {
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
        e.currentTarget.classList.add('bg-muted-foreground/10');
    }
  }
  
  const handleDragLeave = (e: React.DragEvent<HTMLLIElement>) => e.currentTarget.classList.remove('bg-muted-foreground/10');
  
  const handleDrop = (e: React.DragEvent<HTMLLIElement>, dropClient: Client) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-muted-foreground/10');
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
  
  const FormComponent = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [projectValue, setProjectValue] = useState(0);
    const [task, setTask] = useState('');
    const [income, setIncome] = useState(0);
    const [dueDate, setDueDate] = useState('');
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        setName(''); setEmail(''); setProjectValue(0); setTask('');
        setIncome(0); setDueDate(''); setPaymentAmount(0);
        setPaymentDate(new Date().toISOString().split('T')[0]);

        if (modalContent === 'editProject' && currentContextId) {
            const projectToEdit = projects.find(p => p.id === currentContextId);
            if (projectToEdit) {
                setName(projectToEdit.name);
                setProjectValue(projectToEdit.value);
            }
        }
    }, [modalContent, currentContextId, projects]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (modalContent === 'client' && name) {
            handleAddClient(name, email || undefined);
        } else if (modalContent === 'project' && name && currentContextId) {
            handleAddProject(currentContextId, name, projectValue);
        } else if (modalContent === 'editProject' && name && currentContextId) {
            handleUpdateProject(currentContextId, { name, value: projectValue });
        } else if (modalContent === 'todo' && task && currentContextId) {
            handleAddTodo(currentContextId, task, income, dueDate || undefined);
        } else if (modalContent === 'payment' && paymentAmount > 0 && currentContextId) {
            handleAddPayment(currentContextId, paymentAmount, paymentDate);
        }
        setIsModalOpen(false);
    };

    const renderFormFields = () => {
        switch (modalContent) {
            case 'client':
                return <>
                    <input type="text" placeholder="Nome Cliente" value={name} onChange={e => setName(e.target.value)} required/>
                    <input type="email" placeholder="Email Cliente (Opzionale)" value={email} onChange={e => setEmail(e.target.value)} />
                </>;
            case 'project':
            case 'editProject':
                return <>
                    {modalContent === 'project' && (
                        <select value={currentContextId || ''} onChange={(e) => setCurrentContextId(e.target.value)} required>
                            <option value="" disabled>Seleziona Cliente</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    )}
                    <input type="text" placeholder="Nome Progetto" value={name} onChange={e => setName(e.target.value)} required/>
                    <input type="number" placeholder="Valore Progetto (€)" value={projectValue} onChange={e => setProjectValue(Number(e.target.value))} required/>
                </>;
            case 'todo':
                 return <>
                    <input type="text" placeholder="Attività" value={task} onChange={e => setTask(e.target.value)} required/>
                    <input type="number" placeholder="Incasso (€) - Opzionale" value={income} onChange={e => setIncome(Number(e.target.value))} />
                    <input type="date" placeholder="Data di scadenza" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </>;
            case 'payment':
                return <>
                    <input type="number" placeholder="Importo Pagamento (€)" value={paymentAmount} onChange={e => setPaymentAmount(Number(e.target.value))} required/>
                    <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required/>
                </>;
            default: return null;
        }
    };
    
    const buttonText = modalContent === 'editProject' ? 'Salva Modifiche' : 'Aggiungi';

    return <form onSubmit={handleSubmit} className="space-y-4">
        {renderFormFields()}
        <div className="flex justify-end pt-4">
          <button type="submit" className="btn btn-primary px-4 py-2">{buttonText}</button>
        </div>
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
        <textarea placeholder="Descrivi brevemente il progetto (es. 'Sito e-commerce per un negozio di abbigliamento')" value={description} onChange={e => setDescription(e.target.value)} rows={4} required disabled={loading}/>
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        <button type="submit" className="w-full bg-accent text-white py-2 rounded-lg font-semibold hover:bg-opacity-80 transition-opacity flex items-center justify-center disabled:bg-gray-400" disabled={loading}>
            {loading ? 'Generazione...' : <><SparklesIcon className="w-5 h-5 mr-2"/> Genera Progetto</>}
        </button>
      </form>
    );
  };

  // --- OTTIMIZZAZIONE PERFORMANCE: CALCOLI CENTRALIZZATI ---
  
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    projects.forEach(p => {
      if (p.createdAt) years.add(new Date(p.createdAt).getFullYear().toString());
      p.payments?.forEach(payment => {
        years.add(new Date(payment.date).getFullYear().toString());
      });
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [projects]);
  
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
    let collected = 0;
    let future = 0;
    let potential = 0;

    projects.forEach(p => {
        p.payments?.forEach(payment => {
            const paymentDate = new Date(payment.date);
            const yearMatch = filterYear === 'all' || paymentDate.getFullYear().toString() === filterYear;
            const monthMatch = filterMonth === 'all' || (paymentDate.getMonth() + 1).toString() === filterMonth;

            if (yearMatch && monthMatch) {
                collected += payment.amount;
            }
        });

        if (p.workStatus === WorkStatus.Annullato) return;

        const projectTotal = allProjectTotals.get(p.id) || 0;
        const totalPaid = p.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
        const remaining = projectTotal - totalPaid;

        if (p.paymentStatus === PaymentStatus.Pagato) {
            // ok
        } else if (p.workStatus === WorkStatus.InLavorazione || p.workStatus === WorkStatus.Consegnato) {
            if (remaining > 0) future += remaining;
        } else {
            potential += projectTotal;
        }
    });

    return { collected, future, potential };
  }, [projects, allProjectTotals, filterYear, filterMonth]);


  const chartData = useMemo(() => {
    const dataByClient = new Map<string, { name: string; incassati: number; futuri: number; potenziali: number }>();
    clients.forEach(c => dataByClient.set(c.id, { name: c.name, incassati: 0, futuri: 0, potenziali: 0 }));

    projects.forEach(p => {
        const clientData = dataByClient.get(p.clientId);
        if (!clientData) return;

        p.payments?.forEach(payment => {
            const paymentDate = new Date(payment.date);
            const yearMatch = filterYear === 'all' || paymentDate.getFullYear().toString() === filterYear;
            const monthMatch = filterMonth === 'all' || (paymentDate.getMonth() + 1).toString() === filterMonth;
            if (yearMatch && monthMatch) {
                clientData.incassati += payment.amount;
            }
        });

        if (p.workStatus === WorkStatus.Annullato) return;
        
        const total = allProjectTotals.get(p.id) || 0;
        const paid = p.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
        const remaining = total - paid;
        
        if (p.paymentStatus === PaymentStatus.Pagato) {
            // ok
        } else if (p.workStatus === WorkStatus.InLavorazione || p.workStatus === WorkStatus.Consegnato) {
            if (remaining > 0) clientData.futuri += remaining;
        } else {
             clientData.potenziali += total;
        }
    });

    return Array.from(dataByClient.values()).filter(d => d.incassati > 0 || d.futuri > 0 || d.potenziali > 0);
  }, [clients, projects, allProjectTotals, filterYear, filterMonth]);
  
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
        } else {
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

  const handleSelectView = (view: string) => {
    setSelectedView(view);
    setIsSidebarOpen(false);
  };

  const modalTitle = () => {
    switch(modalContent) {
      case 'client': return 'Nuovo Cliente';
      case 'project': return 'Nuovo Progetto';
      case 'editProject': return 'Modifica Progetto';
      case 'payment': return 'Aggiungi Pagamento';
      case 'todo': return 'Aggiungi To-Do';
      default: return '';
    }
  };

  const fabAction = () => {
      if(selectedClient){
          openModal('project', selectedClient.id)
      } else {
          openModal('client')
      }
  }

  return (
    <div className="relative min-h-screen md:flex font-sans bg-background text-foreground dark:bg-dark-background dark:text-dark-foreground">
      <header className="md:hidden flex justify-between items-center p-4 bg-card dark:bg-dark-card text-foreground dark:text-dark-foreground shadow-lg fixed top-0 left-0 right-0 z-20 h-16 border-b border-muted dark:border-dark-muted">
        <div className="flex items-center">
            <img src="/logo.svg" alt="Progetta Logo" className="w-8 h-8"/>
            <h1 className="text-xl font-bold ml-2">Progetta</h1>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2" aria-label="Apri menu">
            <MenuIcon className="w-6 h-6"/>
        </button>
      </header>

      {isSidebarOpen && (
          <div 
              className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30" 
              onClick={() => setIsSidebarOpen(false)}
              aria-hidden="true"
          ></div>
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-secondary dark:bg-dark-secondary text-secondary-foreground dark:text-dark-secondary-foreground flex flex-col p-4 shadow-2xl transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
                <img src="/logo.svg" alt="Progetta Logo" className="w-8 h-8"/>
                <h1 className="text-2xl font-bold ml-2">Progetta</h1>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-muted dark:hover:bg-dark-muted transition-colors" aria-label="Cambia tema">
                    {theme === 'light' ? <MoonIcon className="w-5 h-5"/> : <SunIcon className="w-5 h-5"/>}
                </button>
                 <button onClick={onLogout} className="p-2 rounded-full hover:bg-muted dark:hover:bg-dark-muted transition-colors" aria-label="Esci">
                    <LogOutIcon className="w-5 h-5"/>
                </button>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded-full hover:bg-muted dark:hover:bg-dark-muted md:hidden" aria-label="Chiudi menu">
                    <XIcon className="w-5 h-5"/>
                </button>
            </div>
        </div>
        <nav ref={navRef} className={`flex-grow overflow-y-auto no-scrollbar ${isNavScrollable ? 'fade-bottom' : ''}`}>
            <ul>
                <li className={`flex items-center p-3 rounded-lg cursor-pointer mb-2 transition-colors font-medium ${selectedView === 'dashboard' ? 'bg-primary/10 text-primary dark:text-dark-primary' : 'hover:bg-muted dark:hover:bg-dark-muted'}`} onClick={() => handleSelectView('dashboard')}><ChartBarIcon className="w-5 h-5 mr-3"/> Dashboard</li>
                <li className={`flex items-center p-3 rounded-lg cursor-pointer mb-2 transition-colors font-medium ${selectedView === 'tasks' ? 'bg-primary/10 text-primary dark:text-dark-primary' : 'hover:bg-muted dark:hover:bg-dark-muted'}`} onClick={() => handleSelectView('tasks')}><ListTodoIcon className="w-5 h-5 mr-3"/> Attività</li>
                <li className={`flex items-center p-3 rounded-lg cursor-pointer mb-2 transition-colors font-medium ${selectedView === 'calendar' ? 'bg-primary/10 text-primary dark:text-dark-primary' : 'hover:bg-muted dark:hover:bg-dark-muted'}`} onClick={() => handleSelectView('calendar')}><CalendarIcon className="w-5 h-5 mr-3"/> Calendario</li>
                 <li className={`flex items-center p-3 rounded-lg cursor-pointer mb-2 transition-colors font-medium ${selectedView === 'settings' ? 'bg-primary/10 text-primary dark:text-dark-primary' : 'hover:bg-muted dark:hover:bg-dark-muted'}`} onClick={() => handleSelectView('settings')}><CogIcon className="w-5 h-5 mr-3"/> Impostazioni</li>
            </ul>
            <h2 className="text-sm font-semibold text-muted-foreground dark:text-dark-muted-foreground mt-6 mb-2 px-3 uppercase">Clienti</h2>
            <ul>
                {sortedClients.map((client) => (
                    <li key={client.id} draggable="true" onDragStart={e => handleDragStart(e, client)} onDragOver={handleDragOver} onDragEnter={e => handleDragEnter(e, client)} onDragLeave={handleDragLeave} onDrop={e => handleDrop(e, client)} onDragEnd={handleDragEnd} 
                        className={`group flex items-center justify-between p-3 rounded-lg cursor-grab mb-1 transition-all text-sm border-l-4
                        ${selectedView === client.id ? 'bg-primary/10 text-primary dark:text-dark-primary' : 'hover:bg-muted dark:hover:bg-dark-muted'} 
                        ${getPriorityClass(client.id)}
                        ${inactiveClients.has(client.id) ? 'opacity-60' : ''}`}>
                        <div className="flex items-center flex-1 min-w-0" onClick={() => handleSelectView(client.id)}>
                            <UsersIcon className="w-4 h-4 mr-3 flex-shrink-0"/> 
                            <span className="truncate">{client.name}</span>
                        </div>
                    </li>
                ))}
            </ul>
        </nav>
        <div className="mt-auto pt-4 text-center text-xs text-muted-foreground flex-shrink-0">v1.7.0</div>
      </aside>

      <main className="w-full md:flex-1 p-4 sm:p-8 overflow-y-auto mt-16 md:mt-0">
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
        {selectedView === 'tasks' && <TaskView todos={todos} projects={projects} clients={clients} onToggleTodo={handleToggleTodo} onDeleteTodo={handleDeleteTodo} />}
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
                onAddTodo={projectId => openModal('todo', projectId)}
                onAddPayment={projectId => openModal('payment', projectId)}
                onDeletePayment={handleDeletePayment}
                onAiAddProject={openAiModal}
                onDeleteProject={handleDeleteProject}
                onEditProject={projectId => openModal('editProject', projectId)}
                onDeleteTodo={handleDeleteTodo}
                onUpdateProjectNotes={handleUpdateProjectNotes}
                onDeleteClient={handleDeleteClient}
            />
        )}
      </main>
      
      <button 
        onClick={fabAction}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground dark:bg-dark-primary dark:text-dark-primary-foreground shadow-lg hover:bg-primary-hover dark:hover:bg-dark-primary-hover flex items-center justify-center transform hover:scale-105 transition-transform"
        aria-label={selectedClient ? "Aggiungi Progetto" : "Aggiungi Cliente"}
      >
        <PlusIcon className="w-7 h-7" />
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalTitle()}><FormComponent /></Modal>
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
      return <div className="flex items-center justify-center h-screen bg-background text-foreground">Caricamento in corso...</div>;
    case 'unauthenticated':
      return authView === 'login' 
        ? <LoginScreen onNavigateToRegister={() => setAuthView('setup')} />
        : <SetupScreen onNavigateToLogin={() => setAuthView('login')} />;
    case 'authenticated':
      if (!authState.data || !authState.user) {
        return <div className="flex items-center justify-center h-screen bg-background text-foreground">Caricamento dati utente...</div>;
      }
      return <MainApp onLogout={handleLogout} initialData={authState.data} userId={authState.user.uid} />;
    default:
      return <LoginScreen onNavigateToRegister={() => setAuthView('setup')} />;
  }
}