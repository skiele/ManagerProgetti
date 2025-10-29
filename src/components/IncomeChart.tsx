import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Client, Project, Todo, ProjectStatus } from '../types';

interface ChartData {
  name: string;
  incasso: number;
  potenziale: number;
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
    const incasso = clientProjects
      .filter(p => p.status === ProjectStatus.Pagato)
      .reduce((sum, p) => sum + getProjectTotal(p), 0);
    const potenziale = clientProjects
      .filter(p => p.status === ProjectStatus.PreventivoInviato || p.status === ProjectStatus.PreventivoAccettato || p.status === ProjectStatus.ProgettoConsegnato || p.status === ProjectStatus.AttesaDiPagamento)
      .reduce((sum, p) => sum + getProjectTotal(p), 0);
      
    return {
      name: client.name,
      incasso,
      potenziale,
    };
  }).filter(d => d.incasso > 0 || d.potenziale > 0);

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
        <Bar dataKey="incasso" fill="#22c55e" name="Incasso" />
        <Bar dataKey="potenziale" fill="#3b82f6" name="Potenziale" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default IncomeChart;
