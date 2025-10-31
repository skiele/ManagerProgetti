import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Client, Project, Todo, WorkStatus, PaymentStatus } from '../types';

interface ChartData {
  name: string;
  incassati: number;
  futuri: number;
  potenziali: number;
}

interface IncomeChartProps {
  clients: Client[];
  projects: Project[];
  todos: Todo[];
}

const IncomeChart: React.FC<IncomeChartProps> = ({ clients, projects, todos }) => {

  const data = useMemo(() => {
    // 1. Mappa i totali di ogni progetto per evitare calcoli ripetuti
    const projectTotals = new Map<string, number>();
    projects.forEach(p => {
      const tasksTotal = todos
        .filter(todo => todo.projectId === p.id)
        .reduce((sum, todo) => sum + todo.income, 0);
      projectTotals.set(p.id, p.value + tasksTotal);
    });

    // 2. Raggruppa i progetti per cliente per un accesso più rapido
    const projectsByClient = new Map<string, Project[]>();
    projects.forEach(p => {
      if (!projectsByClient.has(p.clientId)) {
        projectsByClient.set(p.clientId, []);
      }
      projectsByClient.get(p.clientId)!.push(p);
    });

    // 3. Calcola i dati per il grafico in modo efficiente
    const chartData = clients.map(client => {
      const clientProjects = projectsByClient.get(client.id) || [];
      let incassati = 0;
      let futuri = 0;
      let potenziali = 0;

      clientProjects.forEach(p => {
        if (p.workStatus === WorkStatus.Annullato) return;

        const projectTotal = projectTotals.get(p.id) || 0;

        if (p.paymentStatus === PaymentStatus.Pagato) {
          incassati += projectTotal;
        } else if (p.workStatus === WorkStatus.InLavorazione || p.workStatus === WorkStatus.Consegnato) {
          futuri += projectTotal;
        } else if (p.workStatus === WorkStatus.PreventivoDaInviare || p.workStatus === WorkStatus.PreventivoInviato) {
          potenziali += projectTotal;
        }
      });

      return {
        name: client.name,
        incassati,
        futuri,
        potenziali,
      };
    }).filter(d => d.incassati > 0 || d.futuri > 0 || d.potenziali > 0);

    return chartData;
  }, [clients, projects, todos]);


  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500">Nessun dato economico da visualizzare. Aggiungi progetti e incassi.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
        <XAxis dataKey="name" stroke="#888888" />
        <YAxis stroke="#888888" />
        <Tooltip
          contentStyle={{ 
            backgroundColor: 'rgba(30, 30, 30, 0.8)', 
            borderColor: '#555',
            color: '#fff',
            borderRadius: '0.5rem'
          }}
          formatter={(value: number) => `€${value.toLocaleString('it-IT')}`}
        />
        <Legend />
        <Bar dataKey="incassati" fill="#22c55e" name="Incassati" />
        <Bar dataKey="futuri" fill="#3b82f6" name="Incassi Futuri" />
        <Bar dataKey="potenziali" fill="#f97316" name="Incassi Potenziali" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default IncomeChart;