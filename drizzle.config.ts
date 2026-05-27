import { defineConfig } from 'drizzle-kit';

// Reads DATABASE_URL from the environment (Replit Secret / provisioned DB).
export default defineConfig({
  schema: './db/schema/index.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
