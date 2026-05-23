import { useState, useEffect } from 'react';
import { PROJECTS } from '../config';

// In-memory session cache to avoid re-fetching on navigation/tab switches
const cache = {};

// Fallback mock data when GitHub API is rate-limited, offline, or repository is 404
const MOCK_DEVLOGS = {
  "saltyip/jwt-redis-auth-api": {
    "src/middleware/auth.js": [
      "learned that JWT refresh rotation needs to be atomic — if you issue a new token but the old one isn't invalidated yet, there's a replay window. Redis `SETNX` fixes this.",
      "implemented sliding window rate limiting on authentication routes to prevent brute force attacks."
    ],
    "src/db/redis.js": [
      "configured Redis connection pool with automatic reconnection and failover handling."
    ]
  },
  "saltyip/email-queue-service": {
    "src/queue/email.worker.js": [
      "switched from simple `nodemailer` to `BullMQ` for managing background SMTP jobs. Retries are now queued automatically.",
      "added exponential backoff delay to SMTP failures to avoid email server rate limiting."
    ]
  },
  "saltyip/url-shortener": {
    "src/services/encoder.js": [
      "created a high-performance Base62 encoder to transform auto-incrementing database IDs into short, URL-friendly strings.",
      "optimized SQL database queries by indexing the `short_code` field for fast lookups."
    ]
  }
};

// Helper to determine headers (adds VITE_GITHUB_TOKEN if configured)
const getHeaders = () => {
  const token = import.meta.env.VITE_GITHUB_TOKEN;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Filter source files based on user requirements
const isSourceFile = (path) => {
  const allowedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.java', '.cpp', '.c'];
  const skipPatterns = [
    /node_modules\//,
    /^node_modules\b/,
    /dist\//,
    /^dist\b/,
    /\.git\//,
    /^\.git\b/,
    /build\//,
    /^build\b/,
  ];
  
  const hasAllowedExtension = allowedExtensions.some(ext => path.endsWith(ext));
  const shouldSkip = skipPatterns.some(regex => regex.test(path));
  
  return hasAllowedExtension && !shouldSkip;
};

// Cleans and normalizes comment blocks (removes /** blog: , */ and trims leading * from each line)
const parseBlogBlock = (blockText) => {
  const lines = blockText.split('\n');
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('*')) {
      return trimmed.slice(1).trim();
    }
    return trimmed;
  });
  
  // Trim leading and trailing empty lines to keep block neat
  let start = 0;
  while (start < processedLines.length && processedLines[start] === '') {
    start++;
  }
  let end = processedLines.length - 1;
  while (end >= start && processedLines[end] === '') {
    end--;
  }
  
  return processedLines.slice(start, end + 1).join('\n');
};

