// Bật "Bảng màu dễ phân biệt" qua màn Cài đặt rồi vào cảnh giống fuel.js
document.getElementById('btn-settings').click();
const cb = document.getElementById('set-cb'); cb.checked = true; cb.dispatchEvent(new Event('change'));
document.getElementById('btn-settings-back').click();
window.__ddl.startNight(1);
const s = window.__ddl.state;
s.lanterns[4].lit = true; s.lanterns[4].fuel = 25 * 60; s.lanterns[4].ever_lit = true;
s.lanterns[1].ever_lit = true;
s.player.pos = [-17, 0, 12]; s.player.carried = 7; s.time_left_ticks = 25 * 60;
s.shades.push({ id: 'S9', pos: [-21.5, 1, 9], state: 'drain', target: 'L5', spawn: 0, stun: 0, push: 0, push_dir: [1, 0], recoil: 0, recoil_dir: [1, 0], evict: 0, drain_ticks: 0 });
window.__ddl.setYaw(-60);
