import express from 'express';
import cors from 'cors';
import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '../db/index';
import { snapshots, stakeholders, stakeholderPositions } from '../db/schema';
import { requireUser, requirePermissionOnProject } from './auth';
import type { ProjectStakeholdersLatestResponse } from '../shared/index';

// Required runtime configuration. No defaults, no fallbacks: these must be
// provided via the environment (Replit Secrets). Consumed by later steps
// (Drizzle, Clerk) — read once at startup so a workflow restart picks them up.
const env = {
  databaseUrl: process.env.DATABASE_URL,
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  clerkSecretKey: process.env.CLERK_SECRET_KEY,
};

const app = express();

// Kept for direct cross-origin testing via curl and for future production
// setup; not exercised by the browser in dev because of the Vite proxy
// (which makes /api requests same-origin). `allowedHeaders` must list
// X-User-Id explicitly: it is a non-safelisted custom header, so browsers
// preflight it and the response must opt it in (the placeholder auth header,
// soon to be Authorization once Clerk lands).
app.use(
  cors({
    origin: 'http://localhost:5173',
    allowedHeaders: ['Content-Type', 'X-User-Id'],
  }),
);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Latest snapshot for a project, with every stakeholder position joined to its
// stakeholder. Read access requires "viewer" or higher on the project (or the
// programme/account above it).
app.get(
  '/api/projects/:projectId/stakeholders/latest',
  requireUser,
  async (req, res) => {
    const userId = req.userId;
    if (!userId) {
      // requireUser guarantees this, but the guard keeps userId typed as string.
      res.status(400).json({ error: 'Missing X-User-Id header' });
      return;
    }
    // Express 5 types params as string | string[]; a single :projectId segment
    // is always a string, but narrow it honestly rather than casting.
    const { projectId } = req.params;
    if (typeof projectId !== 'string') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    try {
      const auth = await requirePermissionOnProject(userId, projectId, 'viewer');
      if (!auth.ok) {
        if (auth.reason === 'not_found') {
          res.status(404).json({ error: 'Project not found' });
        } else {
          res.status(403).json({ error: 'Forbidden' });
        }
        return;
      }

      // Latest snapshot for the project, if any.
      const [snapshot] = await db
        .select({
          id: snapshots.id,
          label: snapshots.label,
          capturedAt: snapshots.capturedAt,
        })
        .from(snapshots)
        .where(eq(snapshots.projectId, projectId))
        .orderBy(desc(snapshots.capturedAt))
        .limit(1);

      if (!snapshot) {
        const body: ProjectStakeholdersLatestResponse = {
          project: auth.project,
          snapshot: null,
          stakeholders: [],
        };
        res.json(body);
        return;
      }

      // Positions in that snapshot, joined to the stakeholder record.
      const rows = await db
        .select({
          id: stakeholders.id,
          name: stakeholders.name,
          role: stakeholders.role,
          organisation: stakeholders.organisation,
          power: stakeholderPositions.power,
          interest: stakeholderPositions.interest,
          relationship: stakeholderPositions.relationship,
          targetRelationship: stakeholderPositions.targetRelationship,
          targetPower: stakeholderPositions.targetPower,
          targetInterest: stakeholderPositions.targetInterest,
        })
        .from(stakeholderPositions)
        .innerJoin(stakeholders, eq(stakeholders.id, stakeholderPositions.stakeholderId))
        .where(and(eq(stakeholderPositions.snapshotId, snapshot.id)))
        .orderBy(asc(stakeholders.name));

      const body: ProjectStakeholdersLatestResponse = {
        project: auth.project,
        snapshot: {
          id: snapshot.id,
          label: snapshot.label,
          capturedAt: snapshot.capturedAt.toISOString(),
        },
        stakeholders: rows,
      };
      res.json(body);
    } catch (err) {
      console.error('GET /api/projects/:projectId/stakeholders/latest failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

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
