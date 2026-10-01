import * as XLSX from 'xlsx';
import {
  ColumnMapping,
  DetectedColumnInfo,
  KonversiJarakRow,
  KonversiSanitizeResult,
  LoaderCalculationResult,
  ReviewMfResult,
  VhmsFieldKey,
  VhmsMetadata,
  VhmsRow,
} from '../types';
import { sanitizeKonversiTable } from '../data/konversiJarak';
import { formatIdNumber } from './formulas';

export const VHMS_FIELD_LABELS: Record<VhmsFieldKey, { label: string; required?: boolean }> = {
  location: { label: 'LOCATION (Pit)' },
  no: { label: 'NO' },
  unit: { label: 'UNIT (Nomor DT)', required: true },
  rit: { label: 'RIT (Ritasi)' },
  jarakKm: { label: 'JARAK (km)', required: true },
  konv: { label: 'KONV (Konversi VHMS)' },
  updatedRaw: { label: 'UPDATED (Waktu Update)' },
  bd: { label: 'BD (Breakdown)' },
  ctPlan: { label: 'CYCLE TIME - Plan' },
  ctActual: { label: 'CYCLE TIME - Actual', required: true },
  ctCompl: { label: 'CYCLE TIME - Compl.' },
  ltPlan: { label: 'LOADING TIME - Plan' },
  ltActual: { label: 'LOADING TIME - Actual (Serving Time)', required: true },
  travelPlan: { label: 'TRAVEL TIME - Plan' },
  travelActual: { label: 'TRAVEL TIME - Actual' },
  engOffActual: { label: 'ENG OFF - Actual' },
  speedAvgPlan: { label: 'SPEED AVG - Plan' },
  speedAvgActual: { label: 'SPEED AVG - Actual' },
  emptySpeedPlan: { label: 'EMPTY SPEED - Plan' },
  emptySpeedActual: { label: 'EMPTY SPEED - Actual' },
  loadedSpeedPlan: { label: 'LOADED SPEED - Plan' },
  loadedSpeedActual: { label: 'LOADED SPEED - Actual' },
  estPlan: { label: 'EMPTY STOP TIME - Plan' },
  estActual: { label: 'EMPTY STOP TIME - Actual (EST)' },
  lstPlan: { label: 'LOADED STOP TIME - Plan' },
  lstActual: { label: 'LOADED STOP TIME - Actual (LST)' },
  aglGradePlan: { label: 'AGL GRADE - Plan' },
  aglGradeActual: { label: 'AGL GRADE - Actual' },
  payloadPlan: { label: 'PAYLOAD - Plan' },
  payloadActual: { label: 'PAYLOAD - Actual' },
  prodtyPlan: { label: 'PRODUCTIVITY - Plan' },
  prodtyActual: { label: 'PRODUCTIVITY - Actual' },
};

const MONTH_MAP: Record<string, string> = {
  jan: 'Jan',
  januari: 'Jan',
  feb: 'Feb',
  februari: 'Feb',
  mar: 'Mar',
  maret: 'Mar',
  apr: 'Apr',
  april: 'Apr',
  may: 'Mei',
  mei: 'Mei',
  jun: 'Jun',
  juni: 'Jun',
  jul: 'Jul',
  juli: 'Jul',
  aug: 'Agu',
  agu: 'Agu',
  agustus: 'Agu',
  sep: 'Sep',
  sept: 'Sep',
  september: 'Sep',
  oct: 'Okt',
  okt: 'Okt',
  oktober: 'Okt',
  nov: 'Nov',
  november: 'Nov',
  dec: 'Des',
  des: 'Des',
  desember: 'Des',
};

/**
 * Parse teks tanggal seperti "VHMS, 01 Oct 2026" atau "01 Okt 2026"
 */
export function parseVhmsDateText(rawText: string): string {
  if (!rawText) return '';
  const cleaned = rawText.replace(/^VHMS\s*,\s*/i, '').trim();
  const match = cleaned.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const monthKey = match[2].toLowerCase();
    const monthLabel = MONTH_MAP[monthKey] || match[2];
    const year = match[3];
    return `${day} ${monthLabel} ${year}`;
  }
  return cleaned;
}

/**
 * Parse teks jam seperti "Jam: 06, 07, 08" -> { hours: [6, 7, 8], hoursLabel: "Data jam 06-08" }
 */
export function parseVhmsHoursText(rawText: string): { hours: number[]; hoursLabel: string } {
  if (!rawText) return { hours: [], hoursLabel: '-' };
  const afterColon = rawText.replace(/^.*jam\s*:\s*/i, '');
  const nums = (afterColon.match(/\d+/g) || [])
    .map((n) => parseInt(n, 10))
    .filter((n) => !isNaN(n) && n >= 0 && n <= 24);

  if (nums.length === 0) {
    return { hours: [], hoursLabel: rawText.trim() };
  }
  const first = String(nums[0]).padStart(2, '0');
  const last = String(nums[nums.length - 1]).padStart(2, '0');
  const hoursLabel =
    nums.length === 1 ? `Data jam ${first}` : `Data jam ${first}-${last}`;
  return { hours: nums, hoursLabel };
}

/**
 * Parse string UPDATED berformat "YYYYMMDD HH:mm" (contoh "20261001 08:06")
 */
