/** Word-level diff used to highlight admin edits inside a video script. */
export type DiffPart = { text: string; added: boolean };

function tokenize(s: string): string[] {
  // Keep whitespace as its own tokens so we can rebuild the text exactly.
  return s.match(/\s+|[^\s]+/g) ?? [];
}

/**
 * Returns the parts of `next` marked as added when they are not present in
 * `prev` (classic LCS word diff, removals are ignored).
 */
export function diffWords(prev: string, next: string): DiffPart[] {
  const a = tokenize(prev);
  const b = tokenize(next);
  const n = a.length;
  const m = b.length;

  // Guard against pathological sizes.
  if (n * m > 4_000_000) return [{ text: next, added: prev !== next }];

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const parts: DiffPart[] = [];
  const push = (text: string, added: boolean) => {
    const last = parts[parts.length - 1];
    if (last && last.added === added) last.text += text;
    else parts.push({ text, added });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push(b[j], false);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      push(b[j], true);
      j++;
    }
  }
  while (j < m) {
    push(b[j], true);
    j++;
  }
  return parts;
}
