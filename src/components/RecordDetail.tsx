import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, MapPin, Calendar, User, CheckCircle2, Clock, 
  Hourglass, AlertTriangle, ExternalLink, Navigation, 
  Database, Image as ImageIcon, HelpCircle, Maximize2, ZoomIn
} from 'lucide-react';
import { MaintenanceRecord } from '../sheetsService';

interface DetailProps {
  record: MaintenanceRecord | null;
  appName?: string;
  tableName?: string;
  onClose: () => void;
}

export default function RecordDetail({ record, appName = '', tableName = '', onClose }: DetailProps) {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

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
    <div className="bg-[#1E293B] border border-slate-700 rounded-lg overflow-hidden flex flex-col h-full shadow-2xl relative" id="record-detail-panel">
      {/* Top Banner with Actions */}
      <div className="flex justify-between items-center px-4 py-3 bg-slate-900/60 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Database className="text-blue-500" size={15} />
          <span className="text-base font-semibold text-slate-100 font-sans">
            รายละเอียดรายงานการซ่อมบำรุง
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Split container for Image and Core Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column: Image (reduced to half size by splitting column) */}
          <div className="space-y-2">
            {previewImage ? (
              <div 
                onClick={() => setIsImageModalOpen(true)}
                className="relative aspect-video w-full rounded-lg overflow-hidden border border-slate-700 bg-slate-950 group cursor-pointer"
                title="คลิกเพื่อดูรูปภาพขนาดใหญ่ในป๊อปอัป"
              >
                <img
                  src={previewImage}
                  alt={`Pole ${record.poleId} Issue`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2 right-2 bg-slate-950/90 px-2 py-1 rounded text-[10px] font-mono text-slate-400 flex items-center gap-1.5 backdrop-blur-sm">
                  <ImageIcon size={12} />
                  IMAGE ATTACHED
                </div>

                {/* Hover overlay with zoom button */}
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-blue-600/90 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold shadow-lg backdrop-blur-sm transform translate-y-2 group-hover:translate-y-0 transition-transform">
                    <ZoomIn size={14} />
                    <span>คลิกเพื่อดูรูปขนาดเต็ม</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsImageModalOpen(true);
                  }}
                  className="absolute bottom-2 right-2 bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1.5 rounded flex items-center gap-1.5 text-xs font-bold shadow-md cursor-pointer"
                >
                  <Maximize2 size={13} />
                  ดูรูปขนาดเต็ม
                </button>
              </div>
            ) : (
              <div className="aspect-video w-full rounded-lg border border-dashed border-slate-700 bg-slate-950/50 flex flex-col items-center justify-center text-center text-slate-400 p-4">
                <ImageIcon size={22} className="text-slate-600 mb-1" />
                <span className="text-xs font-sans">ไม่มีไฟล์รูปภาพแนบในรายงาน</span>
              </div>
            )}
          </div>

          {/* Right Column: Detailed summary side-by-side with the image */}
          <div className="space-y-3">
            {/* Title & Status */}
            <div>
              <div className="flex items-center justify-end mb-1">
                {getStatusBadgeLarge(record.status, record.statusThai)}
              </div>
              <h3 className="text-base font-bold text-slate-100 font-mono">
                เสาไฟฟ้าหมายเลข: <span className="text-blue-400">{record.poleId}</span>
              </h3>
            </div>

            {/* Core details list */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/60">
              <div className="space-y-0.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase font-sans">ช่างผู้รับผิดชอบ</span>
                <div className="flex items-center gap-1 text-xs text-slate-300 font-sans">
                  <User size={13} className="text-slate-500 shrink-0" />
                  <span className="truncate" title={record.technician}>{record.technician || '-'}</span>
                </div>
              </div>
              
              <div className="space-y-0.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase font-sans">วันที่ดำเนินการ</span>
                <div className="flex items-center gap-1 text-xs text-slate-300 font-sans">
                  <Calendar size={13} className="text-slate-500 shrink-0" />
                  <span className="truncate" title={record.fixedDate}>{record.fixedDate || '-'}</span>
                </div>
              </div>
            </div>

            {/* Location & GPS */}
            <div className="space-y-1 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/40 text-xs">
              <span className="text-[10px] font-semibold text-slate-400 uppercase font-sans block">รายละเอียดสถานที่</span>
              <div className="flex items-start gap-1.5 text-slate-300 font-sans">
                <MapPin size={14} className="text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="truncate">
                    <strong className="text-slate-400 font-sans mr-1">ชุมชน:</strong> 
                    <span>{getCommunityValue(record)}</span>
                  </p>
                  <p className="truncate">
                    <strong className="text-slate-400 font-sans mr-1">ซอย:</strong> 
                    <span>{getSoiValue(record)}</span>
                  </p>
                  {record.location && record.location !== 'ไม่ระบุสถานที่' && record.location !== '-' && (
                    <p className="text-[11px] text-slate-400 leading-normal line-clamp-2 mt-1 border-t border-slate-800/40 pt-1" title={record.location}>
                      <strong className="text-slate-500 font-sans mr-1">จุดอ้างอิง:</strong>
                      {record.location}
                    </p>
                  )}
                </div>
              </div>
              
              {record.lat && (
                <div className="pt-1.5 border-t border-slate-800/40 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="truncate">GPS: {record.lat.toFixed(5)}, {record.lng!.toFixed(5)}</span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${record.lat},${record.lng}`}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    rel="noopener noreferrer"
                    className="flex items-center gap-0.5 text-blue-400 hover:text-blue-300 transition-colors font-bold shrink-0"
                  >
                    <Navigation size={11} />
                    นำทาง
                    <ExternalLink size={11} />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Issue, Repair Action & Remarks (Keep below the grid for spacious display) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-700/60">
          {/* Issue detail */}
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase font-sans">อาการชำรุดที่พบ (Defect Details)</span>
            <p className="text-xs text-slate-200 bg-slate-950/20 border border-slate-800 p-2 rounded-lg font-sans leading-relaxed min-h-[48px]">
              {record.issue || '-'}
            </p>
          </div>

          {/* Repair Action & Remarks group */}
          <div className="space-y-3">
            {record.repairAction && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase font-sans">การซ่อมบำรุงแก้ไข (Repair Action)</span>
                <p className="text-xs text-emerald-400 bg-slate-950/20 border border-emerald-900/30 p-2 rounded-lg font-sans leading-relaxed">
                  {record.repairAction}
                </p>
              </div>
            )}

            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase font-sans">หมายเหตุ (Remarks)</span>
              <p className="text-xs text-slate-400 font-sans italic bg-slate-950/10 p-2 rounded-md border border-slate-800/30">
                {record.remarks || '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic sheet properties (The complete sheet row dump - stays below as requested) */}
        <div className="space-y-1 pt-3 border-t border-slate-700/60 font-sans">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Database size={13} className="text-slate-500" />
            <span className="text-xs font-semibold text-slate-400 uppercase font-sans">ข้อมูลทั้งหมดจาก Google Sheet</span>
          </div>
          <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 font-mono text-xs space-y-1.5 max-h-[160px] overflow-y-auto">
            {Object.entries(record.raw).map(([key, value]) => (
              <div key={key} className="flex justify-between items-start gap-4 border-b border-slate-900 pb-1 last:border-0 last:pb-0">
                <span className="text-slate-500 text-[11px] truncate max-w-[150px]" title={key}>{key}:</span>
                <span className="text-slate-300 text-right word-break break-all max-w-[200px]">{value || '-'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AppSheet / GAS sync info */}
        <div className="text-xs font-sans text-slate-400 bg-slate-950/20 border border-slate-800/40 p-3 rounded-lg flex items-start gap-2">
          <HelpCircle size={15} className="text-blue-500/60 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-slate-300">ระบบเชื่อมโยงข้อมูลอัตโนมัติ</p>
            <p className="leading-relaxed text-slate-400">
              เมื่อทำการบันทึกข้อมูลซ่อมบำรุงในสมาร์ทโฟนผ่าน AppSheet ข้อมูลจะอัพเดทเข้าสู่ Google Sheet ทันที และแสดงผลแบบเรียลไทม์บนแดชบอร์ดนี้โดยไม่ต้องดาวน์โหลดไฟล์ใหม่
            </p>
          </div>
        </div>
      </div>

      {/* In-App Image Lightbox Modal Popup (No new browser tab needed) */}
      <AnimatePresence>
        {isImageModalOpen && previewImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsImageModalOpen(false)}
              className="absolute inset-0 cursor-pointer"
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative z-10 max-w-4xl w-full bg-[#1E293B] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
            >
              {/* Modal Top bar */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-700">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded bg-blue-500/15 text-blue-400">
                    <ImageIcon size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-100 font-mono truncate">
                      ภาพประกอบรายงาน: เสาไฟ {record.poleId}
                    </h4>
                    <p className="text-xs text-slate-400 font-sans truncate">
                      {record.location || '-'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsImageModalOpen(false)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="ปิดหน้าต่างรูปภาพ (ESC)"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Image Display */}
              <div className="flex-1 overflow-auto p-2 sm:p-4 bg-slate-950/90 flex items-center justify-center min-h-[300px] max-h-[70vh]">
                <img
                  src={previewImage}
                  alt={`Pole ${record.poleId}`}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-xl"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Modal Footer Info */}
              <div className="px-4 py-2.5 bg-slate-900/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-sans text-slate-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <User size={13} className="text-blue-400" />
                    ช่าง: {record.technician || '-'}
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <Calendar size={13} className="text-emerald-400" />
                    วันที่: {record.fixedDate || record.timestamp || '-'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsImageModalOpen(false)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
