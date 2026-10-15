// server/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors'; // 1. Import the built-in CORS middleware
import { govinfo } from './routes/govinfo';
import { billsadd } from './routes/bills';

const app = new Hono().basePath('/api/admin');

// 2. Register CORS middleware globally in front of all routes
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      // Access the secret local variable if it exists in .dev.vars
      const allowedLocal = c.env?.ALLOWED_ORIGIN; 
      
      // If the incoming origin matches your local dev server, allow it
      if (allowedLocal && origin === allowedLocal) {
        return origin;
      }
      
      // Fallback fallback to your hardcoded production origin
      return 'https://your-production-app.com';
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  })
);

app.route('/govinfo', govinfo);
app.route('/', billsadd);

export default app;
