import * as XLSX from 'xlsx';

export interface ParsedOperationalDate {
  day: number;
  monthNum: number; // 1-12
  year: number;
  display: string; // e.g. "01 Okt 2026"
  paddedKey: string; // "01 OKT 2026"
  singleKey: string; // "1 OKT 2026"
  rawSource: string;
}

export type ShiftOption = '1' | '2';
export type ShiftCode = 'S04' | 'S05';

export const SHIFT_OPTIONS: Array<{
  id: ShiftOption;
  label: string;
  code: ShiftCode;
  description: string;
}> = [
  { id: '1', label: 'Shift 1', code: 'S04', description: 'Shift 1 (Kode S04)' },
  { id: '2', label: 'Shift 2', code: 'S05', description: 'Shift 2 (Kode S05)' },
];

export function getShiftCode(shift: string | ShiftOption = '1'): ShiftCode {
  const s = String(shift).trim().toUpperCase();
  if (s === '2' || s.includes('SHIFT 2') || s.includes('S05')) {
    return 'S05';
  }
  return 'S04';
}

export interface OperatorRecord {
  unit: string; // e.g. "4514"
  name: string; // e.g. "ANSARI"
  loader?: string; // e.g. "EX1233"
  shift?: string; // e.g. "S04" atau "S05"
  explicitShift?: string;
  nrp?: string;
  sourceRow?: number;
}

export type OperatorLookupStatus = 'FOUND' | 'NOT_FOUND' | 'AMBIGUOUS' | 'LOADING' | 'ERROR';

export interface OperatorMatchResult {
  unit: string;
  name: string;
  status: OperatorLookupStatus;
  loader?: string;
  shift?: string;
  ambiguousNames?: string[];
  message?: string;
}

export interface PitSheetConfig {
  pit: string;
  spreadsheetId: string;
  referenceGid: string;
  dateGidMap: Record<string, string>;
}

// Konfigurasi Google Sheets Resmi untuk Masing-Masing PIT
export const PIT_SHEET_CONFIGS: Record<string, PitSheetConfig> = {
  'PIT 11': {
    pit: 'PIT 11',
    spreadsheetId: '17pIjBo814EtMVZSVULuBMVNNG7UowyjKApgPUsXQnGM',
    referenceGid: '1620748713', // 17 Okt 2026
    dateGidMap: {
      '01 OKT 2026': '533406199',
      '1 OKT 2026': '533406199',
      '02 OKT 2026': '601895364',
      '2 OKT 2026': '601895364',
      '03 OKT 2026': '1084867380',
      '3 OKT 2026': '1084867380',
      '04 OKT 2026': '1755204959',
      '4 OKT 2026': '1755204959',
      '05 OKT 2026': '1313029730',
      '5 OKT 2026': '1313029730',
      '06 OKT 2026': '174295043',
      '6 OKT 2026': '174295043',
      '07 OKT 2026': '580640415',
      '7 OKT 2026': '580640415',
      '08 OKT 2026': '2079092899',
      '8 OKT 2026': '2079092899',
      '09 OKT 2026': '1131407310',
      '9 OKT 2026': '1131407310',
      '10 OKT 2026': '976964408',
      '11 OKT 2026': '1241084027',
      '12 OKT 2026': '15525655',
      '13 OKT 2026': '517856639',
      '14 OKT 2026': '1531121896',
      '15 OKT 2026': '744916766',
      '16 OKT 2026': '814063973',
      '17 OKT 2026': '1620748713',
    },
  },
  'PIT 12': {
    pit: 'PIT 12',
    spreadsheetId: '1DES6NfjBbjclFBCnWAcPEJCD8fTfgNtYCCCXFLbY7tc',
    referenceGid: '1517122612', // 17 Okt 2026
    dateGidMap: {
      '1 OKT 2026': '1132925260',
      '01 OKT 2026': '1132925260',
      '2 OKT 2026': '1919690373',
      '02 OKT 2026': '1919690373',
      '3 OKT 2026': '1457227273',
      '03 OKT 2026': '1457227273',
      '4 OKT 2026': '162600075',
      '04 OKT 2026': '162600075',
      '5 OKT 2026': '522814173',
      '05 OKT 2026': '522814173',
      '6 OKT 2026': '502258928',
      '06 OKT 2026': '502258928',
      '7 OKT 2026': '364261137',
      '07 OKT 2026': '364261137',
      '8 OKT 2026': '503299521',
      '08 OKT 2026': '503299521',
      '9 OKT 2026': '1901459785',
      '09 OKT 2026': '1901459785',
      '10 OKT 2026': '673910902',
      '11 OKT 2026': '141487024',
      '12 OKT 2026': '375254696',
      '13 OKT 2026': '915551457',
      '14 OKT 2026': '1365550283',
      '15 OKT 2026': '6870369',
      '16 OKT 2026': '827199515',
      '17 OKT 2026': '1517122612',
    },
  },
  'JUMBANG': {
    pit: 'JUMBANG',
    spreadsheetId: '19h6-8U3LD1eWelqzYShCIMPEpyk0mHpspRqdl26Ri4o',
    referenceGid: '972532318', // 17 Okt 2026
    dateGidMap: {
      '01 OKT 2026': '1848083431',
      '1 OKT 2026': '1848083431',
      '02 OKT 2026': '1134975377',
      '2 OKT 2026': '1134975377',
      '03 OKT 2026': '1729326312',
      '3 OKT 2026': '1729326312',
      '04 OKT 2026': '1081435842',
      '4 OKT 2026': '1081435842',
      '05 OKT 2026': '744824422',
      '5 OKT 2026': '744824422',
      '06 OKT 2026': '112133074',
      '6 OKT 2026': '112133074',
      '07 OKT 2026': '320711445',
      '7 OKT 2026': '320711445',
      '08 OKT 2026': '2139879191',
      '8 OKT 2026': '2139879191',
      '09 OKT 2026': '382150526',
      '9 OKT 2026': '382150526',
      '10 OKT 2026': '409946969',
      '11 OKT 2026': '1934282778',
      '12 OKT 2026': '1757025242',
      '13 OKT 2026': '1788971668',
      '14 OKT 2026': '998246235',
      '15 OKT 2026': '1506761725',
      '16 OKT 2026': '353526785',
      '17 OKT 2026': '972532318',
    },
  },
};

