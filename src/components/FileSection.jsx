import React from 'react';

// Format inline code wrapped in backticks to code tags for developer aesthetics
const formatTextWithCode = (text) => {
  if (!text) return '';
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

export default function FileSection({ filePath, entries }) {
  return (
    <div className="terminal-file-section">
      <div className="terminal-file-header">
        {filePath}
      </div>
      <div className="terminal-divider">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
      <div className="terminal-file-entries">
        {entries.map((entry, index) => (
          <div className="terminal-entry" key={index}>
            <span className="terminal-bullet">→</span>
            <div className="terminal-entry-text">
              {formatTextWithCode(entry)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
