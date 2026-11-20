// Định dạng output JSONL theo Test Contract v1.1.
import { TICK_RATE } from './tuning.js';

const r3 = (v) => Math.round(v * 1000) / 1000 + 0; // +0: bỏ -0
const pos3 = (p) => p.map(r3);
const sec = (ticks) => r3(ticks / TICK_RATE);

export function snapshotLine(s) {
  const p = s.player;
  return {
    type: 'snapshot',
    tick: s.tick,
    sim_tick: s.sim_tick,
    state: s.state === 'playing' && s.paused ? 'paused' : s.state,
    night: s.night,
    time_left_s: sec(s.time_left_ticks),
    score: s.score,
    wind: { active: s.wind.active > 0, dir_deg: r3(s.wind.dir_deg) },
    player: {
      pos: pos3(p.pos),
      vel: pos3(p.vel),
      grounded: p.grounded,
      invuln: p.invuln > 0,
      dash_cd_s: sec(p.dash_cd),
      pulse_cd_s: sec(p.pulse_cd),
      charm_s: sec(p.charm),
      flames: p.flames,
      carried: p.carried,
    },
    lanterns: s.lanterns.map((l) => ({ id: l.id, pos: pos3(l.pos), lit: l.lit, deposited: l.deposited })),
    shades: s.shades.map((sh) => ({ id: sh.id, pos: pos3(sh.pos), state: sh.state })),
    motes_active: s.motes.length,
    motes: s.motes.map((m) => ({ id: m.id, pos: pos3(m.pos), kind: m.kind, ttl_s: m.ttl == null ? null : sec(m.ttl) })),
    drifters: s.drifters.map((d) => ({ id: d.id, pos: pos3(d.pos), state: d.state, stolen: d.stolen })),
    charms: s.charms.map((c) => ({ id: c.id, available: c.available, respawn_s: sec(c.available ? 0 : c.respawn) })),
  };
}

export function eventLine(s, ev) {
  return { type: 'event', tick: s.tick, name: ev.name, data: ev.data };
}

export function endLine(s) {
  return { type: 'end', ticks: s.tick, state: s.state, score: s.score };
}
