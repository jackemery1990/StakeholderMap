import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from './api';
import StakeholderGrid from './StakeholderGrid';
import StakeholderForm, { type StakeholderFormMode } from './StakeholderForm';
import type { ProjectStakeholdersLatestResponse } from '../../shared';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: ProjectStakeholdersLatestResponse };

const mainStyle: React.CSSProperties = {
  maxWidth: 820,
  margin: '24px auto',
  padding: '0 16px',
  fontFamily: 'system-ui, sans-serif',
};

const backLinkStyle: React.CSSProperties = {
  display: 'inline-block',
  marginBottom: 16,
  color: '#4a4a4a',
  textDecoration: 'none',
};

export default function ProjectGridPage() {
  // The route is /projects/:id, so id is present whenever this renders.
  const { id: projectId } = useParams<{ id: string }>();
  const [state, setState] = useState<State>({ status: 'loading' });
  // null = closed; otherwise the form is open in add or edit mode.
  const [formMode, setFormMode] = useState<StakeholderFormMode | null>(null);

  // Fetch the project's latest snapshot. Reused on mount and after a successful
  // add/edit/delete, so the grid re-renders from fresh server data.
  const load = useCallback(async () => {
    if (!projectId) return;
    setState({ status: 'loading' });
    try {
      const data = await apiFetch<ProjectStakeholdersLatestResponse>(
        `/api/projects/${projectId}/stakeholders/latest`,
      );
      setState({ status: 'ready', data });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState({ status: 'error', message });
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.status === 'loading') {
    return (
      <main style={mainStyle}>
        <p>Loading…</p>
      </main>
    );
  }

  // Covers a 404 for an unknown/inaccessible project id as well as any other
  // load failure: show the message and a way back to the list.
  if (state.status === 'error') {
    return (
      <main style={mainStyle}>
        <Link to="/" style={backLinkStyle}>
          ← Back to projects
        </Link>
        <p>Error: {state.message}</p>
      </main>
    );
  }

  const { project, snapshot, stakeholders } = state.data;

  return (
    <main style={mainStyle}>
      <Link to="/" style={backLinkStyle}>
        ← Back to projects
      </Link>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <h1 style={{ margin: 0 }}>Stakeholders for {project.name}</h1>
        <button type="button" onClick={() => setFormMode({ kind: 'add' })} disabled={formMode !== null}>
          + Add stakeholder
        </button>
      </div>

      {formMode && (
        <StakeholderForm
          // Remount when the target changes so fields re-init from the new mode.
          key={formMode.kind === 'edit' ? `edit-${formMode.stakeholder.id}` : 'add'}
          projectId={project.id}
          mode={formMode}
          onCancel={() => setFormMode(null)}
          onSaved={() => {
            setFormMode(null);
            void load();
          }}
        />
      )}

      {snapshot ? (
        <>
          <p>
            {snapshot.label}, captured {new Date(snapshot.capturedAt).toLocaleString()}
          </p>
          <StakeholderGrid
            stakeholders={stakeholders}
            onSelect={(s) => setFormMode({ kind: 'edit', stakeholder: s })}
          />
        </>
      ) : (
        <p>No snapshots yet.</p>
      )}
    </main>
  );
}
