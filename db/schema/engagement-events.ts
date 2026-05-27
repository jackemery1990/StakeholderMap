import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { stakeholders } from './stakeholders';
import { projects } from './projects';

// kind: meeting | email | call | commitment | note  (enforced in app code)
// sentimentDelta: -1 | 0 | 1                          (enforced in app code)
export const engagementEvents = pgTable('engagement_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  stakeholderId: uuid('stakeholder_id')
    .notNull()
    .references(() => stakeholders.id, { onDelete: 'cascade' }),
  // Nullable: an event can be account-level (no project). Clear the link if
  // the project is deleted rather than deleting the event.
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  kind: text('kind').notNull(),
  occurredAt: timestamp('occurred_at').notNull(),
  bodyMd: text('body_md').notNull(),
  sentimentDelta: integer('sentiment_delta'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
