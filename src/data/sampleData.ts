import {
  GlobalParams,
  HourlySnapshot,
  MasterLoader,
  ReviewMfInput,
  VhmsMetadata,
  VhmsRow,
} from '../types';

export const DEFAULT_GLOBAL_PARAMS: GlobalParams = {
  planProdtyHauler: 235,
  ctPlanProdtyConst: 231,
  payloadPerRit: 41,
  planServingTime: 3.73,
  defaultWh: 60,
  defaultDelay: 0,
  mfLowerThreshold: 0.895,
  mfUpperThreshold: 1.005,
  weightedByRit: false,
  includeNonOnInPriority: true,
};

export const DEFAULT_MASTER_LOADERS: MasterLoader[] = [
  // PIT 11 (Persis sesuai gambar contoh pengguna)
  {
    id: 'ldr-ex1233',
    pit: 'PIT 11',
    name: 'EX 1233',
    egi: 'PC1250SP8',
    planProdtyLoader: 540,
    status: 'ON',
    repairPriorityNote: '',
    wh: 60,
    delay: 0,
    overrideNHdActual: null,
  },
  {
    id: 'ldr-ex1217-p11',
    pit: 'PIT 11',
    name: 'EX 1217',
    egi: 'PC1250SP8',
    planProdtyLoader: 540,
    status: 'ON',
    repairPriorityNote: '',
    wh: 60,
    delay: 0,
    overrideNHdActual: null,
  },
  {
    id: 'ldr-ex1104',
    pit: 'PIT 11',
    name: 'EX 1104',
    egi: 'PC1250SP8',
    planProdtyLoader: 540,
    status: 'ON',
    repairPriorityNote: '',
    wh: 60,
    delay: 0,
    overrideNHdActual: null,
  },
  {
    id: 'ldr-ex1191',
    pit: 'PIT 11',
    name: 'EX 1191',
    egi: 'PC1250SP11',
    planProdtyLoader: 540,
    status: 'ON',
    repairPriorityNote: '',
    wh: 60,
    delay: 0,
    overrideNHdActual: null,
  },
  // PIT 12
  {
    id: 'ldr-ex1169',
    pit: 'PIT 12',
    name: 'EX 1169',
    egi: 'PC1250SP8',
    planProdtyLoader: 540,
    status: 'ON',
    repairPriorityNote: '',
    wh: 60,
    delay: 0,
    overrideNHdActual: null,
  },
  {
    id: 'ldr-ex1204',
    pit: 'PIT 12',
    name: 'EX 1204',
    egi: 'PC1250SP8R',
    planProdtyLoader: 540,
    status: 'ON',
    repairPriorityNote: '',
    wh: 60,
    delay: 0,
    overrideNHdActual: null,
  },
  // JUMBANG
  {
    id: 'ldr-ex1142',
    pit: 'JUMBANG',
    name: 'EX 1142',
    egi: 'PC1250SP8',
    planProdtyLoader: 540,
    status: 'ON',
    repairPriorityNote: '',
    wh: 60,
    delay: 0,
    overrideNHdActual: null,
  },
];

export const SAMPLE_VHMS_METADATA: VhmsMetadata = {
  fileName: 'VHMS_Hourly_R2_ARIA_01Oct2026.xlsx',
  sheetName: 'VHMS Hourly R2',
  availableSheets: ['VHMS Hourly R2'],
  companyJobsite: 'PT. PAMAPERSADA NUSANTARA / Jobsite ARIA - Kalimantan Selatan',
  rawDateText: 'VHMS, 01 Oct 2026',
  parsedDateDisplay: '01 Okt 2026',
  rawHoursText: 'Jam: 06, 07, 08',
  hours: [6, 7, 8],
  hoursLabel: 'Data jam 06-08',
  latestUpdatedDisplay: '01 Okt 2026 08:06',
  totalRows: 22,
  pitCounts: {
    'PIT 11': 15,
    'PIT 12': 5,
    JUMBANG: 2,
  },
  missingRequiredColumns: [],
  headerRow1Index: 6,
  headerRow2Index: 7,
  detectedColumns: [],
  columnMapping: {
    location: 1,
    no: 5,
    unit: 6,
    rit: 7,
    jarakKm: 8,
    konv: 9,
    updatedRaw: 11,
    bd: 12,
    ctPlan: 13,
    ctActual: 14,
    ctCompl: 16,
    ltPlan: 17,
    ltActual: 18,
    travelPlan: 19,
    travelActual: 20,
    engOffActual: 21,
    speedAvgPlan: 22,
    speedAvgActual: 23,
    emptySpeedPlan: 24,
    emptySpeedActual: 25,
    loadedSpeedPlan: 26,
    loadedSpeedActual: 27,
    estPlan: 28,
    estActual: 29,
    lstPlan: 31,
    lstActual: 32,
    aglGradePlan: 33,
    aglGradeActual: 34,
    payloadPlan: 35,
    payloadActual: 36,
    prodtyPlan: 37,
    prodtyActual: 38,
  },
  rawNoteText:
    'NOTE : CT PLAN = 60 / (CONV x 231 / 41) | CT ACTUAL = LT + EDT + EST + LDT + LST | SPEED = (EDD + LDD) / ((EDT + LDT) / 60) | PRODTY = ((60 / (EDT + EST + LST + LDT + LT)) x 41) / CONV',
};

