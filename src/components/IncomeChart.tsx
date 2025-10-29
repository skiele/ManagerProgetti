import React from 'react';
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
  const getProjectTotal = (project: Project) => {
    const tasksTotal = todos
      .filter(todo => todo.projectId === project.id)
      .reduce((sum, todo) => sum + todo.income, 0);
    return project.value + tasksTotal;
  };
  
  const data: ChartData[] = clients.map(client => {
    const clientProjects = projects.filter(p => p.clientId === client.id);
    let incassati = 0;
    let futuri = 0;
    let potenziali = 0;

    clientProjects.forEach(p => {
        if (p.workStatus === WorkStatus.Annullato) return;

        const projectTotal = getProjectTotal(p);

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