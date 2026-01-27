import { query } from '../config/database.js';
import { sendEmail } from '../config/email.js';

interface DailyReportData {
  date: string;
  totalIssues: number;
  bySource: { source: string; count: number }[];
  byTeamLead: { teamLead: string; count: number }[];
  issues: {
    teamLead: string;
    teamMember: string;
    cid: string;
    issueType: string;
    comment: string;
    source: string;
    issueRate: number | null;
  }[];
}

interface TeamLeadReportData {
  date: string;
  teamLeadName: string;
  teamLeadEmail: string;
  totalIssues: number;
  bySource: { source: string; count: number }[];
  issues: {
    teamMember: string;
    cid: string;
    issueType: string;
    comment: string;
    source: string;
    issueRate: number | null;
  }[];
}

// Operations Team recipients
const OPERATIONS_TEAM = [
  'nezhivoy@infuseua.com',
  'pytonia@infuseua.com',
  'markovych@infuseua.com',
];

// Google Sheets links for sources
const SOURCE_LINKS: Record<string, string> = {
  LV: 'https://docs.google.com/spreadsheets/d/1DawUmZgEKtFnu9nDs6Oo4APZkvENar351oyCyb0C__I',
  CS: 'https://docs.google.com/spreadsheets/d/1Oslo3ZNuzFgXbDCIIj9m_uFIbWpw0x97M9CjxLWozD0',
  Block: 'https://docs.google.com/spreadsheets/d/13TpypRYuC3t0AN_rJAiglsJ0oioysz79dQm1ojsYcEE',
  CDT_CW: 'https://docs.google.com/spreadsheets/d/1S45EyniKYCe550M6inZXL7jzKvNJR22H-beX5BLiIoM',
  QA: 'https://docs.google.com/spreadsheets/d/1boJ69H1jq5zOHHStvxlHD5qYWSJ_JhAqFl1GHzwY1I0',
};

