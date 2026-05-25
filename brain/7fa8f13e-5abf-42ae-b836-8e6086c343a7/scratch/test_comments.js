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

const isSourceFile = (path) => {
  const hasAllowedExtension = allowedExtensions.some(ext => path.endsWith(ext));
  const shouldSkip = skipPatterns.some(regex => regex.test(path));
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

async function testRepo(repo) {
  const [owner, repoName] = repo.split('/');
  const treeUrl = `https://api.github.com/repos/${owner}/${repoName}/git/trees/HEAD?recursive=1`;
  const headers = { 'Accept': 'application/vnd.github.v3+json' };
  
  try {
    const res = await fetch(treeUrl, { headers });
    if (!res.ok) {
      console.log(`Failed to fetch tree for ${repo}: ${res.status}`);
      return;
    }
    const data = await res.json();
    const sourceFiles = data.tree.filter(file => file.type === 'blob' && isSourceFile(file.path));
    console.log(`Repo: ${repo} -> ${sourceFiles.length} source files found.`);
    
    // Fetch first 5 source files to inspect
    for (const file of sourceFiles.slice(0, 10)) {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/HEAD/${file.path}`;
      const fileRes = await fetch(rawUrl);
      if (fileRes.ok) {
        const content = await fileRes.text();
        const comments = extractBlogComments(content);
        if (comments.length > 0) {
          console.log(`  Found comments in ${file.path}:`, comments);
        }
      } else {
        console.log(`  Failed to fetch raw file: ${file.path} (${fileRes.status})`);
      }
    }
  } catch (err) {
    console.error(`Error for ${repo}:`, err);
  }
}

async function run() {
  await testRepo("saltyip/jwt-redis-auth-api");
  await testRepo("saltyip/emailqueue");
  await testRepo("saltyip/urlshortnercongential");
}

run();
