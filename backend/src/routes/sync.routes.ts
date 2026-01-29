import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { syncAllSources, syncSource, getSyncLogs, getSyncStatus, getSources } from '../services/sync.service.js';
import { syncTeamRoster, getTeamStructure } from '../services/team-sync.service.js';

export async function syncRoutes(fastify: FastifyInstance) {
  // Trigger sync for all sources (admin only)
  fastify.post(
    '/api/sync/trigger',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Run sync in background
      syncAllSources()
        .then((results) => {
          console.log('Sync completed:', results.map((r) => ({ source: r.source_id, status: r.status })));
        })
        .catch((error) => {
          console.error('Sync error:', error);
        });

      return reply.send({
        message: 'Sync started',
        started_at: new Date().toISOString(),
      });
    }
  );

  // Trigger sync for specific source (admin only)
  fastify.post(
    '/api/sync/trigger/:source',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest<{ Params: { source: string } }>, reply: FastifyReply) => {
      const { source } = request.params;

      const sources = await getSources();
      const sourceConfig = sources.find((s) => s.name.toLowerCase() === source.toLowerCase());

      if (!sourceConfig) {
        return reply.status(404).send({ error: `Source "${source}" not found` });
      }

      // Run sync in background
      syncSource(sourceConfig.id)
        .then((result) => {
          console.log('Sync completed:', { source: sourceConfig.name, status: result.status });
        })
        .catch((error) => {
          console.error('Sync error:', error);
        });

      return reply.send({
        message: `Sync started for ${sourceConfig.name}`,
        source: sourceConfig.name,
        started_at: new Date().toISOString(),
      });
    }
  );

  // Get sync status
  fastify.get(
    '/api/sync/status',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const status = await getSyncStatus();
      return reply.send(status);
    }
  );

  // Get sync logs (admin/team_lead)
  fastify.get(
    '/api/sync/logs',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const queryParams = request.query as Record<string, string>;
      const limit = parseInt(queryParams.limit || '50', 10);

      const logs = await getSyncLogs(limit);
      return reply.send({ logs });
    }
  );

  // Get sources configuration
  fastify.get(
    '/api/sync/sources',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const sources = await getSources();
      return reply.send({ sources });
    }
  );

  // Trigger team roster sync (admin only)
  fastify.post(
    '/api/sync/team',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await syncTeamRoster();
        return reply.send({
          message: 'Team roster sync completed',
          ...result,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return reply.status(500).send({ error: message });
      }
    }
  );

  // Get team structure
  fastify.get(
    '/api/sync/team',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const structure = await getTeamStructure();
        return reply.send({ teams: structure });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return reply.status(500).send({ error: message });
      }
    }
  );
}
