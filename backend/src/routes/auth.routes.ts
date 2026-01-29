import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import '../types/fastify.js';
import { z } from 'zod';
import { validatePassword, findUserById, createUser, setPassword } from '../services/users.service.js';
import { query } from '../config/database.js';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(2),
  team: z.string().min(1),
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8),
});

export async function authRoutes(fastify: FastifyInstance) {
  // Login
  fastify.post('/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = loginSchema.safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request', details: body.error.flatten() });
    }

    const user = await validatePassword(body.data.email, body.data.password);

    if (!user) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    // Generate tokens
    const accessToken = fastify.jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        team: user.team,
      },
      { expiresIn: '15m' }
    );

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store refresh token
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, refreshExpiresAt]
    );

    return reply.send({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        team: user.team,
      },
    });
  });

  // Refresh token
  fastify.post('/auth/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const { refresh_token } = request.body as { refresh_token?: string };

    if (!refresh_token) {
      return reply.status(400).send({ error: 'Refresh token required' });
    }

    const result = await query<{ user_id: number; expires_at: Date }>(
      'SELECT user_id, expires_at FROM refresh_tokens WHERE token = $1',
      [refresh_token]
    );

    const tokenData = result.rows[0];
    if (!tokenData || new Date(tokenData.expires_at) < new Date()) {
      return reply.status(401).send({ error: 'Invalid or expired refresh token' });
    }

    const user = await findUserById(tokenData.user_id);
    if (!user || !user.is_active) {
      return reply.status(401).send({ error: 'User not found or inactive' });
    }

    // Generate new access token
    const accessToken = fastify.jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        team: user.team,
      },
      { expiresIn: '15m' }
    );

    return reply.send({
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        team: user.team,
      },
    });
  });

  // Logout
  fastify.post('/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const { refresh_token } = request.body as { refresh_token?: string };

    if (refresh_token) {
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refresh_token]);
    }

    return reply.send({ message: 'Logged out successfully' });
  });

  // Get current user
  fastify.get(
    '/auth/me',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await findUserById(request.user.userId);

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        team: user.team,
        team_lead_id: user.team_lead_id,
      });
    }
  );

  // Change password
  fastify.post(
    '/auth/change-password',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = changePasswordSchema.safeParse(request.body);

      if (!body.success) {
        return reply.status(400).send({ error: 'Invalid request', details: body.error.flatten() });
      }

      const user = await findUserById(request.user.userId);
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      const validPassword = await validatePassword(user.email, body.data.current_password);
      if (!validPassword) {
        return reply.status(400).send({ error: 'Current password is incorrect' });
      }

      await setPassword(user.id, body.data.new_password);

      return reply.send({ message: 'Password changed successfully' });
    }
  );

  // Register (admin only or first user)
  fastify.post('/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = registerSchema.safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request', details: body.error.flatten() });
    }

    // Check if any users exist
    const countResult = await query<{ count: string }>('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(countResult.rows[0]?.count || '0', 10);

    // First user becomes admin, otherwise need admin auth
    let role: 'admin' | 'team_lead' | 'cc' = 'cc';

    if (userCount === 0) {
      role = 'admin';
    } else {
      // Verify admin token
      try {
        await authenticate(request, reply);
        if (request.user?.role !== 'admin') {
          return reply.status(403).send({ error: 'Only admins can register new users' });
        }
      } catch {
        return reply.status(403).send({ error: 'Authentication required' });
      }
    }

    try {
      const user = await createUser({
        email: body.data.email,
        password: body.data.password,
        full_name: body.data.full_name,
        team: body.data.team,
        role,
      });

      return reply.status(201).send({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        team: user.team,
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && (error as { code: string }).code === '23505') {
        return reply.status(409).send({ error: 'Email already exists' });
      }
      throw error;
    }
  });
}
