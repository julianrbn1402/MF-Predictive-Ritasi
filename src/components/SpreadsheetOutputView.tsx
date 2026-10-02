import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Trash2,
  ClipboardPaste,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  GlobalParams,
  LoaderCalculationResult,
  MasterLoader,
  VhmsRow,
} from '../types';
import {
  formatHdCount,
  formatIdNumber,
  formatMeters,
  normalizeDtInputList,
  normalizeLoaderKey,
} from '../utils/formulas';
import {
  SYMMETRIC_COL_WIDTHS,
  TOTAL_TABLE_WIDTH,
  TABLE_PALETTE,
  getServingTimeStyle,
  getCycleTimeActualStyle,
  getMfStyle,
  getDurasiStyle,
  getPredRitasiStyle,
  getPriorityStyle,
  getDtMetricStyle,
} from '../utils/tableTheme';

interface SpreadsheetOutputViewProps {
  pit: string;
  pitCalcResults: LoaderCalculationResult[];
  allLoaders: MasterLoader[];
  vhmsRows: VhmsRow[];
  params: GlobalParams;
  assignments: Record<string, string[]>;
  onUpdateLoaderAssignment: (loaderId: string, units: string[]) => void;
  onUpdateBulkAssignments: (newAssignments: Record<string, string[]>) => void;
  onUpdateLoaderConfig: (loaderId: string, patch: Partial<MasterLoader>) => void;
}

