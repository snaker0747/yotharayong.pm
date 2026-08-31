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
  if (h.includes('รหัสเสา') || h.includes('หมายเลขเสา') || h.includes('pole') || h.includes('เสาไฟ') || (h.includes('id') && !h.includes('ประวัติ'))) {
    return 'poleId';
  }
  if (h.includes('อาการ') || h.includes('ปัญหา') || h.includes(' defect') || h.includes('issue') || h.includes('ชำรุด')) {
    return 'issue';
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
          timestamp = value;
          break;
        case 'poleId':
          poleId = value;
          break;
        case 'issue':
          issue = value;
          break;
        case 'location':
          location = value;
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
          const coords = parseCoordinates(value);
          if (coords.lat !== null && coords.lng !== null) {
            lat = coords.lat;
            lng = coords.lng;
          }
          break;
        case 'status':
          statusVal = value;
          break;
        case 'technician':
          technician = value;
          break;
        case 'fixedDate':
          fixedDate = value;
          break;
        case 'imageUrl':
          imageUrl = value;
          break;
        case 'remarks':
          remarks = value;
          break;
        case 'repairAction':
          repairAction = value;
          break;
      }
    });

    const statusMap = mapStatus(statusVal);

    // If pole ID is missing but we have some details, generate a placeholder ID
    if (!poleId && (issue || location || timestamp)) {
      poleId = `POLE-${i}`;
    }

    // Skip entirely empty rows
    if (!poleId && !issue && !location) {
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

    records.push({
      id: String(i + 1), // row number in Sheet (1-based index, row 1 is header, so row 2 is index 2)
      timestamp,
      poleId,
      issue: issue || 'ไม่ระบุอาการเสีย / ทั่วไป',
      location: location || 'ไม่ระบุสถานที่',
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
    });
  }

  // Sort by ID or Timestamp descending to show latest updates first
  return records.reverse();
}

function fetchGoogleSheetJSONP(spreadsheetId: string, sheetName: string): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const callbackName = `gvizCallback_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const script = document.createElement('script');
    
    // Fallback: If sheet name is exactly our default, we use GID 1789715931 since it might be required
    const gidParam = sheetName === 'การซ่อมบำรุง' ? 'gid=1789715931' : `sheet=${encodeURIComponent(sheetName)}`;
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=responseHandler:${callbackName}&${gidParam}`;
    
    // Timeout in case the request never finishes
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('การดึงข้อมูลใช้เวลานานเกินไป โปรดตรวจสอบอินเทอร์เน็ตหรือ Spreadsheet ID'));
    }, 15000);

    const cleanup = () => {
      clearTimeout(timeoutId);
      delete (window as any)[callbackName];
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    (window as any)[callbackName] = (data: any) => {
      cleanup();
      try {
        if (!data || !data.table || !data.table.cols) {
          throw new Error('รูปแบบข้อมูล JSON จาก Google Sheets ไม่ถูกต้อง');
        }
        const headers = data.table.cols.map((c: any) => c ? String(c.label || '') : '');
        const rows = data.table.rows.map((r: any) => {
          return r.c.map((cell: any) => {
            if (!cell) return '';
            return cell.f !== undefined && cell.f !== null ? String(cell.f) : (cell.v !== undefined && cell.v !== null ? String(cell.v) : '');
          });
        });
        
        resolve([headers, ...rows]);
      } catch (err) {
        reject(err);
      }
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('ไม่สามารถดึงข้อมูลได้ โปรดตรวจสอบว่าชีตตั้งค่าแชร์เป็น "ทุกคนที่มีลิงก์มีสิทธิ์อ่าน" (Anyone with the link can view) แล้วหรือไม่'));
    };

    script.src = url;
    document.head.appendChild(script);
  });
}

export async function fetchSpreadsheetMetadata(spreadsheetId: string, accessToken: string | null): Promise<SheetMetadata> {
  if (!accessToken || accessToken === 'mock-rayong-token-888') {
    // Return mock metadata immediately, we'll fetch data via JSONP directly.
    return {
      id: spreadsheetId,
      title: 'ฐานข้อมูลเสาไฟฟ้าอัจฉริยะ (Public Link)',
      sheetNames: ['การซ่อมบำรุง', 'Form Responses 1', 'Sheet1', 'ชีต1', 'Data'],
    };
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    // If token fails, fallback to basic metadata assuming it's public
    return {
      id: spreadsheetId,
      title: 'ฐานข้อมูลเสาไฟฟ้าอัจฉริยะ (Public Link)',
      sheetNames: ['การซ่อมบำรุง', 'Form Responses 1', 'Sheet1', 'ชีต1', 'Data'],
    };
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
  // Try fetching public sheet via JSONP first if token is empty or mock
  if (!accessToken || accessToken === 'mock-rayong-token-888') {
    try {
      const rows = await fetchGoogleSheetJSONP(spreadsheetId, sheetName);
      if (rows.length > 0) {
        return parseRowsToRecords(rows);
      }
    } catch (publicErr: any) {
      console.warn('Failed to fetch public sheet JSONP, fallback to mock:', publicErr);
      throw new Error(`ไม่สามารถโหลดข้อมูลจากชีตได้ โปรดตั้งค่าเป็น สาธารณะ (Public) - ${publicErr.message}`);
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
      // Backup fallback to public JSONP
      try {
        const rows = await fetchGoogleSheetJSONP(spreadsheetId, sheetName);
        if (rows.length > 0) {
          return parseRowsToRecords(rows);
        }
      } catch (publicErr) {
        console.warn('Fallback JSONP also failed');
      }
      const errText = await response.text();
      throw new Error(`Failed to fetch records: ${response.status} ${errText}`);
    }
  }

  return [];
}
