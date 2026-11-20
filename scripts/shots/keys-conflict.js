// Cài đặt → đổi phím Lướt thành E (trùng Tương tác) để thấy cảnh báo trùng phím.
document.getElementById('btn-settings').click();
const btns = document.querySelectorAll('#keys button');
btns[5].click();
dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
