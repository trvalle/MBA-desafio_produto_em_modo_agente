import { spawnSync } from 'node:child_process';
const action = process.argv[2];
const run = (...args) => {
  const r = spawnSync('docker', ['compose', ...args], { stdio: 'inherit', env: process.env });
  if (r.error) console.error(r.error.message);
  if (r.status !== 0) process.exit(r.status || 1);
};
if (action === 'up') run('up', '--build', '--detach', '--wait');
else if (action === 'down') run('down', '--remove-orphans');
else if (action === 'gates') {
  run('build');
  run('run', '--rm', '--no-deps', '-e', 'DB_PATH=:memory:', 'app', 'npm', 'test');
} else { console.error('Use up, down ou gates'); process.exit(1); }
