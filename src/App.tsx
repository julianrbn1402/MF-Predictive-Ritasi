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
        <div className="fixed bottom-5 right-5 z-50 bg-amber-500 text-slate-950 px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP BAR (3 Zones: Brand | Nav | Actions) */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 py-2.5 bg-slate-900 border-b border-slate-800">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('output');
          }}
          className="text-base font-bold tracking-tight text-white font-display whitespace-nowrap"
        >
          MF Predictive Ritasi
        </a>

        <nav className="flex items-center gap-5 text-xs font-medium text-slate-400">
          <button
            type="button"
            onClick={() => setActiveTab('output')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'output'
                ? 'text-amber-400 font-semibold underline underline-offset-8 decoration-2'
                : 'hover:text-white'
            }`}
          >
            Tabel Output MF
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vhms')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'vhms'
                ? 'text-amber-400 font-semibold underline underline-offset-8 decoration-2'
                : 'hover:text-white'
            }`}
          >
            Data VHMS ({vhmsRows.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'settings'
                ? 'text-amber-400 font-semibold underline underline-offset-8 decoration-2'
                : 'hover:text-white'
            }`}
          >
            Pengaturan Loader
          </button>
        </nav>

        <div className="flex items-center gap-2">
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
      </header>

      {/* Sub-bar Semboyan, Pilihan Pit & Info File */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-4 lg:px-6 py-2.5">
        <div className="max-w-[1140px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
              <span className="text-xs font-bold text-slate-200">
                MF Predictive Ritasi
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs font-semibold italic text-amber-400">
                part of Autonomia!
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {detectedPits.map((pitName) => (
                <button
                  key={pitName}
                  type="button"
                  onClick={() => {
                    setActivePit(pitName);
                    setActiveTab('output');
                  }}
                  className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition-colors cursor-pointer ${
                    currentPit === pitName && activeTab === 'output'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {pitName}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
            <span>
              {vhmsMetadata.fileName} · {vhmsMetadata.hoursLabel} · Data per{' '}
              {vhmsMetadata.latestUpdatedDisplay}
            </span>
            <button
              type="button"
              onClick={handleResetAllData}
              className="px-3 py-1 text-xs font-sans font-medium bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 rounded-md border border-rose-500/30 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-[1140px] w-full mx-auto px-3 lg:px-6 py-4">
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
