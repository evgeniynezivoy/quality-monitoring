import { fetchSheetData } from '../config/google-sheets.js';
import { query } from '../config/database.js';

const TEAM_ROSTER_SHEET_ID = '1VGO68A1Y9zU8Nu5viL73BJLdCFZGJsXBP1EmGUuoqEE';
const TEAM_ROSTER_GID = '1013687437';

interface TeamMember {
  cc_email: string;
  cc: string;
  cc_full_name: string;
  first_name: string;
  last_name: string;
  cc_tl: string;
  tl_email: string;
}

export interface TeamSyncResult {
  team_leads_created: number;
  team_leads_updated: number;
  ccs_created: number;
  ccs_updated: number;
  errors: string[];
}

export async function syncTeamRoster(): Promise<TeamSyncResult> {
  const result: TeamSyncResult = {
    team_leads_created: 0,
    team_leads_updated: 0,
    ccs_created: 0,
    ccs_updated: 0,
    errors: [],
  };

  try {
    // Fetch team roster from Google Sheets
    const data = await fetchSheetData(TEAM_ROSTER_SHEET_ID, TEAM_ROSTER_GID);
    const members: TeamMember[] = data.rows.map((row) => ({
      cc_email: row.cc_email || '',
      cc: row.cc || '',
      cc_full_name: row.cc_full_name || '',
      first_name: row.first_name || '',
      last_name: row.last_name || '',
      cc_tl: row.cc_tl || '',
      tl_email: row.tl_email || '',
    }));

    if (members.length === 0) {
      result.errors.push('No team members found in sheet');
      return result;
    }

    // Extract unique team leads
    const teamLeadsMap = new Map<string, { email: string; name: string }>();
    for (const member of members) {
      if (member.tl_email && member.cc_tl) {
        const tlEmail = member.tl_email.toLowerCase().trim();
        if (!teamLeadsMap.has(tlEmail)) {
          teamLeadsMap.set(tlEmail, {
            email: tlEmail,
            name: member.cc_tl.trim(),
          });
        }
      }
    }

    // Create/update team leads first
    for (const [email, tl] of teamLeadsMap) {
      try {
        const existing = await query(
          'SELECT id FROM users WHERE LOWER(email) = $1',
          [email]
        );

        if (existing.rows.length > 0) {
          // Update existing team lead
          await query(
            `UPDATE users SET
              full_name = $1,
              role = CASE WHEN role = 'admin' THEN role ELSE 'team_lead' END,
              is_active = true
            WHERE LOWER(email) = $2`,
            [tl.name, email]
          );
          result.team_leads_updated++;
        } else {
          // Create new team lead
          await query(
            `INSERT INTO users (email, full_name, team, role, is_active)
            VALUES ($1, $2, 'Management', 'team_lead', true)`,
            [email, tl.name]
          );
          result.team_leads_created++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        result.errors.push(`Team lead ${email}: ${message}`);
      }
    }

    // Batch lookup: Get all team lead IDs and existing CC users in two queries
    const allTlEmails = [...new Set(members
      .filter(m => m.tl_email)
      .map(m => m.tl_email.toLowerCase().trim())
    )];

    const allCcEmails = [...new Set(members
      .filter(m => m.cc_email)
      .map(m => m.cc_email.toLowerCase().trim())
    )];

    // Batch fetch team lead IDs
    const teamLeadIdMap = new Map<string, number>();
    if (allTlEmails.length > 0) {
      const tlResult = await query<{ email: string; id: number }>(
        `SELECT LOWER(email) as email, id FROM users WHERE LOWER(email) = ANY($1)`,
        [allTlEmails]
      );
      for (const row of tlResult.rows) {
        teamLeadIdMap.set(row.email, row.id);
      }
    }

    // Batch fetch existing CC users
    const existingCCMap = new Map<string, { id: number; role: string }>();
    if (allCcEmails.length > 0) {
      const ccResult = await query<{ email: string; id: number; role: string }>(
        `SELECT LOWER(email) as email, id, role FROM users WHERE LOWER(email) = ANY($1)`,
        [allCcEmails]
      );
      for (const row of ccResult.rows) {
        existingCCMap.set(row.email, { id: row.id, role: row.role });
      }
    }

    // Now create/update CCs with their team lead references
    for (const member of members) {
      if (!member.cc_email) continue;

      const ccEmail = member.cc_email.toLowerCase().trim();
      const tlEmail = member.tl_email?.toLowerCase().trim();

      try {
        // Get team lead ID from pre-fetched map
        const teamLeadId = tlEmail ? teamLeadIdMap.get(tlEmail) ?? null : null;

        // Determine team from team lead name or CC code
        const team = determineTeam(member.cc_tl, member.cc);

        // Get CC abbreviation
        const ccAbbreviation = member.cc?.trim() || null;

        const existing = existingCCMap.get(ccEmail);

        if (existing) {
          // Don't downgrade team leads or admins to CC
          const newRole = existing.role === 'admin' || existing.role === 'team_lead'
            ? existing.role
            : 'cc';

          await query(
            `UPDATE users SET
              full_name = $1,
              team = $2,
              team_lead_id = $3,
              role = $4,
              cc_abbreviation = $5,
              is_active = true
            WHERE LOWER(email) = $6`,
            [member.cc_full_name.trim(), team, teamLeadId, newRole, ccAbbreviation, ccEmail]
          );
          result.ccs_updated++;
        } else {
          await query(
            `INSERT INTO users (email, full_name, team, team_lead_id, role, cc_abbreviation, is_active)
            VALUES ($1, $2, $3, $4, 'cc', $5, true)`,
            [ccEmail, member.cc_full_name.trim(), team, teamLeadId, ccAbbreviation]
          );
          result.ccs_created++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        result.errors.push(`CC ${ccEmail}: ${message}`);
      }
    }

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    result.errors.push(`Sync failed: ${message}`);
    return result;
  }
}

function determineTeam(teamLeadName: string, ccCode: string): string {
  // Check CC code for specific teams
  if (ccCode.includes('ITBF')) return 'ITBF';

  // Default team based on common patterns
  // This can be expanded based on actual team structure
  return 'Operations';
}

export async function getTeamStructure(): Promise<any> {
  const result = await query(`
    SELECT
      tl.id as team_lead_id,
      tl.full_name as team_lead_name,
      tl.email as team_lead_email,
      json_agg(
        json_build_object(
          'id', cc.id,
          'full_name', cc.full_name,
          'email', cc.email,
          'team', cc.team
        ) ORDER BY cc.full_name
      ) FILTER (WHERE cc.id IS NOT NULL) as team_members
    FROM users tl
    LEFT JOIN users cc ON cc.team_lead_id = tl.id AND cc.is_active = true
    WHERE tl.role = 'team_lead' AND tl.is_active = true
    GROUP BY tl.id, tl.full_name, tl.email
    ORDER BY tl.full_name
  `);

  return result.rows;
}
