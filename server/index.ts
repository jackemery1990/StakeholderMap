import express from 'express';
import cors from 'cors';

// Required runtime configuration. No defaults, no fallbacks: these must be
// provided via the environment (Replit Secrets). Consumed by later steps
// (Drizzle, Clerk) — read once at startup so a workflow restart picks them up.
const env = {
  databaseUrl: process.env.DATABASE_URL,
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  clerkSecretKey: process.env.CLERK_SECRET_KEY,
};

const app = express();

// Allow the Vite frontend dev origin to call this API.
app.use(cors({ origin: 'http://localhost:5173' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

const port = Number(process.env.PORT) || 3001;

app.listen(port, '0.0.0.0', () => {
  console.log(`API listening on http://0.0.0.0:${port}`);
  // Booleans only — never log secret values.
  console.log('Config present:', {
    DATABASE_URL: Boolean(env.databaseUrl),
    CLERK_PUBLISHABLE_KEY: Boolean(env.clerkPublishableKey),
    CLERK_SECRET_KEY: Boolean(env.clerkSecretKey),
  });
});
