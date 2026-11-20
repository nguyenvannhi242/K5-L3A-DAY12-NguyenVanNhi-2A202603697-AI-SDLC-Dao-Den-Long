#!/usr/bin/env node
// Hook harness:
//  - PostToolUse (Edit/Write): file code/test vừa sửa → chạy `npm test`; đỏ thì báo lại agent (exit 2).
//  - Stop: test đỏ thì chặn agent kết thúc (exit 2), trừ khi đã chặn một lần (tránh vòng lặp).
import { spawnSync } from 'node:child_process';

let input = {};
try {
  input = JSON.parse(await new Promise((res) => {
    let d = '';
    process.stdin.on('data', (c) => (d += c));
    process.stdin.on('end', () => res(d || '{}'));
  }));
} catch {}

const event = input.hook_event_name;
if (event === 'PostToolUse') {
  const file = String(input.tool_input?.file_path ?? '').replace(/\\/g, '/');
  if (!/\/(src|headless|tests|electron)\/|game\.contract\.json$/.test(file)) process.exit(0);
}
if (event === 'Stop' && input.stop_hook_active) process.exit(0);

const r = spawnSync('npm', ['test', '--silent'], { encoding: 'utf8', shell: true, cwd: input.cwd || process.cwd() });
if (r.status === 0) process.exit(0);
const tail = (r.stdout + r.stderr).split('\n').slice(-40).join('\n');
process.stderr.write(`npm test ĐỎ — sửa trước khi tiếp tục/kết thúc:\n${tail}\n`);
process.exit(2);