export function parseVhmsUpdatedTimestamp(raw: string): {
  sortKey: string;
  display: string;
} | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  const m = trimmed.match(/^(\d{4})(\d{2})(\d{2})\s+(\d{1,2}):(\d{2})/);
  if (m) {
    const [, yyyy, mm, dd, hh, min] = m;
    const hhPad = hh.padStart(2, '0');
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ];
    const mIdx = parseInt(mm, 10) - 1;
    const mLabel = monthNames[mIdx] || mm;
    return {
      sortKey: `${yyyy}${mm}${dd}${hhPad}${min}`,
      display: `${dd} ${mLabel} ${yyyy} ${hhPad}:${min}`,
    };
  }
  return null;
}

/**
 * Parsing angka robust (Bagian 2):
 * Nilai bisa berupa number, teks angka ("3.33"), koma desimal ("3,33"), atau persen ("85%").
 * Sel kosong pada BD dan ENG OFF dianggap 0. Sel kosong pada kolom lain dianggap null.
 */
export function parseVhmsNumericCell(
  val: unknown,
  emptyAsZero: boolean = false,
  isComplColumn: boolean = false
): number | null {
  if (val === null || val === undefined) {
    return emptyAsZero ? 0 : null;
  }
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return emptyAsZero ? 0 : null;
    return val;
  }
  const str = String(val).trim();
  if (str === '' || str === '-' || str.toUpperCase() === 'N/A' || str.startsWith('#')) {
    return emptyAsZero ? 0 : null;
  }

  const isPercentString = str.endsWith('%');
  const cleanStr = str
    .replace(/%/g, '')
    .replace(/\s+/g, '')
    .replace(',', '.');

  const num = Number(cleanStr);
  if (!Number.isFinite(num)) {
    return emptyAsZero ? 0 : null;
  }

  if (isPercentString) {
    return num / 100;
  }
  // Jika kolom Compl. bernilai > 1.5 (misal tertulis 85 untuk 85%), konversi ke 0..1
  if (isComplColumn && num > 1.5) {
    return num / 100;
  }
  return num;
}

/**
 * Membaca sheet Excel dan menerapkan forward-fill pada seluruh area merge (sheet["!merges"])
 */
function buildForwardFilledGrid(sheet: XLSX.WorkSheet): {
  grid: unknown[][];
  maxRow: number;
  maxCol: number;
} {
  const ref = sheet['!ref'] || 'A1:AM50';
  const range = XLSX.utils.decode_range(ref);
  const maxRow = range.e.r;
  const maxCol = range.e.c;

  const grid: unknown[][] = Array.from({ length: maxRow + 1 }, () =>
    Array(maxCol + 1).fill(null)
  );

  for (let r = 0; r <= maxRow; r++) {
    for (let c = 0; c <= maxCol; c++) {
      const cellAddr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellAddr];
      if (cell !== undefined && cell.v !== undefined) {
        grid[r][c] = cell.v;
      }
    }
  }

  // Forward-fill semua area merge dari sel kiri-atas (s.r, s.c) ke seluruh area (e.r, e.c)
  const merges: XLSX.Range[] = sheet['!merges'] || [];
  for (const m of merges) {
    const topVal = grid[m.s.r]?.[m.s.c] ?? null;
    for (let r = m.s.r; r <= Math.min(m.e.r, maxRow); r++) {
      for (let c = m.s.c; c <= Math.min(m.e.c, maxCol); c++) {
        if (grid[r][c] === null || grid[r][c] === undefined || grid[r][c] === '') {
          grid[r][c] = topVal;
        }
      }
    }
  }

  return { grid, maxRow, maxCol };
}

/**
 * Deteksi otomatis pemetaan kolom berdasarkan header 2 baris yang sudah di-forward-fill.
 */
