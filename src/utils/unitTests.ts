import {
  SEED_KONVERSI_JARAK,
  lookupKonversi,
  sanitizeKonversiTable,
} from '../data/konversiJarak';
import {
  calculateAllLoaders,
  formatIdNumber,
  normalizeDtInputList,
} from './formulas';
import {
  parseVhmsDateText,
  parseVhmsHoursText,
  parseVhmsNumericCell,
} from './excelParser';
import {
  getShiftCode,
  matchOperatorName,
  OperatorRecord,
  parseOperationalDateFromSheetName,
  PIT_SHEET_CONFIGS,
} from './operatorService';
import { calculateExportColumnWidths } from './exportPng';
import { GlobalParams, MasterLoader, VhmsRow } from '../types';
import { SAMPLE_VHMS_ROWS } from '../data/sampleData';

export interface UnitTestCaseResult {
  id: string;
  category:
    | 'Lookup Konversi'
    | 'Sanitasi Tabel'
    | 'Rumus Perhitungan'
    | 'Parsing VHMS'
    | 'Pencocokan Shift & Operator'
    | 'Daftar Tanggal Google Sheets'
    | 'Export PNG & Layout Tabel';
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
}

export function runAllAutomatedTests(): UnitTestCaseResult[] {
  const results: UnitTestCaseResult[] = [];

  // 1. Tes Lookup Konversi (Approximate Match - Bagian 8)
  const lookupCases: Array<{ input: number; expected: number; note?: string }> = [
    { input: 30, expected: 3.292, note: 'di bawah minimum, pakai baris pertama' },
    { input: 250, expected: 2.16 },
    { input: 2150, expected: 0.649 },
    { input: 3008.3, expected: 0.536 },
    { input: 4450, expected: 0.433 },
    { input: 4500, expected: 0.427 },
    { input: 11500, expected: 0.22 },
    { input: 12500, expected: 0.209 },
    { input: 35000, expected: 0.164, note: 'di atas maksimum, pakai baris terakhir' },
  ];

  lookupCases.forEach((tc, idx) => {
    const actualVal = lookupKonversi(tc.input, SEED_KONVERSI_JARAK);
    const passed = Math.abs(actualVal - tc.expected) < 1e-6;
    results.push({
      id: `lookup-${idx + 1}`,
      category: 'Lookup Konversi',
      name: `lookup(${formatIdNumber(tc.input, tc.input % 1 === 0 ? 0 : 1)})${
        tc.note ? ` — ${tc.note}` : ''
      }`,
      expected: formatIdNumber(tc.expected, 3),
      actual: formatIdNumber(actualVal, 3),
      passed,
    });
  });

  // 2. Tes Sanitasi Tabel Konversi (Bagian 8)
  const rawSanitizeInput = [
    { jarakM: 4300, konversi: 0.44 },
    { jarakM: 4300, konversi: 0.44 },
    { jarakM: 7000, konversi: 0.306 },
    { jarakM: 4700, konversi: 0.412 },
  ];
  const sanitized = sanitizeKonversiTable(rawSanitizeInput);
  const actualDistances = `[${sanitized.rows.map((r) => r.jarakM).join(', ')}]`;
  const expectedDistances = '[4300, 4700, 7000]';
  results.push({
    id: 'sanitize-1',
    category: 'Sanitasi Tabel',
    name: 'Sanitasi & Dedup [4300, 4300, 7000, 4700]',
    expected: expectedDistances,
    actual: actualDistances,
    passed: actualDistances === expectedDistances && sanitized.duplicatesRemoved === 1,
  });

  // 3. Tes Rumus Lengkap (Bagian 8): DT5886, DT5430, DT4515
  const testLoader: MasterLoader = {
    id: 'test-ldr',
    pit: 'PIT 12',
    name: 'EX 1217',
    egi: 'PC1250SP8',
    planProdtyLoader: 540,
    status: 'ON',
    repairPriorityNote: 'Jalan dan Disposal',
    wh: 60,
    delay: 0,
    overrideNHdActual: null,
  };

  const testParams: GlobalParams = {
    planProdtyHauler: 231,
    ctPlanProdtyConst: 231,
    payloadPerRit: 41,
    planServingTime: 3.73,
    defaultWh: 60,
    defaultDelay: 0,
    mfLowerThreshold: 0.895,
    mfUpperThreshold: 1.005,
    weightedByRit: false,
    includeNonOnInPriority: true,
  };

  const testRows: VhmsRow[] = SAMPLE_VHMS_ROWS.filter((r) =>
    ['DT5886', 'DT5430', 'DT4515'].includes(r.unit)
  );
  const [calc] = calculateAllLoaders(
    [testLoader],
    { 'test-ldr': ['DT5886', 'DT5430', 'DT4515'] },
    testRows,
    SEED_KONVERSI_JARAK,
    testParams
  );

  // 3a. Jarak rata-rata = 3008,3 m
  const actualJarakStr = formatIdNumber(calc.avgJarakM, 1);
  results.push({
    id: 'formula-jarak',
    category: 'Rumus Perhitungan',
    name: 'Jarak rata-rata (DT5886, DT5430, DT4515)',
    expected: '3.008,3 m',
    actual: `${actualJarakStr} m`,
    passed: actualJarakStr === '3.008,3',
  });

  // 3b. Konversi (lookup 3008,3 m -> 3000 m) = 0,536
  const actualKonvStr = formatIdNumber(calc.konversi, 3);
  results.push({
    id: 'formula-konv',
    category: 'Rumus Perhitungan',
    name: 'Konversi (lookup 3008,3 m)',
    expected: '0,536',
    actual: actualKonvStr,
    passed: actualKonvStr === '0,536',
  });

  // 3c. Plan Kebutuhan HD = 540 / (231 x 0,536) = 4,36
  const actualPlanHdStr = formatIdNumber(calc.planKebutuhanHd, 2);
  results.push({
    id: 'formula-plan-hd',
    category: 'Rumus Perhitungan',
    name: 'Plan Kebutuhan HD = 540 / (231 × 0,536)',
    expected: '4,36',
    actual: actualPlanHdStr,
    passed: actualPlanHdStr === '4,36',
  });

  // 3d. CT Plan = 60 / ((0,536 x 231) / 41) = 19,87 menit
  const actualCtPlanStr = formatIdNumber(calc.ctPlanCalculated, 2);
  results.push({
    id: 'formula-ct-plan',
    category: 'Rumus Perhitungan',
    name: 'CT Plan = 60 / ((0,536 × 231) / 41)',
    expected: '19,87 menit',
    actual: `${actualCtPlanStr} menit`,
    passed: actualCtPlanStr === '19,87',
  });

  // 3e. CT Actual rata-rata = (20,7667 + 20,5167 + 19,3) / 3 = 20,19 menit
  const actualCtActStr = formatIdNumber(calc.avgCtActual, 2);
  results.push({
    id: 'formula-ct-act',
    category: 'Rumus Perhitungan',
    name: 'CT Actual rata-rata',
    expected: '20,19 menit',
    actual: `${actualCtActStr} menit`,
    passed: actualCtActStr === '20,19',
  });

  // 3f. Serving Time rata-rata = (3,9167 + 3,85 + 3,6) / 3 = 3,79 menit
  const actualStStr = formatIdNumber(calc.avgServingTimeActual, 2);
  results.push({
    id: 'formula-st',
    category: 'Rumus Perhitungan',
    name: 'Serving Time Actual rata-rata',
    expected: '3,79 menit',
    actual: `${actualStStr} menit`,
    passed: actualStStr === '3,79',
  });

  // 3g. MF = 3 x 3,7889 / 20,1944 = 0,563 (Potensi Gantung)
  const actualMf3Str = formatIdNumber(calc.mf, 3);
  results.push({
    id: 'formula-mf',
    category: 'Rumus Perhitungan',
    name: 'Match Factor (MF) & Status Remark',
    expected: '0,563 (Potensi Gantung)',
    actual: `${actualMf3Str} (${calc.remark})`,
    passed: actualMf3Str === '0,563' && calc.remark === 'Potensi Gantung',
  });

  // 3h. Durasi = 60 - 0,563 x 60 = 26,2 menit/jam
  const actualDurasiStr = formatIdNumber(calc.durasiMenitPerJam, 1);
  results.push({
    id: 'formula-durasi',
    category: 'Rumus Perhitungan',
    name: 'Durasi Gantung = 60 - (MF × 60)',
    expected: '26,2 menit/jam',
    actual: `${actualDurasiStr} menit/jam`,
    passed: actualDurasiStr === '26,2',
  });

  // 3i. Predictive Ritasi = 0,563 x 60 / 3,7889 = 8,91 rit/jam
  const actualPredRitStr = formatIdNumber(calc.predictiveRitasi, 2);
  results.push({
    id: 'formula-pred-rit',
    category: 'Rumus Perhitungan',
    name: 'Predictive Ritasi = (MF × 60) / Serving Time',
    expected: '8,91 rit/jam',
    actual: `${actualPredRitStr} rit/jam`,
    passed: actualPredRitStr === '8,91',
  });

  // 4. Tes Parsing VHMS & Normalisasi DT
  const dtNorm = normalizeDtInputList('4553, DT4233; dt 4457\n4553 ABC');
  const dtNormStr = dtNorm.join(', ');
  results.push({
    id: 'parse-dt-norm',
    category: 'Parsing VHMS',
    name: 'Normalisasi & Dedup Input DT ("4553, DT4233; dt 4457\\n4553 ABC")',
    expected: 'DT4553, DT4233, DT4457',
    actual: dtNormStr,
    passed: dtNormStr === 'DT4553, DT4233, DT4457',
  });

  const parsedNum1 = parseVhmsNumericCell('3,33');
  const parsedNum2 = parseVhmsNumericCell('85%', false, true);
  const parsedDate = parseVhmsDateText('VHMS, 01 Oct 2026');
  const parsedHours = parseVhmsHoursText('Jam: 06, 07, 08');
  results.push({
    id: 'parse-metadata-num',
    category: 'Parsing VHMS',
    name: 'Parse Angka Koma ("3,33"), Persen ("85%"), Tanggal & Jam',
    expected: '3.33 | 0.85 | 01 Okt 2026 | Data jam 06-08',
    actual: `${parsedNum1} | ${parsedNum2} | ${parsedDate} | ${parsedHours.hoursLabel}`,
    passed:
      parsedNum1 === 3.33 &&
      parsedNum2 === 0.85 &&
      parsedDate === '01 Okt 2026' &&
      parsedHours.hoursLabel === 'Data jam 06-08',
  });

  // 5. Tes Pencocokan Shift & Operator (Shift 1 = S04, Shift 2 = S05)
  const shift1Code = getShiftCode('1');
  const shift2Code = getShiftCode('2');
  results.push({
    id: 'shift-code-mapping',
    category: 'Pencocokan Shift & Operator',
    name: 'Pemetaan Kode Shift (Shift 1 -> S04, Shift 2 -> S05)',
    expected: 'S04 | S05',
    actual: `${shift1Code} | ${shift2Code}`,
    passed: shift1Code === 'S04' && shift2Code === 'S05',
  });

  // Sample records dengan pemisahan shift S04 dan S05
  const sampleOpRecords: OperatorRecord[] = [
    { unit: '4514', name: 'ANSARI', loader: 'EX1233', shift: 'S04', sourceRow: 2 },
    { unit: '4376', name: 'AHMAD SALIM', loader: 'EX1233', shift: 'S04', sourceRow: 3 },
    { unit: '4514', name: 'ANGGA SETYAWAN', loader: 'EX1233', shift: 'S05', sourceRow: 76 },
    { unit: '4507', name: 'ARIFIN', loader: 'EX1233', shift: 'S05', sourceRow: 77 },
  ];

  // 5a. Unit 4514 pada Shift 1 (S04) -> ANSARI
  const matchS1 = matchOperatorName('4514', 'EX 1233', sampleOpRecords, '1');
  results.push({
    id: 'operator-match-shift-1',
    category: 'Pencocokan Shift & Operator',
    name: 'Pencocokan Unit 4514 pada Shift 1 (S04)',
    expected: 'ANSARI (FOUND)',
    actual: `${matchS1.name} (${matchS1.status})`,
    passed: matchS1.status === 'FOUND' && matchS1.name === 'ANSARI',
  });

  // 5b. Unit 4514 pada Shift 2 (S05) -> ANGGA SETYAWAN
  const matchS2 = matchOperatorName('4514', 'EX 1233', sampleOpRecords, '2');
  results.push({
    id: 'operator-match-shift-2',
    category: 'Pencocokan Shift & Operator',
    name: 'Pencocokan Unit 4514 pada Shift 2 (S05)',
    expected: 'ANGGA SETYAWAN (FOUND)',
    actual: `${matchS2.name} (${matchS2.status})`,
    passed: matchS2.status === 'FOUND' && matchS2.name === 'ANGGA SETYAWAN',
  });

  // 5c. Unit 4376 ada di Shift 1 tapi TIDAK ada di Shift 2 -> Tampilkan "—" (Ketentuan 6 & 7)
  const matchS2Missing = matchOperatorName('4376', 'EX 1233', sampleOpRecords, '2');
  results.push({
    id: 'operator-isolation-missing',
    category: 'Pencocokan Shift & Operator',
    name: 'Isolasi Shift: Unit 4376 pada Shift 2 tidak mengambil dari Shift 1',
    expected: '— (NOT_FOUND)',
    actual: `${matchS2Missing.name} (${matchS2Missing.status})`,
    passed: matchS2Missing.status === 'NOT_FOUND' && matchS2Missing.name === '—',
  });

  // 6. Tes Identifikasi Sheet Tanggal & Pengurutan Kronologis
  const sampleSheetNames = [
    'Tabel Problem, Delay, Idle',
    'DROPDOWN LIST',
    'Template',
    'Rekap Bulanan',
    '01 OKT 2026',
    '02 OKTo 2026',
    '10 OKT 2026',
    '9 OKT 2026',
    '18 OKT 2026',
  ];

  const parsedValidDates = sampleSheetNames
    .map((name) => ({ name, parsed: parseOperationalDateFromSheetName(name) }))
    .filter((item): item is { name: string; parsed: NonNullable<typeof item.parsed> } => item.parsed !== null);

  const validNames = parsedValidDates.map((item) => item.name).join(', ');
  results.push({
    id: 'sheet-date-filter',
    category: 'Daftar Tanggal Google Sheets',
    name: 'Filter Sheet Operasional (abaikan DROPDOWN LIST, Template, Rekap)',
    expected: '01 OKT 2026, 02 OKTo 2026, 10 OKT 2026, 9 OKT 2026, 18 OKT 2026',
    actual: validNames,
    passed: validNames === '01 OKT 2026, 02 OKTo 2026, 10 OKT 2026, 9 OKT 2026, 18 OKT 2026',
  });

  // 6b. Urutkan secara kronologis (9 OKT sebelum 10 OKT, 10 OKT sebelum 18 OKT)
  const sortedDates = [...parsedValidDates].sort((a, b) => {
    const vA = a.parsed.year * 10000 + a.parsed.monthNum * 100 + a.parsed.day;
    const vB = b.parsed.year * 10000 + b.parsed.monthNum * 100 + b.parsed.day;
    return vA - vB;
  });
  const chronologicalDisplay = sortedDates.map((d) => d.parsed.display).join(' -> ');
  const expectedOrder = '01 Okt 2026 -> 02 Okt 2026 -> 09 Okt 2026 -> 10 Okt 2026 -> 18 Okt 2026';
  results.push({
    id: 'sheet-chronological-sort',
    category: 'Daftar Tanggal Google Sheets',
    name: 'Urutan Kronologis Sheet Tanggal (bukan alfabet)',
    expected: expectedOrder,
    actual: chronologicalDisplay,
    passed: chronologicalDisplay === expectedOrder,
  });

  // 7. Tes Layout Kolom Export PNG & Penanganan Nama Operator Panjang
  const widthsDefault = calculateExportColumnWidths([], '1');
  const opColDefault = widthsDefault[3];
  results.push({
    id: 'export-png-col-width-default',
    category: 'Export PNG & Layout Tabel',
    name: 'Lebar Kolom Nama Operator Default (Col 3 >= 165px)',
    expected: '>= 165px',
    actual: `${opColDefault}px`,
    passed: opColDefault >= 165,
  });

  // Uji dengan nama operator panjang: "MUHAMMAD SYAHRUL RAMADHAN"
  const sampleLongOpRecords: OperatorRecord[] = [
    {
      unit: '4514',
      name: 'MUHAMMAD SYAHRUL RAMADHAN',
      loader: 'EX1233',
      shift: 'S04',
      sourceRow: 5,
    },
  ];
  const widthsWithLongName = calculateExportColumnWidths(sampleLongOpRecords, '1');
  const opColLong = widthsWithLongName[3];
  results.push({
    id: 'export-png-col-width-long-name',
    category: 'Export PNG & Layout Tabel',
    name: 'Penyesuaian Lebar Kolom Operator untuk Nama Panjang (Col 3 >= 165px)',
    expected: '>= 165px',
    actual: `${opColLong}px`,
    passed: opColLong >= 165 && opColLong <= 220,
  });

  // Uji total 13 kolom: semua lebar bernilai positif dan konsisten
  const allPositive = widthsWithLongName.length === 13 && widthsWithLongName.every((w) => w > 0);
  results.push({
    id: 'export-png-13-cols-valid',
    category: 'Export PNG & Layout Tabel',
    name: 'Validasi 13 Kolom Simetris (semua lebar kolom > 0)',
    expected: '13 kolom valid',
    actual: `${widthsWithLongName.length} kolom (${widthsWithLongName.reduce((a, b) => a + b, 0)}px total)`,
    passed: allPositive,
  });

  // 8. Tes Isolasi Spreadsheet & Pemetaan PIT (PIT 11, PIT 12, JUMBANG)
  const pit11Id = PIT_SHEET_CONFIGS['PIT 11']?.spreadsheetId;
  const pit12Id = PIT_SHEET_CONFIGS['PIT 12']?.spreadsheetId;
  const jumbangId = PIT_SHEET_CONFIGS['JUMBANG']?.spreadsheetId;

  const allPitsDistinct = Boolean(
    pit11Id &&
    pit12Id &&
    jumbangId &&
    pit11Id !== pit12Id &&
    pit11Id !== jumbangId &&
    pit12Id !== jumbangId
  );

  results.push({
    id: 'pit-spreadsheet-isolation',
    category: 'Daftar Tanggal Google Sheets',
    name: 'Isolasi Spreadsheet PIT (PIT 11, PIT 12, JUMBANG terpisah mandiri)',
    expected: '3 spreadsheet berbeda & valid',
    actual: allPitsDistinct
      ? `PIT 11 (${pit11Id.slice(0, 8)}...), PIT 12 (${pit12Id.slice(0, 8)}...), JUMBANG (${jumbangId.slice(0, 8)}...)`
      : 'Spreadsheet ID bentrok/tidak lengkap',
    passed: allPitsDistinct,
  });

  return results;
}
