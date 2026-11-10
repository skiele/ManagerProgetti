import React from 'react';
import { tagClass } from '../config/status';

interface StatusChipProps {
  value: string;
  onChange: (value: any) => void;
  config: Record<string, { color: string; label: string }>;
  options: string[];
  icon: React.ReactNode;
}

// Etichetta colorata che si comporta da menu a tendina
const StatusChip: React.FC<StatusChipProps> = ({ value, onChange, config, options, icon }) => (
  <div className={`relative group cursor-pointer ${tagClass} ${config[value]?.color ?? 'bg-muted'}`}>
    {icon}
    <span>{config[value]?.label ?? value}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      aria-label={`Cambia stato ${config[value]?.label ?? value}`}
    >
      {options.map(opt => <option key={opt} value={opt}>{config[opt].label}</option>)}
    </select>
  </div>
);

export default StatusChip;
