import { KonversiJarakRow, KonversiSanitizeResult } from '../types';

/**
 * Data awal (seed) Tabel Konversi Jarak (302 baris, jarakM dalam meter, konversi desimal).
 * Sumber: Sheet FIX RUMUS kolom U:W (Jobsite ARIA).
 */
export const SEED_KONVERSI_JARAK: KonversiJarakRow[] = [
  { jarakM: 50, konversi: 3.292 },
  { jarakM: 100, konversi: 2.64 },
  { jarakM: 150, konversi: 2.294 },
  { jarakM: 200, konversi: 2.16 },
  { jarakM: 300, konversi: 1.83 },
  { jarakM: 400, konversi: 1.6 },
  { jarakM: 500, konversi: 1.482 },
  { jarakM: 600, konversi: 1.342 },
  { jarakM: 700, konversi: 1.231 },
  { jarakM: 800, konversi: 1.14 },
  { jarakM: 900, konversi: 1.064 },
  { jarakM: 1000, konversi: 1 },
  { jarakM: 1100, konversi: 0.945 },
  { jarakM: 1200, konversi: 0.898 },
  { jarakM: 1300, konversi: 0.856 },
  { jarakM: 1400, konversi: 0.82 },
  { jarakM: 1500, konversi: 0.787 },
  { jarakM: 1600, konversi: 0.758 },
  { jarakM: 1700, konversi: 0.732 },
  { jarakM: 1800, konversi: 0.708 },
  { jarakM: 1900, konversi: 0.687 },
  { jarakM: 2000, konversi: 0.667 },
  { jarakM: 2100, konversi: 0.649 },
  { jarakM: 2200, konversi: 0.632 },
  { jarakM: 2300, konversi: 0.617 },
  { jarakM: 2400, konversi: 0.603 },
  { jarakM: 2500, konversi: 0.59 },
  { jarakM: 2600, konversi: 0.578 },
  { jarakM: 2700, konversi: 0.566 },
  { jarakM: 2800, konversi: 0.555 },
  { jarakM: 2900, konversi: 0.545 },
  { jarakM: 3000, konversi: 0.536 },
  { jarakM: 3100, konversi: 0.527 },
  { jarakM: 3200, konversi: 0.519 },
  { jarakM: 3300, konversi: 0.511 },
  { jarakM: 3400, konversi: 0.504 },
  { jarakM: 3500, konversi: 0.497 },
  { jarakM: 3600, konversi: 0.49 },
  { jarakM: 3700, konversi: 0.483 },
  { jarakM: 3800, konversi: 0.477 },
  { jarakM: 3900, konversi: 0.469 },
  { jarakM: 4000, konversi: 0.461 },
  { jarakM: 4100, konversi: 0.454 },
  { jarakM: 4200, konversi: 0.447 },
  { jarakM: 4300, konversi: 0.44 },
  { jarakM: 4400, konversi: 0.433 },
  { jarakM: 4500, konversi: 0.427 },
  { jarakM: 4600, konversi: 0.42 },
  { jarakM: 4700, konversi: 0.412 },
  { jarakM: 4800, konversi: 0.405 },
  { jarakM: 4900, konversi: 0.399 },
  { jarakM: 5000, konversi: 0.392 },
  { jarakM: 5100, konversi: 0.386 },
  { jarakM: 5200, konversi: 0.379 },
  { jarakM: 5300, konversi: 0.373 },
  { jarakM: 5400, konversi: 0.368 },
  { jarakM: 5500, konversi: 0.362 },
  { jarakM: 5600, konversi: 0.357 },
  { jarakM: 5700, konversi: 0.352 },
  { jarakM: 5800, konversi: 0.347 },
  { jarakM: 5900, konversi: 0.342 },
  { jarakM: 6000, konversi: 0.337 },
  { jarakM: 6100, konversi: 0.332 },
  { jarakM: 6200, konversi: 0.328 },
  { jarakM: 6300, konversi: 0.327 },
  { jarakM: 6400, konversi: 0.326 },
  { jarakM: 6500, konversi: 0.322 },
  { jarakM: 6600, konversi: 0.319 },
  { jarakM: 6700, konversi: 0.315 },
  { jarakM: 6800, konversi: 0.312 },
  { jarakM: 6900, konversi: 0.309 },
  { jarakM: 7000, konversi: 0.306 },
  { jarakM: 7100, konversi: 0.303 },
  { jarakM: 7200, konversi: 0.3 },
  { jarakM: 7300, konversi: 0.297 },
  { jarakM: 7400, konversi: 0.294 },
  { jarakM: 7500, konversi: 0.292 },
  { jarakM: 7600, konversi: 0.289 },
  { jarakM: 7700, konversi: 0.286 },
  { jarakM: 7800, konversi: 0.284 },
  { jarakM: 7900, konversi: 0.281 },
  { jarakM: 8000, konversi: 0.279 },
  { jarakM: 8100, konversi: 0.276 },
  { jarakM: 8200, konversi: 0.274 },
  { jarakM: 8300, konversi: 0.272 },
  { jarakM: 8400, konversi: 0.27 },
  { jarakM: 8500, konversi: 0.268 },
  { jarakM: 8600, konversi: 0.265 },
  { jarakM: 8700, konversi: 0.263 },
  { jarakM: 8800, konversi: 0.261 },
  { jarakM: 8900, konversi: 0.259 },
  { jarakM: 9000, konversi: 0.257 },
  { jarakM: 9100, konversi: 0.255 },
  { jarakM: 9200, konversi: 0.254 },
  { jarakM: 9300, konversi: 0.252 },
  { jarakM: 9400, konversi: 0.25 },
  { jarakM: 9500, konversi: 0.248 },
  { jarakM: 9600, konversi: 0.247 },
  { jarakM: 9700, konversi: 0.245 },
  { jarakM: 9800, konversi: 0.243 },
  { jarakM: 9900, konversi: 0.242 },
  { jarakM: 10000, konversi: 0.24 },
  { jarakM: 10100, konversi: 0.238 },
  { jarakM: 10200, konversi: 0.237 },
  { jarakM: 10300, konversi: 0.235 },
  { jarakM: 10400, konversi: 0.234 },
  { jarakM: 10500, konversi: 0.233 },
  { jarakM: 10600, konversi: 0.231 },
  { jarakM: 10700, konversi: 0.23 },
  { jarakM: 10800, konversi: 0.228 },
  { jarakM: 10900, konversi: 0.227 },
  { jarakM: 11000, konversi: 0.226 },
  { jarakM: 11100, konversi: 0.225 },
  { jarakM: 11200, konversi: 0.223 },
  { jarakM: 11300, konversi: 0.222 },
  { jarakM: 11400, konversi: 0.221 },
  { jarakM: 11500, konversi: 0.22 },
  { jarakM: 11600, konversi: 0.219 },
  { jarakM: 11700, konversi: 0.217 },
  { jarakM: 11800, konversi: 0.216 },
  { jarakM: 11900, konversi: 0.215 },
  { jarakM: 12000, konversi: 0.214 },
  { jarakM: 12100, konversi: 0.213 },
  { jarakM: 12200, konversi: 0.212 },
  { jarakM: 12300, konversi: 0.211 },
  { jarakM: 12400, konversi: 0.21 },
  { jarakM: 12500, konversi: 0.209 },
  { jarakM: 12600, konversi: 0.208 },
  { jarakM: 12700, konversi: 0.207 },
  { jarakM: 12800, konversi: 0.206 },
  { jarakM: 12900, konversi: 0.205 },
  { jarakM: 13000, konversi: 0.204 },
  { jarakM: 13100, konversi: 0.204 },
  { jarakM: 13200, konversi: 0.203 },
  { jarakM: 13300, konversi: 0.202 },
  { jarakM: 13400, konversi: 0.201 },
  { jarakM: 13500, konversi: 0.2 },
  { jarakM: 13600, konversi: 0.199 },
  { jarakM: 13700, konversi: 0.199 },
  { jarakM: 13800, konversi: 0.198 },
  { jarakM: 13900, konversi: 0.197 },
  { jarakM: 14000, konversi: 0.196 },
  { jarakM: 14100, konversi: 0.196 },
  { jarakM: 14200, konversi: 0.195 },
  { jarakM: 14300, konversi: 0.194 },
  { jarakM: 14400, konversi: 0.194 },
  { jarakM: 14500, konversi: 0.193 },
  { jarakM: 14600, konversi: 0.192 },
  { jarakM: 14700, konversi: 0.192 },
  { jarakM: 14800, konversi: 0.191 },
  { jarakM: 14900, konversi: 0.19 },
  { jarakM: 15000, konversi: 0.19 },
  { jarakM: 15100, konversi: 0.189 },
  { jarakM: 15200, konversi: 0.188 },
  { jarakM: 15300, konversi: 0.188 },
  { jarakM: 15400, konversi: 0.187 },
  { jarakM: 15500, konversi: 0.187 },
  { jarakM: 15600, konversi: 0.186 },
  { jarakM: 15700, konversi: 0.186 },
  { jarakM: 15800, konversi: 0.185 },
  { jarakM: 15900, konversi: 0.185 },
  { jarakM: 16000, konversi: 0.184 },
  { jarakM: 16100, konversi: 0.184 },
  { jarakM: 16200, konversi: 0.183 },
  { jarakM: 16300, konversi: 0.183 },
  { jarakM: 16400, konversi: 0.182 },
  { jarakM: 16500, konversi: 0.182 },
  { jarakM: 16600, konversi: 0.181 },
  { jarakM: 16700, konversi: 0.181 },
  { jarakM: 16800, konversi: 0.18 },
  { jarakM: 16900, konversi: 0.18 },
  { jarakM: 17000, konversi: 0.179 },
  { jarakM: 17100, konversi: 0.179 },
  { jarakM: 17200, konversi: 0.179 },
  { jarakM: 17300, konversi: 0.178 },
  { jarakM: 17400, konversi: 0.178 },
  { jarakM: 17500, konversi: 0.177 },
  { jarakM: 17600, konversi: 0.177 },
  { jarakM: 17700, konversi: 0.177 },
  { jarakM: 17800, konversi: 0.176 },
  { jarakM: 17900, konversi: 0.176 },
  { jarakM: 18000, konversi: 0.175 },
  { jarakM: 18100, konversi: 0.175 },
  { jarakM: 18200, konversi: 0.175 },
  { jarakM: 18300, konversi: 0.174 },
  { jarakM: 18400, konversi: 0.174 },
  { jarakM: 18500, konversi: 0.174 },
  { jarakM: 18600, konversi: 0.173 },
  { jarakM: 18700, konversi: 0.173 },
  { jarakM: 18800, konversi: 0.173 },
  { jarakM: 18900, konversi: 0.173 },
  { jarakM: 19000, konversi: 0.172 },
  { jarakM: 19100, konversi: 0.172 },
  { jarakM: 19200, konversi: 0.172 },
  { jarakM: 19300, konversi: 0.171 },
  { jarakM: 19400, konversi: 0.171 },
  { jarakM: 19500, konversi: 0.171 },
  { jarakM: 19600, konversi: 0.171 },
  { jarakM: 19700, konversi: 0.17 },
  { jarakM: 19800, konversi: 0.17 },
  { jarakM: 19900, konversi: 0.17 },
  { jarakM: 20000, konversi: 0.17 },
  { jarakM: 20100, konversi: 0.169 },
  { jarakM: 20200, konversi: 0.169 },
  { jarakM: 20300, konversi: 0.169 },
  { jarakM: 20400, konversi: 0.169 },
  { jarakM: 20500, konversi: 0.169 },
  { jarakM: 20600, konversi: 0.168 },
  { jarakM: 20700, konversi: 0.168 },
  { jarakM: 20800, konversi: 0.168 },
  { jarakM: 20900, konversi: 0.168 },
  { jarakM: 21000, konversi: 0.168 },
  { jarakM: 21100, konversi: 0.167 },
  { jarakM: 21200, konversi: 0.167 },
  { jarakM: 21300, konversi: 0.167 },
  { jarakM: 21400, konversi: 0.167 },
  { jarakM: 21500, konversi: 0.167 },
  { jarakM: 21600, konversi: 0.167 },
  { jarakM: 21700, konversi: 0.166 },
  { jarakM: 21800, konversi: 0.166 },
  { jarakM: 21900, konversi: 0.166 },
  { jarakM: 22000, konversi: 0.166 },
  { jarakM: 22100, konversi: 0.166 },
  { jarakM: 22200, konversi: 0.166 },
  { jarakM: 22300, konversi: 0.166 },
  { jarakM: 22400, konversi: 0.165 },
  { jarakM: 22500, konversi: 0.165 },
  { jarakM: 22600, konversi: 0.165 },
  { jarakM: 22700, konversi: 0.165 },
  { jarakM: 22800, konversi: 0.165 },
  { jarakM: 22900, konversi: 0.165 },
  { jarakM: 23000, konversi: 0.165 },
  { jarakM: 23100, konversi: 0.165 },
  { jarakM: 23200, konversi: 0.165 },
  { jarakM: 23300, konversi: 0.164 },
  { jarakM: 23400, konversi: 0.164 },
  { jarakM: 23500, konversi: 0.164 },
  { jarakM: 23600, konversi: 0.164 },
  { jarakM: 23700, konversi: 0.164 },
  { jarakM: 23800, konversi: 0.164 },
  { jarakM: 23900, konversi: 0.164 },
  { jarakM: 24000, konversi: 0.164 },
  { jarakM: 24100, konversi: 0.164 },
  { jarakM: 24200, konversi: 0.164 },
  { jarakM: 24300, konversi: 0.164 },
  { jarakM: 24400, konversi: 0.164 },
  { jarakM: 24500, konversi: 0.164 },
  { jarakM: 24600, konversi: 0.163 },
  { jarakM: 24700, konversi: 0.163 },
  { jarakM: 24800, konversi: 0.163 },
  { jarakM: 24900, konversi: 0.163 },
  { jarakM: 25000, konversi: 0.163 },
  { jarakM: 25100, konversi: 0.163 },
  { jarakM: 25200, konversi: 0.163 },
  { jarakM: 25300, konversi: 0.163 },
  { jarakM: 25400, konversi: 0.163 },
  { jarakM: 25500, konversi: 0.163 },
  { jarakM: 25600, konversi: 0.163 },
  { jarakM: 25700, konversi: 0.163 },
  { jarakM: 25800, konversi: 0.163 },
  { jarakM: 25900, konversi: 0.163 },
  { jarakM: 26000, konversi: 0.163 },
  { jarakM: 26100, konversi: 0.163 },
  { jarakM: 26200, konversi: 0.163 },
  { jarakM: 26300, konversi: 0.163 },
  { jarakM: 26400, konversi: 0.163 },
  { jarakM: 26500, konversi: 0.163 },
  { jarakM: 26600, konversi: 0.163 },
  { jarakM: 26700, konversi: 0.163 },
  { jarakM: 26800, konversi: 0.163 },
  { jarakM: 26900, konversi: 0.163 },
  { jarakM: 27000, konversi: 0.163 },
  { jarakM: 27100, konversi: 0.163 },
  { jarakM: 27200, konversi: 0.163 },
  { jarakM: 27300, konversi: 0.163 },
  { jarakM: 27400, konversi: 0.163 },
  { jarakM: 27500, konversi: 0.163 },
  { jarakM: 27600, konversi: 0.163 },
  { jarakM: 27700, konversi: 0.163 },
  { jarakM: 27800, konversi: 0.163 },
  { jarakM: 27900, konversi: 0.163 },
  { jarakM: 28000, konversi: 0.163 },
  { jarakM: 28100, konversi: 0.163 },
  { jarakM: 28200, konversi: 0.163 },
  { jarakM: 28300, konversi: 0.163 },
  { jarakM: 28400, konversi: 0.163 },
  { jarakM: 28500, konversi: 0.163 },
  { jarakM: 28600, konversi: 0.163 },
  { jarakM: 28700, konversi: 0.163 },
  { jarakM: 28800, konversi: 0.163 },
  { jarakM: 28900, konversi: 0.163 },
  { jarakM: 29000, konversi: 0.163 },
  { jarakM: 29100, konversi: 0.163 },
  { jarakM: 29200, konversi: 0.163 },
  { jarakM: 29300, konversi: 0.163 },
  { jarakM: 29400, konversi: 0.164 },
  { jarakM: 29500, konversi: 0.164 },
  { jarakM: 29600, konversi: 0.164 },
  { jarakM: 29700, konversi: 0.164 },
  { jarakM: 29800, konversi: 0.164 },
  { jarakM: 29900, konversi: 0.164 },
  { jarakM: 30000, konversi: 0.164 },
];

