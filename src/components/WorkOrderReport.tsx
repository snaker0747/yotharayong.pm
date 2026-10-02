import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Printer, FileText, Plus, Trash2, CheckCircle2, Copy, Check, 
  Send, MapPin, Calendar, User, AlertTriangle, Download, 
  Share2, Wrench, Clock, Database, ChevronRight, Sparkles,
  ExternalLink, Navigation, HelpCircle, ArrowRight, ListPlus
} from 'lucide-react';
import { MaintenanceRecord } from '../sheetsService';

export interface WorkOrderItem {
  id: string;
  poleId: string;
  issue: string;
  community: string;
  soi: string;
  location: string;
  lat: number | null;
  lng: number | null;
  technician: string;
  urgency: 'ปกติ' | 'ด่วน' | 'ด่วนที่สุด';
  remarks: string;
  orderDate: string;
  isFromExisting?: boolean;
}

interface WorkOrderReportProps {
  records: MaintenanceRecord[];
  onSyncNewRecord?: (record: MaintenanceRecord) => Promise<{ success: boolean; message?: string }>;
  theme: 'light' | 'dark';
}

const COMMON_ISSUES = [
  'โคมไฟแตก/ฝาครอบชำรุด',
  'เบรคเกอร์ทริป',
  'สายไฟชำรุด/ลัดวงจร',
  'หลอดไฟฟลูออเรสเซนต์ชำรุด',
  'หลอด LED ชำรุด',
  'ไฟไม่ติดทั้งแนว/ดับทั้งซอย',
  'บัลลาสต์/สตาร์ทเตอร์เสีย',
  'เสาไฟเอียง/มีอันตราย',
  'กิ่งไม้พาดสายไฟ'
];

const COMMON_COMMUNITIES = [
  'บางจาก',
  'มุสลิมปากคลอง',
  'สมุทรเจดีย์',
  'ก้นปึก-ปากคลอง',
  'ริมน้ำ-ท่าเกตุ',
  'วัดโขดทิมทาราม',
  'ท่าบรรทุก',
  'ปากน้ำระยอง',
  'เนินพระ'
];

const COMMON_TECHNICIANS = [
  'ช่างหมู',
  'พี่แบงค์',
  'ภาณุทัศน์ อุปถัมภ์',
  'พัชรพงศ์ พูลสุข',
  'ทีมบำรุงรักษา ระยอง'
];

