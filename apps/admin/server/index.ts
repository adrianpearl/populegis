// server/index.ts
import { Hono } from 'hono';
import { govinfo } from './routes/govinfo';
import { billsadd } from './routes/bills';

const app = new Hono().basePath('/api/admin');
app.route('/govinfo', govinfo);
app.route('/', billsadd);
export default app;