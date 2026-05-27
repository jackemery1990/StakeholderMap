import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ProjectListPage from './ProjectListPage';
import ProjectGridPage from './ProjectGridPage';

// Thin shell: a minimal top bar (app name → home) plus the route table.
// Page content and data fetching live in the page components.
export default function App() {
  return (
    <BrowserRouter>
      <div style={{ fontFamily: 'system-ui, sans-serif' }}>
        <nav style={{ borderBottom: '1px solid #e5e5e5', padding: '12px 16px' }}>
          <Link
            to="/"
            style={{ fontWeight: 700, fontSize: 18, textDecoration: 'none', color: 'inherit' }}
          >
            Stakeholder Mapper
          </Link>
        </nav>

        <Routes>
          <Route path="/" element={<ProjectListPage />} />
          <Route path="/projects/:id" element={<ProjectGridPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
