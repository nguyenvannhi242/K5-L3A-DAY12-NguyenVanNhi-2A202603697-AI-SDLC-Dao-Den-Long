// Định dạng output JSONL theo Test Contract v1.0.
import { TICK_RATE } from './tuning.js';

const r3 = (v) => Math.round(v * 1000) / 1000 + 0; // +0: bỏ -0
const pos3 = (p) => p.map(r3);

export function snapshotLine(s) {
  return {
    type: 'snapshot',
    tick: s.tick,
    sim_tick: s.sim_tick,
    state: s.state,
    time_left_s: r3(s.time_left_ticks / TICK_RATE),
    score: s.score,
    player: { pos: pos3(s.player.pos), flames: s.player.flames, carried: s.player.carried },
    lanterns: s.lanterns.map((l) => ({ id: l.id, pos: pos3(l.pos), lit: l.lit, deposited: l.deposited })),
    shades: s.shades.map((sh) => ({ id: sh.id, pos: pos3(sh.pos), state: sh.state })),
    motes_active: s.motes.length,
    motes: s.motes.map((m) => ({ id: m.id, pos: pos3(m.pos) })),
  };
}

export function eventLine(s, ev) {
  return { type: 'event', tick: s.tick, name: ev.name, data: ev.data };
}

export function endLine(s) {
  return { type: 'end', ticks: s.tick, state: s.state, score: s.score };
}
