import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  Download,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  Calendar,
  RefreshCw,
  Pickaxe,
} from 'lucide-react';
import {
  ColumnMapping,
  GlobalParams,
  KonversiJarakRow,
  KonversiSanitizeResult,
  MasterLoader,
  VhmsMetadata,
  VhmsRow,
} from './types';
import { SEED_KONVERSI_JARAK } from './data/konversiJarak';
import {
  DEFAULT_GLOBAL_PARAMS,
  DEFAULT_MASTER_LOADERS,
  SAMPLE_ASSIGNMENTS,
  SAMPLE_VHMS_METADATA,
  SAMPLE_VHMS_ROWS,
} from './data/sampleData';
import { calculateAllLoaders } from './utils/formulas';
import { parseVhmsWorkbook } from './utils/excelParser';
import { exportOutputTablesToPng } from './utils/exportPng';
import { SpreadsheetOutputView } from './components/SpreadsheetOutputView';
import { VhmsRawTab } from './components/VhmsRawTab';
import { SettingsTab } from './components/SettingsTab';
import {
  fetchOperatorsFromGoogleSheets,
  parseLocalMonitoringFile,
  parseOperationalDate,
  OperatorRecord,
  ParsedOperationalDate,
  ShiftOption,
  AvailableDateSheet,
  DEFAULT_PIT_DATES,
  fetchAvailableDatesForPit,
} from './utils/operatorService';

const STORAGE_KEYS = {
  PARAMS: 'mf_aria_params_v2',
  LOADERS: 'mf_aria_loaders_v2',
  KONVERSI: 'mf_aria_konversi_v2',
  VHMS_META: 'mf_aria_vhms_meta_v2',
  VHMS_ROWS: 'mf_aria_vhms_rows_v2',
  ASSIGNMENTS: 'mf_aria_assignments_v2',
  SHIFT: 'mf_aria_shift_v2',
  PIT_DATES: 'mf_aria_pit_dates_v2',
};

