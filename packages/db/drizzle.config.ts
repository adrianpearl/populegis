/// <reference types="node" />
import 'dotenv/config'; // Loads your .env values instantly
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './src/db', 
  schema: './src/db/schema.ts',
  dialect: 'postgresql', // Drizzle-kit uses the unified postgresql engine
  dbCredentials: {
    url: process.env.DATABASE_URL!, 
  },
});
