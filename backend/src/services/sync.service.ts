import { query, transaction } from '../config/database.js';
import { fetchSheetData } from '../config/google-sheets.js';
import { IssueSource, SyncLog } from '../types/index.js';
import crypto from 'crypto';

interface ColumnMapping {
  issue_date: string[];
  responsible_cc_name: string[];
  cid: string[];
  issue_type: string[];
  comment: string[];
  issue_rate: string[];
  issue_category: string[];
  reported_by: string[];
  task_id: string[];
}

const COLUMN_MAPPINGS: ColumnMapping = {
  issue_date: ['date', 'issue_date', 'дата', 'data'],
  responsible_cc_name: ['cc', 'responsible', 'cc_name', 'responsible_cc', 'ответственный', 'сотрудник'],
  cid: ['cid', 'client_id', 'customer_id', 'id_клиента'],
  issue_type: ['type', 'issue_type', 'тип', 'тип_ошибки', 'error_type'],
  comment: ['comment', 'comments', 'комментарий', 'примечание', 'note', 'notes'],
  issue_rate: ['rate', 'issue_rate', 'severity', 'критичность', 'оценка'],
  issue_category: ['category', 'issue_category', 'категория', 'тип_клиент'],
  reported_by: ['reported_by', 'reporter', 'qa', 'проверяющий'],
  task_id: ['task_id', 'task', 'ticket', 'тикет', 'задача'],
};

function findColumnValue(row: Record<string, string>, mappings: string[]): string | null {
  for (const key of mappings) {
    if (row[key] !== undefined && row[key] !== '') {
      return row[key];
    }
  }
  return null;
}

function generateRowHash(row: Record<string, string>): string {
  const str = JSON.stringify(row);
  return crypto.createHash('sha256').update(str).digest('hex').substring(0, 64);
}

function parseDate(value: string | null): string | null {
  if (!value) return null;

  const trimmed = value.trim();

  // ISO format: 2024-01-15
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // MM/DD/YYYY format (American - used in Google Sheets): 1/15/2024 or 01/15/2024
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, part1, part2, year] = slashMatch;
    const month = parseInt(part1, 10);
    const day = parseInt(part2, 10);

    // Validate: if first part > 12, it's likely DD/MM/YYYY format
    if (month <= 12 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } else if (day <= 12 && month <= 31) {
      // Swap: treat as DD/MM/YYYY
      return `${year}-${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}`;
    }
  }

  // DD.MM.YYYY format: 15.01.2024
  const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch) {
    const [, day, month, year] = dotMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try native Date parsing as fallback
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

function parseRate(value: string | null): number | null {
  if (!value) return null;
  const num = parseInt(value, 10);
  if (num >= 1 && num <= 3) return num;
  return null;
}

function parseCategory(value: string | null): 'client' | 'internal' | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.includes('client') || lower.includes('клиент')) return 'client';
  if (lower.includes('internal') || lower.includes('внутр')) return 'internal';
  return null;
}

export async function getSources(): Promise<IssueSource[]> {
  const result = await query<IssueSource>(
    'SELECT * FROM issue_sources WHERE is_active = true ORDER BY name'
  );
  return result.rows;
}

