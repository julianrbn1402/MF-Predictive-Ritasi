import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Copy,
  Trash2,
  Check,
  Plus,
  X,
  AlertTriangle,
  BookmarkPlus,
} from 'lucide-react';
import {
  LoaderCalculationResult,
  MasterLoader,
  VhmsRow,
} from '../types';
import {
  normalizeDtInputList,
  normalizeLoaderKey,
} from '../utils/formulas';

interface DtAssignmentPanelProps {
  pit: string;
  pitLoaders: MasterLoader[];
  allLoaders: MasterLoader[];
  calcResults: LoaderCalculationResult[];
  vhmsRows: VhmsRow[];
  assignments: Record<string, string[]>;
  onUpdateLoaderAssignment: (loaderId: string, units: string[]) => void;
  onUpdateBulkAssignments: (newAssignments: Record<string, string[]>) => void;
  onUpdateLoaderConfig: (loaderId: string, patch: Partial<MasterLoader>) => void;
  onCopyFromPreviousHour: () => void;
  onClearPitAssignments: (pit: string) => void;
  onSaveSnapshot: () => void;
  hasPreviousCarryoverBanner: boolean;
  onDismissCarryoverBanner: () => void;
}

interface UnrecognizedPasteLine {
  rawLoaderName: string;
  units: string[];
  mappedLoaderId: string; // '' means skip
}

