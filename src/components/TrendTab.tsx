import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  BookmarkPlus,
  Trash2,
  RotateCcw,
  Clock,
} from 'lucide-react';
import {
  GlobalParams,
  HourlySnapshot,
  MasterLoader,
} from '../types';
import { formatIdNumber, formatMf } from '../utils/formulas';

interface TrendTabProps {
  snapshots: HourlySnapshot[];
  loaders: MasterLoader[];
  params: GlobalParams;
  onSaveCurrentSnapshot: () => void;
  onRestoreSnapshot: (snapshot: HourlySnapshot) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
  onClearAllSnapshots: () => void;
}

const LINE_COLORS = [
  '#f59e0b',
  '#10b981',
  '#38bdf8',
  '#f43f5e',
  '#a855f7',
  '#eab308',
  '#ec4899',
  '#14b8a6',
];

export const TrendTab: React.FC<TrendTabProps> = ({
  snapshots,
  loaders,
  params,
  onSaveCurrentSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
  onClearAllSnapshots,
}) => {
  const pits = Array.from(new Set(loaders.map((l) => l.pit)));
  const [selectedPit, setSelectedPit] = useState<string>('ALL');
  const [selectedLoaderId, setSelectedLoaderId] = useState<string>('ALL');

  const filteredLoaders = useMemo(() => {
    let list = loaders;
    if (selectedPit !== 'ALL') {
      list = list.filter((l) => l.pit === selectedPit);
    }
    if (selectedLoaderId !== 'ALL') {
      list = list.filter((l) => l.id === selectedLoaderId);
    }
    return list;
  }, [loaders, selectedPit, selectedLoaderId]);

  // Bangun data deret waktu untuk Recharts
  const mfChartData = useMemo(() => {
    return snapshots.map((snap) => {
      const point: Record<string, string | number | null> = {
        label: snap.metadata.hoursLabel || snap.label,
        fullLabel: snap.label,
      };
      for (const l of filteredLoaders) {
        const sum = snap.loaderSummaries.find(
          (s) => s.loaderId === l.id || s.loaderName === l.name
        );
        point[l.name] =
          sum && sum.mf !== null ? Number(sum.mf.toFixed(3)) : null;
      }
      return point;
    });
  }, [snapshots, filteredLoaders]);

  const ritasiChartData = useMemo(() => {
    return snapshots.map((snap) => {
      const point: Record<string, string | number | null> = {
        label: snap.metadata.hoursLabel || snap.label,
        fullLabel: snap.label,
      };
      for (const l of filteredLoaders) {
        const sum = snap.loaderSummaries.find(
          (s) => s.loaderId === l.id || s.loaderName === l.name
        );
        point[l.name] =
          sum && sum.predictiveRitasi !== null
            ? Number(sum.predictiveRitasi.toFixed(2))
            : null;
      }
      return point;
    });
  }, [snapshots, filteredLoaders]);

  return (
    <div className="space-y-6">
      {/* Bar Kontrol Filter & Simpan Snapshot */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Grafik Tren Match Factor & Predictive Ritasi per Jam
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Menampilkan riwayat snapshot jam-an yang tersimpan di browser (
              {snapshots.length} snapshot).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedPit}
            onChange={(e) => {
              setSelectedPit(e.target.value);
              setSelectedLoaderId('ALL');
            }}
            className="px-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
          >
            <option value="ALL">Semua Pit</option>
            {pits.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={selectedLoaderId}
            onChange={(e) => setSelectedLoaderId(e.target.value)}
            className="px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
          >
            <option value="ALL">Semua Loader</option>
            {loaders
              .filter((l) => selectedPit === 'ALL' || l.pit === selectedPit)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.pit})
                </option>
              ))}
          </select>

          <button
            type="button"
            onClick={onSaveCurrentSnapshot}
            className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            Simpan Jam Saat Ini ke Tren
          </button>

          {snapshots.length > 0 && (
            <button
              type="button"
              onClick={onClearAllSnapshots}
              className="px-3 py-1.5 text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hapus Riwayat
            </button>
          )}
        </div>
      </div>

      {snapshots.length === 0 ? (
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-lg p-10 text-center space-y-3">
          <Clock className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Belum Ada Riwayat Snapshot Jam-an
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Setiap kali Anda mengunggah file VHMS jam baru atau menekan tombol{' '}
            <strong>"Simpan Jam Saat Ini ke Tren"</strong>, data VHMS, penugasan DT, dan
            hasil hitung disimpan untuk memantau grafik tren antar jam.
          </p>
          <button
            type="button"
            onClick={onSaveCurrentSnapshot}
            className="px-4 py-2 text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            <BookmarkPlus className="w-4 h-4" />
            Simpan Snapshot Pertama Sekarang
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Grafik Tren Match Factor */}
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Tren Match Factor (MF) per Jam
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Batas ideal MF: {formatIdNumber(params.mfLowerThreshold, 3)} s/d{' '}
                {formatIdNumber(params.mfUpperThreshold, 3)}
              </p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={mfChartData}
                    margin={{ top: 12, right: 24, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                    />
                    <YAxis
                      domain={[0, 1.4]}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <ReferenceLine
                      y={params.mfLowerThreshold}
                      stroke="#d97706"
                      strokeDasharray="4 4"
                    />
                    <ReferenceLine
                      y={params.mfUpperThreshold}
                      stroke="#e11d48"
                      strokeDasharray="4 4"
                    />
                    {filteredLoaders.map((l, idx) => (
                      <Line
                        key={l.id}
                        type="monotone"
                        dataKey={l.name}
                        stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Grafik Tren Predictive Ritasi */}
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Tren Predictive Ritasi (rit/jam) per Jam
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Estimasi capaian ritasi per jam berdasarkan MF, WH, Delay, dan Serving
                Time Actual
              </p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={ritasiChartData}
                    margin={{ top: 12, right: 24, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    {filteredLoaders.map((l, idx) => (
                      <Line
                        key={l.id}
                        type="monotone"
                        dataKey={l.name}
                        stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tabel Daftar Snapshot Tersimpan */}
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Daftar Snapshot Jam-an Tersimpan
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-500 font-sans">
                    <th className="py-2.5 px-3">Label Snapshot</th>
                    <th className="py-2.5 px-3">Data Per (UPDATED)</th>
                    <th className="py-2.5 px-3 text-right">Jumlah DT VHMS</th>
                    <th className="py-2.5 px-3">Ringkasan MF per Loader</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {snapshots.map((snap) => (
                    <tr
                      key={snap.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">
                        {snap.label}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {snap.metadata.latestUpdatedDisplay}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {snap.vhmsRows.length} DT
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          {snap.loaderSummaries.map((s) => (
                            <span key={s.loaderId} className="font-mono">
                              <strong>{s.loaderName}:</strong> {formatMf(s.mf, 2)} (
                              {formatIdNumber(s.predictiveRitasi, 1)} rit)
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 font-sans">
                          <button
                            type="button"
                            onClick={() => onRestoreSnapshot(snap)}
                            className="px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-amber-500 hover:text-slate-950 rounded transition-colors inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Muat Snapshot
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSnapshot(snap.id)}
                            className="p-1 text-rose-500 hover:bg-rose-500/10 rounded"
                            title="Hapus snapshot ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
