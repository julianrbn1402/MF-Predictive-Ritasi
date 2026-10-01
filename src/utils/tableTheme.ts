import { LoaderCalculationResult } from '../types';

/**
 * 13-Column Symmetrical Grid shared across Table 1, Table 2, and Table 3 (VHMS HOURLY).
 * Total width = 946px.
 *
 * Pemetaan Kolom (1 s/d 13):
 * - Col 0 (80px) : [T1] Lokasi Pit | [T2] Lokasi Pit | [T3] PC (colSpan 2 bersama Col 1)
 * - Col 1 (92px) : [T1] Loader     | [T2] Loader     | [T3] (bagian dari PC)
 * - Col 2 (102px): [T1] EGI        | [T2] Jumlah HD  | [T3] UNIT (Hijau Input)
 * - Col 3 (102px): [T1] Jarak VHMS | [T2] Serving Tm | [T3] UNIT (DT####)
 * - Col 4 (66px) : [T1] nHD Plan   | [T2] Cycle Time | [T3] Jarak (km)
 * - Col 5 (66px) : [T1] nHD Actual | [T2] MF Aktual  | [T3] CT Plan
 * - Col 6 (78px) : [T1] ST Plan    | [T2] Pred Rit   | [T3] CT Actual
 * - Col 7 (56px) : [T1] ST Actual  | [T2] Gantung/Antri (colSpan 2) | [T3] Loading Time (colSpan 2)
 * - Col 8 (56px) : [T1] CT Plan    | [T2] (bagian Gantung/Antri)    | [T3] (bagian Loading Time)
 * - Col 9 (74px) : [T1] CT Actual  | [T2] Durasi     | [T3] Speed
 * - Col 10 (66px): [T1] MF (colSpan 3: Col 10+11+12) | [T2] Priority | [T3] Plan Speed
 * - Col 11 (54px): [T1] (bagian MF) | [T2] Remarks (colSpan 2: Col 11+12) | [T3] EST
 * - Col 12 (54px): [T1] (bagian MF) | [T2] (bagian Remarks)               | [T3] LST
 */
export const SYMMETRIC_COL_WIDTHS = [
  80,  // Col 0
  92,  // Col 1
  102, // Col 2
  102, // Col 3
  66,  // Col 4
  66,  // Col 5
  78,  // Col 6
  56,  // Col 7
  56,  // Col 8
  74,  // Col 9
  66,  // Col 10
  54,  // Col 11
  54,  // Col 12
] as const;

export const TOTAL_TABLE_WIDTH = SYMMETRIC_COL_WIDTHS.reduce((a, b) => a + b, 0); // 946px

export interface CellColorStyle {
  bg: string;
  fg: string;
}

/**
 * Palet Warna Terang, Bersih, Estetik, dan Konsisten Antar-Kolom & Antar-Baris
 * (Digunakan bersama oleh UI Aplikasi dan Export PNG)
 */
export const TABLE_PALETTE = {
  border: '#94A3B8', // Slate-400 garis tabel rapi & lembut
  outerBorder: '#334155', // Slate-700 bingkai luar tegas

  // Header seragam di seluruh Tabel 1, 2, dan 3
  headerMain: { bg: '#DBEAFE', fg: '#1E3A8A' }, // Biru langit terang & profesional (Header Utama)
  headerSub: { bg: '#EFF6FF', fg: '#1E40AF' }, // Biru es terang (Sub-header Plan/Actual)
  bannerSection: { bg: '#BFDBFE', fg: '#1E3A8A' }, // Banner seksi VHMS HOURLY senada header

  // Kolom Identitas & Data Dasar yang konsisten
  pitColumn: { bg: '#F1F5F9', fg: '#0F172A' }, // Abu-biru terang untuk kolom Lokasi Pit
  loaderColumn: { bg: '#F8FAFC', fg: '#0F172A' }, // Alabaster terang untuk kolom Loader / PC
  planColumn: { bg: '#F8FAFC', fg: '#334155' }, // Warna seragam untuk seluruh kolom Plan
  dataWhite: { bg: '#FFFFFF', fg: '#0F172A' }, // Putih bersih untuk sel data standar

  // Baris AVERAGE & Input
  averageRow: { bg: '#E0E7FF', fg: '#1E1B4B' }, // Indigo pastel terang untuk baris AVERAGE
  averageCross: { bg: '#FFE4E6', fg: '#9F1239' }, // Merah muda lembut untuk tanda X
  unitInputGreen: { bg: '#A7F3D0', fg: '#064E3B' }, // Hijau mint terang untuk input UNIT
  missingGray: { bg: '#E2E8F0', fg: '#64748B' }, // Abu terang bersih jika DT tidak ada di VHMS

  // Status Format Bersyarat (Conditional Formatting) - Terang & Kontras Jelas
  statusGreen: { bg: '#86EFAC', fg: '#064E3B' }, // Hijau mint cerah (OK / Sesuai Plan)
  statusYellow: { bg: '#FDE68A', fg: '#78350F' }, // Kuning amber pastel cerah (Potensi Gantung / > Plan)
  statusRed: { bg: '#FCA5A5', fg: '#7F1D1D' }, // Merah koral pastel cerah (Potensi Antri / > Plan)
};

