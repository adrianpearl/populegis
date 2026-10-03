// worker-configuration.d.ts

interface Env {
  DATABASE_URL: string;
  ASSETS: Fetcher; // 🟢 Allows env.ASSETS.fetch(request) to process without types crashing
}
