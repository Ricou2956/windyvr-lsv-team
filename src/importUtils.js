export function selectFilesForImport(fileList, existingCount, maxRoutes = 6) {
  const files = Array.from(fileList || []);
  const remaining = Math.max(0, maxRoutes - Math.max(0, Number(existingCount) || 0));
  return {
    accepted: files.slice(0, remaining),
    ignoredCount: Math.max(0, files.length - remaining),
  };
}

export function buildImportMessage({ warnings = [], errors = [], ignoredCount = 0, maxRoutes = 6 } = {}) {
  const lines = [...warnings, ...errors].filter(Boolean).map(String);
  if (ignoredCount > 0) {
    lines.push(`${ignoredCount} fichier(s) ignoré(s) : limite de ${maxRoutes} routes atteinte.`);
  }
  return lines.join('\n');
}
