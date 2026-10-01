import {
  AssignedDtValidation,
  GlobalParams,
  KonversiJarakRow,
  LoaderCalculationResult,
  MasterLoader,
  MfRemark,
  ReviewMfInput,
  ReviewMfResult,
  VhmsRow,
} from '../types';
import { lookupKonversi } from '../data/konversiJarak';

/**
 * Normalisasi input nomor DT menjadi array unik berformat "DT####" (Bagian 4D).
 * Menerima format "4553", "DT4553", "dt 4553", dipisah koma, spasi, titik koma, atau baris baru.
 * Menolak token yang tidak mengandung angka.
 */
export function normalizeDtInputList(rawInput: string | string[]): string[] {
  const text = Array.isArray(rawInput) ? rawInput.join(' ') : rawInput;
  if (!text || !text.trim()) return [];

  // Tangkap pola opsional "DT" diikuti spasi opsional dan deretan digit, atau deretan digit mandiri
  const cleaned = text.replace(/dt\s*/gi, 'DT');
  const tokens = cleaned.split(/[,;\s\r\n]+/).map((t) => t.trim()).filter(Boolean);

  const seen = new Set<string>();
  const result: string[] = [];

  for (const token of tokens) {
    const match = token.match(/^(?:DT)?(\d+)$/i);
    if (match && match[1]) {
      const normalized = `DT${match[1]}`;
      if (!seen.has(normalized)) {
        seen.add(normalized);
        result.push(normalized);
      }
    }
  }

  return result;
}

/**
 * Normalisasi nama loader untuk pencocokan "Tempel banyak" (abaikan huruf besar/kecil dan spasi: "EX1217" === "EX 1217").
 */
export function normalizeLoaderKey(name: string): string {
  return name.replace(/\s+/g, '').toUpperCase();
}

/**
 * 5.1 Agregasi rata-rata sederhana atau berbobot RIT (Excel: blok "VHMS HOURLY PIT 12", baris AVERAGE).
 * Di Excel: AVERAGE(range), mengabaikan sel kosong/null.
 * Jika opsi weightedByRit aktif, dihitung SUMPRODUCT(nilai, RIT) / SUM(RIT).
 */
export function computeAverage(
  rows: VhmsRow[],
  getter: (r: VhmsRow) => number | null,
  weightedByRit: boolean = false
): number | null {
  const validPairs: Array<{ val: number; weight: number }> = [];

  for (const r of rows) {
    const val = getter(r);
    if (val !== null && Number.isFinite(val)) {
      const weight = weightedByRit ? (r.rit !== null && r.rit > 0 ? r.rit : 1) : 1;
      validPairs.push({ val, weight });
    }
  }

  if (validPairs.length === 0) return null;

  if (!weightedByRit) {
    const sum = validPairs.reduce((acc, p) => acc + p.val, 0);
    return sum / validPairs.length;
  } else {
    const totalWeight = validPairs.reduce((acc, p) => acc + p.weight, 0);
    if (totalWeight <= 0) return null;
    const weightedSum = validPairs.reduce((acc, p) => acc + p.val * p.weight, 0);
    return weightedSum / totalWeight;
  }
}

/**
 * 5.3 Plan Kebutuhan HD (n Hauler Plan)
 * Rumus Excel (tabel "Plan Kebutuhan HD"):
 * Sel I8 = F8 / (G8 * H8) dan F20 = F8 / (G8 * VLOOKUP(E20, tabel_konversi, 3, 1))
 * Di mana:
 * - F8 = Plan Prodty Loader (default 540 ton/jam)
 * - G8 = Plan Prodty Hauler (default 235 atau 231 ton/jam)
 * - H8 = Konversi dari jarak rata-rata aktual (E8 = E20)
 */
export function calcPlanKebutuhanHd(
  planProdtyLoader: number,
  planProdtyHauler: number,
  konversi: number | null
): number | null {
  if (
    konversi === null ||
    !Number.isFinite(konversi) ||
    konversi <= 0 ||
    planProdtyHauler <= 0
  ) {
    return null;
  }
  const denom = planProdtyHauler * konversi;
  if (denom <= 0) return null;
  return planProdtyLoader / denom;
}

