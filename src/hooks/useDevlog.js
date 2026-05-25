import { useState, useEffect } from 'react';
import { PROJECTS } from '../config';

// In-memory session cache to avoid re-fetching on navigation/tab switches
const cache = {};

// Filter source files — only code files, skip junk directories
const isSourceFile = (path) => {
  const extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.java', '.cpp', '.c'];
  const skip = [/node_modules\//, /dist\//, /\.git\//, /build\//];
  return extensions.some(ext => path.endsWith(ext)) && !skip.some(re => re.test(path));
};

// Cleans /** blog: ... */ block text — strips leading * and trims empty lines
const parseBlogBlock = (blockText) => {
  const lines = blockText.split('\n').map(line => {
    const trimmed = line.trim();
    return trimmed.startsWith('*') ? trimmed.slice(1).trim() : trimmed;
  });

  let start = 0;
  while (start < lines.length && lines[start] === '') start++;
  let end = lines.length - 1;
  while (end >= start && lines[end] === '') end--;

  return lines.slice(start, end + 1).join('\n');
};

// Extracts all /** blog: ... */ comments from file content
const extractBlogComments = (content) => {
  const regex = /\/\*\*[\s]*blog:([\s\S]*?)\*\//g;
  const entries = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    const parsed = parseBlogBlock(match[1]);
    if (parsed) entries.push(parsed);
  }
  return entries;
};

export const useDevlog = () => {
  const [projectsState, setProjectsState] = useState(() => {
    const initial = {};
    PROJECTS.forEach(p => {
      initial[p.repo] = {
        name: p.name,
        repo: p.repo,
        description: p.description,
        status: 'loading',
        files: {},
        error: null,
      };
    });
    return initial;
  });

  const fetchProject = async (project) => {
    const { repo, name, description } = project;

    // Serve from cache if available
    if (cache[repo]) {
      setProjectsState(prev => ({ ...prev, [repo]: cache[repo] }));
      return;
    }

    try {
      const [owner, repoName] = repo.split('/');

      // Step 1 — get the file tree. Plain fetch, no auth.
      const treeRes = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/git/trees/HEAD?recursive=1`
      );
      if (!treeRes.ok) {
        throw new Error(`GitHub tree request failed (${treeRes.status})`);
      }

      const { tree } = await treeRes.json();
      const sourceFiles = tree.filter(f => f.type === 'blob' && isSourceFile(f.path));

      if (sourceFiles.length === 0) {
        const result = { name, repo, description, status: 'empty', files: {}, error: null };
        cache[repo] = result;
        setProjectsState(prev => ({ ...prev, [repo]: result }));
        return;
      }

      // Step 2 — get file contents from raw.githubusercontent.com. Plain fetch, no auth.
      const results = await Promise.all(
        sourceFiles.map(async (file) => {
          try {
            const res = await fetch(
              `https://raw.githubusercontent.com/${owner}/${repoName}/HEAD/${file.path}`
            );
            if (!res.ok) return null;
            const content = await res.text();
            const entries = extractBlogComments(content);
            return entries.length > 0 ? { path: file.path, entries } : null;
          } catch {
            return null;
          }
        })
      );

      const filesData = {};
      results.forEach(r => { if (r) filesData[r.path] = r.entries; });

      const hasComments = Object.keys(filesData).length > 0;
      const result = {
        name, repo, description,
        status: hasComments ? 'success' : 'empty',
        files: filesData,
        error: null,
      };
      cache[repo] = result;
      setProjectsState(prev => ({ ...prev, [repo]: result }));
    } catch (err) {
      console.error(`Failed to load ${repo}:`, err);
      setProjectsState(prev => ({
        ...prev,
        [repo]: { name, repo, description, status: 'error', files: {}, error: err.message },
      }));
    }
  };

  const refreshProject = (repo) => {
    delete cache[repo];
    const project = PROJECTS.find(p => p.repo === repo);
    if (!project) return;
    setProjectsState(prev => ({
      ...prev,
      [repo]: { ...prev[repo], status: 'loading', error: null, files: {} },
    }));
    fetchProject(project);
  };

  // Fetch all projects on mount
  useEffect(() => {
    PROJECTS.forEach(fetchProject);
  }, []);

  return { projects: projectsState, refreshProject };
};
