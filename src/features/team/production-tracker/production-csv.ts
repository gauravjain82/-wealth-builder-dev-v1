import type { ProductionTrackerRecord } from './services/production-tracker-service';

export const SAMPLE_IMPORT_FILE_URL = '/files/Example_File.csv';
export const SAMPLE_IMPORT_PRODUCTS = 'IUL, Term, Term with LB, Annuity, Everest, Other';
export const EXPORT_HEADERS = [
  '*Written Date',
  'Drop Date',
  '*Client Name',
  'Phone',
  'Email',
  '*Product',
  'Additional Info',
  'Policy',
  '*Target Amount',
  '1st Agent Name',
  '*1st Agent Code',
  '2nd Agent Name',
  '2nd Agent Code',
  'Trainee Name',
  'Trainee Code',
  '1st Adv Date',
  '2nd Adv Date',
  '1035 Transfer Funds',
  'Transfer Complete',
  'Approved',
  'Issued',
  'Printed/Mailed',
  'Delivered',
  'Delivery Forms',
] as const;

export type ProductionImportRow = Record<string, string>;

export interface ProductionImportFailure {
  rowNumber: number;
  clientName: string;
  reason: string;
}

export function normalizeLookupValue(value: string): string {
  return value.trim().replace(/^\*+/, '').replace(/\s+/g, ' ').toLowerCase();
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      currentRow.push(currentCell);
      if (currentRow.some((cell) => cell.trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    if (currentRow.some((cell) => cell.trim() !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function parseImportCsv(text: string): ProductionImportRow[] {
  const rows = parseCsv(text);
  const headerIndex = rows.findIndex((row) => row.some((cell) => normalizeLookupValue(cell) === 'written date'));

  if (headerIndex === -1) {
    throw new Error('Could not find the CSV header row. Use the sample file format.');
  }

  const normalizedHeaders = rows[headerIndex].map((cell) => normalizeLookupValue(cell));

  return rows.slice(headerIndex + 1).map((row) => {
    const parsedRow: ProductionImportRow = {};
    normalizedHeaders.forEach((header, index) => {
      parsedRow[header] = (row[index] || '').trim();
    });
    return parsedRow;
  }).filter((row) => Object.values(row).some((value) => value.length > 0));
}

export function parseCsvNumber(value: string): number {
  const normalized = value.replace(/[$,\s]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseCsvDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return trimmed;
  }

  return null;
}

export function formatCsvDate(value: string | null | undefined): string {
  if (!value) return '';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  const [, year, month, day] = match;
  return `${month}/${day}/${year}`;
}

export function escapeCsvCell(value: string | number | null | undefined): string {
  const normalized = value == null ? '' : String(value);
  if (!/[",\n\r]/.test(normalized)) {
    return normalized;
  }
  return `"${normalized.replace(/"/g, '""')}"`;
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildExportCsvContent(rows: ProductionTrackerRecord[]): string {
  return [
    '*=required field,,,,,,,,,,,,,,,,,,,,,,,',
    EXPORT_HEADERS.join(','),
    ...rows.map((row) => {
      const product = row.policy_product === 'OTHER' ? row.policy_other_product : row.policy_product;
      const additionalInfo = row.notes || '';
      const approved = row.approved_date || row.status === 'APPROVED' || row.status === 'ISSUED' || row.status === 'COMPLETED' ? 'Yes' : '';
      const issued = row.issued_date || row.status === 'ISSUED' || row.status === 'COMPLETED' ? 'Yes' : '';
      const printedOrMailed = row.delivery === 'Mail' ? 'Yes' : '';
      const delivered = row.delivery_date ? 'Yes' : '';
      const deliveryForms = row.pdr_date ? 'Yes' : '';

      return [
        formatCsvDate(row.date_written),
        formatCsvDate(row.closure_date),
        row.client_name || '',
        '',
        '',
        product || '',
        additionalInfo,
        row.policy_number || '',
        row.base_points || row.points_target || '',
        row.agent_1_name || '',
        '',
        row.agent_2_name || '',
        '',
        '',
        '',
        formatCsvDate(row.advance_first_date),
        formatCsvDate(row.advance_second_date),
        '',
        '',
        approved,
        issued,
        printedOrMailed,
        delivered,
        deliveryForms,
      ].map((value) => escapeCsvCell(value)).join(',');
    }),
  ].join('\r\n');
}