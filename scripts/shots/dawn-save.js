window.__ddl.setWon({ 1: 640, 2: 702 });
window.__ddl.startNight(3);
const s = window.__ddl.state; s.lanterns.slice(0, 5).forEach((l) => { l.lit = true; l.fuel = 80 * 60; l.ever_lit = true; }); s.time_left_ticks = 2;
setTimeout(() => { document.querySelector('#dawn-save input').value = 'Ong_Dang'; document.querySelector('#dawn-save .btn-save').click(); }, 1500);
