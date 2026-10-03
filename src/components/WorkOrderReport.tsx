import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Printer, FileText, Plus, Trash2, CheckCircle2, Copy, Check, 
  Send, MapPin, Calendar, User, AlertTriangle, Download, 
  Share2, Wrench, Clock, Database, ChevronRight, Sparkles,
  ExternalLink, Navigation, HelpCircle, ArrowRight, ListPlus,
  Camera, Eye, Filter, RefreshCw, X, Image as ImageIcon,
  Edit, CheckCircle, Search, Grid, List as ListIcon, Hourglass
} from 'lucide-react';
import { 
  MaintenanceRecord, 
  fetchCommunityAndSoiData, 
  CommunitySoiData, 
  RAYONG_COMMUNITIES_FALLBACK 
} from '../sheetsService';
import SearchableCombobox from './SearchableCombobox';

export interface WorkOrderItem {
  id: string; // rowId or unique key
  historyId?: string; // ID ประวัติ
  poleId: string; // ID โคมไฟ
  community: string; // ชุมชน/เขต
  soi: string; // ซอย
  issue: string; // ปัญหาที่พบ
  repairAction?: string; // การซ่อมบำรุงแก้ไข
  repairDetail?: string; // รายละเอียดการแก้ไขเพิ่มเติม
  fixedDate?: string; // วันที่ซ่อมบำรุงแก้ไข
  status: string; // สถานะ
  imageUrl?: string; // รูปภาพการซ่อมบำรุง (Data URL or path)
  lat: number | null; // พิกัดซ่อมบำรุง
  lng: number | null;
  technician: string; // ชื่อผู้ปฏิบัติงาน
  remarks?: string; // หมายเหตุ
  location?: string; // จุดสังเกต
  orderDate?: string; // วันที่บันทึก
  isFromExisting?: boolean;
}

interface WorkOrderReportProps {
  records: MaintenanceRecord[];
  onSyncNewRecord?: (record: MaintenanceRecord, action?: 'insert' | 'update') => Promise<{ success: boolean; message?: string }>;
  onDeleteRecord?: (historyId: string) => Promise<{ success: boolean; message?: string }>;
  theme: 'light' | 'dark';
}

const COMMON_ISSUES = [
  'หลอด LED ชำรุด',
  'โคมไฟแตก/ฝาครอบชำรุด',
  'เบรคเกอร์ทริป',
  'สายไฟชำรุด/ลัดวงจร',
  'หลอดฟลูออเรสเซนต์ชำรุด',
  'ไฟไม่ติดทั้งแนว/ดับทั้งซอย',
  'บัลลาสต์/สตาร์ทเตอร์เสีย',
  'เสาไฟเอียง/มีอันตราย'
];

const COMMON_REPAIRS = [
  'เปลี่ยนหลอด LED',
  'เปลี่ยนหลอด ฟลูออเรสเซนต์',
  'เปลี่ยนบัลลาสต์ / สตาร์ทเตอร์',
  'On Breaker / เปลี่ยนเบรคเกอร์',
  'เปลี่ยนโคมไฟใหม่',
  'จั๊มต่อสายไฟ / พันเทปสายไฟ',
  'เปลี่ยนสวิตช์แสงแดด (Photo Switch)'
];

const COMMON_TECHNICIANS = [
  'ช่างหมู',
  'ช่างตั้มดอนตาล',
  'พี่แบงค์',
  'ภาณุทัศน์ อุปถัมภ์',
  'พัชรพงศ์ พูลสุข',
  'ทีมบำรุงรักษา ระยอง'
];

