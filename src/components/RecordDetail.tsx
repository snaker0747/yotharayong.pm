import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, MapPin, Calendar, User, CheckCircle2, Clock, 
  Hourglass, AlertTriangle, ExternalLink, Navigation, 
  Database, Image as ImageIcon, HelpCircle, Edit3, Trash2,
  ChevronDown, Wrench
} from 'lucide-react';
import { MaintenanceRecord } from '../sheetsService';

interface DetailProps {
  record: MaintenanceRecord | null;
  appName?: string;
  tableName?: string;
  onEdit?: (record: MaintenanceRecord) => void;
  onDelete?: (historyId: string) => Promise<any>;
  onClose: () => void;
}

export default function RecordDetail({ record, appName = '', tableName = '', onEdit, onDelete, onClose }: DetailProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  if (!record) return null;

  const getStatusBadgeLarge = (status: string, statusThai: string) => {
    const isCompleted = status === 'Completed' || statusThai === 'เสร็จสิ้น' || statusThai === 'ซ่อมเสร็จสิ้น';
    if (isCompleted) {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 size={13} />
          เสร็จสิ้น
        </span>
      );
    }
    switch (status) {
      case 'In Progress':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Hourglass size={13} className="animate-spin-slow" />
            {statusThai || 'กำลังดำเนินการ'}
          </span>
        );
      case 'Waiting for Parts':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
            <AlertTriangle size={13} />
            {statusThai || 'รออะไหล่/วัสดุ'}
          </span>
        );
      case 'Pending':
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <Clock size={13} />
            {statusThai || 'รอดำเนินการ'}
          </span>
        );
    }
  };

  // Safe Google Sheets image preview link converter
  const getImageUrl = (url: string) => {
    if (!url) return '';
    // Handle drive links and convert to previewable web Content links if needed
    if (url.includes('drive.google.com')) {
      const match = url.match(/id=([^&]+)/) || url.match(/\/file\/d\/([^/]+)/);
      if (match && match[1]) {
        return `https://docs.google.com/uc?export=view&id=${match[1]}`;
      }
    }
    // If it's a relative path (AppSheet image) and appName is provided
    if (url && !url.startsWith('http') && appName) {
       return `https://www.appsheet.com/template/gettablefileurl?appName=${encodeURIComponent(appName)}&tableName=${encodeURIComponent(tableName)}&fileName=${encodeURIComponent(url)}`;
    }
    return url;
  };

  // Look up Community name from raw sheet values
  const getCommunityValue = (rec: MaintenanceRecord) => {
    if (rec.community) return rec.community;
    if (!rec.raw) return '-';
    const keys = Object.keys(rec.raw);
    const communityKey = keys.find(k => k.trim().includes('ชุมชน') || k.trim().toLowerCase().includes('community') || k.trim().includes('เขต'));
    if (communityKey && rec.raw[communityKey]) {
      return rec.raw[communityKey];
    }
    return '-';
  };

  // Look up Soi / alley name from raw sheet values
  const getSoiValue = (rec: MaintenanceRecord) => {
    if (rec.soi) return rec.soi;
    if (!rec.raw) return '-';
    const keys = Object.keys(rec.raw);
    const soiKey = keys.find(k => k.trim().includes('ซอย') || k.trim().toLowerCase() === 'soi');
    if (soiKey && rec.raw[soiKey]) {
      return rec.raw[soiKey];
    }
    return '-';
  };

  const previewImage = getImageUrl(record.imageUrl);
  const communityVal = getCommunityValue(record);
  const soiVal = getSoiValue(record);
  const locationDisplay = [communityVal, soiVal].filter(v => v && v !== '-').join(' - ') || record.location || 'ไม่ระบุสถานที่';

  return (
    <div className="bg-[#1E293B] flex flex-col h-full max-h-[92vh] overflow-hidden" id="record-detail-panel">
      {/* Top Banner with Actions */}
      <div className="flex justify-between items-center px-4 sm:px-5 py-3.5 bg-slate-900/80 border-b border-slate-700/80 gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Database size={16} />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-slate-100 font-sans tracking-tight">
              รายละเอียดรายงานการซ่อมบำรุง
            </h4>
            <span className="text-[11px] font-mono text-slate-400">
              ID: #{record.id}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(record)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/20 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="แก้ไขข้อมูลรายการนี้ (เปิด Popup)"
            >
              <Edit3 size={13} />
              <span>แก้ไข</span>
            </button>
          )}

          {onDelete && (
            <button
              onClick={async () => {
                const historyId = (record.raw?.['ID ประวัติ'] || record.id || '').trim();
                const label = record.poleId || record.issue || 'รายการนี้';
                if (!confirm(`ยืนยันลบรายการเสาไฟ "${label}" ออกจากระบบและ Google Sheet หรือไม่?`)) {
                  return;
                }
                setIsDeleting(true);
                try {
                  await onDelete(historyId);
                  onClose();
                } catch (err) {
                  console.error('Delete failed:', err);
                } finally {
                  setIsDeleting(false);
                }
              }}
              disabled={isDeleting}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="ลบรายการนี้ออกจากระบบและ Google Sheet"
            >
              <Trash2 size={13} className={isDeleting ? 'animate-spin' : ''} />
              <span>{isDeleting ? 'กำลังลบ...' : 'ลบ'}</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="ปิดหน้าต่างนี้"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Balanced, Proportional Pad Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {/* 1. Pole ID & Status Hero Card */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-sans font-medium">หมายเลขเสาไฟ / รหัสโคมไฟ</span>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-extrabold text-blue-400 font-mono tracking-tight">
                {record.poleId || 'ไม่ระบุรหัสเสา'}
              </h3>
              {record.raw?.['ID ประวัติ'] && (
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 font-mono text-slate-400">
                  ประวัติ #{record.raw['ID ประวัติ']}
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 self-start sm:self-center">
            {getStatusBadgeLarge(record.status, record.statusThai)}
          </div>
        </div>

        {/* 2. Photo Section (Balanced 16:9 or sleek compact placeholder) */}
        {previewImage ? (
          <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-slate-700 bg-slate-950 group shadow-md">
            <img
              src={previewImage}
              alt={`เสาไฟ ${record.poleId}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-2.5 left-2.5 bg-slate-950/85 backdrop-blur-sm px-2.5 py-1 rounded-md text-[10px] font-mono text-slate-200 flex items-center gap-1.5 border border-slate-800">
              <ImageIcon size={12} className="text-emerald-400" />
              <span>ภาพถ่ายหน้างาน</span>
            </div>
            <a
              href={previewImage}
              target="_blank"
              referrerPolicy="no-referrer"
              rel="noopener noreferrer"
              className="absolute bottom-2.5 right-2.5 bg-slate-900/90 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 text-xs font-semibold backdrop-blur-sm border border-slate-700 shadow-lg"
            >
              <ExternalLink size={12} />
              <span>ดูรูปขนาดเต็ม</span>
            </a>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 flex items-center justify-between text-xs text-slate-400 gap-2">
            <div className="flex items-center gap-2">
              <ImageIcon size={16} className="text-slate-500 shrink-0" />
              <span>ไม่มีไฟล์รูปภาพแนบในรายงาน</span>
            </div>
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(record)}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Edit3 size={12} />
                <span>แนบรูป</span>
              </button>
            )}
          </div>
        )}

        {/* 3. Problem & Repair Action Cards (Balanced Side-by-Side or Stack) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* อาการชำรุดที่พบ */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 uppercase">
              <AlertTriangle size={13} className="shrink-0" />
              <span>ปัญหาที่พบ / อาการชำรุด</span>
            </span>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans font-medium flex-1 pt-0.5">
              {record.issue || '-'}
            </p>
          </div>

          {/* การซ่อมบำรุงแก้ไข */}
          <div className={`rounded-xl p-3.5 space-y-1.5 flex flex-col justify-between border ${
            record.repairAction 
              ? 'bg-emerald-950/20 border-emerald-900/40' 
              : 'bg-slate-950/50 border-slate-800/80'
          }`}>
            <span className={`text-[11px] font-bold flex items-center gap-1.5 uppercase ${
              record.repairAction ? 'text-emerald-400' : 'text-slate-400'
            }`}>
              <CheckCircle2 size={13} className="shrink-0" />
              <span>การซ่อมบำรุงแก้ไข</span>
            </span>
            <p className={`text-xs sm:text-sm leading-relaxed font-sans font-medium flex-1 pt-0.5 ${
              record.repairAction ? 'text-emerald-300' : 'text-slate-500'
            }`}>
              {record.repairAction || 'ยังไม่มีบันทึกการซ่อมบำรุงแก้ไข'}
            </p>
          </div>
        </div>

        {/* 4. Balanced 2x2 Info Grid (Technician, Date, Location, GPS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* ช่างผู้รับผิดชอบ */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 space-y-1">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <User size={12} className="text-blue-400" />
              <span>ช่างผู้รับผิดชอบ</span>
            </span>
            <p className="text-xs sm:text-sm font-semibold text-slate-100 truncate font-sans" title={record.technician}>
              {record.technician || 'รอมอบหมาย'}
            </p>
          </div>

          {/* วันที่ดำเนินการ */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 space-y-1">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Calendar size={12} className="text-blue-400" />
              <span>วันที่ดำเนินการ</span>
            </span>
            <p className="text-xs sm:text-sm font-semibold text-slate-100 font-mono" title={record.fixedDate}>
              {record.fixedDate || (record.timestamp ? record.timestamp.split(' ')[0] : '-')}
            </p>
          </div>

          {/* สถานที่ / ชุมชน / ซอย */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 space-y-1">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <MapPin size={12} className="text-rose-400" />
              <span>ชุมชน / ซอย</span>
            </span>
            <p className="text-xs sm:text-sm font-semibold text-slate-100 truncate font-sans" title={locationDisplay}>
              {locationDisplay}
            </p>
          </div>

          {/* พิกัด GPS & แผนที่ */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 space-y-1 flex flex-col justify-between">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Navigation size={12} className="text-emerald-400" />
              <span>พิกัด GPS</span>
            </span>
            {record.lat && record.lng ? (
              <div className="flex items-center justify-between gap-1 text-xs font-mono">
                <span className="text-slate-300 truncate">{record.lat.toFixed(4)}, {record.lng.toFixed(4)}</span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${record.lat},${record.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10.5px] font-bold border border-emerald-500/30 flex items-center gap-1 transition-colors shrink-0"
                >
                  <span>แผนที่</span>
                  <ExternalLink size={10} />
                </a>
              </div>
            ) : (
              <span className="text-xs text-slate-500 font-sans">ไม่มีพิกัด GPS</span>
            )}
          </div>
        </div>

        {/* 5. Remarks box (Shown cleanly if remarks exist) */}
        {record.remarks && record.remarks !== '-' && (
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase font-sans">
              หมายเหตุเพิ่มเติม (Remarks)
            </span>
            <p className="text-xs text-slate-300 leading-relaxed font-sans italic">
              {record.remarks}
            </p>
          </div>
        )}

        {/* 6. Primary Action Button (Bottom) */}
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(record)}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 transition-all cursor-pointer"
          >
            <Edit3 size={15} />
            <span>แก้ไขข้อมูลและอัปเดตลง Google Sheet</span>
          </button>
        )}

        {/* 7. Collapsible Google Sheet Raw Data */}
        <details className="group border border-slate-800 rounded-xl overflow-hidden bg-slate-950/30">
          <summary className="flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer select-none">
            <div className="flex items-center gap-2">
              <Database size={13} className="text-slate-500" />
              <span>ข้อมูลทั้งหมดจาก Google Sheet ({Object.keys(record.raw || {}).length} รายการ)</span>
            </div>
            <ChevronDown size={14} className="group-open:rotate-180 transition-transform text-slate-500" />
          </summary>
          <div className="p-3 border-t border-slate-800/80 font-mono text-[11px] space-y-1.5 max-h-[160px] overflow-y-auto">
            {Object.entries(record.raw || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between items-start gap-4 border-b border-slate-900/80 pb-1 last:border-0 last:pb-0">
                <span className="text-slate-500 text-[11px] truncate max-w-[160px]" title={key}>{key}:</span>
                <span className="text-slate-300 text-right word-break break-all max-w-[220px]">{value || '-'}</span>
              </div>
            ))}
          </div>
        </details>

        {/* 8. Live Sync Footer Note */}
        <div className="text-xs font-sans text-slate-400 bg-slate-950/20 border border-slate-800/40 p-2.5 rounded-xl flex items-center gap-2">
          <HelpCircle size={14} className="text-emerald-400/80 shrink-0" />
          <span className="text-[11px] text-slate-400">
            ระบบเชื่อมโยงสดเรียลไทม์กับ Google Sheet และ AppSheet อัตโนมัติ
          </span>
        </div>
      </div>
    </div>
  );
}
