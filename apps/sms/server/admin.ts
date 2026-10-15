import { Hono } from 'hono';
import { sms } from './routes/sms';

const app = new Hono().basePath('/api/admin');
app.route('/sms', sms);
export default app;