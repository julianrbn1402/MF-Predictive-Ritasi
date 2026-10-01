import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  ArrowUpDown,
  ChevronRight,
  X,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  GlobalParams,
  LoaderCalculationResult,
  MasterLoader,
  VhmsRow,
} from '../types';
import {
  formatIdNumber,
  formatMeters,
  formatMf,
  formatMinutes,
} from '../utils/formulas';
import { DtAssignmentPanel } from './DtAssignmentPanel';

interface PitDashboardTabProps {
  pit: string;
  pitLoaders: MasterLoader[];
  allLoaders: MasterLoader[];
  pitCalcResults: LoaderCalculationResult[];
  allCalcResults: LoaderCalculationResult[];
  vhmsRows: VhmsRow[];
  params: GlobalParams;
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

type SortField =
  | 'priorityRank'
  | 'loaderName'
  | 'status'
  | 'avgJarakM'
  | 'nHdActual'
  | 'avgServingTimeActual'
  | 'avgCtActual'
  | 'mf'
  | 'predictiveRitasi'
  | 'durasiMenitPerJam';

export const PitDashboardTab: React.FC<PitDashboardTabProps> = ({
  pit,
  pitLoaders,
  allLoaders,
  pitCalcResults,
  allCalcResults,
  vhmsRows,
  params,
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
  const [sortField, setSortField] = useState<SortField>('priorityRank');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [selectedLoaderId, setSelectedLoaderId] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedResults = useMemo(() => {
    const copy = [...pitCalcResults];
    copy.sort((a, b) => {
      const getVal = (item: LoaderCalculationResult): number | string => {
        switch (sortField) {
          case 'priorityRank':
            return item.priorityRank ?? 9999;
          case 'loaderName':
            return item.loader.name;
          case 'status':
            return item.loader.status;
          case 'avgJarakM':
            return item.avgJarakM ?? -1;
          case 'nHdActual':
            return item.nHdActual;
          case 'avgServingTimeActual':
            return item.avgServingTimeActual ?? -1;
          case 'avgCtActual':
            return item.avgCtActual ?? -1;
          case 'mf':
            return item.mf ?? -1;
          case 'predictiveRitasi':
            return item.predictiveRitasi ?? 99999;
          case 'durasiMenitPerJam':
            return item.durasiMenitPerJam ?? -9999;
        }
      };

      const vA = getVal(a);
      const vB = getVal(b);
      if (typeof vA === 'string' && typeof vB === 'string') {
        return sortAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
      }
      return sortAsc ? Number(vA) - Number(vB) : Number(vB) - Number(vA);
    });
    return copy;
  }, [pitCalcResults, sortField, sortAsc]);

  // Statistik Ringkasan Pit
  const totalLoaders = pitCalcResults.length;
  const totalAssignedDt = pitCalcResults.reduce((acc, r) => acc + r.nHdActual, 0);
  const validMfList = pitCalcResults
    .map((r) => r.mf)
    .filter((m): m is number => m !== null && Number.isFinite(m));
  const avgPitMf =
    validMfList.length > 0
      ? validMfList.reduce((a, b) => a + b, 0) / validMfList.length
      : null;

  const countGantung = pitCalcResults.filter(
    (r) => r.remark === 'Potensi Gantung'
  ).length;
  const countOk = pitCalcResults.filter((r) => r.remark === 'OK').length;
  const countAntri = pitCalcResults.filter((r) => r.remark === 'Potensi Antri').length;

  // Data Grafik Batang MF per Loader
  const chartData = pitCalcResults.map((r) => ({
    name: r.loader.name,
    mf: r.mf !== null ? Number(r.mf.toFixed(3)) : 0,
    remark: r.remark,
    predRitasi:
      r.predictiveRitasi !== null ? Number(r.predictiveRitasi.toFixed(2)) : 0,
  }));

  const selectedCalc =
    pitCalcResults.find((r) => r.loader.id === selectedLoaderId) || null;

  return (
    <div className="space-y-6">
      {/* 1. Panel Penugasan DT per Jam (Bagian 4D) */}
      <DtAssignmentPanel
        pit={pit}
        pitLoaders={pitLoaders}
        allLoaders={allLoaders}
        calcResults={allCalcResults}
        vhmsRows={vhmsRows}
        assignments={assignments}
        onUpdateLoaderAssignment={onUpdateLoaderAssignment}
        onUpdateBulkAssignments={onUpdateBulkAssignments}
        onUpdateLoaderConfig={onUpdateLoaderConfig}
        onCopyFromPreviousHour={onCopyFromPreviousHour}
        onClearPitAssignments={onClearPitAssignments}
        onSaveSnapshot={onSaveSnapshot}
        hasPreviousCarryoverBanner={hasPreviousCarryoverBanner}
        onDismissCarryoverBanner={onDismissCarryoverBanner}
      />

      {/* 2. Baris Ringkasan Metrik Pit (Single-Elevation Grid dengan Hairline Divider) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-lg divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Total Loader Aktif ({pit})
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {totalLoaders}{' '}
            <span className="text-xs font-normal text-slate-500">Unit EX</span>
          </div>
        </div>

        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Total Hauler Ditugaskan (n HD)
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {totalAssignedDt}{' '}
            <span className="text-xs font-normal text-slate-500">Unit DT</span>
          </div>
        </div>

        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Rata-rata Match Factor ({pit})
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            {formatMf(avgPitMf, 2)}{' '}
            <span className="text-xs font-normal text-slate-500">
              {avgPitMf !== null ? `(${formatMf(avgPitMf, 3)})` : 'Belum ada data'}
            </span>
          </div>
        </div>

        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Distribusi Status Loader
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-xs font-mono tabular-nums">
            <span className="text-amber-600 dark:text-amber-400 font-semibold">
              Gantung: {countGantung}
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              OK: {countOk}
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold">
              Antri: {countAntri}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Tabel Utama Monitoring Match Factor & Predictive Ritasi */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Tabel Monitoring Match Factor & Prioritas Perbaikan — {pit}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Catatan: MF &lt; {formatIdNumber(params.mfLowerThreshold, 3)} = Potensi Gantung
              (loader menunggu) · {formatIdNumber(params.mfLowerThreshold, 3)} s/d &lt;{' '}
              {formatIdNumber(params.mfUpperThreshold, 3)} = OK · &ge;{' '}
              {formatIdNumber(params.mfUpperThreshold, 3)} = Potensi Antri (hauler mengantri).
              Klik baris loader untuk membuka detail diagnostik DT.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-semibold">
                <th className="py-2.5 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('priorityRank')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    <span>Priority</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('loaderName')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    <span>Loader</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('status')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('avgJarakM')}
                    className="inline-flex items-center justify-end gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    <span>Jarak (m) / Konv</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('nHdActual')}
                    className="inline-flex items-center justify-end gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    <span>n HD (Plan / Act)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('avgServingTimeActual')}
                    className="inline-flex items-center justify-end gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    <span>Serving Time (P / A)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('avgCtActual')}
                    className="inline-flex items-center justify-end gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    <span>CT Menit (Plan / Act)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('mf')}
                    className="inline-flex items-center justify-end gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    <span>MF</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('predictiveRitasi')}
                    className="inline-flex items-center justify-end gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    <span>Pred. Ritasi</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap">Gantung / Antri</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('durasiMenitPerJam')}
                    className="inline-flex items-center justify-end gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    <span>Durasi (mnt/jam)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap">
                  Catatan Prioritas Perbaikan
                </th>
                <th className="py-2.5 px-2 text-center">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono tabular-nums">
              {sortedResults.map((r) => {
                // Warna baris sesuai Bagian 6B: merah = Potensi Antri, kuning = Potensi Gantung, hijau = OK
                let rowBgClass =
                  'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors';
                let remarkColorClass = 'text-slate-500 dark:text-slate-400';

                if (r.remark === 'Potensi Antri') {
                  rowBgClass =
                    'bg-rose-500/[0.07] dark:bg-rose-500/[0.11] hover:bg-rose-500/[0.14] transition-colors';
                  remarkColorClass = 'text-rose-700 dark:text-rose-300 font-semibold';
                } else if (r.remark === 'Potensi Gantung') {
                  rowBgClass =
                    'bg-amber-500/[0.08] dark:bg-amber-500/[0.11] hover:bg-amber-500/[0.15] transition-colors';
                  remarkColorClass = 'text-amber-700 dark:text-amber-300 font-semibold';
                } else if (r.remark === 'OK') {
                  rowBgClass =
                    'bg-emerald-500/[0.07] dark:bg-emerald-500/[0.10] hover:bg-emerald-500/[0.14] transition-colors';
                  remarkColorClass = 'text-emerald-700 dark:text-emerald-300 font-semibold';
                }

                const isPartialVhms =
                  r.nHdActual > r.nHdFoundInVhms && r.nHdFoundInVhms > 0;

                return (
                  <tr
                    key={r.loader.id}
                    onClick={() => setSelectedLoaderId(r.loader.id)}
                    className={`cursor-pointer ${rowBgClass}`}
                  >
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">
                      {r.priorityLabel}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {r.loader.name}
                      </div>
                      <div className="text-[11px] font-sans text-slate-500 dark:text-slate-400">
                        {r.loader.egi} · Plan {r.loader.planProdtyLoader} t/j
                      </div>
                    </td>
                    <td className="py-3 px-3 font-sans font-medium text-slate-700 dark:text-slate-300">
                      {r.loader.status}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {r.hasData ? (
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {formatMeters(r.avgJarakM)} m
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Konv: {formatIdNumber(r.konversi, 3)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="text-slate-900 dark:text-slate-100">
                        <span className="text-slate-500">
                          {formatIdNumber(r.planKebutuhanHd, 2)}
                        </span>{' '}
                        /{' '}
                        <span className="font-bold">
                          {r.nHdActual > 0 ? r.nHdActual : '-'}
                        </span>
                      </div>
                      {r.nHdActual === 0 && (
                        <div className="text-[11px] font-sans text-slate-400">
                          Belum ada DT
                        </div>
                      )}
                      {isPartialVhms && (
                        <div
                          className="text-[10px] font-sans text-amber-700 dark:text-amber-300"
                          title={`MF memakai n HD = ${r.nHdActual}, data VHMS tersedia untuk ${r.nHdFoundInVhms} DT`}
                        >
                          MF nHD={r.nHdActual}, data={r.nHdFoundInVhms} DT
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-slate-500">
                        {formatMinutes(params.planServingTime, 2)}
                      </span>{' '}
                      /{' '}
                      <span
                        className={
                          r.avgServingTimeActual !== null &&
                          r.avgServingTimeActual > params.planServingTime
                            ? 'text-rose-600 dark:text-rose-400 font-semibold'
                            : 'text-slate-900 dark:text-slate-100 font-semibold'
                        }
                      >
                        {formatMinutes(r.avgServingTimeActual, 1)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-slate-500">
                        {formatMinutes(r.ctPlanCalculated, 1)}
                      </span>{' '}
                      /{' '}
                      <span
                        className={
                          r.avgCtActual !== null &&
                          r.ctPlanCalculated !== null &&
                          r.avgCtActual > r.ctPlanCalculated
                            ? 'text-rose-600 dark:text-rose-400 font-semibold'
                            : 'text-slate-900 dark:text-slate-100 font-semibold'
                        }
                      >
                        {formatMinutes(r.avgCtActual, 1)}
                      </span>
                    </td>
                    <td
                      className="py-3 px-3 text-right font-bold text-sm text-slate-900 dark:text-slate-100"
                      title={
                        r.mf !== null ? `Presisi 3 desimal: ${formatMf(r.mf, 3)}` : '-'
                      }
                    >
                      {formatMf(r.mf, 2)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                      {r.predictiveRitasi !== null
                        ? `${formatIdNumber(r.predictiveRitasi, 2)} rit`
                        : '-'}
                    </td>
                    <td className={`py-3 px-3 font-sans ${remarkColorClass}`}>
                      {r.remark}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {r.durasiMenitPerJam !== null ? (
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {formatMinutes(r.durasiMenitPerJam, 1)}
                          </span>
                          <span className="block text-[10px] font-sans text-slate-500">
                            {r.durasiMenitPerJam >= 0
                              ? 'Loader tunggu'
                              : 'Hauler antri'}
                          </span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td
                      className="py-3 px-3 font-sans"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={r.loader.repairPriorityNote}
                        onChange={(e) =>
                          onUpdateLoaderConfig(r.loader.id, {
                            repairPriorityNote: e.target.value,
                          })
                        }
                        placeholder="Catatan perbaikan..."
                        className="w-full min-w-[140px] px-2 py-1 text-xs bg-white/70 dark:bg-slate-900/70 border border-slate-300/80 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <ChevronRight className="w-4 h-4 inline text-slate-400" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Grafik Batang Match Factor (MF) per Loader dengan Garis Ambang */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Grafik Match Factor (MF) per Loader — {pit}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Garis ambang batas bawah ({formatIdNumber(params.mfLowerThreshold, 3)}) dan
              batas atas ({formatIdNumber(params.mfUpperThreshold, 3)})
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              ■ Potensi Gantung (&lt; {formatIdNumber(params.mfLowerThreshold, 3)})
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              ■ OK ({formatIdNumber(params.mfLowerThreshold, 3)} –{' '}
              {formatIdNumber(params.mfUpperThreshold, 3)})
            </span>
            <span className="text-rose-600 dark:text-rose-400 font-medium">
              ■ Potensi Antri (&ge; {formatIdNumber(params.mfUpperThreshold, 3)})
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 16, right: 24, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={{ stroke: '#475569' }}
              />
              <YAxis
                domain={[0, (dataMax: number) => Math.max(1.3, Number((dataMax + 0.15).toFixed(2)))]}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={{ stroke: '#475569' }}
              />
              <Tooltip
                formatter={(val: unknown) => [
                  formatIdNumber(Number(val), 3),
                  'Match Factor (MF)',
                ]}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
              />
              <ReferenceLine
                y={params.mfLowerThreshold}
                stroke="#d97706"
                strokeDasharray="4 4"
                label={{
                  value: `Min ${formatIdNumber(params.mfLowerThreshold, 3)}`,
                  position: 'insideBottomRight',
                  fill: '#d97706',
                  fontSize: 11,
                }}
              />
              <ReferenceLine
                y={params.mfUpperThreshold}
                stroke="#e11d48"
                strokeDasharray="4 4"
                label={{
                  value: `Max ${formatIdNumber(params.mfUpperThreshold, 3)}`,
                  position: 'insideTopRight',
                  fill: '#e11d48',
                  fontSize: 11,
                }}
              />
              <Bar dataKey="mf" radius={[4, 4, 0, 0]} maxBarSize={56}>
                {chartData.map((entry, index) => {
                  let fill = '#64748b';
                  if (entry.remark === 'Potensi Gantung') fill = '#d97706';
                  else if (entry.remark === 'OK') fill = '#16a34a';
                  else if (entry.remark === 'Potensi Antri') fill = '#e11d48';
                  return <Cell key={`cell-${index}`} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Panel Detail Diagnostik DT per Loader saat Baris Diklik */}
      {selectedCalc && (
        <div className="border border-amber-500/40 bg-white dark:bg-slate-900 rounded-lg overflow-hidden shadow-lg">
          <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                  Detail Diagnostik Hauler (DT) — {selectedCalc.loader.name} (
                  {selectedCalc.loader.pit})
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  · Priority: {selectedCalc.priorityLabel} · MF:{' '}
                  {formatMf(selectedCalc.mf, 3)} ({selectedCalc.remark})
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Nilai aktual yang lebih buruk dari Plan ditandai merah (Waktu aktual &gt;
                Plan, atau Kecepatan/Payload/Prodty aktual &lt; Plan).
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedLoaderId(null)}
              className="px-2.5 py-1 text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded hover:opacity-80 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Tutup Detail
            </button>
          </div>

          {selectedCalc.nHdActual > selectedCalc.nHdFoundInVhms && (
            <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>
                Catatan: MF memakai n HD = {selectedCalc.nHdActual}, sedangkan data VHMS
                tersedia untuk {selectedCalc.nHdFoundInVhms} DT.
              </span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-sans">
                  <th className="py-2 px-3">Unit DT</th>
                  <th className="py-2 px-3">Lokasi VHMS</th>
                  <th className="py-2 px-3 text-right">RIT</th>
                  <th className="py-2 px-3 text-right">Compl.</th>
                  <th className="py-2 px-3 text-right">Jarak (km)</th>
                  <th className="py-2 px-3 text-right">CT (P / A)</th>
                  <th className="py-2 px-3 text-right">Loading (P / A)</th>
                  <th className="py-2 px-3 text-right">Travel (P / A)</th>
                  <th className="py-2 px-3 text-right">EST (P / A)</th>
                  <th className="py-2 px-3 text-right">LST (P / A)</th>
                  <th className="py-2 px-3 text-right">Speed Avg (P / A)</th>
                  <th className="py-2 px-3 text-right">Empty Spd (P / A)</th>
                  <th className="py-2 px-3 text-right">Loaded Spd (P / A)</th>
                  <th className="py-2 px-3 text-right">Payload (P / A)</th>
                  <th className="py-2 px-3 text-right">Prodty (P / A)</th>
                  <th className="py-2 px-3">Konsistensi CT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {selectedCalc.dtValidations.map((v) => {
                  const r = v.vhmsRow;
                  if (!r) {
                    return (
                      <tr
                        key={v.unit}
                        className="bg-rose-500/5 text-rose-600 dark:text-rose-400"
                      >
                        <td className="py-2.5 px-3 font-bold">{v.unit}</td>
                        <td colSpan={15} className="py-2.5 px-3 font-sans">
                          Tidak ditemukan di data VHMS (tetap dihitung dalam n HD Actual,
                          tidak ikut rata-rata metrik).
                        </td>
                      </tr>
                    );
                  }

                  const worseTime = (act: number | null, plan: number | null) =>
                    act !== null && plan !== null && act > plan
                      ? 'text-rose-600 dark:text-rose-400 font-bold'
                      : 'text-slate-900 dark:text-slate-100';

                  const worseRate = (act: number | null, plan: number | null) =>
                    act !== null && plan !== null && act < plan
                      ? 'text-rose-600 dark:text-rose-400 font-bold'
                      : 'text-slate-900 dark:text-slate-100';

                  return (
                    <tr
                      key={v.unit}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                        {r.unit}
                        {v.duplicateLoaders.length > 0 && (
                          <span className="block text-[10px] font-sans text-amber-600 dark:text-amber-400">
                            Dobel: {v.duplicateLoaders.join(', ')}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        {r.location}
                        {v.differentPit && (
                          <span className="block text-[10px] text-amber-600 dark:text-amber-400">
                            ≠ {selectedCalc.loader.pit}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {r.rit ?? '-'}
                        {v.smallSample && (
                          <span className="block text-[10px] font-sans text-amber-600 dark:text-amber-400">
                            sampel kecil
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {r.ctCompl !== null
                          ? `${formatIdNumber(r.ctCompl * 100, 1)}%`
                          : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {formatIdNumber(r.jarakKm, 3)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-slate-400">
                          {formatMinutes(r.ctPlan, 1)}
                        </span>{' '}
                        /{' '}
                        <span className={worseTime(r.ctActual, r.ctPlan)}>
                          {formatMinutes(r.ctActual, 1)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-slate-400">
                          {formatMinutes(r.ltPlan, 1)}
                        </span>{' '}
                        /{' '}
                        <span className={worseTime(r.ltActual, r.ltPlan)}>
                          {formatMinutes(r.ltActual, 1)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-slate-400">
                          {formatMinutes(r.travelPlan, 1)}
                        </span>{' '}
                        /{' '}
                        <span className={worseTime(r.travelActual, r.travelPlan)}>
                          {formatMinutes(r.travelActual, 1)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-slate-400">
                          {formatMinutes(r.estPlan, 1)}
                        </span>{' '}
                        /{' '}
                        <span className={worseTime(r.estActual, r.estPlan)}>
                          {formatMinutes(r.estActual, 1)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-slate-400">
                          {formatMinutes(r.lstPlan, 1)}
                        </span>{' '}
                        /{' '}
                        <span className={worseTime(r.lstActual, r.lstPlan)}>
                          {formatMinutes(r.lstActual, 1)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-slate-400">
                          {formatIdNumber(r.speedAvgPlan, 1)}
                        </span>{' '}
                        /{' '}
                        <span className={worseRate(r.speedAvgActual, r.speedAvgPlan)}>
                          {formatIdNumber(r.speedAvgActual, 1)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-slate-400">
                          {formatIdNumber(r.emptySpeedPlan, 1)}
                        </span>{' '}
                        /{' '}
                        <span
                          className={worseRate(r.emptySpeedActual, r.emptySpeedPlan)}
                        >
                          {formatIdNumber(r.emptySpeedActual, 1)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-slate-400">
                          {formatIdNumber(r.loadedSpeedPlan, 1)}
                        </span>{' '}
                        /{' '}
                        <span
                          className={worseRate(r.loadedSpeedActual, r.loadedSpeedPlan)}
                        >
                          {formatIdNumber(r.loadedSpeedActual, 1)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-slate-400">
                          {formatIdNumber(r.payloadPlan, 1)}
                        </span>{' '}
                        /{' '}
                        <span className={worseRate(r.payloadActual, r.payloadPlan)}>
                          {formatIdNumber(r.payloadActual, 1)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-slate-400">
                          {formatIdNumber(r.prodtyPlan, 1)}
                        </span>{' '}
                        /{' '}
                        <span className={worseRate(r.prodtyActual, r.prodtyPlan)}>
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
                            Sesuai
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* Baris Rata-rata Loader */}
                {selectedCalc.hasData && (
                  <tr className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-900 dark:text-slate-100">
                    <td colSpan={4} className="py-2.5 px-3 font-sans">
                      RATA-RATA LOADER ({selectedCalc.nHdFoundInVhms} DT di VHMS)
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {formatIdNumber(selectedCalc.avgJarakKm, 3)} km (
                      {formatMeters(selectedCalc.avgJarakM)} m)
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {formatMinutes(selectedCalc.ctPlanCalculated, 1)} /{' '}
                      {formatMinutes(selectedCalc.avgCtActual, 1)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {formatMinutes(params.planServingTime, 2)} /{' '}
                      {formatMinutes(selectedCalc.avgServingTimeActual, 1)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      - / {formatMinutes(selectedCalc.avgTravelActual, 1)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      - / {formatMinutes(selectedCalc.avgEstActual, 1)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      - / {formatMinutes(selectedCalc.avgLstActual, 1)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {formatIdNumber(selectedCalc.avgSpeedPlan, 1)} /{' '}
                      {formatIdNumber(selectedCalc.avgSpeedActual, 1)}
                    </td>
                    <td colSpan={3} className="py-2.5 px-3 text-right font-sans">
                      Prodty Hauler Rata-rata:
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {formatIdNumber(selectedCalc.avgProdtyActual, 1)} t/j
                    </td>
                    <td className="py-2.5 px-3"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