export default function WorkOrderReport({ records, onSyncNewRecord, theme }: WorkOrderReportProps) {
  // Saved work orders in current draft batch
  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>(() => {
    try {
      const saved = localStorage.getItem('rayong_work_orders_draft');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    // Default initial mock items from pending records if empty
    const pendingOnes = records.filter(r => r.status === 'รอซ่อม' || !r.status).slice(0, 3);
    if (pendingOnes.length > 0) {
      return pendingOnes.map((p, idx) => ({
        id: `WO-${Date.now()}-${idx}`,
        poleId: p.poleId || `POLE-${idx + 1}`,
        issue: p.issue || 'หลอดไฟดับ',
        community: p.community || 'บางจาก',
        soi: p.soi || 'ถนน อดุลย์ธรรมประภาส',
        location: p.location || '',
        lat: p.lat,
        lng: p.lng,
        technician: p.technician || 'ช่างหมู',
        urgency: 'ด่วน',
        remarks: p.remarks || 'ตรวจสอบอุปกรณ์ไฟฟ้าหน้างาน',
        orderDate: new Date().toISOString().split('T')[0],
        isFromExisting: true,
      }));
    }
    return [];
  });

  // Save draft whenever it changes
  useEffect(() => {
    localStorage.setItem('rayong_work_orders_draft', JSON.stringify(workOrders));
  }, [workOrders]);

  // Form input states
  const [poleId, setPoleId] = useState('');
  const [issue, setIssue] = useState('');
  const [community, setCommunity] = useState('');
  const [soi, setSoi] = useState('');
  const [location, setLocation] = useState('');
  const [gpsStr, setGpsStr] = useState('');
  const [technician, setTechnician] = useState('');
  const [urgency, setUrgency] = useState<'ปกติ' | 'ด่วน' | 'ด่วนที่สุด'>('ปกติ');
  const [remarks, setRemarks] = useState('');
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportNumber, setReportNumber] = useState(() => {
    const today = new Date();
    const y = today.getFullYear() + 543;
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `WO-${y}${m}${d}-01`;
  });

  // UI state
  const [copiedLine, setCopiedLine] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSelectedIds, setImportSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'preview'>('create');

  // Handle adding new item to work order list
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();

    let lat: number | null = null;
    let lng: number | null = null;
    if (gpsStr.trim()) {
      const parts = gpsStr.split(/[\s,]+/);
      if (parts.length >= 2) {
        lat = parseFloat(parts[0]) || null;
        lng = parseFloat(parts[1]) || null;
      }
    }

    const newItem: WorkOrderItem = {
      id: `WO-${Date.now()}`,
      poleId: poleId.trim() || '-',
      issue: issue.trim() || '-',
      community: community.trim(),
      soi: soi.trim(),
      location: location.trim(),
      lat,
      lng,
      technician: technician.trim() || 'ทีมซ่อมบำรุง',
      urgency,
      remarks: remarks.trim(),
      orderDate,
    };

    setWorkOrders(prev => [newItem, ...prev]);

    // Reset some form inputs for rapid entry
    setPoleId('');
    setIssue('');
    setLocation('');
    setRemarks('');
    setGpsStr('');
  };

  // Remove item
  const handleRemoveItem = (id: string) => {
    setWorkOrders(prev => prev.filter(item => item.id !== id));
  };

  // Clear all
  const handleClearAll = () => {
    if (confirm('ยืนยันล้างรายการส่งช่างทั้งหมดในชุดนี้หรือไม่?')) {
      setWorkOrders([]);
    }
  };

  // Import pending records from sheet
  const handleImportPending = () => {
    const pendingRecords = records.filter(r => r.status === 'รอซ่อม' || !r.status);
    const toAdd: WorkOrderItem[] = [];

    pendingRecords.forEach((r, idx) => {
      // Check if already in work orders
      if (!workOrders.some(w => w.poleId === r.poleId)) {
        toAdd.push({
          id: `WO-${Date.now()}-${idx}`,
          poleId: r.poleId || `POLE-${idx + 1}`,
          issue: r.issue || 'รอซ่อมบำรุง',
          community: r.community || '',
          soi: r.soi || '',
          location: r.location || '',
          lat: r.lat,
          lng: r.lng,
          technician: r.technician || 'ทีมซ่อมบำรุง',
          urgency: 'ด่วน',
          remarks: r.remarks || 'ดึงจากระบบรับเรื่องแจ้งซ่อม',
          orderDate: new Date().toISOString().split('T')[0],
          isFromExisting: true,
        });
      }
    });

    if (toAdd.length === 0) {
      alert('รายการแจ้งซ่อมที่รอดำเนินการถูกเพิ่มไว้ในชุดงานครบแล้ว');
      return;
    }

    setWorkOrders(prev => [...toAdd, ...prev]);
    alert(`นำเข้างานที่รอดำเนินการ ${toAdd.length} งาน เข้ารายการเรียบร้อยแล้ว`);
  };

  // Format summary text for LINE Messenger
  const handleCopyForLine = () => {
    if (workOrders.length === 0) {
      alert('ไม่มีรายการงานในชุดสำหรับคัดลอก');
      return;
    }

    const todayThai = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let text = `🛠️ *ใบสั่งงานซ่อมไฟฟ้าสาธารณะ เทศบาลนครระยอง*\n`;
    text += `📋 *เลขที่ใบงาน:* ${reportNumber}\n`;
    text += `📅 *วันที่:* ${todayThai}\n`;
    text += `📌 *รวมงานทั้งหมด:* ${workOrders.length} รายการ\n`;
    text += `------------------------------------\n`;

    workOrders.forEach((w, index) => {
      const urgencyEmoji = w.urgency === 'ด่วนที่สุด' ? '🚨' : w.urgency === 'ด่วน' ? '⚡' : '🔧';
      text += `\n${index + 1}. ${urgencyEmoji} *รหัสเสาไฟ: ${w.poleId}* [${w.urgency}]\n`;
      text += `   ⚠️ *อาการชำรุด:* ${w.issue}\n`;
      if (w.community || w.soi) {
        text += `   📍 *สถานที่:* ${w.community ? `ชุมชน${w.community} ` : ''}${w.soi ? `ซอย${w.soi} ` : ''}\n`;
      }
      if (w.location) {
        text += `   🧭 *จุดสังเกต:* ${w.location}\n`;
      }
      if (w.technician) {
        text += `   👷 *ผู้รับผิดชอบ:* ${w.technician}\n`;
      }
      if (w.lat && w.lng) {
        text += `   🗺️ *แผนที่นำทาง:* https://maps.google.com/?q=${w.lat},${w.lng}\n`;
      }
      if (w.remarks) {
        text += `   📝 *หมายเหตุ:* ${w.remarks}\n`;
      }
      text += `------------------------------------\n`;
    });

    text += `\nฝ่ายสาธารณูปโภค ส่วนการโยธา สำนักช่าง เทศบาลนครระยอง`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedLine(true);
      setTimeout(() => setCopiedLine(false), 3000);
    });
  };

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#1E293B] border border-slate-700/80 rounded-2xl p-4 sm:p-5 gap-4 shadow-sm no-print">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Printer size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                ระบบออกรายงาน & ใบสั่งงานส่งช่างหน้างาน
              </h2>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                {workOrders.length} งานในชุด
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              กรอกข้อมูลเพื่อจัดชุดงาน พิมพ์ใบงาน A4 ส่งช่าง หรือคัดลอกสรุปส่ง LINE กลุ่มช่างได้ทันที
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Quick Import Button */}
          <button
            type="button"
            onClick={handleImportPending}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="ดึงงานที่รอซ่อมจากระบบมาใส่ในใบงาน"
          >
            <ListPlus size={15} className="text-amber-400" />
            <span>ดึงงานรอซ่อม ({records.filter(r => r.status === 'รอซ่อม' || !r.status).length})</span>
          </button>

          {/* Copy LINE Summary Button */}
          <button
            type="button"
            onClick={handleCopyForLine}
            disabled={workOrders.length === 0}
            className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            title="คัดลอกสรุปรายการงานทั้งหมดในรูปแบบส่งเข้า LINE ช่าง"
          >
            {copiedLine ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
            <span>{copiedLine ? 'คัดลอกแล้ว!' : 'คัดลอกส่ง LINE'}</span>
          </button>

          {/* Print A4 Button */}
          <button
            type="button"
            onClick={handlePrint}
            disabled={workOrders.length === 0}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-600/25"
            title="พิมพ์ใบสั่งงานราชการ A4"
          >
            <Printer size={16} />
            <span>พิมพ์ใบสั่งงานช่าง (A4)</span>
          </button>

          {workOrders.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-500/20 transition-colors cursor-pointer"
              title="ล้างรายการงานทั้งหมดในชุดนี้"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Content Grid (Input Form + Work Orders Queue) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start no-print">
        {/* Left Column: Form to Enter New Maintenance Item (5/12) */}
        <div className="xl:col-span-5 bg-[#1E293B] border border-slate-700/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-700/80 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus size={18} className="text-emerald-400" />
              <h3 className="text-base font-bold text-slate-100">
                กรอกข้อมูลเพิ่มเข้ารายการซ่อมบำรุง
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              ฟอร์มหัวข้อคอลัมน์
            </span>
          </div>

          <form onSubmit={handleAddItem} className="space-y-4">
            {/* 1. Pole ID & Urgency */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  รหัสโคมไฟ / เสาไฟ
                </label>
                <input
                  type="text"
                  placeholder="เช่น f687cdf9 หรือ เสา #12"
                  value={poleId}
                  onChange={(e) => setPoleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  ระดับความเร่งด่วน
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="ปกติ">ปกติ (Normal)</option>
                  <option value="ด่วน">⚡ ด่วน (Urgent)</option>
                  <option value="ด่วนที่สุด">🚨 ด่วนที่สุด (Critical)</option>
                </select>
              </div>
            </div>

            {/* 2. Issue / Problem */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>ปัญหา / อาการชำรุดที่พบ</span>
                <span className="text-[10px] text-slate-400">เลือกจากตัวเลือกลัด หรือพิมพ์เอง</span>
              </label>
              <input
                type="text"
                placeholder="ระบุอาการชำรุด เช่น เบรคเกอร์ทริป, หลอดแตก"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
              {/* Quick Issue Chips */}
              <div className="flex flex-wrap gap-1 pt-1">
                {COMMON_ISSUES.slice(0, 5).map((iss) => (
                  <button
                    key={iss}
                    type="button"
                    onClick={() => setIssue(iss)}
                    className="text-[10px] px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors cursor-pointer"
                  >
                    {iss}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Community & Soi */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  ชุมชน / เขต
                </label>
                <input
                  type="text"
                  placeholder="เช่น บางจาก, มุสลิมปากคลอง"
                  value={community}
                  onChange={(e) => setCommunity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  list="community-list"
                />
                <datalist id="community-list">
                  {COMMON_COMMUNITIES.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  ซอย / ถนน
                </label>
                <input
                  type="text"
                  placeholder="เช่น ถนน อดุลย์ธรรมประภาส"
                  value={soi}
                  onChange={(e) => setSoi(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* 4. Location Landmark & GPS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  จุดสังเกต / สถานที่อ้างอิง
                </label>
                <input
                  type="text"
                  placeholder="เช่น หน้าบ้านเลขที่ 12/3, ปากซอย"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>พิกัด GPS</span>
                  <span className="text-[10px] text-slate-500 font-mono">lat, lng</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น 12.67316, 101.27075"
                  value={gpsStr}
                  onChange={(e) => setGpsStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* 5. Technician & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  ช่างผู้รับผิดชอบ
                </label>
                <input
                  type="text"
                  placeholder="ระบุชื่อช่าง"
                  value={technician}
                  onChange={(e) => setTechnician(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  list="technician-list"
                />
                <datalist id="technician-list">
                  {COMMON_TECHNICIANS.map(t => <option key={t} value={t} />)}
                </datalist>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  วันที่สั่งงาน / ดำเนินการ
                </label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* 6. Remarks / Materials to prepare */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                หมายเหตุ / อะไหล่และอุปกรณ์ที่ต้องเตรียมไป
              </label>
              <textarea
                rows={2}
                placeholder="เช่น เตรียมหลอด LED T8, บันไดสไลด์ 6 ขั้น, ถุงมือฉนวน"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>เพิ่มเข้ารายการซ่อมบำรุง</span>
            </button>
          </form>
        </div>

        {/* Right Column: Work Order Dispatch Queue (7/12) */}
        <div className="xl:col-span-7 bg-[#1E293B] border border-slate-700/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-700/80 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-blue-400" />
              <h3 className="text-base font-bold text-slate-100">
                รายการซ่อมบำรุง ({workOrders.length} งาน)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">เลขที่:</span>
              <input
                type="text"
                value={reportNumber}
                onChange={(e) => setReportNumber(e.target.value)}
                className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-xs text-blue-400 font-mono font-bold w-36 text-center"
                title="เลขที่ใบสั่งงาน สามารถแก้ไขได้"
              />
            </div>
          </div>

          {workOrders.length === 0 ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500">
                <FileText size={28} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-300">ยังไม่มีรายการงานในชุดนี้</p>
                <p className="text-xs text-slate-500 max-w-sm">
                  กรอกข้อมูลผ่านฟอร์มทางซ้าย หรือกดปุ่ม "ดึงงานรอซ่อม" เพื่อนำรายการที่ค้างอยู่ในระบบเข้ามาจัดชุดพิมพ์
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
              {workOrders.map((item, index) => {
                const urgencyColor = 
                  item.urgency === 'ด่วนที่สุด' 
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' 
                    : item.urgency === 'ด่วน' 
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' 
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                  >
                    {/* Number & Pole details */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-blue-400 text-sm">
                            {item.poleId}
                          </span>
                          <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold border ${urgencyColor}`}>
                            {item.urgency}
                          </span>
                          {item.technician && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-sans">
                              <User size={11} className="text-slate-500" />
                              {item.technician}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-white font-medium">
                          {item.issue}
                        </p>

                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                          <MapPin size={11} className="text-rose-400 shrink-0" />
                          <span>
                            {item.community ? `ชุมชน${item.community} ` : ''}
                            {item.soi ? `ซอย${item.soi} ` : ''}
                            {item.location ? `(${item.location})` : ''}
                          </span>
                        </div>

                        {item.remarks && (
                          <p className="text-[10px] text-slate-500 italic">
                            หมายเหตุ: {item.remarks}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions on right */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {item.lat && item.lng && (
                        <a
                          href={`https://maps.google.com/?q=${item.lat},${item.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-emerald-400 border border-slate-800 transition-colors"
                          title="ดูพิกัดบน Google Maps"
                        >
                          <Navigation size={13} />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors cursor-pointer"
                        title="ลบออกจากชุดงาน"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. A4 Print-Ready Document Preview (Shown on screen as preview, and perfectly styled for print) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1 no-print">
          <div className="flex items-center gap-2">
            <Printer size={16} className="text-blue-400" />
            <h3 className="text-sm font-bold text-slate-200">
              ตัวอย่างเอกสารใบสั่งงาน A4 (Print Preview)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            เอกสารพร้อมพิมพ์ตามมาตรฐานงานราชการเทศบาลนครระยอง
          </span>
        </div>

        {/* The Printable A4 Sheet */}
        <div 
          id="printable-work-order" 
          className="bg-white text-slate-900 rounded-2xl p-4 sm:p-6 shadow-xl border border-slate-200 max-w-5xl mx-auto printable-area font-sans"
        >
          {/* Header of Official Document (Compact & Streamlined) */}
          <div className="border-b-2 border-slate-800 pb-2 mb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo.png" 
                  alt="ตราเทศบาลนครระยอง" 
                  className="w-10 h-10 object-contain shrink-0"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div>
                  <div className="flex items-baseline gap-2">
                    <h1 className="text-sm font-extrabold text-slate-950 font-sans leading-tight">
                      ใบสั่งงานซ่อมบำรุงไฟฟ้าสาธารณะ
                    </h1>
                    <span className="text-[11px] font-semibold text-slate-700 font-sans">
                      ฝ่ายสาธารณูปโภค ส่วนการโยธา สำนักช่าง เทศบาลนครระยอง
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    เอกสารมอบหมายช่างตรวจสอบ ซ่อมแซม และบันทึกผลการปฏิบัติงานหน้างาน
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="flex items-center gap-2 justify-end">
                  <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-[11px] text-slate-800">
                    เลขที่: {reportNumber}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-800">
                    วันที่: {new Date(orderDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="text-[10px] text-slate-600 font-medium mt-0.5">
                  จำนวนงานในใบงานนี้: <span className="font-bold text-slate-900">{workOrders.length}</span> รายการ
                </div>
              </div>
            </div>
          </div>

          {/* Table of Jobs (High-Density Multi-Job Layout) */}
          {workOrders.length === 0 ? (
            <div className="py-8 text-center text-slate-400 border border-dashed border-slate-300 rounded-lg text-xs">
              ยังไม่มีรายการแจ้งซ่อมในใบงานนี้ (กดเพิ่มรายการจากฟอร์มทางซ้าย หรือกดปุ่ม "ดึงงานรอซ่อมจากระบบ")
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse border border-slate-400">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-400">
                    <th className="py-1 px-1.5 text-center border-r border-slate-400 w-8">ที่</th>
                    <th className="py-1 px-2 border-r border-slate-400 w-24">รหัสเสาไฟ</th>
                    <th className="py-1 px-2 border-r border-slate-400">สถานที่ / ชุมชน / ซอย / จุดสังเกต</th>
                    <th className="py-1 px-2 border-r border-slate-400 w-44">ปัญหา / อาการชำรุด</th>
                    <th className="py-1 px-1.5 border-r border-slate-400 w-20 text-center">พิกัด GPS</th>
                    <th className="py-1 px-2 border-r border-slate-400 w-20 text-center">ช่าง</th>
                    <th className="py-1 px-2 border-slate-400 w-48">ผลการซ่อม / อะไหล่ที่ใช้ (บันทึกหน้างาน)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {workOrders.map((job, idx) => (
                    <tr key={job.id} className="hover:bg-slate-50/50">
                      <td className="py-1 px-1.5 text-center font-bold font-mono border-r border-slate-300 text-slate-700">
                        {idx + 1}
                      </td>
                      <td className="py-1 px-2 font-mono font-bold text-slate-900 border-r border-slate-300 whitespace-nowrap">
                        {job.poleId}
                        {job.urgency === 'ด่วนที่สุด' && (
                          <span className="block text-[8.5px] text-red-600 font-sans font-bold leading-none mt-0.5">[ด่วนที่สุด]</span>
                        )}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-300 leading-tight">
                        <div className="font-semibold text-slate-900">
                          {job.community ? `ชุมชน${job.community}` : ''} {job.soi ? `ซอย${job.soi}` : ''}
                        </div>
                        {job.location && (
                          <div className="text-[10px] text-slate-600 line-clamp-1">จุดสังเกต: {job.location}</div>
                        )}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-300 leading-tight">
                        <div className="font-medium text-slate-900">{job.issue}</div>
                        {job.remarks && (
                          <div className="text-[9.5px] text-slate-500 italic line-clamp-1">หมายเหตุ: {job.remarks}</div>
                        )}
                      </td>
                      <td className="py-1 px-1.5 text-center font-mono text-[9px] text-slate-600 border-r border-slate-300 whitespace-nowrap">
                        {job.lat && job.lng ? (
                          <div>
                            <div>{job.lat.toFixed(4)}</div>
                            <div>{job.lng.toFixed(4)}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-1 px-2 text-center font-medium border-r border-slate-300 text-slate-800 text-[10.5px] whitespace-nowrap">
                        {job.technician || '-'}
                      </td>
                      {/* Blank space for technicians to write on paper */}
                      <td className="py-1 px-2 bg-slate-50/40">
                        <div className="h-5 border-b border-dashed border-slate-400/80"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Minimal Document Footer (No signature boxes) */}
          <div className="mt-2.5 pt-1.5 border-t border-slate-300 flex items-center justify-between text-[9.5px] text-slate-500 font-sans">
            <span>* รายการใบสั่งงานบำรุงรักษาไฟฟ้าสาธารณะ เทศบาลนครระยอง (ฝ่ายสาธารณูปโภค ส่วนการโยธา)</span>
            <span>จัดพิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
