import express from 'express';
import cors from 'cors';
import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '../db/index';
import { snapshots, stakeholders, stakeholderPositions } from '../db/schema';
import { requireUser, requirePermissionOnProject } from './auth';
import {
  validateCreateStakeholder,
  validateUpdateStakeholder,
  type ProjectStakeholdersLatestResponse,
  type CreateStakeholderResponse,
  type StakeholderPositionDTO,
} from '../shared/index';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// Parse JSON request bodies (needed by the add-stakeholder POST below).
app.use(express.json());

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

// Add a stakeholder to a project's latest snapshot. Writing requires "editor"
// or higher (readers can't write); scope inheritance still applies, so an
// account-level director passes.
app.post(
  '/api/projects/:projectId/stakeholders',
  requireUser,
  async (req, res) => {
    const userId = req.userId;
    if (!userId) {
      res.status(400).json({ error: 'Missing X-User-Id header' });
      return;
    }
    const { projectId } = req.params;
    if (typeof projectId !== 'string') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    try {
      const auth = await requirePermissionOnProject(userId, projectId, 'editor');
      if (!auth.ok) {
        if (auth.reason === 'not_found') {
          res.status(404).json({ error: 'Project not found' });
        } else {
          res.status(403).json({ error: 'Forbidden' });
        }
        return;
      }

      const validation = validateCreateStakeholder(req.body);
      if (!validation.ok) {
        const firstError = Object.values(validation.errors)[0] ?? 'Invalid request body.';
        res.status(400).json({ error: firstError, fields: validation.errors });
        return;
      }
      const input = validation.value;

      // The new position attaches to the project's latest snapshot.
      const [snapshot] = await db
        .select({ id: snapshots.id })
        .from(snapshots)
        .where(eq(snapshots.projectId, projectId))
        .orderBy(desc(snapshots.capturedAt))
        .limit(1);

      if (!snapshot) {
        // TODO: when snapshot management lands, decide whether to auto-create a
        // snapshot here or require one explicitly.
        res.status(409).json({
          error: 'Project has no snapshot to add the stakeholder to.',
        });
        return;
      }

      // Insert the stakeholder and its position atomically: if the position
      // insert fails, the stakeholder insert rolls back with it.
      // TODO: snapshot semantics. Currently we mutate the latest snapshot to
      // include the new stakeholder. When snapshots become frozen historical
      // records, this should either create a new snapshot or refuse to add to a
      // locked one.
      const created = await db.transaction(async (tx) => {
        const [stakeholder] = await tx
          .insert(stakeholders)
          .values({
            accountId: auth.accountId,
            name: input.name,
            role: input.role ?? null,
            organisation: input.organisation ?? null,
          })
          .returning();

        const [position] = await tx
          .insert(stakeholderPositions)
          .values({
            stakeholderId: stakeholder.id,
            projectId,
            snapshotId: snapshot.id,
            power: input.power,
            interest: input.interest,
            relationship: input.relationship,
          })
          .returning();

        return { stakeholder, position };
      });

      const body: CreateStakeholderResponse = {
        id: created.stakeholder.id,
        name: created.stakeholder.name,
        role: created.stakeholder.role,
        organisation: created.stakeholder.organisation,
        power: created.position.power,
        interest: created.position.interest,
        relationship: created.position.relationship,
        targetRelationship: created.position.targetRelationship,
        targetPower: created.position.targetPower,
        targetInterest: created.position.targetInterest,
      };
      res.status(201).json(body);
    } catch (err) {
      console.error('POST /api/projects/:projectId/stakeholders failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// Edit a stakeholder. Updates the account-level stakeholder record (name/role/
// organisation) and/or its position in the project's latest snapshot (power/
// interest/relationship), in one transaction. Writing requires "editor"+.
app.patch(
  '/api/projects/:projectId/stakeholders/:stakeholderId',
  requireUser,
  async (req, res) => {
    const userId = req.userId;
    if (!userId) {
      res.status(400).json({ error: 'Missing X-User-Id header' });
      return;
    }
    const { projectId, stakeholderId } = req.params;
    if (typeof projectId !== 'string') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    if (typeof stakeholderId !== 'string' || !UUID_RE.test(stakeholderId)) {
      res.status(404).json({ error: 'Stakeholder not found' });
      return;
    }

    try {
      const auth = await requirePermissionOnProject(userId, projectId, 'editor');
      if (!auth.ok) {
        if (auth.reason === 'not_found') {
          res.status(404).json({ error: 'Project not found' });
        } else {
          res.status(403).json({ error: 'Forbidden' });
        }
        return;
      }

      // The stakeholder must exist AND live on the same account as the project;
      // otherwise 404 (don't leak existence of other accounts' stakeholders).
      const [stakeholder] = await db
        .select({ id: stakeholders.id, accountId: stakeholders.accountId })
        .from(stakeholders)
        .where(eq(stakeholders.id, stakeholderId))
        .limit(1);
      if (!stakeholder || stakeholder.accountId !== auth.accountId) {
        res.status(404).json({ error: 'Stakeholder not found' });
        return;
      }

      const validation = validateUpdateStakeholder(req.body);
      if (!validation.ok) {
        const firstError = Object.values(validation.errors)[0] ?? 'Invalid request body.';
        res.status(400).json({ error: firstError, fields: validation.errors });
        return;
      }
      const updates = validation.value;

      const hasStakeholderFields =
        updates.name !== undefined || updates.role !== undefined || updates.organisation !== undefined;
      const hasPositionFields =
        updates.power !== undefined || updates.interest !== undefined || updates.relationship !== undefined;
      if (!hasStakeholderFields && !hasPositionFields) {
        res.status(400).json({ error: 'No fields to update.' });
        return;
      }

      // The position is edited in the project's latest snapshot.
      const [snapshot] = await db
        .select({ id: snapshots.id })
        .from(snapshots)
        .where(eq(snapshots.projectId, projectId))
        .orderBy(desc(snapshots.capturedAt))
        .limit(1);
      if (!snapshot) {
        // TODO: same snapshot-management gap as add.
        res.status(409).json({ error: 'Project has no snapshot to edit.' });
        return;
      }

      // The stakeholder must have a position in this snapshot — both to edit a
      // position and to return a StakeholderPositionDTO. If it's at account
      // level but not on this project's latest snapshot, 404.
      const [existingPosition] = await db
        .select({ id: stakeholderPositions.id })
        .from(stakeholderPositions)
        .where(
          and(
            eq(stakeholderPositions.stakeholderId, stakeholderId),
            eq(stakeholderPositions.snapshotId, snapshot.id),
            eq(stakeholderPositions.projectId, projectId),
          ),
        )
        .limit(1);
      if (!existingPosition) {
        res.status(404).json({ error: 'Stakeholder is not on this project\'s latest snapshot.' });
        return;
      }

      // TODO: snapshot semantics. Currently we mutate the latest snapshot's
      // positions. When snapshots become frozen historical records, editing a
      // position should write to a new working snapshot, not a historical one.
      // TODO: no optimistic locking — two concurrent edits are last-write-wins.
      await db.transaction(async (tx) => {
        if (hasStakeholderFields) {
          const set: Partial<typeof stakeholders.$inferInsert> = { updatedAt: new Date() };
          if (updates.name !== undefined) set.name = updates.name;
          if (updates.role !== undefined) set.role = updates.role;
          if (updates.organisation !== undefined) set.organisation = updates.organisation;
          await tx.update(stakeholders).set(set).where(eq(stakeholders.id, stakeholderId));
        }
        if (hasPositionFields) {
          const set: Partial<typeof stakeholderPositions.$inferInsert> = {};
          if (updates.power !== undefined) set.power = updates.power;
          if (updates.interest !== undefined) set.interest = updates.interest;
          if (updates.relationship !== undefined) set.relationship = updates.relationship;
          await tx
            .update(stakeholderPositions)
            .set(set)
            .where(
              and(
                eq(stakeholderPositions.stakeholderId, stakeholderId),
                eq(stakeholderPositions.snapshotId, snapshot.id),
                eq(stakeholderPositions.projectId, projectId),
              ),
            );
        }
      });

      // Return the updated entity in the same shape the GET endpoint uses.
      const [row] = await db
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
        .where(
          and(
            eq(stakeholderPositions.stakeholderId, stakeholderId),
            eq(stakeholderPositions.snapshotId, snapshot.id),
            eq(stakeholderPositions.projectId, projectId),
          ),
        )
        .limit(1);

      if (!row) {
        res.status(500).json({ error: 'Updated stakeholder could not be read back.' });
        return;
      }
      const body: StakeholderPositionDTO = row;
      res.status(200).json(body);
    } catch (err) {
      console.error('PATCH /api/projects/:projectId/stakeholders/:stakeholderId failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// Remove a stakeholder from THIS project: delete its position rows across all of
// the project's snapshots, leaving the account-level stakeholder record (and any
// positions on other projects) intact. Writing requires "editor"+.
app.delete(
  '/api/projects/:projectId/stakeholders/:stakeholderId',
  requireUser,
  async (req, res) => {
    const userId = req.userId;
    if (!userId) {
      res.status(400).json({ error: 'Missing X-User-Id header' });
      return;
    }
    const { projectId, stakeholderId } = req.params;
    if (typeof projectId !== 'string') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    if (typeof stakeholderId !== 'string' || !UUID_RE.test(stakeholderId)) {
      res.status(404).json({ error: 'Stakeholder not found' });
      return;
    }

    try {
      const auth = await requirePermissionOnProject(userId, projectId, 'editor');
      if (!auth.ok) {
        if (auth.reason === 'not_found') {
          res.status(404).json({ error: 'Project not found' });
        } else {
          res.status(403).json({ error: 'Forbidden' });
        }
        return;
      }

      // Stakeholder must exist AND be on the same account, else 404 (no leak).
      const [stakeholder] = await db
        .select({ id: stakeholders.id, accountId: stakeholders.accountId })
        .from(stakeholders)
        .where(eq(stakeholders.id, stakeholderId))
        .limit(1);
      if (!stakeholder || stakeholder.accountId !== auth.accountId) {
        res.status(404).json({ error: 'Stakeholder not found' });
        return;
      }

      // Remove the stakeholder from this project entirely — every snapshot, not
      // just the latest. Single statement; idempotent (0 rows matched → still
      // 204). The stakeholder record itself is intentionally left in place.
      // TODO: when snapshots become frozen records, deleting from historical
      // snapshots becomes a different operation ("remove from current view going
      // forward, preserve history"). Full removal is simpler for now.
      await db
        .delete(stakeholderPositions)
        .where(
          and(
            eq(stakeholderPositions.stakeholderId, stakeholderId),
            eq(stakeholderPositions.projectId, projectId),
          ),
        );

      res.status(204).end();
    } catch (err) {
      console.error('DELETE /api/projects/:projectId/stakeholders/:stakeholderId failed:', err);
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
