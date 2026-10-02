import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { appsScriptUrl, rowId, rowNumber, historyId, sheetName, data } = req.body;

    if (!appsScriptUrl) {
      return res.status(400).json({ error: 'Missing appsScriptUrl' });
    }

    // Forward to Google Apps Script Web App
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rowId: historyId || rowId,
        rowNumber,
        historyId,
        sheetName: sheetName || 'การซ่อมบำรุง',
        data,
      }),
      redirect: 'follow',
    });

    const responseText = await response.text();
    let responseJson = {};
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = { raw: responseText };
    }

    return res.status(200).json({
      success: true,
      result: responseJson,
    });
  } catch (error: any) {
    console.error('Update sheet proxy error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
