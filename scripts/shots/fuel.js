// Đêm 1: L1 sáng đầy, L5 sắp cạn (fuel 25, mất vùng an toàn, nhấp nháy), L2 đã tắt (xẹp + rách); 1 Bóng Mực đang hút L5.
window.__ddl.startNight(1);
const s = window.__ddl.state;
s.lanterns[0].lit = true; s.lanterns[0].fuel = 90 * 60; s.lanterns[0].ever_lit = true;
s.lanterns[4].lit = true; s.lanterns[4].fuel = 25 * 60; s.lanterns[4].ever_lit = true;
s.lanterns[1].ever_lit = true;
s.player.pos = [-14, 0, 12]; s.player.carried = 7; s.player.successful_lights = 3;
s.shades.push({ id: 'S9', pos: [-22, 1, 7], state: 'drain', target: 'L5', spawn: 0, stun: 0, push: 0, push_dir: [1, 0], recoil: 0, recoil_dir: [1, 0], evict: 0, drain_ticks: 0 });
window.__ddl.setYaw(-70);
