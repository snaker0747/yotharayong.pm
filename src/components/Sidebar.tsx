import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, ClipboardList, Printer,
  Settings, RefreshCw, Sun, Moon, LogOut, X, 
  CheckCircle2, Clock, Hourglass, Shield, ExternalLink,
  PanelLeftClose
} from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  totalRecords: number;
  pendingRecords: number;
  inProgressRecords: number;
  completedRecords: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastRefreshed: string;
  onLogout: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({
  activeSection,
  onNavigate,
  totalRecords,
  pendingRecords,
  inProgressRecords,
  completedRecords,
  theme,
  onToggleTheme,
  onOpenSettings,
  onRefresh,
  isRefreshing,
  lastRefreshed,
  onLogout,
  isMobileOpen,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'ภาพรวมระบบ',
      sublabel: 'แดชบอร์ด, กราฟ & แผนที่',
      icon: LayoutDashboard,
      badge: totalRecords > 0 ? `${totalRecords}` : null,
      badgeColor: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    },
    {
      id: 'records',
      label: 'รายการแจ้งซ่อม',
      sublabel: 'รายการงาน & รายละเอียด',
      icon: ClipboardList,
      badge: pendingRecords > 0 ? `${pendingRecords} รอซ่อม` : null,
      badgeColor: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    },
    {
      id: 'reports',
      label: 'รายงาน',
      sublabel: 'ใบสั่งงาน & พิมพ์ส่งช่าง',
      icon: Printer,
      badge: 'ใบงาน A4',
      badgeColor: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#111827] dark:bg-[#0B132B] text-slate-200 border-r border-slate-800/80 font-sans select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white border border-slate-700/60 p-1 flex items-center justify-center shadow-lg shrink-0 overflow-hidden">
            <img 
              src="/logo.png" 
              alt="สำนักช่าง เทศบาลนครระยอง" 
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.parentElement) {
                  e.currentTarget.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-emerald-600 text-white font-bold text-xs rounded-lg">ระยอง</div>';
                }
              }}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-sm font-bold text-white tracking-normal truncate">
                ระบบงานซ่อมบำรุง
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              เทศบาลนครระยอง
            </p>
          </div>
        </div>

        {/* Header action buttons */}
        <div className="flex items-center gap-1">
          {/* Desktop Collapse Button */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer group"
              title="ซ่อนแท็บด้านซ้าย"
              aria-label="ซ่อนแท็บด้านซ้าย"
            >
              <PanelLeftClose size={18} className="group-hover:text-emerald-400 transition-colors" />
            </button>
          )}

          {/* Mobile close button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="ปิดเมนู"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Main Section */}
        <div>
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              MAIN MENU
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono font-medium">
              V2.0
            </span>
          </div>

          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-white/20 text-white' 
                        : 'bg-slate-800 text-slate-400 group-hover:text-emerald-400 group-hover:bg-slate-700/60'
                    }`}>
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs truncate">{item.label}</div>
                      <div className={`text-[10px] truncate ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                        {item.sublabel}
                      </div>
                    </div>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-sans font-medium whitespace-nowrap ${
                      isActive ? 'bg-white/20 text-white' : item.badgeColor
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Management Section */}
        <div>
          <div className="px-3 mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              SYSTEM & SYNC
            </span>
          </div>
          <div className="space-y-1">
            {/* Sync button */}
            <button
              onClick={() => {
                onRefresh();
                onCloseMobile();
              }}
              disabled={isRefreshing}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400 group-hover:text-emerald-400 group-hover:bg-slate-700/60">
                  <RefreshCw size={17} className={isRefreshing ? 'animate-spin text-emerald-400' : ''} />
                </div>
                <div>
                  <div className="text-xs font-medium">ซิงค์ข้อมูลระบบ</div>
                  <div className="text-[10px] text-slate-400">
                    {lastRefreshed ? `อัปเดต ${lastRefreshed}` : 'กดเพื่อดึงข้อมูลสด'}
                  </div>
                </div>
              </div>
            </button>

            {/* Settings button */}
            <button
              onClick={() => {
                onOpenSettings();
                onCloseMobile();
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400 group-hover:text-blue-400 group-hover:bg-slate-700/60">
                  <Settings size={17} />
                </div>
                <div>
                  <div className="text-xs font-medium">ตั้งค่าการเชื่อมต่อ</div>
                  <div className="text-[10px] text-slate-400">ฐานข้อมูล & บริการ API</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Quick Summary Pill Widget */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium">
            <span>สถานะงานวันนี้</span>
            <span className="text-[10px] text-emerald-400 font-mono">100% Sync</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-center font-mono">
            <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-rose-400">รอ</div>
              <div className="text-xs font-bold text-white">{pendingRecords}</div>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-blue-400">กำลัง</div>
              <div className="text-xs font-bold text-white">{inProgressRecords}</div>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-emerald-400">เสร็จ</div>
              <div className="text-xs font-bold text-white">{completedRecords}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer User Profile & Actions */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
              รย
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">ฝ่ายสาธารณูปโภค</div>
              <div className="text-[10px] text-slate-400 truncate">สำนักช่าง ระยอง</div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="สลับโหมด มืด/สว่าง"
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} className="text-amber-400" />}
            </button>

            {/* Logout */}
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="ออกจากระบบ"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Left Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 h-screen sticky top-0 z-30 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-0 opacity-0 overflow-hidden pointer-events-none' : 'w-64 opacity-100'
        }`}
      >
        <div className="w-64 h-full">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            {/* Slide-over panel */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="relative w-72 max-w-[85vw] h-full z-10 shadow-2xl"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