// Get report data for Operations Team (all issues)
export async function getDailyReportData(date?: string): Promise<DailyReportData> {
  const reportDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const totalResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM issues WHERE issue_date = $1`,
    [reportDate]
  );

  const bySourceResult = await query<{ source: string; count: string }>(
    `SELECT COALESCE(s.name, 'Unknown') as source, COUNT(*) as count
     FROM issues i
     LEFT JOIN issue_sources s ON i.source_id = s.id
     WHERE i.issue_date = $1
     GROUP BY s.name
     ORDER BY count DESC`,
    [reportDate]
  );

  const byTeamLeadResult = await query<{ team_lead: string; count: string }>(
    `SELECT COALESCE(tl.full_name, 'Unassigned') as team_lead, COUNT(*) as count
     FROM issues i
     LEFT JOIN users u ON i.responsible_cc_id = u.id
     LEFT JOIN users tl ON u.team_lead_id = tl.id
     WHERE i.issue_date = $1
     GROUP BY tl.full_name
     ORDER BY count DESC`,
    [reportDate]
  );

  const issuesResult = await query<{
    team_lead: string;
    team_member: string;
    cid: string;
    issue_type: string;
    comment: string;
    source: string;
    issue_rate: number | null;
  }>(
    `SELECT
       COALESCE(tl.full_name, 'N/A') as team_lead,
       COALESCE(u.full_name, i.responsible_cc_name, 'Unknown') as team_member,
       COALESCE(i.cid, '-') as cid,
       COALESCE(i.issue_type, '-') as issue_type,
       COALESCE(i.comment, '-') as comment,
       COALESCE(s.name, 'Unknown') as source,
       i.issue_rate
     FROM issues i
     LEFT JOIN users u ON i.responsible_cc_id = u.id
     LEFT JOIN users tl ON u.team_lead_id = tl.id
     LEFT JOIN issue_sources s ON i.source_id = s.id
     WHERE i.issue_date = $1
     ORDER BY s.name, tl.full_name, u.full_name`,
    [reportDate]
  );

  return {
    date: reportDate,
    totalIssues: parseInt(totalResult.rows[0]?.count || '0', 10),
    bySource: bySourceResult.rows.map(r => ({
      source: r.source,
      count: parseInt(r.count, 10),
    })),
    byTeamLead: byTeamLeadResult.rows.map(r => ({
      teamLead: r.team_lead,
      count: parseInt(r.count, 10),
    })),
    issues: issuesResult.rows.map(r => ({
      teamLead: r.team_lead,
      teamMember: r.team_member,
      cid: r.cid,
      issueType: r.issue_type,
      comment: r.comment,
      source: r.source,
      issueRate: r.issue_rate,
    })),
  };
}

// Get report data for a specific Team Lead
export async function getTeamLeadReportData(teamLeadId: number, date?: string): Promise<TeamLeadReportData | null> {
  const reportDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Get team lead info
  const teamLeadResult = await query<{ full_name: string; email: string }>(
    `SELECT full_name, email FROM users WHERE id = $1`,
    [teamLeadId]
  );

  if (teamLeadResult.rows.length === 0) return null;

  const teamLead = teamLeadResult.rows[0];

  // Get issues for team members OR where team lead is the CC
  const issuesResult = await query<{
    team_member: string;
    cid: string;
    issue_type: string;
    comment: string;
    source: string;
    issue_rate: number | null;
  }>(
    `SELECT
       COALESCE(u.full_name, i.responsible_cc_name, 'Unknown') as team_member,
       COALESCE(i.cid, '-') as cid,
       COALESCE(i.issue_type, '-') as issue_type,
       COALESCE(i.comment, '-') as comment,
       COALESCE(s.name, 'Unknown') as source,
       i.issue_rate
     FROM issues i
     LEFT JOIN users u ON i.responsible_cc_id = u.id
     LEFT JOIN issue_sources s ON i.source_id = s.id
     WHERE i.issue_date = $1
       AND (u.team_lead_id = $2 OR i.responsible_cc_id = $2)
     ORDER BY s.name, u.full_name`,
    [reportDate, teamLeadId]
  );

  if (issuesResult.rows.length === 0) return null;

  // Group by source for summary
  const bySource: Record<string, number> = {};
  issuesResult.rows.forEach(r => {
    bySource[r.source] = (bySource[r.source] || 0) + 1;
  });

  return {
    date: reportDate,
    teamLeadName: teamLead.full_name,
    teamLeadEmail: teamLead.email,
    totalIssues: issuesResult.rows.length,
    bySource: Object.entries(bySource).map(([source, count]) => ({ source, count })),
    issues: issuesResult.rows.map(r => ({
      teamMember: r.team_member,
      cid: r.cid,
      issueType: r.issue_type,
      comment: r.comment,
      source: r.source,
      issueRate: r.issue_rate,
    })),
  };
}

// Get all team leads with their IDs
export async function getAllTeamLeads(): Promise<{ id: number; full_name: string; email: string }[]> {
  const result = await query<{ id: number; full_name: string; email: string }>(
    `SELECT id, full_name, email FROM users WHERE role = 'team_lead' AND is_active = true ORDER BY full_name`
  );
  return result.rows;
}

function getRateLabel(rate: number | null): string {
  if (!rate) return '';
  switch (rate) {
    case 1: return 'Minor';
    case 2: return 'Medium';
    case 3: return 'Critical';
    default: return '';
  }
}

function getRateColor(rate: number | null): string {
  if (!rate) return '#6b7280';
  switch (rate) {
    case 1: return '#22c55e';
    case 2: return '#eab308';
    case 3: return '#ef4444';
    default: return '#6b7280';
  }
}

// Generate HTML for Operations Team report
export function generateReportHtml(data: DailyReportData): string {
  const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });

  const issuesBySourceHtml = data.bySource
    .map(s => `<li>${s.source} Report: ${s.count} issue${s.count !== 1 ? 's' : ''}</li>`)
    .join('\n');

  const issuesByTeamLeadHtml = data.byTeamLead
    .map(t => `<li>${t.teamLead}: ${t.count} issue${t.count !== 1 ? 's' : ''}</li>`)
    .join('\n');

  const issuesTableRows = data.issues
    .map(i => `
      <tr>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${i.teamLead}</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${i.teamMember}</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${i.cid}</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${i.issueType}</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">
          ${i.issueRate ? `<span style="color: ${getRateColor(i.issueRate)}; font-weight: 600;">${getRateLabel(i.issueRate)}</span>` : '-'}
        </td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${i.comment}</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${i.source}</td>
      </tr>
    `)
    .join('\n');

  const sourceLinksHtml = Object.entries(SOURCE_LINKS)
    .map(([name, url]) => `<li>${name} Team: <a href="${url}" style="color: #2563eb;">Open</a></li>`)
    .join('\n');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 1000px; margin: 0 auto; padding: 20px;">

  <h1 style="font-size: 24px; margin-bottom: 24px;">📋 Daily Issues Summary Report - ${formattedDate}</h1>

  <p style="color: #6b7280;">Dear Operations Team,</p>
  <p style="color: #6b7280;">Please find below the complete summary of all issues reported yesterday across all teams.</p>

  <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
    <h2 style="font-size: 18px; margin-top: 0; margin-bottom: 16px;">📊 Summary Statistics</h2>

    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; font-weight: 600;">Total Issues:</td>
        <td style="padding: 8px 0;">${data.totalIssues}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: 600;">Date:</td>
        <td style="padding: 8px 0;">${formattedDate}</td>
      </tr>
    </table>

    <h3 style="font-size: 14px; margin-top: 16px; margin-bottom: 8px;">Issues by Source:</h3>
    <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
      ${issuesBySourceHtml || '<li>No issues</li>'}
    </ul>

    <h3 style="font-size: 14px; margin-top: 16px; margin-bottom: 8px;">Issues by Team Lead:</h3>
    <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
      ${issuesByTeamLeadHtml || '<li>No issues</li>'}
    </ul>
  </div>

  ${data.issues.length > 0 ? `
  <h2 style="font-size: 18px; margin-top: 32px; margin-bottom: 16px;">📝 All Issues Details:</h2>

  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
    <thead>
      <tr style="background: #1f2937; color: white;">
        <th style="padding: 12px; text-align: left; border: 1px solid #1f2937;">Team Lead</th>
        <th style="padding: 12px; text-align: left; border: 1px solid #1f2937;">Team Member</th>
        <th style="padding: 12px; text-align: left; border: 1px solid #1f2937;">CID</th>
        <th style="padding: 12px; text-align: left; border: 1px solid #1f2937;">Issue</th>
        <th style="padding: 12px; text-align: left; border: 1px solid #1f2937;">Severity</th>
        <th style="padding: 12px; text-align: left; border: 1px solid #1f2937;">Comment</th>
        <th style="padding: 12px; text-align: left; border: 1px solid #1f2937;">Source</th>
      </tr>
    </thead>
    <tbody>
      ${issuesTableRows}
    </tbody>
  </table>
  ` : '<p style="color: #6b7280; font-style: italic;">No issues reported for this date.</p>'}

  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
    <h3 style="font-size: 14px; margin-bottom: 8px;">Source Files:</h3>
    <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px;">
      ${sourceLinksHtml}
    </ul>
  </div>

  <p style="margin-top: 32px; color: #9ca3af; font-size: 13px;">
    This is an automated summary report.
  </p>

  <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">
    Generated by Quality Monitoring System<br>
    <a href="http://37.27.5.172:8080" style="color: #6b7280;">Open Dashboard</a>
  </p>

</body>
</html>
  `;
}

