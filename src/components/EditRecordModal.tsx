import { useState, useEffect, useMemo, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Save, CheckCircle2, Clock, Hourglass, AlertTriangle, 
  MapPin, Calendar, User, Wrench, FileText, Image as ImageIcon, 
  ExternalLink, Navigation, Sparkles, AlertCircle
} from 'lucide-react';
import { 
  MaintenanceRecord, 
  fetchCommunityAndSoiData, 
  CommunitySoiData, 
  RAYONG_COMMUNITIES_FALLBACK 
} from '../sheetsService';
import SearchableCombobox from './SearchableCombobox';

interface EditRecordModalProps {
  isOpen: boolean;
  record: MaintenanceRecord | null;
  onClose: () => void;
  onSave: (updatedRecord: MaintenanceRecord) => Promise<{ success: boolean; message?: string } | void> | void;
}

export default function EditRecordModal({
  isOpen,
  record,
  onClose,
  onSave
}: EditRecordModalProps) {
  const [formData, setFormData] = useState<Partial<MaintenanceRecord>>({});
  const [community, setCommunity] = useState('');
  const [soi, setSoi] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Community and Soi data from Google Sheet gid=89735667
  const [communityData, setCommunityData] = useState<CommunitySoiData>({
    communities: RAYONG_COMMUNITIES_FALLBACK,
    sois: [],
    communitySoiMap: {},
  });

  useEffect(() => {
    let isMounted = true;
    fetchCommunityAndSoiData().then((data) => {
      if (isMounted) setCommunityData(data);
    });
    return () => { isMounted = false; };
  }, []);

  const availableSois = useMemo(() => {
    if (community && communityData.communitySoiMap[community.trim()]) {
      return communityData.communitySoiMap[community.trim()];
    }
    return communityData.sois;
  }, [community, communityData]);

  // Initialize form when record changes
  useEffect(() => {
    if (record) {
      let initialStatusThai = record.statusThai || '';
      if (initialStatusThai === 'ซ่อมเสร็จสิ้น' || record.status === 'Completed') {
        initialStatusThai = 'เสร็จสิ้น';
      }
      setFormData({
        ...record,
        statusThai: initialStatusThai,
      });

      // Extract community and soi from record or raw
      const comm = record.community || record.raw?.['ชุมชน/เขต'] || record.raw?.['ชุมชน'] || '';
      const s = record.soi || record.raw?.['ซอย'] || record.raw?.['ถนน'] || '';
      setCommunity(comm);
      setSoi(s);
      setSaveSuccess(false);
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const handleStatusChange = (statusEng: string, statusTh: string) => {
    setFormData(prev => ({
      ...prev,
      status: statusEng,
      statusThai: statusTh,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage('กำลังบันทึกข้อมูล...');

    // Build composite location if community/soi exists
    let finalLocation = formData.location || '';
    if (community || soi) {
      const parts = [community, soi].filter(Boolean);
      if (parts.length > 0) {
        finalLocation = parts.join(' - ');
        if (formData.location && !parts.some(p => formData.location?.includes(p))) {
          finalLocation += ` (${formData.location})`;
        }
      }
    }

    const updated: MaintenanceRecord = {
      ...record,
      ...formData,
      poleId: (formData.poleId || record.poleId || '').trim(),
      issue: (formData.issue || record.issue || '').trim(),
      location: finalLocation || 'ไม่ระบุสถานที่',
      community: community.trim(),
      soi: soi.trim(),
      lat: formData.lat !== undefined ? Number(formData.lat) : record.lat,
      lng: formData.lng !== undefined ? Number(formData.lng) : record.lng,
      status: formData.status || record.status,
      statusThai: formData.statusThai || record.statusThai,
      technician: (formData.technician || record.technician || '').trim(),
      fixedDate: (formData.fixedDate || record.fixedDate || '').trim(),
      repairAction: (formData.repairAction || record.repairAction || '').trim(),
      remarks: (formData.remarks || record.remarks || '').trim(),
      imageUrl: (formData.imageUrl || record.imageUrl || '').trim(),
      raw: {
        ...(record.raw || {}),
        'ID โคมไฟ': formData.poleId || record.poleId,
        'ปัญหาที่พบ': formData.issue || record.issue,
        'ชุมชน/เขต': community,
        'ซอย': soi,
        'สถานะ': formData.statusThai || record.statusThai,
        'ชื่อผู้ปฏิบัติงาน': formData.technician || record.technician,
        'วันที่ซ่อมบำรุงแก้ไข': formData.fixedDate || record.fixedDate,
        'การซ่อมบำรุงแก้ไข': formData.repairAction || record.repairAction || '',
        'รายละเอียดการแก้ไขเพิ่มเติม': formData.remarks || record.remarks || '',
        'หมายเหตุ': formData.remarks || record.remarks || '',
        'รูปภาพการซ่อมบำรุง': formData.imageUrl || record.imageUrl || '',
      }
    };

    try {
      const res = await onSave(updated);
      setIsSaving(false);
      setSaveSuccess(true);
      if (res && res.message) {
        setStatusMessage(res.message);
      } else {
        setStatusMessage('บันทึกข้อมูลเรียบร้อยแล้ว');
      }
      setTimeout(() => {
        setSaveSuccess(false);
        setStatusMessage(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setIsSaving(false);
      setStatusMessage('บันทึกในเครื่องเรียบร้อยแล้ว');
      setTimeout(() => {
        setSaveSuccess(false);
        setStatusMessage(null);
        onClose();
      }, 1200);
    }
  };

  const statusOptions = [
    { eng: 'Completed', thai: 'เสร็จสิ้น', icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    { eng: 'In Progress', thai: 'กำลังดำเนินการ', icon: Hourglass, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
    { eng: 'Waiting for Parts', thai: 'รออะไหล่/วัสดุ', icon: AlertTriangle, color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
    { eng: 'Pending', thai: 'รอดำเนินการ', icon: Clock, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans">
        {/* Backdrop overlay */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl bg-[#1E293B] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-slate-900/90 border-b border-slate-700/80">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
                <Wrench size={18} />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white font-sans leading-tight flex items-center gap-2">
                  แก้ไขข้อมูลงานซ่อมบำรุง
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 font-mono font-semibold">
                    #{record.id}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-sans">
                  ปรับปรุงรายละเอียดงานซ่อม โคมไฟ/เสาไฟ และบันทึกผลได้ทันที
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Form Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Section 1: สถานะและข้อมูลหลัก */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 font-sans flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" />
                สถานะการซ่อมบำรุง (Status)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {statusOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = (formData.status === opt.eng) || 
                    (opt.eng === 'Completed' && (formData.statusThai === 'เสร็จสิ้น' || formData.statusThai === 'ซ่อมเสร็จสิ้น' || formData.status === 'Completed')) ||
                    (formData.statusThai === opt.thai);
                  return (
                    <button
                      key={opt.eng}
                      type="button"
                      onClick={() => handleStatusChange(opt.eng, opt.thai)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-sans font-semibold transition-all cursor-pointer ${
                        isSelected 
                          ? `${opt.color} ring-2 ring-blue-500/40 shadow-md` 
                          : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                      }`}
                    >
                      <Icon size={16} />
                      <span>{opt.thai}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: ข้อมูลเสาและอาการเสีย */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-700/60">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 font-sans block">
                  รหัสเสาไฟ / รหัสโคมไฟ (Pole ID)
                </label>
                <input
                  type="text"
                  required
                  value={formData.poleId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, poleId: e.target.value }))}
                  placeholder="เช่น f687cdf9 หรือ POLE-01"
                  className="w-full bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 font-sans block">
                  ช่างผู้รับผิดชอบ / ผู้ปฏิบัติงาน
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={formData.technician || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, technician: e.target.value }))}
                    placeholder="เช่น ช่างตั้มดอนตาล, รอมอบหมาย"
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs font-sans text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* อาการเสียและการซ่อมบำรุง */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 font-sans block">
                  อาการชำรุด / ปัญหาที่พบ (Issue)
                </label>
                <textarea
                  rows={2}
                  value={formData.issue || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, issue: e.target.value }))}
                  placeholder="ระบุอาการเสีย เช่น เบรกเกอร์ทริป, โคมไฟดับ, ฝาโคมเป็นสนิม"
                  className="w-full bg-slate-950/60 border border-slate-700 rounded-lg p-2.5 text-xs font-sans text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 font-sans block">
                  การซ่อมบำรุงแก้ไข (Repair Action)
                </label>
                <textarea
                  rows={2}
                  value={formData.repairAction || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, repairAction: e.target.value }))}
                  placeholder="ระบุการปฏิบัติงาน เช่น On breaker, เปลี่ยนหลอด LED, จั๊มสายไฟ"
                  className="w-full bg-slate-950/60 border border-slate-700 rounded-lg p-2.5 text-xs font-sans text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors leading-relaxed"
                />
              </div>
            </div>

            {/* Section 3: สถานที่และพิกัด */}
            <div className="pt-2 border-t border-slate-700/60 space-y-3">
              <label className="text-xs font-semibold text-slate-300 font-sans flex items-center gap-1.5">
                <MapPin size={14} className="text-rose-400" />
                สถานที่และพิกัดที่ตั้ง (Location & Coordinates)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-sans">ชุมชน / เขต</span>
                  <SearchableCombobox
                    value={community}
                    onChange={setCommunity}
                    options={communityData.communities}
                    placeholder="เช่น หนองสนม-ปักป่า, บางจาก"
                    emptyText="ไม่พบชื่อชุมชนในชีต (พิมพ์ใช้ชื่อนี้ได้)"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-sans">ซอย / ถนน</span>
                  <SearchableCombobox
                    value={soi}
                    onChange={setSoi}
                    options={availableSois}
                    placeholder="เช่น ซอย นครระยอง 1 ซอย 1"
                    emptyText="ไม่พบชื่อซอยในชีต (พิมพ์ใช้ชื่อนี้ได้)"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-sans">จุดอ้างอิง / สถานที่โดยละเอียด</span>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="เช่น หน้าบ้านเลขที่ 12/3 ใกล้เสาหม้อแปลง"
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-2 text-xs font-sans text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-sans">ละติจูด (Latitude)</span>
                  <input
                    type="number"
                    step="any"
                    value={formData.lat !== null && formData.lat !== undefined ? formData.lat : ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, lat: e.target.value ? parseFloat(e.target.value) : null }))}
                    placeholder="เช่น 12.67389"
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-sans">ลองจิจูด (Longitude)</span>
                  <input
                    type="number"
                    step="any"
                    value={formData.lng !== null && formData.lng !== undefined ? formData.lng : ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, lng: e.target.value ? parseFloat(e.target.value) : null }))}
                    placeholder="เช่น 101.27854"
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {formData.lat && formData.lng && (
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${formData.lat},${formData.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                  >
                    <Navigation size={12} />
                    <span>ทดสอบเปิดพิกัดบน Google Maps</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              )}
            </div>

            {/* Section 4: วันที่ หมายเหตุ และรูปภาพ */}
            <div className="pt-2 border-t border-slate-700/60 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 font-sans block">
                    วันที่ดำเนินการ / วันที่ซ่อมบำรุง
                  </label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={formData.fixedDate || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, fixedDate: e.target.value }))}
                      placeholder="เช่น 1/10/2569 15:31:24"
                      className="w-full bg-slate-950/60 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs font-sans text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 font-sans block">
                    หมายเหตุ / รายละเอียดเพิ่มเติม (Remarks)
                  </label>
                  <input
                    type="text"
                    value={formData.remarks || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="เช่น On breaker, ปิดงานเรียบร้อย, รอสั่งอะไหล่โคม"
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-2 text-xs font-sans text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* รูปภาพแนบ */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-slate-300 font-sans block">
                  ลิงก์รูปภาพการซ่อมบำรุง (Image URL หรือชื่อไฟล์รูปภาพ)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ImageIcon size={14} className="absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={formData.imageUrl || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                      placeholder="เช่น https://... หรือชื่อไฟล์ภาพ"
                      className="w-full bg-slate-950/60 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {formData.imageUrl && (
                  <div className="mt-2 w-32 h-20 rounded-lg border border-slate-700 overflow-hidden bg-slate-950 relative">
                    <img 
                      src={formData.imageUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Note alert */}
            <div className="p-3 bg-blue-950/30 border border-blue-500/20 rounded-xl flex items-start gap-2.5 text-xs text-blue-300">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-blue-400" />
              <p className="leading-relaxed">
                เมื่อกดบันทึก ข้อมูลในระบบ แดชบอร์ด แผนที่พิกัด และกราฟวิเคราะห์จะอัปเดตแสดงผลตามที่แก้ไขทันที
              </p>
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-4 border-t border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-500 font-mono">
                  แถว #{record.id} {record.raw?.['ID ประวัติ'] ? `(${record.raw['ID ประวัติ']})` : ''}
                </span>
                {statusMessage && (
                  <span className={`text-[11px] font-sans ${saveSuccess ? 'text-emerald-400 font-semibold' : 'text-amber-400'}`}>
                    • {statusMessage}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-750 text-xs font-sans font-medium transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`px-5 py-2 rounded-lg text-white text-xs font-sans font-semibold transition-all flex items-center gap-1.5 shadow-lg cursor-pointer ${
                    saveSuccess 
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20' 
                      : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20 disabled:opacity-50'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <span className="inline-block border-2 border-white/30 border-t-white rounded-full h-3.5 w-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : saveSuccess ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>บันทึกสำเร็จ!</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>บันทึกข้อมูล</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
