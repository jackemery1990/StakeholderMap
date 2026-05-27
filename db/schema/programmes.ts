import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

export const programmes = pgTable('programmes', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
