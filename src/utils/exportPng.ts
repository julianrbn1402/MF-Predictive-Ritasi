import {
  GlobalParams,
  LoaderCalculationResult,
  VhmsMetadata,
  VhmsRow,
} from '../types';
import { formatIdNumber, formatMeters } from './formulas';
import {
  SYMMETRIC_COL_WIDTHS,
  TOTAL_TABLE_WIDTH,
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

interface ExportPngOptions {
  pit: string;
  pitCalcResults: LoaderCalculationResult[];
  vhmsRows: VhmsRow[];
  params: GlobalParams;
  assignments: Record<string, string[]>;
  metadata: VhmsMetadata;
}

export async function exportOutputTablesToPng({
  pit,
  pitCalcResults,
  vhmsRows,
  params,
  assignments,
  metadata,
}: ExportPngOptions): Promise<void> {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // Lanjutkan jika font tidak dapat ditunggu
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

  // Skala 2x untuk hasil gambar PNG resolusi tinggi yang tajam
  const scale = 2;
  const padX = 24;
  const padY = 24;
  const tableWidth = TOTAL_TABLE_WIDTH; // 946px (13 kolom simetris)
  const width = tableWidth + padX * 2; // 994px

  // Koordinat X dan Lebar untuk 13 Kolom Simetris (persis sama dengan <colgroup> di aplikasi)
  const colX: number[] = [];
  SYMMETRIC_COL_WIDTHS.reduce((acc, w) => {
    colX.push(acc);
    return acc + w;
  }, padX);

  const getSpanWidth = (startCol: number, span: number = 1): number => {
    let sum = 0;
    for (let i = startCol; i < startCol + span; i++) {
      sum += SYMMETRIC_COL_WIDTHS[i] || 0;
    }
    return sum;
  };

  const numLoaders = Math.max(1, pitCalcResults.length);
  const totalDtSlots = pitCalcResults.reduce(
    (acc, r) => acc + getLoaderSlots(r.loader.id).length,
    0
  );

  // Tinggi masing-masing seksi (sama persis dengan tinggi baris tabel aplikasi)
  const bannerHeight = 60;
  const bannerGap = 14;

  const t1HeaderH1 = 28;
  const t1HeaderH2 = 28;
  const t1HeaderH = t1HeaderH1 + t1HeaderH2; // 56px
  const t1RowH = 38;
  const t1Height = t1HeaderH + numLoaders * t1RowH;

  const t2HeaderH = 52;
  const t2RowH = 38;
  const t2Height = t2HeaderH + numLoaders * t2RowH;

  const t3TitleH = 34;
  const t3HeaderH1 = 26;
  const t3HeaderH2 = 26;
  const t3HeaderH = t3HeaderH1 + t3HeaderH2; // 52px
  const t3DtRowH = 28;
  const t3AvgRowH = 30;
  const t3Height =
    t3TitleH +
    t3HeaderH +
    totalDtSlots * t3DtRowH +
    numLoaders * t3AvgRowH;

  const totalTableHeight = t1Height + t2Height + t3Height;
  const totalHeight = padY + bannerHeight + bannerGap + totalTableHeight + padY;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = totalHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(scale, scale);

  // Background kanvas luar (slate-950 sesuai tema aplikasi)
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, width, totalHeight);

  // Font konsisten sesuai aplikasi
  const fontHeader = '700 12px "Plus Jakarta Sans", -apple-system, sans-serif';
  const fontSubHeader = '700 11.5px "Plus Jakarta Sans", -apple-system, sans-serif';
  const fontHeaderSmall = '700 11px "Plus Jakarta Sans", -apple-system, sans-serif';
  const fontSansBold = '700 13px "Plus Jakarta Sans", -apple-system, sans-serif';
  const fontSansMed = '700 12px "Plus Jakarta Sans", -apple-system, sans-serif';
  const fontMonoBold = '700 13px "JetBrains Mono", monospace';
  const fontMonoData = '600 12.5px "JetBrains Mono", monospace';
  const fontMonoReg = '500 12.5px "JetBrains Mono", monospace';

  // Helper menggambar sel pada grid 13 kolom
  const drawGridCell = (
    startCol: number,
    colSpan: number,
    y: number,
    h: number,
    style: CellColorStyle,
    text: string | string[],
    font: string = fontMonoBold
  ) => {
    const x = colX[startCol];
    const w = getSpanWidth(startCol, colSpan);

    ctx.fillStyle = style.bg;
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = TABLE_PALETTE.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = style.fg;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (Array.isArray(text)) {
      const lineHeight = 13.5;
      const startY = y + h / 2 - ((text.length - 1) * lineHeight) / 2;
      text.forEach((line, idx) => {
        ctx.fillText(line, x + w / 2, startY + idx * lineHeight);
      });
    } else if (text) {
      ctx.fillText(text, x + w / 2, y + h / 2);
    }
  };

  // =========================================================================
  // 0. HEADER BANNER APLIKASI (MF Predictive Ritasi · part of Autonomia!)
  // =========================================================================
  let curY = padY;
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(padX, curY, tableWidth, bannerHeight);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(padX, curY, tableWidth, bannerHeight);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#F8FAFC';
  ctx.font = '700 18px "Syne", "Plus Jakarta Sans", sans-serif';
  ctx.fillText('MF Predictive Ritasi', padX + 18, curY + 22);

  ctx.fillStyle = '#FBBF24';
  ctx.font = 'italic 600 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('part of Autonomia!', padX + 18, curY + 42);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#E2E8F0';
  ctx.font = '700 12px "JetBrains Mono", monospace';
  ctx.fillText(
    `${pit} · ${metadata.hoursLabel} · Data per ${metadata.latestUpdatedDisplay}`,
    padX + tableWidth - 18,
    curY + 22
  );
  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    metadata.companyJobsite,
    padX + tableWidth - 18,
    curY + 42
  );

  curY += bannerHeight + bannerGap;
  const tableStartY = curY;

  // =========================================================================
  // 1. BAGIAN 1 (ATAS): HEADER & DATA RINGKASAN MF (13 Kolom Simetris)
  // =========================================================================
  drawGridCell(0, 1, curY, t1HeaderH, TABLE_PALETTE.headerMain, 'Lokasi Pit', fontHeader);
  drawGridCell(1, 1, curY, t1HeaderH, TABLE_PALETTE.headerMain, 'Loader', fontHeader);
  drawGridCell(2, 1, curY, t1HeaderH, TABLE_PALETTE.headerMain, 'EGI', fontHeader);
  drawGridCell(
    3,
    1,
    curY,
    t1HeaderH,
    TABLE_PALETTE.headerMain,
    ['Rata-Rata', 'Jarak VHMS'],
    fontHeader
  );
  drawGridCell(4, 2, curY, t1HeaderH1, TABLE_PALETTE.headerMain, 'n Hauler', fontHeader);
  drawGridCell(6, 2, curY, t1HeaderH1, TABLE_PALETTE.headerMain, 'Serving Time', fontHeader);
  drawGridCell(8, 2, curY, t1HeaderH1, TABLE_PALETTE.headerMain, 'Cycle Time', fontHeader);
  drawGridCell(
    10,
    3,
    curY,
    t1HeaderH,
    TABLE_PALETTE.headerMain,
    'MF',
    '700 13px "Plus Jakarta Sans", sans-serif'
  );

  // Sub-header Baris 2 Bagian 1
  const subY1 = curY + t1HeaderH1;
  drawGridCell(4, 1, subY1, t1HeaderH2, TABLE_PALETTE.headerSub, 'Plan', fontSubHeader);
  drawGridCell(5, 1, subY1, t1HeaderH2, TABLE_PALETTE.headerSub, 'Actual', fontSubHeader);
  drawGridCell(6, 1, subY1, t1HeaderH2, TABLE_PALETTE.headerSub, 'Plan', fontSubHeader);
  drawGridCell(7, 1, subY1, t1HeaderH2, TABLE_PALETTE.headerSub, 'Actual', fontSubHeader);
  drawGridCell(8, 1, subY1, t1HeaderH2, TABLE_PALETTE.headerSub, 'Plan', fontSubHeader);
  drawGridCell(9, 1, subY1, t1HeaderH2, TABLE_PALETTE.headerSub, 'Actual', fontSubHeader);

  curY += t1HeaderH;

  // Merge Lokasi Pit Bagian 1 (Teks rata tengah)
  if (pitCalcResults.length > 0) {
    drawGridCell(
      0,
      1,
      curY,
      pitCalcResults.length * t1RowH,
      TABLE_PALETTE.pitColumn,
      pit,
      '700 14px "Plus Jakarta Sans", sans-serif'
    );
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

    drawGridCell(1, 1, curY, t1RowH, TABLE_PALETTE.loaderColumn, r.loader.name, fontSansBold);
    drawGridCell(2, 1, curY, t1RowH, TABLE_PALETTE.dataWhite, r.loader.egi, fontSansMed);
    drawGridCell(
      3,
      1,
      curY,
      t1RowH,
      TABLE_PALETTE.dataWhite,
      formatMeters(r.avgJarakM),
      fontMonoBold
    );
    drawGridCell(
      4,
      1,
      curY,
      t1RowH,
      TABLE_PALETTE.planColumn,
      formatIdNumber(r.planKebutuhanHd, 1),
      fontMonoBold
    );
    drawGridCell(
      5,
      1,
      curY,
      t1RowH,
      TABLE_PALETTE.dataWhite,
      r.nHdActual > 0 ? String(r.nHdActual) : '-',
      fontMonoBold
    );
    drawGridCell(
      6,
      1,
      curY,
      t1RowH,
      TABLE_PALETTE.planColumn,
      formatIdNumber(params.planServingTime, 2),
      fontMonoBold
    );
    drawGridCell(
      7,
      1,
      curY,
      t1RowH,
      stStyle,
      formatIdNumber(r.avgServingTimeActual, 2),
      fontMonoBold
    );
    drawGridCell(
      8,
      1,
      curY,
      t1RowH,
      TABLE_PALETTE.planColumn,
      formatIdNumber(r.ctPlanCalculated, 2),
      fontMonoBold
    );
    drawGridCell(
      9,
      1,
      curY,
      t1RowH,
      ctActStyle,
      formatIdNumber(r.avgCtActual, 2),
      fontMonoBold
    );
    drawGridCell(
      10,
      3,
      curY,
      t1RowH,
      mfStyle,
      formatIdNumber(r.mf, 2),
      '700 13.5px "JetBrains Mono", monospace'
    );

    curY += t1RowH;
  });

  // =========================================================================
  // 2. BAGIAN 2 (TENGAH): HEADER & DATA EVALUASI PREDICTIVE RITASI (13 Kolom Simetris)
  // =========================================================================
  drawGridCell(0, 1, curY, t2HeaderH, TABLE_PALETTE.headerMain, 'Lokasi Pit', fontHeader);
  drawGridCell(1, 1, curY, t2HeaderH, TABLE_PALETTE.headerMain, 'Loader', fontHeader);
  drawGridCell(2, 1, curY, t2HeaderH, TABLE_PALETTE.headerMain, 'Jumlah HD', fontHeader);
  drawGridCell(3, 1, curY, t2HeaderH, TABLE_PALETTE.headerMain, 'Serving Time', fontHeader);
  drawGridCell(
    4,
    1,
    curY,
    t2HeaderH,
    TABLE_PALETTE.headerMain,
    ['Cycle', 'Time'],
    fontHeader
  );
  drawGridCell(
    5,
    1,
    curY,
    t2HeaderH,
    TABLE_PALETTE.headerMain,
    ['MF', 'Aktual'],
    fontHeader
  );
  drawGridCell(
    6,
    1,
    curY,
    t2HeaderH,
    TABLE_PALETTE.headerMain,
    ['Predictive', 'Ritasi', '(Rit. Should Be)'],
    fontHeaderSmall
  );
  drawGridCell(7, 2, curY, t2HeaderH, TABLE_PALETTE.headerMain, 'Gantung/Antri', fontHeader);
  drawGridCell(
    9,
    1,
    curY,
    t2HeaderH,
    TABLE_PALETTE.headerMain,
    ['Durasi', '(min/hr)'],
    fontHeaderSmall
  );
  drawGridCell(10, 1, curY, t2HeaderH, TABLE_PALETTE.headerMain, 'Priority', fontHeader);
  drawGridCell(11, 2, curY, t2HeaderH, TABLE_PALETTE.headerMain, 'Remarks', fontHeader);

  curY += t2HeaderH;

  // Merge Lokasi Pit Bagian 2 (Teks rata tengah)
  if (pitCalcResults.length > 0) {
    drawGridCell(
      0,
      1,
      curY,
      pitCalcResults.length * t2RowH,
      TABLE_PALETTE.pitColumn,
      pit,
      '700 14px "Plus Jakarta Sans", sans-serif'
    );
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

    drawGridCell(1, 1, curY, t2RowH, TABLE_PALETTE.loaderColumn, r.loader.name, fontSansBold);
    drawGridCell(
      2,
      1,
      curY,
      t2RowH,
      TABLE_PALETTE.dataWhite,
      r.nHdActual > 0 ? String(r.nHdActual) : '-',
      fontMonoBold
    );
    drawGridCell(
      3,
      1,
      curY,
      t2RowH,
      stStyle,
      formatIdNumber(r.avgServingTimeActual, 2),
      fontMonoBold
    );
    drawGridCell(
      4,
      1,
      curY,
      t2RowH,
      ctActStyle,
      formatIdNumber(r.avgCtActual, 2),
      fontMonoBold
    );
    drawGridCell(
      5,
      1,
      curY,
      t2RowH,
      mfStyle,
      formatIdNumber(r.mf, 2),
      fontMonoBold
    );
    drawGridCell(
      6,
      1,
      curY,
      t2RowH,
      prStyle,
      formatIdNumber(r.predictiveRitasi, 1),
      fontMonoBold
    );
    drawGridCell(
      7,
      2,
      curY,
      t2RowH,
      mfStyle,
      r.hasData ? r.remark : '-',
      fontSansMed
    );
    drawGridCell(
      9,
      1,
      curY,
      t2RowH,
      durStyle,
      formatIdNumber(r.durasiMenitPerJam, 1),
      fontMonoBold
    );
    drawGridCell(
      10,
      1,
      curY,
      t2RowH,
      prioStyle,
      r.priorityLabel,
      fontSansBold
    );
    drawGridCell(
      11,
      2,
      curY,
      t2RowH,
      TABLE_PALETTE.dataWhite,
      r.loader.status,
      fontSansBold
    );

    curY += t2RowH;
  });

  // =========================================================================
  // 3. BAGIAN 3 (BAWAH): VHMS HOURLY [PIT] (13 Kolom Simetris)
  // =========================================================================
  drawGridCell(
    0,
    13,
    curY,
    t3TitleH,
    TABLE_PALETTE.bannerSection,
    `VHMS HOURLY ${pit.toUpperCase()}`,
    '700 13px "Plus Jakarta Sans", sans-serif'
  );
  curY += t3TitleH;

  drawGridCell(0, 2, curY, t3HeaderH, TABLE_PALETTE.headerMain, 'PC', fontHeader);
  drawGridCell(2, 1, curY, t3HeaderH, TABLE_PALETTE.headerMain, 'UNIT', fontHeader);
  drawGridCell(3, 1, curY, t3HeaderH, TABLE_PALETTE.headerMain, 'UNIT', fontHeader);
  drawGridCell(4, 1, curY, t3HeaderH, TABLE_PALETTE.headerMain, 'Jarak', fontHeader);
  drawGridCell(5, 2, curY, t3HeaderH1, TABLE_PALETTE.headerMain, 'Cycle Time', fontHeader);
  drawGridCell(
    5,
    1,
    curY + t3HeaderH1,
    t3HeaderH2,
    TABLE_PALETTE.headerSub,
    'Plan',
    fontSubHeader
  );
  drawGridCell(
    6,
    1,
    curY + t3HeaderH1,
    t3HeaderH2,
    TABLE_PALETTE.headerSub,
    'Actual',
    fontSubHeader
  );
  drawGridCell(7, 2, curY, t3HeaderH, TABLE_PALETTE.headerMain, 'Loading Time', fontHeader);
  drawGridCell(9, 1, curY, t3HeaderH, TABLE_PALETTE.headerMain, 'Speed', fontHeader);
  drawGridCell(
    10,
    1,
    curY,
    t3HeaderH,
    TABLE_PALETTE.headerMain,
    ['Plan', 'Speed'],
    fontHeader
  );
  drawGridCell(11, 1, curY, t3HeaderH, TABLE_PALETTE.headerMain, 'EST', fontHeader);
  drawGridCell(12, 1, curY, t3HeaderH, TABLE_PALETTE.headerMain, 'LST', fontHeader);

  curY += t3HeaderH;

  pitCalcResults.forEach((r) => {
    const rawSlots = getLoaderSlots(r.loader.id);

    // Sel PC (Col 0..1, rowSpan = rawSlots.length)
    drawGridCell(
      0,
      2,
      curY,
      rawSlots.length * t3DtRowH,
      TABLE_PALETTE.loaderColumn,
      r.loader.name,
      '700 13.5px "Plus Jakarta Sans", sans-serif'
    );

    rawSlots.forEach((rawUnit) => {
      const numericId = rawUnit.replace(/\D+/g, '');
      const normalizedUnit = numericId ? `DT${numericId}` : '';
      const vRow = normalizedUnit
        ? vhmsByUnit.get(normalizedUnit.toUpperCase()) || null
        : null;

      // Kolom UNIT Hijau (Col 2)
      drawGridCell(
        2,
        1,
        curY,
        t3DtRowH,
        TABLE_PALETTE.unitInputGreen,
        numericId || '-',
        fontMonoBold
      );

      // Kolom UNIT DT#### Putih (Col 3)
      drawGridCell(
        3,
        1,
        curY,
        t3DtRowH,
        TABLE_PALETTE.dataWhite,
        normalizedUnit || '-',
        fontMonoReg
      );

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

        drawGridCell(
          4,
          1,
          curY,
          t3DtRowH,
          TABLE_PALETTE.dataWhite,
          formatIdNumber(vRow.jarakKm, 2),
          fontMonoReg
        );
        drawGridCell(
          5,
          1,
          curY,
          t3DtRowH,
          TABLE_PALETTE.planColumn,
          formatIdNumber(vRow.ctPlan, 2),
          fontMonoReg
        );
        drawGridCell(
          6,
          1,
          curY,
          t3DtRowH,
          ctStyle,
          formatIdNumber(vRow.ctActual, 2),
          fontMonoData
        );
        drawGridCell(
          7,
          2,
          curY,
          t3DtRowH,
          ltStyle,
          formatIdNumber(vRow.ltActual, 2),
          fontMonoData
        );
        drawGridCell(
          9,
          1,
          curY,
          t3DtRowH,
          spdStyle,
          formatIdNumber(vRow.speedAvgActual, 2),
          fontMonoData
        );
        drawGridCell(
          10,
          1,
          curY,
          t3DtRowH,
          TABLE_PALETTE.planColumn,
          formatIdNumber(vRow.speedAvgPlan, 2),
          fontMonoReg
        );
        drawGridCell(
          11,
          1,
          curY,
          t3DtRowH,
          estStyle,
          formatIdNumber(vRow.estActual, 2),
          fontMonoData
        );
        drawGridCell(
          12,
          1,
          curY,
          t3DtRowH,
          lstStyle,
          formatIdNumber(vRow.lstActual, 2),
          fontMonoData
        );
      } else {
        // Blok abu-abu terang jika DT tidak ditemukan di VHMS (persis seperti di tabel UI)
        drawGridCell(4, 1, curY, t3DtRowH, TABLE_PALETTE.missingGray, '', fontMonoReg);
        drawGridCell(5, 1, curY, t3DtRowH, TABLE_PALETTE.missingGray, '', fontMonoReg);
        drawGridCell(6, 1, curY, t3DtRowH, TABLE_PALETTE.missingGray, '', fontMonoReg);
        drawGridCell(7, 2, curY, t3DtRowH, TABLE_PALETTE.missingGray, '', fontMonoReg);
        drawGridCell(9, 1, curY, t3DtRowH, TABLE_PALETTE.missingGray, '', fontMonoReg);
        drawGridCell(10, 1, curY, t3DtRowH, TABLE_PALETTE.missingGray, '', fontMonoReg);
        drawGridCell(11, 1, curY, t3DtRowH, TABLE_PALETTE.missingGray, '', fontMonoReg);
        drawGridCell(12, 1, curY, t3DtRowH, TABLE_PALETTE.missingGray, '', fontMonoReg);
      }

      curY += t3DtRowH;
    });

    // Baris AVERAGE per Loader (Col 0..3 colSpan=4, Col 4, Col 5, Col 6, Col 7..8 colSpan=2, Col 9, Col 10, Col 11..12 colSpan=2)
    drawGridCell(
      0,
      4,
      curY,
      t3AvgRowH,
      TABLE_PALETTE.averageRow,
      'AVERAGE',
      fontSansMed
    );
    drawGridCell(
      4,
      1,
      curY,
      t3AvgRowH,
      TABLE_PALETTE.averageRow,
      formatMeters(r.avgJarakM),
      fontMonoBold
    );
    drawGridCell(
      5,
      1,
      curY,
      t3AvgRowH,
      TABLE_PALETTE.averageRow,
      formatIdNumber(r.ctPlanCalculated, 2),
      fontMonoBold
    );
    drawGridCell(
      6,
      1,
      curY,
      t3AvgRowH,
      TABLE_PALETTE.averageRow,
      formatIdNumber(r.avgCtActual, 2),
      fontMonoBold
    );
    drawGridCell(
      7,
      2,
      curY,
      t3AvgRowH,
      TABLE_PALETTE.averageRow,
      formatIdNumber(r.avgServingTimeActual, 2),
      fontMonoBold
    );
    drawGridCell(
      9,
      1,
      curY,
      t3AvgRowH,
      TABLE_PALETTE.averageRow,
      formatIdNumber(r.avgSpeedActual, 2),
      fontMonoBold
    );
    drawGridCell(
      10,
      1,
      curY,
      t3AvgRowH,
      TABLE_PALETTE.averageRow,
      formatIdNumber(r.avgSpeedPlan, 2),
      fontMonoBold
    );
    drawGridCell(
      11,
      2,
      curY,
      t3AvgRowH,
      TABLE_PALETTE.averageCross,
      'X',
      fontSansMed
    );

    curY += t3AvgRowH;
  });

  // Bingkai luar tabel keseluruhan agar presisi & tegas
  ctx.strokeStyle = TABLE_PALETTE.outerBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(padX, tableStartY, tableWidth, totalTableHeight);

  const link = document.createElement('a');
  link.download = `MF_Predictive_Ritasi_${pit.replace(/\s+/g, '_')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
