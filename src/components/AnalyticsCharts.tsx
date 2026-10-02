import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'motion/react';
import { BarChart2, PieChart as PieIcon, Wrench } from 'lucide-react';
import { MaintenanceRecord } from '../sheetsService';

interface ChartsProps {
  records: MaintenanceRecord[];
}

export default function AnalyticsCharts({ records }: ChartsProps) {
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

  const donutData = Object.entries(statusCounts).map(([status, count]) => ({
    name: statusThaiNames[status] || status,
    value: count,
    color: statusColors[status] || '#a3a3a3',
  }));

  // 2. Data processing for Top Issues
  const issueCounts = records.reduce<Record<string, number>>((acc, record) => {
    // Standardize issue string a bit for group classification
    let issueGroup = record.issue.trim();
    if (issueGroup.includes('ดับ') || issueGroup.includes('ไม่ติด')) {
      issueGroup = 'ไฟดับ / หลอดชำรุด';
    } else if (issueGroup.includes('สายไฟ') || issueGroup.includes('สายขาด')) {
      issueGroup = 'สายไฟชำรุด / ลัดวงจร';
    } else if (issueGroup.includes('กิ่ง') || issueGroup.includes('ต้นไม้')) {
      issueGroup = 'กิ่งไม้บดบัง / กิ่งไม้ทับ';
    } else if (issueGroup.includes('เสาเอียง') || issueGroup.includes('เสาล้ม') || issueGroup.includes('เสาหัก')) {
      issueGroup = 'โครงสร้างเสาชำรุด / เอียง';
    } else if (issueGroup.includes('โคม') || issueGroup.includes('ครอบ')) {
      issueGroup = 'โคมไฟแตก / ฝาครอบชำรุด';
    } else if (issueGroup.includes('อุปกรณ์') || issueGroup.includes('บอร์ด') || issueGroup.includes('สวิตช์')) {
      issueGroup = 'อุปกรณ์คอนโทรล / สวิตช์อัตโนมัติ';
    } else {
      // Limit length
      if (issueGroup.length > 25) {
        issueGroup = issueGroup.substring(0, 22) + '...';
      }
    }
    acc[issueGroup] = (acc[issueGroup] || 0) + 1;
    return acc;
  }, {});

  const sortedIssues = Object.entries(issueCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // top 5 issues

  const maxIssueCount = Math.max(...sortedIssues.map((i) => i.count), 1);

  // 3. Data processing for Repair Actions (การซ่อมบำรุงแก้ไข)
  const repairItemCounts = records.reduce<Record<string, number>>((acc, record) => {
    if (record.repairAction) {
      const items = record.repairAction.split(',').map(s => s.trim()).filter(s => s.length > 0 && s !== '-');
      items.forEach(item => {
        acc[item] = (acc[item] || 0) + 1;
      });
    }
    return acc;
  }, {});

  const sortedRepairActions = Object.entries(repairItemCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // top 5 repair actions

  const maxRepairCount = Math.max(...sortedRepairActions.map((i) => i.count), 1);

  // Custom gradients and text colors for differentiated bar charts
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="analytics-charts-section">
      {/* Chart 1: Donut Status Distribution */}
      <div className="bg-[#1E293B] border border-slate-700 rounded-lg p-4 sm:p-5 flex flex-col h-[340px]">
        <div className="flex items-center gap-2 mb-4">
          <PieIcon className="text-blue-500" size={18} />
          <h4 className="text-base sm:text-lg font-semibold text-slate-100 font-sans">
            สัดส่วนสถานะการซ่อมบำรุง (Status Ratio)
          </h4>
        </div>

        {donutData.length > 0 ? (
          <div className="flex-1 flex items-center justify-center gap-3 sm:gap-6 md:gap-4 lg:gap-3 xl:gap-6 min-w-0">
            <div className="w-[130px] h-[130px] sm:w-[160px] sm:h-[160px] md:w-[150px] md:h-[150px] lg:w-[130px] lg:h-[130px] xl:w-[160px] xl:h-[160px] relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius="65%"
                    outerRadius="90%"
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontFamily: "'FC Vision Superfamily', 'FC Vision', 'Prompt', sans-serif",
                      fontSize: '11px',
                    }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] sm:text-xs font-mono text-slate-400 uppercase">ทั้งหมด</span>
                <span className="text-xl sm:text-2xl md:text-2xl lg:text-xl xl:text-3xl font-bold font-mono text-slate-100">{records.length}</span>
              </div>
            </div>

            {/* Custom Legend */}
            <div className="flex-1 max-w-[180px] flex flex-col gap-2.5 sm:gap-4 md:gap-3 lg:gap-2.5 xl:gap-4 justify-center min-w-0">
              {donutData.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-xs sm:text-sm font-sans min-w-0 gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full inline-block shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-200 truncate font-medium text-xs sm:text-sm">{item.name}</span>
                  </div>
                  <div className="font-mono font-bold text-slate-100 text-sm sm:text-base shrink-0">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
            ไม่มีข้อมูลสรุปสถานะ
          </div>
        )}
      </div>

      {/* Chart 2: Top Defect Issues (Horizontally Custom Styled Bar Chart) */}
      <div className="bg-[#1E293B] border border-slate-700 rounded-lg p-4 sm:p-5 flex flex-col h-[340px]">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="text-blue-500" size={18} />
          <h4 className="text-base sm:text-lg font-semibold text-slate-100 font-sans">
            ปัญหาที่พบ (Issues Reported)
          </h4>
        </div>

        {sortedIssues.length > 0 ? (
          <div className="flex-1 flex flex-col justify-around py-2">
            {sortedIssues.map((item, index) => {
              const pct = (item.count / maxIssueCount) * 100;
              const barGradient = issueGradients[index % issueGradients.length];
              const textCol = issueTextColors[index % issueTextColors.length];
              return (
                <div key={index} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs sm:text-sm font-sans gap-2 min-w-0">
                    <span className="text-slate-200 font-medium truncate flex-1 min-w-0">
                      {index + 1}. {item.name}
                    </span>
                    <span className={`font-mono font-bold text-sm sm:text-base shrink-0 ${textCol}`}>
                      {item.count} ครั้ง
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 sm:h-2.5 rounded-full overflow-hidden border border-slate-800/40 relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      className={`h-full bg-gradient-to-r ${barGradient} rounded-full`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
            ไม่มีข้อมูลประเภทปัญหา
          </div>
        )}
      </div>

      {/* Chart 3: Top Repair Actions (Horizontally Custom Styled Bar Chart) */}
      <div className="bg-[#1E293B] border border-slate-700 rounded-lg p-4 sm:p-5 flex flex-col h-[340px] md:col-span-2 lg:col-span-1">
        <div className="flex items-center gap-2 mb-4">
          <Wrench className="text-emerald-500" size={18} />
          <h4 className="text-base sm:text-lg font-semibold text-slate-100 font-sans">
            รายการซ่อมบำรุง (Repair Actions)
          </h4>
        </div>

        {sortedRepairActions.length > 0 ? (
          <div className="flex-1 flex flex-col justify-around py-2">
            {sortedRepairActions.map((item, index) => {
              const pct = (item.count / maxRepairCount) * 100;
              const barGradient = repairGradients[index % repairGradients.length];
              const textCol = repairTextColors[index % repairTextColors.length];
              return (
                <div key={index} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs sm:text-sm font-sans gap-2 min-w-0">
                    <span className="text-slate-200 font-medium truncate flex-1 min-w-0">
                      {index + 1}. {item.name}
                    </span>
                    <span className={`font-mono font-bold text-sm sm:text-base shrink-0 ${textCol}`}>
                      {item.count} รายการ
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 sm:h-2.5 rounded-full overflow-hidden border border-slate-800/40 relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      className={`h-full bg-gradient-to-r ${barGradient} rounded-full`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
            ไม่มีข้อมูลการซ่อมบำรุง
          </div>
        )}
      </div>
    </div>
  );
}
