// src/core/csvMeta.ts
// Parse & validate CSV v2 filenames: "<dataset_key>_<dataset_id>_PG.csv"
// Example: "minutes-articles_20251008_PG.csv"

export interface ParsedCsvV2 {
  raw: string;
  datasetKey: string;  // e.g. "minutes-articles"
  datasetId: number;   // e.g. 20251008 (YYYYMMDD as integer)
}

/** Strict regex: <dataset_key>_<YYYYMMDD>_PG.csv  */
const CSV_V2_RE = /^([a-z0-9-]+)_(\d{8})_PG\.csv$/;

export function parseCsvNameV2(fileName: string): ParsedCsvV2 {
  const m = CSV_V2_RE.exec(fileName);
  if (!m) {
	throw new Error(
	  `Nom de CSV invalide: "${fileName}". Format attendu: <dataset_key>_<YYYYMMDD>_PG.csv (ex: minutes-articles_20251008_PG.csv)`
	);
  }
  const datasetKey = m[1];
  const datasetId = Number(m[2]); // stays numeric to compare easily
  return { raw: fileName, datasetKey, datasetId };
}

export function isCsvNameV2(fileName: string): boolean {
  return CSV_V2_RE.test(fileName);
}
