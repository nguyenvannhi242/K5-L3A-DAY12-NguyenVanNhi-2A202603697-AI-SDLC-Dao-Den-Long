#!/usr/bin/env node
// Headless runner theo Test Contract v1.1.
// <cmd> --seed <int> --night <1|2|3> [--scenario f] [--inputs f] --ticks <int> --out <f.jsonl> [--snapshot-every <int>]
import { readFileSync, writeFileSync } from 'node:fs';
import { createGame } from '../src/sim/game.js';
import { snapshotLine, eventLine, endLine } from '../src/sim/output.js';
import { FormatError } from '../src/sim/errors.js';
import { parseInputs, createInputTimeline } from './inputs.js';

class UsageError extends Error {}

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) throw new UsageError(`tham số lạ: ${k}`);
    const v = argv[i + 1];
    if (v === undefined || /^--[a-z]/.test(v)) throw new UsageError(`thiếu giá trị cho ${k}`);
    a[k.slice(2)] = v;
    i++;
  }
  const int = (name, def) => {
    if (a[name] === undefined) {
      if (def === undefined) throw new UsageError(`thiếu --${name}`);
      return def;
    }
    if (!/^-?\d+$/.test(a[name])) throw new UsageError(`--${name} phải là số nguyên`);
    return Number(a[name]);
  };
  const opts = {
    seed: int('seed'),
    night: int('night', 1),
    ticks: int('ticks'),
    snapshotEvery: int('snapshot-every', 10),
    out: a.out,
    scenario: a.scenario,
    inputs: a.inputs,
  };
  if (!opts.out) throw new UsageError('thiếu --out');
  if (![1, 2, 3].includes(opts.night)) throw new UsageError('--night nhận 1, 2, 3');
  if (opts.ticks < 0) throw new UsageError('--ticks phải ≥ 0');
  if (opts.snapshotEvery < 1) throw new UsageError('--snapshot-every phải ≥ 1');
  return opts;
}

function readJson(path, label) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    throw new UsageError(`không đọc được file ${label}: ${path}`);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new FormatError(`${label}: JSON sai định dạng (${e.message})`);
  }
}

export function run(argv) {
  const opts = parseArgs(argv);
  const scenario = opts.scenario ? readJson(opts.scenario, 'scenario') : null;
  const frames = opts.inputs ? parseInputs(readJson(opts.inputs, 'inputs')) : [];
  const inputAt = createInputTimeline(frames);
  const game = createGame({ seed: opts.seed, night: opts.night, scenario });
  const s = game.state;

  const lines = [];
  const emit = (o) => lines.push(JSON.stringify(o));
  emit(snapshotLine(s));
  game.start(); // night_start {night} ở tick 0 (giả định B1)
  for (const ev of game.events.splice(0)) emit(eventLine(s, ev));
  for (let k = 0; k < opts.ticks && s.state === 'playing'; k++) {
    game.step(inputAt(k));
    for (const ev of game.events.splice(0)) emit(eventLine(s, ev));
    if (s.tick % opts.snapshotEvery === 0) emit(snapshotLine(s));
  }
  emit(endLine(s));
  writeFileSync(opts.out, lines.join('\n') + '\n');
}

try {
  run(process.argv.slice(2));
  process.exit(0);
} catch (e) {
  process.stderr.write(`headless: ${e.message}\n`);
  process.exit(e instanceof FormatError ? 2 : 1);
}
