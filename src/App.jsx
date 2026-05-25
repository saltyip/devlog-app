
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import './styles/global.css';
import { PROJECTS } from './config';
import { useDevlog } from './hooks/useDevlog';
import Sidebar from './components/Sidebar';
import ProjectView from './components/ProjectView';
import Home from './components/Home';
import DevlogHeader from './components/DevlogHeader';

function AppContent({ projects, refreshProject }) {
  const location = useLocation();

  // Extract repoName from location pathname (e.g. /project/emailqueue -> emailqueue)
  const pathParts = location.pathname.split('/');
  const repoName = pathParts[1] === 'project' ? pathParts[2] : '';

  // Find the repo from the folder name (second part of repo path)
  const activeRepo = PROJECTS.find(p => {
    const parts = p.repo.split('/');
    const folder = parts.length > 1 ? parts[1] : p.repo;
    return folder === repoName;
  })?.repo || '';

  const activeProject = projects[activeRepo];

  return (
    <div className="app-container">
      <Sidebar 
        projects={projects} 
        activeRepo={activeRepo} 
      />
      <main style={{ width: '100%' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route 
            path="/project/:repoName" 
            element={
              <ProjectView 
                project={activeProject} 
                onRefresh={() => refreshProject(activeRepo)} 
              />
            } 
          />
          {/* Fallback to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const { projects, refreshProject } = useDevlog();

  return (
    <BrowserRouter>
      <DevlogHeader />
      <Routes>
        <Route path="/*" element={<AppContent projects={projects} refreshProject={refreshProject} />} />
      </Routes>
    </BrowserRouter>
  );
}
