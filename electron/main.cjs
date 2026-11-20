// Vỏ Electron. Ba chế độ:
//   (mặc định)                     mở game 1280×720
//   --export-leaderboard out.json  ghi {"entries":[...]} đúng thứ tự rồi thoát (không mở cửa sổ)
//   --bench --seed 42 --duration 30 --out bench.json   cảnh benchmark chuẩn (Ticket-04 §1)
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { pathToFileURL } = require('node:url');

const PROC_START_MS = Date.now() - process.uptime() * 1000; // lúc tiến trình bắt đầu
const argv = process.argv.slice(1);
const arg = (name, def) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[i + 1] : def;
};
const BENCH = argv.includes('--bench');
const SHOT = arg('--shot'); // công cụ bằng chứng: chụp ảnh từ app thật (có preload/IPC) rồi thoát
const EXPORT = arg('--export-leaderboard');
const DIST = path.join(__dirname, '..', 'dist', 'index.html');

if (BENCH) {
  // Tắt vsync / giới hạn khung hình để đo được FPS thật.
  app.commandLine.appendSwitch('disable-frame-rate-limit');
  app.commandLine.appendSwitch('disable-gpu-vsync');
  app.commandLine.appendSwitch('disable-renderer-backgrounding');
  app.commandLine.appendSwitch('disable-background-timer-throttling');
}

const lb = () => import(pathToFileURL(path.join(__dirname, '..', 'src', 'leaderboard.js')).href);
const lbFile = () => path.join(app.getPath('userData'), 'leaderboard.json');
function readEntries() {
  try {
    const j = JSON.parse(fs.readFileSync(lbFile(), 'utf8'));
    return Array.isArray(j.entries) ? j.entries : [];
  } catch {
    return [];
  }
}

function createWindow(query) {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    useContentSize: true,
    resizable: !BENCH,
    fullscreenable: !BENCH,
    title: 'Đảo Đèn Lồng',
    backgroundColor: '#0E1430',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), backgroundThrottling: !BENCH },
  });
  win.removeMenu();
  win.loadFile(DIST, query ? { query } : undefined);
  return win;
}

async function runBench(win) {
  const out = path.resolve(process.cwd(), arg('--out', 'bench.json'));
  const duration = Number(arg('--duration', '30'));
  let peakKb = 0;
  const deadline = Date.now() + (duration + 60) * 1000;
  const timer = setInterval(async () => {
    try {
      const st = await win.webContents.executeJavaScript('window.__benchState || null');
      if (st && st.phase === 'measure') {
        // RSS (working set) cao nhất của mọi tiến trình Electron trong lúc đo
        const kb = app.getAppMetrics().reduce((a, m) => a + (m.memory?.workingSetSize || 0), 0);
        peakKb = Math.max(peakKb, kb);
      }
      if (st && st.phase === 'done') {
        clearInterval(timer);
        const r = st.result;
        const result = {
          contract_version: '1.3',
          avg_fps: r.avg_fps,
          p1_low_fps: r.p1_low_fps,
          frame_ms_p95: r.frame_ms_p95,
          frames: r.frames,
          load_ms: Math.round(r.first_frame_epoch_ms - PROC_START_MS),
          peak_mem_mb: peakKb ? Math.round(peakKb / 102.4) / 10 : null,
          vsync_off: true,
          renderer: `three.js r${r.three} · WebGL2 · ${r.gpu} · Electron ${process.versions.electron} / Chromium ${process.versions.chrome}`,
          os: `${os.type()} ${os.release()} ${os.arch()} · ${os.cpus()[0]?.model?.trim()} · ${Math.round(os.totalmem() / 2 ** 30)} GB RAM`,
          seed: r.seed,
          duration_s: r.duration_s,
        };
        fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
        console.log(`bench: avg ${result.avg_fps} fps, p1 ${result.p1_low_fps}, p95 ${result.frame_ms_p95} ms, load ${result.load_ms} ms → ${out}`);
        app.exit(0);
      } else if (Date.now() > deadline) {
        console.error('bench: quá thời gian');
        app.exit(1);
      }
    } catch (e) {
      console.error('bench:', e.message);
    }
  }, 200);
}

app.whenReady().then(async () => {
  const mod = await lb();
  if (EXPORT) {
    const out = path.resolve(process.cwd(), EXPORT);
    fs.writeFileSync(out, JSON.stringify(mod.exportPayload(readEntries()), null, 2) + '\n');
    console.log(`export-leaderboard: ${readEntries().length} mục → ${out}`);
    app.exit(0);
    return;
  }
  ipcMain.handle('lb:get', () => mod.sortEntries(readEntries()));
  ipcMain.handle('lb:add', (_e, entry) => {
    // kiểm lại ở tiến trình chính: không tin dữ liệu từ trang
    const clean = mod.makeEntry({ ...entry, date: new Date(entry.achieved_at || Date.now()) });
    clean.achieved_at = entry.achieved_at && /[+-]\d{2}:\d{2}$/.test(entry.achieved_at) ? entry.achieved_at : clean.achieved_at;
    const list = mod.addEntry(readEntries(), clean);
    fs.mkdirSync(path.dirname(lbFile()), { recursive: true });
    fs.writeFileSync(lbFile(), JSON.stringify({ entries: list }, null, 2));
    return list;
  });
  if (BENCH) {
    const win = createWindow({ bench: '1', seed: arg('--seed', '42'), duration: arg('--duration', '30') });
    runBench(win);
  } else if (SHOT) {
    const win = createWindow();
    const timeout = setTimeout(() => { console.error('shot: quá thời gian'); app.exit(1); }, 60000);
    await new Promise((r) => win.webContents.once('did-finish-load', r));
    await new Promise((r) => setTimeout(r, 600));
    const setup = arg('--setup');
    if (setup) await win.webContents.executeJavaScript(fs.readFileSync(path.resolve(process.cwd(), setup), 'utf8'));
    await new Promise((r) => setTimeout(r, Number(arg('--wait', '1500'))));
    fs.writeFileSync(path.resolve(process.cwd(), SHOT), (await win.webContents.capturePage()).toPNG());
    const fps = await win.webContents.executeJavaScript('window.__ddl && window.__ddl.fps');
    console.log(`shot: ${SHOT} · fps ${Math.round(fps || 0)}`);
    clearTimeout(timeout);
    app.exit(0);
  } else createWindow();
});
app.on('window-all-closed', () => app.quit());
