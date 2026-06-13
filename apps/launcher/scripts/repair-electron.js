const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..', '..');
const electronDir = path.join(rootDir, 'node_modules', 'electron');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

fs.rmSync(electronDir, { recursive: true, force: true });

const result = spawnSync(
  npmCommand,
  ['install', '--workspace', 'apps/launcher', '--include=dev', '--foreground-scripts'],
  {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      ELECTRON_MIRROR: 'https://github.com/electron/electron/releases/download/',
    },
  },
);

process.exit(result.status ?? 1);
