import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PIT_SPREADSHEET_MAP: Record<string, string> = {
  'PIT 11': '17pIjBo814EtMVZSVULuBMVNNG7UowyjKApgPUsXQnGM',
  'PIT 12': '1DES6NfjBbjclFBCnWAcPEJCD8fTfgNtYCCCXFLbY7tc',
  'JUMBANG': '19h6-8U3LD1eWelqzYShCIMPEpyk0mHpspRqdl26Ri4o',
};

const MONTH_NAMES_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const MONTH_MAP: Record<string, number> = {
  jan: 1, januari: 1, feb: 2, februari: 2, mar: 3, maret: 3,
  apr: 4, april: 4, may: 5, mei: 5, jun: 6, juni: 6,
  jul: 7, juli: 7, aug: 8, agu: 8, agustus: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, okto: 10, oktober: 10, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, des: 12, desember: 12,
};

function parseOperationalDateFromSheetName(sheetName: string) {
  const clean = sheetName.trim();
  const lower = clean.toLowerCase();

  // Abaikan sheet non-operasional
  const ignoredPatterns = [
    'sheet', 'template', 'rekap', 'dropdown', 'delay', 'problem',
    'idle', 'total', 'setting', 'config', 'master', 'dash', 'summary'
  ];
  if (ignoredPatterns.some((p) => lower.includes(p))) {
    return null;
  }

  // Pola teks: 01 OKT 2026, 1 OKT 2026, 02 OKTo 2026, 18 Oct 2026
  const m1 = clean.match(/(\d{1,2})[\s_.-]*([a-zA-Z]{3,10})[\s_.-]*(\d{2,4})?/);
  if (m1) {
    const day = parseInt(m1[1], 10);
    const mStr = m1[2].toLowerCase();
    let monthNum: number | null = null;
    for (const [k, v] of Object.entries(MONTH_MAP)) {
      if (mStr.startsWith(k)) {
        monthNum = v;
        break;
      }
    }
    let year = m1[3] ? parseInt(m1[3], 10) : 2026;
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && monthNum) {
      const dd = String(day).padStart(2, '0');
      const mmId = MONTH_NAMES_ID[monthNum - 1];
      return {
        day,
        monthNum,
        year,
        display: `${dd} ${mmId} ${year}`,
        paddedKey: `${dd} ${mmId.toUpperCase()} ${year}`,
        singleKey: `${day} ${mmId.toUpperCase()} ${year}`,
        rawSource: clean,
      };
    }
  }

  // Pola tanggal numerik DD-MM-YYYY atau YYYY-MM-DD
  const m2 = clean.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  if (m2) {
    const day = parseInt(m2[1], 10);
    const monthNum = parseInt(m2[2], 10);
    const year = parseInt(m2[3], 10);
    if (monthNum >= 1 && monthNum <= 12 && day >= 1 && day <= 31) {
      const dd = String(day).padStart(2, '0');
      const mmId = MONTH_NAMES_ID[monthNum - 1];
      return {
        day,
        monthNum,
        year,
        display: `${dd} ${mmId} ${year}`,
        paddedKey: `${dd} ${mmId.toUpperCase()} ${year}`,
        singleKey: `${day} ${mmId.toUpperCase()} ${year}`,
        rawSource: clean,
      };
    }
  }

  return null;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API: Ambil daftar sheet tanggal aktual dari Google Sheets untuk PIT tertentu
  app.get('/api/sheets-dates', async (req: Request, res: Response) => {
    const rawPit = String(req.query.pit || 'PIT 11').trim().toUpperCase();
    const spreadsheetId = PIT_SPREADSHEET_MAP[rawPit];

    if (!spreadsheetId) {
      return res.status(400).json({
        success: false,
        pit: rawPit,
        error: `PIT "${rawPit}" tidak dikenali. Pilihan yang valid: PIT 11, PIT 12, JUMBANG.`,
      });
    }

    try {
      const htmlUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlview`;
      const response = await fetch(htmlUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        throw new Error(`Google Sheets HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      // Format Google Sheets htmlview tab: items.push({name: "01 OKT 2026", pageUrl: "...", gid: "533406199", ...})
      const regex = /items\.push\({\s*name:\s*"([^"]+)",\s*pageUrl:[^,]+,\s*gid:\s*"([^"]+)"/g;
      const discoveredDates: Array<{
        sheetName: string;
        gid: string;
        parsedDate: ReturnType<typeof parseOperationalDateFromSheetName>;
      }> = [];

      let m;
      while ((m = regex.exec(html)) !== null) {
        const sheetName = m[1];
        const gid = m[2];
        const parsed = parseOperationalDateFromSheetName(sheetName);
        if (parsed) {
          discoveredDates.push({
            sheetName,
            gid,
            parsedDate: parsed,
          });
        }
      }

      // Urutkan secara kronologis berdasarkan tahun, bulan, hari
      discoveredDates.sort((a, b) => {
        const pA = a.parsedDate!;
        const pB = b.parsedDate!;
        const valA = pA.year * 10000 + pA.monthNum * 100 + pA.day;
        const valB = pB.year * 10000 + pB.monthNum * 100 + pB.day;
        return valA - valB;
      });

      return res.json({
        success: true,
        pit: rawPit,
        totalSheetsFound: discoveredDates.length,
        dates: discoveredDates,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return res.status(502).json({
        success: false,
        pit: rawPit,
        error: errorMsg,
      });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