/**
 * Pencarian konversi jarak dengan approximate match (setara Excel: VLOOKUP(jarak, tabel, 3, TRUE)).
 * Mengambil baris dengan jarakM terbesar yang <= jarakInput menggunakan binary search.
 * Jika jarakInput < baris pertama, pakai baris pertama.
 * Jika jarakInput > baris terakhir, pakai baris terakhir.
 */
export function lookupKonversi(
  jarakM: number,
  table: KonversiJarakRow[] = SEED_KONVERSI_JARAK
): number {
  if (!table || table.length === 0) return 1;
  if (jarakM <= table[0].jarakM) {
    return table[0].konversi;
  }
  const lastIndex = table.length - 1;
  if (jarakM >= table[lastIndex].jarakM) {
    return table[lastIndex].konversi;
  }

  let low = 0;
  let high = lastIndex;
  let bestIndex = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (table[mid].jarakM <= jarakM) {
      bestIndex = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return table[bestIndex].konversi;
}

/**
 * Sanitasi Tabel Konversi Jarak (Bagian 4A):
 * - Hapus baris kosong dan non-angka
 * - Hapus duplikat jarak (jika konversi duplikat berbeda, pakai yang terakhir dan beri peringatan)
 * - Urutkan menaik berdasarkan jarakM
 * - Peringatan jika:
 *   (a) ada celah jarak > 100 m di rentang 1000 sampai 30000 m
 *   (b) konversi naik > 0,01 saat jarak bertambah (lonjakan kecil 0,163 ke 0,164 di 29300->29400 tidak diperingatkan)
 */
export function sanitizeKonversiTable(
  rawRows: Array<{ jarakM: unknown; konversi: unknown }>
): KonversiSanitizeResult {
  const warnings: string[] = [];
  let invalidRemoved = 0;
  let duplicatesRemoved = 0;

  const mapByJarak = new Map<number, number>();

  for (const item of rawRows) {
    const j = parseFlexibleNumber(item.jarakM);
    const k = parseFlexibleNumber(item.konversi);

    if (j === null || k === null || j <= 0 || k <= 0) {
      invalidRemoved++;
      continue;
    }

    if (mapByJarak.has(j)) {
      duplicatesRemoved++;
      const prevK = mapByJarak.get(j)!;
      if (Math.abs(prevK - k) > 1e-6) {
        warnings.push(
          `Duplikat jarak ${j} m memiliki konversi berbeda (${prevK} vs ${k}). Memakai nilai terakhir (${k}).`
        );
      }
    }
    mapByJarak.set(j, k);
  }

  const sortedRows: KonversiJarakRow[] = Array.from(mapByJarak.entries())
    .map(([jarakM, konversi]) => ({ jarakM, konversi }))
    .sort((a, b) => a.jarakM - b.jarakM);

  // Cek celah jarak > 100 m di rentang 1000 s/d 30000 m & kenaikan konversi > 0.01
  for (let i = 1; i < sortedRows.length; i++) {
    const prev = sortedRows[i - 1];
    const curr = sortedRows[i];

    if (prev.jarakM >= 1000 && curr.jarakM <= 30000) {
      const gap = curr.jarakM - prev.jarakM;
      if (gap > 100) {
        warnings.push(
          `Celah jarak lebih dari 100 m terdeteksi antara ${prev.jarakM} m dan ${curr.jarakM} m (selisih ${gap} m).`
        );
      }
    }

    const diffKonv = curr.konversi - prev.konversi;
    if (diffKonv > 0.01) {
      warnings.push(
        `Nilai konversi naik sebesar +${diffKonv.toFixed(3)} saat jarak bertambah dari ${prev.jarakM} m (${prev.konversi}) ke ${curr.jarakM} m (${curr.konversi}). Periksa kemungkinan baris salah tempat.`
      );
    }
  }

  return {
    rows: sortedRows,
    warnings,
    duplicatesRemoved,
    invalidRemoved,
  };
}

export function parseFlexibleNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : null;
  }
  const str = String(val).trim();
  if (!str || str === '-') return null;
  // Ganti koma desimal dengan titik
  const normalized = str.replace(/\s+/g, '').replace(',', '.');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

