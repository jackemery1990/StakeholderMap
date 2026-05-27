import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

// Stakeholders live at the ACCOUNT level: one person = one record, shared
// across all projects within the same account.
export const stakeholders = pgTable('stakeholders', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  role: text('role'),
  organisation: text('organisation'),
  email: text('email'),
  notesMd: text('notes_md'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
