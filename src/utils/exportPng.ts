import {
  GlobalParams,
  LoaderCalculationResult,
  VhmsMetadata,
  VhmsRow,
} from '../types';
import { formatHdCount, formatIdNumber, formatMeters } from './formulas';
import {
  matchOperatorName,
  OperatorRecord,
  ShiftOption,
  getShiftCode,
  ParsedOperationalDate,
} from './operatorService';
import {
  SYMMETRIC_COL_WIDTHS,
  TABLE_PALETTE,
  CellColorStyle,
  getServingTimeStyle,
  getCycleTimeActualStyle,
  getMfStyle,
  getDurasiStyle,
  getPredRitasiStyle,
  getPriorityStyle,
  getDtMetricStyle,
} from './tableTheme';

export interface ExportPngOptions {
  pit: string;
  pitCalcResults: LoaderCalculationResult[];
  vhmsRows: VhmsRow[];
  params: GlobalParams;
  assignments: Record<string, string[]>;
  metadata: VhmsMetadata;
  operatorRecords?: OperatorRecord[];
  activeShift?: ShiftOption;
  operationalDate?: ParsedOperationalDate | null;
}

/**
 * Membungkus teks panjang menjadi array baris berdasarkan batas piksel maksimum pada canvas.
 */
export function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [''];
  const clean = text.trim();
  if (!clean) return [''];

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [clean];

  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const testLine = `${currentLine} ${word}`;
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

/**
 * Menghitung lebar 13 kolom ekspor PNG secara proporsional dan dinamis
 * berdasarkan konten terpanjang (termasuk nama operator dan header).
 */
export function calculateExportColumnWidths(
  operatorRecords?: OperatorRecord[],
  activeShift: ShiftOption = '1'
): number[] {
  // Salin lebar dasar dari SYMMETRIC_COL_WIDTHS
  const widths: number[] = [...SYMMETRIC_COL_WIDTHS];

  // Ukur kebutuhan kolom Nama Operator (Col 3) jika terdapat data operator
  if (operatorRecords && operatorRecords.length > 0) {
    const shiftCode = getShiftCode(activeShift);
    let maxLineWidth = 130;

    for (const record of operatorRecords) {
      if (record.shift === shiftCode && record.name && record.name !== '—') {
        const words = record.name.trim().split(/\s+/);
        if (words.length > 1) {
          // Asumsikan pembagian 2 baris untuk nama panjang
          const mid = Math.ceil(words.length / 2);
          const line1 = words.slice(0, mid).join(' ');
          const line2 = words.slice(mid).join(' ');
          // Perkiraan kasar lebar karakter huruf besar sans-serif (~7.5px per huruf pada 11px)
          const w1 = line1.length * 7.5;
          const w2 = line2.length * 7.5;
          maxLineWidth = Math.max(maxLineWidth, w1, w2);
        } else {
          maxLineWidth = Math.max(maxLineWidth, record.name.length * 7.5);
        }
      }
    }

    // Berikan ruang padding 24px (12px kiri, 12px kanan), batas antara 165px s/d 220px
    widths[3] = Math.max(165, Math.min(220, Math.ceil(maxLineWidth + 24)));
  } else {
    widths[3] = 165;
  }

  // Pastikan kolom Predictive Ritasi (Col 6) minimal 94px agar header tidak sesak
  widths[6] = Math.max(widths[6], 94);

  return widths;
}

/**
 * Ekspor seluruh tabel output ke format gambar PNG berkualitas tinggi
 * dengan layout simetris, text-wrapping, font auto-fit, dan cell-clipping ketat.
 */