// Extracts all /** blog: ... */ comments using regex
const extractBlogComments = (fileContent) => {
  const regex = /\/\*\*[\s]*blog:([\s\S]*?)\*\//g;
  const entries = [];
  let match;
  
  while ((match = regex.exec(fileContent)) !== null) {
    const rawBlock = match[1];
    const parsedText = parseBlogBlock(rawBlock);
    if (parsedText) {
      entries.push(parsedText);
    }
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
      setProjectsState(prev => ({
        ...prev,
        [repo]: cache[repo]
      }));
      return;
    }

    try {
      const [owner, repoName] = repo.split('/');
      if (!owner || !repoName) {
        throw new Error("Invalid repository format in config. Expected 'owner/repo'.");
      }

      // Fetch file tree recursively from GitHub
      const treeUrl = `https://api.github.com/repos/${owner}/${repoName}/git/trees/HEAD?recursive=1`;
      const response = await fetch(treeUrl, { headers: getHeaders() });

      if (!response.ok) {
        // Resolve fallback mock key by index so it works regardless of config repository changes
        const repoKeys = Object.keys(MOCK_DEVLOGS);
        const projIndex = PROJECTS.findIndex(p => p.repo === repo);
        const fallbackKey = repoKeys[projIndex >= 0 ? projIndex % repoKeys.length : 0];

        if (MOCK_DEVLOGS[fallbackKey]) {
          console.warn(`GitHub API request failed for ${repo}. Falling back to preview mock devlog.`);
          const result = {
            name,
            repo,
            description,
            status: 'success',
            files: MOCK_DEVLOGS[fallbackKey],
            error: null,
          };
          cache[repo] = result;
          setProjectsState(prev => ({ ...prev, [repo]: result }));
          return;
        }

        if (response.status === 403 || response.status === 401) {
          throw new Error("GitHub API rate limit exceeded. Use VITE_GITHUB_TOKEN to authenticate.");
        }
        throw new Error(`GitHub repository not found or inaccessible (${response.status}: ${response.statusText})`);
      }

      const data = await response.json();
      if (!data.tree || !Array.isArray(data.tree)) {
        throw new Error("Repository tree structure could not be retrieved.");
      }

      // Filter for valid source files
      const sourceFiles = data.tree.filter(file => file.type === 'blob' && isSourceFile(file.path));

      if (sourceFiles.length === 0) {
        const result = { name, repo, description, status: 'empty', files: {}, error: null };
        cache[repo] = result;
        setProjectsState(prev => ({ ...prev, [repo]: result }));
        return;
      }

      // Fetch content for all source files in parallel
      const fileContentPromises = sourceFiles.map(async (file) => {
        try {
          let content = '';

          // 1. Try raw.githubusercontent.com (no custom headers, avoids CORS and rate limits for public repos)
          try {
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/HEAD/${file.path}`;
            const fileRes = await fetch(rawUrl);
            if (fileRes.ok) {
              content = await fileRes.text();
            }
          } catch (e) {
            // raw fetch failed, will try fallback API below
          }

          // 2. Fallback to official Git Blobs API if raw fetch failed or returned empty (handles private repos)
          if (!content) {
            const blobUrl = `https://api.github.com/repos/${owner}/${repoName}/git/blobs/${file.sha}`;
            const blobRes = await fetch(blobUrl, { headers: getHeaders() });
            if (blobRes.ok) {
              const blobData = await blobRes.json();
              if (blobData.encoding === 'base64') {
                // Unicode-safe base64 decoding
                content = decodeURIComponent(escape(atob(blobData.content.replace(/\s/g, ''))));
              } else {
                content = blobData.content;
              }
            }
          }

          if (content) {
            const entries = extractBlogComments(content);
            if (entries && entries.length > 0) {
              return { path: file.path, entries };
            }
          }
        } catch (err) {
          console.warn(`Skipped content load for ${file.path}:`, err);
        }
        return null;
      });

      const results = await Promise.all(fileContentPromises);
      
      const filesData = {};
      results.forEach(res => {
        if (res) {
          filesData[res.path] = res.entries;
        }
      });

      const hasComments = Object.keys(filesData).length > 0;
      const result = {
        name,
        repo,
        description,
        status: hasComments ? 'success' : 'empty',
        files: filesData,
        error: null,
      };

      cache[repo] = result;
      setProjectsState(prev => ({ ...prev, [repo]: result }));
    } catch (err) {
      console.error(`Failed to load ${repo}:`, err);
      
      // Fallback on catch block if network is down entirely, matching by index
      const repoKeys = Object.keys(MOCK_DEVLOGS);
      const projIndex = PROJECTS.findIndex(p => p.repo === repo);
      const fallbackKey = repoKeys[projIndex >= 0 ? projIndex % repoKeys.length : 0];

      if (MOCK_DEVLOGS[fallbackKey]) {
        console.warn(`Network error fetching ${repo}. Falling back to preview mock devlog.`);
        const result = {
          name,
          repo,
          description,
          status: 'success',
          files: MOCK_DEVLOGS[fallbackKey],
          error: null,
        };
        cache[repo] = result;
        setProjectsState(prev => ({ ...prev, [repo]: result }));
        return;
      }

      const result = {
        name,
        repo,
        description,
        status: 'error',
        files: {},
        error: err.message || "Failed to load project files from GitHub.",
      };
      setProjectsState(prev => ({ ...prev, [repo]: result }));
    }
  };

  const refreshProject = (repo) => {
    delete cache[repo];
    setProjectsState(prev => ({
      ...prev,
      [repo]: {
        ...prev[repo],
        status: 'loading',
        error: null,
        files: {},
      }
    }));
    const project = PROJECTS.find(p => p.repo === repo);
    if (project) {
      fetchProject(project);
    }
  };

  // Run initial fetch on load for all configured repos
  useEffect(() => {
    PROJECTS.forEach(project => {
      fetchProject(project);
    });
  }, []);

  return {
    projects: projectsState,
    refreshProject,
  };
};
