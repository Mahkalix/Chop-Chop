import {spawnSync} from 'node:child_process';

function runNode(args) {
  const result = spawnSync(process.execPath, args, {stdio: 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.env.VERCEL_ENV === 'production' && process.env.CHOP_REPO_TOKEN) {
  // A failed sync must not replace the deployed site with an older snapshot.
  runNode(['scripts/sync-project.mjs']);
}
runNode([process.env.npm_execpath, 'run', 'build']);
