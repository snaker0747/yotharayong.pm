import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  initAuth, googleSignIn, logout, getAccessToken 
} from './auth';
import { 
  fetchSheetRecords, MaintenanceRecord, saveRecordOverride, deleteRecordOverride, syncRecordToGoogleSheet, deleteRecordFromGoogleSheet, DEFAULT_APPS_SCRIPT_URL 
} from './sheetsService';
import DashboardStats from './components/DashboardStats';
import MapVisualizer from './components/MapVisualizer';
import AnalyticsCharts from './components/AnalyticsCharts';
import RecordsList from './components/RecordsList';
import RecordDetail from './components/RecordDetail';
import EditRecordModal from './components/EditRecordModal';
import SheetSettings from './components/SheetSettings';
import Sidebar from './components/Sidebar';
import LoginPage from './components/LoginPage';
import WorkOrderReport from './components/WorkOrderReport';
import { User } from 'firebase/auth';
import { MOCK_RAYONG_RECORDS } from './mockData';
import { 
  Lightbulb, ShieldAlert, LogOut, RefreshCw, Settings, 
  Terminal, Globe, Loader2, Play, ChevronRight, CheckCircle2,
  Sun, Moon, Menu, ClipboardList,
  LayoutDashboard, Printer
} from 'lucide-react';