function makeRow(
  idx: number,
  location: string,
  unit: string,
  rit: number,
  jarakKm: number,
  konv: number,
  ctPlan: number,
  ctActual: number,
  ltActual: number,
  speedAvgPlan: number,
  speedAvgActual: number,
  estActual: number,
  lstActual: number,
  prodtyActual: number = 225,
  updatedRaw: string = '20261001 08:06'
): VhmsRow {
  const dtNumber = unit.replace(/\D+/g, '');
  const travelActual = Number((ctActual - ltActual).toFixed(4));
  const travelPlan = Number(Math.max(5, ctPlan - 3.73).toFixed(2));
  const ctCompl = Number(Math.min(1, ctPlan / ctActual).toFixed(3));

  return {
    rowIndex: idx + 8,
    location,
    no: idx,
    unit,
    dtNumber,
    rit,
    jarakKm,
    konv,
    updatedRaw,
    updatedDate: '01 Okt 2026 08:06',
    bd: 0,
    ctPlan,
    ctActual,
    ctCompl,
    ltPlan: 3.73,
    ltActual,
    travelPlan,
    travelActual,
    engOffActual: 0,
    speedAvgPlan,
    speedAvgActual,
    emptySpeedPlan: Number((speedAvgPlan + 3.0).toFixed(2)),
    emptySpeedActual: Number((speedAvgActual + 2.8).toFixed(2)),
    loadedSpeedPlan: Number((speedAvgPlan - 3.0).toFixed(2)),
    loadedSpeedActual: Number((speedAvgActual - 2.8).toFixed(2)),
    estPlan: 1.0,
    estActual,
    lstPlan: 0.15,
    lstActual,
    aglGradePlan: 4.0,
    aglGradeActual: 4.2,
    payloadPlan: 41.0,
    payloadActual: 41.0,
    prodtyPlan: 231.0,
    prodtyActual,
    consistencyWarning: null,
  };
}

