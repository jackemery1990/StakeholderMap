import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { programmes } from './programmes';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  programmeId: uuid('programme_id')
    .notNull()
    .references(() => programmes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  // Stores a phases.id but intentionally has NO FK constraint: the phase is
  // created after the project, so this is a plain nullable id.
  currentPhaseId: uuid('current_phase_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
