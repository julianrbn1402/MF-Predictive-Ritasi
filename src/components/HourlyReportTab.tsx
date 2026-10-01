import React, { useState } from 'react';
import { Copy, Check, Download } from 'lucide-react';
import {
  GlobalParams,
  KonversiJarakRow,
  LoaderCalculationResult,
  VhmsMetadata,
} from '../types';
import { lookupKonversi } from '../data/konversiJarak';
import {
  calcCtPlanFromKonversi,
  formatIdNumber,
  formatMeters,
  formatMf,
  formatMinutes,
} from '../utils/formulas';

interface HourlyReportTabProps {
  calcResults: LoaderCalculationResult[];
  konversiTable: KonversiJarakRow[];
  params: GlobalParams;
  metadata: VhmsMetadata;
}

export const HourlyReportTab: React.FC<HourlyReportTabProps> = ({
  calcResults,
  konversiTable,
  params,
  metadata,
}) => {
  const pits = Array.from(new Set(calcResults.map((r) => r.loader.pit)));
  const [selectedPit, setSelectedPit] = useState<string>(pits[0] || 'PIT 12');
  const [customHourStr, setCustomHourStr] = useState<string>('');
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const activePit = pits.includes(selectedPit) ? selectedPit : pits[0] || 'PIT 12';
  const pitLoaders = calcResults.filter((r) => r.loader.pit === activePit);

  // Jam tampilan default dari metadata UPDATED terbaru atau daftar jam
  const defaultHourTime = (() => {
    const m = metadata.latestUpdatedDisplay.match(/(\d{2}:\d{2})$/);
    if (m) return m[1];
    if (metadata.hours.length > 0) {
      const lastH = String(metadata.hours[metadata.hours.length - 1]).padStart(2, '0');
      return `${lastH}:00`;
    }
    return '08:00';
  })();

  const displayHour = customHourStr.trim() || defaultHourTime;
  const displayDate =
    metadata.parsedDateDisplay && metadata.parsedDateDisplay !== '-'
      ? metadata.parsedDateDisplay
      : '01 Okt 2026';

  const getDtCtPlan = (jarakKm: number | null): number | null => {
    if (jarakKm === null || !Number.isFinite(jarakKm)) return null;
    const konv = lookupKonversi(jarakKm * 1000, konversiTable);
    return calcCtPlanFromKonversi(
      konv,
      params.ctPlanProdtyConst,
      params.payloadPerRit
    );
  };

  // Buat teks laporan terformat untuk WhatsApp
  const buildWhatsAppText = (): string => {
    const lines: string[] = [];
    lines.push(`*VHMS HOURLY ${activePit} - ${displayDate}*`);
    lines.push(`*JAM ${displayHour}*`);
    lines.push(`----------------------------------------`);

    for (const r of pitLoaders) {
      lines.push(
        `\n*${r.loader.name}* (${r.loader.egi} | Status: ${r.loader.status} | Priority: ${r.priorityLabel})`
      );
      if (!r.hasData) {
        lines.push(`_Data VHMS belum tersedia (n HD = ${r.nHdActual})_`);
        continue;
      }

      lines.push(
        `• Jarak Rata-rata: *${formatMeters(r.avgJarakM)} m* (Konv: ${formatIdNumber(
          r.konversi,
          3
        )})`
      );
      lines.push(
        `• n HD (Plan / Act): ${formatIdNumber(r.planKebutuhanHd, 2)} / *${
          r.nHdActual
        }*`
      );
      lines.push(
        `• Serving Time (P / A): ${formatMinutes(
          params.planServingTime,
          2
        )} / *${formatMinutes(r.avgServingTimeActual, 1)} mnt*`
      );
      lines.push(
        `• Cycle Time (P / A): ${formatMinutes(
          r.ctPlanCalculated,
          1
        )} / *${formatMinutes(r.avgCtActual, 1)} mnt*`
      );
      lines.push(
        `• Match Factor (MF): *${formatMf(r.mf, 2)}* (${r.remark})`
      );
      lines.push(
        `• Predictive Ritasi: *${formatIdNumber(r.predictiveRitasi, 2)} rit/jam*`
      );
      lines.push(
        `• Durasi: *${formatMinutes(r.durasiMenitPerJam, 1)} mnt/jam*`
      );
      if (r.loader.repairPriorityNote) {
        lines.push(`• Catatan Perbaikan: ${r.loader.repairPriorityNote}`);
      }

      lines.push(`Daftar DT (${r.foundVhmsRows.length} unit):`);
      for (const dt of r.foundVhmsRows) {
        const dtCtPlan = getDtCtPlan(dt.jarakKm);
        lines.push(
          `  - ${dt.unit}: Jarak ${formatIdNumber(dt.jarakKm, 2)} km | CT ${formatMinutes(
            dtCtPlan,
            1
          )}/${formatMinutes(dt.ctActual, 1)} | LT ${formatMinutes(
            dt.ltActual,
            1
          )} | Spd ${formatIdNumber(dt.speedAvgActual, 1)}`
        );
      }
    }

    return lines.join('\n');
  };

  const handleCopyText = async () => {
    const text = buildWhatsAppText();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2500);
    } catch {
      // Fallback textarea copy
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2500);
    }
  };

  // Render tabel laporan ke Canvas HTML5 dan unduh sebagai PNG resolusi tinggi
  const handleDownloadPng = () => {
    const scale = 2;
    const width = 1080;
    // Hitung tinggi kanvas berdasarkan jumlah baris DT di seluruh loader
    const totalDtRows = pitLoaders.reduce(
      (acc, l) => acc + Math.max(1, l.foundVhmsRows.length),
      0
    );
    const height = 140 + pitLoaders.length * 115 + totalDtRows * 28 + 40;

    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(scale, scale);

    // Latar belakang
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Header
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(24, 20, width - 48, 72);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(24, 20, width - 48, 72);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`VHMS HOURLY ${activePit} - ${displayDate}`, 42, 50);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.fillText(`JAM ${displayHour}`, 42, 74);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(metadata.companyJobsite, width - 480, 50);
    ctx.fillText(
      `Data per: ${metadata.latestUpdatedDisplay}`,
      width - 480,
      72
    );

    let y = 112;
    const colX = [42, 170, 310, 470, 630, 780, 920];

    for (const r of pitLoaders) {
      // Bar judul loader
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(24, y, width - 48, 34);
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      ctx.fillText(
        `${r.loader.name} (${r.loader.egi}) — Status: ${r.loader.status} — Priority: ${r.priorityLabel}`,
        40,
        y + 22
      );

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.fillText(
        `n HD: ${r.nHdActual} | MF: ${formatMf(r.mf, 2)} (${
          r.remark
        }) | Pred Ritasi: ${formatIdNumber(r.predictiveRitasi, 2)} rit/jam`,
        width - 540,
        y + 22
      );
      y += 34;

      // Header kolom tabel DT
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(24, y, width - 48, 26);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(24, y, width - 48, 26);
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
      const headers = [
        'UNIT',
        'JARAK (km)',
        'CYCLE TIME PLAN',
        'CYCLE TIME ACTUAL',
        'LOADING TIME',
        'SPEED (km/j)',
        'RIT',
      ];
      headers.forEach((h, i) => {
        ctx.fillText(h, colX[i], y + 17);
      });
      y += 26;

      if (r.foundVhmsRows.length === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = 'italic 12px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Belum ada data DT di VHMS untuk loader ini', 42, y + 18);
        y += 28;
      } else {
        for (const dt of r.foundVhmsRows) {
          ctx.strokeStyle = '#1e293b';
          ctx.strokeRect(24, y, width - 48, 26);
          ctx.fillStyle = '#f1f5f9';
          ctx.font = '12px "JetBrains Mono", monospace';
          const dtCtPlan = getDtCtPlan(dt.jarakKm);
          ctx.fillText(dt.unit, colX[0], y + 17);
          ctx.fillText(formatIdNumber(dt.jarakKm, 3), colX[1], y + 17);
          ctx.fillText(formatMinutes(dtCtPlan, 2), colX[2], y + 17);
          ctx.fillText(formatMinutes(dt.ctActual, 2), colX[3], y + 17);
          ctx.fillText(formatMinutes(dt.ltActual, 2), colX[4], y + 17);
          ctx.fillText(formatIdNumber(dt.speedAvgActual, 1), colX[5], y + 17);
          ctx.fillText(String(dt.rit ?? '-'), colX[6], y + 17);
          y += 26;
        }
      }

      // Baris AVERAGE
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(24, y, width - 48, 28);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.fillText('AVERAGE', colX[0], y + 18);
      ctx.fillText(`${formatMeters(r.avgJarakM)} m`, colX[1], y + 18);
      ctx.fillText(formatMinutes(r.ctPlanCalculated, 2), colX[2], y + 18);
      ctx.fillText(formatMinutes(r.avgCtActual, 2), colX[3], y + 18);
      ctx.fillText(formatMinutes(r.avgServingTimeActual, 2), colX[4], y + 18);
      ctx.fillText(formatIdNumber(r.avgSpeedActual, 1), colX[5], y + 18);
      ctx.fillText(`Konv: ${formatIdNumber(r.konversi, 3)}`, colX[6], y + 18);
      y += 44;
    }

    const link = document.createElement('a');
    link.download = `VHMS_HOURLY_${activePit.replace(/\s+/g, '_')}_${displayDate.replace(
      /\s+/g,
      '_'
    )}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Kontrol Atas Laporan Jam-an */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {pits.map((pit) => (
              <button
                key={pit}
                type="button"
                onClick={() => setSelectedPit(pit)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activePit === pit
                    ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                FORMAT {pit}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span>Label Jam:</span>
            <input
              type="text"
              placeholder={defaultHourTime}
              value={customHourStr}
              onChange={(e) => setCustomHourStr(e.target.value)}
              className="w-24 px-2.5 py-1.5 font-mono text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
            />
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyText}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            {copiedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Tersalin ke Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin sebagai teks (WhatsApp)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadPng}
            className="px-3.5 py-2 text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh PNG</span>
          </button>
        </div>
      </div>

      {/* Lembar Laporan Jam-an (Menggantikan Sheet FORMAT PIT 12 / FORMAT JUMBANG) */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-6 space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-display">
              VHMS HOURLY {activePit} - {displayDate}
            </h2>
            <div className="mt-1 font-mono text-sm font-semibold text-amber-600 dark:text-amber-400">
              JAM {displayHour}
            </div>
          </div>
          <div className="text-right text-xs text-slate-500 dark:text-slate-400">
            <div>{metadata.companyJobsite}</div>
            <div className="font-mono mt-0.5">
              Data per {metadata.latestUpdatedDisplay} · {metadata.hoursLabel}
            </div>
          </div>
        </div>

        {/* Daftar Tabel per Loader */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {pitLoaders.map((r) => (
            <div
              key={r.loader.id}
              className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50/40 dark:bg-slate-950/40"
            >
              {/* Header Blok Loader */}
              <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                    {r.loader.name}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    · {r.loader.egi} · Status: {r.loader.status} · Priority:{' '}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {r.priorityLabel}
                    </strong>
                  </span>
                </div>
                <div className="text-xs font-mono tabular-nums">
                  <span className="text-slate-500">MF:</span>{' '}
                  <strong className="text-amber-600 dark:text-amber-400">
                    {formatMf(r.mf, 2)}
                  </strong>{' '}
                  <span>({r.remark})</span> ·{' '}
                  <span className="text-slate-500">Pred:</span>{' '}
                  <strong>{formatIdNumber(r.predictiveRitasi, 2)} rit/j</strong>
                </div>
              </div>

              {/* Tabel DT per Loader */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-sans">
                      <th className="py-2 px-3">Unit</th>
                      <th className="py-2 px-3 text-right">Jarak (km)</th>
                      <th className="py-2 px-3 text-right">Cycle Time Plan</th>
                      <th className="py-2 px-3 text-right">Cycle Time Actual</th>
                      <th className="py-2 px-3 text-right">Loading Time</th>
                      <th className="py-2 px-3 text-right">Speed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {r.foundVhmsRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-4 px-3 text-center font-sans text-slate-400 italic"
                        >
                          Data belum ada (n HD = {r.nHdActual})
                        </td>
                      </tr>
                    ) : (
                      r.foundVhmsRows.map((dt) => {
                        // CT Plan per DT = 60 / ((Konversi(jarak DT) x 231) / 41)
                        const dtCtPlan = getDtCtPlan(dt.jarakKm);
                        return (
                          <tr
                            key={dt.unit}
                            className="bg-white dark:bg-slate-900/60"
                          >
                            <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">
                              {dt.unit}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {formatIdNumber(dt.jarakKm, 3)}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-500">
                              {formatMinutes(dtCtPlan, 2)}
                            </td>
                            <td className="py-2 px-3 text-right font-medium text-slate-900 dark:text-slate-100">
                              {formatMinutes(dt.ctActual, 2)}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                              {formatMinutes(dt.ltActual, 2)}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">
                              {formatIdNumber(dt.speedAvgActual, 1)}
                            </td>
                          </tr>
                        );
                      })
                    )}

                    {/* Baris AVERAGE per loader: Jarak = rata-rata x 1000 (m), CT Plan dari jarak rata-rata, lainnya rata-rata sederhana */}
                    <tr className="bg-slate-100 dark:bg-slate-800/90 font-bold text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700">
                      <td className="py-2.5 px-3">AVERAGE</td>
                      <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400">
                        {r.avgJarakM !== null ? `${formatMeters(r.avgJarakM)} m` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {formatMinutes(r.ctPlanCalculated, 2)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {formatMinutes(r.avgCtActual, 2)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {formatMinutes(r.avgServingTimeActual, 2)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {formatIdNumber(r.avgSpeedActual, 1)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