export function autoDetectColumnMapping(
  detectedColumns: DetectedColumnInfo[]
): ColumnMapping {
  const mapping: ColumnMapping = {};

  for (const col of detectedColumns) {
    const r1 = col.row1Label.trim().toUpperCase().replace(/\s+/g, ' ');
    const r2 = col.row2Label.trim().toUpperCase().replace(/\s+/g, ' ');
    const combined = col.headerKey.trim().toUpperCase().replace(/\s+/g, ' ');

    const setIfUnset = (field: VhmsFieldKey) => {
      if (mapping[field] === undefined) {
        mapping[field] = col.colIndex;
      }
    };

    if (r1 === 'LOCATION' || combined === 'LOCATION') setIfUnset('location');
    else if (r1 === 'NO' || combined === 'NO') setIfUnset('no');
    else if (r1 === 'UNIT' || combined === 'UNIT') setIfUnset('unit');
    else if (r1 === 'RIT' || combined === 'RIT') setIfUnset('rit');
    else if (r1 === 'JARAK' || combined === 'JARAK') setIfUnset('jarakKm');
    else if (r1 === 'KONV' || combined === 'KONV' || r1 === 'CONV') setIfUnset('konv');
    else if (r1 === 'UPDATED' || combined === 'UPDATED') setIfUnset('updatedRaw');
    else if (r1 === 'BD' || combined === 'BD') setIfUnset('bd');
    else if (r1.includes('CYCLE TIME')) {
      if (r2.includes('PLAN')) setIfUnset('ctPlan');
      else if (r2.includes('ACTUAL')) setIfUnset('ctActual');
      else if (r2.includes('COMPL')) setIfUnset('ctCompl');
    } else if (r1.includes('LOADING TIME')) {
      if (r2.includes('PLAN')) setIfUnset('ltPlan');
      else if (r2.includes('ACTUAL')) setIfUnset('ltActual');
    } else if (r1.includes('TRAVEL TIME')) {
      if (r2.includes('PLAN')) setIfUnset('travelPlan');
      else if (r2.includes('ACTUAL')) setIfUnset('travelActual');
    } else if (r1.includes('ENG OFF')) {
      setIfUnset('engOffActual');
    } else if (r1.includes('SPEED AVG')) {
      if (r2.includes('PLAN')) setIfUnset('speedAvgPlan');
      else if (r2.includes('ACTUAL')) setIfUnset('speedAvgActual');
    } else if (r1.includes('EMPTY SPEED')) {
      if (r2.includes('PLAN')) setIfUnset('emptySpeedPlan');
      else if (r2.includes('ACTUAL')) setIfUnset('emptySpeedActual');
    } else if (r1.includes('LOADED SPEED')) {
      if (r2.includes('PLAN')) setIfUnset('loadedSpeedPlan');
      else if (r2.includes('ACTUAL')) setIfUnset('loadedSpeedActual');
    } else if (r1.includes('EMPTY STOP TIME')) {
      if (r2.includes('PLAN')) setIfUnset('estPlan');
      else if (r2.includes('ACTUAL')) setIfUnset('estActual');
    } else if (r1.includes('LOADED STOP TIME')) {
      if (r2.includes('PLAN')) setIfUnset('lstPlan');
      else if (r2.includes('ACTUAL')) setIfUnset('lstActual');
    } else if (r1.includes('AGL GRADE')) {
      if (r2.includes('PLAN')) setIfUnset('aglGradePlan');
      else if (r2.includes('ACTUAL')) setIfUnset('aglGradeActual');
    } else if (r1.includes('PAYLOAD')) {
      if (r2.includes('PLAN')) setIfUnset('payloadPlan');
      else if (r2.includes('ACTUAL')) setIfUnset('payloadActual');
    } else if (r1.includes('PRODUCTIVITY') || r1.includes('PRODTY')) {
      if (r2.includes('PLAN')) setIfUnset('prodtyPlan');
      else if (r2.includes('ACTUAL')) setIfUnset('prodtyActual');
    }
  }

  return mapping;
}

/**
 * Parse Workbook Excel RAW VHMS Hourly (Bagian 2).
 */
