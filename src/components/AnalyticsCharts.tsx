import { useState } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart2, PieChart as PieIcon, Wrench, Sparkles, 
  Filter, X, Check, ArrowUpRight, BarChart3, ListOrdered
} from 'lucide-react';
import { MaintenanceRecord } from '../sheetsService';

interface ChartsProps {
  records: MaintenanceRecord[];
  selectedStatus?: string | null;
  onStatusSelect?: (status: string | null) => void;
  activeFilterQuery?: string;
  onFilterQueryChange?: (query: string) => void;
}

// Custom Active Shape for Interactive Donut
const renderActiveDonutShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  return (
    <g>
      {/* Outer Pulse Highlight Ring */}
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 4}
        outerRadius={outerRadius + 8}
        fill={fill}
        opacity={0.6}
      />
      {/* Expanded Active Segment */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 3}
        outerRadius={outerRadius + 5}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{
          filter: `drop-shadow(0 0 10px ${fill}90)`,
          transition: 'all 0.3s ease-out'
        }}
      />
    </g>
  );
};

export default function AnalyticsCharts({ 
  records,
  selectedStatus = null,
  onStatusSelect,
  activeFilterQuery = '',
  onFilterQueryChange
}: ChartsProps) {
  // Interactive state
  const [activeDonutIndex, setActiveDonutIndex] = useState<number | null>(null);
  const [hoveredDonutItem, setHoveredDonutItem] = useState<{ name: string; value: number; color: string; key: string } | null>(null);
  
  // View mode toggles for Issue & Repair charts
  const [issueViewMode, setIssueViewMode] = useState<'bars' | 'chart'>('bars');
  const [repairViewMode, setRepairViewMode] = useState<'bars' | 'chart'>('bars');
  const [hoveredIssue, setHoveredIssue] = useState<string | null>(null);
  const [hoveredRepair, setHoveredRepair] = useState<string | null>(null);

  // 1. Data processing for Status Donut
  const statusCounts = records.reduce<Record<string, number>>((acc, record) => {
    const s = record.status;
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const statusThaiNames: Record<string, string> = {
    'Pending': 'รอดำเนินการ',
    'In Progress': 'กำลังดำเนินการ',
    'Completed': 'ซ่อมเสร็จสิ้น',
    'Waiting for Parts': 'รออะไหล่/วัสดุ'
  };

  const statusColors: Record<string, string> = {
    'Pending': '#f43f5e', // rose
    'In Progress': '#3b82f6', // blue
    'Completed': '#10b981', // emerald
    'Waiting for Parts': '#f97316' // orange
  };

  const donutData = Object.entries(statusCounts).map(([statusKey, count]) => ({
    name: statusThaiNames[statusKey] || statusKey,
    key: statusKey,
    value: count,
    color: statusColors[statusKey] || '#a3a3a3',
  }));

  // 2. Data processing for Top Issues
  const issueCounts = records.reduce<Record<string, { count: number; rawKeywords: string[] }>>((acc, record) => {
    let issueGroup = record.issue.trim();
    let searchKeyword = issueGroup;
    if (issueGroup.includes('ดับ') || issueGroup.includes('ไม่ติด')) {
      issueGroup = 'ไฟดับ / หลอดชำรุด';
      searchKeyword = 'ดับ';
    } else if (issueGroup.includes('สายไฟ') || issueGroup.includes('สายขาด') || issueGroup.includes('ลัดวงจร')) {
      issueGroup = 'สายไฟชำรุด / ลัดวงจร';
      searchKeyword = 'สายไฟ';
    } else if (issueGroup.includes('กิ่ง') || issueGroup.includes('ต้นไม้')) {
      issueGroup = 'กิ่งไม้บดบัง / กิ่งไม้ทับ';
      searchKeyword = 'กิ่งไม้';
    } else if (issueGroup.includes('เสาเอียง') || issueGroup.includes('เสาล้ม') || issueGroup.includes('เสาหัก')) {
      issueGroup = 'โครงสร้างเสาชำรุด / เอียง';
      searchKeyword = 'เสา';
    } else if (issueGroup.includes('โคม') || issueGroup.includes('ครอบ')) {
      issueGroup = 'โคมไฟแตก / ฝาครอบชำรุด';
      searchKeyword = 'โคม';
    } else if (issueGroup.includes('อุปกรณ์') || issueGroup.includes('บอร์ด') || issueGroup.includes('สวิตช์')) {
      issueGroup = 'อุปกรณ์คอนโทรล / สวิตช์';
      searchKeyword = 'สวิตช์';
    } else {
      if (issueGroup.length > 22) {
        issueGroup = issueGroup.substring(0, 20) + '...';
      }
    }
    
    if (!acc[issueGroup]) {
      acc[issueGroup] = { count: 0, rawKeywords: [] };
    }
    acc[issueGroup].count += 1;
    if (!acc[issueGroup].rawKeywords.includes(searchKeyword)) {
      acc[issueGroup].rawKeywords.push(searchKeyword);
    }
    return acc;
  }, {});

  const sortedIssues = Object.entries(issueCounts)
    .map(([name, data]) => ({ 
      name, 
      count: data.count, 
      keyword: data.rawKeywords[0] || name,
      percent: records.length > 0 ? ((data.count / records.length) * 100).toFixed(1) : '0'
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const maxIssueCount = Math.max(...sortedIssues.map((i) => i.count), 1);

  // 3. Data processing for Repair Actions
  const repairItemCounts = records.reduce<Record<string, number>>((acc, record) => {
    if (record.repairAction) {
      const items = record.repairAction.split(',').map(s => s.trim()).filter(s => s.length > 0 && s !== '-');
      items.forEach(item => {
        acc[item] = (acc[item] || 0) + 1;
      });
    }
    return acc;
  }, {});

  const totalRepairsCount = Object.values(repairItemCounts).reduce((a, b) => a + b, 0);

  const sortedRepairActions = Object.entries(repairItemCounts)
    .map(([name, count]) => ({ 
      name, 
      count,
      keyword: name,
      percent: totalRepairsCount > 0 ? ((count / totalRepairsCount) * 100).toFixed(1) : '0'
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const maxRepairCount = Math.max(...sortedRepairActions.map((i) => i.count), 1);

  // Gradients for custom progress bars
  const issueGradients = [
    'from-blue-600 to-cyan-400',
    'from-indigo-600 to-purple-400',
    'from-violet-600 to-fuchsia-400',
    'from-pink-600 to-rose-400',
    'from-emerald-600 to-teal-400'
  ];
  const issueTextColors = [
    'text-blue-400',
    'text-indigo-400',
    'text-violet-400',
    'text-pink-400',
    'text-emerald-400'
  ];

  const repairGradients = [
    'from-emerald-600 to-teal-400',
    'from-amber-600 to-yellow-400',
    'from-cyan-600 to-sky-400',
    'from-pink-600 to-rose-400',
    'from-purple-600 to-indigo-400'
  ];
  const repairTextColors = [
    'text-emerald-400',
    'text-amber-400',
    'text-cyan-400',
    'text-pink-400',
    'text-purple-400'
  ];

  // Handler for Status Slice / Legend Click
  const handleStatusClick = (statusKey: string) => {
    if (!onStatusSelect) return;
    if (selectedStatus === statusKey) {
      onStatusSelect(null); // toggle off
    } else {
      onStatusSelect(statusKey);
    }
  };

  // Handler for Issue Bar Click (filter search query)
  const handleIssueClick = (keyword: string) => {
    if (!onFilterQueryChange) return;
    if (activeFilterQuery === keyword) {
      onFilterQueryChange('');
    } else {
      onFilterQueryChange(keyword);
    }
  };

  // Handler for Repair Action Bar Click
  const handleRepairClick = (keyword: string) => {
    if (!onFilterQueryChange) return;
    if (activeFilterQuery === keyword) {
      onFilterQueryChange('');
    } else {
      onFilterQueryChange(keyword);
    }
  };

  const hasAnyFilterActive = selectedStatus !== null || (activeFilterQuery && activeFilterQuery.trim() !== '');

  const clearAllFilters = () => {
    if (onStatusSelect) onStatusSelect(null);
    if (onFilterQueryChange) onFilterQueryChange('');
  };

  return (
    <div className="space-y-3 sm:space-y-4" id="analytics-charts-interactive-container">
      
      {/* Interactive Active Filter Notification Bar */}
      <AnimatePresence>
        {hasAnyFilterActive && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-slate-900 border border-blue-500/40 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-lg">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-blue-400 text-xs sm:text-sm font-bold font-sans">
                  <Filter size={15} className="animate-pulse" />
                  <span>กำลังกรองแบบ Interactive:</span>
                </div>

                {selectedStatus && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-600/30 text-blue-200 border border-blue-400/40">
                    สถานะ: {statusThaiNames[selectedStatus] || selectedStatus}
                    <button 
                      onClick={() => onStatusSelect && onStatusSelect(null)} 
                      className="hover:text-white cursor-pointer ml-1"
                      title="ยกเลิกการกรองสถานะนี้"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}

                {activeFilterQuery && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-600/30 text-purple-200 border border-purple-400/40">
                    คำค้นหา: &ldquo;{activeFilterQuery}&rdquo;
                    <button 
                      onClick={() => onFilterQueryChange && onFilterQueryChange('')} 
                      className="hover:text-white cursor-pointer ml-1"
                      title="ยกเลิกคำค้นหานี้"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
              </div>

              <button
                onClick={clearAllFilters}
                className="px-2.5 py-1 text-xs font-medium bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
              >
                <X size={13} />
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {/* ========================================================================= */}
        {/* Chart 1: Interactive Donut Status Distribution (สัดส่วนสถานะการซ่อมบำรุง) */}
        {/* ========================================================================= */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-3.5 sm:p-5 flex flex-col min-h-[340px] sm:h-[370px] shadow-lg relative group">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 border border-blue-500/20">
                <PieIcon size={16} />
              </div>
              <h4 className="text-sm sm:text-base font-semibold text-slate-100 font-sans truncate">
                สัดส่วนสถานะการซ่อมบำรุง
              </h4>
            </div>
            <span className="text-[10px] sm:text-xs font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60 shrink-0">
              Interactive
            </span>
          </div>

          {donutData.length > 0 ? (
            <div className="flex-1 flex flex-col justify-between">
              <div className="flex items-center justify-center gap-2 sm:gap-4 min-w-0 flex-1">
                {/* Donut Chart Canvas */}
                <div className="w-[140px] h-[140px] sm:w-[165px] sm:h-[165px] md:w-[155px] md:h-[155px] lg:w-[145px] lg:h-[145px] xl:w-[170px] xl:h-[170px] relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        activeIndex={activeDonutIndex !== null ? activeDonutIndex : undefined}
                        activeShape={renderActiveDonutShape}
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius="62%"
                        outerRadius="88%"
                        paddingAngle={4}
                        dataKey="value"
                        onMouseEnter={(_, index) => {
                          setActiveDonutIndex(index);
                          setHoveredDonutItem(donutData[index]);
                        }}
                        onMouseLeave={() => {
                          setActiveDonutIndex(null);
                          setHoveredDonutItem(null);
                        }}
                        onClick={(_, index) => {
                          handleStatusClick(donutData[index].key);
                        }}
                        cursor="pointer"
                      >
                        {donutData.map((entry, index) => {
                          const isSelected = selectedStatus === entry.key;
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color}
                              stroke={isSelected ? '#ffffff' : 'transparent'}
                              strokeWidth={isSelected ? 2 : 0}
                            />
                          );
                        })}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Center Text Dynamic Transition - Clean & Non-overlapping */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1">
                    <AnimatePresence mode="wait">
                      {hoveredDonutItem ? (
                        <motion.div
                          key="hovered"
                          initial={{ scale: 0.85, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.85, opacity: 0 }}
                          transition={{ duration: 0.12 }}
                          className="flex flex-col items-center justify-center"
                        >
                          <span 
                            className="text-[11px] font-sans font-bold truncate max-w-[85px] leading-tight"
                            style={{ color: hoveredDonutItem.color }}
                          >
                            {hoveredDonutItem.name}
                          </span>
                          <span className="text-2xl font-black font-mono text-white leading-tight my-0.5">
                            {hoveredDonutItem.value}
                          </span>
                          <span className="text-[10px] font-mono text-slate-300 bg-slate-900/80 px-1.5 py-0.2 rounded border border-slate-700/60">
                            {records.length > 0 ? `${((hoveredDonutItem.value / records.length) * 100).toFixed(0)}%` : ''}
                          </span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="total"
                          initial={{ scale: 0.85, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.85, opacity: 0 }}
                          transition={{ duration: 0.12 }}
                          className="flex flex-col items-center justify-center"
                        >
                          <span className="text-[10px] sm:text-xs font-sans text-slate-400 font-semibold">ทั้งหมด</span>
                          <span className="text-2xl font-black font-mono text-white leading-tight my-0.5">
                            {records.length}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">งาน</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Interactive Clickable Legend */}
                <div className="flex-1 max-w-[190px] flex flex-col gap-1.5 sm:gap-2 justify-center min-w-0">
                  {donutData.map((item, index) => {
                    const isSelected = selectedStatus === item.key;
                    const isHovered = activeDonutIndex === index;
                    const pct = records.length > 0 ? ((item.value / records.length) * 100).toFixed(0) : '0';

                    return (
                      <button
                        key={index}
                        onClick={() => handleStatusClick(item.key)}
                        onMouseEnter={() => {
                          setActiveDonutIndex(index);
                          setHoveredDonutItem(item);
                        }}
                        onMouseLeave={() => {
                          setActiveDonutIndex(null);
                          setHoveredDonutItem(null);
                        }}
                        className={`w-full flex items-center justify-between text-xs font-sans min-w-0 p-1.5 rounded-lg border transition-all duration-200 text-left cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/50'
                            : isHovered
                            ? 'bg-slate-800 border-slate-600 text-slate-100 scale-[1.02]'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
                        }`}
                        title={`คลิกเพื่อกรองงานสถานะ ${item.name}`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span 
                            className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-sm" 
                            style={{ backgroundColor: item.color }} 
                          />
                          <span className="truncate font-medium text-[11px] sm:text-xs">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-1 font-mono shrink-0 pl-1">
                          <span className="font-bold text-xs sm:text-sm text-slate-100">{item.value}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span>
                          {isSelected && <Check size={12} className="text-blue-400 ml-0.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sub-hint footer */}
              <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-sans">
                <span className="flex items-center gap-1">
                  <Sparkles size={12} className="text-amber-400" />
                  <span>แตะที่ชิ้นกราฟเพื่อกรองข้อมูล</span>
                </span>
                {selectedStatus && (
                  <button
                    onClick={() => onStatusSelect && onStatusSelect(null)}
                    className="text-blue-400 hover:underline cursor-pointer font-semibold"
                  >
                    ล้างการกรอง
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
              ไม่มีข้อมูลสรุปสถานะ
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* Chart 2: Interactive Top Issues Reported (ปัญหาที่พบ) */}
        {/* ========================================================================= */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-3.5 sm:p-5 flex flex-col min-h-[340px] sm:h-[370px] shadow-lg relative group">
          {/* Header & Mode Toggle */}
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0 border border-indigo-500/20">
                <BarChart2 size={16} />
              </div>
              <h4 className="text-sm sm:text-base font-semibold text-slate-100 font-sans truncate">
                ปัญหาที่พบ
              </h4>
            </div>

            {/* Toggle view mode: Bars vs Chart */}
            <div className="flex bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 shrink-0">
              <button
                onClick={() => setIssueViewMode('bars')}
                className={`px-2 py-1 rounded text-[10px] font-sans flex items-center gap-1 transition-all cursor-pointer ${
                  issueViewMode === 'bars'
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="มุมมองจัดอันดับ"
              >
                <ListOrdered size={12} />
                <span>อันดับ</span>
              </button>
              <button
                onClick={() => setIssueViewMode('chart')}
                className={`px-2 py-1 rounded text-[10px] font-sans flex items-center gap-1 transition-all cursor-pointer ${
                  issueViewMode === 'chart'
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="มุมมองกราฟแท่ง"
              >
                <BarChart3 size={12} />
                <span>กราฟ</span>
              </button>
            </div>
          </div>

          {sortedIssues.length > 0 ? (
            <div className="flex-1 flex flex-col justify-between">
              {issueViewMode === 'bars' ? (
                /* Mode 1: Interactive Ranked Horizontal Bars */
                <div className="flex-1 flex flex-col justify-around py-1">
                  {sortedIssues.map((item, index) => {
                    const pct = (item.count / maxIssueCount) * 100;
                    const barGradient = issueGradients[index % issueGradients.length];
                    const textCol = issueTextColors[index % issueTextColors.length];
                    const isFilterActive = activeFilterQuery === item.keyword;
                    const isHovered = hoveredIssue === item.name;

                    return (
                      <button
                        key={index}
                        onClick={() => handleIssueClick(item.keyword)}
                        onMouseEnter={() => setHoveredIssue(item.name)}
                        onMouseLeave={() => setHoveredIssue(null)}
                        className={`w-full text-left space-y-1 p-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                          isFilterActive
                            ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/30'
                            : isHovered
                            ? 'bg-slate-800/60 border-slate-700 scale-[1.01]'
                            : 'border-transparent hover:bg-slate-800/30'
                        }`}
                        title={`คลิกเพื่อกรองงานปัญหา "${item.name}"`}
                      >
                        <div className="flex justify-between items-center text-xs font-sans gap-2 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                              {index + 1}
                            </span>
                            <span className="text-slate-200 font-medium truncate text-[11px] sm:text-xs">
                              {item.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`font-mono font-bold text-xs sm:text-sm ${textCol}`}>
                              {item.count} ครั้ง
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              ({item.percent}%)
                            </span>
                            {isFilterActive && <Check size={12} className="text-indigo-400" />}
                          </div>
                        </div>

                        {/* Animated Progress Bar */}
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/50 relative">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, delay: index * 0.05 }}
                            className={`h-full bg-gradient-to-r ${barGradient} rounded-full shadow-sm`}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Mode 2: Recharts Interactive Bar Chart */
                <div className="w-full h-[220px] pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sortedIssues} margin={{ top: 10, right: 10, left: -25, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        angle={-20} 
                        textAnchor="end" 
                        interval={0}
                        tick={{ fill: '#cbd5e1' }}
                      />
                      <YAxis stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl shadow-2xl text-xs space-y-1 font-sans">
                                <p className="font-bold text-white">{data.name}</p>
                                <p className="text-indigo-400 font-mono font-semibold">จำนวน: {data.count} ครั้ง ({data.percent}%)</p>
                                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Sparkles size={11} className="text-amber-400" />
                                  คลิกแท่งกราฟเพื่อกรองรายการ
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="#6366f1" 
                        radius={[4, 4, 0, 0]}
                        onClick={(data) => handleIssueClick(data.keyword)}
                        cursor="pointer"
                      >
                        {sortedIssues.map((entry, index) => (
                          <Cell 
                            key={`issue-bar-${index}`} 
                            fill={activeFilterQuery === entry.keyword ? '#818cf8' : '#6366f1'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Sub-hint footer */}
              <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-sans">
                <span className="flex items-center gap-1">
                  <ArrowUpRight size={12} className="text-indigo-400" />
                  <span>คลิกรายการเพื่อกรองคำค้นหา</span>
                </span>
                {activeFilterQuery && (
                  <button
                    onClick={() => onFilterQueryChange && onFilterQueryChange('')}
                    className="text-indigo-400 hover:underline cursor-pointer font-semibold"
                  >
                    ล้างการกรอง
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
              ไม่มีข้อมูลประเภทปัญหา
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* Chart 3: Interactive Repair Actions (รายการซ่อมบำรุงแก้ไข) */}
        {/* ========================================================================= */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-3.5 sm:p-5 flex flex-col min-h-[340px] sm:h-[370px] shadow-lg md:col-span-2 lg:col-span-1 relative group">
          {/* Header & Mode Toggle */}
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 border border-emerald-500/20">
                <Wrench size={16} />
              </div>
              <h4 className="text-sm sm:text-base font-semibold text-slate-100 font-sans truncate">
                รายการซ่อมบำรุง
              </h4>
            </div>

            {/* Toggle view mode */}
            <div className="flex bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 shrink-0">
              <button
                onClick={() => setRepairViewMode('bars')}
                className={`px-2 py-1 rounded text-[10px] font-sans flex items-center gap-1 transition-all cursor-pointer ${
                  repairViewMode === 'bars'
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="มุมมองจัดอันดับ"
              >
                <ListOrdered size={12} />
                <span>อันดับ</span>
              </button>
              <button
                onClick={() => setRepairViewMode('chart')}
                className={`px-2 py-1 rounded text-[10px] font-sans flex items-center gap-1 transition-all cursor-pointer ${
                  repairViewMode === 'chart'
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="มุมมองกราฟแท่ง"
              >
                <BarChart3 size={12} />
                <span>กราฟ</span>
              </button>
            </div>
          </div>

          {sortedRepairActions.length > 0 ? (
            <div className="flex-1 flex flex-col justify-between">
              {repairViewMode === 'bars' ? (
                /* Mode 1: Interactive Ranked Horizontal Bars */
                <div className="flex-1 flex flex-col justify-around py-1">
                  {sortedRepairActions.map((item, index) => {
                    const pct = (item.count / maxRepairCount) * 100;
                    const barGradient = repairGradients[index % repairGradients.length];
                    const textCol = repairTextColors[index % repairTextColors.length];
                    const isFilterActive = activeFilterQuery === item.keyword;
                    const isHovered = hoveredRepair === item.name;

                    return (
                      <button
                        key={index}
                        onClick={() => handleRepairClick(item.keyword)}
                        onMouseEnter={() => setHoveredRepair(item.name)}
                        onMouseLeave={() => setHoveredRepair(null)}
                        className={`w-full text-left space-y-1 p-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                          isFilterActive
                            ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/30'
                            : isHovered
                            ? 'bg-slate-800/60 border-slate-700 scale-[1.01]'
                            : 'border-transparent hover:bg-slate-800/30'
                        }`}
                        title={`คลิกเพื่อกรองงานที่ใช้วิธีซ่อม "${item.name}"`}
                      >
                        <div className="flex justify-between items-center text-xs font-sans gap-2 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                              {index + 1}
                            </span>
                            <span className="text-slate-200 font-medium truncate text-[11px] sm:text-xs">
                              {item.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`font-mono font-bold text-xs sm:text-sm ${textCol}`}>
                              {item.count} รายการ
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              ({item.percent}%)
                            </span>
                            {isFilterActive && <Check size={12} className="text-emerald-400" />}
                          </div>
                        </div>

                        {/* Animated Progress Bar */}
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/50 relative">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, delay: index * 0.05 }}
                            className={`h-full bg-gradient-to-r ${barGradient} rounded-full shadow-sm`}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Mode 2: Recharts Interactive Bar Chart */
                <div className="w-full h-[220px] pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sortedRepairActions} margin={{ top: 10, right: 10, left: -25, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        angle={-20} 
                        textAnchor="end" 
                        interval={0}
                        tick={{ fill: '#cbd5e1' }}
                      />
                      <YAxis stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl shadow-2xl text-xs space-y-1 font-sans">
                                <p className="font-bold text-white">{data.name}</p>
                                <p className="text-emerald-400 font-mono font-semibold">จำนวน: {data.count} รายการ ({data.percent}%)</p>
                                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Sparkles size={11} className="text-amber-400" />
                                  คลิกแท่งกราฟเพื่อกรองรายการ
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]}
                        onClick={(data) => handleRepairClick(data.keyword)}
                        cursor="pointer"
                      >
                        {sortedRepairActions.map((entry, index) => (
                          <Cell 
                            key={`repair-bar-${index}`} 
                            fill={activeFilterQuery === entry.keyword ? '#34d399' : '#10b981'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Sub-hint footer */}
              <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-sans">
                <span className="flex items-center gap-1">
                  <ArrowUpRight size={12} className="text-emerald-400" />
                  <span>คลิกรายการเพื่อกรองคำค้นหา</span>
                </span>
                {activeFilterQuery && (
                  <button
                    onClick={() => onFilterQueryChange && onFilterQueryChange('')}
                    className="text-emerald-400 hover:underline cursor-pointer font-semibold"
                  >
                    ล้างการกรอง
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
              ไม่มีข้อมูลการซ่อมบำรุง
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
