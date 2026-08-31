import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Grid, List as ListIcon, MapPin, Calendar, 
  User, CheckCircle2, Clock, Hourglass, AlertTriangle, 
  ChevronRight, ExternalLink, SlidersHorizontal, Image as ImageIcon 
} from 'lucide-react';
import { MaintenanceRecord } from '../sheetsService';

interface ListProps {
  records: MaintenanceRecord[];
  appName?: string;
  tableName?: string;
  onSelectRecord: (record: MaintenanceRecord) => void;
  selectedRecord: MaintenanceRecord | null;
  selectedStatusFilter: string | null;
  onStatusFilterChange: (status: string | null) => void;
}

export default function RecordsList({ 
  records, 
  appName = '',
  tableName = '',
  onSelectRecord, 
  selectedRecord,
  selectedStatusFilter,
  onStatusFilterChange
}: ListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedTech, setSelectedTech] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // 1. Get unique technicians for the dropdown filter
  const uniqueTechnicians = useMemo(() => {
    const techs = new Set<string>();
    records.forEach((r) => {
      if (r.technician && r.technician !== '-' && r.technician !== 'รอมอบหมาย') {
        techs.add(r.technician.trim());
      }
    });
    return Array.from(techs);
  }, [records]);

  // 2. Filter records based on search and selected options
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Status filter
      if (selectedStatusFilter && r.status !== selectedStatusFilter) {
        return false;
      }

      // Tech filter
      if (selectedTech !== 'all') {
        if (selectedTech === 'unassigned') {
          if (r.technician !== 'รอมอบหมาย' && r.technician !== '-') return false;
        } else if (r.technician.trim() !== selectedTech) {
          return false;
        }
      }

      // Text search
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesPole = r.poleId.toLowerCase().includes(query);
        const matchesIssue = r.issue.toLowerCase().includes(query);
        const matchesLocation = r.location.toLowerCase().includes(query);
        const matchesTech = r.technician.toLowerCase().includes(query);
        const matchesRemarks = r.remarks.toLowerCase().includes(query);
        return matchesPole || matchesIssue || matchesLocation || matchesTech || matchesRemarks;
      }

      return true;
    });
  }, [records, selectedStatusFilter, selectedTech, searchTerm]);

  // Status badging details
  const getStatusBadge = (status: string, statusThai: string) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={12} />
            {statusThai || 'ซ่อมเสร็จสิ้น'}
          </span>
        );
      case 'In Progress':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Hourglass size={12} className="animate-spin-slow" />
            {statusThai || 'กำลังดำเนินการ'}
          </span>
        );
      case 'Waiting for Parts':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <AlertTriangle size={12} />
            {statusThai || 'รออะไหล่/วัสดุ'}
          </span>
        );
      case 'Pending':
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Clock size={12} />
            {statusThai || 'รอดำเนินการ'}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-4" id="records-list-wrapper">
      {/* Controls: Search, Filters Trigger, View Mode Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="ค้นหา รหัสเสาไฟ, อาการเสีย, สถานที่ หรือ ช่างผู้ซ่อม..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Advanced Filter Trigger */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 text-sm rounded-lg border flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
              showFilters || selectedTech !== 'all'
                ? 'bg-blue-600/15 text-blue-400 border-blue-500/40 font-semibold'
                : 'bg-slate-850 text-slate-300 border-slate-700 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal size={15} />
            ตัวกรอง {selectedTech !== 'all' && '•'}
          </button>

          {/* View Mode Toggle */}
          <div className="flex bg-slate-800/60 border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-slate-700 text-blue-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-slate-700 text-blue-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <ListIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters Drawer */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-slate-900 border border-slate-700/80 rounded-lg"
          >
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Technician filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 font-sans block">ช่างผู้รับผิดชอบ (Technician)</label>
                <select
                  value={selectedTech}
                  onChange={(e) => setSelectedTech(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/30"
                >
                  <option value="all">ทั้งหมด (All Technicians)</option>
                  <option value="unassigned">ยังไม่ได้มอบหมาย (Unassigned)</option>
                  {uniqueTechnicians.map((tech) => (
                    <option key={tech} value={tech}>
                      {tech}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status filter shortcut */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 font-sans block">สถานะงานซ่อม (Repair Status)</label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => onStatusFilterChange(null)}
                    className={`px-2.5 py-1.5 text-xs rounded transition-all cursor-pointer ${
                      selectedStatusFilter === null
                        ? 'bg-slate-700 text-blue-400 font-bold border border-blue-500/20'
                        : 'bg-slate-800 text-slate-400 border border-transparent hover:bg-slate-700'
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  {['Pending', 'In Progress', 'Waiting for Parts', 'Completed'].map((st) => {
                    const label = st === 'Pending' ? 'รอซ่อม' : st === 'In Progress' ? 'กำลังซ่อม' : st === 'Waiting for Parts' ? 'รออะไหล่' : 'ซ่อมเสร็จ';
                    return (
                      <button
                        key={st}
                        onClick={() => onStatusFilterChange(st)}
                        className={`px-2.5 py-1.5 text-xs rounded transition-all cursor-pointer ${
                          selectedStatusFilter === st
                            ? 'bg-slate-700 text-blue-400 font-bold border border-blue-500/20'
                            : 'bg-slate-800 text-slate-400 border border-transparent hover:bg-slate-700'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid or Table listing of records */}
      {filteredRecords.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" id="records-grid-view">
            {filteredRecords.map((record, index) => {
              const isSelected = selectedRecord?.id === record.id;
              return (
                <motion.div
                  key={record.id}
                  layoutId={`record-card-${record.id}`}
                  onClick={() => onSelectRecord(record)}
                  className={`p-4 rounded-lg border text-left cursor-pointer transition-all duration-300 relative overflow-hidden group ${
                    isSelected 
                      ? 'bg-slate-800 border-blue-500 shadow-lg shadow-blue-500/10' 
                      : 'bg-[#1E293B]/60 border-slate-700/80 hover:border-slate-500 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div>
                      <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded mb-1 inline-block">
                        #{record.id}
                      </span>
                      <h5 className="text-base font-bold text-slate-100 font-mono tracking-wide">
                        เสาไฟ {record.poleId}
                      </h5>
                    </div>
                    {getStatusBadge(record.status, record.statusThai)}
                  </div>

                  <p className="text-sm text-slate-200 font-sans font-medium line-clamp-2 mb-3 mt-1 h-10 leading-relaxed">
                    {record.issue}
                  </p>

                  <div className="space-y-1.5 pt-2 border-t border-slate-700/60 text-xs font-sans text-slate-300">
                    <div className="flex items-start gap-1.5 truncate">
                      <MapPin size={13} className="text-slate-500 mt-0.5 shrink-0" />
                      <span className="truncate">{record.location}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                      <div className="flex items-center gap-1 truncate">
                        <User size={12} />
                        <span className="truncate max-w-[80px]">{record.technician}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Calendar size={12} />
                        <span>{record.fixedDate !== '-' ? record.fixedDate : (record.timestamp ? record.timestamp.split(' ')[0] : '-')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Indicator indicator for image */}
                  {record.imageUrl && (
                    <div className="absolute bottom-3 right-3 p-1 rounded bg-blue-500/10 text-blue-400 opacity-60 group-hover:opacity-100 transition-opacity">
                      <ImageIcon size={13} />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto bg-[#1E293B]/40 border border-slate-700 rounded-lg" id="records-table-view">
            <table className="w-full text-left text-sm font-sans">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono border-b border-slate-700 text-xs tracking-wider">
                <tr>
                  <th className="p-3">ลำดับ (No.)</th>
                  <th className="p-3">รหัสเสาไฟ (Pole ID)</th>
                  <th className="p-3">อาการเสีย (Issue)</th>
                  <th className="p-3">สถานที่ (Location)</th>
                  <th className="p-3">ผู้รับผิดชอบ (Technician)</th>
                  <th className="p-3">สถานะ (Status)</th>
                  <th className="p-3 text-right">ดำเนินการ (Action)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredRecords.map((record) => {
                  const isSelected = selectedRecord?.id === record.id;
                  return (
                    <tr
                      key={record.id}
                      onClick={() => onSelectRecord(record)}
                      className={`cursor-pointer hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-slate-800 text-blue-400 font-bold' : 'text-slate-300'
                      }`}
                    >
                      <td className="p-3 font-mono text-slate-500">#{record.id}</td>
                      <td className="p-3 font-mono font-bold text-slate-200">{record.poleId}</td>
                      <td className="p-3 max-w-[180px] truncate">{record.issue}</td>
                      <td className="p-3 max-w-[180px] truncate text-slate-400">{record.location}</td>
                      <td className="p-3 text-slate-400">{record.technician}</td>
                      <td className="p-3">{getStatusBadge(record.status, record.statusThai)}</td>
                      <td className="p-3 text-right">
                        <button className="p-1.5 rounded hover:bg-slate-800 text-blue-400 hover:text-blue-300 inline-flex items-center gap-1.5 text-xs font-mono cursor-pointer">
                          ดูรายละเอียด <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="bg-slate-900/20 border border-dashed border-slate-700/80 rounded-lg py-12 flex flex-col items-center justify-center text-center">
          <div className="p-3 bg-slate-900/50 rounded-full border border-slate-700 mb-3 text-slate-500">
            <Search size={22} />
          </div>
          <h4 className="text-base font-bold text-slate-300">ไม่พบรายงานการแจ้งซ่อม</h4>
          <p className="text-sm text-slate-400 mt-1.5 max-w-xs">
            ไม่พบบันทึกการแจ้งซ่อมที่ตรงกับเงื่อนไขการค้นหาหรือตัวกรองของคุณในขณะนี้
          </p>
        </div>
      )}
    </div>
  );
}
