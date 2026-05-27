// Barrel file for types shared between client and server.
// Export shared types from here as they are added.
export * from './relationships';
export * from './create-stakeholder';
export * from './projects-list';

/** One stakeholder plus its position values within the latest snapshot. */
export interface StakeholderPositionDTO {
  id: string; // stakeholder id
  name: string;
  role: string | null;
  organisation: string | null;
  power: number;
  interest: number;
  relationship: number;
  targetRelationship: number | null;
  targetPower: number | null;
  targetInterest: number | null;
}

/**
 * Response of GET /api/projects/:projectId/stakeholders/latest.
 * `snapshot` is null (and `stakeholders` empty) when the project has no
 * snapshots yet. `capturedAt` is an ISO-8601 string.
 */
export interface ProjectStakeholdersLatestResponse {
  project: { id: string; name: string };
  snapshot: { id: string; label: string; capturedAt: string } | null;
  stakeholders: StakeholderPositionDTO[];
}