export function getServingTimeStyle(
  stActual: number | null,
  planServingTime: number
): CellColorStyle {
  if (stActual === null) return TABLE_PALETTE.dataWhite;
  return stActual > planServingTime
    ? TABLE_PALETTE.statusRed
    : TABLE_PALETTE.statusGreen;
}

export function getCycleTimeActualStyle(
  ctActual: number | null,
  ctPlan: number | null
): CellColorStyle {
  if (ctActual === null) return TABLE_PALETTE.dataWhite;
  if (ctPlan !== null && ctActual > ctPlan) {
    return TABLE_PALETTE.statusYellow;
  }
  return TABLE_PALETTE.statusGreen;
}

export function getMfStyle(
  remark: LoaderCalculationResult['remark']
): CellColorStyle {
  if (remark === 'OK') return TABLE_PALETTE.statusGreen;
  if (remark === 'Potensi Antri') return TABLE_PALETTE.statusRed;
  if (remark === 'Potensi Gantung') return TABLE_PALETTE.statusYellow;
  return TABLE_PALETTE.dataWhite;
}

export function getDurasiStyle(
  durasi: number | null,
  remark: LoaderCalculationResult['remark']
): CellColorStyle {
  if (durasi === null) return TABLE_PALETTE.dataWhite;
  if (remark === 'OK') return { bg: '#DCFCE7', fg: '#14532D' };
  if (remark === 'Potensi Antri') return { bg: '#FFE4E6', fg: '#881337' };
  if (remark === 'Potensi Gantung') return { bg: '#FEF3C7', fg: '#78350F' };
  return TABLE_PALETTE.dataWhite;
}

export function getPredRitasiStyle(val: number | null): CellColorStyle {
  if (val === null) return TABLE_PALETTE.dataWhite;
  if (val >= 13.5) return { bg: '#86EFAC', fg: '#064E3B' }; // Hijau mint
  if (val >= 12.2) return { bg: '#BEF264', fg: '#365314' }; // Hijau limau terang
  if (val >= 10.5) return { bg: '#FDE68A', fg: '#78350F' }; // Kuning amber terang
  return { bg: '#FDBA74', fg: '#7C2D12' }; // Oranye pastel terang
}

export function getPriorityStyle(rank: number | null): CellColorStyle {
  if (rank === 1) return { bg: '#FCA5A5', fg: '#7F1D1D' }; // P1 Merah Koral Terang
  if (rank === 2) return { bg: '#FDBA74', fg: '#7C2D12' }; // P2 Oranye Pastel Terang
  if (rank === 3) return { bg: '#FDE68A', fg: '#78350F' }; // P3 Kuning Emas Terang
  return TABLE_PALETTE.planColumn; // P4+ Netral Terang
}

export function getDtMetricStyle(
  isWorse: boolean,
  isSpeedCol: boolean = false
): CellColorStyle {
  if (isWorse) {
    return { bg: '#FECDD3', fg: '#881337' }; // Merah muda pastel terang dengan teks merah tua
  }
  if (isSpeedCol) {
    return { bg: '#BBF7D0', fg: '#064E3B' }; // Hijau mint lembut
  }
  return { bg: '#DCFCE7', fg: '#14532D' }; // Hijau pastel lembut
}
