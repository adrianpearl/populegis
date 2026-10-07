// worker-configuration.d.ts

interface Env {
  DATABASE_URL: string;
  SITE: Fetcher; // 🟢 Allows env.ASSETS.fetch(request) to process without types crashing
}
