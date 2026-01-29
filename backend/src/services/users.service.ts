import { query } from '../config/database.js';
import { User } from '../types/index.js';
import bcrypt from 'bcrypt';

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await query<User>(
    'SELECT * FROM users WHERE email = $1 AND is_active = true',
    [email]
  );
  return result.rows[0] || null;
}

export async function findUserById(id: number): Promise<User | null> {
  const result = await query<User>(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function validatePassword(
  email: string,
  password: string
): Promise<User | null> {
  const result = await query<User & { password_hash: string }>(
    'SELECT * FROM users WHERE email = $1 AND is_active = true',
    [email]
  );

  const user = result.rows[0];
  if (!user || !user.password_hash) {
    return null;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return null;
  }

  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function createUser(data: {
  email: string;
  password: string;
  full_name: string;
  team: string;
  role?: 'admin' | 'team_lead' | 'cc';
  team_lead_id?: number;
}): Promise<User> {
  const passwordHash = await bcrypt.hash(data.password, 10);

  const result = await query<User>(
    `INSERT INTO users (email, password_hash, full_name, team, role, team_lead_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, full_name, team_lead_id, team, role, is_active, created_at, updated_at`,
    [
      data.email,
      passwordHash,
      data.full_name,
      data.team,
      data.role || 'cc',
      data.team_lead_id || null,
    ]
  );

  return result.rows[0];
}

export async function updateUser(
  id: number,
  data: Partial<{
    email: string;
    full_name: string;
    team: string;
    role: 'admin' | 'team_lead' | 'cc';
    team_lead_id: number | null;
    is_active: boolean;
  }>
): Promise<User | null> {
  const fields: string[] = [];
  const values: (string | number | boolean | null)[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (fields.length === 0) {
    return findUserById(id);
  }

  values.push(id);
  const result = await query<User>(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}
     RETURNING id, email, full_name, team_lead_id, team, role, is_active, created_at, updated_at`,
    values
  );

  return result.rows[0] || null;
}

export async function getAllUsers(filters?: {
  team?: string;
  role?: string;
  team_lead_id?: number;
  is_active?: boolean;
}): Promise<User[]> {
  let sql = 'SELECT id, email, full_name, team_lead_id, team, role, is_active, created_at, updated_at FROM users WHERE 1=1';
  const params: (string | number | boolean)[] = [];
  let paramIndex = 1;

  if (filters?.team) {
    sql += ` AND team = $${paramIndex++}`;
    params.push(filters.team);
  }

  if (filters?.role) {
    sql += ` AND role = $${paramIndex++}`;
    params.push(filters.role);
  }

  if (filters?.team_lead_id) {
    sql += ` AND team_lead_id = $${paramIndex++}`;
    params.push(filters.team_lead_id);
  }

  if (filters?.is_active !== undefined) {
    sql += ` AND is_active = $${paramIndex++}`;
    params.push(filters.is_active);
  }

  sql += ' ORDER BY full_name ASC';

  const result = await query<User>(sql, params);
  return result.rows;
}

export async function getTeamMembers(teamLeadId: number): Promise<User[]> {
  const result = await query<User>(
    `SELECT id, email, full_name, team_lead_id, team, role, is_active, created_at, updated_at
     FROM users
     WHERE team_lead_id = $1 AND is_active = true
     ORDER BY full_name ASC`,
    [teamLeadId]
  );
  return result.rows;
}

export async function setPassword(userId: number, password: string): Promise<boolean> {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await query(
    'UPDATE users SET password_hash = $1 WHERE id = $2',
    [passwordHash, userId]
  );
  return (result.rowCount || 0) > 0;
}
