import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Upload,
  ClipboardPaste,
  Download,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';
import {
  GlobalParams,
  KonversiJarakRow,
  KonversiSanitizeResult,
  MasterLoader,
} from '../types';
import {
  SEED_KONVERSI_JARAK,
  parseKonversiText,
  sanitizeKonversiTable,
} from '../data/konversiJarak';
import { DEFAULT_GLOBAL_PARAMS, DEFAULT_MASTER_LOADERS } from '../data/sampleData';
import { parseKonversiFromWorkbook } from '../utils/excelParser';
import { formatIdNumber } from '../utils/formulas';

interface SettingsTabProps {
  params: GlobalParams;
  onUpdateParams: (newParams: GlobalParams) => void;
  loaders: MasterLoader[];
  onUpdateLoaders: (newLoaders: MasterLoader[]) => void;
  konversiTable: KonversiJarakRow[];
  konversiWarnings: string[];
  onApplyKonversiTable: (res: KonversiSanitizeResult) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  params,
  onUpdateParams,
  loaders,
  onUpdateLoaders,
  konversiTable,
  konversiWarnings,
  onApplyKonversiTable,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'params' | 'loaders' | 'konversi'>(
    'params'
  );

  // State tambah loader baru
  const [newLoaderPit, setNewLoaderPit] = useState('PIT 12');
  const [newLoaderName, setNewLoaderName] = useState('');
  const [newLoaderEgi, setNewLoaderEgi] = useState('PC1250SP8');
  const [newLoaderProdty, setNewLoaderProdty] = useState(540);
  const [newLoaderStatus, setNewLoaderStatus] = useState('ON');
  const [newLoaderNote, setNewLoaderNote] = useState('');

