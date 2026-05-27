import { pgTable, uuid, integer, timestamp, check, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { stakeholders } from './stakeholders';
import { projects } from './projects';
import { snapshots } from './snapshots';

// One row per stakeholder × project × snapshot.
// CHECK ranges: power/interest 1..10, relationship 1..5. Nullable target_*
// columns pass their CHECK when NULL (standard SQL semantics).
export const stakeholderPositions = pgTable(
  'stakeholder_positions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stakeholderId: uuid('stakeholder_id')
      .notNull()
      .references(() => stakeholders.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    snapshotId: uuid('snapshot_id')
      .notNull()
      .references(() => snapshots.id, { onDelete: 'cascade' }),
    power: integer('power').notNull(),
    interest: integer('interest').notNull(),
    relationship: integer('relationship').notNull(),
    targetRelationship: integer('target_relationship'),
    targetPower: integer('target_power'),
    targetInterest: integer('target_interest'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    check('power_range', sql`${t.power} between 1 and 10`),
    check('interest_range', sql`${t.interest} between 1 and 10`),
    check('relationship_range', sql`${t.relationship} between 1 and 5`),
    check('target_relationship_range', sql`${t.targetRelationship} between 1 and 5`),
    check('target_power_range', sql`${t.targetPower} between 1 and 10`),
    check('target_interest_range', sql`${t.targetInterest} between 1 and 10`),
    unique('uq_position_stakeholder_project_snapshot').on(
      t.stakeholderId,
      t.projectId,
      t.snapshotId,
    ),
  ],
);