export function parseVhmsWorkbook(
  workbook: XLSX.WorkBook,
  fileName: string,
  targetSheetName?: string,
  customMapping?: ColumnMapping
): { metadata: VhmsMetadata; rows: VhmsRow[] } {
  const availableSheets = workbook.SheetNames;
  const sheetName =
    targetSheetName && availableSheets.includes(targetSheetName)
      ? targetSheetName
      : availableSheets[0];

  const sheet = workbook.Sheets[sheetName];
  const { grid, maxRow, maxCol } = buildForwardFilledGrid(sheet);

  // 1. Cari baris Header Tabel (2 baris: baris yang mengandung "UNIT" dan "JARAK" atau "LOCATION")
  let headerRow1Index = 6; // default baris ke-7 (0-indexed = 6)
  for (let r = 0; r <= Math.min(15, maxRow); r++) {
    const rowStrings = grid[r]
      .map((v) => (v !== null && v !== undefined ? String(v).trim().toUpperCase() : ''))
      .filter(Boolean);
    if (
      rowStrings.includes('UNIT') &&
      (rowStrings.includes('JARAK') ||
        rowStrings.includes('LOCATION') ||
        rowStrings.some((s) => s.includes('CYCLE TIME')))
    ) {
      headerRow1Index = r;
      break;
    }
  }
  const headerRow2Index = Math.min(headerRow1Index + 1, maxRow);

  // 2. Cari Metadata di area atas sheet (baris 0 s/d headerRow1Index - 1)
  let companyJobsite = '';
  let rawDateText = '';
  let rawHoursText = '';

  const seenTopTexts = new Set<string>();
  for (let r = 0; r < headerRow1Index; r++) {
    for (let c = 0; c <= maxCol; c++) {
      const val = grid[r][c];
      if (val === null || val === undefined) continue;
      const text = String(val).trim();
      if (!text || seenTopTexts.has(text)) continue;
      seenTopTexts.add(text);

      if (
        !companyJobsite &&
        (/PT\.|PAMAPERSADA|JOBSITE|ARIA/i.test(text) || (text.includes('/') && text.length > 12))
      ) {
        companyJobsite = text;
      } else if (
        !rawDateText &&
        (/VHMS\s*,/i.test(text) || /\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b/.test(text))
      ) {
        rawDateText = text;
      } else if (!rawHoursText && /jam\s*:/i.test(text)) {
        rawHoursText = text;
      }
    }
  }

  const parsedDateDisplay = parseVhmsDateText(rawDateText) || '-';
  const { hours, hoursLabel } = parseVhmsHoursText(rawHoursText);

  // 3. Bangun daftar kolom dari headerRow1Index dan headerRow2Index
  const detectedColumns: DetectedColumnInfo[] = [];
  for (let c = 0; c <= maxCol; c++) {
    const r1 =
      grid[headerRow1Index]?.[c] !== null && grid[headerRow1Index]?.[c] !== undefined
        ? String(grid[headerRow1Index][c]).trim()
        : '';
    const r2 =
      grid[headerRow2Index]?.[c] !== null && grid[headerRow2Index]?.[c] !== undefined
        ? String(grid[headerRow2Index][c]).trim()
        : '';

    if (!r1 && !r2) continue;

    const headerKey =
      r1.toUpperCase() === r2.toUpperCase() || !r2
        ? r1
        : !r1
        ? r2
        : `${r1} ${r2}`;

    detectedColumns.push({
      colIndex: c,
      colLetter: XLSX.utils.encode_col(c),
      headerKey,
      row1Label: r1,
      row2Label: r2,
    });
  }

  const autoMapping = autoDetectColumnMapping(detectedColumns);
  const columnMapping: ColumnMapping = {
    ...autoMapping,
    ...(customMapping || {}),
  };

  // Cek kolom wajib: UNIT, JARAK, CYCLE TIME Actual, LOADING TIME Actual
  const missingRequiredColumns: string[] = [];
  if (columnMapping.unit === undefined) missingRequiredColumns.push('UNIT');
  if (columnMapping.jarakKm === undefined) missingRequiredColumns.push('JARAK');
  if (columnMapping.ctActual === undefined) missingRequiredColumns.push('CYCLE TIME Actual');
  if (columnMapping.ltActual === undefined) missingRequiredColumns.push('LOADING TIME Actual');

  // 4. Ekstrak baris data mulai setelah headerRow2Index
  const rows: VhmsRow[] = [];
  let rawNoteText = '';
  let latestUpdatedSortKey = '';
  let latestUpdatedDisplay = '-';
  const pitCounts: Record<string, number> = {};
  let lastKnownLocation = '';

  const dataStartRow = headerRow2Index + 1;
  for (let r = dataStartRow; r <= maxRow; r++) {
    const rowCells = grid[r];
    if (!rowCells) continue;

    // Cek apakah baris berisi teks "NOTE"
    const hasNoteText = rowCells.some(
      (cell) =>
        cell !== null &&
        cell !== undefined &&
        /^NOTE\b/i.test(String(cell).trim())
    );
    if (hasNoteText) {
      // Simpan teks NOTE untuk referensi
      const noteTexts = rowCells
        .filter((c) => c !== null && c !== undefined && String(c).trim() !== '')
        .map((c) => String(c).trim());
      rawNoteText = Array.from(new Set(noteTexts)).join(' ');
      break;
    }

    const unitCol = columnMapping.unit;
    const rawUnitVal = unitCol !== undefined ? rowCells[unitCol] : null;
    const rawUnitStr =
      rawUnitVal !== null && rawUnitVal !== undefined ? String(rawUnitVal).trim() : '';

    // Berhenti pada baris yang kolom UNIT-nya kosong
    if (!rawUnitStr) {
      break;
    }

    // Normalisasi UNIT ("DT4553" -> unit="DT4553", dtNumber="4553")
    const dtMatch = rawUnitStr.match(/^(?:DT\s*)?(\d+)$/i);
    const dtNumber = dtMatch ? dtMatch[1] : rawUnitStr.replace(/\D+/g, '');
    const normalizedUnit = dtNumber ? `DT${dtNumber}` : rawUnitStr.toUpperCase();

    const locCol = columnMapping.location;
    const rawLoc =
      locCol !== undefined && rowCells[locCol] !== null && rowCells[locCol] !== undefined
        ? String(rowCells[locCol]).trim()
        : '';
    const location = rawLoc || lastKnownLocation || 'TANPA PIT';
    if (rawLoc) lastKnownLocation = rawLoc;

    pitCounts[location] = (pitCounts[location] || 0) + 1;

    const getNum = (
      field: VhmsFieldKey,
      emptyAsZero = false,
      isCompl = false
    ): number | null => {
      const colIdx = columnMapping[field];
      if (colIdx === undefined) return emptyAsZero ? 0 : null;
      return parseVhmsNumericCell(rowCells[colIdx], emptyAsZero, isCompl);
    };

    const updatedCol = columnMapping.updatedRaw;
    const updatedRaw =
      updatedCol !== undefined &&
      rowCells[updatedCol] !== null &&
      rowCells[updatedCol] !== undefined
        ? String(rowCells[updatedCol]).trim()
        : '';

    const parsedUpd = parseVhmsUpdatedTimestamp(updatedRaw);
    if (parsedUpd && parsedUpd.sortKey > latestUpdatedSortKey) {
      latestUpdatedSortKey = parsedUpd.sortKey;
      latestUpdatedDisplay = parsedUpd.display;
    } else if (!latestUpdatedSortKey && updatedRaw) {
      latestUpdatedDisplay = updatedRaw;
    }

    const ctActual = getNum('ctActual');
    const ltActual = getNum('ltActual');
    const travelActual = getNum('travelActual');

    // Bagian 3: Cek konsistensi data: CT Actual harus sama dengan Loading Time Actual + Travel Time Actual (toleransi 0,01 menit)
    let consistencyWarning: string | null = null;
    if (ctActual !== null && ltActual !== null && travelActual !== null) {
      const expectedCt = ltActual + travelActual;
      const diff = Math.abs(ctActual - expectedCt);
      if (diff > 0.01) {
        consistencyWarning = `CT Actual (${formatIdNumber(ctActual, 2)}) ≠ LT Actual + Travel Actual (${formatIdNumber(expectedCt, 2)}), selisih ${formatIdNumber(diff, 2)} mnt`;
      }
    }

    rows.push({
      rowIndex: r + 1,
      location,
      no: getNum('no'),
      unit: normalizedUnit,
      dtNumber,
      rit: getNum('rit'),
      jarakKm: getNum('jarakKm'),
      konv: getNum('konv'),
      updatedRaw,
      updatedDate: parsedUpd ? parsedUpd.display : updatedRaw || null,
      bd: getNum('bd', true) ?? 0,
      ctPlan: getNum('ctPlan'),
      ctActual,
      ctCompl: getNum('ctCompl', false, true),
      ltPlan: getNum('ltPlan'),
      ltActual,
      travelPlan: getNum('travelPlan'),
      travelActual,
      engOffActual: getNum('engOffActual', true) ?? 0,
      speedAvgPlan: getNum('speedAvgPlan'),
      speedAvgActual: getNum('speedAvgActual'),
      emptySpeedPlan: getNum('emptySpeedPlan'),
      emptySpeedActual: getNum('emptySpeedActual'),
      loadedSpeedPlan: getNum('loadedSpeedPlan'),
      loadedSpeedActual: getNum('loadedSpeedActual'),
      estPlan: getNum('estPlan'),
      estActual: getNum('estActual'),
      lstPlan: getNum('lstPlan'),
      lstActual: getNum('lstActual'),
      aglGradePlan: getNum('aglGradePlan'),
      aglGradeActual: getNum('aglGradeActual'),
      payloadPlan: getNum('payloadPlan'),
      payloadActual: getNum('payloadActual'),
      prodtyPlan: getNum('prodtyPlan'),
      prodtyActual: getNum('prodtyActual'),
      consistencyWarning,
    });
  }

  // Jika rawNoteText belum tertangkap di loop baris data, cari di sisa baris bawah
  if (!rawNoteText) {
    for (let r = dataStartRow + rows.length; r <= maxRow; r++) {
      const rowCells = grid[r];
      if (!rowCells) continue;
      for (const cell of rowCells) {
        if (cell !== null && cell !== undefined && /NOTE/i.test(String(cell))) {
          rawNoteText = String(cell).trim();
          break;
        }
      }
      if (rawNoteText) break;
    }
  }

  const metadata: VhmsMetadata = {
    fileName,
    sheetName,
    availableSheets,
    companyJobsite:
      companyJobsite || 'PT. PAMAPERSADA NUSANTARA / Jobsite ARIA - Kalimantan Selatan',
    rawDateText,
    parsedDateDisplay,
    rawHoursText,
    hours,
    hoursLabel,
    latestUpdatedDisplay,
    totalRows: rows.length,
    pitCounts,
    missingRequiredColumns,
    headerRow1Index,
    headerRow2Index,
    detectedColumns,
    columnMapping,
    rawNoteText,
  };

  return { metadata, rows };
}

