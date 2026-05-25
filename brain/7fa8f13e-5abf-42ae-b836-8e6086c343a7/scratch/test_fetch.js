async function testRepo(repo) {
  const [owner, repoName] = repo.split('/');
  const treeUrl = `https://api.github.com/repos/${owner}/${repoName}/git/trees/HEAD?recursive=1`;
  const headers = { 'Accept': 'application/vnd.github.v3+json' };
  try {
    const res = await fetch(treeUrl, { headers });
    console.log(`Repo: ${repo} -> Status: ${res.status}`);
    const data = await res.json();
    if (res.ok) {
      console.log(`  Tree length: ${data.tree?.length}`);
    } else {
      console.log(`  Error Message: ${data.message}`);
    }
  } catch (err) {
    console.error(`  Fetch Error for ${repo}:`, err);
  }
}

async function run() {
  await testRepo("saltyip/jwt-redis-auth-api");
  await testRepo("saltyip/emailqueue");
  await testRepo("saltyip/urlshortnercongential");
}

run();
