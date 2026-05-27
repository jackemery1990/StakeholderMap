import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from './api';
import type { ProjectListItem, ProjectsListResponse } from '../../shared';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: ProjectsListResponse };

const mainStyle: React.CSSProperties = {
  maxWidth: 820,
  margin: '24px auto',
  padding: '0 16px',
  fontFamily: 'system-ui, sans-serif',
};

const muted = '#6a6a6a';

// "Discovery · 3 stakeholders" — drops the phase when there isn't one, and
// handles the 1-stakeholder singular.
function summaryLine(project: ProjectListItem): string {
  const count = project.stakeholderCount;
  const stakeholders = `${count} stakeholder${count === 1 ? '' : 's'}`;
  return project.currentPhaseName ? `${project.currentPhaseName} · ${stakeholders}` : stakeholders;
}

export default function ProjectListPage() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<ProjectsListResponse>('/api/projects');
        if (!cancelled) setState({ status: 'ready', data });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (!cancelled) setState({ status: 'error', message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'loading') {
    return (
      <main style={mainStyle}>
        <p>Loading…</p>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main style={mainStyle}>
        <p>Error: {state.message}</p>
      </main>
    );
  }

  const { accounts } = state.data;

  return (
    <main style={mainStyle}>
      <h1 style={{ marginTop: 0 }}>Your projects</h1>

      {accounts.length === 0 ? (
        <p style={{ textAlign: 'center', color: muted, marginTop: 48 }}>
          You don't have access to any projects yet.
        </p>
      ) : (
        accounts.map((account) => (
          <section key={account.id} style={{ marginBottom: 28 }}>
            <h2 style={{ marginBottom: 8 }}>{account.name}</h2>
            {account.programmes.map((programme) => (
              <div key={programme.id} style={{ marginBottom: 16 }}>
                <h3 style={{ margin: '0 0 8px', color: muted, fontWeight: 600 }}>{programme.name}</h3>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {programme.projects.map((project) => (
                    <li key={project.id} style={{ marginBottom: 4 }}>
                      <Link
                        to={`/projects/${project.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: 12,
                          padding: '10px 12px',
                          border: '1px solid #e5e5e5',
                          borderRadius: 6,
                          textDecoration: 'none',
                          color: 'inherit',
                        }}
                      >
                        <span>
                          <span style={{ fontWeight: 600 }}>{project.name}</span>
                          <span style={{ display: 'block', fontSize: 13, color: muted, marginTop: 2 }}>
                            {summaryLine(project)}
                          </span>
                        </span>
                        <span aria-hidden style={{ color: muted }}>
                          Open →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))
      )}
    </main>
  );
}
