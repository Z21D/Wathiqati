import * as XLSX from "xlsx";
import { excelRowSchema } from "@/lib/validations/document";
import { excelSerialToDate, normalizeText } from "@/lib/format";

export type ParsedExcelRow = {
  companyName: string;
  employeeName?: string | null;
  documentType: string;
  referenceId: string;
  expiresAt: Date;
};

export type ExcelParseResult = {
  rows: ParsedExcelRow[];
  skipped: number;
  errors: string[];
};

type HeaderMatch = {
  rowIndex: number;
  columnMap: Partial<Record<keyof ParsedExcelRow, number>>;
  score: number;
};

const HEADER_ALIASES: Record<string, keyof ParsedExcelRow | "ignore"> = {
  company: "companyName",
  "company name": "companyName",
  "companyname": "companyName",
  organization: "companyName",
  "organization name": "companyName",
  customer: "companyName",
  "customer name": "companyName",
  employee: "employeeName",
  "employee name": "employeeName",
  "employee full name": "employeeName",
  "person name": "employeeName",
  "worker name": "employeeName",
  name: "employeeName",
  document: "documentType",
  "document name": "documentType",
  "document type": "documentType",
  "doc type": "documentType",
  "doc name": "documentType",
  "permit name": "documentType",
  "permit type": "documentType",
  permit: "documentType",
  number: "referenceId",
  "doc number": "referenceId",
  "document number": "referenceId",
  "permit number": "referenceId",
  "reference id": "referenceId",
  reference: "referenceId",
  "ref no": "referenceId",
  "ref number": "referenceId",
  "id number": "referenceId",
  "license number": "referenceId",
  "cr number": "referenceId",
  "computer card number": "referenceId",
  expiry: "expiresAt",
  "expiry date": "expiresAt",
  "expiery date": "expiresAt",
  "expiration date": "expiresAt",
  "expirydate": "expiresAt",
  "expires at": "expiresAt",
  "valid until": "expiresAt",
  "valid to": "expiresAt",
  "end date": "expiresAt",
  "date of expiry": "expiresAt",
  "remaining days": "ignore",
  "days remaining": "ignore",
  status: "ignore",
};

const REQUIRED_COLUMNS: (keyof ParsedExcelRow)[] = [
  "companyName",
  "documentType",
  "referenceId",
  "expiresAt",
];

const HEADER_SCAN_ROWS = 20;

function parseExpiryValue(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return excelSerialToDate(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const asNumber = Number(trimmed);
    if (!Number.isNaN(asNumber) && /^\d+(\.\d+)?$/.test(trimmed)) {
      return excelSerialToDate(asNumber);
    }

    const parsed = parseDateString(trimmed);
    if (parsed) return parsed;
  }

  return null;
}

function parseDateString(value: string): Date | null {
  const normalized = value.replace(/\./g, "/").replace(/-/g, "/");
  const parts = normalized.match(/^(\d{1,4})\/(\d{1,2})\/(\d{1,4})$/);

  if (parts) {
    const first = Number(parts[1]);
    const second = Number(parts[2]);
    const third = Number(parts[3]);
    let year: number;
    let month: number;
    let day: number;

    if (parts[1].length === 4) {
      year = first;
      month = second;
      day = third;
    } else {
      day = first;
      month = second;
      year = third < 100 ? 2000 + third : third;
    }

    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    ) {
      return parsed;
    }
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  return null;
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_\-./]+/g, " ")
    .replace(/\s+/g, " ");
}

