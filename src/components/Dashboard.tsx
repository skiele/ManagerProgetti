
import React from 'react';
import IncomeChart from './IncomeChart';
import { formatCurrency } from '../utils/formatting';

interface ChartData {
  name: string;
  incassati: number;
  futuri: number;
  potenziali: number;
}

interface DashboardProps {
    collectedIncome: number;
    futureIncome: number;
    potentialIncome: number;
    chartData: ChartData[];
    filterYear: string;
    setFilterYear: (year: string) => void;
    filterMonth: string;
    setFilterMonth: (month: string) => void;
    availableYears: string[];
}

const Dashboard: React.FC<DashboardProps> = ({ 
    collectedIncome, 
    futureIncome, 
    potentialIncome, 
    chartData,
    filterYear, 
    setFilterYear, 
    filterMonth, 
    setFilterMonth, 
    availableYears 
}) => (
    <div>
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <div className="flex flex-col sm:flex-row gap-4">
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                    <option value="all">Tutti gli anni</option>
                    {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
                <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                    <option value="all">Tutti i mesi</option>
                    {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={String(i + 1)}>{new Date(0, i).toLocaleString('it-IT', { month: 'long' })}</option>
                    ))}
                </select>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Incassati</h3>
                <p className="text-3xl font-bold text-green-500 mt-2">{formatCurrency(collectedIncome)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Incassi Futuri</h3>
                <p className="text-3xl font-bold text-blue-500 mt-2">{formatCurrency(futureIncome)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Incassi Potenziali</h3>
                <p className="text-3xl font-bold text-orange-500 mt-2">{formatCurrency(potentialIncome)}</p>
            </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-2 sm:p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold mb-4">Incassi per Cliente</h3>
            <IncomeChart data={chartData} />
        </div>
    </div>
);

export default Dashboard;