import React, { useState } from 'react';
import { CheckCircle2, XCircle, Play } from 'lucide-react';
import { GlobalParams } from '../types';
import { runAllAutomatedTests, UnitTestCaseResult } from '../utils/unitTests';

interface HelpAndTestsTabProps {
  params: GlobalParams;
  rawNoteText?: string;
}

export const HelpAndTestsTab: React.FC<HelpAndTestsTabProps> = ({
  params,
  rawNoteText,
}) => {
  const [testResults, setTestResults] = useState<UnitTestCaseResult[]>(() =>
    runAllAutomatedTests()
  );

  const passedCount = testResults.filter((t) => t.passed).length;

  return (
    <div className="space-y-6">
      {/* 1. Definisi Metrik VHMS (Bagian 3) */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-lg p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            01. Definisi Metrik VHMS (Dari Catatan Bawah Tabel Raw — Sel B31)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Aplikasi tidak menghitung ulang nilai mentah VHMS ini, melainkan memakai
            nilai dari file export VHMS dan memverifikasi konsistensi datanya.
          </p>
        </div>

        {rawNoteText && (
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded font-mono text-xs text-amber-700 dark:text-amber-300">
            {rawNoteText}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              Singkatan Komponen Siklus VHMS:
            </div>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400 font-mono">
              <li>• LT  = Loading Time (menit)</li>
              <li>• EDT = Empty Drive Time (menit)</li>
              <li>• EST = Empty Stop Time (menit)</li>
              <li>• LDT = Loaded Drive Time (menit)</li>
              <li>• LST = Loaded Stop Time (menit)</li>
              <li>• EDD = Empty Drive Distance (km)</li>
              <li>• LDD = Loaded Drive Distance (km)</li>
              <li>• CONV = Faktor Konversi Jarak</li>
            </ul>
          </div>

          <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              Rumus Internal VHMS & Cek Konsistensi:
            </div>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-400 font-mono">
              <li>
                • CT PLAN = 60 / (CONV × {params.ctPlanProdtyConst} /{' '}
                {params.payloadPerRit})
              </li>
              <li>• CT ACTUAL = LT + EDT + EST + LDT + LST</li>
              <li>• TRAVEL TIME = LDT + EDT + EST + LST</li>
              <li>• SPEED = (EDD + LDD) / ((EDT + LDT) / 60)</li>
              <li>
                • PRODTY = ((60 / (EDT + EST + LST + LDT + LT)) ×{' '}
                {params.payloadPerRit}) / CONV
              </li>
              <li className="text-amber-600 dark:text-amber-400 font-sans pt-1">
                <strong>Cek Konsistensi Otomatis:</strong> CT Actual harus sama dengan{' '}
                <code>Loading Time Actual + Travel Time Actual</code> (toleransi 0,01
                menit).
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 2. Dokumentasi Seluruh Rumus Aplikasi & Asal Sel Excel (Bagian 5) */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-lg p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            02. Dokumentasi Rumus Perhitungan Match Factor & Predictive Ritasi (Bagian 5)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Seluruh rumus diimplementasikan sebagai fungsi murni di{' '}
            <code className="font-mono">src/utils/formulas.ts</code> sesuai dengan
            workbook asli <em>"MF by VHMS - Predictive Ritasi"</em>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              5.1 & 5.2 Agregasi Data VHMS & Konversi Jarak
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Hanya DT yang ditemukan di data VHMS yang ikut dirata-ratakan:
            </p>
            <div className="font-mono text-[11px] bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 space-y-1">
              <div>Jarak Rata-rata (m) = AVERAGE(JARAK_km) × 1000</div>
              <div>CT Actual = AVERAGE(CYCLE_TIME_Actual)</div>
              <div>Serving Time Actual = AVERAGE(LOADING_TIME_Actual)</div>
              <div>Konversi = VLOOKUP(Jarak_m, Tabel_Konversi, 3, TRUE)</div>
            </div>
          </div>

          <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              5.3 & 5.4 Plan Kebutuhan HD & Cycle Time Plan
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Selalu dihitung dari jarak rata-rata aktual VHMS saat ini:
            </p>
            <div className="font-mono text-[11px] bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 space-y-1">
              <div>
                n Hauler Plan = Plan_Prodty_Loader / (Plan_Prodty_Hauler × Konversi)
              </div>
              <div>Excel: =F8/(G8*H8)</div>
              <div>
                CT Plan (mnt) = 60 / ((Konversi × {params.ctPlanProdtyConst}) /{' '}
                {params.payloadPerRit})
              </div>
              <div>Excel: =60/((VLOOKUP(E,tabel,3,1)*231)/41)</div>
            </div>
          </div>

          <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              5.5 Match Factor, Durasi, & Predictive Ritasi
            </div>
            <div className="font-mono text-[11px] bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 space-y-1">
              <div>MF = (n_HD_Actual × Serving_Time_Actual) / CT_Actual</div>
              <div>Excel: =(G*I)/K</div>
              <div>Durasi (mnt/jam) = 60 - (MF × 60)  [Excel: =60-(L*60)]</div>
              <div>
                Predictive Ritasi = (MF × (WH - Delay)) / Serving_Time_Actual
              </div>
              <div>Excel: =(L*(R-S))/I</div>
            </div>
          </div>

          <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              5.6 Priority & 5.7 Review MF Setelah Penarikan Ritasi
            </div>
            <div className="font-mono text-[11px] bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 space-y-1">
              <div>Priority = Peringkat Predictive Ritasi terkecil (P1, P2...)</div>
              <div>HM Efektif = HM_Akhir - HM_Sebelumnya</div>
              <div>
                Prodty Loader Actual = (Ritasi × {params.payloadPerRit}) / HM_Efektif
              </div>
              <div>
                MF Review = (n_HD × Prodty_Hauler_Act × Konversi) / Prodty_Loader_Act
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Suite Unit Test Otomatis (Bagian 8) */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              03. Verifikasi Unit Test Otomatis (Bagian 8)
            </h2>
            <p className="text-xs text-slate-500">
              Menguji fungsi lookup konversi (approximate match), sanitasi tabel,
              rumus perhitungan lengkap (DT5886, DT5430, DT4515), dan parser VHMS.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              LULUS: {passedCount} / {testResults.length} TES
            </span>
            <button
              type="button"
              onClick={() => setTestResults(runAllAutomatedTests())}
              className="px-3.5 py-1.5 text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              Jalankan Ulang Tes
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-500 font-sans">
                <th className="py-2.5 px-3">Kategori</th>
                <th className="py-2.5 px-3">Kasus Uji (Test Case)</th>
                <th className="py-2.5 px-3">Nilai Diharapkan (Expected)</th>
                <th className="py-2.5 px-3">Hasil Aktual (Actual)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {testResults.map((tc) => (
                <tr
                  key={tc.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="py-2.5 px-3 font-sans font-medium text-slate-600 dark:text-slate-400">
                    {tc.category}
                  </td>
                  <td className="py-2.5 px-3 font-sans font-semibold text-slate-900 dark:text-slate-100">
                    {tc.name}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                    {tc.expected}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                    {tc.actual}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {tc.passed ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-sans font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        PASS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-sans font-semibold">
                        <XCircle className="w-4 h-4" />
                        FAIL
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