/**
 * Parse teks tempelan clipboard atau CSV untuk tabel konversi.
 * Menerima format tab, titik koma, atau koma:
 * jarak_m, jarak_km, konversi ATAU jarak_m, konversi
 * Mengabaikan kolom "SITE"/"ARIA" jika ada.
 */
export function parseKonversiText(text: string): KonversiSanitizeResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const rawRows: Array<{ jarakM: unknown; konversi: unknown }> = [];

  for (const line of lines) {
    // Jika pakai tab atau titik koma, pisah dengan itu; jika tidak, pisah dengan koma/spasi
    let tokens: string[];
    if (line.includes('\t')) {
      tokens = line.split('\t').map((t) => t.trim());
    } else if (line.includes(';')) {
      tokens = line.split(';').map((t) => t.trim());
    } else {
      tokens = line.split(/[\s,]+/).map((t) => t.trim());
    }

    // Buang token kata seperti "SITE", "ARIA", header teks
    const numericTokens = tokens
      .filter((t) => t.toUpperCase() !== 'SITE' && t.toUpperCase() !== 'ARIA' && t !== '')
      .map((t) => parseFlexibleNumber(t))
      .filter((n): n is number => n !== null);

    if (numericTokens.length >= 3) {
      // Format: jarak_m, jarak_km, konversi
      rawRows.push({ jarakM: numericTokens[0], konversi: numericTokens[2] });
    } else if (numericTokens.length === 2) {
      // Format: jarak_m, konversi
      rawRows.push({ jarakM: numericTokens[0], konversi: numericTokens[1] });
    }
  }

  return sanitizeKonversiTable(rawRows);
}
