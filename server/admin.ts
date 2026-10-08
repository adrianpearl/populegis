// server/admin.ts
import { api, handleRequest } from './app';
import { govinfo } from './routes/govinfo';
import { admin } from './routes/admin';
import type { AdminEnv } from './env';

api.route('/admin/govinfo', govinfo);
api.route('/admin', admin);

export default {
  fetch(request: Request, env: AdminEnv, ctx: ExecutionContext) {
    return handleRequest(request, env, ctx);
  },
};