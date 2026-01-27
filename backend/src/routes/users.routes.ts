import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import '../types/fastify.js';
import { authenticate, requireTeamLead } from '../middleware/auth.js';
import { getAllUsers, findUserById, getTeamMembers } from '../services/users.service.js';

export async function usersRoutes(fastify: FastifyInstance) {
  // Get all users (admin/team_lead)
  fastify.get(
    '/api/users',
    { preHandler: [authenticate, requireTeamLead] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const queryParams = request.query as Record<string, string>;

      const filters: {
        team?: string;
        role?: string;
        team_lead_id?: number;
        is_active?: boolean;
      } = {};

      if (queryParams.team) filters.team = queryParams.team;
      if (queryParams.role) filters.role = queryParams.role;
      if (queryParams.team_lead_id) filters.team_lead_id = parseInt(queryParams.team_lead_id, 10);
      if (queryParams.is_active !== undefined) filters.is_active = queryParams.is_active === 'true';

      // Team leads can only see their team members
      if (request.user.role === 'team_lead') {
        filters.team_lead_id = request.user.userId;
      }

      const users = await getAllUsers(filters);

      return reply.send({ users });
    }
  );

  // Get single user
  fastify.get(
    '/api/users/:id',
    { preHandler: authenticate },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const id = parseInt(request.params.id, 10);

      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid user ID' });
      }

      // Check access
      if (request.user.role === 'cc' && request.user.userId !== id) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      const user = await findUserById(id);

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Team lead can only see their team members
      if (request.user.role === 'team_lead' && user.team_lead_id !== request.user.userId && user.id !== request.user.userId) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      return reply.send({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        team: user.team,
        role: user.role,
        team_lead_id: user.team_lead_id,
        is_active: user.is_active,
      });
    }
  );

  // Get team members (for team leads)
  fastify.get(
    '/api/users/team/members',
    { preHandler: [authenticate, requireTeamLead] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const teamLeadId = request.user.role === 'admin'
        ? parseInt((request.query as any).team_lead_id || '0', 10)
        : request.user.userId;

      if (!teamLeadId) {
        return reply.status(400).send({ error: 'Team lead ID required' });
      }

      const members = await getTeamMembers(teamLeadId);

      return reply.send({ members });
    }
  );

  // Get users for dropdown (simplified list)
  fastify.get(
    '/api/users/dropdown',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const filters: { team_lead_id?: number; is_active: boolean } = {
        is_active: true,
      };

      if (request.user.role === 'team_lead') {
        filters.team_lead_id = request.user.userId;
      }

      const users = await getAllUsers(filters);

      return reply.send({
        users: users.map((u) => ({
          id: u.id,
          full_name: u.full_name,
          team: u.team,
        })),
      });
    }
  );

  // Get team leads for dropdown
  fastify.get(
    '/api/users/team-leads',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const users = await getAllUsers({ role: 'team_lead', is_active: true });

      return reply.send({
        team_leads: users.map((u) => ({
          id: u.id,
          full_name: u.full_name,
        })),
      });
    }
  );
}
