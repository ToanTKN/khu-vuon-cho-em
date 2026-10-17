// Relative public assets also work under /repository-name/ on GitHub Pages.
export function assetUrl(path: string): string {
  if (!path || /^(https?:|data:|blob:)/i.test(path)) return path;
  return import.meta.env.BASE_URL + path.replace(/^\.?\//, '');
}
