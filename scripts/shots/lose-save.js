// Thua Đêm 2 (đã thắng Đêm 1) → ô lưu điểm; nhập tên rồi lưu → bảng xếp hạng.
window.__ddl.setWon({ 1: 640 });
window.__ddl.startNight(2);
const s = window.__ddl.state; s.time_left_ticks = 2;
setTimeout(() => {
  const input = document.querySelector('#res-save input');
  input.value = 'Mây_đẹp';
  document.querySelector('#res-save .btn-save').click();
}, 1600);
