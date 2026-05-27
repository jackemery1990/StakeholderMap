import { useEffect, useState } from 'react';
import { apiFetch } from './api';
import StakeholderGrid from './StakeholderGrid';
import type { ProjectStakeholdersLatestResponse } from '../../shared';

// TODO: replace with router param when projects list lands.
const PROJECT_ID = '84c7a145-4e91-4ec6-acea-ca529aeb4fb1';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: ProjectStakeholdersLatestResponse };

export default function App() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    apiFetch<ProjectStakeholdersLatestResponse>(
      `/api/projects/${PROJECT_ID}/stakeholders/latest`,
    )
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Unknown error';
        setState({ status: 'error', message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
      <h1>Stakeholders for {project.name}</h1>
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
