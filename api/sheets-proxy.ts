export default async function handler(req: any, res: any) {
  // Handle CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { spreadsheetId, sheetName, sheet, gid } = req.query;
  if (!spreadsheetId) {
    return res.status(400).json({ error: 'spreadsheetId is required' });
  }

  try {
    const activeSheet = sheetName || sheet;
    const gidParam = gid ? `gid=${gid}` : `sheet=${encodeURIComponent(String(activeSheet || ''))}`;
    const publicUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&${gidParam}&t=${Date.now()}`;

    const response = await fetch(publicUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: `Failed to fetch from Google Sheets: ${response.statusText}` });
    }

    const text = await response.text();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    return res.status(200).send(text);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
