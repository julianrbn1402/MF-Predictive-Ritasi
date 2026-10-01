import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  Download,
  RotateCcw,
  CheckCircle2,
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

const STORAGE_KEYS = {
  PARAMS: 'mf_aria_params_v2',
  LOADERS: 'mf_aria_loaders_v2',
  KONVERSI: 'mf_aria_konversi_v2',
  VHMS_META: 'mf_aria_vhms_meta_v2',
  VHMS_ROWS: 'mf_aria_vhms_rows_v2',
  ASSIGNMENTS: 'mf_aria_assignments_v2',
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

      {/* TOP BAR (Responsif & Simetris untuk Mobile maupun Desktop) */}
      <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 px-3 sm:px-6 py-2.5">
        <div className="max-w-[1140px] mx-auto flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
          {/* Baris Atas Mobile / Zona Kiri & Kanan */}
          <div className="flex items-center justify-between gap-2">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('output');
              }}
              className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2 min-w-0"
            >
              <span className="text-sm sm:text-base font-bold tracking-tight text-white font-display truncate">
                MF Predictive Ritasi
              </span>
              <span className="text-[10px] sm:text-xs font-semibold italic text-amber-400 truncate">
                part of Autonomia!
              </span>
            </a>

            {/* Tombol Aksi Mobile (Sejajar & Simetris di Kanan Atas) */}
            <div className="flex md:hidden items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 text-[11px] font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-md transition-colors whitespace-nowrap flex items-center justify-center gap-1 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 shrink-0" />
                <span>Upload</span>
              </button>
              <button
                type="button"
                onClick={handleExportPng}
                className="px-2.5 py-1.5 text-[11px] font-semibold bg-slate-800 text-slate-100 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap flex items-center justify-center gap-1 border border-slate-700 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>PNG</span>
              </button>
            </div>
          </div>

          {/* Navigasi Tab: Grid 3 Kolom Simetris di Mobile, Inline di Desktop */}
          <nav className="grid grid-cols-3 gap-1 bg-slate-950/70 p-1 rounded-lg border border-slate-800 md:bg-transparent md:p-0 md:border-0 md:flex md:items-center md:gap-6 text-xs font-medium text-slate-400">
            <button
              type="button"
              onClick={() => setActiveTab('output')}
              className={`py-1.5 px-2 rounded-md md:rounded-none md:py-1 text-center transition-colors whitespace-nowrap cursor-pointer text-[11px] sm:text-xs ${
                activeTab === 'output'
                  ? 'bg-amber-500 text-slate-950 font-bold md:bg-transparent md:text-amber-400 md:font-semibold md:underline md:underline-offset-8 md:decoration-2'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Tabel Output MF
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('vhms')}
              className={`py-1.5 px-2 rounded-md md:rounded-none md:py-1 text-center transition-colors whitespace-nowrap cursor-pointer text-[11px] sm:text-xs ${
                activeTab === 'vhms'
                  ? 'bg-amber-500 text-slate-950 font-bold md:bg-transparent md:text-amber-400 md:font-semibold md:underline md:underline-offset-8 md:decoration-2'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Data VHMS ({vhmsRows.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`py-1.5 px-2 rounded-md md:rounded-none md:py-1 text-center transition-colors whitespace-nowrap cursor-pointer text-[11px] sm:text-xs ${
                activeTab === 'settings'
                  ? 'bg-amber-500 text-slate-950 font-bold md:bg-transparent md:text-amber-400 md:font-semibold md:underline md:underline-offset-8 md:decoration-2'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Pengaturan
            </button>
          </nav>

          {/* Tombol Aksi Desktop */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
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
              className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload VHMS</span>
            </button>

            <button
              type="button"
              onClick={handleExportPng}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-800 text-slate-100 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export PNG</span>
            </button>
          </div>
        </div>
      </header>

      {/* Sub-bar Pilihan Pit, Info File & Tombol Reset (Simetris di Mobile & Desktop) */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-3 sm:px-6 py-2.5">
        <div className="max-w-[1140px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          {/* Pilihan Pit: Grid Simetris Rata Lebar di Mobile */}
          <div
            className="grid gap-1.5 w-full sm:w-auto sm:flex sm:items-center"
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
                className={`px-3 py-1.5 sm:py-1 text-xs font-mono font-bold rounded-md text-center transition-colors cursor-pointer ${
                  currentPit === pitName && activeTab === 'output'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {pitName}
              </button>
            ))}
          </div>

          {/* Info File & Tombol Reset */}
          <div className="flex items-center justify-between sm:justify-end gap-2 text-[11px] sm:text-xs text-slate-400 font-mono bg-slate-900/80 sm:bg-transparent px-2.5 py-1.5 sm:p-0 rounded-md border border-slate-800/80 sm:border-0">
            <span className="truncate">
              {vhmsMetadata.fileName} · {vhmsMetadata.hoursLabel} · Data per{' '}
              {vhmsMetadata.latestUpdatedDisplay}
            </span>
            <button
              type="button"
              onClick={handleResetAllData}
              className="px-2.5 py-1 text-[11px] sm:text-xs font-sans font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 rounded-md border border-rose-500/30 inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
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
