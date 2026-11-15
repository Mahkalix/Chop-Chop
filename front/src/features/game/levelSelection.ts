import type { ServiceLevel } from '@chopchop/shared';

export function readSelectedLevel(): ServiceLevel {
  try { const level = Number(sessionStorage.getItem('level')); return level === 2 || level === 3 ? level : 1; }
  catch { return 1; }
}
