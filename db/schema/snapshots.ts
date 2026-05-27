import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { phases } from './phases';

export const snapshots = pgTable('snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  // Nullable: a snapshot may outlive the phase it was captured in, so clear
  // the link rather than deleting the historical snapshot.
  phaseId: uuid('phase_id').references(() => phases.id, { onDelete: 'set null' }),
  label: text('label').notNull(),
  capturedAt: timestamp('captured_at').defaultNow().notNull(),
  capturedByUserId: text('captured_by_user_id').notNull(), // Clerk userId
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