export async function exportOutputTablesToPng({
  pit,
  pitCalcResults,
  vhmsRows,
  params,
  assignments,
  metadata,
  operatorRecords,
  activeShift = '1',
  operationalDate,
}: ExportPngOptions): Promise<void> {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // Lanjutkan jika browser tidak mendukung document.fonts
    }
  }

  const vhmsByUnit = new Map<string, VhmsRow>();
  for (const row of vhmsRows) {
    if (row.unit) {
      vhmsByUnit.set(row.unit.toUpperCase(), row);
    }
  }

  const getLoaderSlots = (loaderId: string): string[] => {
    const raw = assignments[loaderId];
    if (!raw || raw.length === 0) return ['', '', '', ''];
    return raw;
  };

  const scale = 2; // Skala 2x untuk gambar tajam & profesional
  const padX = 24;
  const padY = 24;

  // 1. Hitung lebar 13 kolom secara dinamis berdasarkan data aktual
  const colWidths = calculateExportColumnWidths(operatorRecords, activeShift);
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const width = tableWidth + padX * 2;

  // Koordinat X awal tiap kolom
  const colX: number[] = [];
  colWidths.reduce((acc, w) => {
    colX.push(acc);
    return acc + w;
  }, padX);

  const getSpanWidth = (startCol: number, span: number = 1): number => {
    let sum = 0;
    for (let i = startCol; i < startCol + span; i++) {
      sum += colWidths[i] || 0;
    }
    return sum;
  };

  const numLoaders = Math.max(1, pitCalcResults.length);
  const totalDtSlots = pitCalcResults.reduce(
    (acc, r) => acc + getLoaderSlots(r.loader.id).length,
    0
  );

  // 2. Tinggi baris yang proporsional & nyaman untuk teks panjang
  const bannerHeight = 64;
  const bannerGap = 16;

  const t1HeaderH1 = 28;
  const t1HeaderH2 = 26;
  const t1HeaderH = t1HeaderH1 + t1HeaderH2; // 54px
  const t1RowH = 36;
  const t1Height = t1HeaderH + numLoaders * t1RowH;

  const t2HeaderH = 54;
  const t2RowH = 36;
  const t2Height = t2HeaderH + numLoaders * t2RowH;

  const t3TitleH = 36;
  const t3HeaderH1 = 28;
  const t3HeaderH2 = 26;
  const t3HeaderH = t3HeaderH1 + t3HeaderH2; // 54px
  const t3DtRowH = 34; // Tinggi baris DT cukup luas untuk nama operator 2-baris
  const t3AvgRowH = 34;
  const t3Height =
    t3TitleH +
    t3HeaderH +
    totalDtSlots * t3DtRowH +
    numLoaders * t3AvgRowH;

  const totalTableHeight = t1Height + t2Height + t3Height;
  const totalHeight = padY + bannerHeight + bannerGap + totalTableHeight + padY;

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(totalHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(scale, scale);

  // Background kanvas luar
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, width, totalHeight);

  // Tipografi terstandarisasi
  const fontHeader = '700 12px "Plus Jakarta Sans", -apple-system, sans-serif';
  const fontSubHeader = '700 11px "Plus Jakarta Sans", -apple-system, sans-serif';
  const fontHeaderSmall = '700 10.5px "Plus Jakarta Sans", -apple-system, sans-serif';
  const fontSansBold = '700 12.5px "Plus Jakarta Sans", -apple-system, sans-serif';
  const fontSansMed = '600 11.5px "Plus Jakarta Sans", -apple-system, sans-serif';
  const fontMonoBold = '700 12.5px "JetBrains Mono", monospace';
  const fontMonoData = '600 12px "JetBrains Mono", monospace';
  const fontMonoReg = '500 11.5px "JetBrains Mono", monospace';
  const fontOperator = '700 11px "Plus Jakarta Sans", -apple-system, sans-serif';

  /**
   * Menggambar sel tunggal/merged dengan:
   * 1. Garis batas sel konsisten & sejajar
   * 2. Bounding clip ketat agar teks tidak keluar batas sel
   * 3. Text wrapping & dynamic font scaling agar teks tidak terpotong
   */
  const drawCell = ({
    col,
    span = 1,
    y,
    h,
    style,
    text,
    font = fontMonoBold,
    align = 'center',
    paddingX = 6,
    allowWrap = false,
    maxLines = 2,
    minFontSize = 8.5,
  }: {
    col: number;
    span?: number;
    y: number;
    h: number;
    style: CellColorStyle;
    text: string | string[];
    font?: string;
    align?: 'left' | 'center' | 'right';
    paddingX?: number;
    allowWrap?: boolean;
    maxLines?: number;
    minFontSize?: number;
  }) => {
    const x = colX[col];
    const w = getSpanWidth(col, span);

    // 1. Gambar latar sel
    ctx.fillStyle = style.bg;
    ctx.fillRect(x, y, w, h);

    // 2. Garis pembatas sel
    ctx.strokeStyle = TABLE_PALETTE.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // 3. Batas proteksi (clipping boundary) sel agar teks TIDAK MELUBER ke sel lain
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.clip();

    // 4. Hitung pemformatan teks, pembungkusan (wrapping), dan penyesuaian font
    const maxTextWidth = Math.max(10, w - paddingX * 2);
    const maxTextHeight = Math.max(10, h - 4);

    let lines: string[] = [];
    let currentFontSize = 11;
    const fontMatch = font.match(/(\d+(?:\.\d+)?)\s*px/);
    if (fontMatch) {
      currentFontSize = parseFloat(fontMatch[1]);
    }
    const fontPrefix = font.split(`${currentFontSize}px`)[0] || '700 ';
    const fontSuffix = font.split(`${currentFontSize}px`)[1] || ' "Plus Jakarta Sans", sans-serif';

    const buildFontString = (size: number) => `${fontPrefix}${size}px${fontSuffix}`;

    ctx.font = font;

    if (Array.isArray(text)) {
      lines = text.filter((l) => typeof l === 'string');
      // Periksa apakah ada baris yang melebihi lebar sel
      let widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 0);
      while (widest > maxTextWidth && currentFontSize > minFontSize) {
        currentFontSize -= 0.5;
        ctx.font = buildFontString(currentFontSize);
        widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 0);
      }
    } else if (text) {
      const cleanText = String(text).trim();
      if (allowWrap) {
        // Coba 1 baris dahulu
        const singleLineWidth = ctx.measureText(cleanText).width;
        if (singleLineWidth <= maxTextWidth) {
          lines = [cleanText];
        } else {
          // Coba bungkus teks menjadi beberapa baris
          lines = wrapCanvasText(ctx, cleanText, maxTextWidth);

          // Jika jumlah baris melebihi maxLines atau ada baris yang terlalu lebar, perkecil font secara proporsional
          let widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 0);
          while (
            (widest > maxTextWidth || lines.length > maxLines) &&
            currentFontSize > minFontSize
          ) {
            currentFontSize -= 0.5;
            ctx.font = buildFontString(currentFontSize);
            lines = wrapCanvasText(ctx, cleanText, maxTextWidth);
            widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 0);
          }
        }
      } else {
        // Format angka / data satu baris: sesuaikan font jika terlalu panjang
        let textWidth = ctx.measureText(cleanText).width;
        while (textWidth > maxTextWidth && currentFontSize > minFontSize) {
          currentFontSize -= 0.5;
          ctx.font = buildFontString(currentFontSize);
          textWidth = ctx.measureText(cleanText).width;
        }
        lines = [cleanText];
      }
    }

    // 5. Gambar teks terpusat secara vertikal di dalam sel
    if (lines.length > 0) {
      ctx.fillStyle = style.fg;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';

      const lineHeight = Math.min(14, Math.max(10, currentFontSize * 1.22));
      const totalTextH = lines.length * lineHeight;
      const startY = y + (h - totalTextH) / 2 + lineHeight / 2;

      for (let i = 0; i < lines.length; i++) {
        const lineY = startY + i * lineHeight;
        let lineX = x + w / 2;
        if (align === 'left') lineX = x + paddingX;
        if (align === 'right') lineX = x + w - paddingX;
        ctx.fillText(lines[i], lineX, lineY);
      }
    }

    ctx.restore();
  };

  // =========================================================================
  // 0. HEADER BANNER APLIKASI
  // =========================================================================
  let curY = padY;
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(padX, curY, tableWidth, bannerHeight);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(padX, curY, tableWidth, bannerHeight);

  // Kiri: Judul Aplikasi
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#F8FAFC';
  ctx.font = '700 18px "Syne", "Plus Jakarta Sans", sans-serif';
  ctx.fillText('MF Predictive Ritasi', padX + 18, curY + 23);

  ctx.fillStyle = '#FBBF24';
  ctx.font = 'italic 600 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('part of Autonomia!', padX + 18, curY + 44);

  // Kanan: Info PIT, Shift, Jam & Tanggal Operasional
  const shiftBadge = getShiftCode(activeShift);
  const shiftLabel = `Shift ${activeShift} (${shiftBadge})`;
  const dateLabel = operationalDate ? operationalDate.display : 'Tanggal Otomatis';

  ctx.textAlign = 'right';
  ctx.fillStyle = '#E2E8F0';
  ctx.font = '700 12px "JetBrains Mono", monospace';
  ctx.fillText(
    `${pit} · ${shiftLabel} · ${metadata.hoursLabel} · Data per ${metadata.latestUpdatedDisplay}`,
    padX + tableWidth - 18,
    curY + 23
  );

  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `${metadata.companyJobsite} · Sheet: ${dateLabel}`,
    padX + tableWidth - 18,
    curY + 44
  );

  curY += bannerHeight + bannerGap;
  const tableStartY = curY;

  // =========================================================================
  // 1. BAGIAN 1 (ATAS): HEADER & DATA RINGKASAN MF (13 Kolom Simetris)
  // =========================================================================
  drawCell({
    col: 0,
    y: curY,
    h: t1HeaderH,
    style: TABLE_PALETTE.headerMain,
    text: 'Lokasi Pit',
    font: fontHeader,
  });
  drawCell({
    col: 1,
    y: curY,
    h: t1HeaderH,
    style: TABLE_PALETTE.headerMain,
    text: 'Loader',
    font: fontHeader,
  });
  drawCell({
    col: 2,
    y: curY,
    h: t1HeaderH,
    style: TABLE_PALETTE.headerMain,
    text: 'EGI',
    font: fontHeader,
  });
  drawCell({
    col: 3,
    y: curY,
    h: t1HeaderH,
    style: TABLE_PALETTE.headerMain,
    text: ['Rata-Rata', 'Jarak VHMS'],
    font: fontHeader,
  });
  drawCell({
    col: 4,
    span: 2,
    y: curY,
    h: t1HeaderH1,
    style: TABLE_PALETTE.headerMain,
    text: 'n Hauler',
    font: fontHeader,
  });
  drawCell({
    col: 6,
    span: 2,
    y: curY,
    h: t1HeaderH1,
    style: TABLE_PALETTE.headerMain,
    text: 'Serving Time',
    font: fontHeader,
  });
  drawCell({
    col: 8,
    span: 2,
    y: curY,
    h: t1HeaderH1,
    style: TABLE_PALETTE.headerMain,
    text: 'Cycle Time',
    font: fontHeader,
  });
  drawCell({
    col: 10,
    span: 3,
    y: curY,
    h: t1HeaderH,
    style: TABLE_PALETTE.headerMain,
    text: 'MF',
    font: '700 13px "Plus Jakarta Sans", sans-serif',
  });

  // Sub-header Baris 2 Bagian 1
  const subY1 = curY + t1HeaderH1;
  drawCell({
    col: 4,
    y: subY1,
    h: t1HeaderH2,
    style: TABLE_PALETTE.headerSub,
    text: 'Plan',
    font: fontSubHeader,
  });
  drawCell({
    col: 5,
    y: subY1,
    h: t1HeaderH2,
    style: TABLE_PALETTE.headerSub,
    text: 'Actual',
    font: fontSubHeader,
  });
  drawCell({
    col: 6,
    y: subY1,
    h: t1HeaderH2,
    style: TABLE_PALETTE.headerSub,
    text: 'Plan',
    font: fontSubHeader,
  });
  drawCell({
    col: 7,
    y: subY1,
    h: t1HeaderH2,
    style: TABLE_PALETTE.headerSub,
    text: 'Actual',
    font: fontSubHeader,
  });
  drawCell({
    col: 8,
    y: subY1,
    h: t1HeaderH2,
    style: TABLE_PALETTE.headerSub,
    text: 'Plan',
    font: fontSubHeader,
  });
  drawCell({
    col: 9,
    y: subY1,
    h: t1HeaderH2,
    style: TABLE_PALETTE.headerSub,
    text: 'Actual',
    font: fontSubHeader,
  });

  curY += t1HeaderH;

  // Merge Lokasi Pit Bagian 1
  if (pitCalcResults.length > 0) {
    drawCell({
      col: 0,
      y: curY,
      h: pitCalcResults.length * t1RowH,
      style: TABLE_PALETTE.pitColumn,
      text: pit,
      font: '700 14px "Plus Jakarta Sans", sans-serif',
    });
  }

  pitCalcResults.forEach((r) => {
    const stStyle = getServingTimeStyle(
      r.avgServingTimeActual,
      params.planServingTime
    );
    const ctActStyle = getCycleTimeActualStyle(
      r.avgCtActual,
      r.ctPlanCalculated
    );
    const mfStyle = getMfStyle(r.remark);

    drawCell({
      col: 1,
      y: curY,
      h: t1RowH,
      style: TABLE_PALETTE.loaderColumn,
      text: r.loader.name,
      font: fontSansBold,
    });
    drawCell({
      col: 2,
      y: curY,
      h: t1RowH,
      style: TABLE_PALETTE.dataWhite,
      text: r.loader.egi,
      font: fontSansMed,
    });
    drawCell({
      col: 3,
      y: curY,
      h: t1RowH,
      style: TABLE_PALETTE.dataWhite,
      text: formatMeters(r.avgJarakM),
      font: fontMonoBold,
    });
    drawCell({
      col: 4,
      y: curY,
      h: t1RowH,
      style: TABLE_PALETTE.planColumn,
      text: formatIdNumber(r.planKebutuhanHd, 1),
      font: fontMonoBold,
    });
    drawCell({
      col: 5,
      y: curY,
      h: t1RowH,
      style: TABLE_PALETTE.dataWhite,
      text: formatHdCount(r.nHdActual),
      font: fontMonoBold,
    });
    drawCell({
      col: 6,
      y: curY,
      h: t1RowH,
      style: TABLE_PALETTE.planColumn,
      text: formatIdNumber(params.planServingTime, 2),
      font: fontMonoBold,
    });
    drawCell({
      col: 7,
      y: curY,
      h: t1RowH,
      style: stStyle,
      text: formatIdNumber(r.avgServingTimeActual, 2),
      font: fontMonoBold,
    });
    drawCell({
      col: 8,
      y: curY,
      h: t1RowH,
      style: TABLE_PALETTE.planColumn,
      text: formatIdNumber(r.ctPlanCalculated, 2),
      font: fontMonoBold,
    });
    drawCell({
      col: 9,
      y: curY,
      h: t1RowH,
      style: ctActStyle,
      text: formatIdNumber(r.avgCtActual, 2),
      font: fontMonoBold,
    });
    drawCell({
      col: 10,
      span: 3,
      y: curY,
      h: t1RowH,
      style: mfStyle,
      text: formatIdNumber(r.mf, 2),
      font: '700 13.5px "JetBrains Mono", monospace',
    });

    curY += t1RowH;
  });

  // =========================================================================
  // 2. BAGIAN 2 (TENGAH): HEADER & DATA EVALUASI PREDICTIVE RITASI (13 Kolom Simetris)
  // =========================================================================
  drawCell({
    col: 0,
    y: curY,
    h: t2HeaderH,
    style: TABLE_PALETTE.headerMain,
    text: 'Lokasi Pit',
    font: fontHeader,
  });
  drawCell({
    col: 1,
    y: curY,
    h: t2HeaderH,
    style: TABLE_PALETTE.headerMain,
    text: 'Loader',
    font: fontHeader,
  });
  drawCell({
    col: 2,
    y: curY,
    h: t2HeaderH,
    style: TABLE_PALETTE.headerMain,
    text: 'Jumlah HD',
    font: fontHeader,
  });
  drawCell({
    col: 3,
    y: curY,
    h: t2HeaderH,
    style: TABLE_PALETTE.headerMain,
    text: 'Serving Time',
    font: fontHeader,
  });
  drawCell({
    col: 4,
    y: curY,
    h: t2HeaderH,
    style: TABLE_PALETTE.headerMain,
    text: ['Cycle', 'Time'],
    font: fontHeader,
  });
  drawCell({
    col: 5,
    y: curY,
    h: t2HeaderH,
    style: TABLE_PALETTE.headerMain,
    text: ['MF', 'Aktual'],
    font: fontHeader,
  });
  drawCell({
    col: 6,
    y: curY,
    h: t2HeaderH,
    style: TABLE_PALETTE.headerMain,
    text: ['Predictive Ritasi', '(Rit. Should Be)'],
    font: fontHeaderSmall,
  });
  drawCell({
    col: 7,
    span: 2,
    y: curY,
    h: t2HeaderH,
    style: TABLE_PALETTE.headerMain,
    text: 'Gantung/Antri',
    font: fontHeader,
  });
  drawCell({
    col: 9,
    y: curY,
    h: t2HeaderH,
    style: TABLE_PALETTE.headerMain,
    text: ['Durasi', '(min/hr)'],
    font: fontHeaderSmall,
  });
  drawCell({
    col: 10,
    y: curY,
    h: t2HeaderH,
    style: TABLE_PALETTE.headerMain,
    text: 'Priority',
    font: fontHeader,
  });
  drawCell({
    col: 11,
    span: 2,
    y: curY,
    h: t2HeaderH,
    style: TABLE_PALETTE.headerMain,
    text: 'Remarks',
    font: fontHeader,
  });

  curY += t2HeaderH;

  // Merge Lokasi Pit Bagian 2
  if (pitCalcResults.length > 0) {
    drawCell({
      col: 0,
      y: curY,
      h: pitCalcResults.length * t2RowH,
      style: TABLE_PALETTE.pitColumn,
      text: pit,
      font: '700 14px "Plus Jakarta Sans", sans-serif',
    });
  }

  pitCalcResults.forEach((r) => {
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

    drawCell({
      col: 1,
      y: curY,
      h: t2RowH,
      style: TABLE_PALETTE.loaderColumn,
      text: r.loader.name,
      font: fontSansBold,
    });
    drawCell({
      col: 2,
      y: curY,
      h: t2RowH,
      style: TABLE_PALETTE.dataWhite,
      text: formatHdCount(r.nHdActual),
      font: fontMonoBold,
    });
    drawCell({
      col: 3,
      y: curY,
      h: t2RowH,
      style: stStyle,
      text: formatIdNumber(r.avgServingTimeActual, 2),
      font: fontMonoBold,
    });
    drawCell({
      col: 4,
      y: curY,
      h: t2RowH,
      style: ctActStyle,
      text: formatIdNumber(r.avgCtActual, 2),
      font: fontMonoBold,
    });
    drawCell({
      col: 5,
      y: curY,
      h: t2RowH,
      style: mfStyle,
      text: formatIdNumber(r.mf, 2),
      font: fontMonoBold,
    });
    drawCell({
      col: 6,
      y: curY,
      h: t2RowH,
      style: prStyle,
      text: formatIdNumber(r.predictiveRitasi, 2),
      font: '700 13px "JetBrains Mono", monospace',
    });
    drawCell({
      col: 7,
      span: 2,
      y: curY,
      h: t2RowH,
      style: mfStyle,
      text: r.remark,
      font: fontSansBold,
    });
    drawCell({
      col: 9,
      y: curY,
      h: t2RowH,
      style: durStyle,
      text: formatIdNumber(r.durasiMenitPerJam, 1),
      font: fontMonoBold,
    });
    drawCell({
      col: 10,
      y: curY,
      h: t2RowH,
      style: prioStyle,
      text: r.priorityLabel,
      font: fontSansBold,
    });
    drawCell({
      col: 11,
      span: 2,
      y: curY,
      h: t2RowH,
      style: TABLE_PALETTE.dataWhite,
      text: r.loader.status,
      font: fontSansBold,
    });

    curY += t2RowH;
  });

  // =========================================================================
  // 3. BAGIAN 3 (BAWAH): VHMS HOURLY [PIT] (13 Kolom Simetris)
  // =========================================================================
  drawCell({
    col: 0,
    span: 13,
    y: curY,
    h: t3TitleH,
    style: TABLE_PALETTE.bannerSection,
    text: `VHMS HOURLY ${pit.toUpperCase()}`,
    font: '700 13px "Plus Jakarta Sans", sans-serif',
  });
  curY += t3TitleH;

  drawCell({
    col: 0,
    span: 2,
    y: curY,
    h: t3HeaderH,
    style: TABLE_PALETTE.headerMain,
    text: 'PC',
    font: fontHeader,
  });
  drawCell({
    col: 2,
    y: curY,
    h: t3HeaderH,
    style: TABLE_PALETTE.headerMain,
    text: 'UNIT',
    font: fontHeader,
  });
  drawCell({
    col: 3,
    y: curY,
    h: t3HeaderH,
    style: TABLE_PALETTE.headerMain,
    text: ['Nama Operator', `(${shiftBadge})`],
    font: fontHeader,
  });
  drawCell({
    col: 4,
    y: curY,
    h: t3HeaderH,
    style: TABLE_PALETTE.headerMain,
    text: ['Jarak', '(km)'],
    font: fontHeader,
  });
  drawCell({
    col: 5,
    span: 2,
    y: curY,
    h: t3HeaderH1,
    style: TABLE_PALETTE.headerMain,
    text: 'Cycle Time',
    font: fontHeader,
  });
  drawCell({
    col: 5,
    y: curY + t3HeaderH1,
    h: t3HeaderH2,
    style: TABLE_PALETTE.headerSub,
    text: 'Plan',
    font: fontSubHeader,
  });
  drawCell({
    col: 6,
    y: curY + t3HeaderH1,
    h: t3HeaderH2,
    style: TABLE_PALETTE.headerSub,
    text: 'Actual',
    font: fontSubHeader,
  });
  drawCell({
    col: 7,
    span: 2,
    y: curY,
    h: t3HeaderH,
    style: TABLE_PALETTE.headerMain,
    text: 'Loading Time',
    font: fontHeader,
  });
  drawCell({
    col: 9,
    y: curY,
    h: t3HeaderH,
    style: TABLE_PALETTE.headerMain,
    text: 'Speed',
    font: fontHeader,
  });
  drawCell({
    col: 10,
    y: curY,
    h: t3HeaderH,
    style: TABLE_PALETTE.headerMain,
    text: ['Plan', 'Speed'],
    font: fontHeader,
  });
  drawCell({
    col: 11,
    y: curY,
    h: t3HeaderH,
    style: TABLE_PALETTE.headerMain,
    text: 'EST',
    font: fontHeader,
  });
  drawCell({
    col: 12,
    y: curY,
    h: t3HeaderH,
    style: TABLE_PALETTE.headerMain,
    text: 'LST',
    font: fontHeader,
  });

  curY += t3HeaderH;

  pitCalcResults.forEach((r) => {
    const rawSlots = getLoaderSlots(r.loader.id);

    // Sel Loader / PC (Col 0..1, rowSpan = rawSlots.length)
    drawCell({
      col: 0,
      span: 2,
      y: curY,
      h: rawSlots.length * t3DtRowH,
      style: TABLE_PALETTE.loaderColumn,
      text: r.loader.name,
      font: '700 13.5px "Plus Jakarta Sans", sans-serif',
      allowWrap: true,
      maxLines: 2,
    });

    rawSlots.forEach((rawUnit) => {
      const numericId = rawUnit.replace(/\D+/g, '');
      const normalizedUnit = numericId ? `DT${numericId}` : '';
      const vRow = normalizedUnit
        ? vhmsByUnit.get(normalizedUnit.toUpperCase()) || null
        : null;

      // Kolom UNIT Hijau (Col 2)
      drawCell({
        col: 2,
        y: curY,
        h: t3DtRowH,
        style: TABLE_PALETTE.unitInputGreen,
        text: numericId || '-',
        font: fontMonoBold,
      });

      // Kolom NAMA OPERATOR (Col 3) - Ample width, word-wrapping, auto font scaling
      const opMatch = matchOperatorName(
        numericId,
        r.loader.name,
        operatorRecords || [],
        activeShift
      );
      const opDisplayName =
        opMatch.status === 'FOUND'
          ? opMatch.name
          : opMatch.status === 'AMBIGUOUS'
          ? opMatch.name
          : '—';

      drawCell({
        col: 3,
        y: curY,
        h: t3DtRowH,
        style: TABLE_PALETTE.dataWhite,
        text: opDisplayName,
        font: fontOperator,
        allowWrap: true,
        maxLines: 2,
        paddingX: 8,
        minFontSize: 8.5,
      });

      if (vRow) {
        const ctStyle = getDtMetricStyle(
          Boolean(
            vRow.ctActual !== null &&
              vRow.ctPlan !== null &&
              vRow.ctActual > vRow.ctPlan
          )
        );
        const ltStyle = getDtMetricStyle(
          Boolean(
            vRow.ltActual !== null && vRow.ltActual > params.planServingTime
          )
        );
        const spdStyle = getDtMetricStyle(
          Boolean(
            vRow.speedAvgActual !== null &&
              vRow.speedAvgPlan !== null &&
              vRow.speedAvgActual < vRow.speedAvgPlan
          ),
          true
        );
        const estStyle = getDtMetricStyle(
          Boolean(vRow.estActual !== null && vRow.estActual > 1.0)
        );
        const lstStyle = getDtMetricStyle(
          Boolean(vRow.lstActual !== null && vRow.lstActual > 0.15)
        );

        drawCell({
          col: 4,
          y: curY,
          h: t3DtRowH,
          style: TABLE_PALETTE.dataWhite,
          text: formatIdNumber(vRow.jarakKm, 2),
          font: fontMonoReg,
        });
        drawCell({
          col: 5,
          y: curY,
          h: t3DtRowH,
          style: TABLE_PALETTE.planColumn,
          text: formatIdNumber(vRow.ctPlan, 2),
          font: fontMonoReg,
        });
        drawCell({
          col: 6,
          y: curY,
          h: t3DtRowH,
          style: ctStyle,
          text: formatIdNumber(vRow.ctActual, 2),
          font: fontMonoData,
        });
        drawCell({
          col: 7,
          span: 2,
          y: curY,
          h: t3DtRowH,
          style: ltStyle,
          text: formatIdNumber(vRow.ltActual, 2),
          font: fontMonoData,
        });
        drawCell({
          col: 9,
          y: curY,
          h: t3DtRowH,
          style: spdStyle,
          text: formatIdNumber(vRow.speedAvgActual, 2),
          font: fontMonoData,
        });
        drawCell({
          col: 10,
          y: curY,
          h: t3DtRowH,
          style: TABLE_PALETTE.planColumn,
          text: formatIdNumber(vRow.speedAvgPlan, 2),
          font: fontMonoReg,
        });
        drawCell({
          col: 11,
          y: curY,
          h: t3DtRowH,
          style: estStyle,
          text: formatIdNumber(vRow.estActual, 2),
          font: fontMonoData,
        });
        drawCell({
          col: 12,
          y: curY,
          h: t3DtRowH,
          style: lstStyle,
          text: formatIdNumber(vRow.lstActual, 2),
          font: fontMonoData,
        });
      } else {
        // Blok abu-abu terang jika DT tidak ada di VHMS
        drawCell({
          col: 4,
          y: curY,
          h: t3DtRowH,
          style: TABLE_PALETTE.missingGray,
          text: '',
          font: fontMonoReg,
        });
        drawCell({
          col: 5,
          y: curY,
          h: t3DtRowH,
          style: TABLE_PALETTE.missingGray,
          text: '',
          font: fontMonoReg,
        });
        drawCell({
          col: 6,
          y: curY,
          h: t3DtRowH,
          style: TABLE_PALETTE.missingGray,
          text: '',
          font: fontMonoReg,
        });
        drawCell({
          col: 7,
          span: 2,
          y: curY,
          h: t3DtRowH,
          style: TABLE_PALETTE.missingGray,
          text: '',
          font: fontMonoReg,
        });
        drawCell({
          col: 9,
          y: curY,
          h: t3DtRowH,
          style: TABLE_PALETTE.missingGray,
          text: '',
          font: fontMonoReg,
        });
        drawCell({
          col: 10,
          y: curY,
          h: t3DtRowH,
          style: TABLE_PALETTE.missingGray,
          text: '',
          font: fontMonoReg,
        });
        drawCell({
          col: 11,
          y: curY,
          h: t3DtRowH,
          style: TABLE_PALETTE.missingGray,
          text: '',
          font: fontMonoReg,
        });
        drawCell({
          col: 12,
          y: curY,
          h: t3DtRowH,
          style: TABLE_PALETTE.missingGray,
          text: '',
          font: fontMonoReg,
        });
      }

      curY += t3DtRowH;
    });

    // Baris AVERAGE per Loader
    drawCell({
      col: 0,
      span: 4,
      y: curY,
      h: t3AvgRowH,
      style: TABLE_PALETTE.averageRow,
      text: 'AVERAGE',
      font: fontSansMed,
    });
    drawCell({
      col: 4,
      y: curY,
      h: t3AvgRowH,
      style: TABLE_PALETTE.averageRow,
      text: formatMeters(r.avgJarakM),
      font: fontMonoBold,
    });
    drawCell({
      col: 5,
      y: curY,
      h: t3AvgRowH,
      style: TABLE_PALETTE.averageRow,
      text: formatIdNumber(r.ctPlanCalculated, 2),
      font: fontMonoBold,
    });
    drawCell({
      col: 6,
      y: curY,
      h: t3AvgRowH,
      style: TABLE_PALETTE.averageRow,
      text: formatIdNumber(r.avgCtActual, 2),
      font: fontMonoBold,
    });
    drawCell({
      col: 7,
      span: 2,
      y: curY,
      h: t3AvgRowH,
      style: TABLE_PALETTE.averageRow,
      text: formatIdNumber(r.avgServingTimeActual, 2),
      font: fontMonoBold,
    });
    drawCell({
      col: 9,
      y: curY,
      h: t3AvgRowH,
      style: TABLE_PALETTE.averageRow,
      text: formatIdNumber(r.avgSpeedActual, 2),
      font: fontMonoBold,
    });
    drawCell({
      col: 10,
      y: curY,
      h: t3AvgRowH,
      style: TABLE_PALETTE.averageRow,
      text: formatIdNumber(r.avgSpeedPlan, 2),
      font: fontMonoBold,
    });
    drawCell({
      col: 11,
      span: 2,
      y: curY,
      h: t3AvgRowH,
      style: TABLE_PALETTE.averageCross,
      text: 'X',
      font: fontSansMed,
    });

    curY += t3AvgRowH;
  });

  // Bingkai luar tabel keseluruhan agar rapi & presisi
  ctx.strokeStyle = TABLE_PALETTE.outerBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(padX, tableStartY, tableWidth, totalTableHeight);

  // Unduh gambar PNG
  const link = document.createElement('a');
  const safePit = pit.replace(/\s+/g, '_');
  const safeShift = shiftBadge;
  const safeDate = operationalDate?.display
    ? operationalDate.display.replace(/\s+/g, '_')
    : 'Auto';

  link.download = `MF_Predictive_Ritasi_${safePit}_${safeShift}_${safeDate}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
