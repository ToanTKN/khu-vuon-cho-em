// Ignore malformed or out-of-date entries in browser storage.
export function readVisited(value: unknown, count: number): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((index): index is number =>
    Number.isInteger(index) && index >= 0 && index < count))];
}