/**
 * 5.4 Cycle Time Plan (menit)
 * Rumus Excel: = 60 / ((VLOOKUP(E, tabel_konversi, 3, 1) * 231) / 41)
 * Dihitung dari jarak rata-rata aktual (melalui nilai Konversi), BUKAN rata-rata kolom CT Plan di file VHMS.
 */
export function calcCtPlanFromKonversi(
  konversi: number | null,
  ctPlanProdtyConst: number = 231,
  payloadPerRit: number = 41
): number | null {
  if (
    konversi === null ||
    !Number.isFinite(konversi) ||
    konversi <= 0 ||
    ctPlanProdtyConst <= 0 ||
    payloadPerRit <= 0
  ) {
    return null;
  }
  const rate = (konversi * ctPlanProdtyConst) / payloadPerRit;
  if (rate <= 0) return null;
  return 60 / rate;
}

/**
 * 5.5 Match Factor (MF)
 * Rumus Excel (tabel "Potensial Hanging/Waiting"):
 * Sel L = (G * I) / K
 * Di mana:
 * - G = n HD Actual (jumlah DT yang diinput untuk loader pada jam itu, atau nilai override)
 * - I = Serving Time Actual rata-rata (LOADING TIME Actual rata-rata)
 * - K = CT Actual rata-rata (CYCLE TIME Actual rata-rata)
 */
export function calcMatchFactor(
  nHdActual: number,
  servingTimeActual: number | null,
  ctActual: number | null
): number | null {
  if (
    nHdActual <= 0 ||
    servingTimeActual === null ||
    ctActual === null ||
    !Number.isFinite(servingTimeActual) ||
    !Number.isFinite(ctActual) ||
    ctActual <= 0
  ) {
    return null;
  }
  return (nHdActual * servingTimeActual) / ctActual;
}

/**
 * 5.5 Remarks (Gantung / OK / Antri)
 * Di Excel terdapat tabel remark:
 * - MF < 0,895 (termasuk < 0,1) = "Potensi Gantung" (loader menunggu hauler)
 * - 0,895 <= MF < 1,005 = "OK"
 * - MF >= 1,005 = "Potensi Antri" (hauler mengantri)
 */
export function calcMfRemark(
  mf: number | null,
  lowerThreshold: number = 0.895,
  upperThreshold: number = 1.005
): MfRemark {
  if (mf === null || !Number.isFinite(mf)) return 'Data belum ada';
  if (mf < lowerThreshold) return 'Potensi Gantung';
  if (mf < upperThreshold) return 'OK';
  return 'Potensi Antri';
}

/**
 * 5.5 Durasi Gantung/Antri (menit/jam)
 * Rumus Excel: = 60 - (L * 60)
 * Di mana L adalah Match Factor (MF).
 * Positif = menit loader menunggu (gantung) per jam; Negatif = menit hauler antri per jam.
 */
export function calcDurasiMenitPerJam(mf: number | null): number | null {
  if (mf === null || !Number.isFinite(mf)) return null;
  return 60 - mf * 60;
}

/**
 * 5.5 Predictive Ritasi (rit/jam)
 * Rumus Excel: = (L * (R - S)) / I
 * Di mana:
 * - L = Match Factor (MF)
 * - R = WH (Working Hours dalam menit, default 60)
 * - S = Delay (dalam menit, default 0)
 * - I = Serving Time Actual rata-rata (selalu memakai Serving Time ACTUAL)
 */
export function calcPredictiveRitasi(
  mf: number | null,
  wh: number,
  delay: number,
  servingTimeActual: number | null
): number | null {
  if (
    mf === null ||
    servingTimeActual === null ||
    !Number.isFinite(mf) ||
    !Number.isFinite(servingTimeActual) ||
    servingTimeActual <= 0
  ) {
    return null;
  }
  const effectiveMinutes = Math.max(0, wh - delay);
  return (mf * effectiveMinutes) / servingTimeActual;
}

