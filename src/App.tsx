
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { deleteField } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Client, Project, Todo, WorkStatus, PaymentStatus, ProjectPriority, Payment, AppData, Quote, QuoteStatus, BusinessProfile, TextDocument, DocumentKind, Shotlist } from './types';
import { CalendarIcon, ChartBarIcon, PlusIcon, UsersIcon, LogOutIcon, SunIcon, MoonIcon, CogIcon, MenuIcon, XIcon, ListTodoIcon, BriefcaseIcon, FileTextIcon } from './components/icons';
import Modal from './components/Modal';
import Wordmark from './components/Wordmark';
import PageHeader from './components/PageHeader';
import CalendarView from './components/CalendarView';
import TaskView from './components/TaskView';
import LoginScreen from './components/LoginScreen';
import SetupScreen from './components/SetupScreen';
import Dashboard from './components/Dashboard';
import ClientView from './components/ClientView';
import SettingsView from './components/SettingsView';
import ProjectsView from './components/ProjectsView';
import ProjectDetail from './components/ProjectDetail';
import QuotesTab from './components/QuotesTab';
import DocumentEditor from './components/DocumentEditor';
import DocumentsList from './components/DocumentsList';
import StoryboardList from './components/StoryboardList';
import StoryboardView from './components/StoryboardView';
import { quoteTotals } from './utils/quotes';
import { formatCurrency } from './utils/formatting';
import EntityForm, { FormType } from './components/EntityForm';
import AiProjectForm, { AiProjectResult } from './components/AiProjectForm';
import * as firebaseService from './services/firebaseService';
import { BatchOp } from './services/firebaseService';


type AppState = 'loading' | 'authenticated' | 'unauthenticated' | 'error';
type Theme = 'light' | 'dark';

const FullScreenMessage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col items-center justify-center h-screen gap-4 p-6 text-center bg-background text-foreground dark:bg-dark-background dark:text-dark-foreground">{children}</div>
);

// Calcola lo stato di pagamento a partire dai pagamenti registrati
const computePaymentStatus = (project: Project, payments: Payment[], projectTotal: number): PaymentStatus => {
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  if (totalPaid > 0 && totalPaid < projectTotal) return PaymentStatus.ParzialmentePagato;
  if (totalPaid > 0 && totalPaid >= projectTotal) return PaymentStatus.Pagato;
  if (project.paymentStatus === PaymentStatus.Pagato || project.paymentStatus === PaymentStatus.ParzialmentePagato) {
    return PaymentStatus.Fatturato;
  }
  return project.paymentStatus;
};

