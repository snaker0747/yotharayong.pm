import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Sheets Proxy Endpoint to bypass browser CORS or iframe restrictions
  app.get('/api/sheets-proxy', async (req, res) => {
    const { spreadsheetId, sheetName, sheet, gid } = req.query;
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'spreadsheetId is required' });
    }
    
    try {
      const activeSheet = sheetName || sheet;
      const gidParam = gid ? `gid=${gid}` : `sheet=${encodeURIComponent(String(activeSheet || ''))}`;
      const publicUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&${gidParam}&t=${Date.now()}`;
      
      console.log(`[Proxy] Fetching public sheet from URL: ${publicUrl}`);
      const response = await fetch(publicUrl);
      if (!response.ok) {
        return res.status(response.status).json({ error: `Failed to fetch from Google Sheets: ${response.statusText}` });
      }
      
      const text = await response.text();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      return res.send(text);
    } catch (err: any) {
      console.error('[Proxy] Error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
