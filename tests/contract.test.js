// game.contract.json phải khớp đúng số game đang dùng (src/sim/tuning.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TUNING } from '../src/sim/tuning.js';

test('tuning trong game.contract.json khớp src/sim/tuning.js', () => {
  const contract = JSON.parse(readFileSync('game.contract.json', 'utf8'));
  assert.deepEqual(contract.tuning, TUNING);
});

test('contract có đủ lệnh bắt buộc', () => {
  const c = JSON.parse(readFileSync('game.contract.json', 'utf8'));
  for (const k of ['contract_version', 'team', 'build_cmd', 'run_cmd', 'headless_cmd']) assert.ok(c[k], k);
});
