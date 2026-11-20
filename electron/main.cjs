// Vỏ Electron: mở bản build dist/ trong cửa sổ 1280×720.
// P4 sẽ thêm: --export-leaderboard, chế độ bench.
const { app, BrowserWindow } = require('electron');
const path = require('node:path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    useContentSize: true,
    title: 'Đảo Đèn Lồng',
    backgroundColor: '#0E1430',
  });
  win.removeMenu();
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