export const SpreadsheetOutputView: React.FC<SpreadsheetOutputViewProps> = ({
  pit,
  pitCalcResults,
  allLoaders,
  vhmsRows,
  params,
  assignments,
  onUpdateLoaderAssignment,
  onUpdateBulkAssignments,
  onUpdateLoaderConfig,
}) => {
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Mode tampilan di layar mobile: default true ("Pas Layar Simetris") agar tabel utuh & simetris di layar HP
  const [fitMobileScreen, setFitMobileScreen] = useState(true);
  const [containerWidth, setContainerWidth] = useState<number>(TOTAL_TABLE_WIDTH);
  const [naturalTableHeight, setNaturalTableHeight] = useState<number>(0);

  const outerContainerRef = useRef<HTMLDivElement>(null);
  const tableElementRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    const outerEl = outerContainerRef.current;
    const tableEl = tableElementRef.current;
    if (!outerEl || !tableEl) return;

    const updateDimensions = () => {
      if (outerContainerRef.current) {
        setContainerWidth(outerContainerRef.current.clientWidth);
      }
      if (tableElementRef.current) {
        setNaturalTableHeight(tableElementRef.current.offsetHeight);
      }
    };

    updateDimensions();

    const observer = new ResizeObserver(() => {
      updateDimensions();
    });

    observer.observe(outerEl);
    observer.observe(tableEl);

    window.addEventListener('resize', updateDimensions);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, [pitCalcResults, assignments, fitMobileScreen]);

  const isNarrowViewport = containerWidth > 0 && containerWidth < TOTAL_TABLE_WIDTH;
  const shouldScale = fitMobileScreen && isNarrowViewport;
  const scaleRatio = shouldScale ? containerWidth / TOTAL_TABLE_WIDTH : 1;
  const scaledWrapperHeight =
    shouldScale && naturalTableHeight > 0
      ? Math.ceil(naturalTableHeight * scaleRatio)
      : undefined;

  // Peta cepat UNIT -> VhmsRow
  const vhmsByUnit = React.useMemo(() => {
    const map = new Map<string, VhmsRow>();
    for (const row of vhmsRows) {
      if (row.unit) {
        map.set(row.unit.toUpperCase(), row);
      }
    }
    return map;
  }, [vhmsRows]);

  // Ambil daftar slot baris per loader (jika kosong sama sekali setelah Reset, tampilkan 4 baris kosong siap isi)
  const getLoaderSlots = (loaderId: string): string[] => {
    const raw = assignments[loaderId];
    if (!raw || raw.length === 0) {
      return ['', '', '', ''];
    }
    return raw;
  };

  // Mengubah nomor DT pada baris tertentu di Tabel 3 (kolom UNIT hijau)
  const handleUnitSlotChange = (
    loaderId: string,
    slotIndex: number,
    rawValue: string
  ) => {
    const currentSlots = [...getLoaderSlots(loaderId)];
    const cleaned = rawValue.replace(/\D+/g, '');

    currentSlots[slotIndex] = cleaned ? `DT${cleaned}` : '';
    onUpdateLoaderAssignment(loaderId, currentSlots);
  };

  const handleAddSlot = (loaderId: string) => {
    const currentSlots = [...getLoaderSlots(loaderId), ''];
    onUpdateLoaderAssignment(loaderId, currentSlots);
  };

  const handleRemoveSlot = (loaderId: string, slotIndex: number) => {
    const currentSlots = [...getLoaderSlots(loaderId)];
    currentSlots.splice(slotIndex, 1);
    onUpdateLoaderAssignment(loaderId, currentSlots);
  };

  const handleApplyBulkPaste = () => {
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const updated = { ...assignments };

    for (const line of lines) {
      let loaderPart = '';
      let dtPart = '';
      if (line.includes(':')) {
        const idx = line.indexOf(':');
        loaderPart = line.slice(0, idx).trim();
        dtPart = line.slice(idx + 1).trim();
      } else if (line.includes('\t')) {
        const idx = line.indexOf('\t');
        loaderPart = line.slice(0, idx).trim();
        dtPart = line.slice(idx + 1).trim();
      } else {
        const m = line.match(/^(EX\s*\d+|\S+)\s+(.*)$/i);
        if (m) {
          loaderPart = m[1].trim();
          dtPart = m[2].trim();
        }
      }
      if (!loaderPart) continue;
      const units = normalizeDtInputList(dtPart);
      const normKey = normalizeLoaderKey(loaderPart);
      const matched =
        allLoaders.find(
          (l) => normalizeLoaderKey(l.name) === normKey && l.pit === pit
        ) || allLoaders.find((l) => normalizeLoaderKey(l.name) === normKey);

      if (matched) {
        updated[matched.id] = units;
      }
    }

    onUpdateBulkAssignments(updated);
    setShowBulkModal(false);
    setBulkText('');
  };

  const cellBorderStyle: React.CSSProperties = {
    borderColor: TABLE_PALETTE.border,
  };

  return (
    <div className="space-y-3 sm:space-y-4 font-sans">
      {/* Bar Petunjuk & Tombol Aksi (Simetris di Mobile & Desktop) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs bg-slate-900/90 text-slate-300 px-3 sm:px-4 py-2.5 rounded-lg border border-slate-800">
        <div className="flex items-center justify-center sm:justify-start gap-2 text-center sm:text-left">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
          <span className="text-[11px] sm:text-xs leading-snug">
            Ketik nomor DT pada kolom{' '}
            <strong className="text-emerald-400 font-mono">UNIT (hijau)</strong>{' '}
            atau tempel daftar DT:
          </span>
        </div>

        <div
          className={`grid gap-2 w-full sm:w-auto sm:flex sm:items-center ${
            isNarrowViewport ? 'grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {isNarrowViewport && (
            <button
              type="button"
              onClick={() => setFitMobileScreen((prev) => !prev)}
              className="px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
              title="Ubah mode tampilan tabel di layar mobile"
            >
              {fitMobileScreen ? (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Perbesar / Geser</span>
                </>
              ) : (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Pas Layar Simetris</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="px-3 py-1.5 text-[11px] sm:text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-md transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ClipboardPaste className="w-3.5 h-3.5 shrink-0" />
            <span>Tempel Daftar DT</span>
          </button>
        </div>
      </div>

      {/* CONTAINER TABEL TUNGGAL 13-KOLOM SIMETRIS (OTOMATIS PAS LAYAR & SIMETRIS DI MOBILE) */}
      <div
        ref={outerContainerRef}
        style={
          shouldScale && scaledWrapperHeight
            ? { height: `${scaledWrapperHeight}px` }
            : undefined
        }
        className={`w-full rounded-xl border-2 border-slate-700 bg-white shadow-2xl ${
          shouldScale ? 'overflow-hidden' : 'overflow-x-auto'
        }`}
      >
        <div
          style={
            shouldScale
              ? {
                  width: `${TOTAL_TABLE_WIDTH}px`,
                  transform: `scale(${scaleRatio})`,
                  transformOrigin: 'top left',
                }
              : {
                  width: `${TOTAL_TABLE_WIDTH}px`,
                  minWidth: '100%',
                }
          }
        >
          <table
            ref={tableElementRef}
            style={{ width: `${TOTAL_TABLE_WIDTH}px`, minWidth: '100%' }}
            className="table-fixed border-collapse text-xs font-sans"
          >
            {/* 13 Kolom Simetris untuk Ketiga Tabel */}
            <colgroup>
              {SYMMETRIC_COL_WIDTHS.map((w, idx) => (
                <col key={idx} style={{ width: `${w}px` }} />
              ))}
            </colgroup>

            <tbody>
              {/* ==========================================================
                  BAGIAN 1 (ATAS): HEADER & DATA RINGKASAN MF
                 ========================================================== */}
              <tr
                style={{
                  backgroundColor: TABLE_PALETTE.headerMain.bg,
                  color: TABLE_PALETTE.headerMain.fg,
                }}
                className="font-bold text-center text-[12px]"
              >
                <td
                  rowSpan={2}
                  style={cellBorderStyle}
                  className="border px-2 py-2"
                >
                  Lokasi Pit
                </td>
                <td
                  rowSpan={2}
                  style={cellBorderStyle}
                  className="border px-2 py-2"
                >
                  Loader
                </td>
                <td
                  rowSpan={2}
                  style={cellBorderStyle}
                  className="border px-2 py-2"
                >
                  EGI
                </td>
                <td
                  rowSpan={2}
                  style={cellBorderStyle}
                  className="border px-2 py-2 leading-tight"
                >
                  Rata-Rata
                  <br />
                  Jarak VHMS
                </td>
                <td
                  colSpan={2}
                  style={cellBorderStyle}
                  className="border px-2 py-1.5"
                >
                  n Hauler
                </td>
                <td
                  colSpan={2}
                  style={cellBorderStyle}
                  className="border px-2 py-1.5"
                >
                  Serving Time
                </td>
                <td
                  colSpan={2}
                  style={cellBorderStyle}
                  className="border px-2 py-1.5"
                >
                  Cycle Time
                </td>
                <td
                  colSpan={3}
                  rowSpan={2}
                  style={cellBorderStyle}
                  className="border px-2 py-2 text-[13px]"
                >
                  MF
                </td>
              </tr>

              <tr
                style={{
                  backgroundColor: TABLE_PALETTE.headerSub.bg,
                  color: TABLE_PALETTE.headerSub.fg,
                }}
                className="font-bold text-center text-[11.5px]"
              >
                <td style={cellBorderStyle} className="border px-1 py-1.5">
                  Plan
                </td>
                <td style={cellBorderStyle} className="border px-1 py-1.5">
                  Actual
                </td>
                <td style={cellBorderStyle} className="border px-1 py-1.5">
                  Plan
                </td>
                <td style={cellBorderStyle} className="border px-1 py-1.5">
                  Actual
                </td>
                <td style={cellBorderStyle} className="border px-1 py-1.5">
                  Plan
                </td>
                <td style={cellBorderStyle} className="border px-1 py-1.5">
                  Actual
                </td>
              </tr>

              {/* Data Baris Bagian 1 */}
              {pitCalcResults.map((r, idx) => {
                const stStyle = getServingTimeStyle(
                  r.avgServingTimeActual,
                  params.planServingTime
                );
                const ctActStyle = getCycleTimeActualStyle(
                  r.avgCtActual,
                  r.ctPlanCalculated
                );
                const mfStyle = getMfStyle(r.remark);

                return (
                  <tr
                    key={`t1-${r.loader.id}`}
                    className="font-mono tabular-nums font-bold text-center h-[38px] text-[13px]"
                  >
                    {idx === 0 && (
                      <td
                        rowSpan={pitCalcResults.length}
                        style={{
                          ...cellBorderStyle,
                          backgroundColor: TABLE_PALETTE.pitColumn.bg,
                          color: TABLE_PALETTE.pitColumn.fg,
                        }}
                        className="border font-sans font-bold text-center align-middle px-2"
                      >
                        <div className="text-sm font-bold tracking-wide">
                          {pit}
                        </div>
                      </td>
                    )}
                    <td
                      style={{
                        ...cellBorderStyle,
                        backgroundColor: TABLE_PALETTE.loaderColumn.bg,
                        color: TABLE_PALETTE.loaderColumn.fg,
                      }}
                      className="border px-2 py-1.5 font-sans font-bold"
                    >
                      {r.loader.name}
                    </td>
                    <td
                      style={{
                        ...cellBorderStyle,
                        backgroundColor: TABLE_PALETTE.dataWhite.bg,
                        color: TABLE_PALETTE.dataWhite.fg,
                      }}
                      className="border px-2 py-1.5 font-sans font-bold text-[12px]"
                    >
                      {r.loader.egi}
                    </td>
                    <td
                      style={{
                        ...cellBorderStyle,
                        backgroundColor: TABLE_PALETTE.dataWhite.bg,
                        color: TABLE_PALETTE.dataWhite.fg,
                      }}
                      className="border px-2 py-1.5"
                    >
                      {formatMeters(r.avgJarakM)}
                    </td>
                    <td
                      style={{
                        ...cellBorderStyle,
                        backgroundColor: TABLE_PALETTE.planColumn.bg,
                        color: TABLE_PALETTE.planColumn.fg,
                      }}
                      className="border px-1.5 py-1.5"
                    >
                      {formatIdNumber(r.planKebutuhanHd, 1)}
                    </td>
                    <td
                      style={{
                        ...cellBorderStyle,
                        backgroundColor: TABLE_PALETTE.dataWhite.bg,
                        color: TABLE_PALETTE.dataWhite.fg,
                      }}
                      className="border px-1.5 py-1.5"
                    >
                      {formatHdCount(r.nHdActual)}
                    </td>
                    <td
                      style={{
                        ...cellBorderStyle,
                        backgroundColor: TABLE_PALETTE.planColumn.bg,
                        color: TABLE_PALETTE.planColumn.fg,
                      }}
                      className="border px-1.5 py-1.5"
                    >
                      {formatIdNumber(params.planServingTime, 2)}
                    </td>
                    <td
                      style={{
                        ...cellBorderStyle,
                        backgroundColor: stStyle.bg,
                        color: stStyle.fg,
                      }}
                      className="border px-1.5 py-1.5"
                    >
                      {formatIdNumber(r.avgServingTimeActual, 2)}
                    </td>
                    <td
                      style={{
                        ...cellBorderStyle,
                        backgroundColor: TABLE_PALETTE.planColumn.bg,
                        color: TABLE_PALETTE.planColumn.fg,
                      }}
                      className="border px-1.5 py-1.5"
                    >
                      {formatIdNumber(r.ctPlanCalculated, 2)}
                    </td>
                    <td
                      style={{
                        ...cellBorderStyle,
                        backgroundColor: ctActStyle.bg,
                        color: ctActStyle.fg,
                      }}
                      className="border px-1.5 py-1.5"
                    >
                      {formatIdNumber(r.avgCtActual, 2)}
                    </td>
                    <td
                      colSpan={3}
                      style={{
                        ...cellBorderStyle,
                        backgroundColor: mfStyle.bg,
                        color: mfStyle.fg,
                      }}
                      className="border px-2 py-1.5 text-[13.5px]"
                    >
                      {formatIdNumber(r.mf, 2)}
                    </td>
                  </tr>
                );
              })}

              {/* ==========================================================
                  BAGIAN 2 (TENGAH): HEADER & DATA EVALUASI PREDICTIVE RITASI
                 ========================================================== */}
              <tr
                style={{
                  backgroundColor: TABLE_PALETTE.headerMain.bg,
                  color: TABLE_PALETTE.headerMain.fg,
                }}
                className="font-bold text-center text-[12px]"
              >
                <td style={cellBorderStyle} className="border px-2 py-2">
                  Lokasi Pit
                </td>
                <td style={cellBorderStyle} className="border px-2 py-2">
                  Loader
                </td>
                <td style={cellBorderStyle} className="border px-2 py-2">
                  Jumlah HD
                </td>
                <td style={cellBorderStyle} className="border px-2 py-2">
                  Serving Time
                </td>
                <td
                  style={cellBorderStyle}
                  className="border px-1.5 py-2 leading-tight"
                >
                  Cycle
                  <br />
                  Time
                </td>
                <td
                  style={cellBorderStyle}
                  className="border px-1.5 py-2 leading-tight"
                >
                  MF
                  <br />
                  Aktual
                </td>
                <td
                  style={cellBorderStyle}
                  className="border px-1.5 py-1.5 leading-tight text-[11px]"
                >
                  Predictive
                  <br />
                  Ritasi
                  <br />
                  <span className="font-medium text-[10px]">
                    (Rit. Should Be)
                  </span>
                </td>
                <td
                  colSpan={2}
                  style={cellBorderStyle}
                  className="border px-2 py-2"
                >
                  Gantung/Antri
                </td>
                <td
                  style={cellBorderStyle}
                  className="border px-1.5 py-2 leading-tight"
                >
                  Durasi
                  <br />
                  <span className="font-medium text-[10.5px]">(min/hr)</span>
                </td>
                <td style={cellBorderStyle} className="border px-1.5 py-2">
                  Priority
                </td>
                <td
                  colSpan={2}
                  style={cellBorderStyle}
                  className="border px-2 py-2"
                >
                  Remarks
                </td>
              </tr>

              {/* Data Baris Bagian 2 */}
              {pitCalcResults.map((r, idx) => {
                const stStyle = getServingTimeStyle(
                  r.avgServingTimeActual,
                  params.planServingTime
                );
                const ctActStyle = getCycleTimeActualStyle(
                  r.avgCtActual,
                  r.ctPlanCalculated
                );
                const prStyle = getPredRitasiStyle(r.predictiveRitasi);
                const mfStyle = getMfStyle(r.remark);
                const durStyle = getDurasiStyle(r.durasiMenitPerJam, r.remark);
                const prioStyle = getPriorityStyle(r.priorityRank);

                return (
                  <tr
                    key={`t2-${r.loader.id}`}
                    className="font-mono tabular-nums font-bold text-center h-[38px] text-[13px]"
                  >
                    {idx === 0 && (
                      <td
                        rowSpan={pitCalcResults.length}
                        style={{
                          ...cellBorderStyle,
                          backgroundColor: TABLE_PALETTE.pitColumn.bg,
                          color: TABLE_PALETTE.pitColumn.fg,
                        }}
                        className="border font-sans font-bold text-center align-middle px-2"
                      >
                        <div className="text-sm font-bold tracking-wide">
                          {pit}
                        </div>
                      </td>
                    )}
                    <td
                      style={{
                        ...cellBorderStyle,
                        backgroundColor: TABLE_PALETTE.loaderColumn.bg,
                        color: TABLE_PALETTE.loaderColumn.fg,
                      }}
                      className="border px-2 py-1.5 font-sans font-bold"
                    >
                      {r.loader.name}
                    </td>
                    <td
                      style={{
                        ...cellBorderStyle,
                        backgroundColor: TABLE_PALETTE.dataWhite.bg,
                        color: TABLE_PALETTE.dataWhite.fg,
                      }}
                      className="border px-2 py-1.5"
                    >
                      {formatHdCount(r.nHdActual)}
                    </td>
                    <td
                      style={{
                        ...cellBorderStyle,
                        backgroundColor: stStyle.bg,
                        color: stStyle.fg,
                      }}
                      className="border px-2 py-1.5"
                    >
                      {formatIdNumber(r.avgServingTimeActual, 2)}
                    </td>
                    <td
                      style={{
                        ...cellBorderStyle,
                        backgroundColor: ctActStyle.bg,
                        color: ctActStyle.fg,
                      }}
                      className="border px-1.5 py-1.5"
                    >
                      {formatIdNumber(r.avgCtActual, 2)}
                    </td>
                    <td
                      style={{
                        ...cellBorderStyle,
                        backgroundColor: mfStyle.bg,
                        color: mfStyle.fg,
                      }}
                      className="border px-1.5 py-1.5"
                    >
                      {formatIdNumber(r.mf, 2)}
                    </td>
                    <td
                      style={{
                        ...cellBorderStyle,
                        backgroundColor: prStyle.bg,
                        color: prStyle.fg,
                      }}
                      className="border px-1.5 py-1.5"
                    >
                      {formatIdNumber(r.predictiveRitasi, 1)}
                    </td>
                    <td
                      colSpan={2}
                      style={{
                        ...cellBorderStyle,
                        backgroundColor: mfStyle.bg,
                        color: mfStyle.fg,
                      }}
                      className="border px-2 py-1 font-sans font-bold text-[12px] leading-tight"
                    >
                      {r.hasData ? r.remark : '-'}
                    </td>
                    <td
                      style={{
                        ...cellBorderStyle,
                        backgroundColor: durStyle.bg,
                        color: durStyle.fg,
                      }}
                      className="border px-1.5 py-1.5"
                    >
                      {formatIdNumber(r.durasiMenitPerJam, 1)}
                    </td>
                    <td
                      style={{
                        ...cellBorderStyle,
                        backgroundColor: prioStyle.bg,
                        color: prioStyle.fg,
                      }}
                      className="border px-1.5 py-1.5 font-sans font-bold"
                    >
                      {r.priorityLabel}
                    </td>
                    <td
                      colSpan={2}
                      style={{
                        ...cellBorderStyle,
                        backgroundColor: TABLE_PALETTE.dataWhite.bg,
                        color: TABLE_PALETTE.dataWhite.fg,
                      }}
                      className="border px-1 py-1 font-sans font-bold"
                    >
                      <input
                        type="text"
                        value={r.loader.status}
                        onChange={(e) =>
                          onUpdateLoaderConfig(r.loader.id, {
                            status: e.target.value,
                          })
                        }
                        className="w-full text-center font-bold bg-transparent focus:outline-none focus:bg-slate-100 rounded py-0.5"
                        title="Klik untuk mengubah status (ON / CC / Remarks)"
                      />
                    </td>
                  </tr>
                );
              })}

              {/* ==========================================================
                  BAGIAN 3 (BAWAH): VHMS HOURLY [PIT] (DETAIL DT + INPUT UNIT HIJAU + AVERAGE)
                 ========================================================== */}
              <tr>
                <td
                  colSpan={13}
                  style={{
                    ...cellBorderStyle,
                    backgroundColor: TABLE_PALETTE.bannerSection.bg,
                    color: TABLE_PALETTE.bannerSection.fg,
                  }}
                  className="border py-1.5 text-center font-bold text-[13px] tracking-wider uppercase"
                >
                  VHMS HOURLY {pit}
                </td>
              </tr>

              <tr
                style={{
                  backgroundColor: TABLE_PALETTE.headerMain.bg,
                  color: TABLE_PALETTE.headerMain.fg,
                }}
                className="font-bold text-center text-[12px]"
              >
                <td
                  colSpan={2}
                  rowSpan={2}
                  style={cellBorderStyle}
                  className="border px-2 py-1.5"
                >
                  PC
                </td>
                <td
                  rowSpan={2}
                  style={cellBorderStyle}
                  className="border px-2 py-1.5"
                >
                  UNIT
                </td>
                <td
                  rowSpan={2}
                  style={cellBorderStyle}
                  className="border px-2 py-1.5"
                >
                  UNIT
                </td>
                <td
                  rowSpan={2}
                  style={cellBorderStyle}
                  className="border px-1.5 py-1.5"
                >
                  Jarak
                </td>
                <td
                  colSpan={2}
                  style={cellBorderStyle}
                  className="border px-2 py-1"
                >
                  Cycle Time
                </td>
                <td
                  colSpan={2}
                  rowSpan={2}
                  style={cellBorderStyle}
                  className="border px-2 py-1.5"
                >
                  Loading Time
                </td>
                <td
                  rowSpan={2}
                  style={cellBorderStyle}
                  className="border px-1.5 py-1.5"
                >
                  Speed
                </td>
                <td
                  rowSpan={2}
                  style={cellBorderStyle}
                  className="border px-1.5 py-1.5 leading-tight"
                >
                  Plan
                  <br />
                  Speed
                </td>
                <td
                  rowSpan={2}
                  style={cellBorderStyle}
                  className="border px-1 py-1.5"
                >
                  EST
                </td>
                <td
                  rowSpan={2}
                  style={cellBorderStyle}
                  className="border px-1 py-1.5"
                >
                  LST
                </td>
              </tr>

              <tr
                style={{
                  backgroundColor: TABLE_PALETTE.headerSub.bg,
                  color: TABLE_PALETTE.headerSub.fg,
                }}
                className="font-bold text-center text-[11.5px]"
              >
                <td style={cellBorderStyle} className="border px-1 py-1">
                  Plan
                </td>
                <td style={cellBorderStyle} className="border px-1 py-1">
                  Actual
                </td>
              </tr>

              {/* Data DT per Loader & Baris AVERAGE */}
              {pitCalcResults.map((r) => {
                const rawSlots = getLoaderSlots(r.loader.id);

                return (
                  <React.Fragment key={`t3-${r.loader.id}`}>
                    {rawSlots.map((rawUnit, sIdx) => {
                      const numericId = rawUnit.replace(/\D+/g, '');
                      const normalizedUnit = numericId ? `DT${numericId}` : '';
                      const vRow = normalizedUnit
                        ? vhmsByUnit.get(normalizedUnit.toUpperCase()) || null
                        : null;

                      const ctStyle = getDtMetricStyle(
                        Boolean(
                          vRow &&
                            vRow.ctActual !== null &&
                            vRow.ctPlan !== null &&
                            vRow.ctActual > vRow.ctPlan
                        )
                      );
                      const ltStyle = getDtMetricStyle(
                        Boolean(
                          vRow &&
                            vRow.ltActual !== null &&
                            vRow.ltActual > params.planServingTime
                        )
                      );
                      const spdStyle = getDtMetricStyle(
                        Boolean(
                          vRow &&
                            vRow.speedAvgActual !== null &&
                            vRow.speedAvgPlan !== null &&
                            vRow.speedAvgActual < vRow.speedAvgPlan
                        ),
                        true
                      );
                      const estStyle = getDtMetricStyle(
                        Boolean(
                          vRow && vRow.estActual !== null && vRow.estActual > 1.0
                        )
                      );
                      const lstStyle = getDtMetricStyle(
                        Boolean(
                          vRow &&
                            vRow.lstActual !== null &&
                            vRow.lstActual > 0.15
                        )
                      );

                      return (
                        <tr
                          key={`${r.loader.id}-slot-${sIdx}`}
                          className="font-mono tabular-nums text-center h-[28px] text-[12.5px]"
                        >
                          {sIdx === 0 && (
                            <td
                              colSpan={2}
                              rowSpan={rawSlots.length}
                              style={{
                                ...cellBorderStyle,
                                backgroundColor: TABLE_PALETTE.loaderColumn.bg,
                                color: TABLE_PALETTE.loaderColumn.fg,
                              }}
                              className="border px-2 py-1 font-sans font-bold align-middle relative group"
                            >
                              <div className="text-[13.5px] font-bold">
                                {r.loader.name}
                              </div>
                              <div className="mt-1 flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleAddSlot(r.loader.id)}
                                  className="px-2 py-0.5 text-[10px] font-sans font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded transition-colors inline-flex items-center gap-0.5 cursor-pointer"
                                  title="Tambah baris DT untuk loader ini"
                                >
                                  <Plus className="w-2.5 h-2.5" /> DT
                                </button>
                              </div>
                            </td>
                          )}

                          {/* Kolom 1 UNIT (Hijau Mint Terang Estetik, Input Nomor DT Langsung) */}
                          <td
                            style={{
                              ...cellBorderStyle,
                              backgroundColor: TABLE_PALETTE.unitInputGreen.bg,
                              color: TABLE_PALETTE.unitInputGreen.fg,
                            }}
                            className="border p-0 font-bold text-[12.5px] relative group"
                          >
                            <div className="flex items-center">
                              <input
                                type="text"
                                value={numericId}
                                placeholder="Ketik..."
                                onChange={(e) =>
                                  handleUnitSlotChange(
                                    r.loader.id,
                                    sIdx,
                                    e.target.value
                                  )
                                }
                                className="w-full py-0.5 px-1 text-center font-bold bg-transparent text-emerald-950 placeholder:text-emerald-900/45 focus:outline-none focus:bg-white/60"
                                title="Ketik nomor DT (misal 4514)"
                              />
                              {rawSlots.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveSlot(r.loader.id, sIdx)
                                  }
                                  className="opacity-0 group-hover:opacity-100 pr-1 text-rose-800 hover:text-rose-950 cursor-pointer"
                                  title="Hapus baris DT ini"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Kolom 2 UNIT (DT####) */}
                          <td
                            style={{
                              ...cellBorderStyle,
                              backgroundColor: TABLE_PALETTE.dataWhite.bg,
                              color: TABLE_PALETTE.dataWhite.fg,
                            }}
                            className="border px-2 py-0.5 font-medium"
                          >
                            {normalizedUnit || '-'}
                          </td>

                          {/* Jika DT ditemukan di VHMS tampilkan metriknya, jika tidak blok abu-abu terang */}
                          {vRow ? (
                            <>
                              <td
                                style={{
                                  ...cellBorderStyle,
                                  backgroundColor: TABLE_PALETTE.dataWhite.bg,
                                  color: TABLE_PALETTE.dataWhite.fg,
                                }}
                                className="border px-1.5 py-0.5"
                              >
                                {formatIdNumber(vRow.jarakKm, 2)}
                              </td>
                              <td
                                style={{
                                  ...cellBorderStyle,
                                  backgroundColor: TABLE_PALETTE.planColumn.bg,
                                  color: TABLE_PALETTE.planColumn.fg,
                                }}
                                className="border px-1.5 py-0.5"
                              >
                                {formatIdNumber(vRow.ctPlan, 2)}
                              </td>
                              <td
                                style={{
                                  ...cellBorderStyle,
                                  backgroundColor: ctStyle.bg,
                                  color: ctStyle.fg,
                                }}
                                className="border px-1.5 py-0.5 font-semibold"
                              >
                                {formatIdNumber(vRow.ctActual, 2)}
                              </td>
                              <td
                                colSpan={2}
                                style={{
                                  ...cellBorderStyle,
                                  backgroundColor: ltStyle.bg,
                                  color: ltStyle.fg,
                                }}
                                className="border px-1.5 py-0.5 font-semibold"
                              >
                                {formatIdNumber(vRow.ltActual, 2)}
                              </td>
                              <td
                                style={{
                                  ...cellBorderStyle,
                                  backgroundColor: spdStyle.bg,
                                  color: spdStyle.fg,
                                }}
                                className="border px-1.5 py-0.5 font-semibold"
                              >
                                {formatIdNumber(vRow.speedAvgActual, 2)}
                              </td>
                              <td
                                style={{
                                  ...cellBorderStyle,
                                  backgroundColor: TABLE_PALETTE.planColumn.bg,
                                  color: TABLE_PALETTE.planColumn.fg,
                                }}
                                className="border px-1.5 py-0.5"
                              >
                                {formatIdNumber(vRow.speedAvgPlan, 2)}
                              </td>
                              <td
                                style={{
                                  ...cellBorderStyle,
                                  backgroundColor: estStyle.bg,
                                  color: estStyle.fg,
                                }}
                                className="border px-1 py-0.5 font-semibold"
                              >
                                {formatIdNumber(vRow.estActual, 2)}
                              </td>
                              <td
                                style={{
                                  ...cellBorderStyle,
                                  backgroundColor: lstStyle.bg,
                                  color: lstStyle.fg,
                                }}
                                className="border px-1 py-0.5 font-semibold"
                              >
                                {formatIdNumber(vRow.lstActual, 2)}
                              </td>
                            </>
                          ) : (
                            <>
                              <td
                                style={{
                                  ...cellBorderStyle,
                                  backgroundColor: TABLE_PALETTE.missingGray.bg,
                                  color: TABLE_PALETTE.missingGray.fg,
                                }}
                                className="border px-1.5 py-0.5"
                              ></td>
                              <td
                                style={{
                                  ...cellBorderStyle,
                                  backgroundColor: TABLE_PALETTE.missingGray.bg,
                                  color: TABLE_PALETTE.missingGray.fg,
                                }}
                                className="border px-1.5 py-0.5"
                              ></td>
                              <td
                                style={{
                                  ...cellBorderStyle,
                                  backgroundColor: TABLE_PALETTE.missingGray.bg,
                                  color: TABLE_PALETTE.missingGray.fg,
                                }}
                                className="border px-1.5 py-0.5"
                              ></td>
                              <td
                                colSpan={2}
                                style={{
                                  ...cellBorderStyle,
                                  backgroundColor: TABLE_PALETTE.missingGray.bg,
                                  color: TABLE_PALETTE.missingGray.fg,
                                }}
                                className="border px-1.5 py-0.5"
                              ></td>
                              <td
                                style={{
                                  ...cellBorderStyle,
                                  backgroundColor: TABLE_PALETTE.missingGray.bg,
                                  color: TABLE_PALETTE.missingGray.fg,
                                }}
                                className="border px-1.5 py-0.5"
                              ></td>
                              <td
                                style={{
                                  ...cellBorderStyle,
                                  backgroundColor: TABLE_PALETTE.missingGray.bg,
                                  color: TABLE_PALETTE.missingGray.fg,
                                }}
                                className="border px-1.5 py-0.5"
                              ></td>
                              <td
                                style={{
                                  ...cellBorderStyle,
                                  backgroundColor: TABLE_PALETTE.missingGray.bg,
                                  color: TABLE_PALETTE.missingGray.fg,
                                }}
                                className="border px-1 py-0.5"
                              ></td>
                              <td
                                style={{
                                  ...cellBorderStyle,
                                  backgroundColor: TABLE_PALETTE.missingGray.bg,
                                  color: TABLE_PALETTE.missingGray.fg,
                                }}
                                className="border px-1 py-0.5"
                              ></td>
                            </>
                          )}
                        </tr>
                      );
                    })}

                    {/* Baris AVERAGE per Loader */}
                    <tr
                      style={{
                        backgroundColor: TABLE_PALETTE.averageRow.bg,
                        color: TABLE_PALETTE.averageRow.fg,
                      }}
                      className="font-mono tabular-nums font-bold text-center h-[30px] text-[13px]"
                    >
                      <td
                        colSpan={4}
                        style={cellBorderStyle}
                        className="border px-2 py-1 font-sans font-bold text-[12px] tracking-wide"
                      >
                        AVERAGE
                      </td>
                      <td style={cellBorderStyle} className="border px-1.5 py-1">
                        {formatMeters(r.avgJarakM)}
                      </td>
                      <td style={cellBorderStyle} className="border px-1.5 py-1">
                        {formatIdNumber(r.ctPlanCalculated, 2)}
                      </td>
                      <td style={cellBorderStyle} className="border px-1.5 py-1">
                        {formatIdNumber(r.avgCtActual, 2)}
                      </td>
                      <td
                        colSpan={2}
                        style={cellBorderStyle}
                        className="border px-1.5 py-1"
                      >
                        {formatIdNumber(r.avgServingTimeActual, 2)}
                      </td>
                      <td style={cellBorderStyle} className="border px-1.5 py-1">
                        {formatIdNumber(r.avgSpeedActual, 2)}
                      </td>
                      <td style={cellBorderStyle} className="border px-1.5 py-1">
                        {formatIdNumber(r.avgSpeedPlan, 2)}
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          ...cellBorderStyle,
                          backgroundColor: TABLE_PALETTE.averageCross.bg,
                          color: TABLE_PALETTE.averageCross.fg,
                        }}
                        className="border px-1.5 py-1 font-sans font-bold text-xs"
                      >
                        X
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tempel Banyak DT */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-4 sm:p-5 space-y-4 text-slate-100 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-sm">
                Tempel Daftar DT per Loader ({pit})
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Tempel satu baris per loader, contoh:
            </p>
            <textarea
              rows={6}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`EX 1233: 4514 4507 4376 5547\nEX 1217: 4593 3227 3832 5572\nEX 1104: 4341 4471 4189 4473\nEX 1191: 4553 4508 4457 5460`}
              className="w-full p-3 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500"
            />
            <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-3 py-2 sm:py-1.5 text-xs font-medium text-slate-300 bg-slate-800 sm:bg-transparent hover:bg-slate-700 rounded-md text-center"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyBulkPaste}
                className="px-4 py-2 sm:py-1.5 text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-md text-center"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
