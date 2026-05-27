// Types for GET /api/projects — the projects a user can access, grouped
// account → programme → project. Shared by the server route and the client's
// ProjectListPage.

/** A single project the user can open, with summary stats for the list view. */
export interface ProjectListItem {
  id: string;
  name: string;
  currentPhaseName: string | null;
  // Distinct stakeholders with a position in this project's latest snapshot.
  stakeholderCount: number;
}

export interface ProjectListProgramme {
  id: string;
  name: string;
  projects: ProjectListItem[];
}

export interface ProjectListAccount {
  id: string;
  name: string;
  programmes: ProjectListProgramme[];
}

/**
 * Response of GET /api/projects. `accounts` is empty (not an error) when the
 * user has no permissions. Sorted: accounts by name, programmes by name within
 * an account, projects by name within a programme.
 */
export interface ProjectsListResponse {
  accounts: ProjectListAccount[];
}