export async function syncSource(sourceId: number): Promise<SyncLog> {
  // Get source config
  const sourceResult = await query<IssueSource>(
    'SELECT * FROM issue_sources WHERE id = $1',
    [sourceId]
  );

  const source = sourceResult.rows[0];
  if (!source) {
    throw new Error(`Source with id ${sourceId} not found`);
  }

  // Create sync log
  const logResult = await query<SyncLog>(
    `INSERT INTO sync_logs (source_id, started_at, status)
     VALUES ($1, CURRENT_TIMESTAMP, 'running')
     RETURNING *`,
    [sourceId]
  );

  const syncLog = logResult.rows[0];

  try {
    // Fetch data from Google Sheets
    const sheetData = await fetchSheetData(source.google_sheet_id, source.sheet_gid);

    let rowsInserted = 0;
    let rowsUpdated = 0;

    let skippedNoDate = 0;
    let skippedNoType = 0;
    const skippedSamples: any[] = [];

    for (const row of sheetData.rows) {
      const dateValue = findColumnValue(row, COLUMN_MAPPINGS.issue_date);
      const parsedDate = parseDate(dateValue);

      if (!parsedDate) {
        skippedNoDate++;
        if (skippedSamples.length < 5) {
          skippedSamples.push({ reason: 'no_date', dateValue, row });
        }
        continue; // Skip rows without valid date
      }

      const issueType = findColumnValue(row, COLUMN_MAPPINGS.issue_type);
      if (!issueType) {
        skippedNoType++;
        if (skippedSamples.length < 5) {
          skippedSamples.push({ reason: 'no_type', dateValue, parsedDate, row });
        }
        continue; // Skip rows without issue type
      }

      const rowHash = generateRowHash(row);

      const issueData = {
        source_id: sourceId,
        external_row_hash: rowHash,
        issue_date: parsedDate,
        responsible_cc_name: findColumnValue(row, COLUMN_MAPPINGS.responsible_cc_name),
        cid: findColumnValue(row, COLUMN_MAPPINGS.cid),
        issue_type: issueType,
        comment: findColumnValue(row, COLUMN_MAPPINGS.comment),
        issue_rate: parseRate(findColumnValue(row, COLUMN_MAPPINGS.issue_rate)),
        issue_category: parseCategory(findColumnValue(row, COLUMN_MAPPINGS.issue_category)),
        reported_by: findColumnValue(row, COLUMN_MAPPINGS.reported_by),
        task_id: findColumnValue(row, COLUMN_MAPPINGS.task_id),
        raw_data: row,
      };

      // Upsert
      const upsertResult = await query(
        `INSERT INTO issues (
          source_id, external_row_hash, issue_date, responsible_cc_name,
          cid, issue_type, comment, issue_rate, issue_category,
          reported_by, task_id, raw_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (source_id, external_row_hash) DO UPDATE SET
          issue_date = EXCLUDED.issue_date,
          responsible_cc_name = EXCLUDED.responsible_cc_name,
          cid = EXCLUDED.cid,
          issue_type = EXCLUDED.issue_type,
          comment = EXCLUDED.comment,
          issue_rate = EXCLUDED.issue_rate,
          issue_category = EXCLUDED.issue_category,
          reported_by = EXCLUDED.reported_by,
          task_id = EXCLUDED.task_id,
          raw_data = EXCLUDED.raw_data
        RETURNING (xmax = 0) as inserted`,
        [
          issueData.source_id,
          issueData.external_row_hash,
          issueData.issue_date,
          issueData.responsible_cc_name,
          issueData.cid,
          issueData.issue_type,
          issueData.comment,
          issueData.issue_rate,
          issueData.issue_category,
          issueData.reported_by,
          issueData.task_id,
          JSON.stringify(issueData.raw_data),
        ]
      );

      if (upsertResult.rows[0]?.inserted) {
        rowsInserted++;
      } else {
        rowsUpdated++;
      }
    }

    // Log skipped rows
    if (skippedNoDate > 0 || skippedNoType > 0) {
      console.log(`Sync source ${sourceId}: Skipped ${skippedNoDate} rows (no date), ${skippedNoType} rows (no type)`);
      console.log('Skipped samples:', JSON.stringify(skippedSamples, null, 2));
    }

    // Update source last_sync_at
    await query(
      'UPDATE issue_sources SET last_sync_at = CURRENT_TIMESTAMP WHERE id = $1',
      [sourceId]
    );

    // Link issues to users by matching responsible_cc_name with full_name
    await query(`
      UPDATE issues i
      SET responsible_cc_id = u.id
      FROM users u
      WHERE i.source_id = $1
        AND i.responsible_cc_id IS NULL
        AND i.responsible_cc_name IS NOT NULL
        AND LOWER(TRIM(i.responsible_cc_name)) = LOWER(TRIM(u.full_name))
    `, [sourceId]);

    // Update sync log
    await query(
      `UPDATE sync_logs SET
        completed_at = CURRENT_TIMESTAMP,
        status = 'success',
        rows_fetched = $1,
        rows_inserted = $2,
        rows_updated = $3
       WHERE id = $4`,
      [sheetData.rows.length, rowsInserted, rowsUpdated, syncLog.id]
    );

    return {
      ...syncLog,
      status: 'success',
      rows_fetched: sheetData.rows.length,
      rows_inserted: rowsInserted,
      rows_updated: rowsUpdated,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await query(
      `UPDATE sync_logs SET
        completed_at = CURRENT_TIMESTAMP,
        status = 'failed',
        error_message = $1
       WHERE id = $2`,
      [errorMessage, syncLog.id]
    );

    return {
      ...syncLog,
      status: 'failed',
      error_message: errorMessage,
    };
  }
}

export async function syncAllSources(): Promise<SyncLog[]> {
  const sources = await getSources();
  const results: SyncLog[] = [];

  for (const source of sources) {
    try {
      const result = await syncSource(source.id);
      results.push(result);
    } catch (error) {
      console.error(`Error syncing source ${source.name}:`, error);
    }
  }

  return results;
}

export async function getSyncLogs(limit: number = 50): Promise<SyncLog[]> {
  const result = await query<SyncLog & { source_name: string }>(
    `SELECT sl.*, s.name as source_name
     FROM sync_logs sl
     LEFT JOIN issue_sources s ON sl.source_id = s.id
     ORDER BY sl.started_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function getSyncStatus(): Promise<{
  lastSync: Date | null;
  isRunning: boolean;
  sources: Array<{ name: string; lastSync: Date | null }>;
}> {
  const [lastSyncResult, runningResult, sourcesResult] = await Promise.all([
    query<{ max: Date }>('SELECT MAX(completed_at) as max FROM sync_logs WHERE status = \'success\''),
    query<{ count: string }>('SELECT COUNT(*) as count FROM sync_logs WHERE status = \'running\''),
    query<{ name: string; last_sync_at: Date }>('SELECT name, last_sync_at FROM issue_sources WHERE is_active = true'),
  ]);

  return {
    lastSync: lastSyncResult.rows[0]?.max || null,
    isRunning: parseInt(runningResult.rows[0]?.count || '0', 10) > 0,
    sources: sourcesResult.rows.map((s) => ({ name: s.name, lastSync: s.last_sync_at })),
  };
}