export function parseExcelBuffer(buffer: ArrayBuffer): ExcelParseResult {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const candidates = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
      header: 1,
      defval: "",
      raw: true,
    });

    return { sheetName, matrix, headerMatch: findHeaderRow(matrix) };
  });

  if (candidates.length === 0) {
    return { rows: [], skipped: 0, errors: ["Workbook has no sheets"] };
  }

  const bestCandidate = candidates
    .filter(
      (
        candidate
      ): candidate is {
        sheetName: string;
        matrix: (string | number | Date | null)[][];
        headerMatch: HeaderMatch;
      } => candidate.headerMatch !== null
    )
    .sort((a, b) => {
      const aScore = a.headerMatch?.score ?? 0;
      const bScore = b.headerMatch?.score ?? 0;
      return bScore - aScore;
    })[0];

  if (!bestCandidate?.headerMatch) {
    return {
      rows: [],
      skipped: 0,
      errors: [
        "Could not find the required Excel columns. Expected headers like COMPANY NAME, DOC NAME, NUMBER, EXPIERY DATE.",
      ],
    };
  }

  const matrix = bestCandidate.matrix;
  const columnMap = bestCandidate.headerMatch.columnMap;
  const missingColumns = REQUIRED_COLUMNS.filter((column) => columnMap[column] === undefined);
  if (missingColumns.length > 0) {
    return {
      rows: [],
      skipped: 0,
      errors: [
        `Missing required columns: ${missingColumns.join(", ")}. Expected headers like COMPANY NAME, DOC NAME, NUMBER, EXPIERY DATE.`,
      ],
    };
  }

  const rows: ParsedExcelRow[] = [];
  const errors: string[] = [];
  let skipped = 0;
  let lastCompanyName = "";

  for (let rowIndex = bestCandidate.headerMatch.rowIndex + 1; rowIndex < matrix.length; rowIndex++) {
    const row = matrix[rowIndex];
    if (!row || row.every((cell) => String(cell ?? "").trim() === "")) {
      skipped++;
      continue;
    }

    const rawCompany = String(row[columnMap.companyName!] ?? "").trim();
    if (rawCompany) lastCompanyName = rawCompany;

    const rawEmployeeName =
      columnMap.employeeName === undefined
        ? ""
        : String(row[columnMap.employeeName] ?? "").trim();
    const rawDocumentType = String(row[columnMap.documentType!] ?? "").trim();
    const rawReferenceId = String(row[columnMap.referenceId!] ?? "").trim();
    const rawExpiry = row[columnMap.expiresAt!];
    const expiresAt = parseExpiryValue(rawExpiry);

    if (!lastCompanyName || !rawDocumentType || !rawReferenceId || !expiresAt) {
      skipped++;
      continue;
    }

    const candidate = {
      companyName: normalizeText(lastCompanyName),
      employeeName: rawEmployeeName ? normalizeText(rawEmployeeName) : null,
      documentType: normalizeText(rawDocumentType),
      referenceId: normalizeText(rawReferenceId),
      expiresAt,
    };

    const parsed = excelRowSchema.safeParse(candidate);
    if (!parsed.success) {
      errors.push(`Row ${rowIndex + 1}: ${parsed.error.issues[0]?.message ?? "Invalid row"}`);
      skipped++;
      continue;
    }

    rows.push(parsed.data);
  }

  return { rows, skipped, errors };
}

function findHeaderRow(
  matrix: (string | number | Date | null)[][]
): HeaderMatch | null {
  let bestMatch: HeaderMatch | null = null;

  matrix.slice(0, HEADER_SCAN_ROWS).forEach((row, rowIndex) => {
    const columnMap: Partial<Record<keyof ParsedExcelRow, number>> = {};
    let score = 0;

    row.forEach((cell, columnIndex) => {
      const header = normalizeHeader(cell);
      const mapped = HEADER_ALIASES[header];

      if (mapped && mapped !== "ignore" && columnMap[mapped] === undefined) {
        columnMap[mapped] = columnIndex;
        score++;
      }
    });

    const requiredMatches = REQUIRED_COLUMNS.filter(
      (column) => columnMap[column] !== undefined
    ).length;

    if (requiredMatches >= 3 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { rowIndex, columnMap, score };
    }
  });

  return bestMatch;
}
