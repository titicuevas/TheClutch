/** Siguiente carta en Free. Daily no debe llamar esto (D-02). */
export function nextRerollSeed(current: string): string {
  const match = current.match(/^(.*):r(\d+)$/);
  if (match) return `${match[1]}:r${Number(match[2]) + 1}`;
  return `${current}:r1`;
}

export function generateRunSeed(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `run-${Date.now().toString(36)}-${rand}`;
}