// Generate HTML for Team Lead report
export function generateTeamLeadReportHtml(data: TeamLeadReportData): string {
  const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });

  const issuesBySourceHtml = data.bySource
    .map(s => `<li>${s.source}: ${s.count} issue${s.count !== 1 ? 's' : ''}</li>`)
    .join('\n');

  const issuesTableRows = data.issues
    .map(i => `
      <tr>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${i.teamMember}</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${i.cid}</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${i.issueType}</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">
          ${i.issueRate ? `<span style="color: ${getRateColor(i.issueRate)}; font-weight: 600;">${getRateLabel(i.issueRate)}</span>` : '-'}
        </td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${i.comment}</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${i.source}</td>
      </tr>
    `)
    .join('\n');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 900px; margin: 0 auto; padding: 20px;">

  <h1 style="font-size: 24px; margin-bottom: 24px;">📋 Your Team Daily Issues Report - ${formattedDate}</h1>

  <p style="color: #6b7280;">Dear ${data.teamLeadName},</p>
  <p style="color: #6b7280;">Please find below the issues reported for your team yesterday.</p>

  <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
    <h2 style="font-size: 18px; margin-top: 0; margin-bottom: 16px;">📊 Summary</h2>

    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; font-weight: 600;">Total Issues:</td>
        <td style="padding: 8px 0; font-size: 20px; font-weight: bold;">${data.totalIssues}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: 600;">Date:</td>
        <td style="padding: 8px 0;">${formattedDate}</td>
      </tr>
    </table>

    <h3 style="font-size: 14px; margin-top: 16px; margin-bottom: 8px;">By Source:</h3>
    <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
      ${issuesBySourceHtml}
    </ul>
  </div>

  <h2 style="font-size: 18px; margin-top: 32px; margin-bottom: 16px;">📝 Issues Details:</h2>

  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
    <thead>
      <tr style="background: #1f2937; color: white;">
        <th style="padding: 12px; text-align: left; border: 1px solid #1f2937;">Team Member</th>
        <th style="padding: 12px; text-align: left; border: 1px solid #1f2937;">CID</th>
        <th style="padding: 12px; text-align: left; border: 1px solid #1f2937;">Issue</th>
        <th style="padding: 12px; text-align: left; border: 1px solid #1f2937;">Severity</th>
        <th style="padding: 12px; text-align: left; border: 1px solid #1f2937;">Comment</th>
        <th style="padding: 12px; text-align: left; border: 1px solid #1f2937;">Source</th>
      </tr>
    </thead>
    <tbody>
      ${issuesTableRows}
    </tbody>
  </table>

  <p style="margin-top: 32px; color: #9ca3af; font-size: 13px;">
    This is an automated report for your team.
  </p>

  <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">
    Generated by Quality Monitoring System<br>
    <a href="http://37.27.5.172:8080/issues" style="color: #6b7280;">View All Issues</a>
  </p>