  // State pengelolaan tabel konversi
  const [konvSearch, setKonvSearch] = useState('');
  const [newJarakM, setNewJarakM] = useState('');
  const [newKonversiVal, setNewKonversiVal] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pendingSanitizePreview, setPendingSanitizePreview] =
    useState<KonversiSanitizeResult | null>(null);

  // State import Excel konversi
  const [excelWorkbook, setExcelWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [excelSheetName, setExcelSheetName] = useState('');
  const [excelColJarak, setExcelColJarak] = useState('U');
  const [excelColKonv, setExcelColKonv] = useState('W');
  const [excelStartRow, setExcelStartRow] = useState(3);

  const excelInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // Tambah Loader Baru
  const handleAddLoader = () => {
    if (!newLoaderName.trim()) return;
    const newItem: MasterLoader = {
      id: `ldr-${Date.now()}`,
      pit: newLoaderPit.trim().toUpperCase() || 'PIT 12',
      name: newLoaderName.trim().toUpperCase(),
      egi: newLoaderEgi.trim() || 'PC1250SP8',
      planProdtyLoader: Number(newLoaderProdty) || 540,
      status: newLoaderStatus.trim() || 'ON',
      repairPriorityNote: newLoaderNote.trim(),
      wh: params.defaultWh,
      delay: params.defaultDelay,
      overrideNHdActual: null,
    };
    onUpdateLoaders([...loaders, newItem]);
    setNewLoaderName('');
    setNewLoaderNote('');
  };

  const handleMoveLoaderOrder = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= loaders.length) return;
    const copy = [...loaders];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    onUpdateLoaders(copy);
  };

  const handleDeleteLoader = (id: string) => {
    onUpdateLoaders(loaders.filter((l) => l.id !== id));
  };

  // Edit baris konversi
  const handleEditKonversiRow = (
    index: number,
    field: 'jarakM' | 'konversi',
    rawVal: string
  ) => {
    const num = Number(rawVal.replace(',', '.'));
    if (!Number.isFinite(num) || num <= 0) return;
    const updated = konversiTable.map((row, i) =>
      i === index ? { ...row, [field]: num } : row
    );
    onApplyKonversiTable(sanitizeKonversiTable(updated));
  };

  const handleAddKonversiRow = () => {
    const j = Number(newJarakM.replace(',', '.'));
    const k = Number(newKonversiVal.replace(',', '.'));
    if (!Number.isFinite(j) || !Number.isFinite(k) || j <= 0 || k <= 0) return;
    const updated = [...konversiTable, { jarakM: j, konversi: k }];
    onApplyKonversiTable(sanitizeKonversiTable(updated));
    setNewJarakM('');
    setNewKonversiVal('');
  };

  const handleDeleteKonversiRow = (jarakM: number) => {
    const updated = konversiTable.filter((r) => r.jarakM !== jarakM);
    onApplyKonversiTable(sanitizeKonversiTable(updated));
  };

  // Export & Import JSON Konfigurasi
  const handleExportConfigJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      params,
      loaders,
      konversiTable,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Konfigurasi_MF_Predictive_Ritasi_ARIA.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportConfigJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result));
        if (parsed.params) onUpdateParams({ ...DEFAULT_GLOBAL_PARAMS, ...parsed.params });
        if (Array.isArray(parsed.loaders)) onUpdateLoaders(parsed.loaders);
        if (Array.isArray(parsed.konversiTable)) {
          onApplyKonversiTable(sanitizeKonversiTable(parsed.konversiTable));
        }
      } catch {
        // Ignore invalid JSON
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Import CSV Konversi
  const handleImportCsvKonversi = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result || '');
      const sanitized = parseKonversiText(text);
      setPendingSanitizePreview(sanitized);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Import Excel Konversi (FIX RUMUS U:W)
  const handleImportExcelKonversiFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      setExcelWorkbook(wb);
      const defaultSheet =
        wb.SheetNames.find((n) => n.toUpperCase().includes('FIX RUMUS')) ||
        wb.SheetNames[0];
      setExcelSheetName(defaultSheet);
      const res = parseKonversiFromWorkbook(wb, defaultSheet, 'U', 'W', 3);
      setPendingSanitizePreview(res);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const filteredKonversi = konversiTable.filter((r) => {
    if (!konvSearch.trim()) return true;
    return (
      String(r.jarakM).includes(konvSearch.trim()) ||
      String(r.konversi).includes(konvSearch.trim())
    );
  });

  return (
    <div className="space-y-6">
      {/* Sub-Navigasi Pengaturan & Tombol Backup JSON */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveSubTab('params')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeSubTab === 'params'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            4B. Parameter Global
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('loaders')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeSubTab === 'loaders'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            4C. Master Loader per Pit ({loaders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('konversi')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeSubTab === 'konversi'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            4A. Tabel Konversi Jarak ({konversiTable.length} baris)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json"
            onChange={handleImportConfigJson}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => jsonInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            Import Konfigurasi JSON
          </button>
          <button
            type="button"
            onClick={handleExportConfigJson}
            className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export Konfigurasi JSON
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: PARAMETER GLOBAL (4B) */}
      {activeSubTab === 'params' && (
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-lg p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Parameter Global Perhitungan Match Factor & Konversi
              </h3>
              <p className="text-xs text-slate-500">
                Semua perubahan langsung tersimpan di browser dan menghitung ulang
                seluruh Pit.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onUpdateParams(DEFAULT_GLOBAL_PARAMS)}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded hover:opacity-80 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Parameter Default
            </button>
          </div>

          {/* Peringatan jika Plan Prodty Hauler != Konstanta Produktivitas CT Plan */}
          {params.planProdtyHauler !== params.ctPlanProdtyConst && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Perhatian Perbedaan Parameter Produktivitas Hauler:</strong> Nilai{' '}
                <em>Plan Prodty Hauler</em> ({params.planProdtyHauler} ton/jam, dipakai
                pada rumus Plan Kebutuhan HD) berbeda dengan{' '}
                <em>Konstanta Produktivitas CT Plan</em> ({params.ctPlanProdtyConst}{' '}
                ton/jam, dipakai pada rumus CT Plan = 60 / ((Konv ×{' '}
                {params.ctPlanProdtyConst}) / {params.payloadPerRit})). Di sheet Excel
                PIT 12/11 memakai 235 vs 231, sedangkan di Jumbang/sheet lama keduanya
                231.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Plan Prodty Hauler (ton/jam)
              </label>
              <input
                type="number"
                step="1"
                value={params.planProdtyHauler}
                onChange={(e) =>
                  onUpdateParams({
                    ...params,
                    planProdtyHauler: Number(e.target.value) || 235,
                  })
                }
                className="w-full px-3 py-2 font-mono text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
              />
              <p className="text-[11px] text-slate-500">
                Default: 235 ton/jam (atau 231 ton/jam pada sheet Jumbang).
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Konstanta Produktivitas CT Plan (ton/jam)
              </label>
              <input
                type="number"
                step="1"
                value={params.ctPlanProdtyConst}
                onChange={(e) =>
                  onUpdateParams({
                    ...params,
                    ctPlanProdtyConst: Number(e.target.value) || 231,
                  })
                }
                className="w-full px-3 py-2 font-mono text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
              />
              <p className="text-[11px] text-slate-500">
                Default: 231 ton/jam (dipakai pada rumus CT Plan = 60 / ((Konv × 231) /
                41)).
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Payload per Ritase (ton)
              </label>
              <input
                type="number"
                step="0.5"
                value={params.payloadPerRit}
                onChange={(e) =>
                  onUpdateParams({
                    ...params,
                    payloadPerRit: Number(e.target.value) || 41,
                  })
                }
                className="w-full px-3 py-2 font-mono text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
              />
              <p className="text-[11px] text-slate-500">
                Default: 41 ton (dipakai pada CT Plan & Review MF).
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Plan Serving Time (menit)
              </label>
              <input
                type="number"
                step="0.01"
                value={params.planServingTime}
                onChange={(e) =>
                  onUpdateParams({
                    ...params,
                    planServingTime: Number(e.target.value) || 3.73,
                  })
                }
                className="w-full px-3 py-2 font-mono text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
              />
              <p className="text-[11px] text-slate-500">Default: 3,73 menit.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Ambang Batas Bawah MF (Potensi Gantung)
              </label>
              <input
                type="number"
                step="0.005"
                value={params.mfLowerThreshold}
                onChange={(e) =>
                  onUpdateParams({
                    ...params,
                    mfLowerThreshold: Number(e.target.value) || 0.895,
                  })
                }
                className="w-full px-3 py-2 font-mono text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
              />
              <p className="text-[11px] text-slate-500">
                Default: 0,895 (MF &lt; 0,895 selalu Potensi Gantung).
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Ambang Batas Atas MF (Potensi Antri)
              </label>
              <input
                type="number"
                step="0.005"
                value={params.mfUpperThreshold}
                onChange={(e) =>
                  onUpdateParams({
                    ...params,
                    mfUpperThreshold: Number(e.target.value) || 1.005,
                  })
                }
                className="w-full px-3 py-2 font-mono text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
              />
              <p className="text-[11px] text-slate-500">
                Default: 1,005 (MF &ge; 1,005 = Potensi Antri).
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-start gap-3 p-3 border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <input
                type="checkbox"
                checked={params.weightedByRit}
                onChange={(e) =>
                  onUpdateParams({ ...params, weightedByRit: e.target.checked })
                }
                className="mt-0.5 rounded border-slate-400 text-amber-500 focus:ring-amber-500"
              />
              <div className="text-xs">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  Gunakan Rata-rata Berbobot RIT (Weighted Average)
                </div>
                <p className="text-slate-500 mt-0.5">
                  Default MATI (memakai AVERAGE sederhana antar DT agar identik dengan
                  rumus Excel).
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <input
                type="checkbox"
                checked={params.includeNonOnInPriority}
                onChange={(e) =>
                  onUpdateParams({
                    ...params,
                    includeNonOnInPriority: e.target.checked,
                  })
                }
                className="mt-0.5 rounded border-slate-400 text-amber-500 focus:ring-amber-500"
              />
              <div className="text-xs">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  Ikutkan Loader Selain Status "ON" dalam Peringkat Priority (P1, P2...)
                </div>
                <p className="text-slate-500 mt-0.5">
                  Default AKTIF (sesuai perilaku fungsi SORT pada Excel).
                </p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: MASTER LOADER PER PIT (4C) */}
      {activeSubTab === 'loaders' && (
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-lg p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Master Loader per Pit (Konfigurasi Tetap)
              </h3>
              <p className="text-xs text-slate-500">
                Tambah, ubah pit, urutkan, atau atur target produktivitas loader. Daftar
                penugasan DT diinput terpisah tiap jam.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onUpdateLoaders(DEFAULT_MASTER_LOADERS)}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded hover:opacity-80 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Master Loader Default
            </button>
          </div>

          {/* Form Tambah Loader */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Pit
              </label>
              <input
                type="text"
                value={newLoaderPit}
                onChange={(e) => setNewLoaderPit(e.target.value)}
                placeholder="PIT 12"
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Nama Loader
              </label>
              <input
                type="text"
                value={newLoaderName}
                onChange={(e) => setNewLoaderName(e.target.value)}
                placeholder="EX 1217"
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                EGI
              </label>
              <input
                type="text"
                value={newLoaderEgi}
                onChange={(e) => setNewLoaderEgi(e.target.value)}
                placeholder="PC1250SP8"
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Plan Prodty (t/j)
              </label>
              <input
                type="number"
                value={newLoaderProdty}
                onChange={(e) => setNewLoaderProdty(Number(e.target.value) || 540)}
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Status / Catatan
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newLoaderStatus}
                  onChange={(e) => setNewLoaderStatus(e.target.value)}
                  placeholder="ON"
                  className="w-14 px-2 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                />
                <input
                  type="text"
                  value={newLoaderNote}
                  onChange={(e) => setNewLoaderNote(e.target.value)}
                  placeholder="Jalan & Disposal"
                  className="flex-1 px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddLoader}
              className="px-4 py-1.5 text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded flex items-center justify-center gap-1.5 h-[30px]"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Loader
            </button>
          </div>

          {/* Tabel Master Loader */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-500 font-sans">
                  <th className="py-2.5 px-3">Urutan</th>
                  <th className="py-2.5 px-3">Pit</th>
                  <th className="py-2.5 px-3">Nama Loader</th>
                  <th className="py-2.5 px-3">EGI</th>
                  <th className="py-2.5 px-3 text-right">Plan Prodty (t/j)</th>
                  <th className="py-2.5 px-3">Status (ON/CC)</th>
                  <th className="py-2.5 px-3">Catatan Prioritas Perbaikan</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loaders.map((l, idx) => (
                  <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveLoaderOrder(idx, -1)}
                          disabled={idx === 0}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveLoaderOrder(idx, 1)}
                          disabled={idx === loaders.length - 1}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={l.pit}
                        onChange={(e) =>
                          onUpdateLoaders(
                            loaders.map((item) =>
                              item.id === l.id
                                ? { ...item, pit: e.target.value.toUpperCase() }
                                : item
                            )
                          )
                        }
                        className="w-24 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={l.name}
                        onChange={(e) =>
                          onUpdateLoaders(
                            loaders.map((item) =>
                              item.id === l.id ? { ...item, name: e.target.value } : item
                            )
                          )
                        }
                        className="w-28 px-2 py-1 font-bold bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={l.egi}
                        onChange={(e) =>
                          onUpdateLoaders(
                            loaders.map((item) =>
                              item.id === l.id ? { ...item, egi: e.target.value } : item
                            )
                          )
                        }
                        className="w-28 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        value={l.planProdtyLoader}
                        onChange={(e) =>
                          onUpdateLoaders(
                            loaders.map((item) =>
                              item.id === l.id
                                ? {
                                    ...item,
                                    planProdtyLoader: Number(e.target.value) || 540,
                                  }
                                : item
                            )
                          )
                        }
                        className="w-20 px-2 py-1 text-right bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={l.status}
                        onChange={(e) =>
                          onUpdateLoaders(
                            loaders.map((item) =>
                              item.id === l.id ? { ...item, status: e.target.value } : item
                            )
                          )
                        }
                        className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded"
                      />
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <input
                        type="text"
                        value={l.repairPriorityNote}
                        onChange={(e) =>
                          onUpdateLoaders(
                            loaders.map((item) =>
                              item.id === l.id
                                ? { ...item, repairPriorityNote: e.target.value }
                                : item
                            )
                          )
                        }
                        className="w-full min-w-[180px] px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteLoader(l.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded"
                        title="Hapus loader"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: TABEL KONVERSI JARAK (4A) */}
      {activeSubTab === 'konversi' && (
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-lg p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Tabel Konversi Jarak (Approximate Match / VLOOKUP TRUE)
              </h3>
              <p className="text-xs text-slate-500">
                Total {konversiTable.length} baris aktif. Setiap perubahan disanitasi
                otomatis (dedup, urut menaik, cek celah &gt; 100 m &amp; lonjakan
                konversi).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcelKonversiFile}
                className="hidden"
              />
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleImportCsvKonversi}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => excelInputRef.current?.click()}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                Import dari Excel (FIX RUMUS)
              </button>

              <button
                type="button"
                onClick={() => setShowPasteModal(true)}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded flex items-center gap-1.5"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                Tempel dari Clipboard
              </button>

              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                Import CSV
              </button>

              <button
                type="button"
                onClick={() =>
                  onApplyKonversiTable(sanitizeKonversiTable(SEED_KONVERSI_JARAK))
                }
                className="px-3 py-1.5 text-xs font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 rounded flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset ke Data Awal (302 Baris)
              </button>
            </div>
          </div>

          {/* Peringatan Sanitasi Tabel Saat Ini */}
          {konversiWarnings.length > 0 && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-1 text-xs text-amber-800 dark:text-amber-300">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Peringatan Sanitasi Tabel Konversi ({konversiWarnings.length}):</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 pl-1">
                {konversiWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Bar Cari & Tambah Baris Konversi */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              type="text"
              value={konvSearch}
              onChange={(e) => setKonvSearch(e.target.value)}
              placeholder="Cari jarak (m) atau konversi..."
              className="px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded w-64"
            />

            <div className="flex items-center gap-2">
              <input
                type="number"
                value={newJarakM}
                onChange={(e) => setNewJarakM(e.target.value)}
                placeholder="Jarak (m)..."
                className="w-28 px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded"
              />
              <input
                type="number"
                step="0.001"
                value={newKonversiVal}
                onChange={(e) => setNewKonversiVal(e.target.value)}
                placeholder="Konversi..."
                className="w-28 px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded"
              />
              <button
                type="button"
                onClick={handleAddKonversiRow}
                className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah / Update Baris
              </button>
            </div>
          </div>

          {/* Tabel Konversi Jarak */}
          <div className="max-h-96 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-md">
            <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-sans">
                <tr>
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3 text-right">Jarak (m)</th>
                  <th className="py-2 px-3 text-right">Jarak (km) = Jarak(m)/1000</th>
                  <th className="py-2 px-3 text-right">Konversi</th>
                  <th className="py-2 px-3 text-right">Hapus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredKonversi.map((row, idx) => (
                  <tr
                    key={row.jarakM}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="py-1.5 px-3 text-slate-400">{idx + 1}</td>
                    <td className="py-1.5 px-3 text-right">
                      <input
                        type="number"
                        defaultValue={row.jarakM}
                        onBlur={(e) =>
                          handleEditKonversiRow(idx, 'jarakM', e.target.value)
                        }
                        className="w-24 px-2 py-0.5 text-right bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-amber-500 rounded"
                      />
                    </td>
                    <td className="py-1.5 px-3 text-right text-slate-500">
                      {formatIdNumber(row.jarakM / 1000, 3)} km
                    </td>
                    <td className="py-1.5 px-3 text-right">
                      <input
                        type="number"
                        step="0.001"
                        defaultValue={row.konversi}
                        onBlur={(e) =>
                          handleEditKonversiRow(idx, 'konversi', e.target.value)
                        }
                        className="w-24 px-2 py-0.5 text-right font-semibold text-amber-600 dark:text-amber-400 bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-amber-500 rounded"
                      />
                    </td>
                    <td className="py-1.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteKonversiRow(row.jarakM)}
                        className="p-1 text-rose-500 hover:bg-rose-500/10 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Tempel Tabel Konversi dari Clipboard */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-xl w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">
                Tempel Tabel Konversi dari Clipboard
              </h3>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Format yang didukung: dipisah Tab, Titik Koma, atau Koma (
              <code>jarak_m, jarak_km, konversi</code> atau{' '}
              <code>jarak_m, konversi</code>). Kolom "SITE"/"ARIA" dan koma desimal
              dikenali otomatis.
            </p>
            <textarea
              rows={8}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={`50\t0,05\t3,292\n100\t0,1\t2,64\n150\t0,15\t2,294`}
              className="w-full p-3 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const res = parseKonversiText(pasteText);
                  setPendingSanitizePreview(res);
                  setShowPasteModal(false);
                }}
                className="px-4 py-2 text-xs font-semibold bg-amber-500 text-slate-950 rounded"
              >
                Pratinjau & Sanitasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pratinjau & Konfirmasi Sebelum Menerapkan Tabel Konversi Hasil Import/Tempel */}
      {pendingSanitizePreview && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-xl w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">
                Pratinjau Sanitasi Tabel Konversi Jarak
              </h3>
              <button
                type="button"
                onClick={() => {
                  setPendingSanitizePreview(null);
                  setExcelWorkbook(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pilihan Sheet & Kolom jika berasal dari file Excel */}
            {excelWorkbook && (
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded space-y-2 text-xs">
                <div className="font-semibold text-slate-700 dark:text-slate-300">
                  Pengaturan Pembacaan Sheet Excel:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500">Sheet</label>
                    <select
                      value={excelSheetName}
                      onChange={(e) => {
                        const s = e.target.value;
                        setExcelSheetName(s);
                        setPendingSanitizePreview(
                          parseKonversiFromWorkbook(
                            excelWorkbook,
                            s,
                            excelColJarak,
                            excelColKonv,
                            excelStartRow
                          )
                        );
                      }}
                      className="w-full px-2 py-1 font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                    >
                      {excelWorkbook.SheetNames.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">
                      Kolom Jarak (m)
                    </label>
                    <input
                      type="text"
                      value={excelColJarak}
                      onChange={(e) => {
                        const c = e.target.value.toUpperCase();
                        setExcelColJarak(c);
                        if (c) {
                          setPendingSanitizePreview(
                            parseKonversiFromWorkbook(
                              excelWorkbook,
                              excelSheetName,
                              c,
                              excelColKonv,
                              excelStartRow
                            )
                          );
                        }
                      }}
                      className="w-full px-2 py-1 font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">
                      Kolom Konversi
                    </label>
                    <input
                      type="text"
                      value={excelColKonv}
                      onChange={(e) => {
                        const c = e.target.value.toUpperCase();
                        setExcelColKonv(c);
                        if (c) {
                          setPendingSanitizePreview(
                            parseKonversiFromWorkbook(
                              excelWorkbook,
                              excelSheetName,
                              excelColJarak,
                              c,
                              excelStartRow
                            )
                          );
                        }
                      }}
                      className="w-full px-2 py-1 font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">
                      Mulai Baris
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={excelStartRow}
                      onChange={(e) => {
                        const r = Number(e.target.value) || 3;
                        setExcelStartRow(r);
                        setPendingSanitizePreview(
                          parseKonversiFromWorkbook(
                            excelWorkbook,
                            excelSheetName,
                            excelColJarak,
                            excelColKonv,
                            r
                          )
                        );
                      }}
                      className="w-full px-2 py-1 font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded">
                <span className="text-slate-500 font-sans block">Baris Valid</span>
                <strong className="text-base text-emerald-600 dark:text-emerald-400">
                  {pendingSanitizePreview.rows.length} baris
                </strong>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded">
                <span className="text-slate-500 font-sans block">Duplikat Dihapus</span>
                <strong className="text-base text-slate-900 dark:text-slate-100">
                  {pendingSanitizePreview.duplicatesRemoved}
                </strong>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded">
                <span className="text-slate-500 font-sans block">Non-Angka Dihapus</span>
                <strong className="text-base text-slate-900 dark:text-slate-100">
                  {pendingSanitizePreview.invalidRemoved}
                </strong>
              </div>
            </div>

            {pendingSanitizePreview.warnings.length > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-800 dark:text-amber-300 max-h-40 overflow-y-auto space-y-1">
                <div className="font-semibold">
                  Peringatan Sanitasi ({pendingSanitizePreview.warnings.length}):
                </div>
                <ul className="list-disc list-inside space-y-0.5">
                  {pendingSanitizePreview.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPendingSanitizePreview(null);
                  setExcelWorkbook(null);
                }}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={pendingSanitizePreview.rows.length === 0}
                onClick={() => {
                  onApplyKonversiTable(pendingSanitizePreview);
                  setPendingSanitizePreview(null);
                  setExcelWorkbook(null);
                  setPasteText('');
                }}
                className="px-4 py-2 text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded flex items-center gap-1.5 disabled:opacity-40"
              >
                <Check className="w-3.5 h-3.5" />
                Konfirmasi & Terapkan ({pendingSanitizePreview.rows.length} Baris)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