const STATUS_OPTIONS = [
  { val: 'รอดำเนินการ', label: 'รอดำเนินการ', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  { val: 'กำลังดำเนินการ', label: 'กำลังดำเนินการ', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  { val: 'รออะไหล่/วัสดุ', label: 'รออะไหล่/วัสดุ', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { val: 'เสร็จสิ้น', label: 'เสร็จสิ้น', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' }
];

// Helper to check if a record is pending repair
const isPendingRecord = (r: MaintenanceRecord) => 
  r.status === 'Pending' || 
  r.statusThai === 'รอดำเนินการ' || 
  r.status === 'รอดำเนินการ' || 
  r.status === 'รอซ่อม' || 
  !r.status;

export default function WorkOrderReport({ records, onSyncNewRecord, onDeleteRecord, theme }: WorkOrderReportProps) {
  // Saved work orders in current draft batch (synchronized with database)
  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>(() => {
    try {
      const saved = localStorage.getItem('rayong_work_orders_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    // Initial from records if available
    if (records && records.length > 0) {
      return records.map((r, idx) => ({
        id: `WO-${(r.raw?.['ID ประวัติ'] || r.id || idx).trim()}`,
        historyId: (r.raw?.['ID ประวัติ'] || r.raw?.['id ประวัติ'] || r.id || '').trim(),
        poleId: r.poleId || 'ไม่ระบุรหัส',
        issue: r.issue || r.raw?.['ปัญหาที่พบ'] || 'รอซ่อมบำรุง',
        community: r.community || r.raw?.['ชุมชน/เขต'] || '',
        soi: r.soi || r.raw?.['ซอย'] || '',
        location: r.location || `${r.community || ''} ${r.soi || ''}`.trim() || 'ไม่ระบุสถานที่',
        lat: r.lat,
        lng: r.lng,
        technician: r.technician || r.raw?.['ชื่อผู้ปฏิบัติงาน'] || 'ทีมบำรุงรักษา',
        status: r.statusThai || r.status || 'รอดำเนินการ',
        repairAction: r.repairAction || r.raw?.['การซ่อมบำรุงแก้ไข'] || '',
        repairDetail: r.repairDetail || r.raw?.['รายละเอียดการแก้ไขเพิ่มเติม'] || '',
        imageUrl: r.imageUrl || r.raw?.['รูปภาพการซ่อมบำรุง'] || '',
        remarks: (r.remarks && r.remarks !== '-') ? r.remarks : (r.raw?.['หมายเหตุ'] || ''),
        orderDate: (r.fixedDate && r.fixedDate !== '-') ? r.fixedDate : (r.raw?.['วันที่ซ่อมบำรุงแก้ไข'] || new Date().toISOString().split('T')[0]),
        fixedDate: (r.fixedDate && r.fixedDate !== '-') ? r.fixedDate : (r.raw?.['วันที่ซ่อมบำรุงแก้ไข'] || new Date().toISOString().split('T')[0]),
        isFromExisting: true,
      })).reverse();
    }
    return [];
  });

  // Save to local storage on change
  useEffect(() => {
    try {
      localStorage.setItem('rayong_work_orders_draft', JSON.stringify(workOrders));
    } catch (e) {
      console.error(e);
    }
  }, [workOrders]);

  // ซิงค์ข้อมูล 2 ทางระหว่าง Google Sheet กับ รายการใบงาน (Reconciliation Engine):
  // 1. ถ้ามีแถว/รายการถูกลบออกจาก Google Sheet หรือ AppSheet -> ให้ลบออกจากรายการในเว็บทันที
  // 2. ถ้ามีข้อมูลเปลี่ยนแปลง (สถานะ, การแก้ไข, ช่าง, วันที่, หมายเหตุ) ใน Google Sheet -> อัปเดตในรายการให้ตรงกันทันที 1:1
  useEffect(() => {
    if (!records || records.length === 0) return;

    // รวบรวม ID ประวัติ และ ID โคมไฟ ทั้งหมดที่ยังมีอยู่ใน Google Sheet ขณะนี้
    const activeHistoryIds = new Set<string>();
    const activePoleIds = new Set<string>();

    records.forEach(r => {
      const hId = (r.raw?.['ID ประวัติ'] || r.raw?.['id ประวัติ'] || r.id || '').trim();
      if (hId) activeHistoryIds.add(hId);
      if (r.poleId && r.poleId !== '-') activePoleIds.add(r.poleId.trim());
    });

    setWorkOrders(prev => {
      // 1. จัดการการลบ (Reconcile deletions):
      // รายการที่เคยซิงค์หรือดึงมาจาก Google Sheet (isFromExisting หรือมี historyId)
      // หากไม่มีอยู่ในชีทแล้ว (ถูกลบใน Sheet / AppSheet) ให้ตัดออกจากตารางในเว็บทันที
      const remaining = prev.filter(w => {
        const hId = (w.historyId || '').trim();
        const pId = (w.poleId || '').trim();

        if (hId || w.isFromExisting) {
          const existsByHistory = hId ? activeHistoryIds.has(hId) : false;
          const existsByPole = pId && pId !== '-' ? activePoleIds.has(pId) : false;
          return existsByHistory || existsByPole;
        }

        // เก็บแบบร่างที่เพิ่งพิมพ์สร้างขึ้นใหม่ในเว็บที่ยังไม่เคยซิงค์
        return true;
      });

      // 2. จัดการการอัปเดตข้อมูล (Reconcile updates):
      // ปรับปรุงข้อมูลในช่องคอลัมน์ของรายการให้ตรงกับ Sheet สดเสมอ (สถานะ, ช่าง, วิธีซ่อม ฯลฯ)
      let hasChanges = false;
      const updated = remaining.map(w => {
        const hId = (w.historyId || '').trim();
        const pId = (w.poleId || '').trim();

        const matched = records.find(r => {
          const rHId = (r.raw?.['ID ประวัติ'] || r.raw?.['id ประวัติ'] || r.id || '').trim();
          if (hId && rHId && hId === rHId) return true;
          if (pId && r.poleId && pId === r.poleId.trim()) return true;
          return false;
        });

        if (!matched) return w;

        const latestStatus = matched.statusThai || matched.status || w.status;
        const latestRepairAction = matched.repairAction || matched.raw?.['การซ่อมบำรุงแก้ไข'] || w.repairAction || '';
        const latestRepairDetail = matched.raw?.['รายละเอียดการแก้ไขเพิ่มเติม'] || w.repairDetail || '';
        const latestTechnician = matched.technician || matched.raw?.['ชื่อผู้ปฏิบัติงาน'] || w.technician || '';
        const latestFixedDate = (matched.fixedDate && matched.fixedDate !== '-') ? matched.fixedDate : w.fixedDate;
        const latestImage = matched.imageUrl || matched.raw?.['รูปภาพการซ่อมบำรุง'] || w.imageUrl || '';
        const latestRemarks = (matched.remarks && matched.remarks !== '-') ? matched.remarks : w.remarks || '';
        const latestCommunity = matched.community || matched.raw?.['ชุมชน/เขต'] || w.community || '';
        const latestSoi = matched.soi || matched.raw?.['ซอย'] || w.soi || '';
        const latestIssue = matched.issue || matched.raw?.['ปัญหาที่พบ'] || w.issue || '';
        const matchedHistId = (matched.raw?.['ID ประวัติ'] || matched.id || w.historyId)?.trim();

        if (
          w.status !== latestStatus ||
          w.repairAction !== latestRepairAction ||
          w.repairDetail !== latestRepairDetail ||
          w.technician !== latestTechnician ||
          w.fixedDate !== latestFixedDate ||
          w.imageUrl !== latestImage ||
          w.remarks !== latestRemarks ||
          w.community !== latestCommunity ||
          w.soi !== latestSoi ||
          w.issue !== latestIssue ||
          w.historyId !== matchedHistId
        ) {
          hasChanges = true;
          return {
            ...w,
            historyId: matchedHistId,
            status: latestStatus,
            repairAction: latestRepairAction,
            repairDetail: latestRepairDetail,
            technician: latestTechnician,
            fixedDate: latestFixedDate,
            imageUrl: latestImage,
            remarks: latestRemarks,
            community: latestCommunity,
            soi: latestSoi,
            issue: latestIssue,
            lat: matched.lat !== null ? matched.lat : w.lat,
            lng: matched.lng !== null ? matched.lng : w.lng,
            isFromExisting: true,
          };
        }
        return w;
      });

      // 3. เพิ่มรายการใหม่จากฐานข้อมูลเข้ามาอัตโนมัติ (Multi-device Cloud Sync):
      // เพื่อให้เปิดดูในมือถือ แท็บเล็ต หรือคอมพิวเตอร์เครื่องอื่น ข้อมูลซิงค์ตรงกันเสมอและไม่หาย
      const existingHistoryIds = new Set(updated.map(w => (w.historyId || '').trim()).filter(Boolean));
      const existingPoleIds = new Set(updated.map(w => (w.poleId || '').trim()).filter(p => p && p !== 'ไม่ระบุรหัส' && p !== '-'));

      const newFromRecords: WorkOrderItem[] = [];
      records.forEach((r, idx) => {
        const hId = (r.raw?.['ID ประวัติ'] || r.raw?.['id ประวัติ'] || r.id || '').trim();
        const pId = (r.poleId || '').trim();
        const alreadyExists = (hId && existingHistoryIds.has(hId)) || 
                              (pId && pId !== '-' && pId !== 'ไม่ระบุรหัส' && existingPoleIds.has(pId));

        if (!alreadyExists) {
          hasChanges = true;
          newFromRecords.push({
            id: `WO-${hId || Date.now()}-${idx}`,
            historyId: hId,
            poleId: r.poleId || 'ไม่ระบุรหัส',
            issue: r.issue || r.raw?.['ปัญหาที่พบ'] || 'รอซ่อมบำรุง',
            community: r.community || r.raw?.['ชุมชน/เขต'] || '',
            soi: r.soi || r.raw?.['ซอย'] || '',
            location: r.location || `${r.community || ''} ${r.soi || ''}`.trim() || 'ไม่ระบุสถานที่',
            lat: r.lat,
            lng: r.lng,
            technician: r.technician || r.raw?.['ชื่อผู้ปฏิบัติงาน'] || 'ทีมบำรุงรักษา',
            status: r.statusThai || r.status || 'รอดำเนินการ',
            repairAction: r.repairAction || r.raw?.['การซ่อมบำรุงแก้ไข'] || '',
            repairDetail: r.repairDetail || r.raw?.['รายละเอียดการแก้ไขเพิ่มเติม'] || '',
            imageUrl: r.imageUrl || r.raw?.['รูปภาพการซ่อมบำรุง'] || '',
            remarks: (r.remarks && r.remarks !== '-') ? r.remarks : (r.raw?.['หมายเหตุ'] || ''),
            orderDate: (r.fixedDate && r.fixedDate !== '-') ? r.fixedDate : (r.raw?.['วันที่ซ่อมบำรุงแก้ไข'] || new Date().toISOString().split('T')[0]),
            fixedDate: (r.fixedDate && r.fixedDate !== '-') ? r.fixedDate : (r.raw?.['วันที่ซ่อมบำรุงแก้ไข'] || new Date().toISOString().split('T')[0]),
            isFromExisting: true,
          });
        }
      });

      if (remaining.length !== prev.length || hasChanges || newFromRecords.length > 0) {
        return [...newFromRecords.reverse(), ...updated];
      }
      return prev;
    });
  }, [records]);

  // Form input states matching `การซ่อมบำรุง`
  const [poleId, setPoleId] = useState('');
  const [community, setCommunity] = useState('');
  const [soi, setSoi] = useState('');
  const [issue, setIssue] = useState('');
  const [repairAction, setRepairAction] = useState('');
  const [repairDetail, setRepairDetail] = useState('');
  const [status, setStatus] = useState('รอดำเนินการ');
  const [technician, setTechnician] = useState('');
  const [fixedDate, setFixedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [gpsStr, setGpsStr] = useState('');
  const [remarks, setRemarks] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [syncToSheet, setSyncToSheet] = useState(true);

  // Date Range Filter state for Report & Print
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterByDate, setFilterByDate] = useState(false);

  // Print Preview Modal state
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Add Record Modal state (เปิด/ปิด Popup กรอกข้อมูลซ่อมบำรุง)
  const [showAddModal, setShowAddModal] = useState(false);

  // Quick Edit / Update Status Modal
  const [editingItem, setEditingItem] = useState<WorkOrderItem | null>(null);

  // View mode state: 'grid' (การ์ด) vs 'table' (ตารางรายการ)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    const saved = localStorage.getItem('rayong_workorders_view_mode');
    return (saved as 'grid' | 'table') || 'grid';
  });

  const handleViewModeChange = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('rayong_workorders_view_mode', mode);
  };

  // Helper to render Status Icon Badge (แทนที่รูปภาพด้วยไอคอนสถานะตามความต้องการของผู้ใช้)
  const renderStatusIconBadge = (itemStatus: string, size: 'card' | 'table' = 'card') => {
    const isDone = itemStatus === 'เสร็จสิ้น' || itemStatus === 'ซ่อมเสร็จสิ้น' || itemStatus === 'Completed';
    const isInProgress = itemStatus === 'กำลังดำเนินการ' || itemStatus === 'กำลังซ่อม' || itemStatus === 'In Progress';
    const isWaiting = itemStatus === 'รออะไหล่/วัสดุ' || itemStatus === 'รออะไหล่' || itemStatus === 'Waiting for Parts';

    if (size === 'table') {
      if (isDone) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shrink-0 whitespace-nowrap">
            <CheckCircle2 size={13} className="shrink-0" />
            <span>{itemStatus || 'เสร็จสิ้น'}</span>
          </span>
        );
      }
      if (isInProgress) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/25 shrink-0 whitespace-nowrap">
            <Clock size={13} className="shrink-0 animate-pulse" />
            <span>{itemStatus || 'กำลังดำเนินการ'}</span>
          </span>
        );
      }
      if (isWaiting) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25 shrink-0 whitespace-nowrap">
            <Hourglass size={13} className="shrink-0" />
            <span>{itemStatus || 'รออะไหล่'}</span>
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/25 shrink-0 whitespace-nowrap">
          <AlertTriangle size={13} className="shrink-0" />
          <span>{itemStatus || 'รอดำเนินการ'}</span>
        </span>
      );
    }

    // Card view: 48x48px icon box
    if (isDone) {
      return (
        <div 
          className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm"
          title={`สถานะ: ${itemStatus || 'เสร็จสิ้น'}`}
        >
          <CheckCircle2 size={24} />
        </div>
      );
    }
    if (isInProgress) {
      return (
        <div 
          className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-sm"
          title={`สถานะ: ${itemStatus || 'กำลังดำเนินการ'}`}
        >
          <Clock size={24} className="animate-pulse" />
        </div>
      );
    }
    if (isWaiting) {
      return (
        <div 
          className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-sm"
          title={`สถานะ: ${itemStatus || 'รออะไหล่'}`}
        >
          <Hourglass size={24} />
        </div>
      );
    }
    return (
      <div 
        className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 shadow-sm"
        title={`สถานะ: ${itemStatus || 'รอดำเนินการ'}`}
      >
        <AlertTriangle size={24} />
      </div>
    );
  };

  // UI state
  const [copiedLine, setCopiedLine] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportNumber, setReportNumber] = useState(() => {
    const today = new Date();
    const y = today.getFullYear() + 543;
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `WO-${y}${m}${d}-01`;
  });

  // Community and Soi options from Google Sheet gid=89735667
  const [communityData, setCommunityData] = useState<CommunitySoiData>({
    communities: RAYONG_COMMUNITIES_FALLBACK,
    sois: [],
    communitySoiMap: {},
  });
  const [loadingCommData, setLoadingCommData] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoadingCommData(true);
    fetchCommunityAndSoiData()
      .then((data) => {
        if (isMounted) {
          setCommunityData(data);
          setLoadingCommData(false);
        }
      })
      .catch((err) => {
        console.warn('Error loading community data:', err);
        if (isMounted) setLoadingCommData(false);
      });
    return () => { isMounted = false; };
  }, []);

  // Filter sois based on selected community if mapped, otherwise show all sois
  const availableSois = useMemo(() => {
    if (community && communityData.communitySoiMap[community.trim()]) {
      return communityData.communitySoiMap[community.trim()];
    }
    return communityData.sois;
  }, [community, communityData]);

  // Handle image upload from camera or file
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, isForEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (isForEdit && editingItem) {
          setEditingItem(prev => prev ? { ...prev, imageUrl: base64 } : null);
        } else {
          setImageUrl(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Get current device GPS coordinates
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ไม่รองรับการดึงพิกัด GPS');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setGpsStr(`${lat}, ${lng}`);
      },
      () => {
        alert('ไม่สามารถดึงตำแหน่งพิกัด GPS ได้ กรุณาเปิดการระบุตำแหน่งบนอุปกรณ์');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Handle adding new item to work order list
  const handleAddItem = async (e: React.FormEvent) => {
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

    const generatedHistoryId = Math.random().toString(36).substring(2, 10);
    const newItem: WorkOrderItem = {
      id: `WO-${Date.now()}`,
      historyId: generatedHistoryId,
      poleId: poleId.trim(),
      community: community.trim(),
      soi: soi.trim(),
      issue: issue.trim() || 'รอซ่อมบำรุง',
      repairAction: repairAction.trim(),
      repairDetail: repairDetail.trim(),
      fixedDate: fixedDate || new Date().toISOString().split('T')[0],
      status: status || 'รอดำเนินการ',
      technician: technician.trim() || 'ทีมบำรุงรักษา',
      remarks: remarks.trim(),
      imageUrl,
      lat,
      lng,
      orderDate: fixedDate || new Date().toISOString().split('T')[0],
      isFromExisting: syncToSheet,
    };

    setWorkOrders(prev => [newItem, ...prev]);

    // Optional sync to Google Sheet (Action: insert -> always append new row)
    if (syncToSheet && onSyncNewRecord) {
      setIsSubmitting(true);
      try {
        const sheetRec: MaintenanceRecord = {
          id: newItem.id,
          timestamp: new Date().toLocaleString('th-TH'),
          poleId: newItem.poleId,
          issue: newItem.issue,
          location: [newItem.community, newItem.soi].filter(Boolean).join(' - '),
          lat: newItem.lat,
          lng: newItem.lng,
          status: newItem.status,
          statusThai: newItem.status,
          technician: newItem.technician,
          fixedDate: newItem.fixedDate || '-',
          imageUrl: newItem.imageUrl || '',
          remarks: newItem.remarks || '',
          repairAction: newItem.repairAction || '',
          community: newItem.community,
          soi: newItem.soi,
          raw: {
            'ID ประวัติ': newItem.historyId,
            'ID โคมไฟ': newItem.poleId,
            'ชุมชน/เขต': newItem.community,
            'ซอย': newItem.soi,
            'ปัญหาที่พบ': newItem.issue,
            'การซ่อมบำรุงแก้ไข': newItem.repairAction || '',
            'รายละเอียดการแก้ไขเพิ่มเติม': newItem.repairDetail || '',
            'วันที่ซ่อมบำรุงแก้ไข': newItem.fixedDate || '',
            'สถานะ': newItem.status,
            'รูปภาพการซ่อมบำรุง': newItem.imageUrl || '',
            'พิกัดซ่อมบำรุง': newItem.lat && newItem.lng ? `${newItem.lat}, ${newItem.lng}` : '',
            'ชื่อผู้ปฏิบัติงาน': newItem.technician,
            'หมายเหตุ': newItem.remarks || '',
          }
        };
        await onSyncNewRecord(sheetRec, 'insert');
      } catch (err) {
        console.warn('Sync to Google Sheet failed:', err);
      } finally {
        setIsSubmitting(false);
      }
    }

    // Reset form inputs
    setPoleId('');
    setIssue('');
    setRepairAction('');
    setRepairDetail('');
    setRemarks('');
    setImageUrl('');
    setGpsStr('');
  };

  // Handle saving an edited item from modal (Action: update -> update existing row)
  const handleSaveEditedItem = async () => {
    if (!editingItem) return;

    setWorkOrders(prev => prev.map(item => item.id === editingItem.id ? editingItem : item));

    // Sync update to Google Sheet
    if (onSyncNewRecord) {
      const sheetRec: MaintenanceRecord = {
        id: editingItem.id,
        timestamp: new Date().toLocaleString('th-TH'),
        poleId: editingItem.poleId,
        issue: editingItem.issue,
        location: [editingItem.community, editingItem.soi].filter(Boolean).join(' - '),
        lat: editingItem.lat,
        lng: editingItem.lng,
        status: editingItem.status,
        statusThai: editingItem.status,
        technician: editingItem.technician,
        fixedDate: editingItem.fixedDate || '-',
        imageUrl: editingItem.imageUrl || '',
        remarks: editingItem.remarks || '',
        repairAction: editingItem.repairAction || '',
        community: editingItem.community,
        soi: editingItem.soi,
        raw: {
          'ID ประวัติ': editingItem.historyId || editingItem.id,
          'ID โคมไฟ': editingItem.poleId,
          'ชุมชน/เขต': editingItem.community,
          'ซอย': editingItem.soi,
          'ปัญหาที่พบ': editingItem.issue,
          'การซ่อมบำรุงแก้ไข': editingItem.repairAction || '',
          'รายละเอียดการแก้ไขเพิ่มเติม': editingItem.repairDetail || '',
          'วันที่ซ่อมบำรุงแก้ไข': editingItem.fixedDate || '',
          'สถานะ': editingItem.status,
          'รูปภาพการซ่อมบำรุง': editingItem.imageUrl || '',
          'พิกัดซ่อมบำรุง': editingItem.lat && editingItem.lng ? `${editingItem.lat}, ${editingItem.lng}` : '',
          'ชื่อผู้ปฏิบัติงาน': editingItem.technician,
          'หมายเหตุ': editingItem.remarks || '',
        }
      };
      await onSyncNewRecord(sheetRec, 'update');
    }

    setEditingItem(null);
  };

  // Remove item and sync deletion to Google Sheet
  const handleRemoveItem = async (id: string) => {
    const itemToRemove = workOrders.find(item => item.id === id);
    if (!itemToRemove) return;

    const label = itemToRemove.poleId || itemToRemove.issue || 'รายการนี้';
    if (!confirm(`ยืนยันลบรายการ "${label}" ออกจากฐานข้อมูลระบบหรือไม่?`)) {
      return;
    }

    // 1. ลบออกจากตารางในเว็บทันที
    setWorkOrders(prev => prev.filter(item => item.id !== id));

    // 2. ซิงค์ลบแถวใน Google Sheet
    const targetHistoryId = itemToRemove.historyId || itemToRemove.id;
    if (onDeleteRecord && targetHistoryId) {
      try {
        await onDeleteRecord(targetHistoryId);
      } catch (err) {
        console.warn('Failed to delete from Google Sheet:', err);
      }
    }
  };

  // Clear all
  const handleClearAll = () => {
    if (confirm('ยืนยันล้างรายการซ่อมบำรุงทั้งหมดในชุดนี้หรือไม่?')) {
      setWorkOrders([]);
    }
  };

  // Import pending records from sheet
  const handleImportPending = () => {
    const pendingRecords = records.filter(isPendingRecord);
    const toAdd: WorkOrderItem[] = [];

    pendingRecords.forEach((r, idx) => {
      const hId = (r.raw?.['ID ประวัติ'] || r.id || '').trim();
      const pId = (r.poleId || '').trim();
      const alreadyInList = workOrders.some(w => 
        (hId && w.historyId === hId) || 
        (pId && pId !== '-' && pId !== 'ไม่ระบุรหัส' && w.poleId === pId)
      );

      if (!alreadyInList) {
        toAdd.push({
          id: `WO-${hId || Date.now()}-${idx}`,
          historyId: hId,
          poleId: r.poleId || `POLE-${idx + 1}`,
          issue: r.issue || r.raw?.['ปัญหาที่พบ'] || 'รอซ่อมบำรุง',
          community: r.community || r.raw?.['ชุมชน/เขต'] || '',
          soi: r.soi || r.raw?.['ซอย'] || '',
          location: r.location || `${r.community || ''} ${r.soi || ''}`.trim() || 'ไม่ระบุสถานที่',
          lat: r.lat,
          lng: r.lng,
          technician: r.technician || r.raw?.['ชื่อผู้ปฏิบัติงาน'] || 'ทีมบำรุงรักษา',
          status: r.statusThai || r.status || 'รอดำเนินการ',
          repairAction: r.repairAction || r.raw?.['การซ่อมบำรุงแก้ไข'] || '',
          repairDetail: r.repairDetail || r.raw?.['รายละเอียดการแก้ไขเพิ่มเติม'] || '',
          imageUrl: r.imageUrl || r.raw?.['รูปภาพการซ่อมบำรุง'] || '',
          remarks: (r.remarks && r.remarks !== '-') ? r.remarks : (r.raw?.['หมายเหตุ'] || 'ดึงจากฐานข้อมูลระบบ'),
          orderDate: (r.fixedDate && r.fixedDate !== '-') ? r.fixedDate : (r.raw?.['วันที่ซ่อมบำรุงแก้ไข'] || new Date().toISOString().split('T')[0]),
          fixedDate: (r.fixedDate && r.fixedDate !== '-') ? r.fixedDate : (r.raw?.['วันที่ซ่อมบำรุงแก้ไข'] || new Date().toISOString().split('T')[0]),
          isFromExisting: true,
        });
      }
    });

    if (toAdd.length === 0) {
      alert('รายการแจ้งซ่อมที่รอดำเนินการถูกเชื่อมโยงไว้ในรายการครบแล้ว');
      return;
    }

    setWorkOrders(prev => [...toAdd, ...prev]);
    alert(`นำเข้างานที่รอดำเนินการ ${toAdd.length} งาน เข้ารายการเรียบร้อยแล้ว`);
  };

  // Filtered work orders based on Date Range
  const filteredWorkOrders = useMemo(() => {
    if (!filterByDate) return workOrders;
    return workOrders.filter(item => {
      const itemDate = item.orderDate || item.fixedDate?.split(' ')[0] || '';
      if (!itemDate) return true;
      if (startDate && itemDate < startDate) return false;
      if (endDate && itemDate > endDate) return false;
      return true;
    });
  }, [workOrders, filterByDate, startDate, endDate]);

  // Format summary text for LINE Messenger
  const handleCopyForLine = () => {
    const listToExport = filteredWorkOrders.length > 0 ? filteredWorkOrders : workOrders;
    if (listToExport.length === 0) {
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
    if (filterByDate) {
      text += `⏱️ *ช่วงวันที่:* ${startDate} ถึง ${endDate}\n`;
    }
    text += `📌 *รวมงานทั้งหมด:* ${listToExport.length} รายการ\n`;
    text += `------------------------------------\n`;

    listToExport.forEach((w, index) => {
      const statusEmoji = w.status === 'เสร็จสิ้น' ? '✅' : w.status === 'กำลังดำเนินการ' ? '⚡' : '🔧';
      text += `\n${index + 1}. ${statusEmoji} *รหัสเสาไฟ: ${w.poleId}* [${w.status}]\n`;
      text += `   ⚠️ *ปัญหา:* ${w.issue}\n`;
      if (w.repairAction) {
        text += `   🛠️ *การซ่อม:* ${w.repairAction}\n`;
      }
      if (w.community || w.soi) {
        text += `   📍 *สถานที่:* ${w.community ? `ชุมชน${w.community} ` : ''}${w.soi ? `ซอย${w.soi} ` : ''}\n`;
      }
      if (w.technician) {
        text += `   👷 *ผู้รับผิดชอบ:* ${w.technician}\n`;
      }
      if (w.lat && w.lng) {
        text += `   🗺️ *แผนที่นำทาง:* https://maps.google.com/?q=${w.lat},${w.lng}\n`;
      }
    });

    text += `\nฝ่ายสาธารณูปโภค ส่วนการโยธา สำนักช่าง เทศบาลนครระยอง`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedLine(true);
      setTimeout(() => setCopiedLine(false), 3000);
    });
  };

  // Trigger browser print using an isolated iframe to guarantee 100% reliable rendering in A4 Landscape without dark backgrounds or blank pages
  const handlePrint = () => {
    const printContent = document.getElementById('printable-work-order');
    if (!printContent) {
      window.print();
      return;
    }

    try {
      const oldFrame = document.getElementById('rayong_print_frame');
      if (oldFrame) oldFrame.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'rayong_print_frame';
      iframe.name = 'rayong_print_frame';
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '1200px';
      iframe.style.height = '900px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document;
      if (!frameDoc) {
        window.print();
        return;
      }

      const contentHtml = printContent.innerHTML;

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="utf-8" />
          <title>ใบสั่งงานซ่อมบำรุงไฟฟ้าสาธารณะ - ${reportNumber}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 landscape;
              margin: 6mm 8mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0;
              padding: 0;
              background-color: #ffffff !important;
              color: #0f172a !important;
              font-family: 'Noto Sans Thai', 'Sukhumvit Set', sans-serif;
              font-size: 11px;
              line-height: 1.35;
            }
            .font-mono {
              font-family: 'JetBrains Mono', monospace !important;
            }
            .font-sans {
              font-family: 'Noto Sans Thai', 'Sukhumvit Set', sans-serif !important;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            thead {
              display: table-header-group;
            }
            th, td {
              border: 1px solid #64748b;
              padding: 5px 7px;
              vertical-align: middle;
            }
            th {
              background-color: #f1f5f9 !important;
              font-weight: 700;
              color: #0f172a;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .font-extrabold { font-weight: 800; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }
            .italic { font-style: italic; }
            .flex { display: flex; }
            .items-center { align-items: center; }
            .items-baseline { align-items: baseline; }
            .justify-between { justify-content: space-between; }
            .justify-end { justify-content: flex-end; }
            .flex-wrap { flex-wrap: wrap; }
            .gap-2 { gap: 8px; }
            .gap-3 { gap: 12px; }
            .gap-4 { gap: 16px; }
            .border-b-2 { border-bottom: 2px solid #0f172a; }
            .border-b { border-bottom: 1px solid #cbd5e1; }
            .pb-2\\.5 { padding-bottom: 10px; }
            .mb-3 { margin-bottom: 12px; }
            .mt-3 { margin-top: 12px; }
            .mt-0\\.5 { margin-top: 2px; }
            .pt-2 { padding-top: 8px; }
            .border-t { border-top: 1px solid #cbd5e1; }
            .text-xs { font-size: 12px; }
            .text-sm { font-size: 14px; }
            .text-base { font-size: 16px; }
            .text-\\[10px\\] { font-size: 10px; }
            .text-\\[11px\\] { font-size: 11px; }
            .text-\\[9px\\] { font-size: 9px; }
            .text-\\[9\\.5px\\] { font-size: 9.5px; }
            .text-slate-950 { color: #020617; }
            .text-slate-900 { color: #0f172a; }
            .text-slate-800 { color: #1e293b; }
            .text-slate-700 { color: #334155; }
            .text-slate-600 { color: #475569; }
            .text-slate-500 { color: #64748b; }
            .text-slate-400 { color: #94a3b8; }
            .bg-slate-100 { background-color: #f1f5f9 !important; }
            .bg-slate-50\\/40 { background-color: #f8fafc !important; }
            .border-dashed { border-style: dashed; }
            .border-slate-400\\/80 { border-color: rgba(148, 163, 184, 0.8); }
            .border-slate-300 { border-color: #cbd5e1; }
            .border-slate-400 { border-color: #94a3b8; }
            .h-6 { height: 24px; }
            .w-10 { width: 40px; }
            .w-11 { width: 44px; }
            .h-11 { height: 44px; }
            .w-24 { width: 90px; }
            .w-28 { width: 110px; }
            .w-44 { width: 170px; }
            .whitespace-nowrap { white-space: nowrap; }
            .rounded { border-radius: 4px; }
            .px-1\\.5 { padding-left: 6px; padding-right: 6px; }
            .py-0\\.5 { padding-top: 2px; padding-bottom: 2px; }
            .px-2 { padding-left: 8px; padding-right: 8px; }
            .py-1\\.5 { padding-top: 6px; padding-bottom: 6px; }
            .px-2\\.5 { padding-left: 10px; padding-right: 10px; }
            .px-3 { padding-left: 12px; padding-right: 12px; }
            .border { border: 1px solid #cbd5e1; }
            .border-r { border-right: 1px solid #cbd5e1; }
            .leading-tight { line-height: 1.25; }
            .text-emerald-700 { color: #047857; }
            .bg-emerald-50 { background-color: #ecfdf5 !important; }
            .border-emerald-300 { border-color: #6ee7b7; }
            .text-rose-700 { color: #be123c; }
            .bg-rose-50 { background-color: #fff1f2 !important; }
            .border-rose-300 { border-color: #fda4af; }
            img { max-height: 44px; object-fit: contain; }
          </style>
        </head>
        <body>
          ${contentHtml}
        </body>
        </html>
      `);
      frameDoc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 5000);
      }, 350);
    } catch (err) {
      console.warn('Print iframe error, fallback to window.print():', err);
      window.print();
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-[#1E293B] border border-slate-700/80 rounded-2xl p-4 sm:p-5 gap-4 shadow-sm no-print">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Printer size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                ระบบงานซ่อมบำรุง & ใบสั่งงาน
              </h2>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                {workOrders.length} รายการ
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              บันทึกงานซ่อมบำรุง ออกใบงาน A4 สรุปส่งช่างหน้างาน และอัปเดตผลการซ่อม
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
          {/* Add Record Button */}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-900/30"
          >
            <Plus size={16} />
            <span>เพิ่มรายการ</span>
          </button>

          {/* Print Preview Button */}
          <button
            type="button"
            onClick={() => setShowPrintPreview(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Eye size={15} />
            <span>ดูตัวอย่างก่อนพิมพ์ A4</span>
          </button>

          {/* Quick Import Button */}
          <button
            type="button"
            onClick={handleImportPending}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ListPlus size={15} className="text-amber-400" />
            <span>ดึงงานรอซ่อม ({records.filter(isPendingRecord).length})</span>
          </button>

          {/* Copy LINE Summary Button */}
          <button
            type="button"
            onClick={handleCopyForLine}
            disabled={workOrders.length === 0}
            className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {copiedLine ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
            <span>{copiedLine ? 'คัดลอกแล้ว' : 'ส่ง LINE ช่าง'}</span>
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

      {/* 2. Main Content: Comprehensive Work Orders List (เต็มพื้นที่หน้าเว็บ เพื่อประหยัดหน้าเว็บและแสดงรายการซ่อมบำรุงอย่างชัดเจน) */}
      <div className="bg-[#1E293B] border border-slate-700/80 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5 no-print">
        {/* Header bar of the Work Orders List */}
        <div className="border-b border-slate-700/80 pb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-100">
                  รวมรายการซ่อมบำรุง
                </h3>
                <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                  ทั้งหมด {workOrders.length} รายการ
                </span>
                {filterByDate && (
                  <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                    กรองแสดง {filteredWorkOrders.length} รายการ
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ตารางสรุปรายการงานซ่อมบำรุงไฟฟ้าสาธารณะ ตรวจสอบ อัปเดตสถานะงาน และพิมพ์ออกใบงาน A4 แนวนอน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl">
              <span className="text-xs text-slate-400">เลขที่ใบงาน:</span>
              <input
                type="text"
                value={reportNumber}
                onChange={(e) => setReportNumber(e.target.value)}
                className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-xs text-blue-400 font-mono font-bold w-36 text-center focus:outline-none focus:border-blue-500"
                title="เลขที่ใบสั่งงาน สามารถแก้ไขได้"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-900/30"
            >
              <Plus size={16} />
              <span>เพิ่มรายการ</span>
            </button>
          </div>
        </div>

        {/* Date Range Filter Bar for Print & View */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Filter size={14} className="text-blue-400" />
              <span>ตัวกรองช่วงวันที่พิมพ์รายงาน</span>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={filterByDate}
                onChange={(e) => setFilterByDate(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-blue-500"
              />
              <span>เปิดใช้งานตัวกรอง</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 shrink-0">ตั้งแต่:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setFilterByDate(true);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 shrink-0">ถึงวันที่:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setFilterByDate(true);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Quick date presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
            <button
              type="button"
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setStartDate(today);
                setEndDate(today);
                setFilterByDate(true);
              }}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                filterByDate && startDate === new Date().toISOString().split('T')[0] && endDate === new Date().toISOString().split('T')[0]
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              วันนี้
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const prev7 = new Date();
                prev7.setDate(today.getDate() - 7);
                setStartDate(prev7.toISOString().split('T')[0]);
                setEndDate(today.toISOString().split('T')[0]);
                setFilterByDate(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              7 วันล่าสุด
            </button>
            <button
              type="button"
              onClick={() => setFilterByDate(false)}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                !filterByDate ? 'bg-emerald-600 text-white font-semibold' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              แสดงทั้งหมด ({workOrders.length})
            </button>

            <div className="flex items-center gap-2.5 ml-auto">
              {/* View Mode Toggle Buttons (สลับมุมมอง การ์ด vs ตารางรายการ) */}
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => handleViewModeChange('grid')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-slate-800 text-emerald-400 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="มุมมองการ์ด (Grid View)"
                >
                  <Grid size={13} />
                  <span className="hidden sm:inline text-[11px]">การ์ด</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleViewModeChange('table')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-slate-800 text-emerald-400 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="มุมมองตารางรายการ (Table / List View)"
                >
                  <ListIcon size={13} />
                  <span className="hidden sm:inline text-[11px]">ตาราง</span>
                </button>
              </div>

              <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                พบ {filteredWorkOrders.length} รายการ
              </span>
            </div>
          </div>
        </div>

        {/* Work Orders List (Grid View vs Table / List View) */}
        {filteredWorkOrders.length === 0 ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3 bg-slate-900/40 rounded-xl border border-slate-800/80">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500">
              <FileText size={28} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-200">
                {filterByDate ? 'ไม่พบรายการงานในช่วงวันที่เลือก' : 'ยังไม่มีรายการงานในชุดนี้'}
              </p>
              <p className="text-xs text-slate-400 max-w-sm">
                คลิกปุ่ม "เพิ่มรายการ" เพื่อเปิดหน้ากรอกข้อมูล หรือคลิก "ดึงงานรอซ่อม" เพื่อนำรายการเข้ามา
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <Plus size={15} />
                <span>เพิ่มรายการ</span>
              </button>
              <button
                type="button"
                onClick={handleImportPending}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ListPlus size={15} className="text-amber-400" />
                <span>ดึงงานรอซ่อม</span>
              </button>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          /* 1. มุมมองการ์ด (Grid View) พร้อมไอคอนสถานะ */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[680px] overflow-y-auto pr-1">
            {filteredWorkOrders.map((item, index) => {
              const statusColor = 
                (item.status === 'เสร็จสิ้น' || item.status === 'ซ่อมเสร็จสิ้น' || item.status === 'Completed')
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                  : (item.status === 'กำลังดำเนินการ' || item.status === 'กำลังซ่อม' || item.status === 'In Progress')
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' 
                  : (item.status === 'รออะไหล่/วัสดุ' || item.status === 'Waiting for Parts')
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30';

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-950/80 transition-all flex flex-col justify-between gap-3 shadow-sm"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Status Icon Badge (แทนที่กรอบรูปเสียด้วยไอคอนสถานะตามความต้องการของผู้ใช้) */}
                    <div className="relative shrink-0">
                      {renderStatusIconBadge(item.status, 'card')}
                      <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-mono font-bold text-slate-400 flex items-center justify-center shadow-sm">
                        {index + 1}
                      </span>
                    </div>

                    <div className="min-w-0 space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm text-white">
                          {item.poleId || 'ไม่ระบุรหัส'}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${statusColor}`}>
                          {item.status}
                        </span>
                        {item.fixedDate && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {item.fixedDate}
                          </span>
                        )}
                        {item.imageUrl && (
                          <span title="มีรูปภาพแนบ" className="text-slate-500 hover:text-slate-300">
                            <ImageIcon size={12} />
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-200 font-medium line-clamp-2">
                        {item.issue}
                      </p>

                      {item.repairAction && (
                        <p className="text-[11px] text-blue-400 truncate">
                          การแก้ไข: {item.repairAction}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                        {(item.community || item.soi) && (
                          <span className="flex items-center gap-1 truncate max-w-[200px]">
                            <MapPin size={11} className="text-slate-500 shrink-0" />
                            <span className="truncate">
                              {item.community} {item.soi}
                            </span>
                          </span>
                        )}
                        {item.technician && (
                          <span className="flex items-center gap-1">
                            <User size={11} className="text-slate-500 shrink-0" />
                            <span>{item.technician}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar on card */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
                    <div className="flex items-center gap-2">
                      {item.lat && item.lng && (
                        <a
                          href={`https://maps.google.com/?q=${item.lat},${item.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 hover:text-emerald-400 border border-slate-800 text-[11px] flex items-center gap-1 transition-colors"
                          title="ดูพิกัดบน Google Maps"
                        >
                          <Navigation size={12} />
                          <span>แผนที่</span>
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Update Status / Edit Button */}
                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="อัปเดตสถานะงาน / บันทึกผลการซ่อม"
                      >
                        <Wrench size={13} />
                        <span>อัปเดตงาน</span>
                      </button>

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
                </div>
              );
            })}
          </div>
        ) : (
          /* 2. มุมมองตารางรายการ (Table / List View) แบบสวยงามกะทัดรัด */
          <div className="overflow-x-auto bg-slate-950/60 border border-slate-800 rounded-xl max-h-[680px] overflow-y-auto shadow-sm">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-900/90 text-slate-300 font-semibold border-b border-slate-800 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-3">สถานะ</th>
                  <th className="py-3 px-3">รหัสโคมไฟ</th>
                  <th className="py-3 px-3 min-w-[200px]">ปัญหาที่พบ</th>
                  <th className="py-3 px-3 min-w-[170px]">การซ่อมบำรุงแก้ไข</th>
                  <th className="py-3 px-3 min-w-[160px]">สถานที่ (ชุมชน/ซอย)</th>
                  <th className="py-3 px-3">ผู้ปฏิบัติงาน</th>
                  <th className="py-3 px-3 text-center">วันที่</th>
                  <th className="py-3 px-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredWorkOrders.map((item, index) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-slate-900/60 transition-colors text-slate-300 group"
                  >
                    <td className="py-3 px-3 text-center font-mono text-slate-500 text-[11px]">
                      {index + 1}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {renderStatusIconBadge(item.status, 'table')}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-white whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{item.poleId || 'ไม่ระบุรหัส'}</span>
                        {item.imageUrl && (
                          <span title="มีรูปภาพแนบ" className="text-slate-500">
                            <ImageIcon size={11} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-200">
                      <span className="line-clamp-2 leading-relaxed" title={item.issue}>
                        {item.issue}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-blue-400">
                      <span className="line-clamp-2" title={item.repairAction || '-'}>
                        {item.repairAction || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {(item.community || item.soi) ? (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-slate-500 shrink-0" />
                          <span className="truncate max-w-[180px]">
                            {item.community} {item.soi}
                          </span>
                        </span>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                      {item.technician ? (
                        <span className="flex items-center gap-1">
                          <User size={11} className="text-slate-500 shrink-0" />
                          <span>{item.technician}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {item.fixedDate || item.orderDate || '-'}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
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
                          onClick={() => setEditingItem(item)}
                          className="px-2.5 py-1 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/25 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="อัปเดตสถานะงาน / บันทึกผลการซ่อม"
                        >
                          <Wrench size={12} />
                          <span>อัปเดต</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors cursor-pointer"
                          title="ลบออกจากชุดงาน"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2.5 Add Record Modal (Popup หน้า กรอกข้อมูลซ่อมบำรุง) */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl bg-[#1E293B] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh] my-auto"
            >
              {/* Modal Top Bar */}
              <div className="px-5 py-4 bg-slate-900 border-b border-slate-700/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Plus size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      กรอกข้อมูลซ่อมบำรุง
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      บันทึกข้อมูลงานซ่อมและซิงค์ตรงกับชีต 'การซ่อมบำรุง'
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Form Content */}
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  await handleAddItem(e);
                  setShowAddModal(false);
                }} 
                className="overflow-y-auto p-4 sm:p-6 space-y-4"
              >
                {/* 1. Pole ID & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">
                      ID โคมไฟ / รหัสเสา
                    </label>
                    <input
                      type="text"
                      placeholder="รหัสโคมไฟ"
                      value={poleId}
                      onChange={(e) => setPoleId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">
                      สถานะ
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt.val} value={opt.val}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Community & Soi (Searchable Combobox from Google Sheet gid=89735667) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <SearchableCombobox
                      label="ชุมชน / เขต"
                      badge={loadingCommData ? 'กำลังโหลด...' : `${communityData.communities.length} ชุมชน`}
                      value={community}
                      onChange={setCommunity}
                      options={communityData.communities}
                      placeholder="เลือกหรือพิมพ์ชุมชน"
                      emptyText="ไม่พบชื่อชุมชนในชีต"
                    />
                  </div>

                  <div className="space-y-1">
                    <SearchableCombobox
                      label="ซอย / ถนน"
                      badge={
                        community && communityData.communitySoiMap[community.trim()]
                          ? `${availableSois.length} ซอยในชุมชน`
                          : `${availableSois.length || communityData.sois.length} ซอย`
                      }
                      value={soi}
                      onChange={setSoi}
                      options={availableSois}
                      placeholder="เลือกหรือพิมพ์ซอย/ถนน"
                      emptyText="ไม่พบชื่อซอยในชีต"
                    />
                  </div>
                </div>

                {/* 3. Issue */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    ปัญหาที่พบ
                  </label>
                  <input
                    type="text"
                    placeholder="ระบุอาการชำรุด"
                    value={issue}
                    onChange={(e) => setIssue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  {/* Quick Issue Chips */}
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {COMMON_ISSUES.slice(0, 4).map((iss) => (
                      <button
                        key={iss}
                        type="button"
                        onClick={() => setIssue(iss)}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors cursor-pointer"
                      >
                        {iss}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Repair Action (การซ่อมบำรุงแก้ไข) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    การซ่อมบำรุงแก้ไข
                  </label>
                  <input
                    type="text"
                    placeholder="ระบุการปฏิบัติงาน เช่น เปลี่ยนหลอด LED, On breaker"
                    value={repairAction}
                    onChange={(e) => setRepairAction(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {COMMON_REPAIRS.slice(0, 4).map((rep) => (
                      <button
                        key={rep}
                        type="button"
                        onClick={() => setRepairAction(rep)}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/25 transition-colors cursor-pointer"
                      >
                        {rep}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Technician & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">
                      ชื่อผู้ปฏิบัติงาน
                    </label>
                    <input
                      type="text"
                      placeholder="ระบุชื่อช่าง"
                      value={technician}
                      onChange={(e) => setTechnician(e.target.value)}
                      list="rep-tech-list"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <datalist id="rep-tech-list">
                      {COMMON_TECHNICIANS.map(t => <option key={t} value={t} />)}
                    </datalist>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">
                      วันที่ซ่อมบำรุงแก้ไข
                    </label>
                    <input
                      type="date"
                      value={fixedDate}
                      onChange={(e) => setFixedDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* 6. GPS Coordinates */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      พิกัดซ่อมบำรุง (GPS)
                    </label>
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Navigation size={11} />
                      <span>ดึงพิกัดปัจจุบัน</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="เช่น 12.682379, 101.246283"
                    value={gpsStr}
                    onChange={(e) => setGpsStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* 7. Image Upload (รูปภาพการซ่อมบำรุง) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    รูปภาพการซ่อมบำรุง
                  </label>
                  <div className="flex items-center gap-3">
                    {imageUrl ? (
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-700 group shrink-0">
                        <img src={imageUrl} alt="รูปซ่อมบำรุง" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImageUrl('')}
                          className="absolute top-1 right-1 p-1 bg-rose-600/90 hover:bg-rose-500 text-white rounded-full transition-colors cursor-pointer"
                          title="ลบรูปภาพ"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-24 h-18 border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl cursor-pointer bg-slate-950/60 hover:bg-slate-900/60 transition-colors shrink-0">
                        <Camera size={18} className="text-slate-400 mb-0.5" />
                        <span className="text-[10px] text-slate-400">แนบ/ถ่ายรูป</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handleImageFileChange(e, false)}
                        />
                      </label>
                    )}
                    <div className="text-[11px] text-slate-400">
                      <p className="text-slate-300 font-medium">ภาพถ่ายหน้างาน (ก่อน/หลังซ่อม)</p>
                      <p className="text-[10px] text-slate-500">สามารถถ่ายจากมือถือหรือเลือกไฟล์</p>
                    </div>
                  </div>
                </div>

                {/* 8. Remarks & Details */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    รายละเอียดการแก้ไขเพิ่มเติม / หมายเหตุ
                  </label>
                  <textarea
                    rows={2}
                    placeholder="ระบุรายละเอียดเพิ่มเติม"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                </div>

                {/* Sync Checkbox */}
                <div className="pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncToSheet}
                      onChange={(e) => setSyncToSheet(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
                    />
                    <span>ซิงค์บันทึกข้อมูลเข้าสู่ฐานข้อมูลระบบทันที</span>
                  </label>
                </div>

                {/* Modal Footer Buttons */}
                <div className="pt-3 border-t border-slate-700/80 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Plus size={16} />
                    <span>{isSubmitting ? 'กำลังบันทึกลงระบบ...' : 'บันทึกเข้ารายการซ่อมบำรุง'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Print Preview Modal (Opens when user clicks "ดูตัวอย่างก่อนพิมพ์ A4") */}
      <AnimatePresence>
        {showPrintPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto print:static print:inset-auto print:p-0 print:m-0 print:block print:bg-white print:overflow-visible">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPrintPreview(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm no-print"
            />

            {/* Modal Box (Optimized for A4 Landscape view) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-6xl bg-[#1E293B] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[94vh] print:max-h-none print:border-none print:shadow-none print:bg-white print:w-full print:max-w-none print:m-0 print:p-0 print:rounded-none"
            >
              {/* Modal Top Bar */}
              <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-700/80 flex items-center justify-between gap-3 no-print flex-wrap">
                <div className="flex items-center gap-2">
                  <Printer size={18} className="text-blue-400" />
                  <h3 className="text-sm font-bold text-white">
                    ตัวอย่างเอกสารใบสั่งงาน ({filteredWorkOrders.length} รายการ)
                  </h3>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    📄 A4 แนวนอน (Landscape)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Printer size={14} />
                    <span>สั่งพิมพ์ A4 แนวนอน</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyForLine}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Copy size={13} />
                    <span>ส่ง LINE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPrintPreview(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X size={17} />
                  </button>
                </div>
              </div>

              {/* Printable Content Container inside modal */}
              <div className="p-3 sm:p-5 overflow-y-auto bg-slate-950/40 print:p-0 print:bg-white print:overflow-visible">
                <div 
                  id="printable-work-order" 
                  className="bg-white text-slate-900 rounded-xl p-5 sm:p-6 shadow-xl border border-slate-300 w-full mx-auto printable-area font-sans print:p-0 print:m-0 print:border-none print:shadow-none print:rounded-none print:w-full"
                >
                  {/* Header of Official Document */}
                  <div className="border-b-2 border-slate-800 pb-2.5 mb-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src="/logo.png" 
                          alt="ตราเทศบาลนครระยอง" 
                          className="w-11 h-11 object-contain shrink-0"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        <div>
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <h1 className="text-base font-extrabold text-slate-950 font-sans leading-tight">
                              ใบสั่งงานซ่อมบำรุงไฟฟ้าสาธารณะ
                            </h1>
                            <span className="text-xs font-semibold text-slate-700 font-sans">
                              ฝ่ายสาธารณูปโภค ส่วนการโยธา สำนักช่าง เทศบาลนครระยอง
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            เอกสารมอบหมายช่างตรวจสอบ ซ่อมแซม และบันทึกผลการปฏิบัติงานหน้างาน (A4 แนวนอน)
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-xs text-slate-800">
                            เลขที่: {reportNumber}
                          </span>
                          <span className="text-xs font-semibold text-slate-800">
                            วันที่: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                          จำนวนงานทั้งหมด: <span className="font-bold text-slate-900">{filteredWorkOrders.length}</span> รายการ
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Table of Jobs (Wide format for A4 Landscape) */}
                  {filteredWorkOrders.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 border border-dashed border-slate-300 rounded-lg text-xs">
                      ยังไม่มีรายการแจ้งซ่อมในใบงานนี้
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px] border-collapse border border-slate-400">
                        <thead>
                          <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-400">
                            <th className="py-1.5 px-2 text-center border-r border-slate-400 w-10">ที่</th>
                            <th className="py-1.5 px-2.5 border-r border-slate-400 w-28">ID โคมไฟ</th>
                            <th className="py-1.5 px-3 border-r border-slate-400 min-w-[160px]">สถานที่ / ชุมชน / ซอย</th>
                            <th className="py-1.5 px-2.5 border-r border-slate-400 w-44">ปัญหาที่พบ</th>
                            <th className="py-1.5 px-2.5 border-r border-slate-400 w-44">การซ่อมบำรุงแก้ไข</th>
                            <th className="py-1.5 px-2 border-r border-slate-400 w-28 text-center">พิกัด GPS</th>
                            <th className="py-1.5 px-2 border-r border-slate-400 w-24 text-center">ผู้ปฏิบัติงาน</th>
                            <th className="py-1.5 px-3 border-slate-400 w-44">บันทึกผลซ่อม / อะไหล่ / ลายมือชื่อ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                          {filteredWorkOrders.map((job, idx) => (
                            <tr key={job.id} className="hover:bg-slate-50/50">
                              <td className="py-1.5 px-2 text-center font-bold font-mono border-r border-slate-300 text-slate-700">
                                {idx + 1}
                              </td>
                              <td className="py-1.5 px-2.5 font-mono font-bold text-slate-900 border-r border-slate-300 whitespace-nowrap">
                                <div>{job.poleId}</div>
                                <span className={`inline-block text-[9px] font-sans font-bold leading-none mt-0.5 px-1.5 py-0.5 rounded border ${
                                  job.status === 'เสร็จสิ้น' 
                                    ? 'text-emerald-700 bg-emerald-50 border-emerald-300' 
                                    : 'text-rose-700 bg-rose-50 border-rose-300'
                                }`}>
                                  {job.status}
                                </span>
                              </td>
                              <td className="py-1.5 px-3 border-r border-slate-300 leading-tight">
                                <div className="font-semibold text-slate-900">
                                  {job.community ? `ชุมชน${job.community}` : ''} {job.soi ? `ซอย${job.soi}` : ''}
                                </div>
                                {job.remarks && (
                                  <div className="text-[10px] text-slate-500 italic mt-0.5 line-clamp-1">{job.remarks}</div>
                                )}
                              </td>
                              <td className="py-1.5 px-2.5 border-r border-slate-300 leading-tight">
                                <div className="font-medium text-slate-900">{job.issue}</div>
                              </td>
                              <td className="py-1.5 px-2.5 border-r border-slate-300 leading-tight">
                                <div className="text-[10.5px] text-slate-800">{job.repairAction || '-'}</div>
                                {job.repairDetail && (
                                  <div className="text-[9.5px] text-slate-500">{job.repairDetail}</div>
                                )}
                              </td>
                              <td className="py-1.5 px-2 text-center font-mono text-[9.5px] text-slate-600 border-r border-slate-300 whitespace-nowrap">
                                {job.lat && job.lng ? (
                                  <div>
                                    <div>{job.lat.toFixed(5)}</div>
                                    <div>{job.lng.toFixed(5)}</div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-1.5 px-2 text-center font-medium border-r border-slate-300 text-slate-800 text-[11px] whitespace-nowrap">
                                {job.technician || '-'}
                              </td>
                              <td className="py-1.5 px-3 bg-slate-50/40">
                                <div className="h-6 border-b border-dashed border-slate-400/80"></div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Document Footer */}
                  <div className="mt-3 pt-2 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500 font-sans">
                    <span>* รายการใบสั่งงานบำรุงรักษาไฟฟ้าสาธารณะ เทศบาลนครระยอง (ฝ่ายสาธารณูปโภค ส่วนการโยธา) — กระดาษ A4 แนวนอน</span>
                    <span>พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Quick Update Modal (สำหรับอัปเดตสถานะหลังซ่อมเสร็จ) */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto no-print">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingItem(null)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-[#1E293B] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              <div className="px-5 py-4 bg-slate-900 border-b border-slate-700/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench size={18} className="text-blue-400" />
                  <h3 className="text-sm font-bold text-white">
                    อัปเดตสถานะงานซ่อม: {editingItem.poleId}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto">
                {/* Status Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    สถานะการซ่อมบำรุง
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {STATUS_OPTIONS.map((st) => {
                      const isSel = editingItem.status === st.val;
                      return (
                        <button
                          key={st.val}
                          type="button"
                          onClick={() => setEditingItem(prev => prev ? { ...prev, status: st.val } : null)}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                            isSel ? `${st.color} ring-2 ring-blue-500/40 font-bold shadow-md` : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {st.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Repair Action */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    การซ่อมบำรุงแก้ไข (Repair Action)
                  </label>
                  <input
                    type="text"
                    value={editingItem.repairAction || ''}
                    onChange={(e) => setEditingItem(prev => prev ? { ...prev, repairAction: e.target.value } : null)}
                    placeholder="เช่น เปลี่ยนหลอด LED, ซ่อมต่อสายไฟ"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {COMMON_REPAIRS.map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setEditingItem(prev => prev ? { ...prev, repairAction: r } : null)}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/25 transition-colors cursor-pointer"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Technician & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">
                      ชื่อผู้ปฏิบัติงาน
                    </label>
                    <input
                      type="text"
                      value={editingItem.technician || ''}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, technician: e.target.value } : null)}
                      placeholder="ชื่อช่าง"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">
                      วันที่ซ่อมบำรุงแก้ไข
                    </label>
                    <input
                      type="date"
                      value={editingItem.fixedDate || ''}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, fixedDate: e.target.value } : null)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Photo Upload in Edit Modal */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    รูปภาพการซ่อมบำรุง
                  </label>
                  <div className="flex items-center gap-3">
                    {editingItem.imageUrl ? (
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-700 group shrink-0">
                        <img src={editingItem.imageUrl} alt="รูปงาน" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditingItem(prev => prev ? { ...prev, imageUrl: '' } : null)}
                          className="absolute top-1 right-1 p-1 bg-rose-600/90 text-white rounded-full"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-24 h-18 border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl cursor-pointer bg-slate-950/60 transition-colors shrink-0">
                        <Camera size={18} className="text-slate-400 mb-0.5" />
                        <span className="text-[10px] text-slate-400">แนบ/ถ่ายรูป</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handleImageFileChange(e, true)}
                        />
                      </label>
                    )}
                    <span className="text-[11px] text-slate-400">
                      แนบภาพถ่ายหลังซ่อมแซมเสร็จสิ้นเพื่อยืนยันงาน
                    </span>
                  </div>
                </div>

                {/* Remarks */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    รายละเอียดเพิ่มเติม / หมายเหตุ
                  </label>
                  <textarea
                    rows={2}
                    value={editingItem.remarks || ''}
                    onChange={(e) => setEditingItem(prev => prev ? { ...prev, remarks: e.target.value } : null)}
                    placeholder="หมายเหตุเพิ่มเติม"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3.5 bg-slate-900 border-t border-slate-700/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedItem}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <CheckCircle size={15} />
                  <span>บันทึกและซิงค์ข้อมูลลงระบบ</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
