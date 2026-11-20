// Chạy trước `npm start`: nếu binary Electron chưa được tải (npm bỏ qua postinstall,
// ví dụ npm 11 allowScripts / --ignore-scripts) thì chạy script cài đặt của chính gói electron.
const { existsSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

const dir = join(__dirname, '..', 'node_modules', 'electron');
const ok = () => {
  try {
    return existsSync(require('electron'));
  } catch {
    return false;
  }
};

if (!existsSync(dir)) {
  console.error('[ensure-electron] Chưa cài thư viện. Chạy: npm ci');
  process.exit(1);
}
if (!ok()) {
  console.log('[ensure-electron] Thiếu binary Electron → tải về (chỉ lần đầu)…');
  const r = spawnSync(process.execPath, [join(dir, 'install.js')], { stdio: 'inherit', cwd: dir });
  delete require.cache[require.resolve('electron')];
  if (r.status !== 0 || !ok()) {
    console.error('[ensure-electron] Tải Electron thất bại. Xóa node_modules/electron rồi chạy lại: npm ci');
    process.exit(1);
  }
}
