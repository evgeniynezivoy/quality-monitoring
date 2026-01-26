import '@fastify/jwt';
import { JwtPayload } from './index.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}