/**
 * 5.1 - 5.6 Hitung seluruh metrik dan peringkat Priority (P1, P2, dst.) untuk semua loader.
 * Rumus Priority Excel (baris 48-54 dan tabel SORT di baris 148):
 * = SORT(C48:K53, H48:H53, TRUE) -> Urutkan berdasarkan Predictive Ritasi dari TERKECIL ke TERBESAR.
 * Yang terkecil = P1, berikutnya P2, dst. Loader tanpa data diletakkan paling bawah tanpa label prioritas.
 */
export function calculateAllLoaders(
  loaders: MasterLoader[],
  assignments: Record<string, string[]>,
  vhmsRows: VhmsRow[],
  konversiTable: KonversiJarakRow[],
  params: GlobalParams
): LoaderCalculationResult[] {
  // Peta cepat UNIT -> VhmsRow (pencarian di seluruh file, tidak peduli LOCATION)
  const vhmsByUnit = new Map<string, VhmsRow>();
  for (const row of vhmsRows) {
    if (row.unit) {
      vhmsByUnit.set(row.unit.toUpperCase(), row);
    }
  }

  // Peta DT -> daftar nama loader yang menggunakannya (untuk deteksi DT dobel antar loader)
  const dtUsageByLoaders = new Map<string, string[]>();
  for (const loader of loaders) {
    const units = normalizeDtInputList(assignments[loader.id] || []);
    for (const u of units) {
      const list = dtUsageByLoaders.get(u) || [];
      list.push(loader.name);
      dtUsageByLoaders.set(u, list);
    }
  }

  const initialResults: LoaderCalculationResult[] = loaders.map((loader) => {
    const assignedUnits = normalizeDtInputList(assignments[loader.id] || []);
    const dtValidations: AssignedDtValidation[] = [];
    const foundVhmsRows: VhmsRow[] = [];

    for (const unit of assignedUnits) {
      const vhmsRow = vhmsByUnit.get(unit.toUpperCase()) || null;
      const allLoadersUsing = dtUsageByLoaders.get(unit) || [];
      const duplicateLoaders = allLoadersUsing.filter((name) => name !== loader.name);
      const differentPit =
        vhmsRow &&
        vhmsRow.location &&
        vhmsRow.location.trim().toUpperCase() !== loader.pit.trim().toUpperCase()
          ? vhmsRow.location
          : null;
      const smallSample =
        vhmsRow !== null && vhmsRow.rit !== null && vhmsRow.rit < 3;

      dtValidations.push({
        unit,
        foundInVhms: vhmsRow !== null,
        vhmsRow,
        duplicateLoaders,
        differentPit,
        smallSample,
      });

      if (vhmsRow) {
        foundVhmsRows.push(vhmsRow);
      }
    }

    const nHdInputCount = assignedUnits.length;
    const nHdActual =
      loader.overrideNHdActual !== null &&
      loader.overrideNHdActual !== undefined &&
      loader.overrideNHdActual > 0
        ? loader.overrideNHdActual
        : nHdInputCount;
    const nHdFoundInVhms = foundVhmsRows.length;
    const hasData = nHdFoundInVhms > 0;

    // 5.1 Agregasi data VHMS per loader
    const avgJarakKm = hasData
      ? computeAverage(foundVhmsRows, (r) => r.jarakKm, params.weightedByRit)
      : null;
    // Jarak rata-rata (m) = AVERAGE(JARAK km semua DT) x 1000
    const avgJarakM = avgJarakKm !== null ? avgJarakKm * 1000 : null;
    const avgCtPlanVhms = hasData
      ? computeAverage(foundVhmsRows, (r) => r.ctPlan, params.weightedByRit)
      : null;
    const avgCtActual = hasData
      ? computeAverage(foundVhmsRows, (r) => r.ctActual, params.weightedByRit)
      : null;
    const avgServingTimeActual = hasData
      ? computeAverage(foundVhmsRows, (r) => r.ltActual, params.weightedByRit)
      : null;
    const avgSpeedPlan = hasData
      ? computeAverage(foundVhmsRows, (r) => r.speedAvgPlan, params.weightedByRit)
      : null;
    const avgSpeedActual = hasData
      ? computeAverage(foundVhmsRows, (r) => r.speedAvgActual, params.weightedByRit)
      : null;
    const avgEstActual = hasData
      ? computeAverage(foundVhmsRows, (r) => r.estActual, params.weightedByRit)
      : null;
    const avgLstActual = hasData
      ? computeAverage(foundVhmsRows, (r) => r.lstActual, params.weightedByRit)
      : null;
    // Perhatian Travel Time: mengambil kolom TRAVEL TIME Actual (bukan Loading Time Plan)
    const avgTravelActual = hasData
      ? computeAverage(foundVhmsRows, (r) => r.travelActual, params.weightedByRit)
      : null;
    const avgProdtyActual = hasData
      ? computeAverage(foundVhmsRows, (r) => r.prodtyActual, params.weightedByRit)
      : null;

    // 5.2 Konversi: VLOOKUP(Jarak rata-rata (m), tabel konversi, 3, TRUE)
    const konversi =
      avgJarakM !== null ? lookupKonversi(avgJarakM, konversiTable) : null;

    // 5.3 Plan Kebutuhan HD: Plan Prodty Loader / (Plan Prodty Hauler * Konversi)
    const planKebutuhanHd = calcPlanKebutuhanHd(
      loader.planProdtyLoader,
      params.planProdtyHauler,
      konversi
    );

    // 5.4 Cycle Time Plan: 60 / ((Konversi * 231) / 41)
    const ctPlanCalculated = calcCtPlanFromKonversi(
      konversi,
      params.ctPlanProdtyConst,
      params.payloadPerRit
    );

    // 5.5 Match Factor & turunannya
    const mf = hasData
      ? calcMatchFactor(nHdActual, avgServingTimeActual, avgCtActual)
      : null;
    const remark = calcMfRemark(mf, params.mfLowerThreshold, params.mfUpperThreshold);
    const durasiMenitPerJam = calcDurasiMenitPerJam(mf);
    const wh = loader.wh ?? params.defaultWh;
    const delay = loader.delay ?? params.defaultDelay;
    const predictiveRitasi = calcPredictiveRitasi(mf, wh, delay, avgServingTimeActual);

    return {
      loader,
      assignedUnits,
      dtValidations,
      foundVhmsRows,
      nHdInputCount,
      nHdActual,
      nHdFoundInVhms,
      hasData,
      avgJarakKm,
      avgJarakM,
      avgCtPlanVhms,
      avgCtActual,
      avgServingTimeActual,
      avgSpeedPlan,
      avgSpeedActual,
      avgEstActual,
      avgLstActual,
      avgTravelActual,
      avgProdtyActual,
      konversi,
      planKebutuhanHd,
      ctPlanCalculated,
      mf,
      remark,
      durasiMenitPerJam,
      predictiveRitasi,
      priorityRank: null,
      priorityLabel: '-',
    };
  });

  // 5.6 Hitung Priority per Pit berdasarkan Predictive Ritasi dari TERKECIL ke TERBESAR
  const pits = Array.from(new Set(initialResults.map((r) => r.loader.pit)));
  for (const pit of pits) {
    const pitLoaders = initialResults.filter((r) => r.loader.pit === pit);
    const eligibleForPriority = pitLoaders.filter((r) => {
      if (r.predictiveRitasi === null || !Number.isFinite(r.predictiveRitasi)) {
        return false;
      }
      if (!params.includeNonOnInPriority) {
        return r.loader.status.trim().toUpperCase() === 'ON';
      }
      return true;
    });

    eligibleForPriority.sort((a, b) => (a.predictiveRitasi ?? 0) - (b.predictiveRitasi ?? 0));

    eligibleForPriority.forEach((item, idx) => {
      item.priorityRank = idx + 1;
      item.priorityLabel = `P${idx + 1}`;
    });
  }

  return initialResults;
}