export const DtAssignmentPanel: React.FC<DtAssignmentPanelProps> = ({
  pit,
  pitLoaders,
  allLoaders,
  calcResults,
  vhmsRows,
  assignments,
  onUpdateLoaderAssignment,
  onUpdateBulkAssignments,
  onUpdateLoaderConfig,
  onCopyFromPreviousHour,
  onClearPitAssignments,
  onSaveSnapshot,
  hasPreviousCarryoverBanner,
  onDismissCarryoverBanner,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [inputDrafts, setInputDrafts] = useState<Record<string, string>>({});
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [unrecognizedLines, setUnrecognizedLines] = useState<UnrecognizedPasteLine[]>([]);
  const [pendingRecognizedMap, setPendingRecognizedMap] = useState<Record<string, string[]>>({});
  const [selectedTargetLoaderId, setSelectedTargetLoaderId] = useState<string>(
    pitLoaders[0]?.id || ''
  );

  // Semua DT yang sudah ditugaskan di loader mana pun
  const allAssignedUnits = new Set<string>();
  Object.values(assignments).forEach((list) => {
    list.forEach((u) => allAssignedUnits.add(u.toUpperCase()));
  });

  // DT yang ada di data VHMS pit ini tetapi belum ditugaskan ke loader mana pun
  const unassignedPitDts = vhmsRows.filter(
    (r) =>
      r.location.trim().toUpperCase() === pit.trim().toUpperCase() &&
      !allAssignedUnits.has(r.unit.toUpperCase())
  );

  const handleAddInputTokens = (loaderId: string, rawVal: string) => {
    const newTokens = normalizeDtInputList(rawVal);
    if (newTokens.length === 0) return;
    const existing = assignments[loaderId] || [];
    const combined = normalizeDtInputList([...existing, ...newTokens]);
    onUpdateLoaderAssignment(loaderId, combined);
    setInputDrafts((prev) => ({ ...prev, [loaderId]: '' }));
  };

  const handleRemoveDt = (loaderId: string, unitToRemove: string) => {
    const existing = assignments[loaderId] || [];
    onUpdateLoaderAssignment(
      loaderId,
      existing.filter((u) => u !== unitToRemove)
    );
  };

  const handleAssignUnassignedDt = (unit: string) => {
    const targetId = selectedTargetLoaderId || pitLoaders[0]?.id;
    if (!targetId) return;
    const existing = assignments[targetId] || [];
    const combined = normalizeDtInputList([...existing, unit]);
    onUpdateLoaderAssignment(targetId, combined);
  };

  const handleProcessBulkPaste = () => {
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const recognized: Record<string, string[]> = {};
    const unrecognized: UnrecognizedPasteLine[] = [];

    for (const line of lines) {
      // Contoh format: "EX 1217: 4553 4233 4457 5460" atau "EX1217 = 4553, 4233" atau tab
      let loaderPart = '';
      let dtPart = '';

      if (line.includes(':')) {
        const idx = line.indexOf(':');
        loaderPart = line.slice(0, idx).trim();
        dtPart = line.slice(idx + 1).trim();
      } else if (line.includes('\t')) {
        const idx = line.indexOf('\t');
        loaderPart = line.slice(0, idx).trim();
        dtPart = line.slice(idx + 1).trim();
      } else {
        // Coba cocokkan awalan "EX ####"
        const m = line.match(/^(EX\s*\d+|\S+)\s+(.*)$/i);
        if (m) {
          loaderPart = m[1].trim();
          dtPart = m[2].trim();
        }
      }

      if (!loaderPart) continue;
      const units = normalizeDtInputList(dtPart);
      const normKey = normalizeLoaderKey(loaderPart);

      const matchedLoader = allLoaders.find(
        (l) => normalizeLoaderKey(l.name) === normKey
      );

      if (matchedLoader) {
        recognized[matchedLoader.id] = units;
      } else {
        unrecognized.push({
          rawLoaderName: loaderPart,
          units,
          mappedLoaderId: '',
        });
      }
    }

    if (unrecognized.length === 0) {
      onUpdateBulkAssignments({ ...assignments, ...recognized });
      setShowBulkModal(false);
      setBulkText('');
    } else {
      setPendingRecognizedMap(recognized);
      setUnrecognizedLines(unrecognized);
    }
  };

  const handleConfirmUnrecognizedMapping = () => {
    const finalMap: Record<string, string[]> = {
      ...assignments,
      ...pendingRecognizedMap,
    };
    for (const item of unrecognizedLines) {
      if (item.mappedLoaderId) {
        finalMap[item.mappedLoaderId] = item.units;
      }
    }
    onUpdateBulkAssignments(finalMap);
    setUnrecognizedLines([]);
    setPendingRecognizedMap({});
    setShowBulkModal(false);
    setBulkText('');
  };

  return (
    <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-lg overflow-hidden">
      {/* Banner kuning draf jam sebelumnya */}
      {hasPreviousCarryoverBanner && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Penugasan DT dari jam sebelumnya dipakai. Periksa perubahan sebelum menyimpan laporan.
            </span>
          </div>
          <button
            type="button"
            onClick={onDismissCarryoverBanner}
            className="px-3 py-1 text-xs font-semibold bg-amber-500 text-slate-950 rounded hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Sudah diperiksa
          </button>
        </div>
      )}

      {/* Header Panel Penugasan DT */}
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-2 text-left font-semibold text-sm text-slate-900 dark:text-slate-100 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
          >
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            )}
            <span>Penugasan DT per Jam — {pit}</span>
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            · {pitLoaders.length} Loader · {unassignedPitDts.length} DT belum ditugaskan
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setUnrecognizedLines([]);
              setShowBulkModal(true);
            }}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            Tempel banyak
          </button>
          <button
            type="button"
            onClick={onCopyFromPreviousHour}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            Salin dari jam sebelumnya
          </button>
          <button
            type="button"
            onClick={() => onClearPitAssignments(pit)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Kosongkan semua
          </button>
          <button
            type="button"
            onClick={onSaveSnapshot}
            className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            Simpan Snapshot Jam Ini
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4 space-y-4">
          {/* Daftar Baris per Loader */}
          <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-md">
            {pitLoaders.map((loader) => {
              const calc = calcResults.find((c) => c.loader.id === loader.id);
              const dtValidations = calc?.dtValidations || [];
              const draft = inputDrafts[loader.id] || '';

              return (
                <div
                  key={loader.id}
                  className="p-3 flex flex-col lg:flex-row lg:items-center gap-3 bg-white dark:bg-slate-950/50"
                >
                  {/* Identitas Loader & Parameter Jam */}
                  <div className="lg:w-64 shrink-0 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {loader.name}
                      </span>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        {loader.egi} · Status: {loader.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <label className="flex items-center gap-1">
                        <span>WH:</span>
                        <input
                          type="number"
                          min={0}
                          max={60}
                          value={loader.wh}
                          onChange={(e) =>
                            onUpdateLoaderConfig(loader.id, {
                              wh: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-12 px-1.5 py-0.5 font-mono text-xs bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-right text-slate-900 dark:text-slate-100"
                        />
                      </label>
                      <label className="flex items-center gap-1">
                        <span>Delay:</span>
                        <input
                          type="number"
                          min={0}
                          max={60}
                          value={loader.delay}
                          onChange={(e) =>
                            onUpdateLoaderConfig(loader.id, {
                              delay: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-12 px-1.5 py-0.5 font-mono text-xs bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-right text-slate-900 dark:text-slate-100"
                        />
                      </label>
                      <label
                        className="flex items-center gap-1"
                        title="Kosongkan untuk memakai jumlah DT yang diinput"
                      >
                        <span>nHD Ovr:</span>
                        <input
                          type="number"
                          min={0}
                          placeholder={String(dtValidations.length)}
                          value={
                            loader.overrideNHdActual !== null &&
                            loader.overrideNHdActual !== undefined
                              ? loader.overrideNHdActual
                              : ''
                          }
                          onChange={(e) => {
                            const val = e.target.value.trim();
                            onUpdateLoaderConfig(loader.id, {
                              overrideNHdActual:
                                val === '' ? null : Math.max(0, Number(val)),
                            });
                          }}
                          className="w-12 px-1.5 py-0.5 font-mono text-xs bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-right text-slate-900 dark:text-slate-100"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Tag-Input Nomor DT & Validasi */}
                  <div className="flex-1 flex flex-wrap items-center gap-1.5">
                    {dtValidations.length === 0 && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 italic mr-2">
                        Belum ada DT — ketik nomor DT lalu tekan Enter atau Koma
                      </span>
                    )}

                    {dtValidations.map((v) => {
                      const isMissing = !v.foundInVhms;
                      const isDuplicate = v.duplicateLoaders.length > 0;

                      let borderColor =
                        'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200';
                      if (isMissing) {
                        borderColor =
                          'border-rose-500/60 bg-rose-500/10 text-rose-700 dark:text-rose-300';
                      } else if (isDuplicate) {
                        borderColor =
                          'border-amber-500/60 bg-amber-500/10 text-amber-800 dark:text-amber-300';
                      }

                      const warnings: string[] = [];
                      if (isMissing) warnings.push('tidak ada di VHMS');
                      if (isDuplicate)
                        warnings.push(`dobel (${v.duplicateLoaders.join(', ')})`);
                      if (v.differentPit)
                        warnings.push(`lokasi VHMS: ${v.differentPit}`);
                      if (v.smallSample && v.vhmsRow)
                        warnings.push(`sampel kecil (RIT ${v.vhmsRow.rit})`);

                      return (
                        <div
                          key={v.unit}
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-mono ${borderColor}`}
                        >
                          <span className="font-semibold">{v.unit}</span>
                          {warnings.length > 0 && (
                            <span className="text-[11px] font-sans opacity-90">
                              [{warnings.join(' · ')}]
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveDt(loader.id, v.unit)}
                            className="hover:opacity-75 p-0.5"
                            title={`Hapus ${v.unit}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}

                    {/* Input Tambah DT */}
                    <div className="inline-flex items-center gap-1 min-w-[200px] flex-1">
                      <input
                        type="text"
                        value={draft}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/[,;\n]/.test(val)) {
                            handleAddInputTokens(loader.id, val);
                          } else {
                            setInputDrafts((prev) => ({
                              ...prev,
                              [loader.id]: val,
                            }));
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddInputTokens(loader.id, draft);
                          } else if (
                            e.key === 'Backspace' &&
                            draft === '' &&
                            dtValidations.length > 0
                          ) {
                            handleRemoveDt(
                              loader.id,
                              dtValidations[dtValidations.length - 1].unit
                            );
                          }
                        }}
                        onBlur={() => {
                          if (draft.trim()) {
                            handleAddInputTokens(loader.id, draft);
                          }
                        }}
                        placeholder="Ketik 4553, DT4233..."
                        className="w-full px-2.5 py-1 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:border-amber-500 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Panel DT Belum Ditugaskan di Pit Ini */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  DT di VHMS {pit} yang belum ditugaskan ({unassignedPitDts.length}):
                </span>
                {unassignedPitDts.length === 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Semua DT di {pit} sudah ditugaskan ke loader.
                  </span>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400">
                    Klik nomor DT untuk langsung menambahkan ke loader tujuan:
                  </span>
                )}
              </div>

              {unassignedPitDts.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {unassignedPitDts.map((dt) => (
                    <button
                      key={dt.unit}
                      type="button"
                      onClick={() => handleAssignUnassignedDt(dt.unit)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                      title={`Tambahkan ${dt.unit} (Jarak ${dt.jarakKm ?? '-'} km, RIT ${dt.rit ?? '-'}) ke loader terpilih`}
                    >
                      <Plus className="w-3 h-3" />
                      <span>{dt.unit}</span>
                      {dt.rit !== null && dt.rit < 3 && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400">
                          (RIT {dt.rit})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {unassignedPitDts.length > 0 && pitLoaders.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Ke Loader:
                </span>
                <select
                  value={selectedTargetLoaderId || pitLoaders[0]?.id || ''}
                  onChange={(e) => setSelectedTargetLoaderId(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                >
                  {pitLoaders.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Tempel Banyak Penugasan DT */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-xl w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">
                Tempel Banyak Penugasan DT
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {unrecognizedLines.length === 0 ? (
              <>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Tempel satu baris per loader. Nama loader dicocokkan otomatis tanpa
                  memedulikan spasi atau huruf besar/kecil (contoh:{' '}
                  <code className="font-mono text-amber-600 dark:text-amber-400">
                    EX1217
                  </code>{' '}
                  ={' '}
                  <code className="font-mono text-amber-600 dark:text-amber-400">
                    EX 1217
                  </code>
                  ).
                </p>
                <textarea
                  rows={7}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`EX 1217: 5886 5430 4515\nEX 1169: 4553 4233 4457 5460 4812\nEX 1204: 3795, 4477, 4901`}
                  className="w-full p-3 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:border-amber-500 text-slate-900 dark:text-slate-100"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleProcessBulkPaste}
                    className="px-4 py-2 text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded"
                  >
                    Terapkan Penugasan
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-800 dark:text-amber-300">
                  Beberapa nama loader pada teks tempelan tidak dikenali di Master Loader.
                  Pilih loader tujuan atau lewati baris tersebut:
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {unrecognizedLines.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-2.5 border border-slate-200 dark:border-slate-800 rounded text-xs"
                    >
                      <div>
                        <div className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {item.rawLoaderName}
                        </div>
                        <div className="font-mono text-slate-500">
                          DT: {item.units.join(', ') || '-'}
                        </div>
                      </div>
                      <select
                        value={item.mappedLoaderId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setUnrecognizedLines((prev) =>
                            prev.map((u, i) =>
                              i === idx ? { ...u, mappedLoaderId: val } : u
                            )
                          );
                        }}
                        className="px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded"
                      >
                        <option value="">-- Lewati baris ini --</option>
                        {allLoaders.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name} ({l.pit})
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setUnrecognizedLines([])}
                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                  >
                    Kembali Edit Teks
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmUnrecognizedMapping}
                    className="px-4 py-2 text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded"
                  >
                    Simpan Pemetaan
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
