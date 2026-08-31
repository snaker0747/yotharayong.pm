import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  initAuth, googleSignIn, logout, getAccessToken 
} from './auth';
import { 
  fetchSheetRecords, MaintenanceRecord 
} from './sheetsService';
import DashboardStats from './components/DashboardStats';
import MapVisualizer from './components/MapVisualizer';
import AnalyticsCharts from './components/AnalyticsCharts';
import RecordsList from './components/RecordsList';
import RecordDetail from './components/RecordDetail';
import SheetSettings from './components/SheetSettings';
import AppsScriptHelper from './components/AppsScriptHelper';
import LoginPage from './components/LoginPage';
import { User } from 'firebase/auth';
import { MOCK_RAYONG_RECORDS } from './mockData';
import { 
  Lightbulb, ShieldAlert, LogOut, RefreshCw, Settings, 
  Terminal, Globe, Loader2, Play, ChevronRight, CheckCircle2,
  Sun, Moon
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
    const saved = localStorage.getItem('pole_spreadsheet_id_v2');
    if (!saved) {
      localStorage.setItem('pole_spreadsheet_id_v2', DEFAULT_SPREADSHEET_ID);
      return DEFAULT_SPREADSHEET_ID;
    }
    return saved;
  });
  const [sheetName, setSheetName] = useState(() => {
    const saved = localStorage.getItem('pole_sheet_name_v2');
    if (!saved) {
      localStorage.setItem('pole_sheet_name_v2', DEFAULT_SHEET_NAME);
      return DEFAULT_SHEET_NAME;
    }
    return saved;
  });
  const [appSheetAppName, setAppSheetAppName] = useState(() => {
    return localStorage.getItem('pole_appsheet_name') || 'ข้อมูลไฟฟ้าแสงสว่าง-724677635';
  });

  // Selected state
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);

  // Modal open states
  const [showSettings, setShowSettings] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

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
      
      // Auto-select the first record if none is selected
      if (data.length > 0 && !selectedRecord) {
        setSelectedRecord(data[0]);
      }
    } catch (err: any) {
      console.error(err);
      // Fallback to offline mock data on failure
      setRecords(MOCK_RAYONG_RECORDS);
      if (MOCK_RAYONG_RECORDS.length > 0 && !selectedRecord) {
        setSelectedRecord(MOCK_RAYONG_RECORDS[0]);
      }
      setError(
        'กำลังใช้งานโหมดออฟไลน์/ข้อมูลตัวอย่างของระยอง (หากต้องการซิงค์สด กรุณาเปิดแชร์ไฟล์ชีตเป็น "ทุกคนที่มีลิงก์มีสิทธิ์อ่าน" หรือตั้งค่าบัญชี Google)'
      );
    } finally {
      setLoadingData(false);
    }
  }, [selectedRecord]);

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

  const handleSaveSettings = (newId: string, newName: string, newAppName: string) => {
    setSpreadsheetId(newId);
    setSheetName(newName);
    setAppSheetAppName(newAppName);
    localStorage.setItem('pole_spreadsheet_id_v2', newId);
    localStorage.setItem('pole_sheet_name_v2', newName);
    localStorage.setItem('pole_appsheet_name', newAppName);
    setShowSettings(false);
    if (token) {
      loadData(token, newId, newName);
    }
  };

  const handleRecordSelect = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
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
        <span className="text-xs text-slate-500 mt-2.5 font-mono">กำลังตรวจสอบความถูกต้องบัญชี...</span>
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
            <span className="p-2 rounded-lg bg-blue-600/10 text-blue-500">
              <Lightbulb size={20} className="stroke-[2.5] animate-pulse" />
            </span>
            <span className="text-sm font-bold tracking-tight font-sans text-slate-200">
              Public Lighting Command Center
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded">
            Rayong City Works v1.0
          </span>
        </div>

        {/* Hero Section */}
        <div className="max-w-4xl mx-auto w-full flex flex-col md:flex-row items-center gap-12 z-10 py-12">
          <div className="flex-1 space-y-6 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold">
              <Globe size={13} />
              ระบบแดชบอร์ดซิงค์ตรงจาก Google Sheets
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-100 tracking-tight leading-tight">
              ระบบแดชบอร์ดสรุปสถานะ <br />
              <span className="text-gradient bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                ซ่อมบำรุงไฟฟ้าสาธารณะ
              </span>
            </h1>

            <p className="text-sm text-slate-400 leading-relaxed max-w-lg">
              ช่วยให้ช่างและเจ้าหน้าที่ตรวจสอบสถานะการแจ้งซ่อมเสาไฟฟ้าแบบเรียลไทม์ เชื่อมโยงตรงผ่านแอปพลิเคชันภาคสนาม (AppSheet) สู่ Google Sheets พร้อมแสดงจุดเสียบนแผนที่วิเคราะห์ความถี่ปัญหาได้อย่างแม่นยำ
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
                  <h4 className="font-semibold text-neutral-200">เจ้าหน้าที่ภาคสนามกรอกผ่าน AppSheet</h4>
                  <p className="text-neutral-500 mt-0.5">พิกัด GPS, รหัสเสาไฟฟ้า และสถานะการเสีย อัพเดทเรียลไทม์</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="h-6 w-6 rounded bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold shrink-0">2</span>
                <div>
                  <h4 className="font-semibold text-neutral-200">Google Sheets เก็บฐานข้อมูลแบบรวมศูนย์</h4>
                  <p className="text-neutral-500 mt-0.5">ทำงานร่วมกับสเปรดชีตหลัก เพื่อส่งต่อพิกัดเข้าสู่ระบบวิเคราะห์</p>
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

  // --- MAIN AUTHORIZED DASHBOARD ---
  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col font-sans relative pb-8" id="authorized-app-layout">
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

      {/* Primary Top Bar Navigation */}
      <header className="border-b border-slate-700 bg-[#1E293B] sticky top-0 backdrop-blur-md z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          {/* Brand/Title */}
          <div className="flex items-center gap-4">
            <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden flex items-center justify-center bg-white border border-slate-600 shadow-md shrink-0">
              <img src="/logo.png" alt="สำนักช่าง เทศบาลนครระยอง" className="w-full h-full object-cover p-1.5" onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.parentElement) e.currentTarget.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-blue-600 text-white rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lightbulb"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg></div>';
              }} />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans leading-tight">
                ระบบงานซ่อมบำรุงไฟฟ้าสาธารณะ
              </h1>
              <p className="text-sm sm:text-base font-semibold font-sans text-slate-400 mt-0.5">
                ฝ่ายสาธารณูปโภค ส่วนการโยธา สำนักช่าง เทศบาลนครระยอง
              </p>
            </div>
          </div>

          {/* Nav Links / Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-end">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-lg border border-slate-700 bg-slate-800 text-amber-400 hover:text-amber-300 hover:border-amber-500/50 transition-colors cursor-pointer"
              title={theme === 'light' ? 'เปลี่ยนเป็นโหมดมืด (Dark Mode)' : 'เปลี่ยนเป็นโหมดสว่าง (Light Mode)'}
              id="header-theme-toggle"
            >
              {theme === 'light' ? <Moon size={18} className="text-indigo-400" /> : <Sun size={18} className="text-amber-400" />}
            </button>

            {/* Config & Auto refresh tools */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg border border-slate-700 bg-slate-800 text-blue-400 hover:text-blue-300 hover:border-blue-500/50 transition-colors cursor-pointer"
              title="ตั้งค่าชีต"
            >
              <Settings size={18} />
            </button>
            
            <button
              onClick={() => loadData(token, spreadsheetId, sheetName)}
              disabled={loadingData}
              className="p-2 rounded-lg border border-slate-700 bg-slate-800 text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/50 transition-colors disabled:opacity-50 cursor-pointer"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw size={18} className={loadingData ? 'animate-spin' : ''} />
            </button>

            {/* Profile Detail */}
            <div className="flex items-center gap-2.5 pl-2.5 border-l border-slate-700">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Profile'}
                  className="w-9 h-9 rounded-full border border-slate-700"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-300 font-bold uppercase border border-slate-600">
                  {user.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <button
                onClick={handleLogout}
                className="p-1.5 text-rose-500 hover:text-rose-400 transition-colors cursor-pointer ml-1"
                title="ออกจากระบบ"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 mt-6 flex-1 w-full">
        <div className="space-y-6" id="dashboard-active-view">
            
            {/* Real-time sync status line */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#1E293B] border border-slate-700 rounded-lg px-4 py-3 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="font-bold text-slate-200 font-sans">เชื่อมโยงข้อมูล (Sync Active)</span>
              </div>
              
              <div className="flex items-center gap-4 text-xs font-mono text-slate-400 w-full sm:w-auto justify-between sm:justify-end">
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200 transition-colors font-sans">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="accent-blue-500 rounded bg-slate-950 border-slate-800"
                  />
                  <span>รีเฟรชอัตโนมัติ (60 วิ)</span>
                </label>
                {lastRefreshed && (
                  <span className="font-semibold text-slate-300">ข้อมูลล่าสุด: {lastRefreshed} น.</span>
                )}
              </div>
            </div>

            {/* Error alerts */}
            {error && (
              <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-500/20 flex gap-3 text-rose-300 text-sm leading-normal font-sans">
                <ShieldAlert size={20} className="shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-medium">{error}</p>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="px-3 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 text-xs transition-colors cursor-pointer"
                  >
                    ตั้งค่าชีตสเปรดชีตของคุณ
                  </button>
                </div>
              </div>
            )}

            {/* Load State Spinner */}
            {loadingData && records.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center text-slate-500">
                <Loader2 className="animate-spin text-blue-500 mb-2" size={24} />
                <span className="text-xs font-mono">กำลังจัดลำดับและวิเคราะห์จุดพิกัดเสาไฟ...</span>
              </div>
            ) : (
              <>
                {/* 1. Metric KPI Cards */}
                <DashboardStats
                  records={records}
                  onStatusSelect={setSelectedStatusFilter}
                  selectedStatus={selectedStatusFilter}
                />

                {/* 2. Visual & Analytics Charts (Top Section) */}
                <div className="mb-6">
                  <AnalyticsCharts records={records} />
                </div>

                {/* 3. Data List & Detail Panel (Bottom Section) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column (2/3 width) - Search & Records list + Map Visualizer */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-[#1E293B] border border-slate-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-3">
                        <h4 className="text-base font-semibold text-slate-100 font-sans">
                          รายการรับเรื่องแจ้งซ่อมทั้งหมด ({records.length} งาน)
                        </h4>
                      </div>
                      <RecordsList
                        records={records}
                        onSelectRecord={handleRecordSelect}
                        selectedRecord={selectedRecord}
                        selectedStatusFilter={selectedStatusFilter}
                        onStatusFilterChange={setSelectedStatusFilter}
                      />
                    </div>

                  </div>

                  {/* Right Column (1/3 width) - Deep Info Selected Panel / Instructions */}
                  <div className="space-y-6">
                    <AnimatePresence mode="wait">
                      {selectedRecord ? (
                        <motion.div
                          key={selectedRecord.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <RecordDetail
                            record={selectedRecord}
                            appName={appSheetAppName}
                            tableName={sheetName}
                            onClose={() => setSelectedRecord(null)}
                          />
                        </motion.div>
                      ) : (
                        <div className="bg-[#1E293B] border border-slate-700 rounded-lg p-6 text-center text-slate-400 min-h-[160px] flex flex-col items-center justify-center gap-3 font-sans shadow-sm">
                          <Lightbulb size={24} className="text-blue-500 animate-pulse" />
                          <div className="space-y-1">
                            <h5 className="text-xs font-bold text-slate-300">ข้อมูลรายละเอียดรายการซ่อม</h5>
                            <p className="text-[11px] text-slate-500 max-w-xs">
                              คลิกเลือกรายการแจ้งซ่อมจากตารางด้านซ้าย เพื่อดูข้อมูลพิกัด อาการชำรุด ลิงก์รูปภาพถ่ายจริง และหมายเหตุโดยละเอียด
                            </p>
                          </div>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Map Visualizer (Moved to the very bottom) */}
                <div className="mt-6">
                  <MapVisualizer
                    records={records}
                    onSelectRecord={handleRecordSelect}
                    selectedRecord={selectedRecord}
                    theme={theme}
                    appName={appSheetAppName}
                    tableName={sheetName}
                  />
                </div>
              </>
            )}

          </div>
      </main>
    </div>
  );
}
