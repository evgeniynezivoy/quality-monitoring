import { google, sheets_v4 } from 'googleapis';
import { env } from './env.js';

let sheetsClient: sheets_v4.Sheets | null = null;

export async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  if (sheetsClient) {
    return sheetsClient;
  }

  if (!env.google.serviceAccountEmail || !env.google.privateKey) {
    throw new Error('Google Sheets credentials not configured');
  }

  const auth = new google.auth.JWT({
    email: env.google.serviceAccountEmail,
    key: env.google.privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  await auth.authorize();

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

export interface SheetData {
  headers: string[];
  rows: Record<string, string>[];
}

export async function fetchSheetData(
  spreadsheetId: string,
  gid: string = '0',
  range?: string
): Promise<SheetData> {
  const sheets = await getSheetsClient();

  // First, get sheet name by GID
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
    includeGridData: false,
  });

  const sheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.sheetId?.toString() === gid
  );

  const sheetName = sheet?.properties?.title || 'Sheet1';
  const fullRange = range ? `${sheetName}!${range}` : sheetName;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: fullRange,
  });

  const values = response.data.values || [];

  if (values.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = values[0].map((h: string) => normalizeHeader(h));
  const rows = values.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });

  return { headers, rows };
}

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}
