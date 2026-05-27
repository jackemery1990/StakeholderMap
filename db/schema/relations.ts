import { relations } from 'drizzle-orm';
import { accounts } from './accounts';
import { programmes } from './programmes';
import { projects } from './projects';
import { phases } from './phases';
import { stakeholders } from './stakeholders';
import { snapshots } from './snapshots';
import { stakeholderPositions } from './stakeholder-positions';
import { engagementEvents } from './engagement-events';
import { actions } from './actions';

export const accountsRelations = relations(accounts, ({ many }) => ({
  programmes: many(programmes),
  stakeholders: many(stakeholders),
}));

export const programmesRelations = relations(programmes, ({ one, many }) => ({
  account: one(accounts, { fields: [programmes.accountId], references: [accounts.id] }),
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  programme: one(programmes, { fields: [projects.programmeId], references: [programmes.id] }),
  phases: many(phases),
  snapshots: many(snapshots),
  positions: many(stakeholderPositions),
  engagementEvents: many(engagementEvents),
  actions: many(actions),
}));

export const phasesRelations = relations(phases, ({ one, many }) => ({
  project: one(projects, { fields: [phases.projectId], references: [projects.id] }),
  snapshots: many(snapshots),
}));

export const stakeholdersRelations = relations(stakeholders, ({ one, many }) => ({
  account: one(accounts, { fields: [stakeholders.accountId], references: [accounts.id] }),
  positions: many(stakeholderPositions),
  engagementEvents: many(engagementEvents),
  actions: many(actions),
}));

export const snapshotsRelations = relations(snapshots, ({ one, many }) => ({
  project: one(projects, { fields: [snapshots.projectId], references: [projects.id] }),
  phase: one(phases, { fields: [snapshots.phaseId], references: [phases.id] }),
  positions: many(stakeholderPositions),
}));

export const stakeholderPositionsRelations = relations(stakeholderPositions, ({ one }) => ({
  stakeholder: one(stakeholders, {
    fields: [stakeholderPositions.stakeholderId],
    references: [stakeholders.id],
  }),
  project: one(projects, {
    fields: [stakeholderPositions.projectId],
    references: [projects.id],
  }),
  snapshot: one(snapshots, {
    fields: [stakeholderPositions.snapshotId],
    references: [snapshots.id],
  }),
}));

export const engagementEventsRelations = relations(engagementEvents, ({ one }) => ({
  stakeholder: one(stakeholders, {
    fields: [engagementEvents.stakeholderId],
    references: [stakeholders.id],
  }),
  project: one(projects, {
    fields: [engagementEvents.projectId],
    references: [projects.id],
  }),
}));

export const actionsRelations = relations(actions, ({ one }) => ({
  stakeholder: one(stakeholders, {
    fields: [actions.stakeholderId],
    references: [stakeholders.id],
  }),
  project: one(projects, { fields: [actions.projectId], references: [projects.id] }),
}));
