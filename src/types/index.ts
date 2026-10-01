export interface KonversiJarakRow {
  jarakM: number;
  konversi: number;
}

export interface KonversiSanitizeResult {
  rows: KonversiJarakRow[];
  warnings: string[];
  duplicatesRemoved: number;
  invalidRemoved: number;
}

export interface GlobalParams {
  planProdtyHauler: number; // default 235 ton/jam
  ctPlanProdtyConst: number; // default 231 ton/jam
  payloadPerRit: number; // default 41 ton
  planServingTime: number; // default 3.73 menit
  defaultWh: number; // default 60 menit
  defaultDelay: number; // default 0 menit
  mfLowerThreshold: number; // default 0.895
  mfUpperThreshold: number; // default 1.005
  weightedByRit: boolean; // default false
  includeNonOnInPriority: boolean; // default true
}

export interface MasterLoader {
  id: string;
  pit: string; // e.g., "PIT 12", "PIT 11", "JUMBANG"
  name: string; // e.g., "EX 1217"
  egi: string; // e.g., "PC1250SP8"
  planProdtyLoader: number; // default 540 ton/jam
  status: string; // e.g., "ON", "CC"
  repairPriorityNote: string; // e.g., "Jalan dan Disposal"
  wh: number; // default 60 menit
  delay: number; // default 0 menit
  overrideNHdActual: number | null; // optional override
}

export interface VhmsRow {
  rowIndex: number;
  location: string;
  no: number | null;
  unit: string; // e.g. "DT4553"
  dtNumber: string; // e.g. "4553"
  rit: number | null;
  jarakKm: number | null;
  konv: number | null;
  updatedRaw: string;
  updatedDate: string | null; // ISO string or formatted
  bd: number; // empty treated as 0
  ctPlan: number | null;
  ctActual: number | null;
  ctCompl: number | null;
  ltPlan: number | null;
  ltActual: number | null;
  travelPlan: number | null;
  travelActual: number | null;
  engOffActual: number; // empty treated as 0
  speedAvgPlan: number | null;
  speedAvgActual: number | null;
  emptySpeedPlan: number | null;
  emptySpeedActual: number | null;
  loadedSpeedPlan: number | null;
  loadedSpeedActual: number | null;
  estPlan: number | null;
  estActual: number | null;
  lstPlan: number | null;
  lstActual: number | null;
  aglGradePlan: number | null;
  aglGradeActual: number | null;
  payloadPlan: number | null;
  payloadActual: number | null;
  prodtyPlan: number | null;
  prodtyActual: number | null;
  consistencyWarning: string | null;
}

export type VhmsFieldKey =
  | 'location'
  | 'no'
  | 'unit'
  | 'rit'
  | 'jarakKm'
  | 'konv'
  | 'updatedRaw'
  | 'bd'
  | 'ctPlan'
  | 'ctActual'
  | 'ctCompl'
  | 'ltPlan'
  | 'ltActual'
  | 'travelPlan'
  | 'travelActual'
  | 'engOffActual'
  | 'speedAvgPlan'
  | 'speedAvgActual'
  | 'emptySpeedPlan'
  | 'emptySpeedActual'
  | 'loadedSpeedPlan'
  | 'loadedSpeedActual'
  | 'estPlan'
  | 'estActual'
  | 'lstPlan'
  | 'lstActual'
  | 'aglGradePlan'
  | 'aglGradeActual'
  | 'payloadPlan'
  | 'payloadActual'
  | 'prodtyPlan'
  | 'prodtyActual';

export type ColumnMapping = Partial<Record<VhmsFieldKey, number>>;

export interface DetectedColumnInfo {
  colIndex: number;
  colLetter: string;
  headerKey: string;
  row1Label: string;
  row2Label: string;
}

