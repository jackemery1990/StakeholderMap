import { pgTable, uuid, text, timestamp, unique } from 'drizzle-orm/pg-core';

// scopeType: account | programme | project        (enforced in app code)
// role:      viewer | editor | lead | director | admin
// scopeId points at an id in accounts/programmes/projects — NO FK constraint,
// enforced in application code.
export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(), // Clerk userId
    scopeType: text('scope_type').notNull(),
    scopeId: uuid('scope_id').notNull(),
    role: text('role').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [unique('uq_permission_user_scope').on(t.userId, t.scopeType, t.scopeId)],
);
