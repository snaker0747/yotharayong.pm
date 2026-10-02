export interface MaintenanceRecord {
  id: string; // row index or unique key
  timestamp: string;
  poleId: string;
  issue: string;
  location: string;
  lat: number | null;
  lng: number | null;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Waiting for Parts' | string;
  statusThai: string;
  technician: string;
  fixedDate: string;
  imageUrl: string;
  remarks: string;
  repairAction?: string;
  community?: string;
  soi?: string;
  raw: Record<string, string>; // original key-value pairs
}

export interface SheetMetadata {
  id: string;
  title: string;
  sheetNames: string[];
}

// Map Thai headers to standardized English keys
function mapHeaderToKey(header: string): string {
  const h = header.trim().toLowerCase();
  
  if (h.includes('ประทับเวลา') || h.includes('timestamp') || h.includes('เวลา')) {
    return 'timestamp';
  }
  if (h.includes('ประวัติ') || h.includes('history')) {
    return 'historyId';
  }
  if (h.includes('รหัสเสา') || h.includes('หมายเลขเสา') || h.includes('โคมไฟ') || h.includes('pole') || h.includes('เสาไฟ') || (h.includes('id') && !h.includes('ประวัติ'))) {
    return 'poleId';
  }
  if (h.includes('อาการ') || h.includes('ปัญหา') || h.includes(' defect') || h.includes('issue') || h.includes('ชำรุด')) {
    return 'issue';
  }
  if (h.includes('ชุมชน') || h.includes('เขต') || h.includes('community')) {
    return 'community';
  }
  if (h.includes('ซอย') || h.includes('ถนน') || h.includes('soi') || h.includes('road')) {
    return 'soi';
  }
  if (h.includes('สถานที่') || h.includes('ที่อยู่') || h.includes('บริเวณ') || h.includes('location') || h.includes('จุดอ้างอิง')) {
    return 'location';
  }
  if (h.includes('ละติจูด') || h.includes('latitude') || h.includes('lat')) {
    return 'lat';
  }
  if (h.includes('ลองจิจูด') || h.includes('longitude') || h.includes('lng')) {
    return 'lng';
  }
  if (h.includes('พิกัด') || h.includes('gps') || h.includes('coor')) {
    return 'coordinates';
  }
  if (h.includes('สถานะ') || h.includes('status')) {
    return 'status';
  }
  if (h.includes('ผู้ซ่อม') || h.includes('ช่าง') || h.includes('technician') || h.includes('ผู้ปฏิบัติงาน')) {
    return 'technician';
  }
  if (h.includes('วันที่ซ่อม') || h.includes('วันที่เสร็จ') || h.includes('fixed') || h.includes('date')) {
    return 'fixedDate';
  }
  if (h.includes('รูปภาพ') || h.includes('รูป') || h.includes('image') || h.includes('photo') || h.includes('pic')) {
    return 'imageUrl';
  }
  if (h.includes('หมายเหตุ') || h.includes('remark') || h.includes('note') || h.includes('รายละเอียดการแก้ไขเพิ่มเติม')) {
    return 'remarks';
  }
  if (h.includes('การซ่อมบำรุงแก้ไข') || h.includes('การแก้ไข') || h.includes('repair')) {
    return 'repairAction';
  }
  return h;
}

// Map Thai status to standard status
function mapStatus(statusVal: string): { eng: string; thai: string } {
  const val = statusVal.trim().toLowerCase();
  if (!val) {
    return { eng: 'Pending', thai: 'รอดำเนินการ' };
  }
  
  if (val.includes('เสร็จ') || val.includes('สำเร็จ') || val.includes('เรียบร้อย') || val.includes('complete') || val.includes('done') || val.includes('success')) {
    return { eng: 'Completed', thai: 'ซ่อมเสร็จสิ้น' };
  }
  if (val.includes('กำลัง') || val.includes('ดำเนิน') || val.includes('ซ่อมอยู่') || val.includes('progress') || val.includes('active')) {
    return { eng: 'In Progress', thai: 'กำลังดำเนินการ' };
  }
  if (val.includes('รออะไหล่') || val.includes('อะไหล่') || val.includes('part') || val.includes('wait')) {
    return { eng: 'Waiting for Parts', thai: 'รออะไหล่/วัสดุ' };
  }
  if (val.includes('รอ') || val.includes('pending') || val.includes('แจ้งซ่อม')) {
    return { eng: 'Pending', thai: 'รอดำเนินการ' };
  }
  
  // Default fallback
  return { eng: statusVal, thai: statusVal };
}