const MONTH_NAMES_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const MONTH_ALIAS_MAP: Record<string, number> = {
  jan: 1, januari: 1,
  feb: 2, februari: 2,
  mar: 3, maret: 3,
  apr: 4, april: 4,
  may: 5, mei: 5,
  jun: 6, juni: 6,
  jul: 7, juli: 7,
  aug: 8, agu: 8, agustus: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, okt: 10, oktober: 10,
  nov: 11, november: 11,
  dec: 12, des: 12, desember: 12,
};

/**
 * Ekstrak tanggal operasional secara akurat dari nama file (atau fallback teks header)
 * Contoh: "VHMS_Hourly_R2_ARIA_01Oct2026.xlsx" -> 1 Oktober 2026
 */
export function parseOperationalDate(
  fileName: string,
  fallbackText?: string
): ParsedOperationalDate | null {
  const sources = [fileName, fallbackText || ''].filter(Boolean);

  for (const raw of sources) {
    if (!raw) continue;

    // Pola 1: 01Oct2026, 17Oct2026, 01_Okt_2026, 01-Oktober-2026, "VHMS, 01 Oct 2026"
    const regex1 = /(\d{1,2})[\s_-]*([A-Za-z]{3,9})[\s_-]*(\d{4}|\d{2})\b/i;
    const m1 = raw.match(regex1);
    if (m1) {
      const day = parseInt(m1[1], 10);
      const mStr = m1[2].toLowerCase();
      const monthNum = Object.entries(MONTH_ALIAS_MAP).find(([k]) =>
        mStr.startsWith(k)
      )?.[1];
      let year = parseInt(m1[3], 10);
      if (year < 100) year += 2000;

      if (monthNum && day >= 1 && day <= 31) {
        const dd = String(day).padStart(2, '0');
        const mmId = MONTH_NAMES_ID[monthNum - 1];
        return {
          day,
          monthNum,
          year,
          display: `${dd} ${mmId} ${year}`,
          paddedKey: `${dd} ${mmId.toUpperCase()} ${year}`,
          singleKey: `${day} ${mmId.toUpperCase()} ${year}`,
          rawSource: raw,
        };
      }
    }

    // Pola 2: Format angka 20261001 atau 2026-10-01 atau 01-10-2026
    const regex2 = /\b(\d{4})[-_]?(\d{2})[-_]?(\d{2})\b/;
    const m2 = raw.match(regex2);
    if (m2) {
      const year = parseInt(m2[1], 10);
      const monthNum = parseInt(m2[2], 10);
      const day = parseInt(m2[3], 10);
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
          rawSource: raw,
        };
      }
    }

    const regex3 = /\b(\d{1,2})[-_](\d{1,2})[-_](\d{4})\b/;
    const m3 = raw.match(regex3);
    if (m3) {
      const day = parseInt(m3[1], 10);
      const monthNum = parseInt(m3[2], 10);
      const year = parseInt(m3[3], 10);
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
          rawSource: raw,
        };
      }
    }
  }

  return null;
}

