import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Settings, Database, Check, AlertCircle, RefreshCw, HelpCircle } from 'lucide-react';
import { fetchSpreadsheetMetadata, SheetMetadata } from '../sheetsService';

interface SettingsProps {
  accessToken: string | null;
  currentSpreadsheetId: string;
  currentSheetName: string;
  currentAppName?: string;
  onSave: (spreadsheetId: string, sheetName: string, appName: string) => void;
  onClose: () => void;
}

export default function SheetSettings({ 
  accessToken, 
  currentSpreadsheetId, 
  currentSheetName,
  currentAppName = '',
  onSave, 
  onClose 
}: SettingsProps) {
  const [inputValue, setInputValue] = useState(currentSpreadsheetId);
  const [appName, setAppName] = useState(currentAppName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<SheetMetadata | null>(null);
  const [selectedSheet, setSelectedSheet] = useState(currentSheetName);

  // Helper to extract spreadsheet ID from paste URL
  const extractId = (urlOrId: string): string => {
    const trimmed = urlOrId.trim();
    if (trimmed.includes('docs.google.com/spreadsheets')) {
      const match = trimmed.match(/\/d\/([^/]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }
    return trimmed;
  };

  const handleFetchMetadata = async (targetId: string) => {
    if (!targetId) {
      setError('กรุณากรอก Spreadsheet ID หรือ URL');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const id = extractId(targetId);
      const meta = await fetchSpreadsheetMetadata(id, accessToken);
      setMetadata(meta);
      if (meta.sheetNames.length > 0) {
        // If current sheet name is in the list, keep it, otherwise select the first one
        if (meta.sheetNames.includes(currentSheetName)) {
          setSelectedSheet(currentSheetName);
        } else {
          setSelectedSheet(meta.sheetNames[0]);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('ไม่สามารถดึงข้อมูลได้ โปรดตรวจสอบสิทธิ์การเข้าถึงไฟล์ หรือ ความถูกต้องของ ID/URL');
    } finally {
      setLoading(false);
    }
  };

  // Run on load to fetch current metadata if token is present
  useEffect(() => {
    if (currentSpreadsheetId && accessToken) {
      handleFetchMetadata(currentSpreadsheetId);
    }
  }, [currentSpreadsheetId, accessToken]);

  const handleSaveConfig = () => {
    if (!metadata) return;
    const finalId = extractId(inputValue);
    onSave(finalId, selectedSheet, appName);
  };

  return (
    <div className="bg-[#1E293B] border border-slate-700 rounded-lg p-4 sm:p-5 shadow-2xl space-y-4 max-w-md w-full max-h-[85vh] overflow-y-auto" id="sheet-settings-panel">
      {/* Header */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Settings className="text-blue-500 animate-spin-slow" size={16} />
          <h3 className="text-sm font-bold text-slate-200 font-sans">
            ตั้งค่าการเชื่อมต่อ Google Sheets
          </h3>
        </div>
      </div>

      <div className="space-y-3.5">
        {/* Spreadsheet Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 font-sans block">
            Google Spreadsheet Link / ID
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="วางลิ้งค์หรือรหัส Google Sheet ที่นี่..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500/30"
            />
            <button
              onClick={() => handleFetchMetadata(inputValue)}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded border border-slate-700/60 hover:bg-slate-700 text-xs flex items-center gap-1 hover:text-white transition-colors disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                'ตรวจสอบ'
              )}
            </button>
          </div>
          <span className="text-[10px] text-slate-500 leading-normal block font-sans">
            วาง URL ของ Google Sheet ที่ต้องการเชื่อมโยง ระบบจะแยกแยะข้อมูลและดึงชื่อชีตย่อยมาให้เลือกโดยอัตโนมัติ
          </span>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-3 rounded bg-rose-950/20 border border-rose-500/20 flex gap-2 text-rose-400 text-xs leading-normal font-sans">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Meta Details & Tab selection */}
        {metadata && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded bg-slate-950 border border-slate-800/80 space-y-3"
          >
            <div className="flex items-center gap-2">
              <Database size={13} className="text-emerald-500" />
              <div className="text-[11px] font-semibold text-emerald-400 truncate max-w-[280px]">
                เชื่อมต่อสำเร็จ: {metadata.title}
              </div>
            </div>

            {/* Sub-sheet select */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-sans">
                เลือกแท็บชีตย่อย (Worksheet Tab)
              </label>
              <select
                value={selectedSheet}
                onChange={(e) => setSelectedSheet(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500/30"
              >
                {metadata.sheetNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* AppSheet App Name */}
            <div className="space-y-1 pt-1 border-t border-slate-800">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-sans">
                AppSheet App Name (สำหรับรูปภาพ)
              </label>
              <input
                type="text"
                placeholder="เช่น MyApp-1234567"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500/30 placeholder-slate-600"
              />
              <span className="text-[9px] text-slate-500 block">
                จำเป็นต้องระบุหากต้องการแสดงรูปภาพที่เก็บใน Google Drive ผ่าน AppSheet
              </span>
            </div>
          </motion.div>
        )}

        {/* Informative Guidance */}
        <div className="text-[10px] font-sans text-slate-500 bg-slate-950/20 border border-slate-800/40 p-3 rounded-lg flex gap-2">
          <HelpCircle size={14} className="text-blue-500/50 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-400">วิธีติดตั้งเพื่อใช้งานในทีม</p>
            <ol className="list-decimal pl-3 space-y-1">
              <li>สร้างแบบฟอร์มกรอกงานซ่อมใน AppSheet โดยป้อนข้อมูลเข้า Google Sheet นี้</li>
              <li>แชร์ Google Sheet นี้ให้บัญชีเจ้าหน้าที่/ช่าง หรือเปิดสิทธิ์ให้ทุกคนที่มีลิงก์เข้าดูได้</li>
              <li>เข้าใช้งานด้วยอีเมล Google เดียวกันเพื่อแสดงผลแดชบอร์ดซิงค์ข้อมูลเรียลไทม์</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2 pt-3 border-t border-slate-700">
        <button
          onClick={onClose}
          className="px-3 py-1.5 bg-transparent border border-slate-850 text-slate-400 hover:text-slate-200 text-xs rounded transition-colors"
        >
          ยกเลิก
        </button>
        <button
          onClick={handleSaveConfig}
          disabled={!metadata}
          className="px-3.5 py-1.5 bg-blue-600 text-white font-semibold text-xs rounded hover:bg-blue-500 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:hover:bg-blue-600"
        >
          <Check size={13} />
          บันทึกการตั้งค่า
        </button>
      </div>
    </div>
  );
}