// Default target spreadsheet ID from user's request
const DEFAULT_SPREADSHEET_ID = '1ItTEV7wSB5M-99TUgYzl8v2YL0NZoZXYREzwE-a9u40';
const DEFAULT_SHEET_NAME = 'การซ่อมบำรุง'; // Default to Maintenance sheet as requested

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('rayong_app_theme');
    return (saved as 'light' | 'dark') || 'dark';
  });

  const [isCustomLoggedIn, setIsCustomLoggedIn] = useState(() => {
    return localStorage.getItem('rayong_custom_logged_in') === 'true' || 
           sessionStorage.getItem('rayong_custom_logged_in') === 'true';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('rayong_app_theme', theme);
  }, [theme]);

  // Pre-configure the default Rayong Apps Script Web App URL & self-heal spreadsheet ID
  useEffect(() => {
    const current = localStorage.getItem('rayong_apps_script_url');
    if (!current || !current.includes('script.google.com')) {
      localStorage.setItem('rayong_apps_script_url', DEFAULT_APPS_SCRIPT_URL);
    }

    const savedId = localStorage.getItem('pole_spreadsheet_id');
    if (!savedId || savedId.includes('script.google.com') || savedId.startsWith('AKfycb') || savedId === '1jt7vq78sOvRlb2rjAZqxhwF5YvEozrvEXPZSr9I3S-0') {
      localStorage.setItem('pole_spreadsheet_id', DEFAULT_SPREADSHEET_ID);
      setSpreadsheetId(DEFAULT_SPREADSHEET_ID);
    }

    const savedSheet = localStorage.getItem('pole_sheet_name');
    if (!savedSheet || savedSheet === 'Form Responses 1' || savedSheet === 'ชีต1') {
      localStorage.setItem('pole_sheet_name', DEFAULT_SHEET_NAME);
      setSheetName(DEFAULT_SHEET_NAME);
    }
  }, []);
  const [user, setUser] = useState<User | null>(() => {
    const isLogged = localStorage.getItem('rayong_custom_logged_in') === 'true' || 
                     sessionStorage.getItem('rayong_custom_logged_in') === 'true';
    if (isLogged) {
      return {
        displayName: 'ทีมบำรุงรักษา ระยอง (rayongpm)',
        email: 'rayongcity.works@gmail.com',
        photoURL: null,
      } as any;
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(() => {
    const isLogged = localStorage.getItem('rayong_custom_logged_in') === 'true' || 
                     sessionStorage.getItem('rayong_custom_logged_in') === 'true';
    return isLogged ? 'mock-rayong-token-888' : null;
  });
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Sheet connection config
  const [spreadsheetId, setSpreadsheetId] = useState(() => {
    const saved = localStorage.getItem('pole_spreadsheet_id');
    if (!saved || saved === '1jt7vq78sOvRlb2rjAZqxhwF5YvEozrvEXPZSr9I3S-0' || saved.includes('script.google.com') || saved.startsWith('AKfycb')) {
      localStorage.setItem('pole_spreadsheet_id', DEFAULT_SPREADSHEET_ID);
      return DEFAULT_SPREADSHEET_ID;
    }
    return saved;
  });
  const [sheetName, setSheetName] = useState(() => {
    const saved = localStorage.getItem('pole_sheet_name');
    if (!saved || saved === 'Form Responses 1' || saved === 'ชีต1') {
      localStorage.setItem('pole_sheet_name', DEFAULT_SHEET_NAME);
      return DEFAULT_SHEET_NAME;
    }
    return saved;
  });
  const [appSheetAppName, setAppSheetAppName] = useState(() => {
    return localStorage.getItem('pole_appsheet_name') || 'ข้อมูลไฟฟ้าแสงสว่าง-724677635';
  });

  // Selected and Editing state
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);

  // Modal open states
  const [showSettings, setShowSettings] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('rayong_sidebar_collapsed') === 'true';
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('rayong_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleNavigate = (sectionId: string) => {
    setActiveSection(sectionId);
    setSelectedRecord(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 1. Initialize Auth on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        if (currentUser && accessToken) {
          setUser(currentUser);
          setToken(accessToken);
        }
        setLoadingAuth(false);
      },
      () => {
        const isLogged = localStorage.getItem('rayong_custom_logged_in') === 'true' || 
                         sessionStorage.getItem('rayong_custom_logged_in') === 'true';
        if (!isLogged) {
          setUser(null);
          setToken(null);
        }
        setLoadingAuth(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Load data helper
  const loadData = useCallback(async (accessToken: string | null, targetId: string, targetSheet: string) => {
    setLoadingData(true);
    setError(null);
    try {
      const data = await fetchSheetRecords(targetId, targetSheet, accessToken);
      setRecords(data);
      setLastRefreshed(new Date().toLocaleTimeString('th-TH'));
      
      // Auto-reconcile selectedRecord: only keep updated if already open, never auto-open on load
      setSelectedRecord(prev => {
        if (!prev) return null;
        const prevId = (prev.raw?.['ID ประวัติ'] || prev.id || '').trim();
        const stillExists = data.find(r => (r.raw?.['ID ประวัติ'] || r.id || '').trim() === prevId);
        return stillExists || null;
      });

      // Auto-reconcile editingRecord if open
      setEditingRecord(prev => {
        if (!prev) return null;
        const prevId = (prev.raw?.['ID ประวัติ'] || prev.id || '').trim();
        const stillExists = data.find(r => (r.raw?.['ID ประวัติ'] || r.id || '').trim() === prevId);
        if (!stillExists) {
          setIsEditModalOpen(false);
          return null;
        }
        return stillExists;
      });
    } catch (err: any) {
      console.error(err);
      // Fallback to offline mock data on failure
      setRecords(MOCK_RAYONG_RECORDS);
      setSelectedRecord(prev => {
        if (!prev) return null;
        const prevId = (prev.raw?.['ID ประวัติ'] || prev.id || '').trim();
        return MOCK_RAYONG_RECORDS.find(r => (r.raw?.['ID ประวัติ'] || r.id || '').trim() === prevId) || null;
      });
      setError(
        'กำลังใช้งานโหมดออฟไลน์/ข้อมูลตัวอย่างของระยอง (หากต้องการซิงค์สด กรุณาเปิดแชร์ไฟล์ชีตเป็น "ทุกคนที่มีลิงก์มีสิทธิ์อ่าน" หรือตั้งค่าบัญชี Google)'
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Load when token, spreadsheetId, or sheetName changes
  useEffect(() => {
    if (token) {
      loadData(token, spreadsheetId, sheetName);
    }
  }, [token, spreadsheetId, sheetName, loadData]);

  // 3. Auto Refresh Engine
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && token && !showSettings) {
      interval = setInterval(() => {
        loadData(token, spreadsheetId, sheetName);
      }, 60000); // refresh every 60s
    }
    return () => clearInterval(interval);
  }, [autoRefresh, token, spreadsheetId, sheetName, showSettings, loadData]);

  const handleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
      }
    } catch (err) {
      console.error('Login failed', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setRecords([]);
    setSelectedRecord(null);
    localStorage.removeItem('rayong_custom_logged_in');
    sessionStorage.removeItem('rayong_custom_logged_in');
    setIsCustomLoggedIn(false);
  };

  const handleSaveSettings = (newId: string, newName: string, newAppName: string, newAppsScriptUrl?: string) => {
    setSpreadsheetId(newId);
    setSheetName(newName);
    setAppSheetAppName(newAppName);
    localStorage.setItem('pole_spreadsheet_id', newId);
    localStorage.setItem('pole_sheet_name', newName);
    localStorage.setItem('pole_appsheet_name', newAppName);
    if (newAppsScriptUrl !== undefined) {
      localStorage.setItem('rayong_apps_script_url', newAppsScriptUrl.trim());
    }
    setShowSettings(false);
    if (token) {
      loadData(token, newId, newName);
    }
  };

  const handleRecordSelect = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
  };

  const handleOpenEdit = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setEditingRecord(record);
    setIsEditModalOpen(true);
  };

  const handleSaveRecord = async (updatedRecord: MaintenanceRecord, action: 'insert' | 'update' = 'insert') => {
    // 1. Optimistic update local state immediately (update if exists, append if new)
    setRecords(prev => {
      const exists = prev.some(r => r.id === updatedRecord.id);
      if (exists) {
        return prev.map(r => r.id === updatedRecord.id ? updatedRecord : r);
      } else {
        return [updatedRecord, ...prev];
      }
    });
    setSelectedRecord(updatedRecord);
    setEditingRecord(updatedRecord);
    
    // 2. Persist in localStorage so it stays upon refresh
    saveRecordOverride(updatedRecord);

    // 3. Sync to Google Sheets
    const result = await syncRecordToGoogleSheet(updatedRecord, sheetName, undefined, action);
    return result;
  };

  const handleDeleteRecord = async (historyId: string) => {
    const targetId = (historyId || '').trim();
    if (!targetId) return { success: false, message: 'ไม่พบ ID ประวัติสำหรับลบ' };

    // 1. Optimistic update local state immediately
    setRecords(prev => prev.filter(r => (r.raw?.['ID ประวัติ'] || r.id || '').trim() !== targetId));
    setSelectedRecord(prev => {
      if (!prev) return null;
      const prevId = (prev.raw?.['ID ประวัติ'] || prev.id || '').trim();
      return prevId === targetId ? null : prev;
    });

    // 2. Clear stored local override
    deleteRecordOverride(targetId);

    // 3. Sync deletion to Google Sheet via Apps Script
    const result = await deleteRecordFromGoogleSheet(targetId, sheetName);

    // 4. Background re-fetch to ensure fresh data and row indices
    if (token) {
      loadData(token, spreadsheetId, sheetName);
    }
    return result;
  };

  if (!isCustomLoggedIn) {
    return (
      <LoginPage 
        theme={theme}
        onThemeToggle={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
        onLoginSuccess={() => {
          setIsCustomLoggedIn(true);
          setUser({
            displayName: 'ทีมบำรุงรักษา ระยอง (rayongpm)',
            email: 'rayongcity.works@gmail.com',
            photoURL: null,
          } as any);
          setToken('mock-rayong-token-888');
        }} 
      />
    );
  }

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col items-center justify-center font-sans">
        <Loader2 className="text-blue-500 animate-spin" size={32} />
        <span className="text-xs text-slate-400 mt-2.5 font-sans">กำลังตรวจสอบความถูกต้องบัญชี...</span>
      </div>
    );
  }

  // --- UNAUTHENTICATED SCREEN ---
  if (!user || !token) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col justify-between p-6 relative overflow-hidden font-sans">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-radial-gradient from-blue-500/5 via-transparent to-transparent pointer-events-none" />

        {/* Header decoration */}
        <div className="max-w-4xl mx-auto w-full flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <img src="/maintenance-icon.png" alt="maintenance plan" className="w-7 h-7 object-contain" />
            <span className="text-sm font-bold tracking-tight font-sans text-slate-200">
              maintenance plan
            </span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="max-w-4xl mx-auto w-full flex flex-col md:flex-row items-center gap-12 z-10 py-12">
          <div className="flex-1 space-y-6 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold">
              <Globe size={13} />
              ระบบแดชบอร์ดซิงค์ข้อมูลเรียลไทม์
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-100 tracking-tight leading-tight">
              ระบบแดชบอร์ดสรุปสถานะ <br />
              <span className="text-gradient bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                ซ่อมบำรุงไฟฟ้าสาธารณะ
              </span>
            </h1>

            <p className="text-sm text-slate-400 leading-relaxed max-w-lg">
              ช่วยให้ช่างและเจ้าหน้าที่ตรวจสอบสถานะการแจ้งซ่อมเสาไฟฟ้าแบบเรียลไทม์ เชื่อมโยงตรงผ่านแอปพลิเคชันภาคสนามสู่ฐานข้อมูลกลาง พร้อมแสดงจุดเสียบนแผนที่วิเคราะห์ความถี่ปัญหาได้อย่างแม่นยำ
            </p>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              {/* Google Sign-In Button formatted precisely per guidelines */}
              <button onClick={handleLogin} className="gsi-material-button cursor-pointer w-fit">
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">เข้าใช้งานด้วย Google Accounts</span>
                </div>
              </button>
            </div>
          </div>

          <div className="flex-1 w-full max-w-full md:max-w-none bg-neutral-900/40 border border-neutral-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-neutral-300 font-mono tracking-wider uppercase border-b border-neutral-800 pb-2">
              💡 โครงสร้างระบบ (Architecture)
            </h3>
            
            <div className="space-y-4 text-xs">
              <div className="flex gap-3">
                <span className="h-6 w-6 rounded bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold shrink-0">1</span>
                <div>
                  <h4 className="font-semibold text-neutral-200">เจ้าหน้าที่ภาคสนามรายงานผ่านระบบมือถือ</h4>
                  <p className="text-neutral-500 mt-0.5">พิกัด GPS, รหัสเสาไฟฟ้า และสถานะการเสีย อัพเดทเรียลไทม์</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="h-6 w-6 rounded bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold shrink-0">2</span>
                <div>
                  <h4 className="font-semibold text-neutral-200">ระบบฐานข้อมูลคลาวด์แบบรวมศูนย์ (Cloud Database)</h4>
                  <p className="text-neutral-500 mt-0.5">ทำงานร่วมกับฐานข้อมูลหลัก เพื่อส่งต่อพิกัดเข้าสู่ระบบวิเคราะห์</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="h-6 w-6 rounded bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold shrink-0">3</span>
                <div>
                  <h4 className="font-semibold text-neutral-200">แดชบอร์ดเรียลไทม์ คัดกรองและประมวลผล</h4>
                  <p className="text-neutral-500 mt-0.5">ประเมินเสาสรุปอาการเสีย ยอดคงเหลือ และช่างที่รับงานได้อย่างมืออาชีพ</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="max-w-4xl mx-auto w-full text-center text-[10px] text-neutral-600 border-t border-neutral-900 pt-4 z-10">
          ความพึงพอใจการให้บริการไฟฟ้าสาธารณะ เทศบาลนครระยอง | ระบบเชื่อมความปลอดภัยด้วยเทคโนโลยี GIS
        </div>
      </div>
    );
  }

  // Summary counts for navigation badges
  const pendingCount = records.filter(r => 
    r.status === 'Pending' || r.statusThai === 'รอดำเนินการ' || r.status === 'รอซ่อม' || r.status === 'รอดำเนินการ' || !r.status
  ).length;
  const inProgressCount = records.filter(r => 
    r.status === 'In Progress' || r.statusThai === 'กำลังดำเนินการ' || r.status === 'กำลังซ่อม' || r.status === 'กำลังดำเนินการ'
  ).length;
  const completedCount = records.filter(r => 
    r.status === 'Completed' || r.statusThai === 'เสร็จสิ้น' || r.statusThai === 'ซ่อมเสร็จสิ้น' || r.status === 'เสร็จสิ้น' || r.status === 'ซ่อมแล้วเสร็จ'
  ).length;

  // --- MAIN AUTHORIZED DASHBOARD ---
  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex font-sans relative" id="authorized-app-layout">
      {/* Dynamic Settings Modal overlay */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <SheetSettings
                accessToken={token}
                currentSpreadsheetId={spreadsheetId}
                currentSheetName={sheetName}
                currentAppName={appSheetAppName}
                onSave={handleSaveSettings}
                onClose={() => setShowSettings(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 1. Left Navigation Sidebar (Figma / Modern App UI) */}
      <Sidebar
        activeSection={activeSection}
        onNavigate={handleNavigate}
        totalRecords={records.length}
        pendingRecords={pendingCount}
        inProgressRecords={inProgressCount}
        completedRecords={completedCount}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
        onOpenSettings={() => setShowSettings(true)}
        onRefresh={() => loadData(token, spreadsheetId, sheetName)}
        isRefreshing={loadingData}
        lastRefreshed={lastRefreshed}
        onLogout={handleLogout}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* 2. Main Content Right Panel */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-[#0F172A]">
        {/* Top Navbar Header */}
        <header className="border-b border-slate-700/80 bg-[#1E293B]/90 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            {/* Left: Sidebar Toggle Button (Mobile Only) & Title */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile-only menu drawer trigger */}
              <button
                onClick={() => setIsMobileSidebarOpen(prev => !prev)}
                className="lg:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700 transition-all cursor-pointer shrink-0 flex items-center justify-center"
                title="เปิดเมนู"
              >
                <Menu size={19} />
              </button>

              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-white font-sans tracking-tight whitespace-nowrap">
                  ระบบงานซ่อมบำรุงไฟฟ้าสาธารณะ
                </h1>
                <p className="text-xs text-slate-400 whitespace-nowrap truncate">
                  ฝ่ายสาธารณูปโภค ส่วนการโยธา เทศบาลนครระยอง
                </p>
              </div>
            </div>

            {/* Middle: Tab Switcher pills */}
            <div className="hidden md:flex items-center p-1 rounded-xl bg-slate-800/90 border border-slate-700 text-xs">
              <button
                onClick={() => handleNavigate('dashboard')}
                className={`px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSection === 'dashboard'
                    ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <LayoutDashboard size={14} />
                <span>ภาพรวม & แผนที่</span>
              </button>
              <button
                onClick={() => handleNavigate('records')}
                className={`px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSection === 'records'
                    ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <ClipboardList size={14} />
                <span>รายการแจ้งซ่อม</span>
                {pendingCount > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeSection === 'records' ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {pendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => handleNavigate('reports')}
                className={`px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSection === 'reports'
                    ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Printer size={14} />
                <span>รายงาน & ใบสั่งงาน</span>
              </button>
            </div>

            {/* Right: Actions, Sync Status & Quick Controls */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Sync Live Pill */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-medium text-slate-200">ซิงค์ข้อมูลเรียลไทม์</span>
                {lastRefreshed && (
                  <span className="text-slate-400 text-[11px]">({lastRefreshed} น.)</span>
                )}
              </div>

              {/* Auto refresh checkbox */}
              <label className="hidden xl:flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer hover:text-slate-200 transition-colors">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="accent-emerald-500 rounded bg-slate-950 border-slate-800"
                />
                <span>ออโต้ 60 วิ</span>
              </label>

              {/* Refresh button */}
              <button
                onClick={() => loadData(token, spreadsheetId, sheetName)}
                disabled={loadingData}
                className="p-2 rounded-xl border border-slate-700 bg-slate-800 text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/50 transition-colors disabled:opacity-50 cursor-pointer"
                title="รีเฟรชข้อมูลล่าสุด"
              >
                <RefreshCw size={17} className={loadingData ? 'animate-spin' : ''} />
              </button>

              {/* Settings button */}
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-xl border border-slate-700 bg-slate-800 text-blue-400 hover:text-blue-300 hover:border-blue-500/50 transition-colors cursor-pointer"
                title="ตั้งค่าเชื่อมต่อ Sheet"
              >
                <Settings size={17} />
              </button>

              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                className="p-2 rounded-xl border border-slate-700 bg-slate-800 text-amber-400 hover:text-amber-300 hover:border-amber-500/50 transition-colors cursor-pointer"
                title={theme === 'light' ? 'เปลี่ยนเป็นโหมดมืด (Dark)' : 'เปลี่ยนเป็นโหมดสว่าง (Light)'}
              >
                {theme === 'light' ? <Moon size={17} className="text-indigo-400" /> : <Sun size={17} className="text-amber-400" />}
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Subheader Tab Switcher */}
        <div className="md:hidden border-b border-slate-700/80 bg-[#1E293B] px-4 py-2 flex items-center gap-2">
          <button
            onClick={() => handleNavigate('dashboard')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeSection === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard size={13} />
            <span>ภาพรวม</span>
          </button>
          <button
            onClick={() => handleNavigate('records')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeSection === 'records'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <ClipboardList size={13} />
            <span>แจ้งซ่อม</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-400 font-bold">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => handleNavigate('reports')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeSection === 'reports'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <Printer size={13} />
            <span>รายงาน</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Error Alert */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/20 flex gap-3 text-rose-300 text-sm leading-normal font-sans">
              <ShieldAlert size={20} className="shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium">{error}</p>
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 text-xs transition-colors cursor-pointer"
                >
                  ตั้งค่าชีตสเปรดชีตของคุณ
                </button>
              </div>
            </div>
          )}

          {/* Loading Spinner */}
          {loadingData && records.length === 0 ? (
            <div className="py-28 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="animate-spin text-emerald-500 mb-3" size={32} />
              <span className="text-sm font-sans font-medium">กำลังโหลดและจัดโครงสร้างข้อมูลซ่อมบำรุง...</span>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeSection === 'dashboard' && (
                /* PAGE 1: ภาพรวมระบบ (KPI Cards + กราฟสถิติ + แผนที่ GIS) */
                <motion.div
                  key="view-dashboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                  id="section-dashboard"
                >
                  {/* 1. KPI Status Cards */}
                  <DashboardStats
                    records={records}
                    onStatusSelect={(status) => {
                      setSelectedStatusFilter(status);
                      if (status) {
                        handleNavigate('records');
                      }
                    }}
                    selectedStatus={selectedStatusFilter}
                  />

                  {/* 2. Analytics & Trends Charts */}
                  <AnalyticsCharts records={records} />

                  {/* 3. GIS Map Visualizer */}
                  <div id="section-map">
                    <MapVisualizer
                      records={records}
                      onSelectRecord={handleRecordSelect}
                      selectedRecord={selectedRecord}
                      theme={theme}
                      appName={appSheetAppName}
                      tableName={sheetName}
                    />
                  </div>
                </motion.div>
              )}

              {activeSection === 'records' && (
                /* PAGE 2: รายการแจ้งซ่อม (รายการรับเรื่องแจ้งซ่อมทั้งหมด - เต็มพื้นที่หน้าเว็บเพื่อประหยัดเนื้อที่) */
                <motion.div
                  key="view-records"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                  id="section-records"
                >
                  <div className="w-full bg-[#1E293B] border border-slate-700/80 rounded-2xl p-4 sm:p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-700/80 pb-3.5 flex-wrap gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                          <ClipboardList size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-bold text-slate-100 font-sans">
                              รายการรับเรื่องแจ้งซ่อมทั้งหมด
                            </h4>
                            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                              ทั้งหมด {records.length} งาน
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            คลิกที่แถวรายการเพื่อเปิดดูรายละเอียดรายงานการซ่อมบำรุง และกดแก้ไขข้อมูล
                          </p>
                        </div>
                      </div>
                      {selectedStatusFilter && (
                        <button
                          onClick={() => setSelectedStatusFilter(null)}
                          className="text-xs text-emerald-400 hover:text-emerald-300 font-medium underline cursor-pointer"
                        >
                          แสดงทั้งหมด (ล้างตัวกรอง: {selectedStatusFilter})
                        </button>
                      )}
                    </div>
                    <RecordsList
                      records={records}
                      onSelectRecord={handleRecordSelect}
                      onEditRecord={handleOpenEdit}
                      selectedRecord={selectedRecord}
                      selectedStatusFilter={selectedStatusFilter}
                      onStatusFilterChange={setSelectedStatusFilter}
                    />
                  </div>
                </motion.div>
              )}

              {activeSection === 'reports' && (
                /* PAGE 3: รายงาน (ใบสั่งงาน & บันทึกการปฏิบัติงาน พิมพ์ A4 & ส่งไลน์) */
                <motion.div
                  key="view-reports"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                  id="section-reports"
                >
                  <WorkOrderReport
                    records={records}
                    theme={theme}
                    onSyncNewRecord={handleSaveRecord}
                    onDeleteRecord={handleDeleteRecord}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-slate-800 bg-[#0F172A] px-6 py-4 text-center text-xs text-slate-500 font-sans">
          ฝ่ายสาธารณูปโภค ส่วนการโยธา สำนักช่าง เทศบาลนครระยอง © 2569 | ระบบบริหารจัดการและซ่อมบำรุงไฟฟ้าสาธารณะอัจฉริยะ
        </footer>
      </div>

      {/* Detail Record Popup Modal (คลิกในรายการ แล้วขึ้น popup รายละเอียดรายงานการซ่อมบำรุง เพื่อประหยัดเนื้อที่เว็บ) */}
      <AnimatePresence>
        {activeSection === 'records' && selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRecord(null)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal Dialog Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-2xl bg-[#1E293B] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-10 my-auto max-h-[92vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <RecordDetail
                record={selectedRecord}
                appName={appSheetAppName}
                tableName={sheetName}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteRecord}
                onClose={() => setSelectedRecord(null)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Record Popup Modal */}
      <EditRecordModal
        isOpen={isEditModalOpen}
        record={editingRecord}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveRecord}
      />
    </div>
  );
}
