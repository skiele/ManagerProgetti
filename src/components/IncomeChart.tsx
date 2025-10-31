
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartData {
  name: string;
  incassati: number;
  futuri: number;
  potenziali: number;
}

interface IncomeChartProps {
  data: ChartData[];
}

const IncomeChart: React.FC<IncomeChartProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500">Nessun dato economico da visualizzare per i filtri selezionati.</p>
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
        <XAxis dataKey="name" stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `€${value}`} />
        <Tooltip
          contentStyle={{ 
            backgroundColor: 'rgba(30, 30, 30, 0.9)', 
            borderColor: '#555',
            color: '#fff',
            borderRadius: '0.5rem'
          }}
          formatter={(value: number) => `€${value.toLocaleString('it-IT')}`}
        />
        <Legend wrapperStyle={{fontSize: "14px"}}/>
        <Bar dataKey="incassati" fill="#22c55e" name="Incassati" radius={[4, 4, 0, 0]} />
        <Bar dataKey="futuri" fill="#3b82f6" name="Incassi Futuri" radius={[4, 4, 0, 0]} />
        <Bar dataKey="potenziali" fill="#f97316" name="Incassi Potenziali" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default IncomeChart;