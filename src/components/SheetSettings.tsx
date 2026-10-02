import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, Database, Check, AlertCircle, RefreshCw, 
  HelpCircle, Link2, Copy, CheckCheck, Code2, ExternalLink, X, Sparkles
} from 'lucide-react';
import { fetchSpreadsheetMetadata, SheetMetadata } from '../sheetsService';

interface SettingsProps {
  accessToken: string | null;
  currentSpreadsheetId: string;
  currentSheetName: string;
  currentAppName?: string;
  onSave: (spreadsheetId: string, sheetName: string, appName: string, appsScriptUrl?: string) => void;
  onClose: () => void;
}

export const APPS_SCRIPT_TEMPLATE = `/**
 * =========================================================================
 * Google Apps Script: ระบบงานซ่อมบำรุงไฟฟ้าสาธารณะ เทศบาลนครระยอง (V2)
 * สำหรับรับข้อมูลบันทึกงานใหม่ (Insert) และอัปเดตงานเดิม (Update) ลง Google Sheets
 * =========================================================================
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var rawData = e.postData ? e.postData.contents : '';
    if (!rawData) {
      return responseJson({ success: false, error: 'ไม่พบข้อมูลที่ส่งมา' });
    }
    
    var payload = JSON.parse(rawData);
    var action = (payload.action || 'auto').toString().toLowerCase(); // 'insert' | 'append' | 'update' | 'auto'
    var sheetName = payload.sheetName || 'การซ่อมบำรุง';
    var historyId = (payload.historyId || payload.rowId || '').toString().trim();
    var rowNumber = parseInt(payload.rowNumber, 10);
    var data = payload.data || {};
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    // ค้นหาเฉพาะแท็บ "การซ่อมบำรุง" เท่านั้น เพื่อความปลอดภัยสูงสุดต่อแท็บงานอื่นในสเปรดชีต
    var sheet = ss.getSheetByName(sheetName) || ss.getSheetByName('การซ่อมบำรุง');
    if (!sheet) {
      return responseJson({ 
        success: false, 
        error: 'ระบบความปลอดภัย: ไม่พบแผ่นงานชื่อ "' + sheetName + '"' 
      });
    }
    
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    if (values.length < 1) {
      return responseJson({ success: false, error: 'แผ่นงานนี้ไม่มีข้อมูลหัวตาราง' });
    }
    
    var headers = values[0];
    var historyIdColIdx = -1;
    var poleColIdx = -1;
    
    for (var c = 0; c < headers.length; c++) {
      var h = headers[c].toString().trim();
      if (h === 'ID ประวัติ' || h === 'id ประวัติ' || h === 'History ID' || h === 'ID' || h === 'id') {
        historyIdColIdx = c;
      }
      if (h === 'ID โคมไฟ' || h === 'รหัสเสา' || h === 'Pole ID') {
        poleColIdx = c;
      }
    }
    
    var targetRow = -1;
    
    // 0. ถ้าคำสั่งเป็น 'delete' ให้ค้นหาตาม "ID ประวัติ" แล้วลบแถวนั้นออกจากชีท
    if (action === 'delete') {
      var rowToDelete = -1;
      if (historyIdColIdx !== -1 && historyId) {
        for (var r = 1; r < values.length; r++) {
          if (values[r][historyIdColIdx].toString().trim() === historyId) {
            rowToDelete = r + 1;
            break;
          }
        }
      }
      if (rowToDelete === -1 && rowNumber && rowNumber >= 2 && rowNumber <= values.length) {
        rowToDelete = rowNumber;
      }
      
      if (rowToDelete !== -1) {
        sheet.deleteRow(rowToDelete);
        return responseJson({
          success: true,
          message: 'ลบแถวที่ ' + rowToDelete + ' (ID: ' + historyId + ') ออกจาก Google Sheet สำเร็จแล้ว',
          deletedRow: rowToDelete
        });
      } else {
        return responseJson({
          success: false,
          error: 'ไม่พบรายการที่ต้องการลบใน Google Sheet (ID: ' + historyId + ')'
        });
      }
    }

    // 1. ตรวจสอบว่า "ID ประวัติ" มีอยู่ในชีทอยู่แล้วหรือไม่
    if (historyIdColIdx !== -1 && historyId) {
      for (var r = 1; r < values.length; r++) {
        if (values[r][historyIdColIdx].toString().trim() === historyId) {
          targetRow = r + 1; // พบแถวเดิมของรายการนี้แล้ว!
          break;
        }
      }
    }

    // 2. ถ้าพบแถวเดิม (ID ประวัติ ตรงกัน) -> ให้อัปเดตข้อมูลในช่องคอลัมน์ของแถวเดิมทันที ห้ามสร้างแถวใหม่เด็ดขาด
    if (targetRow !== -1) {
      var updatedCols = [];
      for (var c = 0; c < headers.length; c++) {
        var colName = headers[c].toString().trim();
        if (data.hasOwnProperty(colName) && data[colName] !== undefined) {
          sheet.getRange(targetRow, c + 1).setValue(data[colName]);
          updatedCols.push(colName);
        }
      }
      return responseJson({
        success: true,
        message: 'อัปเดตข้อมูลในแถวเดิมที่ ' + targetRow + ' (ID: ' + historyId + ') สำเร็จแล้ว',
        row: targetRow,
        action: 'update',
        updatedColumns: updatedCols
      });
    }

    // 3. ถ้าไม่พบ ID ประวัติในชีท -> ถือว่าเป็นรายการใหม่ ให้เพิ่มแถวใหม่ต่อท้าย (Append)
    targetRow = values.length + 1;
    sheet.insertRowAfter(values.length);
    if (historyIdColIdx !== -1 && historyId) {
      sheet.getRange(targetRow, historyIdColIdx + 1).setValue(historyId);
    }
    
    // บันทึกข้อมูลคอลัมน์ของแถวใหม่
    var updatedColumns = [];
    for (var c = 0; c < headers.length; c++) {
      var headerName = headers[c].toString().trim();
      if (data.hasOwnProperty(headerName) && data[headerName] !== undefined) {
        sheet.getRange(targetRow, c + 1).setValue(data[headerName]);
        updatedColumns.push(headerName);
      }
    }
    
    return responseJson({
      success: true,
      message: 'บันทึกข้อมูลลง Google Sheet แถวที่ ' + targetRow + ' (' + (action === 'insert' ? 'เพิ่มแถวใหม่' : 'อัปเดตข้อมูล') + ') สำเร็จแล้ว',
      row: targetRow,
      action: action,
      updatedColumns: updatedColumns
    });
    
  } catch (error) {
    return responseJson({
      success: false,
      error: error.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return responseJson({
    status: 'online',
    message: 'ระบบเชื่อมต่อ Google Apps Script Web App สำหรับเทศบาลนครระยอง พร้อมใช้งาน',
    timestamp: new Date().toISOString()
  });
}

function responseJson(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

export const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzgyxiX20-OzdCThoDgFNnRfqO5LYAPp5GLyup0_WflWBF2GdX4N0ZQhKWW9mKFjz1Ggg/exec';

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
  const [appsScriptUrl, setAppsScriptUrl] = useState(() => {
    return localStorage.getItem('rayong_apps_script_url') || DEFAULT_APPS_SCRIPT_URL;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<SheetMetadata | null>(null);
  const [selectedSheet, setSelectedSheet] = useState(currentSheetName);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoRedirectNotice, setAutoRedirectNotice] = useState<string | null>(null);

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

  const handleSpreadsheetInputChange = (val: string) => {
    const trimmed = val.trim();
    if (trimmed.includes('script.google.com')) {
      setAppsScriptUrl(trimmed);
      localStorage.setItem('rayong_apps_script_url', trimmed);
      setInputValue(currentSpreadsheetId || '1ItTEV7wSB5M-99TUgYzl8v2YL0NZoZXYREzwE-a9u40');
      setAutoRedirectNotice('ตรวจพบ Apps Script URL! ระบบได้ย้ายไปยังช่อง "Apps Script Web App URL (บันทึกสด)" ด้านล่างให้โดยอัตโนมัติแล้วครับ ✨');
      setError(null);
      return;
    }
    setInputValue(val);
  };

  const handleFetchMetadata = async (targetId: string) => {
    if (!targetId) {
      setError('กรุณากรอก Spreadsheet ID หรือ URL');
      return;
    }

    if (targetId.includes('script.google.com')) {
      setAppsScriptUrl(targetId.trim());
      localStorage.setItem('rayong_apps_script_url', targetId.trim());
      setInputValue(currentSpreadsheetId || '1ItTEV7wSB5M-99TUgYzl8v2YL0NZoZXYREzwE-a9u40');
      setAutoRedirectNotice('ตรวจพบ Apps Script URL! ระบบได้ย้ายไปยังช่อง "Apps Script Web App URL (บันทึกสด)" ด้านล่างให้โดยอัตโนมัติแล้วครับ ✨');
      setError(null);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const id = extractId(targetId);
      const meta = await fetchSpreadsheetMetadata(id, accessToken);
      setMetadata(meta);
      if (meta.sheetNames.length > 0) {
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

  useEffect(() => {
    if (currentSpreadsheetId && accessToken) {
      handleFetchMetadata(currentSpreadsheetId);
    }
  }, [currentSpreadsheetId, accessToken]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveConfig = () => {
    const finalId = extractId(inputValue);
    const finalSheet = selectedSheet || currentSheetName;
    localStorage.setItem('rayong_apps_script_url', appsScriptUrl.trim());
    onSave(finalId, finalSheet, appName, appsScriptUrl.trim());
  };

  return (
    <>
      <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-5 shadow-2xl space-y-4 max-w-lg w-full font-sans" id="sheet-settings-panel">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Settings className="text-blue-500 animate-spin-slow" size={17} />
            <h3 className="text-sm font-bold text-slate-100 font-sans">
              ตั้งค่าการเชื่อมต่อ Google Sheets & ระบบบันทึกสด
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Section 1: Spreadsheet Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 font-sans block">
              Google Spreadsheet Link หรือ ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="วางลิ้งค์หรือรหัส Google Sheet ที่นี่..."
                value={inputValue}
                onChange={(e) => handleSpreadsheetInputChange(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => handleFetchMetadata(inputValue)}
                disabled={loading}
                className="px-3.5 py-2 bg-slate-800 text-slate-200 rounded-lg border border-slate-700 hover:bg-slate-700 text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <RefreshCw size={13} className="animate-spin text-blue-400" />
                ) : (
                  'ตรวจสอบ'
                )}
              </button>
            </div>
            {autoRedirectNotice && (
              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 flex items-start gap-2 text-emerald-300 text-xs font-sans">
                <Sparkles size={14} className="shrink-0 mt-0.5 text-emerald-400" />
                <span>{autoRedirectNotice}</span>
              </div>
            )}
            <span className="text-[10.5px] text-slate-500 leading-normal block font-sans">
              ลิงก์ปัจจุบัน: ชีต <code className="text-blue-400 bg-slate-900 px-1 py-0.5 rounded">การซ่อมบำรุง</code> (เทศบาลนครระยอง)
            </span>
          </div>

          {/* Error State */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/20 flex gap-2 text-rose-400 text-xs leading-normal font-sans">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Meta Details & Tab selection */}
          {metadata && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-3"
            >
              <div className="flex items-center gap-2">
                <Database size={13} className="text-emerald-500" />
                <div className="text-[11.5px] font-semibold text-emerald-400 truncate max-w-[340px]">
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
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {metadata.sheetNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* AppSheet App Name */}
              <div className="space-y-1 pt-2 border-t border-slate-800/80">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-sans">
                  AppSheet App Name (สำหรับรูปภาพ Google Drive)
                </label>
                <input
                  type="text"
                  placeholder="เช่น ข้อมูลไฟฟ้าแสงสว่าง-724677635"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-600"
                />
              </div>
            </motion.div>
          )}

          {/* Section 2: Two-way sync to Google Sheets (Apps Script) */}
          <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Link2 className="text-blue-400 shrink-0" size={16} />
                <div>
                  <h4 className="text-xs font-bold text-blue-300 font-sans">
                    ระบบบันทึกแก้ไขข้อมูลกลับ Google Sheet โดยตรง
                  </h4>
                  <p className="text-[10.5px] text-slate-400 mt-0.5">
                    เมื่อคุณแก้ไขในหน้าเว็บ ระบบจะไปอัปเดตบรรทัดใน Google Sheet ให้ทันที
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCodeModal(true)}
                className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              >
                <Code2 size={13} />
                <span>วิธีติดตั้ง & โค้ด</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                <span>Apps Script Web App URL (บันทึกสด)</span>
                {appsScriptUrl ? (
                  <span className="text-[10px] text-emerald-400 font-normal flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    พร้อมซิงค์สด
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-400 font-normal">
                    (ยังไม่ได้เชื่อมต่อ)
                  </span>
                )}
              </label>
              <input
                type="text"
                placeholder="วาง Web App URL ที่ได้จาก Apps Script เช่น https://script.google.com/macros/s/.../exec"
                value={appsScriptUrl}
                onChange={(e) => setAppsScriptUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono text-[11px]"
              />
              <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                หากยังไม่มี URL ให้กดปุ่ม <span className="text-blue-400 font-medium">"วิธีติดตั้ง & โค้ด"</span> ด้านบน เพื่อนำโค้ดไปวางในชีตของท่าน ใช้เวลาเพียง 1 นาที
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-3.5 py-2 bg-transparent border border-slate-700 text-slate-400 hover:text-slate-200 text-xs rounded-lg transition-colors cursor-pointer font-sans"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSaveConfig}
            className="px-4 py-2 bg-blue-600 text-white font-semibold text-xs rounded-lg hover:bg-blue-500 transition-colors flex items-center gap-1.5 shadow-lg shadow-blue-600/20 cursor-pointer font-sans"
          >
            <Check size={14} />
            บันทึกการตั้งค่า
          </button>
        </div>
      </div>

      {/* Code Modal */}
      <AnimatePresence>
        {showCodeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 font-sans">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCodeModal(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-[#1E293B] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/60">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-amber-400" size={17} />
                  <h3 className="text-sm font-bold text-slate-100 font-sans">
                    วิธีติดตั้ง Google Apps Script สำหรับบันทึกข้อมูลแบบ 2-Way Sync
                  </h3>
                </div>
                <button 
                  onClick={() => setShowCodeModal(false)}
                  className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X size={17} />
                </button>
              </div>

              {/* Steps Guide & Code */}
              <div className="p-5 overflow-y-auto space-y-4">
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs text-slate-300">
                  <h4 className="font-bold text-blue-400 text-xs">ขั้นตอนการติดตั้ง (ทำครั้งเดียว):</h4>
                  <div className="p-2.5 bg-blue-900/20 border border-blue-500/20 rounded-lg text-[11px] text-blue-200 space-y-1">
                    <p className="font-semibold text-blue-300">🛡️ ความปลอดภัยต่อระบบงานอื่นใน Sheet นี้:</p>
                    <p className="text-slate-300">
                      สคริปต์นี้ถูกล็อกให้ค้นหาและแก้ไขเฉพาะแถวในแท็บ <strong>"การซ่อมบำรุง"</strong> เท่านั้น จะ<strong>ไม่แตะต้อง</strong>แท็บข้อมูลเสาไฟ หรือแท็บระบบงานอื่นในสเปรดชีตนี้ 100%
                    </p>
                  </div>
                  <ol className="list-decimal pl-4 space-y-2 leading-relaxed text-slate-300 font-sans text-[11.5px]">
                    <li>
                      เปิดไฟล์ Google Sheet ของท่าน (<a href="https://docs.google.com/spreadsheets/d/1ItTEV7wSB5M-99TUgYzl8v2YL0NZoZXYREzwE-a9u40" target="_blank" rel="noreferrer" className="text-blue-400 underline inline-flex items-center gap-1">เปิดสเปรดชีตระยอง <ExternalLink size={10} /></a>)
                    </li>
                    <li>
                      ไปที่เมนูด้านบน <span className="font-semibold text-white bg-slate-800 px-1.5 py-0.5 rounded">ส่วนขยาย (Extensions)</span> &gt; <span className="font-semibold text-white bg-slate-800 px-1.5 py-0.5 rounded">Apps Script</span>
                    </li>
                    <li>
                      <strong>หากมีโค้ดเดิมอยู่แล้ว:</strong> กดเครื่องหมาย <span className="font-semibold text-amber-400">+</span> ด้านซ้าย เลือก <em>สคริปต์</em> แล้วตั้งชื่อว่า <code className="text-amber-300">MaintenanceSync</code> (จะได้ไม่ทับโค้ดเดิม) หรือหากเป็นไฟล์ว่าง ให้วางโค้ดด้านล่างนี้แทนที่ แล้วกด <strong>บันทึก (Ctrl+S)</strong>
                    </li>
                    <li>
                      กดปุ่มสีน้ำเงินมุมขวาบน <span className="font-semibold text-white bg-blue-600 px-1.5 py-0.5 rounded">ทำให้ใช้งานได้ (Deploy)</span> &gt; <span className="font-semibold text-white bg-slate-800 px-1.5 py-0.5 rounded">การทำให้ใช้งานได้รายการใหม่ (New deployment)</span>
                    </li>
                    <li>
                      คลิกรูปเฟืองเลือกประเภท <span className="font-semibold text-white bg-slate-800 px-1.5 py-0.5 rounded">เว็บแอป (Web app)</span>
                      <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-400">
                        <li>ดำเนินการในฐานะ (Execute as): <strong className="text-white">ตัวฉัน (Me)</strong></li>
                        <li>ใครมีสิทธิ์เข้าถึง (Who has access): <strong className="text-emerald-400">ทุกคน (Anyone)</strong> *(สำคัญมาก)*</li>
                      </ul>
                    </li>
                    <li>
                      กด <strong>ทำให้ใช้งานได้ (Deploy)</strong> แล้วคัดลอก <strong>URL เว็บแอป (Web App URL)</strong> ที่ได้ นำมาวางในช่องหน้าต่างตั้งค่านี้ได้ทันที!
                    </li>
                  </ol>
                </div>

                {/* Code box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 font-mono">
                      Code.gs (Google Apps Script Code)
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-sans font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <CheckCheck size={14} className="text-emerald-300" />
                          <span>คัดลอกสำเร็จแล้ว!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>คัดลอกโค้ดสคริปต์</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-300 font-mono overflow-x-auto max-h-56 leading-relaxed selection:bg-blue-600 selection:text-white">
                    {APPS_SCRIPT_TEMPLATE}
                  </pre>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-slate-700 flex justify-end bg-slate-900/60">
                <button
                  onClick={() => setShowCodeModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