/**
 * Membaca Tabel Konversi Jarak dari file Excel (Bagian 4A):
 * Default mencari sheet "FIX RUMUS" kolom U:W mulai baris 3 (jarak meter, jarak km, konversi),
 * atau memakai nama sheet dan kolom pilihan pengguna.
 */
export function parseKonversiFromWorkbook(
  workbook: XLSX.WorkBook,
  sheetNameOption?: string,
  jarakMColLetter: string = 'U',
  konversiColLetter: string = 'W',
  startRow1Based: number = 3
): KonversiSanitizeResult {
  const targetSheet =
    sheetNameOption && workbook.SheetNames.includes(sheetNameOption)
      ? sheetNameOption
      : workbook.SheetNames.find((n) => n.toUpperCase().includes('FIX RUMUS')) ||
        workbook.SheetNames.find((n) => n.toUpperCase().includes('RUMUS')) ||
        workbook.SheetNames[0];

  const sheet = workbook.Sheets[targetSheet];
  const ref = sheet['!ref'] || 'A1:Z350';
  const range = XLSX.utils.decode_range(ref);

  const jarakColIdx = XLSX.utils.decode_col(jarakMColLetter.trim().toUpperCase());
  const konvColIdx = XLSX.utils.decode_col(konversiColLetter.trim().toUpperCase());

  const rawRows: Array<{ jarakM: unknown; konversi: unknown }> = [];

  for (let r = Math.max(0, startRow1Based - 1); r <= range.e.r; r++) {
    const jCell = sheet[XLSX.utils.encode_cell({ r, c: jarakColIdx })];
    const kCell = sheet[XLSX.utils.encode_cell({ r, c: konvColIdx })];
    if (!jCell && !kCell) continue;
    rawRows.push({
      jarakM: jCell?.v,
      konversi: kCell?.v,
    });
  }

  return sanitizeKonversiTable(rawRows);
}

/**
 * Buat & Unduh File Excel RAW VHMS Hourly sesuai struktur persis Bagian 2 (termasuk merge cells E3, K3, K5, header 2 baris, merge LOCATION per pit, dan NOTE di B31)
 */
