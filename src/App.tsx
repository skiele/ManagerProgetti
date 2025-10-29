import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Client, Project, Todo, ProjectStatus } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import { BriefcaseIcon, CalendarIcon, ChartBarIcon, PlusIcon, TrashIcon, UsersIcon, LogOutIcon } from './components/icons';
import IncomeChart from './components/IncomeChart';
import Modal from './components/Modal';
import CalendarView from './components/CalendarView';
import LoginScreen from './components/LoginScreen';
import SetupScreen from './components/SetupScreen';

type AppState = 'setup' | 'login' | 'authenticated';

const initialClients: Client[] = [];
const initialProjects: Project[] = [];
const initialTodos: Todo[] = [];

// --- Main Application Component (Protected) ---
const MainApp: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [clients, setClients] = useLocalStorage<Client[]>('clients', initialClients);
  const [projects, setProjects] = useLocalStorage<Project[]>('projects', initialProjects);
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
    const newProject: Project = { id: crypto.randomUUID(), clientId, name, value, status: ProjectStatus.PreventivoDaInviare, createdAt: new Date().toISOString() };
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

  const { totalIncome, potentialIncome } = useMemo(() => {
    let total = 0;
    let potential = 0;
    filteredProjects.forEach(p => {
      const projectTotal = getProjectTotal(p.id);
      if (p.status === ProjectStatus.Pagato) {
        total += projectTotal;
      }
      if ([ProjectStatus.PreventivoInviato, ProjectStatus.PreventivoAccettato, ProjectStatus.ProgettoConsegnato, ProjectStatus.AttesaDiPagamento].includes(p.status)) {
        potential += projectTotal;
      }
    });
    return { totalIncome: total, potentialIncome: potential };
  }, [filteredProjects, getProjectTotal]);

  const handleUpdateProjectStatus = (id: string, status: ProjectStatus) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
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
      </aside>

      <main className="flex-1 p-8 overflow-y-auto bg-light dark:bg-gray-900">
        {selectedView === 'dashboard' && <Dashboard 
            totalIncome={totalIncome} 
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
                onUpdateProjectStatus={handleUpdateProjectStatus}
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


// --- Components defined outside App to prevent re-renders ---

const statusConfig: Record<ProjectStatus, { color: string; label: string }> = {
  [ProjectStatus.PreventivoDaInviare]: { color: 'bg-gray-500', label: 'Preventivo da Inviare' },
  [ProjectStatus.PreventivoInviato]: { color: 'bg-blue-500', label: 'Preventivo Inviato' },
  [ProjectStatus.PreventivoAccettato]: { color: 'bg-indigo-500', label: 'Preventivo Accettato' },
  [ProjectStatus.ProgettoConsegnato]: { color: 'bg-purple-500', label: 'Progetto Consegnato' },
  [ProjectStatus.AttesaDiPagamento]: { color: 'bg-yellow-500', label: 'Attesa di Pagamento' },
  [ProjectStatus.Pagato]: { color: 'bg-green-500', label: 'Pagato' },
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
};

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onToggle, onDelete }) => {
  return (
    <div className="group flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={(e) => onToggle(todo.id, e.target.checked)}
          className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <span className={`ml-3 ${todo.completed ? 'line-through text-gray-500' : ''}`}>{todo.task}</span>
      </div>
      <div className="flex items-center">
         {todo.dueDate && <span className="text-xs text-gray-500 mr-4">{new Date(todo.dueDate).toLocaleDateString('it-IT')}</span>}
        <span className="font-semibold text-gray-700 dark:text-gray-300 mr-4">{formatCurrency(todo.income)}</span>
        <button onClick={() => onDelete(todo.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Elimina task ${todo.task}`}>
            <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

interface ProjectCardProps {
  project: Project;
  todos: Todo[];
  onUpdateProjectStatus: (id: string, status: ProjectStatus) => void;
  onToggleTodo: (id: string, completed: boolean) => void;
  onAddTodo: (projectId: string) => void;
  onDeleteProject: (id: string) => void;
  onDeleteTodo: (id: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, todos, onUpdateProjectStatus, onToggleTodo, onAddTodo, onDeleteProject, onDeleteTodo }) => {
  const projectTotal = useMemo(() => project.value + todos.reduce((sum, todo) => sum + todo.income, 0), [project.value, todos]);
  const completedTodos = useMemo(() => todos.filter(t => t.completed).length, [todos]);
  const progress = todos.length > 0 ? (completedTodos / todos.length) * 100 : 0;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1 mr-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{project.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Creato il: {new Date(project.createdAt).toLocaleDateString('it-IT')}</p>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={project.status} 
              onChange={(e) => onUpdateProjectStatus(project.id, e.target.value as ProjectStatus)}
              className="text-sm font-medium text-white px-2 py-1 rounded-full border-none focus:ring-2 focus:ring-white/50 bg-opacity-80"
              style={{ backgroundColor: statusConfig[project.status].color.replace('bg-', '#').replace('-500', '') }}
            >
              {Object.values(ProjectStatus).map(s => (
                <option key={s} value={s} className="text-black">{statusConfig[s].label}</option>
              ))}
            </select>
            <button onClick={() => onDeleteProject(project.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label={`Elimina progetto ${project.name}`}>
                <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300 mb-1">
            <span>Progresso</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-2 bg-gray-50 dark:bg-gray-800/50">
        {todos.map(todo => <TodoItem key={todo.id} todo={todo} onToggle={onToggleTodo} onDelete={onDeleteTodo} />)}
        <button onClick={() => onAddTodo(project.id)} className="w-full text-left p-2 text-primary hover:bg-primary/10 rounded-md transition-colors flex items-center">
            <PlusIcon className="w-4 h-4 mr-2"/> Aggiungi To-Do
        </button>
      </div>
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center">
        <span className="text-lg font-bold text-gray-800 dark:text-gray-100">Totale: {formatCurrency(projectTotal)}</span>
      </div>
    </div>
  );
};

interface DashboardProps {
    totalIncome: number;
    potentialIncome: number;
    clients: Client[];
    projects: Project[];
    todos: Todo[];
    filterYear: string;
    setFilterYear: (year: string) => void;
    filterMonth: string;
    setFilterMonth: (month: string) => void;
    availableYears: string[];
}

const Dashboard: React.FC<DashboardProps> = ({ totalIncome, potentialIncome, clients, projects, todos, filterYear, setFilterYear, filterMonth, setFilterMonth, availableYears }) => (
    <div>
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
            <div className="flex gap-4 mb-6">
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                    <option value="all">Tutti gli anni</option>
                    {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
                <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                    <option value="all">Tutti i mesi</option>
                    {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('it-IT', { month: 'long' })}</option>
                    ))}
                </select>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Incasso Totale</h3>
                <p className="text-3xl font-bold text-green-500 mt-2">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Incasso Potenziale</h3>
                <p className="text-3xl font-bold text-blue-500 mt-2">{formatCurrency(potentialIncome)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Clienti Attivi</h3>
                <p className="text-3xl font-bold text-indigo-500 mt-2">{clients.length}</p>
            </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold mb-4">Incassi per Cliente</h3>
            <IncomeChart clients={clients} projects={projects} todos={todos} />
        </div>
    </div>
);

interface ClientViewProps {
    client: Client;
    projects: Project[];
    todos: Todo[];
    onUpdateProjectStatus: (id: string, status: ProjectStatus) => void;
    onToggleTodo: (id: string, completed: boolean) => void;
    onAddProject: (clientId: string) => void;
    onAddTodo: (projectId: string) => void;
    onDeleteProject: (id: string) => void;
    onDeleteTodo: (id: string) => void;
}

const ClientView: React.FC<ClientViewProps> = ({ client, projects, todos, onUpdateProjectStatus, onToggleTodo, onAddProject, onAddTodo, onDeleteProject, onDeleteTodo }) => (
    <div>
        <div className="flex justify-between items-center mb-6">
            <div>
                <h1 className="text-3xl font-bold">{client.name}</h1>
                {client.email && <p className="text-gray-500">{client.email}</p>}
            </div>
            <button onClick={() => onAddProject(client.id)} className="bg-primary text-white px-4 py-2 rounded-lg font-semibold flex items-center hover:bg-secondary transition-colors shadow-lg">
                <PlusIcon className="w-5 h-5 mr-2"/> Nuovo Progetto
            </button>
        </div>
        <div className="space-y-6">
            {projects.map(project => (
                <ProjectCard
                    key={project.id}
                    project={project}
                    todos={todos.filter(todo => todo.projectId === project.id)}
                    onUpdateProjectStatus={onUpdateProjectStatus}
                    onToggleTodo={onToggleTodo}
                    onAddTodo={onAddTodo}
                    onDeleteProject={onDeleteProject}
                    onDeleteTodo={onDeleteTodo}
                />
            ))}
             {projects.length === 0 && <p className="text-center text-gray-500 py-8">Nessun progetto per questo cliente.</p>}
        </div>
    </div>
);

// --- Authentication Controller Component ---
export default function App() {
  const [appState, setAppState] = useState<AppState | 'loading'>('loading');

  useEffect(() => {
    // Check if user credentials exist
    const credentials = localStorage.getItem('userCredentials');
    if (!credentials) {
      setAppState('setup');
    } else {
      // Always require login if credentials exist. No session persistence on refresh.
      setAppState('login');
    }
  }, []);

  const handleSetupComplete = () => {
    // After setup, log the user in for the current session
    setAppState('authenticated');
  };

  const handleLoginSuccess = () => {
    setAppState('authenticated');
  };

  const handleLogout = () => {
    setAppState('login');
  };

  if (appState === 'loading') {
    return <div className="h-screen w-screen flex items-center justify-center bg-light dark:bg-gray-900"></div>; // Or a proper loading spinner
  }

  if (appState === 'setup') {
    return <SetupScreen onSetupComplete={handleSetupComplete} />;
  }

  if (appState === 'login') {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }
  
  return <MainApp onLogout={handleLogout} />;
}
