import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from './api';
import StakeholderGrid from './StakeholderGrid';
import AddStakeholderForm from './AddStakeholderForm';
import type { ProjectStakeholdersLatestResponse } from '../../shared';

// TODO: replace with router param when projects list lands.
const PROJECT_ID = '84c7a145-4e91-4ec6-acea-ca529aeb4fb1';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: ProjectStakeholdersLatestResponse };

export default function App() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [showForm, setShowForm] = useState(false);

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
        <button type="button" onClick={() => setShowForm(true)} disabled={showForm}>
          + Add stakeholder
        </button>
      </div>

      {showForm && (
        <AddStakeholderForm
          projectId={PROJECT_ID}
          onCancel={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            void load();
          }}
        />
      )}

      {snapshot ? (
        <>
          <p>
            {snapshot.label}, captured {new Date(snapshot.capturedAt).toLocaleString()}
          </p>
          <StakeholderGrid stakeholders={stakeholders} />
        </>
      ) : (
        <p>No snapshots yet.</p>
      )}
    </main>
  );
}
