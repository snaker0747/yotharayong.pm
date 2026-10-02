import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, MapPin, Calendar, User, CheckCircle2, Clock, 
  Hourglass, AlertTriangle, ExternalLink, Navigation, 
  Database, Image as ImageIcon, HelpCircle, Edit3, Trash2
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
    switch (status) {
      case 'Completed':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 size={12} />
            {statusThai || 'ซ่อมเสร็จสิ้น'}
          </span>
        );
      case 'In Progress':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Hourglass size={12} className="animate-spin-slow" />
            {statusThai || 'กำลังดำเนินการ'}
          </span>
        );
      case 'Waiting for Parts':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
            <AlertTriangle size={12} />
            {statusThai || 'รออะไหล่/วัสดุ'}
          </span>
        );
      case 'Pending':
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <Clock size={12} />
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
    if (!rec.raw) return '-';
    const keys = Object.keys(rec.raw);
    const soiKey = keys.find(k => k.trim().includes('ซอย') || k.trim().toLowerCase() === 'soi');
    if (soiKey && rec.raw[soiKey]) {
      return rec.raw[soiKey];
    }
    return '-';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />;
      case 'In Progress':
        return <Hourglass size={13} className="text-blue-400 shrink-0" />;
      case 'Waiting for Parts':
        return <AlertTriangle size={13} className="text-orange-400 shrink-0" />;
      default:
        return <Clock size={13} className="text-rose-400 shrink-0" />;
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'text-emerald-400';
      case 'In Progress':
        return 'text-blue-400';
      case 'Waiting for Parts':
        return 'text-orange-400';
      default:
        return 'text-rose-400';
    }
  };

  const previewImage = getImageUrl(record.imageUrl);

  return (
    <div className="bg-[#1E293B] border border-slate-700/80 rounded-2xl overflow-hidden flex flex-col h-full shadow-2xl relative" id="record-detail-panel">
      {/* Top Banner with Actions */}
      <div className="flex justify-between items-center px-4 sm:px-5 py-3 bg-slate-900/60 border-b border-slate-700/80 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <Database size={16} />
          </div>
          <span className="text-sm sm:text-base font-bold text-slate-100 font-sans tracking-tight">
            รายละเอียดรายงานการซ่อมบำรุง
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(record)}
              className="px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="แก้ไขข้อมูลรายการนี้"
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
              className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="ลบรายการนี้ออกจากระบบและ Google Sheet"
            >
              <Trash2 size={13} className={isDeleting ? 'animate-spin' : ''} />
              <span>{isDeleting ? 'กำลังลบ...' : 'ลบ'}</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="ปิดหน้าต่างนี้"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {/* Balanced 2-Column Grid (Eliminates the empty gap below photo) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {/* Left Column: Image + Defect Details + Repair Action */}
          <div className="space-y-3">
            {/* Image Preview */}
            {previewImage ? (
              <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden border border-slate-700 bg-slate-950 group shadow-md">
                <img
                  src={previewImage}
                  alt={`Pole ${record.poleId} Issue`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2 left-2 bg-slate-950/85 backdrop-blur-sm px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-300 flex items-center gap-1.5 border border-slate-800">
                  <ImageIcon size={11} className="text-emerald-400" />
                  IMAGE ATTACHED
                </div>
                <a
                  href={previewImage}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  rel="noopener noreferrer"
                  className="absolute bottom-2 right-2 bg-slate-900/90 hover:bg-blue-600 text-white px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 text-[11px] font-semibold backdrop-blur-sm border border-slate-700"
                >
                  <ExternalLink size={12} />
                  ดูรูปขนาดเต็ม
                </a>
              </div>
            ) : (
              <div className="aspect-[16/10] w-full rounded-xl border border-dashed border-slate-700 bg-slate-950/50 flex flex-col items-center justify-center text-center text-slate-500 p-4">
                <ImageIcon size={24} className="text-slate-600 mb-1" />
                <span className="text-xs font-sans">ไม่มีไฟล์รูปภาพแนบในรายงาน</span>
              </div>
            )}

            {/* Defect Details box (Placed directly under photo to fill the previous void) */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase font-sans flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-amber-400" />
                อาการชำรุดที่พบ (Defect Details)
              </span>
              <div className="text-xs text-slate-200 bg-slate-950/40 border border-slate-800/80 p-2.5 rounded-xl font-sans leading-relaxed min-h-[44px]">
                {record.issue || '-'}
              </div>
            </div>

            {/* Repair Action (if any) */}
            {record.repairAction && (
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-emerald-400 uppercase font-sans flex items-center gap-1.5">
                  <CheckCircle2 size={12} />
                  การซ่อมบำรุงแก้ไข (Repair Action)
                </span>
                <div className="text-xs text-emerald-300 bg-emerald-950/20 border border-emerald-900/40 p-2.5 rounded-xl font-sans leading-relaxed">
                  {record.repairAction}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Status + Pole ID + Technician & Date + Location & GPS + Remarks */}
          <div className="space-y-3">
            {/* Header: Pole ID & Status Pill */}
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 font-sans font-medium">หมายเลขเสาไฟ</span>
                {getStatusBadgeLarge(record.status, record.statusThai)}
              </div>
              <h3 className="text-xl font-extrabold text-blue-400 font-mono tracking-tight">
                {record.poleId}
              </h3>
            </div>

            {/* Technician & Date Grid */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-sans flex items-center gap-1">
                  <User size={11} className="text-slate-500" /> ช่างผู้รับผิดชอบ
                </span>
                <p className="text-xs font-semibold text-slate-200 truncate font-sans" title={record.technician}>
                  {record.technician || '-'}
                </p>
              </div>
              
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-sans flex items-center gap-1">
                  <Calendar size={11} className="text-slate-500" /> วันที่ดำเนินการ
                </span>
                <p className="text-xs font-semibold text-slate-200 truncate font-sans" title={record.fixedDate}>
                  {record.fixedDate || '-'}
                </p>
              </div>
            </div>

            {/* Location & GPS */}
            <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-sans flex items-center gap-1">
                <MapPin size={12} className="text-rose-400" /> รายละเอียดสถานที่
              </span>
              <div className="space-y-1 text-slate-300 font-sans">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium shrink-0">ชุมชน:</span>
                  <span className="text-white font-semibold truncate">{getCommunityValue(record)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium shrink-0">ซอย:</span>
                  <span className="text-slate-200 truncate">{getSoiValue(record)}</span>
                </div>
                {record.location && record.location !== 'ไม่ระบุสถานที่' && record.location !== '-' && (
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 leading-relaxed line-clamp-2" title={record.location}>
                    <span className="text-slate-500 mr-1">จุดอ้างอิง:</span>
                    {record.location}
                  </div>
                )}
              </div>
              
              {record.lat && (
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="truncate">GPS: {record.lat.toFixed(5)}, {record.lng!.toFixed(5)}</span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${record.lat},${record.lng}`}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 transition-colors"
                  >
                    <Navigation size={11} />
                    <span>นำทาง</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              )}
            </div>

            {/* Remarks box */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-sans">
                หมายเหตุ (Remarks)
              </span>
              <p className="text-xs text-slate-400 font-sans italic bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed min-h-[38px]">
                {record.remarks || '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Full-width Google Sheet Data Dump */}
        <div className="space-y-1.5 pt-3 border-t border-slate-700/60 font-sans">
          <div className="flex items-center gap-1.5 mb-1">
            <Database size={13} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-300 uppercase font-sans">ข้อมูลทั้งหมดจาก Google Sheet</span>
          </div>
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 font-mono text-xs space-y-1.5 max-h-[160px] overflow-y-auto">
            {Object.entries(record.raw).map(([key, value]) => (
              <div key={key} className="flex justify-between items-start gap-4 border-b border-slate-900/80 pb-1 last:border-0 last:pb-0">
                <span className="text-slate-500 text-[11px] truncate max-w-[160px]" title={key}>{key}:</span>
                <span className="text-slate-300 text-right word-break break-all max-w-[220px]">{value || '-'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AppSheet / GAS sync info */}
        <div className="text-xs font-sans text-slate-400 bg-slate-950/30 border border-slate-800/50 p-3 rounded-xl flex items-start gap-2.5">
          <HelpCircle size={15} className="text-emerald-400/80 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-slate-300 text-xs">ระบบเชื่อมโยงข้อมูลอัตโนมัติ (Live Google Sheet Sync)</p>
            <p className="leading-relaxed text-[11px] text-slate-400">
              เมื่อมีการรายงานหรือบันทึกข้อมูลซ่อมบำรุง ข้อมูลจะซิงค์ตรงกับ Google Sheet ทันที และแสดงผลแบบเรียลไทม์บนแดชบอร์ดนี้
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