export function downloadSampleRawVhmsExcel(rows: VhmsRow[], metadata: VhmsMetadata) {
  const wb = XLSX.utils.book_new();
  const wsData: unknown[][] = Array.from({ length: rows.length + 14 }, () =>
    Array(40).fill(null)
  );

  // Baris 3 (index 2): E3 (col 4) dan K3 (col 10)
  wsData[2][4] =
    metadata.companyJobsite ||
    'PT. PAMAPERSADA NUSANTARA / Jobsite ARIA - Kalimantan Selatan';
  wsData[2][10] = metadata.rawDateText || 'VHMS, 01 Oct 2026';

  // Baris 5 (index 4): K5 (col 10)
  wsData[4][10] = metadata.rawHoursText || 'Jam: 06, 07, 08';

  // Baris 7 & 8 (index 6 & 7): Header 2 baris sesuai spesifikasi Bagian 2
  const r1 = wsData[6];
  const r2 = wsData[7];

  r1[1] = 'LOCATION';
  r2[1] = 'LOCATION';
  r1[5] = 'NO';
  r2[5] = 'NO';
  r1[6] = 'UNIT';
  r2[6] = 'UNIT';
  r1[7] = 'RIT';
  r2[7] = 'RIT';
  r1[8] = 'JARAK';
  r2[8] = 'JARAK';
  r1[9] = 'KONV';
  r2[9] = 'KONV';
  r1[11] = 'UPDATED';
  r2[11] = 'UPDATED';
  r1[12] = 'BD';
  r2[12] = 'BD';

  r1[13] = 'CYCLE TIME';
  r2[13] = 'Plan';
  r1[14] = 'CYCLE TIME';
  r2[14] = 'Actual';
  r1[16] = 'CYCLE TIME';
  r2[16] = 'Compl.';

  r1[17] = 'LOADING TIME';
  r2[17] = 'Plan';
  r1[18] = 'LOADING TIME';
  r2[18] = 'Actual';

  r1[19] = 'TRAVEL TIME';
  r2[19] = 'Plan';
  r1[20] = 'TRAVEL TIME';
  r2[20] = 'Actual';

  r1[21] = 'ENG OFF';
  r2[21] = 'Actual';

  r1[22] = 'SPEED AVG';
  r2[22] = 'Plan';
  r1[23] = 'SPEED AVG';
  r2[23] = 'Actual';

  r1[24] = 'EMPTY SPEED';
  r2[24] = 'Plan';
  r1[25] = 'EMPTY SPEED';
  r2[25] = 'Actual';

  r1[26] = 'LOADED SPEED';
  r2[26] = 'Plan';
  r1[27] = 'LOADED SPEED';
  r2[27] = 'Actual';

  r1[28] = 'EMPTY STOP TIME';
  r2[28] = 'Plan';
  r1[29] = 'EMPTY STOP TIME';
  r2[29] = 'Actual';

  r1[31] = 'LOADED STOP TIME';
  r2[31] = 'Plan';
  r1[32] = 'LOADED STOP TIME';
  r2[32] = 'Actual';

  r1[33] = 'AGL GRADE';
  r2[33] = 'Plan';
  r1[34] = 'AGL GRADE';
  r2[34] = 'Actual';

  r1[35] = 'PAYLOAD';
  r2[35] = 'Plan';
  r1[36] = 'PAYLOAD';
  r2[36] = 'Actual';

  r1[37] = 'PRODUCTIVITY';
  r2[37] = 'Plan';
  r1[38] = 'PRODUCTIVITY';
  r2[38] = 'Actual';

  const merges: XLSX.Range[] = [
    { s: { r: 2, c: 4 }, e: { r: 2, c: 8 } }, // E3 merge
    { s: { r: 2, c: 10 }, e: { r: 2, c: 14 } }, // K3 merge
    { s: { r: 4, c: 10 }, e: { r: 4, c: 14 } }, // K5 merge
    { s: { r: 6, c: 1 }, e: { r: 7, c: 4 } }, // LOCATION B7:E8
    { s: { r: 6, c: 5 }, e: { r: 7, c: 5 } }, // NO
    { s: { r: 6, c: 6 }, e: { r: 7, c: 6 } }, // UNIT
    { s: { r: 6, c: 7 }, e: { r: 7, c: 7 } }, // RIT
    { s: { r: 6, c: 8 }, e: { r: 7, c: 8 } }, // JARAK
    { s: { r: 6, c: 9 }, e: { r: 7, c: 9 } }, // KONV
    { s: { r: 6, c: 11 }, e: { r: 7, c: 11 } }, // UPDATED
    { s: { r: 6, c: 12 }, e: { r: 7, c: 12 } }, // BD
    { s: { r: 6, c: 13 }, e: { r: 6, c: 16 } }, // CYCLE TIME
    { s: { r: 6, c: 17 }, e: { r: 6, c: 18 } }, // LOADING TIME
    { s: { r: 6, c: 19 }, e: { r: 6, c: 20 } }, // TRAVEL TIME
    { s: { r: 6, c: 22 }, e: { r: 6, c: 23 } }, // SPEED AVG
    { s: { r: 6, c: 24 }, e: { r: 6, c: 25 } }, // EMPTY SPEED
    { s: { r: 6, c: 26 }, e: { r: 6, c: 27 } }, // LOADED SPEED
    { s: { r: 6, c: 28 }, e: { r: 6, c: 30 } }, // EMPTY STOP TIME
    { s: { r: 6, c: 31 }, e: { r: 6, c: 32 } }, // LOADED STOP TIME
    { s: { r: 6, c: 33 }, e: { r: 6, c: 34 } }, // AGL GRADE
    { s: { r: 6, c: 35 }, e: { r: 6, c: 36 } }, // PAYLOAD
    { s: { r: 6, c: 37 }, e: { r: 6, c: 38 } }, // PRODUCTIVITY
  ];

  let currentPit = '';
  let pitStartRow = 8;

  rows.forEach((row, idx) => {
    const rIdx = 8 + idx;
    const dRow = wsData[rIdx];
    if (row.location !== currentPit) {
      if (currentPit && rIdx - 1 > pitStartRow) {
        merges.push({ s: { r: pitStartRow, c: 1 }, e: { r: rIdx - 1, c: 4 } });
      }
      currentPit = row.location;
      pitStartRow = rIdx;
      dRow[1] = row.location;
    }
    dRow[5] = row.no ?? idx + 1;
    dRow[6] = row.unit;
    dRow[7] = row.rit;
    dRow[8] = row.jarakKm;
    dRow[9] = row.konv;
    dRow[11] = row.updatedRaw;
    dRow[12] = row.bd || null;
    dRow[13] = row.ctPlan;
    dRow[14] = row.ctActual;
    dRow[16] = row.ctCompl;
    dRow[17] = row.ltPlan !== null ? String(row.ltPlan) : null; // simulasi teks angka seperti di file asli
    dRow[18] = row.ltActual;
    dRow[19] = row.travelPlan;
    dRow[20] = row.travelActual;
    dRow[21] = row.engOffActual || null;
    dRow[22] = row.speedAvgPlan;
    dRow[23] = row.speedAvgActual;
    dRow[24] = row.emptySpeedPlan;
    dRow[25] = row.emptySpeedActual;
    dRow[26] = row.loadedSpeedPlan;
    dRow[27] = row.loadedSpeedActual;
    dRow[28] = row.estPlan;
    dRow[29] = row.estActual;
    dRow[31] = row.lstPlan;
    dRow[32] = row.lstActual;
    dRow[33] = row.aglGradePlan;
    dRow[34] = row.aglGradeActual;
    dRow[35] = row.payloadPlan;
    dRow[36] = row.payloadActual;
    dRow[37] = row.prodtyPlan;
    dRow[38] = row.prodtyActual;

    // Merge AD:AE pada setiap baris data seperti di spesifikasi
    merges.push({ s: { r: rIdx, c: 29 }, e: { r: rIdx, c: 30 } });
  });

  if (rows.length > 0 && 8 + rows.length - 1 >= pitStartRow) {
    merges.push({
      s: { r: pitStartRow, c: 1 },
      e: { r: 8 + rows.length - 1, c: 4 },
    });
  }

  // Baris NOTE di bawah tabel
  const noteRowIdx = 8 + rows.length + 2;
  wsData[noteRowIdx][1] =
    'NOTE : CT PLAN = 60 / (CONV x 231 / 41) | CT ACTUAL = LT + EDT + EST + LDT + LST | SPEED = (EDD + LDD) / ((EDT + LDT) / 60) | PRODTY = ((60 / (EDT + EST + LST + LDT + LT)) x 41) / CONV';

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!merges'] = merges;

  XLSX.utils.book_append_sheet(wb, ws, 'VHMS Hourly R2');
  XLSX.writeFile(wb, 'VHMS_Hourly_R2_ARIA_Sample.xlsx');
}

