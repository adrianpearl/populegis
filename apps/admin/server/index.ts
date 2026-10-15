// server/index.ts
import { handleRequest } from './app';
import type { PublicEnv } from './env';

export default {
  fetch(request: Request, env: PublicEnv, ctx: ExecutionContext) {
    return handleRequest(request, env, ctx);
  },
};