// Extract Lat/Lng from GPS coordinate strings like "13.0123, 101.0456"
function parseCoordinates(coordStr: string): { lat: number | null; lng: number | null } {
  if (!coordStr) return { lat: null, lng: null };
  const parts = coordStr.split(/[\s,]+/);
  if (parts.length >= 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }
  return { lat: null, lng: null };
}

export function parseCSV(csvText: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = '';

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal);
      currentVal = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentVal);
      lines.push(row);
      row = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal || row.length > 0) {
    row.push(currentVal);
    lines.push(row);
  }
  return lines;
}

export function getStoredRecordOverrides(): Record<string, Partial<MaintenanceRecord>> {
  try {
    const raw = localStorage.getItem('rayong_record_overrides');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveRecordOverride(record: MaintenanceRecord): void {
  try {
    const current = getStoredRecordOverrides();
    current[record.id] = record;
    if (record.poleId) {
      current[`pole_${record.poleId}`] = record;
    }
    localStorage.setItem('rayong_record_overrides', JSON.stringify(current));
  } catch (err) {
    console.warn('Failed to save record override to localStorage:', err);
  }
}

export function clearRecordOverrides(): void {
  try {
    localStorage.removeItem('rayong_record_overrides');
  } catch {}
}

export function parseRowsToRecords(rows: string[][]): MaintenanceRecord[] {
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map(h => h || '');
  const records: MaintenanceRecord[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const raw: Record<string, string> = {};
    
    // Create raw mapping
    headers.forEach((header, index) => {
      raw[header] = row[index] || '';
    });

    let poleId = '';
    let timestamp = '';
    let issue = '';
    let location = '';
    let community = '';
    let soi = '';
    let lat: number | null = null;
    let lng: number | null = null;
    let statusVal = '';
    let technician = '';
    let fixedDate = '';
    let imageUrl = '';
    let remarks = '';
    let repairAction = '';

    headers.forEach((header, index) => {
      const key = mapHeaderToKey(header);
      const value = (row[index] || '').trim();

      switch (key) {
        case 'timestamp':
          if (value && (!timestamp || timestamp.length < value.length)) timestamp = value;
          break;
        case 'poleId':
          if (value && !poleId) poleId = value;
          break;
        case 'issue':
          if (value && !issue) issue = value;
          break;
        case 'community':
          if (value && !community) community = value;
          break;
        case 'soi':
          if (value && !soi) soi = value;
          break;
        case 'location':
          if (value && !location) location = value;
          break;
        case 'lat':
          if (value) {
            const parsed = parseFloat(value);
            if (!isNaN(parsed)) lat = parsed;
          }
          break;
        case 'lng':
          if (value) {
            const parsed = parseFloat(value);
            if (!isNaN(parsed)) lng = parsed;
          }
          break;
        case 'coordinates':
          if (value) {
            const coords = parseCoordinates(value);
            if (coords.lat !== null && coords.lng !== null) {
              lat = coords.lat;
              lng = coords.lng;
            }
          }
          break;
        case 'status':
          if (value && !statusVal) statusVal = value;
          break;
        case 'technician':
          if (value && !technician) technician = value;
          break;
        case 'fixedDate':
          if (value && !fixedDate) fixedDate = value;
          break;
        case 'imageUrl':
          if (value && !imageUrl) imageUrl = value;
          break;
        case 'remarks':
          if (value && (!remarks || remarks === '-')) remarks = value;
          break;
        case 'repairAction':
          if (value && (!repairAction || repairAction.length < value.length)) repairAction = value;
          break;
      }
    });

    const statusMap = mapStatus(statusVal);

    // If pole ID is missing but we have some details, generate a placeholder ID
    if (!poleId && (issue || location || community || timestamp)) {
      poleId = `POLE-${i}`;
    }

    // Skip entirely empty rows
    if (!poleId && !issue && !location && !community) {
      continue;
    }

    // Skip static poles that do not have active maintenance work or repair history (e.g., from a master list of all 6,283 poles)
    const hasHistoryId = !!raw['ID ประวัติ'] || !!raw['id ประวัติ'] || !!raw['History ID'] || !!raw['historyid'] || !!raw['id_ประวัติ'];
    const hasIssue = !!issue;
    const hasStatus = !!statusVal;
    const hasRepair = !!raw['การซ่อมบำรุงแก้ไข'] || !!raw['รายละเอียดการแก้ไขเพิ่มเติม'] || !!raw['ซ่อมบำรุง'];
    
    if (!hasHistoryId && !hasIssue && !hasStatus && !hasRepair) {
      continue;
    }

    // Compose location if empty
    if (!location || location === 'ไม่ระบุสถานที่' || location === '-') {
      const parts = [community, soi].filter(Boolean);
      if (parts.length > 0) {
        location = parts.join(' - ');
      }
    }

    const rowId = String(i + 1);
    let recordObj: MaintenanceRecord = {
      id: rowId, // row number in Sheet (1-based index, row 1 is header, so row 2 is index 2)
      timestamp,
      poleId,
      issue: issue || 'ไม่ระบุอาการเสีย / ทั่วไป',
      location: location || 'ไม่ระบุสถานที่',
      community,
      soi,
      lat,
      lng,
      status: statusMap.eng,
      statusThai: statusMap.thai,
      technician: technician || 'รอมอบหมาย',
      fixedDate: fixedDate || '-',
      imageUrl: imageUrl || '',
      remarks: remarks || '-',
      repairAction: repairAction || '',
      raw,
    };

    // Apply any local user modifications/overrides
    const overrides = getStoredRecordOverrides();
    const customEdit = overrides[rowId] || (poleId ? overrides[`pole_${poleId}`] : null);
    if (customEdit) {
      recordObj = {
        ...recordObj,
        ...customEdit,
        raw: {
          ...recordObj.raw,
          ...(customEdit.raw || {}),
        }
      };
    }

    records.push(recordObj);
  }

  // Sort by ID or Timestamp descending to show latest updates first
  return records.reverse();
}

export async function fetchSpreadsheetMetadata(spreadsheetId: string, accessToken: string | null): Promise<SheetMetadata> {
  if (!accessToken || accessToken === 'mock-rayong-token-888') {
    try {
      const proxyUrl = `/api/sheets-proxy?spreadsheetId=${spreadsheetId}&t=${Date.now()}`;
      const response = await fetch(proxyUrl);
      if (response.ok) {
        return {
          id: spreadsheetId,
          title: 'ฐานข้อมูลเสาไฟฟ้าอัจฉริยะ (Public Link)',
          sheetNames: ['การซ่อมบำรุง', 'Form Responses 1', 'Sheet1', 'ชีต1', 'Data'],
        };
      } else {
        throw new Error(`Spreadsheet is private or invalid ID: ${response.status}`);
      }
    } catch (e: any) {
      throw new Error(`ไม่สามารถเชื่อมต่อชีตได้: โปรดตรวจสอบว่าได้ตั้งค่าชีตเป็น "ทุกคนที่มีลิงก์มีสิทธิ์อ่าน" (Anyone with the link can view) หรือเช็ค Spreadsheet ID อีกครั้ง (${e.message})`);
    }
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    try {
      const publicUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&t=${Date.now()}`;
      const publicResponse = await fetch(publicUrl);
      if (publicResponse.ok) {
        return {
          id: spreadsheetId,
          title: 'ฐานข้อมูลเสาไฟฟ้าอัจฉริยะ (Public Link)',
          sheetNames: ['การซ่อมบำรุง', 'Form Responses 1', 'Sheet1', 'ชีต1', 'Data'],
        };
      }
    } catch (e) {}

    const errText = await response.text();
    throw new Error(`Failed to fetch spreadsheet metadata: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const sheetNames = data.sheets?.map((s: any) => s.properties?.title) || [];
  return {
    id: spreadsheetId,
    title: data.properties?.title || 'Public Lighting Spreadsheet',
    sheetNames,
  };
}

export async function fetchSheetRecords(
  spreadsheetId: string,
  sheetName: string,
  accessToken: string | null
): Promise<MaintenanceRecord[]> {
  // Try fetching public CSV first if token is empty or mock
  if (!accessToken || accessToken === 'mock-rayong-token-888') {
    try {
      const gidParam = sheetName === 'การซ่อมบำรุง' ? 'gid=1789715931' : `sheet=${encodeURIComponent(sheetName)}`;
      const proxyUrl = `/api/sheets-proxy?spreadsheetId=${spreadsheetId}&${gidParam}&t=${Date.now()}`;
      const response = await fetch(proxyUrl);
      if (response.ok) {
        const text = await response.text();
        const rows = parseCSV(text);
        if (rows.length > 0) {
          return parseRowsToRecords(rows);
        }
      }
    } catch (publicErr) {
      console.warn('Failed to fetch public sheet CSV, fallback to token or mock:', publicErr);
    }
  }

  // Try the authenticated API
  if (accessToken && accessToken !== 'mock-rayong-token-888') {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:Z`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const rows: string[][] = data.values || [];
      return parseRowsToRecords(rows);
    } else {
      // Backup fallback to public CSV
      try {
        const gidParam = sheetName === 'การซ่อมบำรุง' ? 'gid=1789715931' : `sheet=${encodeURIComponent(sheetName)}`;
        const proxyUrl = `/api/sheets-proxy?spreadsheetId=${spreadsheetId}&${gidParam}&t=${Date.now()}`;
        const publicResponse = await fetch(proxyUrl);
        if (publicResponse.ok) {
          const text = await publicResponse.text();
          const rows = parseCSV(text);
          if (rows.length > 0) {
            return parseRowsToRecords(rows);
          }
        }
      } catch (backupErr) {
        console.error('Backup public fetch failed:', backupErr);
      }
      
      const errText = await response.text();
      throw new Error(`Failed to fetch sheet records: ${response.status} ${errText}`);
    }
  }

  // If both failed and we don't have token, throw a descriptive error
  throw new Error('ไม่สามารถเข้าถึงข้อมูลสเปรดชีตได้ กรุณาแชร์สเปรดชีตเป็นแบบ "ทุกคนที่มีลิงก์มีสิทธิ์อ่าน" หรือเชื่อมต่อผ่านบัญชี Google ของคุณ');
}

export const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzgyxiX20-OzdCThoDgFNnRfqO5LYAPp5GLyup0_WflWBF2GdX4N0ZQhKWW9mKFjz1Ggg/exec';

export async function syncRecordToGoogleSheet(
  record: MaintenanceRecord,
  sheetName: string = 'การซ่อมบำรุง',
  appsScriptUrl?: string
): Promise<{ success: boolean; message?: string }> {
  const url = appsScriptUrl || localStorage.getItem('rayong_apps_script_url') || DEFAULT_APPS_SCRIPT_URL;

  const historyId = (record.raw?.['ID ประวัติ'] || record.raw?.['id ประวัติ'] || record.raw?.['History ID'] || '').trim();
  const rowNumber = Number(record.id) || null;

  const payload = {
    appsScriptUrl: url,
    rowId: historyId || record.id,
    rowNumber,
    historyId,
    sheetName,
    data: {
      'ID โคมไฟ': record.poleId,
      'ปัญหาที่พบ': record.issue,
      'ชุมชน/เขต': record.community || '',
      'ซอย': record.soi || '',
      'สถานะ': record.statusThai,
      'ชื่อผู้ปฏิบัติงาน': record.technician,
      'วันที่ซ่อมบำรุงแก้ไข': record.fixedDate,
      'การซ่อมบำรุงแก้ไข': record.repairAction || '',
      'รายละเอียดการแก้ไขเพิ่มเติม': record.remarks || '',
      'หมายเหตุ': record.remarks || '',
      'พิกัดซ่อมบำรุง': record.lat && record.lng ? `${record.lat}, ${record.lng}` : '',
      'รูปภาพการซ่อมบำรุง': record.imageUrl || '',
    }
  };

  try {
    const res = await fetch('/api/update-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { success: true, message: data.result?.message || 'บันทึกข้อมูลลง Google Sheet สำเร็จเรียบร้อย' };
      }
    }
  } catch (err: any) {
    console.warn('Vercel proxy failed, trying direct fetch:', err);
  }

  // Fallback: direct fetch to Apps Script URL
  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        rowId: historyId || record.id,
        rowNumber,
        historyId,
        sheetName,
        data: payload.data,
      }),
    });
    return { success: true, message: 'ส่งข้อมูลบันทึกลง Google Sheet เรียบร้อยแล้ว' };
  } catch (directErr: any) {
    return { success: false, message: directErr.message };
  }
}


