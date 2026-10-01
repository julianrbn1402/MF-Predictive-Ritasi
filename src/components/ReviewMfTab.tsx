import React, { useState } from 'react';
import {
  GlobalParams,
  LoaderCalculationResult,
  ReviewMfInput,
  ReviewMfResult,
} from '../types';
import {
  formatIdNumber,
  formatMeters,
  formatMf,
} from '../utils/formulas';

interface ReviewMfTabProps {
  calcResults: LoaderCalculationResult[];
  reviewInputs: Record<string, ReviewMfInput>;
  reviewResults: ReviewMfResult[];
  params: GlobalParams;
  onUpdateReviewInput: (loaderId: string, patch: Partial<ReviewMfInput>) => void;
}

export const ReviewMfTab: React.FC<ReviewMfTabProps> = ({
  calcResults,
  reviewInputs,
  reviewResults,
  params,
  onUpdateReviewInput,
}) => {
  const pits = Array.from(new Set(calcResults.map((r) => r.loader.pit)));
  const [selectedPit, setSelectedPit] = useState<string>('ALL');

  const filteredResults =
    selectedPit === 'ALL'
      ? reviewResults
      : reviewResults.filter((r) => r.loader.pit === selectedPit);

  return (
    <div className="space-y-6">
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Review Match Factor Setelah Penarikan Ritasi (Bagian 5.7)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Rumus Excel (FIX RUMUS): HM Efektif = HM Akhir − HM Sebelumnya · Prodty Loader Actual =
            (Ritasi × {params.payloadPerRit}) / HM Efektif · MF Review = (n HD × Prodty Hauler Actual ×
            Konversi) / Prodty Loader Actual.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setSelectedPit('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              selectedPit === 'ALL'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Semua Pit
          </button>
          {pits.map((pit) => (
            <button
              key={pit}
              type="button"
              onClick={() => setSelectedPit(pit)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedPit === pit
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {pit}
            </button>
          ))}
        </div>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-sans">
                <th className="py-2.5 px-3">Pit / Loader</th>
                <th className="py-2.5 px-3 text-right">n HD</th>
                <th className="py-2.5 px-3 text-right">Ritasi</th>
                <th className="py-2.5 px-3 text-right">HM Sebelumnya</th>
                <th className="py-2.5 px-3 text-right">HM Akhir</th>
                <th className="py-2.5 px-3 text-right">HM Efektif (jam)</th>
                <th className="py-2.5 px-3 text-right">Prodty Loader (P / A)</th>
                <th className="py-2.5 px-3 text-right">Prodty Hauler (P / A)</th>
                <th className="py-2.5 px-3 text-right">Jarak (m) / Konv</th>
                <th className="py-2.5 px-3 text-right">MF by VHMS</th>
                <th className="py-2.5 px-3 text-right">MF Review</th>
                <th className="py-2.5 px-3 text-right">Selisih MF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredResults.map((res) => {
                const calc = calcResults.find((c) => c.loader.id === res.loader.id);
                const inp = reviewInputs[res.loader.id] || {
                  loaderId: res.loader.id,
                  nHdOverride: null,
                  ritasi: null,
                  hmPrev: null,
                  hmEnd: null,
                  prodtyHaulerOverride: null,
                };

                const parseNullable = (val: string): number | null => {
                  if (val.trim() === '') return null;
                  const n = Number(val.replace(',', '.'));
                  return Number.isFinite(n) ? n : null;
                };

                return (
                  <tr
                    key={res.loader.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {res.loader.name}
                      </div>
                      <div className="text-[11px] font-sans text-slate-500">
                        {res.loader.pit} · {res.loader.egi}
                      </div>
                    </td>

                    {/* n HD input (default = n HD Actual jam itu) */}
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        min={0}
                        placeholder={String(calc?.nHdActual ?? 0)}
                        value={inp.nHdOverride !== null ? inp.nHdOverride : ''}
                        onChange={(e) =>
                          onUpdateReviewInput(res.loader.id, {
                            nHdOverride: parseNullable(e.target.value),
                          })
                        }
                        className="w-16 px-2 py-1 text-right bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                      <div className="text-[10px] font-sans text-slate-400 mt-0.5">
                        Dipakai: {res.nHd}
                      </div>
                    </td>

                    {/* Ritasi */}
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        min={0}
                        step="1"
                        placeholder="Rit..."
                        value={inp.ritasi !== null ? inp.ritasi : ''}
                        onChange={(e) =>
                          onUpdateReviewInput(res.loader.id, {
                            ritasi: parseNullable(e.target.value),
                          })
                        }
                        className="w-20 px-2 py-1 text-right bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </td>

                    {/* HM Jam Sebelumnya */}
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="HM awal..."
                        value={inp.hmPrev !== null ? inp.hmPrev : ''}
                        onChange={(e) =>
                          onUpdateReviewInput(res.loader.id, {
                            hmPrev: parseNullable(e.target.value),
                          })
                        }
                        className="w-24 px-2 py-1 text-right bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </td>

                    {/* HM Akhir */}
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="HM akhir..."
                        value={inp.hmEnd !== null ? inp.hmEnd : ''}
                        onChange={(e) =>
                          onUpdateReviewInput(res.loader.id, {
                            hmEnd: parseNullable(e.target.value),
                          })
                        }
                        className="w-24 px-2 py-1 text-right bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </td>

                    {/* HM Efektif */}
                    <td className="py-3 px-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                      {res.hmEfektif !== null ? formatIdNumber(res.hmEfektif, 2) : '-'}
                    </td>

                    {/* Prodty Loader Plan vs Actual */}
                    <td className="py-3 px-3 text-right">
                      <span className="text-slate-400">
                        {formatIdNumber(res.prodtyLoaderPlan, 0)}
                      </span>{' '}
                      /{' '}
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {res.prodtyLoaderActual !== null
                          ? formatIdNumber(res.prodtyLoaderActual, 1)
                          : '-'}
                      </span>
                    </td>

                    {/* Prodty Hauler Plan vs Actual (bisa di-override) */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-slate-400">
                          {formatIdNumber(res.prodtyHaulerPlan, 0)} /
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          placeholder={
                            calc?.avgProdtyActual !== null &&
                            calc?.avgProdtyActual !== undefined
                              ? calc.avgProdtyActual.toFixed(1)
                              : '-'
                          }
                          value={
                            inp.prodtyHaulerOverride !== null
                              ? inp.prodtyHaulerOverride
                              : ''
                          }
                          onChange={(e) =>
                            onUpdateReviewInput(res.loader.id, {
                              prodtyHaulerOverride: parseNullable(e.target.value),
                            })
                          }
                          className="w-20 px-2 py-1 text-right bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div className="text-[10px] font-sans text-slate-400 mt-0.5">
                        Dipakai: {formatIdNumber(res.prodtyHaulerActual, 1)} t/j
                      </div>
                    </td>

                    {/* Jarak & Konversi */}
                    <td className="py-3 px-3 text-right">
                      {res.avgJarakM !== null ? (
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {formatMeters(res.avgJarakM)} m
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Konv: {formatIdNumber(res.konversi, 3)}
                          </div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* MF by VHMS */}
                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatMf(res.mfVhms, 2)}
                    </td>

                    {/* MF Review */}
                    <td className="py-3 px-3 text-right font-bold text-amber-600 dark:text-amber-400">
                      {formatMf(res.mfReview, 2)}
                    </td>

                    {/* Selisih MF */}
                    <td className="py-3 px-3 text-right">
                      {res.mfDelta !== null ? (
                        <span
                          className={
                            Math.abs(res.mfDelta) > 0.1
                              ? 'text-rose-600 dark:text-rose-400 font-bold'
                              : 'text-emerald-600 dark:text-emerald-400 font-semibold'
                          }
                        >
                          {res.mfDelta > 0 ? '+' : ''}
                          {formatIdNumber(res.mfDelta, 2)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
