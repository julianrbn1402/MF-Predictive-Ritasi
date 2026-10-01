import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  AlertTriangle,
  Download,
  ArrowUpDown,
  X,
} from 'lucide-react';
import {
  ColumnMapping,
  VhmsFieldKey,
  VhmsMetadata,
  VhmsRow,
} from '../types';
import {
  VHMS_FIELD_LABELS,
  downloadSampleRawVhmsExcel,
} from '../utils/excelParser';
import {
  formatIdNumber,
  formatMinutes,
} from '../utils/formulas';

interface VhmsRawTabProps {
  metadata: VhmsMetadata;
  rows: VhmsRow[];
  assignments: Record<string, string[]>;
  loaderNamesById: Record<string, string>;
  onChangeSheet: (sheetName: string) => void;
  onApplyCustomColumnMapping: (mapping: ColumnMapping) => void;
}

type RawSortKey =
  | 'location'
  | 'unit'
  | 'rit'
  | 'jarakKm'
  | 'ctActual'
  | 'ltActual'
  | 'travelActual'
  | 'speedAvgActual'
  | 'prodtyActual';

export const VhmsRawTab: React.FC<VhmsRawTabProps> = ({
  metadata,
  rows,
  assignments,
  loaderNamesById,
  onChangeSheet,
  onApplyCustomColumnMapping,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPit, setSelectedPit] = useState('ALL');
  const [filterSmallSample, setFilterSmallSample] = useState(false);
  const [filterInconsistent, setFilterInconsistent] = useState(false);
  const [sortKey, setSortKey] = useState<RawSortKey>('location');
  const [sortAsc, setSortAsc] = useState(true);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [draftMapping, setDraftMapping] = useState<ColumnMapping>(
    metadata.columnMapping
  );

  // Peta DT -> daftar nama loader yang menggunakannya
  const dtToLoaders = useMemo(() => {
    const map = new Map<string, string[]>();
    Object.entries(assignments).forEach(([loaderId, units]) => {
      const lName = loaderNamesById[loaderId] || loaderId;
      units.forEach((u) => {
        const key = u.toUpperCase();
        const arr = map.get(key) || [];
        arr.push(lName);
        map.set(key, arr);
      });
    });
    return map;
  }, [assignments, loaderNamesById]);

  const pits = Object.keys(metadata.pitCounts);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toUpperCase();
    const list = rows.filter((r) => {
      if (selectedPit !== 'ALL' && r.location !== selectedPit) return false;
      if (q && !r.unit.toUpperCase().includes(q) && !r.location.toUpperCase().includes(q)) {
        return false;
      }
      if (filterSmallSample && !(r.rit !== null && r.rit < 3)) return false;
      if (filterInconsistent && !r.consistencyWarning) return false;
      return true;
    });

    list.sort((a, b) => {
      const vA = a[sortKey] ?? -1;
      const vB = b[sortKey] ?? -1;
      if (typeof vA === 'string' && typeof vB === 'string') {
        return sortAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
      }
      return sortAsc ? Number(vA) - Number(vB) : Number(vB) - Number(vA);
    });

    return list;
  }, [
    rows,
    selectedPit,
    searchQuery,
    filterSmallSample,
    filterInconsistent,
    sortKey,
    sortAsc,
  ]);

  const handleSort = (key: RawSortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const countInconsistent = rows.filter((r) => r.consistencyWarning !== null).length;
  const countSmallSample = rows.filter((r) => r.rit !== null && r.rit < 3).length;

  return (
    <div className="space-y-6">
      {/* Peringatan jika kolom wajib tidak ditemukan */}
      {metadata.missingRequiredColumns.length > 0 && (
        <div className="p-4 bg-rose-500/15 border border-rose-500/40 rounded-lg flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300 font-medium">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>
              Kolom wajib belum ditemukan secara otomatis:{' '}
              <strong>{metadata.missingRequiredColumns.join(', ')}</strong>. Gunakan
              layar Pemetaan Kolom untuk memilih kolom secara manual.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setDraftMapping(metadata.columnMapping);
              setShowMappingModal(true);
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded hover:bg-rose-500"
          >
            Buka Pemetaan Kolom
          </button>
        </div>
      )}

      {/* Ringkasan Hasil Import File RAW VHMS (Bagian 2) */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Ringkasan Data RAW VHMS Terparse
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {metadata.companyJobsite}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {metadata.availableSheets.length > 1 && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500">Pilih Sheet:</span>
                <select
                  value={metadata.sheetName}
                  onChange={(e) => onChangeSheet(e.target.value)}
                  className="px-2.5 py-1.5 font-mono text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded"
                >
                  {metadata.availableSheets.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setDraftMapping(metadata.columnMapping);
                setShowMappingModal(true);
              }}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Pemetaan Kolom
            </button>

            <button
              type="button"
              onClick={() => downloadSampleRawVhmsExcel(rows, metadata)}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded flex items-center gap-1.5"
              title="Unduh file Excel berformat RAW VHMS Hourly dengan sel merge persis spesifikasi Bagian 2"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh File RAW VHMS (.xlsx)
            </button>
          </div>
        </div>

        {/* Metadata Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500 font-sans block">Nama Sheet</span>
            <strong className="text-slate-900 dark:text-slate-100">
              {metadata.sheetName}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 font-sans block">Tanggal VHMS</span>
            <strong className="text-slate-900 dark:text-slate-100">
              {metadata.parsedDateDisplay}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 font-sans block">Cakupan Jam</span>
            <strong className="text-amber-600 dark:text-amber-400">
              {metadata.hoursLabel}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 font-sans block">Data Per (UPDATED)</span>
            <strong className="text-slate-900 dark:text-slate-100">
              {metadata.latestUpdatedDisplay}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 font-sans block">Total Baris DT</span>
            <strong className="text-slate-900 dark:text-slate-100">
              {metadata.totalRows} Unit DT
            </strong>
          </div>
          <div>
            <span className="text-slate-500 font-sans block">Distribusi Pit</span>
            <strong className="text-slate-900 dark:text-slate-100">
              {Object.entries(metadata.pitCounts)
                .map(([p, c]) => `${p}: ${c}`)
                .join(' · ')}
            </strong>
          </div>
        </div>
      </div>

      {/* Filter & Pencarian Tabel Mentah VHMS */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor DT (misal 4553)..."
                className="pl-8 pr-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:border-amber-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            <select
              value={selectedPit}
              onChange={(e) => setSelectedPit(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
            >
              <option value="ALL">Semua Lokasi Pit ({rows.length})</option>
              {pits.map((p) => (
                <option key={p} value={p}>
                  {p} ({metadata.pitCounts[p]})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setFilterSmallSample(!filterSmallSample)}
              className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                filterSmallSample
                  ? 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              Sampel Kecil RIT &lt; 3 ({countSmallSample})
            </button>

            <button
              type="button"
              onClick={() => setFilterInconsistent(!filterInconsistent)}
              className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                filterInconsistent
                  ? 'bg-rose-500/20 border-rose-500 text-rose-700 dark:text-rose-300'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              Peringatan Konsistensi CT ({countInconsistent})
            </button>
          </div>

          <div className="text-xs text-slate-500">
            Menampilkan <strong>{filteredRows.length}</strong> dari {rows.length} DT
          </div>
        </div>

        {/* Tabel Data VHMS */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-sans">
                <th className="py-2.5 px-3">
                  <button
                    type="button"
                    onClick={() => handleSort('location')}
                    className="inline-flex items-center gap-1"
                  >
                    <span>LOCATION</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3">
                  <button
                    type="button"
                    onClick={() => handleSort('unit')}
                    className="inline-flex items-center gap-1"
                  >
                    <span>UNIT</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3">Loader Ditugaskan</th>
                <th className="py-2.5 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('rit')}
                    className="inline-flex items-center justify-end gap-1"
                  >
                    <span>RIT</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('jarakKm')}
                    className="inline-flex items-center justify-end gap-1"
                  >
                    <span>JARAK (km)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right">KONV</th>
                <th className="py-2.5 px-3">UPDATED</th>
                <th className="py-2.5 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('ctActual')}
                    className="inline-flex items-center justify-end gap-1"
                  >
                    <span>CT (Plan / Act / Compl)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('ltActual')}
                    className="inline-flex items-center justify-end gap-1"
                  >
                    <span>LT (Plan / Act)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('travelActual')}
                    className="inline-flex items-center justify-end gap-1"
                  >
                    <span>Travel (Plan / Act)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right">EST / LST (Act)</th>
                <th className="py-2.5 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('speedAvgActual')}
                    className="inline-flex items-center justify-end gap-1"
                  >
                    <span>Speed Avg (P / A)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right">Payload (P / A)</th>
                <th className="py-2.5 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('prodtyActual')}
                    className="inline-flex items-center justify-end gap-1"
                  >
                    <span>Prodty (P / A)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3">Cek Konsistensi CT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredRows.map((r) => {
                const assignedTo = dtToLoaders.get(r.unit.toUpperCase()) || [];
                const isSmallSample = r.rit !== null && r.rit < 3;

                return (
                  <tr
                    key={`${r.rowIndex}-${r.unit}`}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-700 dark:text-slate-300">
                      {r.location}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                      {r.unit}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      {assignedTo.length === 0 ? (
                        <span className="text-slate-400 italic">Belum ditugaskan</span>
                      ) : (
                        <span
                          className={
                            assignedTo.length > 1
                              ? 'text-amber-600 dark:text-amber-400 font-semibold'
                              : 'text-emerald-600 dark:text-emerald-400 font-medium'
                          }
                        >
                          {assignedTo.join(', ')}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="font-semibold">{r.rit ?? '-'}</span>
                      {isSmallSample && (
                        <span className="block text-[10px] font-sans text-amber-600 dark:text-amber-400">
                          sampel kecil
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {formatIdNumber(r.jarakKm, 3)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {formatIdNumber(r.konv, 3)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {r.updatedDate || r.updatedRaw || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-slate-400">
                        {formatMinutes(r.ctPlan, 1)}
                      </span>{' '}
                      /{' '}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatMinutes(r.ctActual, 2)}
                      </span>{' '}
                      <span className="text-slate-400">
                        (
                        {r.ctCompl !== null
                          ? `${formatIdNumber(r.ctCompl * 100, 0)}%`
                          : '-'}
                        )
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-slate-400">
                        {formatMinutes(r.ltPlan, 2)}
                      </span>{' '}
                      /{' '}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatMinutes(r.ltActual, 2)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-slate-400">
                        {formatMinutes(r.travelPlan, 1)}
                      </span>{' '}
                      /{' '}
                      <span className="text-slate-900 dark:text-slate-100">
                        {formatMinutes(r.travelActual, 2)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {formatMinutes(r.estActual, 1)} / {formatMinutes(r.lstActual, 1)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-slate-400">
                        {formatIdNumber(r.speedAvgPlan, 1)}
                      </span>{' '}
                      /{' '}
                      <span className="text-slate-900 dark:text-slate-100">
                        {formatIdNumber(r.speedAvgActual, 1)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-slate-400">
                        {formatIdNumber(r.payloadPlan, 0)}
                      </span>{' '}
                      /{' '}
                      <span className="text-slate-900 dark:text-slate-100">
                        {formatIdNumber(r.payloadActual, 1)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-slate-400">
                        {formatIdNumber(r.prodtyPlan, 0)}
                      </span>{' '}
                      /{' '}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatIdNumber(r.prodtyActual, 1)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      {r.consistencyWarning ? (
                        <span className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{r.consistencyWarning}</span>
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Pemetaan Kolom Manual (Bagian 2) */}
      {showMappingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-3xl w-full p-5 space-y-4 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">
                  Pemetaan Kolom Manual (Header 2 Baris VHMS)
                </h3>
                <p className="text-xs text-slate-500">
                  Sesuaikan pemetaan kolom jika posisi atau teks header pada file Excel
                  berbeda dari standar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMappingModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 pr-1">
              {(Object.keys(VHMS_FIELD_LABELS) as VhmsFieldKey[]).map((fieldKey) => {
                const info = VHMS_FIELD_LABELS[fieldKey];
                const currentVal =
                  draftMapping[fieldKey] !== undefined
                    ? String(draftMapping[fieldKey])
                    : '';

                return (
                  <div
                    key={fieldKey}
                    className="p-2.5 border border-slate-200 dark:border-slate-800 rounded flex items-center justify-between gap-2 text-xs"
                  >
                    <label className="font-medium text-slate-800 dark:text-slate-200">
                      {info.label}
                      {info.required && (
                        <span className="text-rose-500 ml-1">*</span>
                      )}
                    </label>
                    <select
                      value={currentVal}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDraftMapping((prev) => ({
                          ...prev,
                          [fieldKey]: v === '' ? undefined : Number(v),
                        }));
                      }}
                      className="px-2 py-1 font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded max-w-[180px]"
                    >
                      <option value="">-- Tidak Dipetakan --</option>
                      {metadata.detectedColumns.length > 0
                        ? metadata.detectedColumns.map((col) => (
                            <option key={col.colIndex} value={col.colIndex}>
                              [{col.colLetter}] {col.headerKey}
                            </option>
                          ))
                        : Array.from({ length: 40 }, (_, i) => (
                            <option key={i} value={i}>
                              Kolom #{i + 1}
                            </option>
                          ))}
                    </select>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowMappingModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onApplyCustomColumnMapping(draftMapping);
                  setShowMappingModal(false);
                }}
                className="px-4 py-2 text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded"
              >
                Terapkan Pemetaan Kolom
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
