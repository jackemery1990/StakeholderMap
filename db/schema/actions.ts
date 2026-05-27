import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { stakeholders } from './stakeholders';
import { projects } from './projects';

// status: todo | doing | done | blocked  (enforced in app code)
// source: native | email | api           (enforced in app code)
export const actions = pgTable('actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  stakeholderId: uuid('stakeholder_id')
    .notNull()
    .references(() => stakeholders.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  assigneeUserId: text('assignee_user_id').notNull(), // Clerk userId
  title: text('title').notNull(),
  dueAt: timestamp('due_at'),
  status: text('status').notNull(),
  source: text('source').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
