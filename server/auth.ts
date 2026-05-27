import type { Request, Response, NextFunction } from 'express';
import { and, eq, inArray, or } from 'drizzle-orm';
import { db } from '../db/index';
import { projects, programmes, permissions } from '../db/schema';

// ---------------------------------------------------------------------------
// PLACEHOLDER AUTH — temporary.
// The authenticated user is read from the "X-User-Id" request header instead
// of a real session. This whole file is the seam that Clerk will replace:
// requireUser will derive userId from the Clerk session, and nothing
// downstream (the permission resolver, the routes) needs to change.
// ---------------------------------------------------------------------------

// Make the attached userId visible to all downstream handlers, no `any`.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/** Role hierarchy, lowest → highest. Higher rank implies all lower abilities. */
export const ROLES = ['viewer', 'editor', 'lead', 'director', 'admin'] as const;
export type Role = (typeof ROLES)[number];

const roleRank: Record<Role, number> = {
  viewer: 0,
  editor: 1,
  lead: 2,
  director: 3,
  admin: 4,
};

function isRole(value: string): value is Role {
  return value in roleRank;
}

/** Rank of a role string stored in the DB; unknown roles rank below everything. */
function rankOf(role: string): number {
  return isRole(role) ? roleRank[role] : -1;
}

/**
 * Express middleware: read userId from the X-User-Id header, 400 if absent,
 * otherwise attach it to the request and continue.
 */
export function requireUser(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('X-User-Id');
  const userId = typeof header === 'string' ? header.trim() : '';
  if (!userId) {
    res.status(400).json({ error: 'Missing X-User-Id header' });
    return;
  }
  req.userId = userId;
  next();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Outcome of a project permission check. */
export type PermissionResult =
  | { ok: true; project: { id: string; name: string }; accountId: string }
  | { ok: false; reason: 'not_found' | 'forbidden' };

/**
 * Authorise `userId` for `projectId` at `minRole` or higher.
 *
 * A grant counts if it sits on the project itself, the programme that owns it,
 * or the account that owns that programme — whichever is highest still wins, so
 * an account-level "director" satisfies a project-level "viewer" requirement.
 *
 * Returns a discriminated result rather than sending a response, so the caller
 * decides how to surface 404 (project missing) vs 403 (insufficient role) and
 * can reuse the resolved project record. `userId` is passed explicitly (it is
 * attached to the request by `requireUser`).
 */
export async function requirePermissionOnProject(
  userId: string,
  projectId: string,
  minRole: Role,
): Promise<PermissionResult> {
  // Reject malformed ids up front: the uuid column would otherwise throw on a
  // syntactically invalid value. Treat it as "no such project".
  if (!UUID_RE.test(projectId)) {
    return { ok: false, reason: 'not_found' };
  }

  // Resolve the project together with its owning programme + account in one go.
  const [scope] = await db
    .select({
      projectId: projects.id,
      projectName: projects.name,
      programmeId: programmes.id,
      accountId: programmes.accountId,
    })
    .from(projects)
    .innerJoin(programmes, eq(programmes.id, projects.programmeId))
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!scope) {
    return { ok: false, reason: 'not_found' };
  }

  // Any grant on the project, its programme, or its account is in scope.
  const grants = await db
    .select({ role: permissions.role })
    .from(permissions)
    .where(
      and(
        eq(permissions.userId, userId),
        or(
          and(eq(permissions.scopeType, 'project'), eq(permissions.scopeId, scope.projectId)),
          and(eq(permissions.scopeType, 'programme'), eq(permissions.scopeId, scope.programmeId)),
          and(eq(permissions.scopeType, 'account'), eq(permissions.scopeId, scope.accountId)),
        ),
      ),
    );

  const required = roleRank[minRole];
  const allowed = grants.some((g) => rankOf(g.role) >= required);
  if (!allowed) {
    return { ok: false, reason: 'forbidden' };
  }

  return {
    ok: true,
    project: { id: scope.projectId, name: scope.projectName },
    accountId: scope.accountId,
  };
}

/**
 * Every project id `userId` can see, derived from their permission rows.
 *
 * A grant's scope widens what it reaches: an `account` grant covers every
 * project under that account, a `programme` grant every project under that
 * programme, a `project` grant just that one. Role/rank is irrelevant here —
 * any grant at all confers visibility (the lowest role, viewer, can read).
 *
 * Returns a deduplicated list of ids that actually exist in the projects table
 * (a stale project-scope grant pointing at a deleted project resolves to
 * nothing). An empty array means "no access", which callers treat as a valid
 * empty result, not an error.
 */
export async function getAccessibleProjectIds(userId: string): Promise<string[]> {
  const grants = await db
    .select({ scopeType: permissions.scopeType, scopeId: permissions.scopeId })
    .from(permissions)
    .where(eq(permissions.userId, userId));

  if (grants.length === 0) return [];

  const accountIds = grants.filter((g) => g.scopeType === 'account').map((g) => g.scopeId);
  const programmeIds = grants.filter((g) => g.scopeType === 'programme').map((g) => g.scopeId);
  const projectIds = grants.filter((g) => g.scopeType === 'project').map((g) => g.scopeId);

  // One OR'd query: a project is visible if its account, its programme, or the
  // project itself is granted. Each clause is only added when it has ids to
  // match, so we never emit an empty `IN ()`.
  const clauses = [
    accountIds.length ? inArray(programmes.accountId, accountIds) : undefined,
    programmeIds.length ? inArray(projects.programmeId, programmeIds) : undefined,
    projectIds.length ? inArray(projects.id, projectIds) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);

  if (clauses.length === 0) return [];

  const rows = await db
    .selectDistinct({ id: projects.id })
    .from(projects)
    .innerJoin(programmes, eq(programmes.id, projects.programmeId))
    .where(or(...clauses));

  return rows.map((r) => r.id);
}
