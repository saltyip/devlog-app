import { Link } from 'react-router-dom';

export default function Sidebar({ projects, activeRepo }) {
  const projectList = Object.values(projects);

  const getFolderName = (repo) => {
    const parts = repo.split('/');
    return parts.length > 1 ? parts[1] : repo;
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-window-dots">
            <div className="window-dot close" title="Close" />
            <div className="window-dot minimize" title="Minimize" />
            <div className="window-dot maximize" title="Maximize" />
          </div>
          
          <div className="tree-root-path">
            <Link to="/" className="sidebar-home-link">~/projects</Link>
          </div>
        </div>
        
        <ul className="project-list tree-layout">
          {projectList.map((project, index) => {
            const isActive = project.repo === activeRepo;
            const isLast = index === projectList.length - 1;
            const treePrefix = isLast ? '└── ' : '├── ';
            const folderName = getFolderName(project.repo);

            return (
              <li key={project.repo} className="tree-item-wrapper">
                <Link 
                  to={`/project/${folderName}`}
                  className={`project-item-btn tree-btn ${isActive ? 'active' : ''}`}
                  aria-label={`Select project ${project.name}`}
                >
                  <span className="tree-branch">{treePrefix}</span>
                  <span className="tree-folder-icon">📁 </span>
                  <span className="tree-folder-name">{folderName}</span>
                  <span 
                    className={`project-status ${project.status}`} 
                    title={`Status: ${project.status}`} 
                  />
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="sidebar-footer">
          <div>Source comment parser</div>
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="sidebar-footer-link"
          >
            Powered by GitHub API
          </a>
        </div>
      </aside>

      {/* Mobile Navigation Tabs */}
      <nav className="mobile-nav-bar">
        <div className="mobile-nav-header">
          <Link to="/" className="sidebar-logo-link">
            <div className="sidebar-logo">
              <span>&gt;_</span> devlog
            </div>
          </Link>
        </div>
        <div className="mobile-tabs">
          {projectList.map((project) => {
            const isActive = project.repo === activeRepo;
            const folderName = getFolderName(project.repo);
            return (
              <Link
                key={project.repo}
                to={`/project/${folderName}`}
                className={`mobile-tab-btn ${isActive ? 'active' : ''}`}
                aria-label={`Select project ${project.name}`}
              >
                {folderName}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
