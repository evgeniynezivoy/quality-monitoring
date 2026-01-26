import { FastifyRequest, FastifyReply } from 'fastify';
import { JwtPayload } from '../types/index.js';
import '../types/fastify.js';

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return reply.status(401).send({ error: 'No token provided' });
    }

    const decoded = await request.jwtVerify<JwtPayload>();
    request.user = decoded;
  } catch (err) {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...allowedRoles: Array<'admin' | 'team_lead' | 'cc'>) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }
  };
}

export const requireAdmin = requireRole('admin');
export const requireTeamLead = requireRole('admin', 'team_lead');
