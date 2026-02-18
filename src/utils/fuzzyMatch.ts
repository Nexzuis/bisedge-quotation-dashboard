const BUSINESS_SUFFIXES = /\b(pty|ltd|inc|cc|llc|co|corp|company|group)\b|\(pty\)|\(ltd\)/gi;

export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(BUSINESS_SUFFIXES, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}

export function isSimilarCompanyName(input: string, existing: string): boolean {
  const a = normalizeCompanyName(input);
  const b = normalizeCompanyName(existing);

  if (!a || !b) return false;

  // Exact match after normalization
  if (a === b) return true;

  // For very short names, require exact match to avoid false positives
  if (a.length < 4 || b.length < 4) return false;

  // One contains the other (handles "Ghosthome" vs "Ghosthome Solutions")
  if (a.includes(b) || b.includes(a)) return true;

  // Levenshtein distance with 75% similarity threshold
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  const similarity = 1 - dist / maxLen;

  return similarity >= 0.75;
}