/**
 * 5.7 Review MF setelah penarikan ritasi (Excel: sheet Rumus / FIX RUMUS bagian "SETELAH PENARIKAN RITASI")
 * - HM Efektif (jam) = HM Akhir - HM Jam Sebelumnya
 * - Productivity Loader Actual (ton/jam) = (Ritasi * payload 41) / HM Efektif. Excel: =(F*41)/((P*60)/60)
 * - MF Review = (n HD * Productivity Hauler Actual * Konversi) / Productivity Loader Actual.
 *   Excel: =E*J*VLOOKUP(jarak_actual, tabel, 3, 1)/H
 */
export function calculateReviewMf(
  calcResult: LoaderCalculationResult,
  input: ReviewMfInput | undefined,
  params: GlobalParams
): ReviewMfResult {
  const nHd =
    input?.nHdOverride !== null &&
    input?.nHdOverride !== undefined &&
    input.nHdOverride > 0
      ? input.nHdOverride
      : calcResult.nHdActual;

  const ritasi = input?.ritasi ?? null;
  const hmPrev = input?.hmPrev ?? null;
  const hmEnd = input?.hmEnd ?? null;

  let hmEfektif: number | null = null;
  if (hmPrev !== null && hmEnd !== null && hmEnd > hmPrev) {
    hmEfektif = hmEnd - hmPrev;
  }

  let prodtyLoaderActual: number | null = null;
  if (ritasi !== null && ritasi >= 0 && hmEfektif !== null && hmEfektif > 0) {
    // Excel: =(F*41)/((P*60)/60)
    prodtyLoaderActual = (ritasi * params.payloadPerRit) / hmEfektif;
  }

  const prodtyHaulerActual =
    input?.prodtyHaulerOverride !== null && input?.prodtyHaulerOverride !== undefined
      ? input.prodtyHaulerOverride
      : calcResult.avgProdtyActual;

  const konversi = calcResult.konversi;
  let mfReview: number | null = null;
  if (
    nHd > 0 &&
    prodtyHaulerActual !== null &&
    prodtyHaulerActual > 0 &&
    konversi !== null &&
    konversi > 0 &&
    prodtyLoaderActual !== null &&
    prodtyLoaderActual > 0
  ) {
    // Excel: =E*J*VLOOKUP(jarak_actual,tabel,3,1)/H
    mfReview = (nHd * prodtyHaulerActual * konversi) / prodtyLoaderActual;
  }

  const mfVhms = calcResult.mf;
  const mfDelta =
    mfReview !== null && mfVhms !== null ? mfReview - mfVhms : null;

  return {
    loader: calcResult.loader,
    nHd,
    ritasi,
    hmPrev,
    hmEnd,
    hmEfektif,
    prodtyLoaderPlan: calcResult.loader.planProdtyLoader,
    prodtyLoaderActual,
    prodtyHaulerPlan: params.planProdtyHauler,
    prodtyHaulerActual,
    avgJarakM: calcResult.avgJarakM,
    konversi,
    mfVhms,
    mfReview,
    mfDelta,
  };
}

/**
 * Format angka lokal Indonesia (koma desimal, titik ribuan):
 * Tidak pernah menampilkan NaN, Infinity, #DIV/0!, atau #N/A.
 */
export function formatIdNumber(
  value: number | null | undefined,
  decimals: number = 2,
  fallback: string = '-'
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Format MF (default 2 desimal sesuai Bagian 8, atau 3 desimal bila diminta) */
export function formatMf(value: number | null | undefined, decimals: number = 2): string {
  return formatIdNumber(value, decimals, '-');
}

/** Format menit (1 desimal sesuai Bagian 8, atau 2 desimal untuk detail) */
export function formatMinutes(value: number | null | undefined, decimals: number = 1): string {
  return formatIdNumber(value, decimals, '-');
}

/** Format jarak meter tanpa desimal sesuai Bagian 8 */
export function formatMeters(value: number | null | undefined): string {
  return formatIdNumber(value, 0, '-');
}
