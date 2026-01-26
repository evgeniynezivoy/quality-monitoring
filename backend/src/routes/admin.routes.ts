import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { getAllUsers, updateUser, createUser, setPassword } from '../services/users.service.js';
import { query } from '../config/database.js';

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  full_name: z.string().min(2).optional(),
  team: z.string().min(1).optional(),
  role: z.enum(['admin', 'team_lead', 'cc']).optional(),
  team_lead_id: z.number().nullable().optional(),
  is_active: z.boolean().optional(),
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(2),
  team: z.string().min(1),
  role: z.enum(['admin', 'team_lead', 'cc']).default('cc'),
  team_lead_id: z.number().nullable().optional(),
});

const updateSourceSchema = z.object({
  display_name: z.string().min(1).optional(),
  google_sheet_id: z.string().min(1).optional(),
  sheet_gid: z.string().optional(),
  is_active: z.boolean().optional(),
});

export async function adminRoutes(fastify: FastifyInstance) {
  // Get all users (admin)
  fastify.get(
    '/api/admin/users',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const users = await getAllUsers();
      return reply.send({ users });
    }
  );

  // Create user (admin)
  fastify.post(
    '/api/admin/users',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = createUserSchema.safeParse(request.body);

      if (!body.success) {
        return reply.status(400).send({ error: 'Invalid request', details: body.error.flatten() });
      }

      try {
        const user = await createUser(body.data);
        return reply.status(201).send(user);
      } catch (error: any) {
        if (error.code === '23505') {
          return reply.status(409).send({ error: 'Email already exists' });
        }
        throw error;
      }
    }
  );

  // Update user (admin)
  fastify.put(
    '/api/admin/users/:id',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const id = parseInt(request.params.id, 10);

      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid user ID' });
      }

      const body = updateUserSchema.safeParse(request.body);

      if (!body.success) {
        return reply.status(400).send({ error: 'Invalid request', details: body.error.flatten() });
      }

      const user = await updateUser(id, body.data);

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send(user);
    }
  );

  // Reset user password (admin)
  fastify.post(
    '/api/admin/users/:id/reset-password',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const id = parseInt(request.params.id, 10);
      const { password } = request.body as { password?: string };

      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid user ID' });
      }

      if (!password || password.length < 8) {
        return reply.status(400).send({ error: 'Password must be at least 8 characters' });
      }

      const success = await setPassword(id, password);

      if (!success) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send({ message: 'Password reset successfully' });
    }
  );

  // Get sources (admin)
  fastify.get(
    '/api/admin/sources',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const result = await query('SELECT * FROM issue_sources ORDER BY name');
      return reply.send({ sources: result.rows });
    }
  );

  // Update source (admin)
  fastify.put(
    '/api/admin/sources/:id',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const id = parseInt(request.params.id, 10);

      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid source ID' });
      }

      const body = updateSourceSchema.safeParse(request.body);

      if (!body.success) {
        return reply.status(400).send({ error: 'Invalid request', details: body.error.flatten() });
      }

      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(body.data)) {
        if (value !== undefined) {
          fields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (fields.length === 0) {
        return reply.status(400).send({ error: 'No fields to update' });
      }

      values.push(id);
      const result = await query(
        `UPDATE issue_sources SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'Source not found' });
      }

      return reply.send(result.rows[0]);
    }
  );

  // Get system stats (admin)
  fastify.get(
    '/api/admin/stats',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const [usersResult, issuesResult, sourcesResult, syncResult] = await Promise.all([
        query<{ total: string; active: string }>(`
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE is_active = true) as active
          FROM users
        `),
        query<{ total: string }>('SELECT COUNT(*) as total FROM issues'),
        query<{ total: string; active: string }>(`
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE is_active = true) as active
          FROM issue_sources
        `),
        query<{ last_success: Date; running: string }>(`
          SELECT
            MAX(completed_at) FILTER (WHERE status = 'success') as last_success,
            COUNT(*) FILTER (WHERE status = 'running') as running
          FROM sync_logs
        `),
      ]);

      return reply.send({
        users: {
          total: parseInt(usersResult.rows[0]?.total || '0', 10),
          active: parseInt(usersResult.rows[0]?.active || '0', 10),
        },
        issues: {
          total: parseInt(issuesResult.rows[0]?.total || '0', 10),
        },
        sources: {
          total: parseInt(sourcesResult.rows[0]?.total || '0', 10),
          active: parseInt(sourcesResult.rows[0]?.active || '0', 10),
        },
        sync: {
          last_success: syncResult.rows[0]?.last_success || null,
          is_running: parseInt(syncResult.rows[0]?.running || '0', 10) > 0,
        },
      });
    }
  );
}
