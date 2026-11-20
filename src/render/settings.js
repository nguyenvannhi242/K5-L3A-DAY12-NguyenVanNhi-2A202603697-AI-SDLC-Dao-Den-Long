// Cài đặt người chơi, lưu giữa các lần mở game (localStorage của Electron/browser).
const KEY = 'ddl.settings.v1';
const DEFAULTS = { volume: 0.7, sensitivity: 1.0 };

export function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* không lưu được thì vẫn chơi bình thường */
  }
}