</body>
</html>
  `;
}

// Send report to Operations Team
export async function sendDailyReport(
  recipients: string[],
  date?: string
): Promise<{ success: boolean; message: string; data?: DailyReportData }> {
  const data = await getDailyReportData(date);
  const html = generateReportHtml(data);

  const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });

  const subject = `[OPERATIONS] Daily Issues Summary - ${formattedDate} (${data.totalIssues} issues)`;

  try {
    await sendEmail({
      to: recipients,
      subject,
      html,
    });

    // Log each recipient
    for (const email of recipients) {
      await logEmailSent({
        reportType: 'operations',
        reportDate: data.date,
        recipientEmail: email,
        recipientName: 'Operations Team',
        subject,
        issuesCount: data.totalIssues,
        status: 'sent',
      });
    }

    return {
      success: true,
      message: `Report sent to ${recipients.length} recipient(s)`,
      data,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to send daily report:', error);

    // Log failed attempt
    for (const email of recipients) {
      await logEmailSent({
        reportType: 'operations',
        reportDate: data.date,
        recipientEmail: email,
        recipientName: 'Operations Team',
        subject,
        issuesCount: data.totalIssues,
        status: 'failed',
        errorMessage,
      });
    }

    return {
      success: false,
      message: errorMessage,
    };
  }
}

// Send report to a specific Team Lead
export async function sendTeamLeadReport(
  teamLeadId: number,
  date?: string
): Promise<{ success: boolean; message: string; teamLead?: string; issueCount?: number }> {
  const data = await getTeamLeadReportData(teamLeadId, date);

  if (!data) {
    return {
      success: true,
      message: 'No issues for this team lead',
    };
  }

  const html = generateTeamLeadReportHtml(data);

  const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });

  const subject = `[YOUR TEAM] Daily Issues Report - ${formattedDate} (${data.totalIssues} issues)`;

  try {
    await sendEmail({
      to: [data.teamLeadEmail],
      subject,
      html,
    });

    // Log sent email
    await logEmailSent({
      reportType: 'team_lead',
      reportDate: data.date,
      recipientEmail: data.teamLeadEmail,
      recipientName: data.teamLeadName,
      subject,
      issuesCount: data.totalIssues,
      status: 'sent',
    });

    return {
      success: true,
      message: `Report sent to ${data.teamLeadEmail}`,
      teamLead: data.teamLeadName,
      issueCount: data.totalIssues,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to send team lead report:', error);

    // Log failed attempt
    await logEmailSent({
      reportType: 'team_lead',
      reportDate: data.date,
      recipientEmail: data.teamLeadEmail,
      recipientName: data.teamLeadName,
      subject,
      issuesCount: data.totalIssues,
      status: 'failed',
      errorMessage,
    });

    return {
      success: false,
      message: errorMessage,
    };
  }
}

// Send all daily reports (Operations + all Team Leads)
export async function sendAllDailyReports(date?: string): Promise<{
  operationsReport: { success: boolean; message: string };
  teamLeadReports: { teamLead: string; success: boolean; message: string; issueCount?: number }[];
}> {
  const results: {
    operationsReport: { success: boolean; message: string };
    teamLeadReports: { teamLead: string; success: boolean; message: string; issueCount?: number }[];
  } = {
    operationsReport: { success: false, message: '' },
    teamLeadReports: [],
  };

  // Send Operations Team report
  const opsResult = await sendDailyReport(OPERATIONS_TEAM, date);
  results.operationsReport = {
    success: opsResult.success,
    message: opsResult.message,
  };

  // Send Team Lead reports
  const teamLeads = await getAllTeamLeads();

  for (const tl of teamLeads) {
    const tlResult = await sendTeamLeadReport(tl.id, date);
    results.teamLeadReports.push({
      teamLead: tl.full_name,
      success: tlResult.success,
      message: tlResult.message,
      issueCount: tlResult.issueCount,
    });
  }

  return results;
}

// Get Operations Team recipients
export function getOperationsTeam(): string[] {
  return OPERATIONS_TEAM;
}

// Legacy function for backwards compatibility
export async function getReportRecipients(): Promise<string[]> {
  return OPERATIONS_TEAM;
}

// Log sent email to database
async function logEmailSent(params: {
  reportType: 'operations' | 'team_lead';
  reportDate: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  issuesCount: number;
  status: 'sent' | 'failed';
  errorMessage?: string;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO email_logs (report_type, report_date, recipient_email, recipient_name, subject, issues_count, status, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        params.reportType,
        params.reportDate,
        params.recipientEmail,
        params.recipientName || null,
        params.subject,
        params.issuesCount,
        params.status,
        params.errorMessage || null,
      ]
    );
  } catch (error) {
    console.error('Failed to log email:', error);
  }
}

// Get email logs
export async function getEmailLogs(limit = 100): Promise<{
  id: number;
  report_type: string;
  report_date: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  issues_count: number;
  status: string;
  error_message: string | null;
  sent_at: string;
}[]> {
  const result = await query<{
    id: number;
    report_type: string;
    report_date: string;
    recipient_email: string;
    recipient_name: string | null;
    subject: string;
    issues_count: number;
    status: string;
    error_message: string | null;
    sent_at: string;
  }>(
    `SELECT id, report_type, report_date::text, recipient_email, recipient_name,
            subject, issues_count, status, error_message, sent_at::text
     FROM email_logs
     ORDER BY sent_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

// Cleanup old email logs (older than 14 days)
export async function cleanupOldEmailLogs(): Promise<number> {
  const result = await query(
    `DELETE FROM email_logs WHERE sent_at < NOW() - INTERVAL '14 days' RETURNING id`
  );
  return result.rowCount || 0;
}