// --- Main Application Component (Protected) ---
const MainApp: React.FC<{ onLogout: () => void; userId: string }> = ({ onLogout, userId }) => {
  // L'unica fonte di verità è Firestore: lo stato si aggiorna dagli snapshot in tempo reale
  // (che includono subito anche le scritture locali, pure offline).
  const [data, setData] = useState<AppData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    return firebaseService.subscribeUserData(userId, setData, (error) => {
      console.error("Errore nella lettura dei dati:", error);
      setLoadError(error.message);
    });
  }, [userId]);

  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  useEffect(() => firebaseService.subscribeProfile(userId, setProfile, (error) => console.error("Errore profilo:", error)), [userId]);

  const clients = data?.clients ?? [];
  const projects = data?.projects ?? [];
  const todos = data?.todos ?? [];
  const quotes = data?.quotes ?? [];
  const documents = data?.documents ?? [];
  const shotlists = data?.shotlists ?? [];
  const shots = data?.shots ?? [];

  const draggedClientIdRef = useRef<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const [isNavScrollable, setIsNavScrollable] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Ogni scrittura passa da qui: gli errori vengono mostrati invece di essere ignorati.
  const persist = (operation: Promise<unknown>) => operation.catch((error: Error) => {
    console.error("Errore di salvataggio:", error);
    setSaveError(`Salvataggio non riuscito: ${error.message}`);
  });

  const [selectedView, setSelectedView] = useState<string>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<FormType | null>(null);
  const [modalKey, setModalKey] = useState(0);
  const [currentContextId, setCurrentContextId] = useState<string | null>(null);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiContextClientId, setAiContextClientId] = useState<string | null>(null);


  const [filterYear, setFilterYear] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');

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
  }, [clients, data === null]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  }

  const projectTotalOf = (project: Project) =>
    project.value + todos.filter(t => t.projectId === project.id).reduce((sum, todo) => sum + todo.income, 0);

  // Quando cambia il valore di un progetto con pagamenti già registrati, lo stato di pagamento va ricalcolato
  const paymentStatusForValue = (project: Project, newValue: number): PaymentStatus => {
    const payments = project.payments || [];
    if (payments.length === 0) return project.paymentStatus;
    return computePaymentStatus(project, payments, projectTotalOf(project) - project.value + newValue);
  };

  const nextTodoOrder = () => Math.max(0, ...todos.map(t => t.order ?? 0)) + 1;

  const handleAddClient = (name: string, email?: string) => {
    const newClient: Client = {
      id: crypto.randomUUID(),
      name,
      ...(email && { email }),
      order: Math.max(0, ...clients.map(c => c.order ?? 0)) + 1,
    };
    persist(firebaseService.saveEntity(userId, 'clients', newClient));
  };

  const buildProject = (clientId: string, name: string, value: number, notes?: string): Project => ({
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
  });

  const handleAddProject = (clientId: string, name: string, value: number) => {
    persist(firebaseService.saveEntity(userId, 'projects', buildProject(clientId, name, value)));
  };

  const handleUpdateProject = (projectId: string, data: { name: string; value: number }) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    persist(firebaseService.updateEntity(userId, 'projects', projectId, {
      name: data.name,
      value: data.value,
      paymentStatus: paymentStatusForValue(project, data.value),
    }));
  };

  const handleAddTodo = (projectId: string, task: string, income: number, dueDate?: string) => {
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      projectId,
      task,
      income,
      completed: false,
      ...(dueDate && { dueDate }),
      order: nextTodoOrder(),
    };
    persist(firebaseService.saveEntity(userId, 'todos', newTodo));
  };

  // Progetto + attività generati dall'AI: un'unica scrittura atomica
  const handleAiGenerated = (clientId: string) => async (result: AiProjectResult) => {
    const project = buildProject(clientId, result.projectName, result.projectValue, result.projectNotes);
    const baseOrder = nextTodoOrder();
    const ops: BatchOp[] = [
      { type: 'set', name: 'projects', entity: project },
      ...(result.todos || []).map((todo, i): BatchOp => ({
        type: 'set', name: 'todos',
        entity: { id: crypto.randomUUID(), projectId: project.id, task: todo.task, income: todo.income, completed: false, order: baseOrder + i } as Todo,
      })),
    ];
    await firebaseService.commitOps(userId, ops);
  };

  const handleReorderTodos = (updatedTodos: Todo[]) => {
    persist(firebaseService.commitOps(userId, updatedTodos.map((t): BatchOp => ({
      type: 'update', name: 'todos', id: t.id, data: { order: t.order },
    }))));
  };
  
  const handleAddPayment = (projectId: string, amount: number, date: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const newPayment: Payment = { id: crypto.randomUUID(), amount, date };
    const payments = [...(project.payments || []), newPayment];
    persist(firebaseService.updateEntity(userId, 'projects', projectId, {
      payments,
      paymentStatus: computePaymentStatus(project, payments, projectTotalOf(project)),
    }));
  };
  
  const handleDeletePayment = (projectId: string, paymentId: string) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo pagamento?")) return;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const payments = (project.payments || []).filter(payment => payment.id !== paymentId);
    persist(firebaseService.updateEntity(userId, 'projects', projectId, {
      payments,
      paymentStatus: computePaymentStatus(project, payments, projectTotalOf(project)),
    }));
  };

  const handleDeleteClient = (clientId: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo cliente? Verranno eliminati anche tutti i suoi progetti con attività e preventivi. I documenti restano, senza progetto.')) {
        const projectIdsToDelete = new Set(projects.filter(p => p.clientId === clientId).map(p => p.id));
        const ops: BatchOp[] = [
          ...todos.filter(t => projectIdsToDelete.has(t.projectId)).map((t): BatchOp => ({ type: 'delete', name: 'todos', id: t.id })),
          ...quotes.filter(q => projectIdsToDelete.has(q.projectId)).map((q): BatchOp => ({ type: 'delete', name: 'quotes', id: q.id })),
          ...documents.filter(d => d.projectId && projectIdsToDelete.has(d.projectId)).map((d): BatchOp => ({ type: 'update', name: 'documents', id: d.id, data: { projectId: null } })),
          ...storyboardDeleteOps(shotlists.filter(sl => projectIdsToDelete.has(sl.projectId))),
          ...[...projectIdsToDelete].map((id): BatchOp => ({ type: 'delete', name: 'projects', id })),
          { type: 'delete', name: 'clients', id: clientId },
        ];
        persist(firebaseService.commitOps(userId, ops));

        if (selectedView === clientId) {
            setSelectedView('dashboard');
        }
    }
  };

  const handleDeleteProject = (projectId: string) => {
      if (window.confirm('Sei sicuro di voler eliminare questo progetto? Verranno eliminate anche tutte le sue attività e i suoi preventivi. I documenti restano, senza progetto.')) {
          const ops: BatchOp[] = [
            ...todos.filter(t => t.projectId === projectId).map((t): BatchOp => ({ type: 'delete', name: 'todos', id: t.id })),
            ...quotes.filter(q => q.projectId === projectId).map((q): BatchOp => ({ type: 'delete', name: 'quotes', id: q.id })),
            ...documents.filter(d => d.projectId === projectId).map((d): BatchOp => ({ type: 'update', name: 'documents', id: d.id, data: { projectId: null } })),
            ...storyboardDeleteOps(shotlists.filter(sl => sl.projectId === projectId)),
            { type: 'delete', name: 'projects', id: projectId },
          ];
          persist(firebaseService.commitOps(userId, ops));
          if (selectedView === `project:${projectId}`) {
            const project = projects.find(p => p.id === projectId);
            setSelectedView(project ? project.clientId : 'projects');
          }
      }
  };

  // --- Storyboard ---

  // Inquadrature e storyboard da eliminare; le immagini (collezione a parte) si eliminano dopo
  const storyboardDeleteOps = (lists: Shotlist[]): BatchOp[] => {
    const ids = new Set(lists.map(l => l.id));
    lists.forEach(l => firebaseService.listShotImageIds(userId, l.id)
      .then(imageIds => imageIds.length && firebaseService.commitOps(userId, imageIds.slice(0, 450).map((id): BatchOp => ({ type: 'delete', name: 'shotImages', id }))))
      .catch(e => console.error('Pulizia immagini storyboard:', e)));
    return [
      ...shots.filter(s => ids.has(s.shotlistId)).map((s): BatchOp => ({ type: 'delete', name: 'shots', id: s.id })),
      ...lists.map((l): BatchOp => ({ type: 'delete', name: 'shotlists', id: l.id })),
    ];
  };

  const handleCreateStoryboard = (projectId: string) => {
    const now = new Date().toISOString();
    const existing = shotlists.filter(sl => sl.projectId === projectId).length;
    const shotlist: Shotlist = { id: crypto.randomUUID(), projectId, title: existing ? `Storyboard ${existing + 1}` : 'Storyboard', aspect: '16:9', createdAt: now, updatedAt: now };
    persist(firebaseService.saveEntity(userId, 'shotlists', shotlist));
    handleSelectView(`board:${shotlist.id}`);
  };

  // --- Documenti ---

  const handleCreateDocument = (projectId: string | null) => {
    const now = new Date().toISOString();
    const document: TextDocument = {
      id: crypto.randomUUID(), projectId, title: 'Nuovo documento', kind: DocumentKind.Soggetto,
      content: '', createdAt: now, updatedAt: now, updatedBy: 'app', revision: 1,
    };
    persist(firebaseService.saveEntity(userId, 'documents', document));
    handleSelectView(`doc:${document.id}`);
  };

  const handleDeleteDocument = (document: TextDocument) => {
    if (!window.confirm(`Eliminare definitivamente "${document.title}" e tutte le sue versioni precedenti?`)) return;
    handleSelectView(document.projectId ? `project:${document.projectId}` : 'documents');
    persist(firebaseService.listRevisions(userId, document.id).then(revs => firebaseService.commitOps(userId, [
      ...revs.slice(0, 450).map((r): BatchOp => ({ type: 'delete', name: 'revisions', id: r.id })),
      { type: 'delete', name: 'documents', id: document.id },
    ])));
  };

  // --- Preventivi ---

  const handleSaveQuote = (quote: Quote) => persist(firebaseService.saveEntity(userId, 'quotes', quote));

  const handleDeleteQuote = (quote: Quote) => {
    if (window.confirm(`Eliminare il preventivo ${quote.number}?`)) {
      persist(firebaseService.commitOps(userId, [{ type: 'delete', name: 'quotes', id: quote.id }]));
    }
  };

  // Il cambio di stato del preventivo aggiorna anche il progetto quando ha senso
  const handleChangeQuoteStatus = (quote: Quote, status: QuoteStatus) => {
    const project = projects.find(p => p.id === quote.projectId);
    const ops: BatchOp[] = [{ type: 'update', name: 'quotes', id: quote.id, data: { status } }];
    const projectUpdate: Partial<Project> = {};

    if (project && status === QuoteStatus.Inviato && project.workStatus === WorkStatus.PreventivoDaInviare) {
      projectUpdate.workStatus = WorkStatus.PreventivoInviato;
    }
    if (project && status === QuoteStatus.Accettato) {
      const { subtotal } = quoteTotals(quote);
      const inQuotePhase = project.workStatus === WorkStatus.PreventivoDaInviare || project.workStatus === WorkStatus.PreventivoInviato;
      const changes = [
        project.value !== subtotal ? `valore del progetto da ${formatCurrency(project.value)} a ${formatCurrency(subtotal)}` : null,
        inQuotePhase ? 'stato di lavorazione a "In lavorazione"' : null,
      ].filter(Boolean);
      if (changes.length && window.confirm(`Preventivo accettato. Aggiornare anche ${changes.join(' e ')}?`)) {
        projectUpdate.value = subtotal;
        projectUpdate.paymentStatus = paymentStatusForValue(project, subtotal);
        if (inQuotePhase) projectUpdate.workStatus = WorkStatus.InLavorazione;
      }
    }
    if (project && Object.keys(projectUpdate).length) {
      ops.push({ type: 'update', name: 'projects', id: project.id, data: projectUpdate });
    }
    persist(firebaseService.commitOps(userId, ops));
  };

  const handleDeleteTodo = (todoId: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questa attività?')) {
      persist(firebaseService.commitOps(userId, [{ type: 'delete', name: 'todos', id: todoId }]));
    }
  };

  const openModal = (type: FormType, contextId: string | null = null) => {
    setModalContent(type);
    setCurrentContextId(contextId);
    setModalKey(k => k + 1); // form nuovo a ogni apertura
    setIsModalOpen(true);
  };
  
  const openAiModal = (clientId: string) => {
    setAiContextClientId(clientId);
    setModalKey(k => k + 1);
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

    const ops = reorderedClients
      .map((c, index): BatchOp | null => c.order === index ? null : { type: 'update', name: 'clients', id: c.id, data: { order: index } })
      .filter((op): op is BatchOp => op !== null);
    persist(firebaseService.commitOps(userId, ops));
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLLIElement>) => {
    draggedClientIdRef.current = null;
    e.currentTarget.classList.remove('opacity-50', 'bg-primary');
  }

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


  const handleUpdateProjectWorkStatus = (id: string, workStatus: WorkStatus) =>
    persist(firebaseService.updateEntity(userId, 'projects', id, { workStatus }));

  const handleToggleTodo = (id: string, completed: boolean) =>
    persist(firebaseService.updateEntity(userId, 'todos', id, { completed }));

  const handleUpdateProjectNotes = (id: string, notes: string) =>
    persist(firebaseService.updateEntity(userId, 'projects', id, { notes }));

  const handleUpdateProjectPriority = (id: string, priority: ProjectPriority) =>
    persist(firebaseService.updateEntity(userId, 'projects', id, { priority }));

  const handleUpdateProjectPaymentStatus = (id: string, paymentStatus: PaymentStatus) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    persist(firebaseService.updateEntity(userId, 'projects', id, {
      paymentStatus,
      paidAt: paymentStatus === PaymentStatus.Pagato ? (project.paidAt || new Date().toISOString()) : deleteField(),
    }));
  };

  const selectedClient = useMemo(() => clients.find(c => c.id === selectedView), [clients, selectedView]);
  const selectedProject = useMemo(
    () => selectedView.startsWith('project:') ? projects.find(p => p.id === selectedView.slice('project:'.length)) : undefined,
    [projects, selectedView]);
  const openProject = (projectId: string) => handleSelectView(`project:${projectId}`);
  const selectedDocument = useMemo(
    () => selectedView.startsWith('doc:') ? documents.find(d => d.id === selectedView.slice('doc:'.length)) : undefined,
    [documents, selectedView]);
  const openDocument = (id: string) => handleSelectView(`doc:${id}`);
  const selectedShotlist = useMemo(
    () => selectedView.startsWith('board:') ? shotlists.find(l => l.id === selectedView.slice('board:'.length)) : undefined,
    [shotlists, selectedView]);
  
  // Pallino accanto al cliente: arancio = priorità alta, bianco = media, grigio = bassa o nessun progetto attivo
  const priorityDotClass = (clientId: string): string => {
    switch (clientPriorities.get(clientId)) {
      case ProjectPriority.Alta: return 'bg-signal';
      case ProjectPriority.Media: return 'bg-white';
      default: return 'bg-neutral-600';
    }
  };

  const navItems: { view: string; label: string; isActive: (v: string) => boolean }[] = [
    { view: 'dashboard', label: 'Dashboard', isActive: v => v === 'dashboard' },
    { view: 'projects', label: 'Progetti', isActive: v => v === 'projects' || v.startsWith('project:') || v.startsWith('board:') },
    { view: 'documents', label: 'Documenti', isActive: v => v === 'documents' || v.startsWith('doc:') },
    { view: 'tasks', label: 'Attività', isActive: v => v === 'tasks' },
    { view: 'calendar', label: 'Calendario', isActive: v => v === 'calendar' },
    { view: 'settings', label: 'Impostazioni', isActive: v => v === 'settings' },
  ];

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

  const fab = selectedProject
    ? { label: 'Aggiungi Attività', action: () => openModal('todo', selectedProject.id) }
    : selectedClient
      ? { label: 'Aggiungi Progetto', action: () => openModal('project', selectedClient.id) }
      : selectedView === 'projects'
        ? { label: 'Aggiungi Progetto', action: () => openModal('project') }
        : selectedView === 'documents'
          ? { label: 'Nuovo Documento', action: () => handleCreateDocument(null) }
          : { label: 'Aggiungi Cliente', action: () => openModal('client') };

  if (loadError) {
    return <FullScreenMessage>
      <p className="font-semibold">Impossibile leggere i dati.</p>
      <p className="text-sm text-muted-foreground max-w-md">{loadError}</p>
      <button onClick={onLogout} className="btn btn-primary px-4 py-2">Esci</button>
    </FullScreenMessage>;
  }

  if (!data) {
    return <FullScreenMessage>Caricamento dati...</FullScreenMessage>;
  }

  return (
    <div className="relative min-h-screen md:flex font-sans bg-background text-foreground">
      <header className="md:hidden flex justify-between items-center px-4 bg-black text-white fixed top-0 left-0 right-0 z-20 h-14">
        <Wordmark />
        <button onClick={() => setIsSidebarOpen(true)} className="p-2" aria-label="Apri menu">
            <MenuIcon className="w-6 h-6"/>
        </button>
      </header>

      {isSidebarOpen && (
          <div
              className="md:hidden fixed inset-0 bg-black/60 z-30"
              onClick={() => setIsSidebarOpen(false)}
              aria-hidden="true"
          ></div>
      )}

      {/* Barra laterale: sempre nera, in entrambi i temi */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-black text-white flex flex-col px-6 py-7 transform transition-transform duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between mb-10">
            <Wordmark />
            <div className="flex items-center -mr-2">
                <button onClick={toggleTheme} className="p-2 text-neutral-400 hover:text-white" aria-label={theme === 'light' ? 'Passa al tema scuro' : 'Passa al tema chiaro'}>
                    {theme === 'light' ? <MoonIcon className="w-[18px] h-[18px]"/> : <SunIcon className="w-[18px] h-[18px]"/>}
                </button>
                <button onClick={onLogout} className="p-2 text-neutral-400 hover:text-white" aria-label="Esci">
                    <LogOutIcon className="w-[18px] h-[18px]"/>
                </button>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-neutral-400 hover:text-white md:hidden" aria-label="Chiudi menu">
                    <XIcon className="w-5 h-5"/>
                </button>
            </div>
        </div>
        <nav ref={navRef} aria-label="Navigazione principale" className={`flex-grow overflow-y-auto no-scrollbar ${isNavScrollable ? 'fade-bottom' : ''}`}>
            <ul className="border-b border-neutral-800">
                {navItems.map(item => {
                    const active = item.isActive(selectedView);
                    return (
                        <li key={item.view} className="border-t border-neutral-800">
                            <button onClick={() => handleSelectView(item.view)} aria-current={active ? 'page' : undefined}
                                className={`w-full flex items-center justify-between py-2.5 text-left ${active ? 'text-white font-semibold' : 'text-neutral-400 hover:text-white'}`}>
                                {item.label}
                                {active && <span aria-hidden="true" className="w-2 h-2 bg-signal"></span>}
                            </button>
                        </li>
                    );
                })}
            </ul>
            <h2 className="mt-10 mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Clienti</h2>
            <ul>
                {sortedClients.map((client) => (
                    <li key={client.id} draggable="true" onDragStart={e => handleDragStart(e, client)} onDragOver={handleDragOver} onDragEnter={e => handleDragEnter(e, client)} onDragLeave={handleDragLeave} onDrop={e => handleDrop(e, client)} onDragEnd={handleDragEnd}
                        className={`cursor-grab ${inactiveClients.has(client.id) ? 'opacity-50' : ''}`}>
                        <button onClick={() => handleSelectView(client.id)} aria-current={selectedView === client.id ? 'page' : undefined}
                            className={`w-full flex items-center gap-2.5 py-1.5 text-left text-sm ${selectedView === client.id ? 'text-white font-semibold' : 'text-neutral-300 hover:text-white'}`}>
                            <span aria-hidden="true" className={`w-1.5 h-1.5 flex-shrink-0 ${priorityDotClass(client.id)}`}></span>
                            <span className="truncate">{client.name}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
        <div className="pt-4 text-[11px] text-neutral-600 flex-shrink-0">v2.0</div>
      </aside>

      <main className="w-full md:flex-1 px-4 pt-6 sm:px-12 sm:pt-7 pb-28 sm:pb-28 mt-14 md:mt-0 min-w-0">
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
            projects={projects}
            clients={clients}
            todos={todos}
            projectTotals={allProjectTotals}
            onOpenProject={openProject}
            onOpenTasks={() => handleSelectView('tasks')}
            onOpenProjects={() => handleSelectView('projects')}
            onNewProject={() => openModal('project')}
        />}
        {selectedView === 'tasks' && <TaskView todos={todos} projects={projects} clients={clients} onToggleTodo={handleToggleTodo} onDeleteTodo={handleDeleteTodo} onReorderTodos={handleReorderTodos}/>}
        {selectedView === 'calendar' && <div className="max-w-[1120px]"><PageHeader overline="Scadenze delle attività" title="Calendario" /><CalendarView todos={todos} projects={projects} clients={clients}/></div>}
        {selectedView === 'documents' && (
            <div className="max-w-[1120px]">
                <PageHeader overline={`${documents.length} ${documents.length === 1 ? 'documento' : 'documenti'}`} title="Documenti" />
                <DocumentsList documents={documents} projects={projects} clients={clients} groupByProject onOpen={openDocument} onCreate={() => handleCreateDocument(null)} />
            </div>
        )}
        {selectedDocument && (
            <DocumentEditor
                key={selectedDocument.id}
                userId={userId}
                document={selectedDocument}
                projects={projects}
                clients={clients}
                onBack={() => handleSelectView(selectedDocument.projectId ? `project:${selectedDocument.projectId}` : 'documents')}
                onDelete={handleDeleteDocument}
                persist={persist}
            />
        )}
        {selectedShotlist && (
            <StoryboardView
                key={selectedShotlist.id}
                userId={userId}
                shotlist={selectedShotlist}
                shots={shots.filter(s => s.shotlistId === selectedShotlist.id)}
                project={projects.find(p => p.id === selectedShotlist.projectId)}
                client={clients.find(c => c.id === projects.find(p => p.id === selectedShotlist.projectId)?.clientId)}
                persist={persist}
                onBack={() => handleSelectView(`project:${selectedShotlist.projectId}`)}
                onDeleted={() => handleSelectView(`project:${selectedShotlist.projectId}`)}
            />
        )}
        {selectedView === 'projects' && <ProjectsView projects={projects} clients={clients} projectTotals={allProjectTotals} todos={todos} onOpenProject={openProject} />}
        {selectedProject && (
            <ProjectDetail
                key={selectedProject.id}
                project={selectedProject}
                client={clients.find(c => c.id === selectedProject.clientId)}
                todos={todos.filter(t => t.projectId === selectedProject.id)}
                onBack={() => handleSelectView(selectedProject.clientId)}
                onUpdateProjectWorkStatus={handleUpdateProjectWorkStatus}
                onUpdateProjectPaymentStatus={handleUpdateProjectPaymentStatus}
                onUpdateProjectPriority={handleUpdateProjectPriority}
                onUpdateProjectNotes={handleUpdateProjectNotes}
                onEditProject={projectId => openModal('editProject', projectId)}
                onDeleteProject={handleDeleteProject}
                onToggleTodo={handleToggleTodo}
                onDeleteTodo={handleDeleteTodo}
                onAddTodo={projectId => openModal('todo', projectId)}
                onAddPayment={projectId => openModal('payment', projectId)}
                onDeletePayment={handleDeletePayment}
                quotesCount={quotes.filter(q => q.projectId === selectedProject.id).length}
                documentsCount={documents.filter(d => d.projectId === selectedProject.id).length}
                storyboardCount={shotlists.filter(l => l.projectId === selectedProject.id).length}
                storyboardTab={
                    <StoryboardList
                        shotlists={shotlists.filter(l => l.projectId === selectedProject.id)}
                        shots={shots}
                        onOpen={id => handleSelectView(`board:${id}`)}
                        onCreate={() => handleCreateStoryboard(selectedProject.id)}
                    />
                }
                documentsTab={
                    <DocumentsList
                        documents={documents.filter(d => d.projectId === selectedProject.id)}
                        projects={projects} clients={clients} groupByProject={false}
                        onOpen={openDocument}
                        onCreate={() => handleCreateDocument(selectedProject.id)}
                    />
                }
                quotesTab={
                    <QuotesTab
                        project={selectedProject}
                        client={clients.find(c => c.id === selectedProject.clientId)}
                        quotes={quotes.filter(q => q.projectId === selectedProject.id)}
                        allQuotes={quotes}
                        profile={profile}
                        onSave={handleSaveQuote}
                        onDelete={handleDeleteQuote}
                        onChangeStatus={handleChangeQuoteStatus}
                        onOpenSettings={() => handleSelectView('settings')}
                    />
                }
            />
        )}
        {selectedView === 'settings' && <SettingsView userId={userId} profile={profile} onSaveProfile={p => persist(firebaseService.saveProfile(userId, p))} />}
        {selectedClient && (
            <ClientView
                client={selectedClient}
                projects={projects.filter(p => p.clientId === selectedClient.id)}
                projectTotals={allProjectTotals}
                todos={todos}
                onOpenProject={openProject}
                onAiAddProject={openAiModal}
                onDeleteClient={handleDeleteClient}
            />
        )}
      </main>
      
      {!selectedDocument && !selectedShotlist && <button 
        onClick={fab.action}
        className="fixed bottom-6 right-6 w-14 h-14 bg-signal text-black hover:bg-accent-hover flex items-center justify-center"
        aria-label={fab.label}
      >
        <PlusIcon className="w-7 h-7" />
      </button>}

      {saveError && (
        <div role="alert" className="fixed bottom-24 left-4 right-4 md:left-auto md:max-w-md z-50 flex items-start gap-3 p-4 rounded-lg shadow-lg bg-red-600 text-white">
          <p className="text-sm flex-1">{saveError}</p>
          <button onClick={() => setSaveError(null)} aria-label="Chiudi avviso"><XIcon className="w-5 h-5" /></button>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalTitle()}>
        {modalContent && (
          <EntityForm
            key={modalKey}
            type={modalContent}
            contextId={currentContextId}
            clients={clients}
            projects={projects}
            onAddClient={handleAddClient}
            onAddProject={handleAddProject}
            onUpdateProject={handleUpdateProject}
            onAddTodo={handleAddTodo}
            onAddPayment={handleAddPayment}
            onDone={() => setIsModalOpen(false)}
          />
        )}
      </Modal>
      <Modal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} title="Crea Progetto con AI">
        {aiContextClientId && <AiProjectForm key={modalKey} onGenerated={handleAiGenerated(aiContextClientId)} onComplete={() => setIsAiModalOpen(false)} />}
      </Modal>
    </div>
  );
};

export default function App() {
  const [authState, setAuthState] = useState<{ state: AppState; user: User | null; error?: string }>({ state: 'loading', user: null });
  const [authView, setAuthView] = useState<'login' | 'setup'>('login');

  useEffect(() => {
    const unsubscribe = firebaseService.onAuthChange(async (user) => {
      if (!user) {
        setAuthState({ state: 'unauthenticated', user: null });
        return;
      }
      setAuthState({ state: 'loading', user: null });
      try {
        // Converte i dati dal vecchio formato, se necessario (operazione non distruttiva)
        await firebaseService.ensureMigrated(user.uid);
        setAuthState({ state: 'authenticated', user });
      } catch (error) {
        // Nessun logout automatico e nessuna scrittura: si mostra l'errore e basta.
        console.error("Errore nella preparazione dei dati:", error);
        setAuthState({ state: 'error', user, error: error instanceof Error ? error.message : String(error) });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await firebaseService.logout();
  };

  switch (authState.state) {
    case 'loading':
      return <FullScreenMessage>Caricamento in corso...</FullScreenMessage>;
    case 'error':
      return <FullScreenMessage>
        <p className="font-semibold">Impossibile preparare i dati del tuo account.</p>
        <p className="text-sm text-muted-foreground max-w-md">{authState.error}</p>
        <p className="text-sm text-muted-foreground max-w-md">I tuoi dati non sono stati modificati. Se l'errore parla di permessi, controlla che le regole Firestore siano aggiornate.</p>
        <div className="flex gap-2">
          <button onClick={() => window.location.reload()} className="btn btn-primary px-4 py-2">Riprova</button>
          <button onClick={handleLogout} className="btn px-4 py-2 border">Esci</button>
        </div>
      </FullScreenMessage>;
    case 'unauthenticated':
      return authView === 'login'
        ? <LoginScreen onNavigateToRegister={() => setAuthView('setup')} />
        : <SetupScreen onNavigateToLogin={() => setAuthView('login')} />;
    case 'authenticated':
      return <MainApp key={authState.user!.uid} onLogout={handleLogout} userId={authState.user!.uid} />;
  }
}
