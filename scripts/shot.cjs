// Chụp ảnh bằng chứng từ bản build thật trong Electron 1280x720 và in FPS trung bình gần nhất.
// Dùng: npx electron scripts/shot.cjs dist/index.html out.png [scripts/shots/x.js | -] [waitMs]
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
// usage: electron main.cjs <page> <out.png> [setup.js] [waitMs]
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const [page, out, setup, wait] = args[0].endsWith('.cjs') ? args.slice(1) : args;
const path = require('node:path');
app.whenReady().then(async () => {
  const w = new BrowserWindow({ width: 1280, height: 720, useContentSize: true, show: true });
  w.webContents.on('console-message', (_e, _l, msg) => console.log('[page]', msg));
  await w.loadFile(path.resolve(page));
  await new Promise((r) => setTimeout(r, 600));
  if (setup && setup !== '-') await w.webContents.executeJavaScript(fs.readFileSync(path.resolve(setup), 'utf8'));
  await new Promise((r) => setTimeout(r, Number(wait || 1500)));
  fs.writeFileSync(path.resolve(out), (await w.webContents.capturePage()).toPNG());
  const fps = await w.webContents.executeJavaScript('window.__ddl && window.__ddl.fps');
  console.log('fps', fps);
  app.quit();
});
