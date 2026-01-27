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
  }[];
}

// Google Sheets links for sources
const SOURCE_LINKS: Record<string, string> = {
  LV: 'https://docs.google.com/spreadsheets/d/1DawUmZgEKtFnu9nDs6Oo4APZkvENar351oyCyb0C__I',
  CS: 'https://docs.google.com/spreadsheets/d/1Oslo3ZNuzFgXbDCIIj9m_uFIbWpw0x97M9CjxLWozD0',
  Block: 'https://docs.google.com/spreadsheets/d/13TpypRYuC3t0AN_rJAiglsJ0oioysz79dQm1ojsYcEE',
  CDT_CW: 'https://docs.google.com/spreadsheets/d/1S45EyniKYCe550M6inZXL7jzKvNJR22H-beX5BLiIoM',
  QA: 'https://docs.google.com/spreadsheets/d/1boJ69H1jq5zOHHStvxlHD5qYWSJ_JhAqFl1GHzwY1I0',
};

export async function getDailyReportData(date?: string): Promise<DailyReportData> {
  // Default to yesterday
  const reportDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Get total issues for the date
  const totalResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM issues WHERE issue_date = $1`,
    [reportDate]
  );

  // Get issues by source
  const bySourceResult = await query<{ source: string; count: string }>(
    `SELECT COALESCE(s.name, 'Unknown') as source, COUNT(*) as count
     FROM issues i
     LEFT JOIN issue_sources s ON i.source_id = s.id
     WHERE i.issue_date = $1
     GROUP BY s.name
     ORDER BY count DESC`,
    [reportDate]
  );

  // Get issues by team lead
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

  // Get all issues details
  const issuesResult = await query<{
    team_lead: string;
    team_member: string;
    cid: string;
    issue_type: string;
    comment: string;
    source: string;
  }>(
    `SELECT
       COALESCE(tl.full_name, 'N/A') as team_lead,
       COALESCE(u.full_name, i.responsible_cc_name, 'Unknown') as team_member,
       COALESCE(i.cid, '-') as cid,
       COALESCE(i.issue_type, '-') as issue_type,
       COALESCE(i.comment, '-') as comment,
       COALESCE(s.name, 'Unknown') as source
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
    })),
  };
}

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
    .map(
      i => `
      <tr>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${i.teamLead}</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${i.teamMember}</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${i.cid}</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${i.issueType}</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${i.comment}</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${i.source} Report</td>
      </tr>
    `
    )
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
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 900px; margin: 0 auto; padding: 20px;">

  <h1 style="font-size: 24px; margin-bottom: 24px;">📋 Daily Issues Summary Report - ${formattedDate}</h1>

  <p style="color: #6b7280;">Dear Management Team,</p>
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
    This is an automated summary report containing all issues from yesterday.
  </p>

  <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">
    Generated automatically by Quality Monitoring System<br>
    <a href="${process.env.FRONTEND_URL || 'http://37.27.5.172:8080'}" style="color: #6b7280;">Open Dashboard</a>
  </p>

</body>
</html>
  `;
}

export async function sendDailyReport(
  recipients: string[],
  date?: string
): Promise<{ success: boolean; message: string; data?: DailyReportData }> {
  try {
    const data = await getDailyReportData(date);
    const html = generateReportHtml(data);

    const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });

    const subject = `[MANAGEMENT] Complete Daily Issues Summary - ${formattedDate} (${data.totalIssues} total issues)`;

    await sendEmail({
      to: recipients,
      subject,
      html,
    });

    return {
      success: true,
      message: `Report sent to ${recipients.length} recipient(s)`,
      data,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to send daily report:', error);
    return {
      success: false,
      message: errorMessage,
    };
  }
}

// Get list of management emails from database or env
export async function getReportRecipients(): Promise<string[]> {
  // First try to get from environment variable
  const envRecipients = process.env.REPORT_RECIPIENTS;
  if (envRecipients) {
    return envRecipients.split(',').map(e => e.trim());
  }

  // Otherwise get all admins and team leads
  const result = await query<{ email: string }>(
    `SELECT email FROM users WHERE role IN ('admin', 'team_lead') AND is_active = true`
  );

  return result.rows.map(r => r.email);
}
