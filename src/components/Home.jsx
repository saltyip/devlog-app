import React from 'react';
import { Link } from 'react-router-dom';
import { PROJECTS } from '../config';

const getFolderName = (repo) => {
  const parts = repo.split('/');
  return parts.length > 1 ? parts[1] : repo;
};

export default function Home() {
  return (
    <div className="home-layout">
      <div className="home-content">
        {/* Terminal prompt header */}
        <div className="terminal-path-bar">
          <span className="terminal-user">osleepy@cachyos</span>
          <span className="terminal-colon">:</span>
          <span className="terminal-path">~/devlog</span>
        </div>

        {/* Title */}
        <h1 className="home-title">devlog</h1>
        <div className="terminal-divider">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>

        {/* What this is */}
        <section className="home-section">
          <div className="home-section-label">what this is</div>
          <p className="home-body">
            I write <code>/** blog: */</code> comments directly inside my source code. 
            This site reads those repos from GitHub and renders the comments as a devlog — automatically. 
            No CMS, no markdown files, no separate writing workflow.
          </p>
        </section>

        {/* Code snippet showing the format */}
        <section className="home-section">
          <div className="home-section-label">the format</div>
          <div className="home-code-block">
            <div className="code-line">
              <span className="code-comment">{"/** blog:"}</span>
            </div>
            <div className="code-line">
              <span className="code-comment">{" * learned that JWT refresh rotation needs to be atomic —"}</span>
            </div>
            <div className="code-line">
              <span className="code-comment">{" * if you issue a new token but the old one isn't invalidated yet,"}</span>
            </div>
            <div className="code-line">
              <span className="code-comment">{" * there's a replay window. Redis SETNX fixes this."}</span>
            </div>
            <div className="code-line">
              <span className="code-comment">{" */"}</span>
            </div>
          </div>
        </section>

        {/* Why */}
        <section className="home-section">
          <div className="home-section-label">why</div>
          <div className="home-body">
            <p>→ the code is the source of truth</p>
            <p>→ the learning lives where the learning happened</p>
            <p>→ no context-switching to write about what I built</p>
            <p>→ if the comment is next to the implementation, it stays honest</p>
          </div>
        </section>

        <div className="terminal-divider">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>

        {/* Project list */}
        <section className="home-section">
          <div className="home-section-label">projects</div>
          <div className="home-project-list">
            {PROJECTS.map((project) => {
              const folder = getFolderName(project.repo);
              return (
                <Link
                  key={project.repo}
                  to={`/project/${folder}`}
                  className="home-project-card"
                >
                  <div className="home-project-name">
                    <span className="home-project-icon">📁</span>
                    {folder}/
                  </div>
                  <div className="home-project-desc">{project.description}</div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
