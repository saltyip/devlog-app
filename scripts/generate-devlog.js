import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PROJECTS } from '../src/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(__dirname, '../public/devlog-data.json');

// No tokens, no secrets. All repos are public.
// File content is fetched via raw.githubusercontent.com (CDN, no rate limits).
// Tree listing uses the unauthenticated GitHub API (60 req/hr — plenty for a few projects).

const HEADERS = {
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'devlog-builder'
};

const isSourceFile = (filePath) => {
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
  
  const hasAllowedExtension = allowedExtensions.some(ext => filePath.endsWith(ext));
  const shouldSkip = skipPatterns.some(regex => regex.test(filePath));
  
  return hasAllowedExtension && !shouldSkip;
};

const parseBlogBlock = (blockText) => {
  const lines = blockText.split('\n');
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('*')) {
      return trimmed.slice(1).trim();
    }
    return trimmed;
  });
  
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

const fetchProject = async (project) => {
  const { repo, name, description } = project;
  console.log(`\nFetching ${repo}...`);

  try {
    const [owner, repoName] = repo.split('/');
    if (!owner || !repoName) {
      throw new Error(`Invalid repository format in config: ${repo}`);
    }

    // 1. Get the file tree (unauthenticated, 60 req/hr)
    const treeUrl = `https://api.github.com/repos/${owner}/${repoName}/git/trees/HEAD?recursive=1`;
    const response = await fetch(treeUrl, { headers: HEADERS });

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}: ${response.statusText || 'Unknown'}`);
    }

    const data = await response.json();
    if (!data.tree || !Array.isArray(data.tree)) {
      throw new Error("Repository tree structure could not be retrieved.");
    }

    const sourceFiles = data.tree.filter(file => file.type === 'blob' && isSourceFile(file.path));

    if (sourceFiles.length === 0) {
      console.log(`No source files found in ${repo}.`);
      return { name, repo, description, status: 'empty', files: {}, error: null };
    }

    console.log(`Found ${sourceFiles.length} candidate source files. Parsing...`);
    const filesData = {};

    // 2. Fetch each file via raw.githubusercontent.com (CDN — no rate limits, no auth)
    const fileContentPromises = sourceFiles.map(async (file) => {
      try {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/HEAD/${file.path}`;
        const fileRes = await fetch(rawUrl);

        if (!fileRes.ok) {
          console.warn(`  Could not fetch ${file.path} (${fileRes.status})`);
          return null;
        }

        const content = await fileRes.text();
        if (content) {
          const entries = extractBlogComments(content);
          if (entries && entries.length > 0) {
            return { path: file.path, entries };
          }
        }
      } catch (err) {
        console.warn(`  Failed to load ${file.path}:`, err.message);
      }
      return null;
    });

    const results = await Promise.all(fileContentPromises);
    results.forEach(res => {
      if (res) {
        filesData[res.path] = res.entries;
      }
    });

    const hasComments = Object.keys(filesData).length > 0;
    console.log(`  Finished parsing ${repo}. Found comments in ${Object.keys(filesData).length} files.`);

    return {
      name,
      repo,
      description,
      status: hasComments ? 'success' : 'empty',
      files: filesData,
      error: null,
    };
  } catch (err) {
    console.error(`Error processing ${repo}:`, err.message);
    return {
      name,
      repo,
      description,
      status: 'error',
      files: {},
      error: err.message,
    };
  }
};

const main = async () => {
  console.log("Starting build-time devlog generation...");
  console.log(`Processing ${PROJECTS.length} public repositories.\n`);

  const results = {};
  for (const project of PROJECTS) {
    results[project.repo] = await fetchProject(project);
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write to public/devlog-data.json
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n🎉 Success! Written devlog data to: ${outputPath}`);
};

main().catch(err => {
  console.error("Fatal error during devlog generation:", err);
  process.exit(1);
});