export const SAMPLE_VHMS_ROWS: VhmsRow[] = [
  // === PIT 11: EX 1233 (persis seperti gambar) ===
  makeRow(1, 'PIT 11', 'DT4514', 5, 1.3, 0.856, 12.55, 13.03, 3.35, 22.78, 22.62, 2.53, 0.15),
  makeRow(2, 'PIT 11', 'DT4507', 4, 2.2, 0.632, 16.87, 18.83, 4.2, 24.17, 19.4, 0.63, 0.07),
  makeRow(3, 'PIT 11', 'DT4376', 4, 1.2, 0.898, 11.76, 16.7, 4.0, 22.3, 14.11, 2.75, 0.1),
  makeRow(4, 'PIT 11', 'DT5547', 4, 2.8, 0.555, 19.17, 19.95, 3.8, 24.95, 25.41, 2.35, 0.55),

  // === PIT 11: EX 1217 (persis seperti gambar) ===
  makeRow(5, 'PIT 11', 'DT4593', 4, 2.9, 0.545, 19.41, 19.0, 3.6, 25.3, 24.26, 0.95, 0.0),
  makeRow(6, 'PIT 11', 'DT3227', 4, 2.5, 0.59, 17.88, 19.42, 3.88, 24.68, 23.57, 2.8, 0.02),
  makeRow(7, 'PIT 11', 'DT3832', 4, 2.4, 0.603, 17.29, 18.08, 3.48, 24.46, 24.49, 2.86, 0.2),
  makeRow(8, 'PIT 11', 'DT5572', 4, 2.9, 0.545, 19.29, 19.86, 3.76, 25.3, 24.14, 1.74, 0.04),

  // === PIT 11: EX 1104 (persis seperti gambar; DT4473 tidak ada di VHMS sehingga barisnya abu-abu) ===
  makeRow(9, 'PIT 11', 'DT4341', 4, 2.9, 0.545, 19.73, 19.73, 3.63, 25.22, 25.04, 1.98, 0.1),
  makeRow(10, 'PIT 11', 'DT4471', 4, 2.9, 0.545, 19.76, 21.15, 3.73, 25.3, 22.97, 2.03, 0.05),
  makeRow(11, 'PIT 11', 'DT4189', 4, 3.0, 0.536, 19.76, 20.38, 3.58, 25.3, 23.39, 1.3, 0.28),

  // === PIT 11: EX 1191 (persis seperti gambar) ===
  makeRow(12, 'PIT 11', 'DT4553', 3, 5.9, 0.342, 31.45, 51.9, 3.0, 27.4, 18.23, 10.3, 0.1),
  makeRow(13, 'PIT 11', 'DT4508', 4, 2.9, 0.545, 19.29, 19.72, 3.66, 25.3, 23.5, 1.3, 0.1),
  makeRow(14, 'PIT 11', 'DT4457', 4, 2.8, 0.555, 19.33, 21.4, 3.43, 24.93, 22.43, 2.53, 0.03),
  makeRow(15, 'PIT 11', 'DT5460', 4, 2.9, 0.545, 19.22, 19.96, 3.76, 25.2, 24.0, 1.92, 0.0),

  // === Unit tambahan untuk tes rumus Bagian 8 & PIT 12 ===
  makeRow(16, 'PIT 12', 'DT5886', 5, 2.975, 0.545, 19.54, 20.7667, 3.9167, 23.0, 21.4, 1.2, 0.09, 217.5),
  makeRow(17, 'PIT 12', 'DT5430', 5, 3.00833, 0.536, 19.87, 20.5167, 3.85, 23.0, 21.8, 1.1, 0.08, 223.8),
  makeRow(18, 'PIT 12', 'DT4515', 6, 3.04167, 0.536, 19.87, 19.3, 3.6, 23.0, 23.2, 0.9, 0.07, 237.9),
  makeRow(19, 'PIT 12', 'DT3795', 6, 1.85, 0.708, 15.04, 15.4, 3.65, 24.5, 23.8, 1.4, 0.09, 225.6),
  makeRow(20, 'PIT 12', 'DT4477', 6, 1.92, 0.687, 15.5, 15.8, 3.72, 24.5, 23.2, 1.5, 0.1, 226.4),

  // === JUMBANG ===
  makeRow(21, 'JUMBANG', 'DT4901', 5, 4.45, 0.433, 24.59, 24.9, 3.75, 21.5, 21.1, 1.2, 0.09, 228.5),
  makeRow(22, 'JUMBANG', 'DT4910', 5, 4.52, 0.427, 24.94, 25.2, 3.8, 21.5, 20.9, 1.3, 0.09, 228.9),
];

export const SAMPLE_ASSIGNMENTS: Record<string, string[]> = {
  // PIT 11 (Persis sesuai gambar pengguna)
  'ldr-ex1233': ['DT4514', 'DT4507', 'DT4376', 'DT5547'],
  'ldr-ex1217-p11': ['DT4593', 'DT3227', 'DT3832', 'DT5572'],
  'ldr-ex1104': ['DT4341', 'DT4471', 'DT4189', 'DT4473'],
  'ldr-ex1191': ['DT4553', 'DT4508', 'DT4457', 'DT5460'],
  // PIT 12
  'ldr-ex1169': ['DT5886', 'DT5430', 'DT4515'],
  'ldr-ex1204': ['DT3795', 'DT4477'],
  // JUMBANG
  'ldr-ex1142': ['DT4901', 'DT4910'],
};

export const SAMPLE_REVIEW_INPUTS: Record<string, ReviewMfInput> = {};

export const SAMPLE_SNAPSHOTS: HourlySnapshot[] = [];
