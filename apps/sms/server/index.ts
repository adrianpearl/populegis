import { Hono } from 'hono';
import { sms } from './routes/sms';

const app = new Hono();
app.route('/', sms);
export default app;