// Bật Chữ lớn + Giảm chuyển động qua màn Cài đặt, vào Đêm 1 và chờ Bóng Mực xuất hiện (tick 300) để thấy phụ đề + mũi tên tím.
document.getElementById('btn-settings').click();
for (const id of ['set-large', 'set-reduced']) { const c = document.getElementById(id); c.checked = true; c.dispatchEvent(new Event('change')); }
document.getElementById('btn-settings-back').click();
window.__ddl.startNight(1);
window.__ddl.setYaw(180);
