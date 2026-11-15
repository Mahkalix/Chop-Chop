import type { ServiceLevel } from '@chopchop/shared';

export function readSelectedLevel(): ServiceLevel {
  try { return sessionStorage.getItem('level') === '2' ? 2 : 1; }
  catch { return 1; }
}
