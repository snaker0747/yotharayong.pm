import { motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Clock, Hourglass, Lightbulb } from 'lucide-react';
import { MaintenanceRecord } from '../sheetsService';

interface StatsProps {
  records: MaintenanceRecord[];
  onStatusSelect: (status: string | null) => void;
  selectedStatus: string | null;
}

export default function DashboardStats({ records, onStatusSelect, selectedStatus }: StatsProps) {
  const total = records.length;
  const pending = records.filter((r) => r.status === 'Pending').length;
  const inProgress = records.filter((r) => r.status === 'In Progress').length;
  const completed = records.filter((r) => r.status === 'Completed').length;
  const waitingParts = records.filter((r) => r.status === 'Waiting for Parts').length;

  const cards = [
    {
      id: null,
      title: 'แจ้งซ่อมทั้งหมด',
      subTitle: 'Total Reports',
      count: total,
      color: 'border-slate-700 text-slate-100 bg-[#1E293B] hover:bg-slate-800',
      activeColor: 'ring-2 ring-blue-500 bg-slate-800/80 border-slate-600',
      icon: Lightbulb,
      borderColor: 'border-l-4 border-l-slate-400',
    },
    {
      id: 'Pending',
      title: 'รอดำเนินการ',
      subTitle: 'Pending',
      count: pending,
      color: 'border-slate-700 text-rose-400 bg-[#1E293B] hover:bg-slate-800',
      activeColor: 'ring-2 ring-rose-500 bg-slate-800/80 border-slate-600',
      icon: Clock,
      borderColor: 'border-l-4 border-l-rose-500',
    },
    {
      id: 'In Progress',
      title: 'กำลังซ่อมแซม',
      subTitle: 'In Progress',
      count: inProgress,
      color: 'border-slate-700 text-blue-400 bg-[#1E293B] hover:bg-slate-800',
      activeColor: 'ring-2 ring-blue-500 bg-slate-800/80 border-slate-600',
      icon: Hourglass,
      borderColor: 'border-l-4 border-l-blue-500',
    },
    {
      id: 'Waiting for Parts',
      title: 'รออะไหล่/วัสดุ',
      subTitle: 'Waiting Parts',
      count: waitingParts,
      color: 'border-slate-700 text-amber-400 bg-[#1E293B] hover:bg-slate-800',
      activeColor: 'ring-2 ring-amber-500 bg-slate-800/80 border-slate-600',
      icon: AlertTriangle,
      borderColor: 'border-l-4 border-l-amber-500',
    },
    {
      id: 'Completed',
      title: 'เสร็จสิ้น',
      subTitle: 'Completed',
      count: completed,
      color: 'border-slate-700 text-emerald-400 bg-[#1E293B] hover:bg-slate-800',
      activeColor: 'ring-2 ring-emerald-500 bg-slate-800/80 border-slate-600',
      icon: CheckCircle2,
      borderColor: 'border-l-4 border-l-emerald-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 bg-slate-900/40 p-4 border border-slate-700/60 rounded-xl" id="stats-dashboard-grid">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const isActive = selectedStatus === card.id;
        
        return (
          <motion.button
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            onClick={() => onStatusSelect(card.id)}
            id={`stat-card-${card.id || 'all'}`}
            className={`flex flex-col justify-between p-4 rounded-lg border text-left transition-all duration-300 relative overflow-hidden group cursor-pointer ${card.borderColor} ${
              card.id === null ? 'col-span-2 md:col-span-1' : 'col-span-1'
            } ${
              isActive ? card.activeColor : card.color
            }`}
          >
            {/* Ambient Background Glow on Hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-base font-bold font-sans text-neutral-200 leading-tight">
                  {card.title}
                </h3>
                <p className="text-xs font-semibold font-mono text-neutral-400 tracking-wider uppercase mt-1">
                  {card.subTitle}
                </p>
              </div>
              <div className="p-2 rounded bg-slate-900/60 group-hover:scale-110 transition-transform duration-300">
                <Icon size={18} className="stroke-[2.2]" />
              </div>
            </div>
            
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-4xl font-mono font-extrabold tracking-tight">
                {card.count}
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