/**
 * Parsing teks CSV Google Sheets secara robust dengan pemecahan sel dan tanda kutip
 */
export function parseGoogleSheetsCsv(csvText: string): OperatorRecord[] {
  if (!csvText) return [];

  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Parse CSV line sederhana dengan handling quotes
  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  // Cari baris header yang berisi "HAULER" atau "UNIT" dan "NAMA" atau "OPERATOR"
  let haulerCol = -1;
  let nameCol = -1;
  let loaderCol = -1;
  let shiftCol = -1;
  let nrpCol = -1;
  let headerRowIndex = -1;

  for (let r = 0; r < Math.min(25, lines.length); r++) {
    const cols = parseRow(lines[r]).map((s) => s.toUpperCase());
    for (let c = 0; c < cols.length; c++) {
      const val = cols[c];
      if (haulerCol === -1 && (val === 'HAULER' || val === 'UNIT' || val === 'NO UNIT' || val === 'NO. UNIT')) {
        haulerCol = c;
      }
      if (nameCol === -1 && (val === 'NAMA' || val === 'OPERATOR' || val === 'NAMA OPERATOR')) {
        nameCol = c;
      }
      if (loaderCol === -1 && (val === 'LOADER' || val === 'PC' || val === 'EX' || val === 'EXCAVATOR')) {
        loaderCol = c;
      }
      if (shiftCol === -1 && (val === 'SHIFT' || val === 'KODE SHIFT' || val === 'SFT')) {
        shiftCol = c;
      }
      if (nrpCol === -1 && (val === 'NRP' || val === 'NIK')) {
        nrpCol = c;
      }
    }

    if (haulerCol !== -1 && nameCol !== -1) {
      headerRowIndex = r;
      break;
    }
  }

  // Jika tidak ditemukan secara eksplisit, gunakan fallback posisi standar sheet ARIA (haulerCol = 3, nameCol = 5)
  if (haulerCol === -1 || nameCol === -1) {
    haulerCol = 3;
    nameCol = 5;
    loaderCol = 2;
    shiftCol = 1;
    headerRowIndex = 0;
  }

  const records: OperatorRecord[] = [];
  let currentShift = '';
  let currentLoader = '';

  for (let r = headerRowIndex + 1; r < lines.length; r++) {
    const cols = parseRow(lines[r]);
    if (cols.length <= Math.max(haulerCol, nameCol)) continue;

    const rawHauler = cols[haulerCol] || '';
    const rawName = cols[nameCol] || '';
    const rawLoader = loaderCol !== -1 ? cols[loaderCol] || '' : '';
    const rawShift = shiftCol !== -1 ? cols[shiftCol] || '' : '';
    const rawNrp = nrpCol !== -1 ? cols[nrpCol] || '' : '';

    const firstColUpper = (cols[0] || '').toUpperCase();
    const secondColUpper = (cols[1] || '').toUpperCase();
    if (firstColUpper.includes('TOTAL') || secondColUpper.includes('TOTAL')) {
      currentShift = '';
      currentLoader = '';
    }

    if (rawShift) {
      const sUp = rawShift.toUpperCase();
      if (sUp.includes('S04')) currentShift = 'S04';
      else if (sUp.includes('S05')) currentShift = 'S05';
      else currentShift = rawShift.trim();
    }
    if (rawLoader) currentLoader = rawLoader;

    if (!rawHauler || !rawName) continue;
    if (rawHauler.toUpperCase() === 'HAULER' || rawName.toUpperCase() === 'NAMA') continue;

    // Normalisasi hauler. Bisa jamak "4593 / 4521" atau tunggal "4514"
    const units = rawHauler.split(/[/,]/).map((u) => u.trim()).filter(Boolean);
    for (const u of units) {
      const digitsMatch = u.match(/\d+/);
      const cleanUnit = digitsMatch ? digitsMatch[0] : u.toUpperCase();

      records.push({
        unit: cleanUnit,
        name: rawName.replace(/^["'\s]+|["'\s]+$/g, '').trim(),
        loader: (rawLoader || currentLoader).replace(/\s+/g, '').toUpperCase(),
        shift: (rawShift || currentShift).trim().toUpperCase(),
        explicitShift: rawShift.trim().toUpperCase() || undefined,
        nrp: rawNrp || undefined,
        sourceRow: r + 1,
      });
    }
  }

  return records;
}

// In-Memory Cache untuk menghindari fetch berulang jika PIT & Tanggal sama
const OPERATOR_CACHE = new Map<string, { records: OperatorRecord[]; fetchedAt: number }>();

export interface FetchOperatorResult {
  success: boolean;
  pit: string;
  dateKey: string;
  records: OperatorRecord[];
  source: 'google_sheets' | 'local_file';
  sheetNameUsed: string;
  message?: string;
  error?: string;
}

/**
 * Mengambil data nama operator dari Google Sheets sesuai PIT aktif dan Tanggal operasional
 */
export async function fetchOperatorsFromGoogleSheets(
  pit: string,
  parsedDate: ParsedOperationalDate | null,
  forceRefresh: boolean = false
): Promise<FetchOperatorResult> {
  const normalizedPit = pit.trim().toUpperCase();
  const config = PIT_SHEET_CONFIGS[normalizedPit];

  if (!config) {
    return {
      success: false,
      pit,
      dateKey: parsedDate?.display || '-',
      records: [],
      source: 'google_sheets',
      sheetNameUsed: '-',
      message: `Konfigurasi Google Sheets untuk ${pit} tidak ditemukan.`,
      error: 'PIT_NOT_CONFIGURED',
    };
  }

  if (!parsedDate) {
    return {
      success: false,
      pit,
      dateKey: '-',
      records: [],
      source: 'google_sheets',
      sheetNameUsed: '-',
      message: 'Tanggal operasional tidak dapat diidentifikasi dari nama file Excel.',
      error: 'DATE_NOT_IDENTIFIED',
    };
  }

  // Cari GID berdasarkan kunci tanggal terformat (contoh: "01 OKT 2026" atau "1 OKT 2026")
  let targetGid =
    config.dateGidMap[parsedDate.paddedKey] ||
    config.dateGidMap[parsedDate.singleKey] ||
    '';

  const cacheKey = `${normalizedPit}_${parsedDate.paddedKey}_${targetGid}`;
  if (!forceRefresh && OPERATOR_CACHE.has(cacheKey)) {
    const cached = OPERATOR_CACHE.get(cacheKey)!;
    return {
      success: true,
      pit,
      dateKey: parsedDate.display,
      records: cached.records,
      source: 'google_sheets',
      sheetNameUsed: parsedDate.paddedKey,
      message: `Data operator dimuat dari cache (${cached.records.length} data)`,
    };
  }

  // Jika tanggal tidak ditemukan di map sheet yang diketahui:
  if (!targetGid) {
    return {
      success: false,
      pit,
      dateKey: parsedDate.display,
      records: [],
      source: 'google_sheets',
      sheetNameUsed: parsedDate.paddedKey,
      message: `Sheet untuk tanggal ${parsedDate.display} tidak ditemukan pada Google Sheets ${pit}.`,
      error: 'SHEET_DATE_NOT_FOUND',
    };
  }

  try {
    const exportUrl = `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/export?format=csv&gid=${targetGid}`;
    const response = await fetch(exportUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/csv, text/plain, */*',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const csvText = await response.text();
    const records = parseGoogleSheetsCsv(csvText);

    if (records.length === 0) {
      return {
        success: false,
        pit,
        dateKey: parsedDate.display,
        records: [],
        source: 'google_sheets',
        sheetNameUsed: parsedDate.paddedKey,
        message: `Sheet ${parsedDate.display} berhasil diunduh namun tidak ditemukan data operator yang valid.`,
        error: 'EMPTY_SHEET_DATA',
      };
    }

    OPERATOR_CACHE.set(cacheKey, {
      records,
      fetchedAt: Date.now(),
    });

    return {
      success: true,
      pit,
      dateKey: parsedDate.display,
      records,
      source: 'google_sheets',
      sheetNameUsed: parsedDate.paddedKey,
      message: `Berhasil memuat ${records.length} data operator dari Google Sheets ${pit}.`,
    };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      pit,
      dateKey: parsedDate.display,
      records: [],
      source: 'google_sheets',
      sheetNameUsed: parsedDate.paddedKey,
      message: `Gagal mengakses Google Sheets ${pit}: ${errMessage}. Pemrosesan VHMS tetap berjalan tanpa nama operator.`,
      error: errMessage,
    };
  }
}

/**
 * Parsing file Excel/CSV monitoring operator yang di-upload manual oleh pengguna
 */
export function parseLocalMonitoringFile(
  workbook: XLSX.WorkBook,
  parsedDate: ParsedOperationalDate | null
): { records: OperatorRecord[]; sheetName: string } {
  const sheetNames = workbook.SheetNames;
  let targetSheetName = sheetNames[0];

  if (parsedDate) {
    // Cari sheet yang namanya cocok dengan tanggal operasional
    const matched = sheetNames.find((name) => {
      const upper = name.trim().toUpperCase();
      return (
        upper === parsedDate.paddedKey ||
        upper === parsedDate.singleKey ||
        upper.includes(`${parsedDate.day} OKT`) ||
        upper.includes(`${String(parsedDate.day).padStart(2, '0')} OKT`) ||
        upper.includes(`${parsedDate.day} OCT`)
      );
    });
    if (matched) {
      targetSheetName = matched;
    }
  }

  const worksheet = workbook.Sheets[targetSheetName];
  if (!worksheet) return { records: [], sheetName: targetSheetName };

  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const records = parseGoogleSheetsCsv(csv);
  return { records, sheetName: targetSheetName };
}

/**
 * Pencocokan nama operator untuk nomor unit dan loader tertentu berdasarkan shift aktif (Shift 1 = S04, Shift 2 = S05)
 */
export function matchOperatorName(
  rawUnitInput: string,
  loaderName: string,
  records: OperatorRecord[],
  activeShift: string | ShiftOption = '1'
): OperatorMatchResult {
  const digitsMatch = rawUnitInput.match(/\d+/);
  const targetDigits = digitsMatch ? digitsMatch[0] : rawUnitInput.replace(/\D+/g, '');

  if (!targetDigits) {
    return {
      unit: rawUnitInput,
      name: '—',
      status: 'NOT_FOUND',
      message: 'Nomor unit belum diisi',
    };
  }

  const targetShiftCode = getShiftCode(activeShift);
  const shiftLabel = targetShiftCode === 'S05' ? 'Shift 2 (S05)' : 'Shift 1 (S04)';

  // Periksa apakah dataset memiliki data kode shift (seperti S04 atau S05)
  const hasShiftData = records.some(
    (r) =>
      r.shift &&
      (r.shift.toUpperCase().includes('S04') || r.shift.toUpperCase().includes('S05'))
  );

  // Saring records: jika dataset memiliki data shift, saring HANYA baris yang sesuai dengan kode shift aktif
  const candidateRecords = hasShiftData
    ? records.filter((r) => r.shift && r.shift.toUpperCase().includes(targetShiftCode))
    : records;

  // Filter records yang memiliki nomor unit yang sama pada shift terpilih
  const matchingUnits = candidateRecords.filter((r) => r.unit === targetDigits);

  if (matchingUnits.length === 0) {
    return {
      unit: targetDigits,
      name: '—',
      status: 'NOT_FOUND',
      shift: targetShiftCode,
      message: `Operator untuk unit ${targetDigits} pada ${shiftLabel} tidak ditemukan`,
    };
  }

  // Jika hanya ada 1 record pada shift terpilih, langsung cocok
  if (matchingUnits.length === 1) {
    return {
      unit: targetDigits,
      name: matchingUnits[0].name,
      status: 'FOUND',
      loader: matchingUnits[0].loader,
      shift: matchingUnits[0].shift || targetShiftCode,
    };
  }

  // Jika ada beberapa record pada shift yang sama, cocokkan dengan Loader
  const normLoader = loaderName.replace(/\s+/g, '').toUpperCase();

  const loaderMatch = matchingUnits.filter(
    (r) =>
      r.loader &&
      (r.loader === normLoader || normLoader.includes(r.loader) || r.loader.includes(normLoader))
  );

  if (loaderMatch.length === 1) {
    return {
      unit: targetDigits,
      name: loaderMatch[0].name,
      status: 'FOUND',
      loader: loaderMatch[0].loader,
      shift: loaderMatch[0].shift || targetShiftCode,
    };
  }

  // Cek apakah seluruh match memiliki nama yang sama persis
  const distinctNames = Array.from(new Set(matchingUnits.map((r) => r.name.trim())));
  if (distinctNames.length === 1) {
    return {
      unit: targetDigits,
      name: distinctNames[0],
      status: 'FOUND',
      loader: matchingUnits[0].loader,
      shift: matchingUnits[0].shift || targetShiftCode,
    };
  }

  // Jika terdapat beberapa nama yang berbeda dan tidak dapat dibedakan: tandai AMBIGU
  return {
    unit: targetDigits,
    name: distinctNames.join(' / '),
    status: 'AMBIGUOUS',
    shift: targetShiftCode,
    ambiguousNames: distinctNames,
    message: `Ambigu: Ditemukan ${distinctNames.length} nama operator untuk unit ${targetDigits} pada ${shiftLabel}`,
  };
}