const EMPTY_VHMS_METADATA: VhmsMetadata = {
  fileName: 'Belum ada file VHMS',
  sheetName: '-',
  availableSheets: [],
  companyJobsite: 'PT. PAMAPERSADA NUSANTARA / Jobsite ARIA - Kalimantan Selatan',
  rawDateText: '',
  parsedDateDisplay: '-',
  rawHoursText: '',
  hours: [],
  hoursLabel: '-',
  latestUpdatedDisplay: '-',
  totalRows: 0,
  pitCounts: {},
  missingRequiredColumns: [],
  headerRow1Index: 6,
  headerRow2Index: 7,
  detectedColumns: [],
  columnMapping: {},
  rawNoteText: '',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

type ActiveTab = 'output' | 'vhms' | 'settings';

export default function App() {
  const [params, setParams] = useState<GlobalParams>(() =>
    loadFromStorage(STORAGE_KEYS.PARAMS, DEFAULT_GLOBAL_PARAMS)
  );
  const [loaders, setLoaders] = useState<MasterLoader[]>(() =>
    loadFromStorage(STORAGE_KEYS.LOADERS, DEFAULT_MASTER_LOADERS)
  );
  const [konversiTable, setKonversiTable] = useState<KonversiJarakRow[]>(() =>
    loadFromStorage(STORAGE_KEYS.KONVERSI, SEED_KONVERSI_JARAK)
  );
  const [konversiWarnings, setKonversiWarnings] = useState<string[]>([]);

  const [vhmsMetadata, setVhmsMetadata] = useState<VhmsMetadata>(() =>
    loadFromStorage(STORAGE_KEYS.VHMS_META, SAMPLE_VHMS_METADATA)
  );
  const [vhmsRows, setVhmsRows] = useState<VhmsRow[]>(() =>
    loadFromStorage(STORAGE_KEYS.VHMS_ROWS, SAMPLE_VHMS_ROWS)
  );
  const [assignments, setAssignments] = useState<Record<string, string[]>>(() =>
    loadFromStorage(STORAGE_KEYS.ASSIGNMENTS, SAMPLE_ASSIGNMENTS)
  );

  const [activeWorkbook, setActiveWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('output');
  const [activePit, setActivePit] = useState<string>('PIT 11');
  const [activeShift, setActiveShift] = useState<ShiftOption>(() =>
    loadFromStorage(STORAGE_KEYS.SHIFT, '1')
  );

  const [pitDatesMap, setPitDatesMap] = useState<Record<string, AvailableDateSheet[]>>(() =>
    loadFromStorage(STORAGE_KEYS.PIT_DATES, DEFAULT_PIT_DATES)
  );
  const [isDatesRefreshing, setIsDatesRefreshing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PARAMS, JSON.stringify(params));
  }, [params]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOADERS, JSON.stringify(loaders));
  }, [loaders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.KONVERSI, JSON.stringify(konversiTable));
  }, [konversiTable]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VHMS_META, JSON.stringify(vhmsMetadata));
  }, [vhmsMetadata]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VHMS_ROWS, JSON.stringify(vhmsRows));
  }, [vhmsRows]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHIFT, JSON.stringify(activeShift));
  }, [activeShift]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PIT_DATES, JSON.stringify(pitDatesMap));
  }, [pitDatesMap]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  const detectedPits = useMemo(() => {
    const pitSet = new Set<string>();
    loaders.forEach((l) => {
      if (l.pit) pitSet.add(l.pit.trim().toUpperCase());
    });
    Object.keys(vhmsMetadata.pitCounts || {}).forEach((p) => {
      if (p && p !== 'TANPA PIT') pitSet.add(p.trim().toUpperCase());
    });
    const arr = Array.from(pitSet);
    return arr.length > 0 ? arr : ['PIT 11', 'PIT 12', 'JUMBANG'];
  }, [loaders, vhmsMetadata.pitCounts]);

  const currentPit = detectedPits.includes(activePit)
    ? activePit
    : detectedPits[0] || 'PIT 11';

  const allCalcResults = useMemo(() => {
    return calculateAllLoaders(
      loaders,
      assignments,
      vhmsRows,
      konversiTable,
      params
    );
  }, [loaders, assignments, vhmsRows, konversiTable, params]);

  const currentPitCalcResults = useMemo(() => {
    return allCalcResults.filter(
      (c) => c.loader.pit.trim().toUpperCase() === currentPit
    );
  }, [allCalcResults, currentPit]);

  const loaderNamesById = useMemo(() => {
    const map: Record<string, string> = {};
    loaders.forEach((l) => {
      map[l.id] = l.name;
    });
    return map;
  }, [loaders]);

  // Tanggal Operasional (diambil otomatis dari nama file Excel VHMS atau header teks)
  const operationalDate = useMemo(() => {
    return parseOperationalDate(
      vhmsMetadata.fileName,
      vhmsMetadata.rawDateText || vhmsMetadata.parsedDateDisplay
    );
  }, [vhmsMetadata.fileName, vhmsMetadata.rawDateText, vhmsMetadata.parsedDateDisplay]);

  const [selectedDateOverride, setSelectedDateOverride] = useState<ParsedOperationalDate | null>(null);
  const activeOperationalDate = selectedDateOverride || operationalDate;

  // Daftar sheet tanggal aktual untuk PIT aktif saat ini (tidak dicampur dengan PIT lain)
  const currentPitDates = useMemo(() => {
    return pitDatesMap[currentPit] || DEFAULT_PIT_DATES[currentPit] || [];
  }, [pitDatesMap, currentPit]);

  // Handler Refresh Tanggal aktual dari Google Sheets (hanya diperbarui ketika tombol ditekan)
  const handleRefreshDates = useCallback(async () => {
    setIsDatesRefreshing(true);
    try {
      const res = await fetchAvailableDatesForPit(currentPit);
      if (res.success && res.dates.length > 0) {
        setPitDatesMap((prev) => ({
          ...prev,
          [currentPit]: res.dates,
        }));
        showToast(
          `Daftar tanggal ${currentPit} diperbarui (${res.dates.length} sheet operasional ditemukan).`
        );
      } else {
        // Pertahankan daftar tanggal sebelumnya jika refresh gagal (Requirement 10)
        showToast(
          `Gagal refresh tanggal ${currentPit}: ${res.error || res.message || 'Koneksi terganggu'}. Daftar tanggal sebelumnya tetap dipertahankan.`
        );
      }
    } catch (err) {
      showToast(
        `Gagal refresh tanggal ${currentPit}: ${
          err instanceof Error ? err.message : String(err)
        }. Daftar tanggal sebelumnya tetap dipertahankan.`
      );
    } finally {
      setIsDatesRefreshing(false);
    }
  }, [currentPit]);

  // State Data Operator per PIT & Tanggal
  const [operatorRecords, setOperatorRecords] = useState<OperatorRecord[]>([]);
  const [isOperatorsLoading, setIsOperatorsLoading] = useState<boolean>(false);
  const [operatorStatus, setOperatorStatus] = useState<{
    success: boolean;
    message?: string;
    source: 'google_sheets' | 'local_file';
    dateKey: string;
  }>({
    success: true,
    message: 'Memuat data operator...',
    source: 'google_sheets',
    dateKey: '-',
  });

  // Fungsi memuat data operator dari Google Sheets sesuai PIT aktif dan Tanggal
  const loadOperators = useCallback(
    async (
      pitToLoad: string,
      dateToLoad: ParsedOperationalDate | null,
      force = false
    ) => {
      if (!dateToLoad) {
        setOperatorRecords([]);
        setOperatorStatus({
          success: false,
          message: 'Tanggal operasional tidak terdeteksi dari nama file VHMS.',
          source: 'google_sheets',
          dateKey: '-',
        });
        return;
      }

      setIsOperatorsLoading(true);
      // Bersihkan data operator PIT sebelumnya seketika agar tidak tertinggal atau tercampur
      setOperatorRecords([]);

      // Cari apakah ada GID yang cocok dari daftar sheet tanggal PIT ini
      const matchingDateSheet = (pitDatesMap[pitToLoad] || DEFAULT_PIT_DATES[pitToLoad] || []).find(
        (d) =>
          d.parsedDate.day === dateToLoad.day &&
          d.parsedDate.monthNum === dateToLoad.monthNum &&
          d.parsedDate.year === dateToLoad.year
      );
      const knownGid = matchingDateSheet?.gid;

      try {
        const res = await fetchOperatorsFromGoogleSheets(
          pitToLoad,
          dateToLoad,
          force,
          knownGid
        );
        setOperatorRecords(res.records);
        setOperatorStatus({
          success: res.success,
          message: res.message,
          source: res.source,
          dateKey: res.dateKey,
        });
      } catch (err) {
        setOperatorRecords([]);
        setOperatorStatus({
          success: false,
          message: `Gagal mengakses Google Sheets ${pitToLoad}: ${
            err instanceof Error ? err.message : String(err)
          }`,
          source: 'google_sheets',
          dateKey: dateToLoad.display,
        });
      } finally {
        setIsOperatorsLoading(false);
      }
    },
    [pitDatesMap]
  );

  // Otomatis sinkronkan operator setiap kali PIT aktif atau Tanggal operasional berubah
  useEffect(() => {
    loadOperators(currentPit, activeOperationalDate);
  }, [currentPit, activeOperationalDate, loadOperators]);

  const handleUploadLocalMonitoring = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const { records, sheetName } = parseLocalMonitoringFile(
          workbook,
          activeOperationalDate
        );
        if (records.length === 0) {
          showToast(`File monitoring "${file.name}" tidak memiliki data operator.`);
          return;
        }
        setOperatorRecords(records);
        setOperatorStatus({
          success: true,
          message: `Berhasil memuat ${records.length} data operator dari file ${file.name} (Sheet: ${sheetName})`,
          source: 'local_file',
          dateKey: activeOperationalDate?.display || '-',
        });
        showToast(`Memuat ${records.length} operator dari file lokal "${file.name}".`);
      } catch {
        showToast('Gagal membaca file monitoring lokal.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const processUploadedFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        setActiveWorkbook(workbook);

        const parsed = parseVhmsWorkbook(workbook, file.name);
        setVhmsMetadata(parsed.metadata);
        setVhmsRows(parsed.rows);
        // Reset tanggal override agar otomatis mengikuti nama file baru
        setSelectedDateOverride(null);
        setActiveTab('output');
        showToast(
          `File "${file.name}" berhasil dimuat (${parsed.rows.length} DT, ${parsed.metadata.hoursLabel}).`
        );
      } catch {
        showToast('Gagal membaca file Excel. Pastikan format .xlsx / .xls valid.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
    e.target.value = '';
  };

  const handleChangeSheet = (sheetName: string) => {
    if (!activeWorkbook) return;
    const parsed = parseVhmsWorkbook(
      activeWorkbook,
      vhmsMetadata.fileName,
      sheetName
    );
    setVhmsMetadata(parsed.metadata);
    setVhmsRows(parsed.rows);
  };

  const handleApplyCustomColumnMapping = (customMapping: ColumnMapping) => {
    if (activeWorkbook) {
      const parsed = parseVhmsWorkbook(
        activeWorkbook,
        vhmsMetadata.fileName,
        vhmsMetadata.sheetName,
        customMapping
      );
      setVhmsMetadata(parsed.metadata);
      setVhmsRows(parsed.rows);
      showToast('Pemetaan kolom diperbarui.');
    } else {
      setVhmsMetadata((prev) => ({
        ...prev,
        columnMapping: customMapping,
        missingRequiredColumns: [],
      }));
    }
  };

  // Tombol Reset: mengosongkan seluruh data VHMS dan penugasan DT
  const handleResetAllData = () => {
    setActiveWorkbook(null);
    setVhmsMetadata(EMPTY_VHMS_METADATA);
    setVhmsRows([]);
    setAssignments({});
    setSelectedDateOverride(null);
    setOperatorRecords([]);
    setActiveShift('1');
    setPitDatesMap(DEFAULT_PIT_DATES);
    setLoaders((prev) =>
      prev.map((l) => ({
        ...l,
        overrideNHdActual: null,
      }))
    );
    setActiveTab('output');
    showToast('Semua data berhasil dikosongkan.');
  };

  const handleExportPng = async () => {
    await exportOutputTablesToPng({
      pit: currentPit,
      pitCalcResults: currentPitCalcResults,
      vhmsRows,
      params,
      assignments,
      metadata: vhmsMetadata,
      operatorRecords,
      activeShift,
      operationalDate: activeOperationalDate,
    });
    showToast(`Tabel Output MF (${currentPit}) berhasil diunduh sebagai PNG.`);
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingFile(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDraggingFile(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingFile(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processUploadedFile(file);
      }}
    >
      {/* Overlay Drag & Drop */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-6 pointer-events-none">
          <div className="border-2 border-dashed border-amber-500 bg-slate-900/90 rounded-xl p-10 text-center space-y-2 max-w-md">
            <Upload className="w-10 h-10 text-amber-400 mx-auto" />
            <div className="text-base font-bold text-white">
              Lepaskan File Excel RAW VHMS di Sini
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 z-50 bg-amber-500 text-slate-950 px-4 py-2.5 rounded-lg shadow-lg flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="text-center sm:text-left">{toastMessage}</span>
        </div>
      )}

      {/* TOP BAR / HEADER (Sistem Grid Simetris, Modern & Responsif) */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="max-w-[1140px] mx-auto px-3 sm:px-6">
          {/* Tampilan Desktop (>= 1024px): 1 Baris Sejajar & Simetris */}
          <div className="hidden lg:flex items-center justify-between gap-4 h-14">
            {/* 1. Brand & Portal Autonomia */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <Pickaxe className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <a
                  href="#top"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('output');
                  }}
                  className="text-sm font-bold tracking-tight text-white font-display hover:text-amber-400 transition-colors leading-none"
                >
                  MF Predictive Ritasi
                </a>
                <a
                  href="https://operational-excellence-aria.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-semibold italic text-amber-400/90 hover:text-amber-300 transition-colors flex items-center gap-0.5 leading-none mt-1"
                  title="Buka portal Autonomia! di tab baru"
                >
                  <span>part of Autonomia!</span>
                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                </a>
              </div>
            </div>

            {/* 2. Navigasi Tab Utama (Tengah Simetris) */}
            <nav className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('output')}
                className={`h-8 px-3.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer flex items-center ${
                  activeTab === 'output'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                Tabel Output MF
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('vhms')}
                className={`h-8 px-3.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'vhms'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>Data VHMS</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    activeTab === 'vhms'
                      ? 'bg-slate-950/20 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {vhmsRows.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`h-8 px-3.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer flex items-center ${
                  activeTab === 'settings'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                Pengaturan
              </button>
              <a
                href="https://operational-excellence-aria.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 px-3 text-xs font-bold text-amber-400 hover:text-amber-300 hover:bg-slate-800/60 rounded-md transition-colors whitespace-nowrap inline-flex items-center gap-1"
                title="Buka portal Autonomia! di tab baru"
              >
                <span>Autonomia!</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </nav>

            {/* 3. Kelompok Tombol Aksi Global (Kanan) */}
            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-8.5 px-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                title="Unggah file spreadsheet raw VHMS (.xlsx / .xls)"
              >
                <Upload className="w-3.5 h-3.5 shrink-0" />
                <span>Upload VHMS</span>
              </button>

              <button
                type="button"
                onClick={handleExportPng}
                className="h-8.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs rounded-lg border border-slate-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Unduh seluruh tabel dalam format gambar PNG berkualitas tinggi"
              >
                <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Export PNG</span>
              </button>

              <button
                type="button"
                onClick={handleResetAllData}
                className="h-8.5 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 font-semibold text-xs rounded-lg border border-rose-500/30 inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                title="Reset seluruh data ke kondisi awal"
              >
                <RotateCcw className="w-3 h-3 shrink-0" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Tampilan Mobile & Tablet (< 1024px): 2 Baris Simetris & Proporsional */}
          <div className="flex lg:hidden flex-col gap-2.5 py-2.5">
            {/* Baris 1: Brand di Kiri + Aksi Cepat di Kanan */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <Pickaxe className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white truncate font-display leading-tight">
                    MF Predictive Ritasi
                  </span>
                  <a
                    href="https://operational-excellence-aria.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-semibold italic text-amber-400/90 truncate flex items-center gap-0.5 leading-tight"
                  >
                    <span>Autonomia!</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  </a>
                </div>
              </div>

              {/* Tombol Aksi Mobile yang Rapi & Sejajar */}
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 px-2.5 text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
                  title="Upload VHMS"
                >
                  <Upload className="w-3 h-3 shrink-0" />
                  <span>Upload</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPng}
                  className="h-8 px-2.5 text-xs font-semibold bg-slate-800 text-slate-100 hover:bg-slate-700 rounded-md transition-colors inline-flex items-center gap-1 border border-slate-700 cursor-pointer"
                  title="Export PNG"
                >
                  <Download className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>PNG</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetAllData}
                  className="h-8 px-2 text-xs font-semibold bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 rounded-md border border-rose-500/30 inline-flex items-center cursor-pointer"
                  title="Reset Data"
                >
                  <RotateCcw className="w-3 h-3 shrink-0" />
                </button>
              </div>
            </div>

            {/* Baris 2: Navigasi Tab (Grid 4 Kolom Simetris) */}
            <nav className="grid grid-cols-4 gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-center">
              <button
                type="button"
                onClick={() => setActiveTab('output')}
                className={`h-8 text-[11px] sm:text-xs font-semibold rounded-md transition-colors flex items-center justify-center cursor-pointer ${
                  activeTab === 'output'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Output MF
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('vhms')}
                className={`h-8 text-[11px] sm:text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'vhms'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>VHMS</span>
                <span className="text-[10px] opacity-75 font-mono">({vhmsRows.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`h-8 text-[11px] sm:text-xs font-semibold rounded-md transition-colors flex items-center justify-center cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Pengaturan
              </button>
              <a
                href="https://operational-excellence-aria.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 text-[11px] sm:text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center justify-center gap-0.5 transition-colors"
                title="Buka Autonomia! di tab baru"
              >
                <span>Portal</span>
                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* SUB-BAR KONTROL OPERASIONAL: PIT + TANGGAL + SHIFT + REFRESH TANGGAL (Sejajar & Logis) */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-3 sm:px-6 py-2.5">
        <div className="max-w-[1140px] mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
          {/* Kelompok Kontrol Utama: PIT + Tanggal + Shift disusun sejajar secara logis */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            {/* 1. Pemilihan PIT */}
            <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
              <div
                className="grid gap-1 w-full sm:w-auto sm:flex sm:items-center"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(4, Math.max(1, detectedPits.length))}, minmax(0, 1fr))`,
                }}
              >
                {detectedPits.map((pitName) => (
                  <button
                    key={pitName}
                    type="button"
                    onClick={() => {
                      setActivePit(pitName);
                      setActiveTab('output');
                    }}
                    className={`h-8 px-3 text-xs font-mono font-bold rounded-md text-center transition-colors cursor-pointer ${
                      currentPit === pitName && activeTab === 'output'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    {pitName}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Pemilihan Tanggal Sheet Operasional & Tombol Refresh Tanggal */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1 pl-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-[11px] text-slate-400 font-medium shrink-0">Sheet:</span>
              </div>
              {currentPitDates.length > 0 ? (
                <select
                  value={
                    activeOperationalDate
                      ? `${activeOperationalDate.year}-${String(activeOperationalDate.monthNum).padStart(2, '0')}-${String(activeOperationalDate.day).padStart(2, '0')}`
                      : currentPitDates[0]
                      ? `${currentPitDates[0].parsedDate.year}-${String(currentPitDates[0].parsedDate.monthNum).padStart(2, '0')}-${String(currentPitDates[0].parsedDate.day).padStart(2, '0')}`
                      : ''
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    const selected = currentPitDates.find((item) => {
                      const k = `${item.parsedDate.year}-${String(item.parsedDate.monthNum).padStart(2, '0')}-${String(item.parsedDate.day).padStart(2, '0')}`;
                      return k === val;
                    });
                    if (selected) {
                      setSelectedDateOverride(selected.parsedDate);
                      showToast(`Sheet tanggal diganti ke ${selected.parsedDate.display}.`);
                    }
                  }}
                  className="bg-slate-900 text-sky-300 font-mono font-bold text-xs h-8 px-2 rounded-md border border-slate-700/80 focus:outline-none focus:border-sky-500 cursor-pointer max-w-[130px] sm:max-w-none"
                  title={`Pilih tanggal operasional dari Google Sheets ${currentPit}`}
                >
                  {currentPitDates.map((item) => {
                    const valKey = `${item.parsedDate.year}-${String(item.parsedDate.monthNum).padStart(2, '0')}-${String(item.parsedDate.day).padStart(2, '0')}`;
                    return (
                      <option key={`${item.sheetName}_${item.gid}`} value={valKey}>
                        {item.parsedDate.display}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <span className="text-[11px] text-amber-300 italic px-1.5">Daftar kosong</span>
              )}

              {/* Tombol Refresh Tanggal */}
              <button
                type="button"
                onClick={handleRefreshDates}
                disabled={isDatesRefreshing}
                className="h-8 px-2.5 text-[11px] font-semibold bg-sky-950/70 hover:bg-sky-900/90 text-sky-300 border border-sky-700/70 rounded-md transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                title={`Perbarui daftar sheet tanggal dari Google Sheets ${currentPit}`}
              >
                <RefreshCw
                  className={`w-3 h-3 text-sky-400 shrink-0 ${
                    isDatesRefreshing ? 'animate-spin' : ''
                  }`}
                />
                <span className="hidden sm:inline">Refresh Tanggal</span>
                <span className="sm:hidden">Refresh</span>
              </button>
            </div>

            {/* 3. Pemilihan Shift (Shift 1 = S04, Shift 2 = S05) */}
            <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
              <div className="grid grid-cols-2 gap-1 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setActiveShift('1');
                    showToast('Shift diubah ke Shift 1 (S04)');
                  }}
                  className={`h-8 px-2.5 text-xs font-mono font-bold rounded-md transition-colors cursor-pointer text-center ${
                    activeShift === '1'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                  title="Pilih Shift 1 (Kode baris S04)"
                >
                  Shift 1 (S04)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveShift('2');
                    showToast('Shift diubah ke Shift 2 (S05)');
                  }}
                  className={`h-8 px-2.5 text-xs font-mono font-bold rounded-md transition-colors cursor-pointer text-center ${
                    activeShift === '2'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                  title="Pilih Shift 2 (Kode baris S05)"
                >
                  Shift 2 (S05)
                </button>
              </div>
            </div>
          </div>

          {/* Sisi Kanan: Metadata File Aktif */}
          <div className="flex items-center justify-between lg:justify-end gap-2 text-xs text-slate-400 font-mono py-0.5">
            <span
              className="truncate max-w-[280px] sm:max-w-md"
              title={`${vhmsMetadata.fileName} · ${vhmsMetadata.hoursLabel} · Data per ${vhmsMetadata.latestUpdatedDisplay}`}
            >
              {vhmsMetadata.fileName} · {vhmsMetadata.hoursLabel} · Data per{' '}
              {vhmsMetadata.latestUpdatedDisplay}
            </span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-[1140px] w-full mx-auto px-2.5 sm:px-6 py-3 sm:py-4">
        {activeTab === 'output' && (
          <SpreadsheetOutputView
            pit={currentPit}
            pitCalcResults={currentPitCalcResults}
            allLoaders={loaders}
            vhmsRows={vhmsRows}
            params={params}
            assignments={assignments}
            onUpdateLoaderAssignment={(loaderId, units) => {
              setAssignments((prev) => ({ ...prev, [loaderId]: units }));
            }}
            onUpdateBulkAssignments={(newMap) => {
              setAssignments(newMap);
              showToast('Daftar DT berhasil diperbarui.');
            }}
            onUpdateLoaderConfig={(loaderId, patch) => {
              setLoaders((prev) =>
                prev.map((l) => (l.id === loaderId ? { ...l, ...patch } : l))
              );
            }}
            operationalDate={activeOperationalDate}
            onDateChange={(newDate) => {
              setSelectedDateOverride(newDate);
              showToast(`Sheet tanggal diganti ke ${newDate.display}.`);
            }}
            activeShift={activeShift}
            onShiftChange={(s) => {
              setActiveShift(s);
              showToast(`Shift diganti ke Shift ${s} (${s === '2' ? 'S05' : 'S04'}).`);
            }}
            operatorRecords={operatorRecords}
            isOperatorsLoading={isOperatorsLoading}
            operatorStatus={operatorStatus}
            onRefreshOperators={() =>
              loadOperators(currentPit, activeOperationalDate, true)
            }
            onUploadLocalMonitoring={handleUploadLocalMonitoring}
            availableDates={currentPitDates}
            isDatesRefreshing={isDatesRefreshing}
            onRefreshDates={handleRefreshDates}
          />
        )}

        {activeTab === 'vhms' && (
          <VhmsRawTab
            metadata={vhmsMetadata}
            rows={vhmsRows}
            assignments={assignments}
            loaderNamesById={loaderNamesById}
            onChangeSheet={handleChangeSheet}
            onApplyCustomColumnMapping={handleApplyCustomColumnMapping}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            params={params}
            onUpdateParams={(newP) => {
              setParams(newP);
              showToast('Parameter diperbarui.');
            }}
            loaders={loaders}
            onUpdateLoaders={setLoaders}
            konversiTable={konversiTable}
            konversiWarnings={konversiWarnings}
            onApplyKonversiTable={(res: KonversiSanitizeResult) => {
              setKonversiTable(res.rows);
              setKonversiWarnings(res.warnings);
              showToast(`Tabel konversi diperbarui (${res.rows.length} baris).`);
            }}
          />
        )}
      </main>
    </div>
  );
}
