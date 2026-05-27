import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from './api';
import StakeholderGrid from './StakeholderGrid';
import AddStakeholderForm, { type StakeholderFormMode } from './AddStakeholderForm';
import type { ProjectStakeholdersLatestResponse } from '../../shared';

// TODO: replace with router param when projects list lands.
const PROJECT_ID = '84c7a145-4e91-4ec6-acea-ca529aeb4fb1';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: ProjectStakeholdersLatestResponse };

export default function App() {
  const [state, setState] = useState<State>({ status: 'loading' });
  // null = closed; otherwise the form is open in add or edit mode.
  const [formMode, setFormMode] = useState<StakeholderFormMode | null>(null);

  // Fetch the project's latest snapshot. Reused on mount and after a successful
  // add, so the grid re-renders from fresh server data.
  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const data = await apiFetch<ProjectStakeholdersLatestResponse>(
        `/api/projects/${PROJECT_ID}/stakeholders/latest`,
      );
      setState({ status: 'ready', data });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState({ status: 'error', message });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.status === 'loading') {
    return <p>Loading…</p>;
  }

  if (state.status === 'error') {
    return <p>Error: {state.message}</p>;
  }

  const { project, snapshot, stakeholders } = state.data;

  return (
    <main
      style={{
        maxWidth: 820,
        margin: '24px auto',
        padding: '0 16px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
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
        <AddStakeholderForm
          // Remount when the target changes so fields re-init from the new mode.
          key={formMode.kind === 'edit' ? `edit-${formMode.stakeholder.id}` : 'add'}
          projectId={PROJECT_ID}
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