/**
 * Bagian 7: Export hasil perhitungan ke file Excel (.xlsx):
 * - Satu sheet ringkasan per pit (hasil perhitungan)
 * - Satu sheet penugasan DT per loader
 * - Satu sheet data VHMS terparse
 * - Satu sheet Review MF
 * - Satu sheet tabel konversi yang dipakai
 */
export function exportAllToExcel(
  calcResults: LoaderCalculationResult[],
  vhmsRows: VhmsRow[],
  reviewResults: ReviewMfResult[],
  konversiTable: KonversiJarakRow[],
  metadata: VhmsMetadata
) {
  const wb = XLSX.utils.book_new();

  // 1. Satu sheet ringkasan per Pit
  const pits = Array.from(new Set(calcResults.map((r) => r.loader.pit)));
  for (const pit of pits) {
    const pitResults = calcResults.filter((r) => r.loader.pit === pit);
    const sheetRows = pitResults.map((r) => ({
      Pit: r.loader.pit,
      Loader: r.loader.name,
      EGI: r.loader.egi,
      'Status (ON/CC)': r.loader.status,
      'Jarak Rata-rata (m)': r.avgJarakM !== null ? Math.round(r.avgJarakM) : '-',
      Konversi: r.konversi ?? '-',
      'n HD Plan': r.planKebutuhanHd !== null ? Number(r.planKebutuhanHd.toFixed(2)) : '-',
      'n HD Actual': r.nHdActual,
      'DT Ditemukan di VHMS': r.nHdFoundInVhms,
      'Serving Time Actual (mnt)':
        r.avgServingTimeActual !== null ? Number(r.avgServingTimeActual.toFixed(2)) : '-',
      'CT Plan (mnt)':
        r.ctPlanCalculated !== null ? Number(r.ctPlanCalculated.toFixed(2)) : '-',
      'CT Actual (mnt)':
        r.avgCtActual !== null ? Number(r.avgCtActual.toFixed(2)) : '-',
      'Match Factor (MF)': r.mf !== null ? Number(r.mf.toFixed(3)) : '-',
      'Predictive Ritasi (rit/jam)':
        r.predictiveRitasi !== null ? Number(r.predictiveRitasi.toFixed(2)) : '-',
      'Gantung / Antri': r.remark,
      'Durasi (mnt/jam)':
        r.durasiMenitPerJam !== null ? Number(r.durasiMenitPerJam.toFixed(1)) : '-',
      Priority: r.priorityLabel,
      'Catatan Prioritas Perbaikan': r.loader.repairPriorityNote || '-',
    }));

    const safePitName = `Ringkasan ${pit}`.slice(0, 31);
    const wsPit = XLSX.utils.json_to_sheet(sheetRows);
    XLSX.utils.book_append_sheet(wb, wsPit, safePitName);
  }

  // 2. Sheet Penugasan DT per Loader
  const assignmentRows = calcResults.map((r) => ({
    Pit: r.loader.pit,
    Loader: r.loader.name,
    Status: r.loader.status,
    'n HD Input': r.nHdInputCount,
    'n HD Actual (Dipakai)': r.nHdActual,
    'n HD Ditemukan di VHMS': r.nHdFoundInVhms,
    'Daftar DT Ditugaskan': r.assignedUnits.join(', '),
    'DT Tidak Ada di VHMS': r.dtValidations
      .filter((d) => !d.foundInVhms)
      .map((d) => d.unit)
      .join(', '),
    'DT Dobel di Loader Lain': r.dtValidations
      .filter((d) => d.duplicateLoaders.length > 0)
      .map((d) => `${d.unit} (${d.duplicateLoaders.join('/')})`)
      .join(', '),
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(assignmentRows),
    'Penugasan DT'
  );

  // 3. Sheet Data VHMS Terparse
  const vhmsExportRows = vhmsRows.map((r) => ({
    LOCATION: r.location,
    NO: r.no,
    UNIT: r.unit,
    RIT: r.rit,
    'JARAK (km)': r.jarakKm,
    KONV: r.konv,
    UPDATED: r.updatedRaw,
    BD: r.bd,
    'CT Plan': r.ctPlan,
    'CT Actual': r.ctActual,
    'CT Compl (%)': r.ctCompl !== null ? Number((r.ctCompl * 100).toFixed(1)) : null,
    'LT Plan': r.ltPlan,
    'LT Actual': r.ltActual,
    'Travel Plan': r.travelPlan,
    'Travel Actual': r.travelActual,
    'Eng Off Actual': r.engOffActual,
    'Speed Avg Plan': r.speedAvgPlan,
    'Speed Avg Actual': r.speedAvgActual,
    'Empty Speed Plan': r.emptySpeedPlan,
    'Empty Speed Actual': r.emptySpeedActual,
    'Loaded Speed Plan': r.loadedSpeedPlan,
    'Loaded Speed Actual': r.loadedSpeedActual,
    'EST Plan': r.estPlan,
    'EST Actual': r.estActual,
    'LST Plan': r.lstPlan,
    'LST Actual': r.lstActual,
    'AGL Grade Plan': r.aglGradePlan,
    'AGL Grade Actual': r.aglGradeActual,
    'Payload Plan': r.payloadPlan,
    'Payload Actual': r.payloadActual,
    'Productivity Plan': r.prodtyPlan,
    'Productivity Actual': r.prodtyActual,
    'Cek Konsistensi CT': r.consistencyWarning || 'OK',
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(vhmsExportRows),
    'Data VHMS Terparse'
  );

  // 4. Sheet Review MF
  const reviewExportRows = reviewResults.map((r) => ({
    Pit: r.loader.pit,
    Loader: r.loader.name,
    'n HD': r.nHd,
    Ritasi: r.ritasi ?? '-',
    'HM Jam Sebelumnya': r.hmPrev ?? '-',
    'HM Akhir': r.hmEnd ?? '-',
    'HM Efektif (jam)': r.hmEfektif !== null ? Number(r.hmEfektif.toFixed(2)) : '-',
    'Prodty Loader Plan (t/j)': r.prodtyLoaderPlan,
    'Prodty Loader Actual (t/j)':
      r.prodtyLoaderActual !== null ? Number(r.prodtyLoaderActual.toFixed(2)) : '-',
    'Prodty Hauler Plan (t/j)': r.prodtyHaulerPlan,
    'Prodty Hauler Actual (t/j)':
      r.prodtyHaulerActual !== null ? Number(r.prodtyHaulerActual.toFixed(2)) : '-',
    'Jarak Aktual Rata-rata (m)': r.avgJarakM !== null ? Math.round(r.avgJarakM) : '-',
    Konversi: r.konversi ?? '-',
    'MF by VHMS': r.mfVhms !== null ? Number(r.mfVhms.toFixed(3)) : '-',
    'MF Review': r.mfReview !== null ? Number(r.mfReview.toFixed(3)) : '-',
    'Selisih MF': r.mfDelta !== null ? Number(r.mfDelta.toFixed(3)) : '-',
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(reviewExportRows),
    'Review MF'
  );

  // 5. Sheet Tabel Konversi
  const konvExportRows = konversiTable.map((k) => ({
    'Jarak (m)': k.jarakM,
    'Jarak (km)': Number((k.jarakM / 1000).toFixed(3)),
    Konversi: k.konversi,
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(konvExportRows),
    'Tabel Konversi'
  );

  const dateSlug = (metadata.parsedDateDisplay || 'ARIA').replace(/\s+/g, '_');
  XLSX.writeFile(wb, `MF_Predictive_Ritasi_${dateSlug}.xlsx`);
}
