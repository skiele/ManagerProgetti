import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils/formatting';

interface ChartData {
  name: string;
  incassati: number;
  futuri: number;
  potenziali: number;
}

interface IncomeChartProps {
  data: ChartData[];
}

const compactEuro = (value: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 }).format(value);

const truncate = (text: string, max = 24) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

// Barre orizzontali: i nomi dei clienti, anche lunghi, restano leggibili a sinistra.
const IncomeChart: React.FC<IncomeChartProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-muted/50 rounded-lg">
        <p className="text-muted-foreground text-sm">Nessun dato economico per i filtri selezionati.</p>
      </div>
    );
  }

  const height = Math.max(220, data.length * 76 + 70);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }} barGap={3} barCategoryGap={14}>
        <CartesianGrid horizontal={false} stroke="hsl(var(--muted))" />
        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={compactEuro} />
        <YAxis type="category" dataKey="name" width={170} stroke="hsl(var(--muted-foreground))" fontSize={13} tickLine={false} axisLine={false} tickFormatter={(v: string) => truncate(v)} />
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--muted))',
            color: 'hsl(var(--foreground))',
            borderRadius: '0.5rem',
            fontSize: 13,
          }}
          formatter={(value: number) => formatCurrency(value)}
        />
        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 13, paddingBottom: 8 }} />
        <Bar dataKey="incassati" barSize={14} fill="#22c55e" name="Incassati" radius={[0, 4, 4, 0]} />
        <Bar dataKey="futuri" barSize={14} fill="#3b82f6" name="Incassi futuri" radius={[0, 4, 4, 0]} />
        <Bar dataKey="potenziali" barSize={14} fill="#f97316" name="Incassi potenziali" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default IncomeChart;
