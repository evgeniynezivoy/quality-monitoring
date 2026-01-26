import { FastifyRequest, FastifyReply } from 'fastify';
import { JwtPayload } from '../types/index.js';
import '../types/fastify.js';

// Mock user for development - replace with corporate auth before release
const MOCK_USER: JwtPayload = {
  userId: 1,
  email: 'admin@quality.local',
  role: 'admin',
  team: 'QA',
};

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // TODO: Replace with corporate auth module before release
  // For now, use mock admin user
  request.user = MOCK_USER;
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
