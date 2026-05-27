import FileSection from './FileSection';
import { getFolderName } from '../utils';

const LoadingSkeleton = () => (
  <div className="terminal-skeleton">
    <div className="skeleton-line" style={{ width: '45%' }} />
    <div className="skeleton-line" style={{ width: '100%', height: '2px', margin: '0.5rem 0' }} />
    <div className="skeleton-line" style={{ width: '80%' }} />
    <div className="skeleton-line" style={{ width: '60%' }} />
    <div className="skeleton-line" style={{ width: '30%', marginTop: '1rem' }} />
  </div>
);

const ErrorView = ({ error, onRefresh }) => (
  <div className="terminal-state-view error-state">
    <div className="terminal-state-title">⚠️ Connection Failed</div>
    <div className="terminal-divider">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
    <p className="terminal-state-desc">error: {error}</p>
    <button className="terminal-btn active-state-btn" onClick={onRefresh}>
      [ retry connection ]
    </button>
  </div>
);

const EmptyView = ({ onRefresh }) => (
  <div className="terminal-state-view empty-state">
    <div className="terminal-state-title">📁 No Logs Found</div>
    <div className="terminal-divider">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
    <p className="terminal-state-desc">
      Successfully fetched project structure, but found zero active <code>/** blog: ... */</code> comment blocks inside source files.
    </p>
    <button className="terminal-btn active-state-btn" onClick={onRefresh}>
      [ scan again ]
    </button>
  </div>
);

export default function ProjectView({ project, onRefresh }) {
  if (!project) {
    return (
      <div className="terminal-state-view select-state">
        <div className="terminal-state-title">🔍 Select a Project</div>
        <div className="terminal-divider">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
        <p className="terminal-state-desc">Choose a project from the directory tree to inspect its devlogs.</p>
      </div>
    );
  }

  const { repo, description, status, files, error } = project;
  const folderName = getFolderName(repo);

  // Calculate metadata stats
  const filePaths = Object.keys(files || {});
  const totalFiles = filePaths.length;
  const totalEntries = filePaths.reduce((acc, curr) => acc + (files[curr]?.length || 0), 0);

  return (
    <div className="main-content">
      {/* Path Bar Prompt */}
      <div className="terminal-path-bar">
        <span className="terminal-user">osleepy@cachyos</span>
        <span className="terminal-colon">:</span>
        <span className="terminal-path">~/projects/{folderName}</span>
      </div>

      {/* Terminal Header */}
      <header className="terminal-project-header">
        <h1 className="terminal-project-title">{folderName}/</h1>
        <div className="terminal-divider">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
        
        <div className="terminal-project-meta">
          <div className="terminal-meta-line">
            <span className="meta-label">repo: </span>
            <span className="meta-value">{repo}</span>
          </div>
          <div className="terminal-meta-line">
            <span className="meta-label">description: </span>
            <span className="meta-value">{description}</span>
          </div>
          {status === 'success' && (
            <div className="terminal-meta-line">
              <span className="meta-label">stats: </span>
              <span className="meta-value">
                {totalFiles} {totalFiles === 1 ? 'file' : 'files'} parsed · {totalEntries} {totalEntries === 1 ? 'entry' : 'entries'} found
              </span>
            </div>
          )}
        </div>

        <div className="terminal-action-buttons">
          <a 
            href={`https://github.com/${repo}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="terminal-btn"
            aria-label="View repo on GitHub"
          >
            [ github ↗ ]
          </a>
          {status !== 'loading' && (
            <button 
              onClick={onRefresh}
              className="terminal-btn"
              aria-label="Refresh devlog content"
            >
              [ refresh ↻ ]
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area based on Status */}
      {status === 'loading' && <LoadingSkeleton />}
      
      {status === 'error' && <ErrorView error={error} onRefresh={onRefresh} />}
      
      {status === 'empty' && <EmptyView onRefresh={onRefresh} />}
      
      {status === 'success' && (
        <div className="terminal-file-list">
          {filePaths.map((filePath) => (
            <FileSection 
              key={filePath} 
              filePath={filePath} 
              entries={files[filePath]} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
