import { useState } from 'react';
import { Copy, Check, Terminal, ExternalLink, Play, CheckCircle } from 'lucide-react';

export default function AppsScriptHelper() {
  const [copiedGs, setCopiedGs] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);

  const appsScriptGs = `/**
 * Google Apps Script - ระบบซ่อมบำรุงไฟฟ้าสาธารณะ (Backend)
 * วางโค้ดนี้ในส่วน "ตัวแก้ไขสคริปต์" (Extensions > Apps Script)
 */

function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('แดชบอร์ดซ่อมบำรุงไฟฟ้าสาธารณะ Real-time')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * ดึงข้อมูลรายงานการซ่อมทั้งหมดจาก Google Sheets เพื่อส่งต่อไปแสดงผลที่หน้าเว็บ
 */
function getMaintenanceData() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const rows = sheet.getDataRange().getValues();
    
    if (rows.length <= 1) return { headers: [], records: [] };
    
    const headers = rows[0];
    const records = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const record = { rowNum: i + 1 };
      headers.forEach((header, index) => {
        record[header] = row[index] || '';
      });
      records.push(record);
    }
    
    return {
      headers: headers,
      records: records.reverse() // แสดงข้อมูลล่าสุดก่อน
    };
  } catch (error) {
    return { error: error.toString() };
  }
}
`;

  const appsScriptHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>แดชบอร์ดซ่อมบำรุงไฟฟ้าสาธารณะ</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Google Fonts: Prompt -->
  <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Prompt', sans-serif; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">

  <div class="max-w-7xl mx-auto px-4 py-8">
    <!-- Header -->
    <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-slate-800 pb-6">
      <div>
        <h1 class="text-2xl font-bold text-amber-500 flex items-center gap-2">
          <span>⚡</span> ระบบแดชบอร์ดซ่อมบำรุงไฟฟ้าสาธารณะ
        </h1>
        <p class="text-xs text-slate-400 mt-1">
          ระบบรายงานผลสรุปแบบเรียลไทม์จาก Google Sheets (Apps Script Web App)
        </p>
      </div>
      <div id="sync-status" class="text-xs font-mono bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-400">
        กำลังโหลดข้อมูล...
      </div>
    </header>

    <!-- KPI Summary Grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" id="stats-grid">
      <!-- Cards will be populated by JS -->
    </div>

    <!-- Main Content Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Records Table Panel -->
      <div class="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <h2 class="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          📋 บันทึกรายงานการซ่อมบำรุงทั้งหมด
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th class="p-3">ลำดับ</th>
                <th class="p-3">เสาไฟ / รหัส</th>
                <th class="p-3">อาการเสีย</th>
                <th class="p-3">ผู้รับผิดชอบ</th>
                <th class="p-3">สถานะ</th>
              </tr>
            </thead>
            <tbody id="records-table-body" class="divide-y divide-slate-800/40">
              <tr>
                <td colspan="5" class="p-4 text-center text-slate-500">กำลังเชื่อมโยงฐานข้อมูล...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Quick Action Panel -->
      <div class="bg-slate-900/40 border border-slate-800 rounded-xl p-5 h-fit space-y-4">
        <h2 class="text-sm font-semibold text-slate-300 flex items-center gap-2">
          💡 สรุปขั้นตอนการทำระบบ (Workflow)
        </h2>
        <div class="space-y-3.5 text-xs text-slate-400">
          <div class="flex gap-2.5">
            <span class="text-amber-500 font-bold">1.</span>
            <p><strong class="text-slate-200">กรอกข้อมูลภาคสนาม (AppSheet):</strong> เจ้าหน้าที่กรอกข้อมูลซ่อมบำรุงผ่าน AppSheet บนมือถือ ข้อมูลจะวิ่งตรงเข้าสู่ Google Sheet</p>
          </div>
          <div class="flex gap-2.5">
            <span class="text-amber-500 font-bold">2.</span>
            <p><strong class="text-slate-200">เชื่อมฐานข้อมูล (Google Sheets):</strong> สเปรดชีตทำหน้าที่เก็บข้อมูลพิกัด อาการเสีย ผู้รับผิดชอบ และสถานะของงานซ่อม</p>
          </div>
          <div class="flex gap-2.5">
            <span class="text-amber-500 font-bold">3.</span>
            <p><strong class="text-slate-200">ประมวลผล (Apps Script):</strong> โค้ด HTML แดชบอร์ดหน้านี้เรียกข้อมูลจากชีตย่อยและสรุปสถานะซ่อมเสร็จ/คงค้างแบบวินาทีต่อวินาที</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    // ดึงข้อมูลผ่าน Apps Script API เมื่อเปิดหน้าเว็บ
    window.onload = function() {
      google.script.run
        .withSuccessHandler(onSuccess)
        .withFailureHandler(onFailure)
        .getMaintenanceData();
    };

    function onSuccess(data) {
      document.getElementById('sync-status').innerHTML = '🟢 ซิงค์เรียลไทม์สำเร็จ';
      
      if (!data || data.error) {
        onFailure(data ? data.error : 'ไม่พบข้อมูล');
        return;
      }

      const records = data.records;
      
      // คำนวณสถิติ
      let total = records.length;
      let pending = 0;
      let inProgress = 0;
      let completed = 0;
      
      records.forEach(r => {
        // ค้นหาสถานะในคอลัมน์ของชีต
        let status = '';
        for (let key in r) {
          if (key.includes('สถานะ') || key.toLowerCase().includes('status')) {
            status = r[key].toString().trim();
          }
        }
        
        if (status.includes('เสร็จ') || status.toLowerCase().includes('complete')) {
          completed++;
        } else if (status.includes('กำลัง') || status.toLowerCase().includes('progress')) {
          inProgress++;
        } else {
          pending++;
        }
      });

      // แสดงสถิติ
      document.getElementById('stats-grid').innerHTML = \`
        <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl text-left">
          <p class="text-xs text-slate-500 uppercase">รายงานทั้งหมด</p>
          <p class="text-2xl font-bold text-amber-500 font-mono mt-1">\${total}</p>
        </div>
        <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl text-left">
          <p class="text-xs text-slate-500 uppercase">รอดำเนินการ</p>
          <p class="text-2xl font-bold text-rose-500 font-mono mt-1">\${pending}</p>
        </div>
        <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl text-left">
          <p class="text-xs text-slate-500 uppercase">กำลังซ่อม</p>
          <p class="text-2xl font-bold text-blue-500 font-mono mt-1">\${inProgress}</p>
        </div>
        <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl text-left">
          <p class="text-xs text-slate-500 uppercase">เสร็จสิ้น</p>
          <p class="text-2xl font-bold text-emerald-500 font-mono mt-1">\${completed}</p>
        </div>
      \`;

      // แสดงรายการลงในตาราง
      let tableHtml = '';
      if (records.length === 0) {
        tableHtml = '<tr><td colspan="5" class="p-4 text-center text-slate-500">ไม่พบบันทึกงานซ่อมบำรุง</td></tr>';
      } else {
        records.forEach(r => {
          // ดึงค่าอย่างปลอดภัย
          let pole = r['รหัสเสาไฟ'] || r['หมายเลขเสาไฟ'] || r['เสาไฟ'] || r['poleId'] || r['ID'] || 'ไม่ระบุ';
          let issue = r['อาการเสีย'] || r['ปัญหา'] || r['issue'] || 'ไม่ระบุอาการ';
          let tech = r['ผู้ซ่อม'] || r['ช่าง'] || r['technician'] || 'รอมอบหมาย';
          let statusVal = r['สถานะ'] || r['status'] || 'Pending';
          
          let statusBadge = '';
          if (statusVal.includes('เสร็จ') || statusVal.toLowerCase().includes('complete')) {
            statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">เสร็จสิ้น</span>';
          } else if (statusVal.includes('กำลัง') || statusVal.toLowerCase().includes('progress')) {
            statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20">กำลังซ่อม</span>';
          } else {
            statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20">รอดำเนินการ</span>';
          }

          tableHtml += \`
            <tr class="hover:bg-slate-800/20">
              <td class="p-3 text-slate-500 font-mono">#\${r.rowNum}</td>
              <td class="p-3 font-semibold text-slate-100 font-mono">\${pole}</td>
              <td class="p-3 text-slate-300 max-w-[200px] truncate" title="\${issue}">\${issue}</td>
              <td class="p-3 text-slate-400">\${tech}</td>
              <td class="p-3">\${statusBadge}</td>
            </tr>
          \`;
        });
      }
      document.getElementById('records-table-body').innerHTML = tableHtml;
    }

    function onFailure(err) {
      document.getElementById('sync-status').innerHTML = '🔴 เชื่อมต่อล้มเหลว';
      document.getElementById('records-table-body').innerHTML = \`
        <tr>
          <td colspan="5" class="p-4 text-center text-rose-400 font-sans">
            เกิดข้อผิดพลาดในการโหลดข้อมูล: \${err} <br>
            <span class="text-xs text-slate-500">กรุณาตรวจสอบว่าคุณได้วางสคริปต์ลงในชีตที่มีชื่อคอลัมน์ถูกต้อง</span>
          </td>
        </tr>
      \`;
    }
  </script>
</body>
</html>
`;

  const copyText = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#1E293B] border border-slate-700 rounded-lg p-5 shadow-2xl max-w-4xl w-full mx-auto space-y-5" id="apps-script-guide">
      <div className="flex justify-between items-center pb-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Terminal className="text-blue-500" size={18} />
          <h3 className="text-sm font-bold text-slate-200 font-sans">
            คู่มือการติดตั้ง Google Apps Script สำหรับเว็บไซต์ภายในองค์กร
          </h3>
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed font-sans">
        หากต้องการรันเว็บไซต์สรุปรายงานซ่อมแซมให้ทำงานบน <strong className="text-slate-200 font-medium">Google Apps Script Web App</strong> โดยตรงภายใต้โดเมนของ Google Sheets (เพื่อทำงานในสเปรดชีตทันทีแบบไม่มีเซิร์ฟเวอร์ภายนอก) คุณสามารถนำโค้ดและขั้นตอนด้านล่างไปใช้งานได้ทันที:
      </p>

      {/* Steps List */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-sans">
        <div className="p-3 bg-slate-950/60 border border-slate-800/60 rounded-lg space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-blue-400">
            <span>1</span>
            <span>เปิด Apps Script</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            ใน Google Sheet ของคุณ ไปที่เมนู <strong className="text-slate-300 font-normal">ส่วนขยาย (Extensions) &gt; Apps Script</strong>
          </p>
        </div>

        <div className="p-3 bg-slate-950/60 border border-slate-800/60 rounded-lg space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-blue-400">
            <span>2</span>
            <span>ใส่โค้ดหลังบ้าน (Code.gs)</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            คัดลอกโค้ด <strong className="text-slate-300 font-normal">Code.gs</strong> ด้านล่าง ไปวางแทนที่ข้อมูลทั้งหมดในสคริปต์
          </p>
        </div>

        <div className="p-3 bg-slate-950/60 border border-slate-800/60 rounded-lg space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-blue-400">
            <span>3</span>
            <span>สร้างไฟล์หน้าเว็บ (HTML)</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            คลิกเครื่องหมาย <strong className="text-slate-300 font-normal">+</strong> ด้านซ้าย เลือก <strong className="text-slate-300 font-normal">HTML</strong> ตั้งชื่อไฟล์ว่า <strong className="text-slate-300 font-normal">Index</strong> และนำโค้ด HTML ไปวาง
          </p>
        </div>

        <div className="p-3 bg-slate-950/60 border border-slate-800/60 rounded-lg space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-blue-400">
            <span>4</span>
            <span>เผยแพร่ (Deploy)</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            กดปุ่ม <strong className="text-slate-300 font-normal">การทำให้ใช้งานได้ใหม่ (New deployment)</strong> เลือกประเภทเป็น <strong className="text-slate-300 font-normal">เว็บแอป (Web app)</strong> และกดตกลงเพื่อรับลิงก์แดชบอร์ด!
          </p>
        </div>
      </div>

      {/* Code Editor Preview: Code.gs */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-mono text-blue-400 font-bold flex items-center gap-1.5">
            <Terminal size={12} />
            Code.gs (สคริปต์บริการข้อมูลหลังบ้าน)
          </span>
          <button
            onClick={() => copyText(appsScriptGs, setCopiedGs)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 text-[11px] hover:bg-slate-700 text-slate-300 hover:text-white transition-all font-sans"
          >
            {copiedGs ? (
              <>
                <CheckCircle size={12} className="text-emerald-500" />
                คัดลอกแล้ว!
              </>
            ) : (
              <>
                <Copy size={12} />
                คัดลอกโค้ด
              </>
            )}
          </button>
        </div>
        <pre className="p-3 bg-slate-950 border border-slate-850 text-slate-300 font-mono text-[10px] rounded-lg overflow-x-auto max-h-[160px]">
          {appsScriptGs}
        </pre>
      </div>

      {/* Code Editor Preview: Index.html */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-mono text-blue-400 font-bold flex items-center gap-1.5">
            <Terminal size={12} />
            Index.html (หน้ากากแสดงผลแดชบอร์ด)
          </span>
          <button
            onClick={() => copyText(appsScriptHtml, setCopiedHtml)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 text-[11px] hover:bg-slate-700 text-slate-300 hover:text-white transition-all font-sans"
          >
            {copiedHtml ? (
              <>
                <CheckCircle size={12} className="text-emerald-500" />
                คัดลอกแล้ว!
              </>
            ) : (
              <>
                <Copy size={12} />
                คัดลอกโค้ด
              </>
            )}
          </button>
        </div>
        <pre className="p-3 bg-slate-950 border border-slate-850 text-slate-300 font-mono text-[10px] rounded-lg overflow-x-auto max-h-[160px]">
          {appsScriptHtml}
        </pre>
      </div>
    </div>
  );
}
