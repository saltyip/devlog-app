import { useState, useEffect } from 'react';
import { PROJECTS } from '../config';

// Fallback mock data when static devlog-data.json is not found (e.g., local development before build)
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

  const loadDevlogs = async () => {
    try {
      const response = await fetch('/devlog-data.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch devlog data: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setProjectsState(prev => {
        const nextState = { ...prev };
        PROJECTS.forEach(p => {
          if (data[p.repo]) {
            nextState[p.repo] = {
              name: p.name,
              repo: p.repo,
              description: p.description,
              status: data[p.repo].status || 'success',
              files: data[p.repo].files || {},
              error: data[p.repo].error || null,
            };
          } else {
            // Configured project wasn't parsed in the build script
            nextState[p.repo] = {
              name: p.name,
              repo: p.repo,
              description: p.description,
              status: 'empty',
              files: {},
              error: null,
            };
          }
        });
        return nextState;
      });
    } catch (err) {
      console.warn("Could not load /devlog-data.json. Falling back to preview mock data.", err.message);
      
      // Graceful local dev fallback: match index to a mock devlog key
      setProjectsState(prev => {
        const nextState = { ...prev };
        const repoKeys = Object.keys(MOCK_DEVLOGS);
        PROJECTS.forEach((p, index) => {
          const fallbackKey = repoKeys[index % repoKeys.length];
          nextState[p.repo] = {
            name: p.name,
            repo: p.repo,
            description: p.description,
            status: 'success',
            files: MOCK_DEVLOGS[fallbackKey],
            error: null,
          };
        });
        return nextState;
      });
    }
  };

  const refreshProject = async (repo) => {
    // For static devlogs, refreshing triggers a re-fetch of the static JSON file
    setProjectsState(prev => ({
      ...prev,
      [repo]: {
        ...prev[repo],
        status: 'loading',
        error: null,
      }
    }));
    await loadDevlogs();
  };

  useEffect(() => {
    loadDevlogs();
  }, []);

  return {
    projects: projectsState,
    refreshProject,
  };
};
