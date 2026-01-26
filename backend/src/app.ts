import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { env } from './config/env.js';
import { authRoutes } from './routes/auth.routes.js';
import { issuesRoutes } from './routes/issues.routes.js';
import { dashboardRoutes } from './routes/dashboard.routes.js';
import { usersRoutes } from './routes/users.routes.js';
import { syncRoutes } from './routes/sync.routes.js';
import { adminRoutes } from './routes/admin.routes.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: env.nodeEnv === 'production' ? 'info' : 'debug',
      transport: env.nodeEnv === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  });

  // Register plugins
  await fastify.register(cors, {
    origin: env.nodeEnv === 'production'
      ? ['https://quality.yourdomain.com'] // Update in production
      : true,
    credentials: true,
  });

  await fastify.register(jwt, {
    secret: env.jwt.secret,
  });

  await fastify.register(cookie, {
    secret: env.jwt.secret,
  });

  // Health check
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  // Register routes
  await fastify.register(authRoutes);
  await fastify.register(issuesRoutes);
  await fastify.register(dashboardRoutes);
  await fastify.register(usersRoutes);
  await fastify.register(syncRoutes);
  await fastify.register(adminRoutes);

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);

    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: error.validation,
      });
    }

    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? 'Internal Server Error' : error.message;

    return reply.status(statusCode).send({ error: message });
  });

  return fastify;
}
