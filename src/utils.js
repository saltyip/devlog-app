export const getFolderName = (repo) => {
  if (!repo) return '';
  const parts = repo.split('/');
  return parts.length > 1 ? parts[1] : repo;
};
