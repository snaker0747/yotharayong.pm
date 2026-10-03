import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, ClipboardList, Printer,
  Settings, RefreshCw, Sun, Moon, LogOut, X, 
  CheckCircle2, Clock, Hourglass, Shield, ExternalLink,
  PanelLeftClose, PanelLeftOpen, ChevronRight, ChevronLeft
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

  const isLight = theme === 'light';
  const renderSidebarContent = (collapsed: boolean) => (
    <div className={`flex flex-col h-full font-sans select-none transition-all duration-300 ${
      isLight 
        ? 'bg-white text-slate-800 border-r border-slate-200' 
        : 'bg-[#111827] text-slate-200 border-r border-slate-800/80'
    } ${
      collapsed ? 'items-center' : ''
    }`}>
      {/* Brand Header */}
      <div className={`flex items-center transition-all ${
        isLight ? 'border-b border-slate-200' : 'border-b border-slate-800/80'
      } ${
        collapsed 
          ? 'py-3.5 px-2 flex-col justify-center w-full' 
          : 'p-5 justify-between w-full'
      }`}>
        {collapsed ? (
          <div className="flex flex-col items-center w-full">
            {/* Circular Expand Toggle Button on Top (matching user's reference image) */}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm mx-auto mb-3 ${
                  isLight 
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300' 
                    : 'bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/80'
                }`}
                title="ขยายเมนูด้านซ้าย"
                aria-label="ขยายเมนูด้านซ้าย"
              >
                <ChevronRight size={13} />
              </button>
            )}

            {/* Logo Emblem */}
            <div 
              onClick={onToggleCollapse}
              className={`w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center mx-auto cursor-pointer hover:ring-2 hover:ring-emerald-500/40 transition-all overflow-hidden ${
                isLight ? 'border border-slate-200 shadow-sm' : 'border border-slate-700/60 shadow-md'
              }`}
              title="เทศบาลนครระยอง (คลิกเพื่อขยายเมนู)"
            >
              <img 
                src="/logo.png" 
                alt="สำนักช่าง" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.parentElement) {
                    e.currentTarget.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-emerald-600 text-white font-bold text-xs rounded-lg">ระยอง</div>';
                  }
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden ${
              isLight ? 'border border-slate-200 shadow-sm' : 'border border-slate-700/60 shadow-lg'
            }`}>
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
                <h2 className={`text-sm font-bold tracking-normal truncate ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  ระบบงานซ่อมบำรุง
                </h2>
              </div>
              <p className={`text-[11px] truncate mt-0.5 ${
                isLight ? 'text-slate-500 font-medium' : 'text-slate-400'
              }`}>
                เทศบาลนครระยอง
              </p>
            </div>
          </div>
        )}

        {!collapsed && (
          <div className="flex items-center gap-1">
            {/* Desktop Collapse Button */}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className={`hidden lg:flex items-center justify-center p-1.5 rounded-lg transition-colors cursor-pointer group ${
                  isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="ย่อเมนูเหลือเฉพาะไอคอน"
                aria-label="ย่อเมนูเหลือเฉพาะไอคอน"
              >
                <PanelLeftClose size={18} className="group-hover:text-emerald-500 transition-colors" />
              </button>
            )}

            {/* Mobile close button */}
            <button
              onClick={onCloseMobile}
              className={`lg:hidden p-1 rounded-lg transition-colors cursor-pointer ${
                isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="ปิดเมนู"
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Nav List */}
      <div className={`flex-1 overflow-y-auto w-full ${collapsed ? 'px-2 py-3 space-y-4' : 'px-3 py-4 space-y-5'}`}>
        {/* Main Section */}
        <div>
          {collapsed ? (
            <span className={`text-[9px] font-semibold tracking-tight text-center block uppercase mt-1 mb-2 font-mono ${
              isLight ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Main Menu
            </span>
          ) : (
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-wider font-mono ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}>
                MAIN MENU
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                isLight ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-emerald-400 bg-emerald-500/10'
              }`}>
                V2.0
              </span>
            </div>
          )}

          <div className={`space-y-1.5 ${collapsed ? 'flex flex-col items-center' : ''}`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              if (collapsed) {
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      onCloseMobile();
                    }}
                    title={`${item.label} (${item.sublabel})`}
                    className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer group ${
                      isActive
                        ? isLight
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-sm ring-1 ring-emerald-400/40'
                          : 'bg-slate-800 text-emerald-400 border border-slate-700/90 shadow-md shadow-black/40 ring-1 ring-emerald-500/40'
                        : isLight
                          ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <Icon size={19} className={isActive ? (isLight ? 'text-emerald-700' : 'text-emerald-400') : (isLight ? 'text-slate-500 group-hover:text-emerald-600 transition-colors' : 'text-slate-400 group-hover:text-emerald-400 transition-colors')} />
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-rose-500 text-white text-[9px] font-mono font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#0B132B] shadow-sm">
                        {item.badge.includes(' ') ? item.badge.split(' ')[0] : item.badge}
                      </span>
                    )}
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 font-semibold'
                      : isLight
                        ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-white/20 text-white' 
                        : isLight
                          ? 'bg-slate-100 text-slate-600 group-hover:text-emerald-600 group-hover:bg-slate-200/70'
                          : 'bg-slate-800 text-slate-400 group-hover:text-emerald-400 group-hover:bg-slate-700/60'
                    }`}>
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs truncate">{item.label}</div>
                      <div className={`text-[10px] truncate ${isActive ? 'text-emerald-100' : isLight ? 'text-slate-400' : 'text-slate-400'}`}>
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
          {collapsed ? (
            <span className={`text-[9px] font-semibold tracking-tight text-center block uppercase mt-2 mb-2 font-mono ${
              isLight ? 'text-slate-400' : 'text-slate-500'
            }`}>
              System
            </span>
          ) : (
            <div className="px-3 mb-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider font-mono ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}>
                SYSTEM & SYNC
              </span>
            </div>
          )}

          <div className={`space-y-1.5 ${collapsed ? 'flex flex-col items-center' : ''}`}>
            {/* Sync button */}
            {collapsed ? (
              <button
                onClick={() => {
                  onRefresh();
                  onCloseMobile();
                }}
                disabled={isRefreshing}
                title={`ซิงค์ข้อมูลระบบ ${lastRefreshed ? `(อัปเดต ${lastRefreshed})` : '(กดเพื่อดึงข้อมูลสด)'}`}
                className={`w-11 h-11 rounded-xl flex items-center justify-center border border-transparent transition-all cursor-pointer group disabled:opacity-50 ${
                  isLight 
                    ? 'text-slate-500 hover:text-emerald-600 hover:bg-slate-100' 
                    : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800/60'
                }`}
              >
                <RefreshCw size={18} className={isRefreshing ? 'animate-spin text-emerald-500' : 'group-hover:text-emerald-500 transition-colors'} />
              </button>
            ) : (
              <button
                onClick={() => {
                  onRefresh();
                  onCloseMobile();
                }}
                disabled={isRefreshing}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer group ${
                  isLight 
                    ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900' 
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${
                    isLight 
                      ? 'bg-slate-100 text-slate-600 group-hover:text-emerald-600 group-hover:bg-slate-200/70' 
                      : 'bg-slate-800 text-slate-400 group-hover:text-emerald-400 group-hover:bg-slate-700/60'
                  }`}>
                    <RefreshCw size={17} className={isRefreshing ? 'animate-spin text-emerald-500' : ''} />
                  </div>
                  <div>
                    <div className="text-xs font-medium">ซิงค์ข้อมูลระบบ</div>
                    <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {lastRefreshed ? `อัปเดต ${lastRefreshed}` : 'กดเพื่อดึงข้อมูลสด'}
                    </div>
                  </div>
                </div>
              </button>
            )}

            {/* Settings button */}
            {collapsed ? (
              <button
                onClick={() => {
                  onOpenSettings();
                  onCloseMobile();
                }}
                title="ตั้งค่าการเชื่อมต่อ (ฐานข้อมูล & บริการ API)"
                className={`w-11 h-11 rounded-xl flex items-center justify-center border border-transparent transition-all cursor-pointer group ${
                  isLight 
                    ? 'text-slate-500 hover:text-blue-600 hover:bg-slate-100' 
                    : 'text-slate-400 hover:text-blue-400 hover:bg-slate-800/60'
                }`}
              >
                <Settings size={18} className="group-hover:text-blue-500 transition-colors" />
              </button>
            ) : (
              <button
                onClick={() => {
                  onOpenSettings();
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer group ${
                  isLight 
                    ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900' 
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${
                    isLight 
                      ? 'bg-slate-100 text-slate-600 group-hover:text-blue-600 group-hover:bg-slate-200/70' 
                      : 'bg-slate-800 text-slate-400 group-hover:text-blue-400 group-hover:bg-slate-700/60'
                  }`}>
                    <Settings size={17} />
                  </div>
                  <div>
                    <div className="text-xs font-medium">ตั้งค่าการเชื่อมต่อ</div>
                    <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>ฐานข้อมูล & บริการ API</div>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Quick Summary Pill Widget */}
        {!collapsed && (
          <div className={`p-3 rounded-xl space-y-2 ${
            isLight ? 'bg-slate-50 border border-slate-200 shadow-xs' : 'bg-slate-900/80 border border-slate-800'
          }`}>
            <div className={`flex items-center justify-between text-[11px] font-medium ${
              isLight ? 'text-slate-700' : 'text-slate-300'
            }`}>
              <span>สถานะงานวันนี้</span>
              <span className={`text-[10px] font-mono font-bold ${
                isLight ? 'text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200' : 'text-emerald-400'
              }`}>
                100% Sync
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-center font-mono">
              <div className={`p-1.5 rounded-lg border ${
                isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950/60 border-slate-800'
              }`}>
                <div className={`text-[10px] font-bold ${isLight ? 'text-rose-600' : 'text-rose-400'}`}>รอ</div>
                <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{pendingRecords}</div>
              </div>
              <div className={`p-1.5 rounded-lg border ${
                isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950/60 border-slate-800'
              }`}>
                <div className={`text-[10px] font-bold ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>กำลัง</div>
                <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{inProgressRecords}</div>
              </div>
              <div className={`p-1.5 rounded-lg border ${
                isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950/60 border-slate-800'
              }`}>
                <div className={`text-[10px] font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>เสร็จ</div>
                <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{completedRecords}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer User Profile & Actions */}
      <div className={`w-full ${
        isLight ? 'border-t border-slate-200 bg-slate-50' : 'border-t border-slate-800/80 bg-slate-950/40'
      } ${
        collapsed ? 'p-2.5 flex flex-col items-center gap-2' : 'p-3 space-y-2'
      }`}>
        {collapsed ? (
          <>
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={onToggleTheme}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  isLight 
                    ? 'text-slate-600 hover:text-amber-600 hover:bg-slate-200' 
                    : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/80'
                }`}
                title={theme === 'light' ? 'เปลี่ยนเป็นธีมมืด' : 'เปลี่ยนเป็นธีมสว่าง'}
              >
                {theme === 'light' ? <Moon size={15} /> : <Sun size={15} className="text-amber-400" />}
              </button>
              <button
                onClick={onLogout}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  isLight 
                    ? 'text-slate-600 hover:text-rose-600 hover:bg-slate-200' 
                    : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800/80'
                }`}
                title="ออกจากระบบ"
              >
                <LogOut size={15} />
              </button>
            </div>
            <div 
              className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shadow-md cursor-default mt-0.5 ${
                isLight 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                  : 'bg-emerald-600/25 border border-emerald-500/40 text-emerald-400'
              }`}
              title="ฝ่ายสาธารณูปโภค สำนักช่าง เทศบาลนครระยอง"
            >
              รย
            </div>
          </>
        ) : (
          <div className={`flex items-center justify-between p-2 rounded-xl ${
            isLight ? 'bg-white border border-slate-200 shadow-xs' : 'bg-slate-900/60 border border-slate-800/60'
          }`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                isLight 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                  : 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400'
              }`}>
                รย
              </div>
              <div className="min-w-0">
                <div className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>ฝ่ายสาธารณูปโภค</div>
                <div className={`text-[10px] truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>สำนักช่าง ระยอง</div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Theme Toggle */}
              <button
                onClick={onToggleTheme}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isLight 
                    ? 'text-slate-600 hover:text-amber-600 hover:bg-slate-100' 
                    : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                }`}
                title="สลับโหมด มืด/สว่าง"
              >
                {theme === 'light' ? <Moon size={15} /> : <Sun size={15} className="text-amber-400" />}
              </button>

              {/* Logout */}
              <button
                onClick={onLogout}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isLight 
                    ? 'text-slate-600 hover:text-rose-600 hover:bg-slate-100' 
                    : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                }`}
                title="ออกจากระบบ"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Left Sidebar (Full w-64 or Icon-only w-[70px]) */}
      <aside
        className={`hidden lg:block shrink-0 h-screen sticky top-0 z-30 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-[70px]' : 'w-64'
        }`}
      >
        <div className={`${isCollapsed ? 'w-[70px]' : 'w-64'} h-full transition-all duration-300`}>
          {renderSidebarContent(isCollapsed)}
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
              {renderSidebarContent(false)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
