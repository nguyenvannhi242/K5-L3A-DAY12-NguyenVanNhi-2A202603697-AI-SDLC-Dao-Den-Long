#!/usr/bin/env node
// run_cmd / bench_cmd của contract: đảm bảo có binary Electron và bản build dist/, rồi chạy Electron
// với nguyên các tham số (vd. --export-leaderboard out.json, --bench --seed 42 --duration 30 --out bench.json).
const { spawn, spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const ensure = spawnSync(process.execPath, [path.join(__dirname, 'ensure-electron.cjs')], { stdio: 'inherit' });
if (ensure.status !== 0) process.exit(ensure.status ?? 1);

if (!existsSync(path.join(root, 'dist', 'index.html'))) {
  const b = spawnSync(process.execPath, [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'build'], { cwd: root, stdio: 'inherit' });
  if (b.status !== 0) process.exit(b.status ?? 1);
}

const electron = require(path.join(root, 'node_modules', 'electron'));
const child = spawn(electron, [root, ...process.argv.slice(2)], { stdio: 'inherit', cwd: process.cwd() });
child.on('exit', (code) => process.exit(code ?? 1));
