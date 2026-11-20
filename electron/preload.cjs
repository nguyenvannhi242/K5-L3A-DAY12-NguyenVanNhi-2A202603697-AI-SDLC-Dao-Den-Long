// Cầu nối an toàn trang game ↔ tiến trình chính: chỉ lộ 2 hàm bảng xếp hạng.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ddl', {
  getLeaderboard: () => ipcRenderer.invoke('lb:get'),
  addEntry: (entry) => ipcRenderer.invoke('lb:add', entry),
});
