import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, MapPin, Calendar, User, CheckCircle2, Clock, 
  Hourglass, AlertTriangle, ExternalLink, Navigation, 
  Database, Image as ImageIcon, HelpCircle, Maximize2, ZoomIn,
  Wrench, AlertCircle, FileText, ChevronDown, ChevronUp
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
  const [showRawData, setShowRawData] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isImageModalOpen) {
          setIsImageModalOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImageModalOpen, onClose]);

  if (!record) return null;

  const getStatusBadge = (status: string, statusThai: string) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm">
            <CheckCircle2 size={13} className="text-emerald-400" />
            {statusThai || 'ซ่อมเสร็จสิ้น'}
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 shadow-sm">
            <Hourglass size={13} className="text-blue-400 animate-spin-slow" />
            {statusThai || 'กำลังดำเนินการ'}
          </span>
        );
      case 'Waiting for Parts':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-bold bg-orange-500/15 text-orange-300 border border-orange-500/30 shadow-sm">
            <AlertTriangle size={13} className="text-orange-400" />
            {statusThai || 'รออะไหล่/วัสดุ'}
          </span>
        );
      case 'Pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-sm">
            <Clock size={13} className="text-rose-400" />
            {statusThai || 'รอดำเนินการ'}
          </span>
        );
    }
  };

  // Safe Google Sheets image preview link converter
  const getImageUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
      const match = url.match(/id=([^&]+)/) || url.match(/\/file\/d\/([^/]+)/);
      if (match && match[1]) {
        return `https://docs.google.com/uc?export=view&id=${match[1]}`;
      }
    }
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

  const previewImage = getImageUrl(record.imageUrl);
  const communityName = getCommunityValue(record);
  const soiName = getSoiValue(record);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto cursor-pointer" 
      id="record-detail-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Click outside to close backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="fixed inset-0 bg-slate-950/40 cursor-pointer"
      />

      {/* Modal Dialog Card */}
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="bg-[#1E293B] border border-slate-700 rounded-2xl overflow-hidden flex flex-col w-full max-w-2xl max-h-[90vh] shadow-2xl relative my-auto cursor-default z-10"
        id="record-detail-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Banner with Actions */}
        <div className="flex justify-between items-center px-4 py-3 sm:px-5 sm:py-3.5 bg-slate-900/90 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/20 shrink-0">
              <Database size={17} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 font-sans leading-tight">
                รายละเอียดรายงานการซ่อมบำรุง
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                รหัสรายการ #{record.id} • เสาไฟ {record.poleId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
            title="ปิดหน้าต่างรายละเอียด (ESC)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 font-sans">
          
          {/* Card 1: Main Header & Identity */}
          <div className="bg-slate-900/70 border border-slate-700/80 rounded-xl p-4 space-y-3 shadow-sm">
            {/* Top row: Pole ID + Status Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  #{record.id}
                </span>
                <h3 className="text-xl font-black text-white font-mono tracking-wide">
                  เสาไฟฟ้าหมายเลข: <span className="text-blue-400">{record.poleId}</span>
                </h3>
              </div>
              <div>
                {getStatusBadge(record.status, record.statusThai)}
              </div>
            </div>

            {/* Meta Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-slate-800 text-xs font-sans">
              <div className="flex items-center gap-2.5 bg-slate-950/50 px-3 py-2 rounded-lg border border-slate-800/60">
                <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400 shrink-0">
                  <User size={15} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block leading-tight">ช่างผู้รับผิดชอบ</span>
                  <span className="text-slate-200 font-semibold truncate block text-xs mt-0.5" title={record.technician}>
                    {record.technician || 'ไม่ระบุชื่อช่าง'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-slate-950/50 px-3 py-2 rounded-lg border border-slate-800/60">
                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 shrink-0">
                  <Calendar size={15} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block leading-tight">
                    {record.fixedDate && record.fixedDate !== '-' ? 'วันที่ดำเนินการเสร็จสิ้น' : 'วันที่บันทึกแจ้งเรื่อง'}
                  </span>
                  <span className="text-slate-200 font-semibold truncate block font-mono text-xs mt-0.5" title={record.fixedDate || record.timestamp}>
                    {record.fixedDate && record.fixedDate !== '-' ? record.fixedDate : (record.timestamp || '-')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Attached Photo Showcase */}
          {previewImage ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400 px-0.5">
                <span className="flex items-center gap-1.5 font-bold text-xs text-slate-300">
                  <ImageIcon size={14} className="text-blue-400" />
                  รูปภาพประกอบการซ่อมบำรุง
                </span>
                <span className="text-[11px] font-mono text-slate-400">คลิกที่รูปเพื่อเปิดดูขนาดเต็ม</span>
              </div>

              <div 
                onClick={() => setIsImageModalOpen(true)}
                className="relative aspect-video sm:aspect-[21/9] w-full rounded-xl overflow-hidden border border-slate-700 bg-slate-950 group cursor-pointer shadow-md"
                title="คลิกเพื่อดูรูปภาพขนาดใหญ่ในป๊อปอัป"
              >
                <img
                  src={previewImage}
                  alt={`Pole ${record.poleId} Issue`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                
                <div className="absolute top-2.5 right-2.5 bg-slate-950/85 px-2.5 py-1 rounded-md text-[10px] font-mono text-slate-200 flex items-center gap-1.5 backdrop-blur-md border border-slate-700/60">
                  <ImageIcon size={12} className="text-blue-400" />
                  IMAGE ATTACHED
                </div>

                {/* Hover overlay with zoom button */}
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                  <div className="bg-blue-600/90 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold shadow-xl transform translate-y-1 group-hover:translate-y-0 transition-transform">
                    <ZoomIn size={15} />
                    <span>ขยายดูรูปภาพขนาดเต็ม</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsImageModalOpen(true);
                  }}
                  className="absolute bottom-2.5 right-2.5 bg-blue-600/90 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold shadow-md cursor-pointer backdrop-blur-sm"
                >
                  <Maximize2 size={13} />
                  ขยายภาพ
                </button>
              </div>
            </div>
          ) : (
            <div className="aspect-[21/7] w-full rounded-xl border border-dashed border-slate-700/80 bg-slate-950/40 flex flex-col items-center justify-center text-center text-slate-400 p-4">
              <ImageIcon size={22} className="text-slate-600 mb-1" />
              <span className="text-xs font-sans text-slate-500">ไม่มีไฟล์รูปภาพแนบในรายงาน</span>
            </div>
          )}

          {/* Card 3: Location Details & GPS */}
          <div className="bg-slate-900/60 border border-slate-700/70 rounded-xl p-4 space-y-3 text-xs font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="flex items-center gap-1.5 font-bold text-sm text-slate-200">
                <MapPin size={15} className="text-rose-500 shrink-0" />
                ตำแหน่งและสถานที่
              </span>
              {record.lat && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${record.lat},${record.lng}`}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors font-bold text-xs shadow-sm cursor-pointer"
                >
                  <Navigation size={12} />
                  <span>นำทาง Google Maps</span>
                  <ExternalLink size={11} />
                </a>
              )}
            </div>

            {/* Tags for Community & Soi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-lg flex items-center gap-2">
                <span className="text-slate-400 text-xs font-medium">ชุมชน:</span>
                <span className="text-slate-200 font-bold text-xs truncate">{communityName}</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-lg flex items-center gap-2">
                <span className="text-slate-400 text-xs font-medium">ซอย:</span>
                <span className="text-slate-200 font-bold text-xs truncate">{soiName}</span>
              </div>
            </div>

            {/* Location reference */}
            {record.location && record.location !== 'ไม่ระบุสถานที่' && record.location !== '-' && (
              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60 text-slate-300 text-xs leading-relaxed">
                <span className="text-slate-400 font-semibold mr-1">จุดอ้างอิง:</span>
                {record.location}
              </div>
            )}

            {/* GPS line */}
            {record.lat && (
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/50">
                <span className="text-slate-500">พิกัด GPS:</span>
                <span className="text-slate-300 font-bold">{record.lat.toFixed(5)}, {record.lng!.toFixed(5)}</span>
              </div>
            )}
          </div>

          {/* Card 4: Issue, Repair & Remarks Sections */}
          <div className="space-y-3">
            {/* 4.1 Issue Defect Card */}
            <div className="bg-slate-900/60 border border-slate-700/70 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                <AlertCircle size={15} className="text-rose-400 shrink-0" />
                <span>อาการชำรุดที่พบ (Defect Details)</span>
              </div>
              <div className="text-xs sm:text-sm text-slate-200 bg-slate-950/60 border border-slate-800 p-3 rounded-lg font-sans leading-relaxed">
                {record.issue || 'ไม่ระบุอาการชำรุด'}
              </div>
            </div>

            {/* 4.2 Repair Action Card */}
            <div className="bg-slate-900/60 border border-slate-700/70 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                <Wrench size={15} className="text-emerald-400 shrink-0" />
                <span>การซ่อมบำรุงแก้ไข (Repair Action)</span>
              </div>
              <div className="text-xs sm:text-sm text-emerald-300 bg-emerald-950/20 border border-emerald-900/40 p-3 rounded-lg font-sans leading-relaxed font-semibold">
                {record.repairAction && record.repairAction !== '-' ? record.repairAction : 'ไม่มีการบันทึกการซ่อมบำรุง'}
              </div>
            </div>

            {/* 4.3 Remarks Card (if exists) */}
            {record.remarks && record.remarks !== '-' && (
              <div className="bg-slate-900/60 border border-slate-700/70 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                  <FileText size={15} className="text-slate-400 shrink-0" />
                  <span>หมายเหตุเพิ่มเติม (Remarks)</span>
                </div>
                <div className="text-xs sm:text-sm text-slate-300 bg-slate-950/40 border border-slate-800 p-3 rounded-lg font-sans italic leading-relaxed">
                  {record.remarks}
                </div>
              </div>
            )}
          </div>

          {/* Card 5: Collapsible Raw Sheet Data */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
            <button
              type="button"
              onClick={() => setShowRawData(!showRawData)}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-sans text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Database size={14} className="text-slate-500" />
                <span className="font-semibold text-slate-300">ข้อมูลทั้งหมดจาก Google Sheet ({Object.keys(record.raw).length} คอลัมน์)</span>
              </div>
              {showRawData ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            <AnimatePresence>
              {showRawData && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-slate-800"
                >
                  <div className="p-3 bg-slate-950 font-mono text-xs space-y-1.5 max-h-[220px] overflow-y-auto">
                    {Object.entries(record.raw).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-start gap-3 border-b border-slate-900/80 pb-1.5 last:border-0 last:pb-0">
                        <span className="text-slate-500 text-xs truncate max-w-[160px]" title={key}>{key}:</span>
                        <span className="text-slate-300 text-right word-break break-all max-w-[220px] font-sans">{value || '-'}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Card 6: System Sync Info */}
          <div className="text-xs font-sans text-slate-400 bg-slate-950/30 border border-slate-800/40 p-3 rounded-xl flex items-start gap-2.5">
            <HelpCircle size={15} className="text-blue-400/80 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-slate-400">
              ข้อมูลเชื่อมโยงกับ Google Sheet และ AppSheet อัตโนมัติแบบเรียลไทม์
            </p>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-slate-900/90 border-t border-slate-700 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 font-sans hidden sm:block">
            กดปุ่ม <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] font-mono text-slate-300">ESC</kbd> เพื่อปิดหน้าต่าง
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="w-full sm:w-auto px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm ml-auto"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </motion.div>

      {/* In-App Image Lightbox Modal Popup (No new browser tab needed) */}
      <AnimatePresence>
        {isImageModalOpen && previewImage && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-lg">
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


