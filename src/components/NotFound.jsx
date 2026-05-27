import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="main-content">
      <div className="terminal-path-bar">
        <span className="terminal-user">osleepy@cachyos</span>
        <span className="terminal-colon">:</span>
        <span className="terminal-path">~/devlog/404</span>
      </div>

      <div className="terminal-state-view error-state" style={{ marginTop: '2rem' }}>
        <div className="terminal-state-title">❌ 404 - Command Not Found</div>
        <div className="terminal-divider">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
        <p className="terminal-state-desc">
          The requested path could not be resolved. The file or directory does not exist.
        </p>
        <Link to="/" className="terminal-btn active-state-btn">
          [ return to root ]
        </Link>
      </div>
    </div>
  );
}
