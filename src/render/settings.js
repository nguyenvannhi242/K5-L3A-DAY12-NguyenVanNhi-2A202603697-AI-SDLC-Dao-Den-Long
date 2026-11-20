// Cài đặt người chơi, lưu giữa các lần mở game (localStorage của Electron/browser).
import { DEFAULT_KEYS } from './keys.js';

const KEY = 'ddl.settings.v1';
const DEFAULTS = { volume: 0.7, sensitivity: 1.0, colorblind: false, reducedMotion: false, largeText: false, keys: DEFAULT_KEYS };

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { ...DEFAULTS, ...saved, keys: { ...DEFAULT_KEYS, ...(saved.keys || {}) } };
  } catch {
    return { ...DEFAULTS, keys: { ...DEFAULT_KEYS } };
  }
}

export function saveSettings(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* không lưu được thì vẫn chơi bình thường */
  }
}