export interface VhmsMetadata {
  fileName: string;
  sheetName: string;
  availableSheets: string[];
  companyJobsite: string;
  rawDateText: string;
  parsedDateDisplay: string;
  rawHoursText: string;
  hours: number[];
  hoursLabel: string;
  latestUpdatedDisplay: string;
  totalRows: number;
  pitCounts: Record<string, number>;
  missingRequiredColumns: string[];
  headerRow1Index: number;
  headerRow2Index: number;
  detectedColumns: DetectedColumnInfo[];
  columnMapping: ColumnMapping;
  rawNoteText: string;
}

export interface AssignedDtValidation {
  unit: string; // Normalized "DT####"
  foundInVhms: boolean;
  vhmsRow: VhmsRow | null;
  duplicateLoaders: string[]; // Names of OTHER loaders that also have this DT
  differentPit: string | null; // If vhmsRow.location !== loader.pit
  smallSample: boolean; // If rit !== null && rit < 3
}

export type MfRemark = 'Potensi Gantung' | 'OK' | 'Potensi Antri' | 'Data belum ada';

export interface LoaderCalculationResult {
  loader: MasterLoader;
  assignedUnits: string[];
  dtValidations: AssignedDtValidation[];
  foundVhmsRows: VhmsRow[];
  nHdInputCount: number;
  nHdActual: number; // After considering overrideNHdActual
  nHdFoundInVhms: number;
  hasData: boolean;
  // 5.1 Aggregated metrics
  avgJarakKm: number | null;
  avgJarakM: number | null;
  avgCtPlanVhms: number | null;
  avgCtActual: number | null;
  avgServingTimeActual: number | null; // LOADING TIME Actual
  avgSpeedPlan: number | null;
  avgSpeedActual: number | null;
  avgEstActual: number | null;
  avgLstActual: number | null;
  avgTravelActual: number | null;
  avgProdtyActual: number | null;
  // 5.2 Konversi
  konversi: number | null;
  // 5.3 Plan Kebutuhan HD
  planKebutuhanHd: number | null;
  // 5.4 Cycle Time Plan (dari jarak rata-rata aktual)
  ctPlanCalculated: number | null;
  // 5.5 Match Factor & derivatives
  mf: number | null;
  remark: MfRemark;
  durasiMenitPerJam: number | null; // 60 - (MF * 60)
  predictiveRitasi: number | null; // (MF * (WH - Delay)) / Serving Time Actual
  // 5.6 Priority
  priorityRank: number | null; // 1 for P1, 2 for P2, etc.
  priorityLabel: string; // "P1", "P2", or "-"
}

export interface ReviewMfInput {
  loaderId: string;
  nHdOverride: number | null;
  ritasi: number | null;
  hmPrev: number | null;
  hmEnd: number | null;
  prodtyHaulerOverride: number | null;
}

export interface ReviewMfResult {
  loader: MasterLoader;
  nHd: number;
  ritasi: number | null;
  hmPrev: number | null;
  hmEnd: number | null;
  hmEfektif: number | null;
  prodtyLoaderPlan: number;
  prodtyLoaderActual: number | null;
  prodtyHaulerPlan: number;
  prodtyHaulerActual: number | null;
  avgJarakM: number | null;
  konversi: number | null;
  mfVhms: number | null;
  mfReview: number | null;
  mfDelta: number | null; // mfReview - mfVhms
}

export interface HourlySnapshot {
  id: string;
  savedAt: string;
  label: string; // e.g., "01 Okt 2026 - Jam 06-08 (08:06)"
  metadata: VhmsMetadata;
  vhmsRows: VhmsRow[];
  assignments: Record<string, string[]>; // loaderId -> DT[]
  reviewInputs: Record<string, ReviewMfInput>;
  loaderSummaries: {
    loaderId: string;
    loaderName: string;
    pit: string;
    nHdActual: number;
    avgJarakM: number | null;
    mf: number | null;
    predictiveRitasi: number | null;
    remark: MfRemark;
    durasi: number | null;
  }[];
}
