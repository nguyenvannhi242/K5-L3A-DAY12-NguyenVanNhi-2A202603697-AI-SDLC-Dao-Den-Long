// Lưu bảng xếp hạng: trong Electron ghi ra đĩa qua preload (userData/leaderboard.json);
// chạy trên trình duyệt (npm run dev) thì dùng localStorage.
import { addEntry, sortEntries } from '../leaderboard.js';

const KEY = 'ddl.leaderboard.v1';
const local = {
  get() {
    try {
      return sortEntries(JSON.parse(localStorage.getItem(KEY) || '[]'));
    } catch {
      return [];
    }
  },
  add(entry) {
    const list = addEntry(local.get(), entry);
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* không lưu được */
    }
    return list;
  },
};

export const onDisk = () => Boolean(window.ddl?.getLeaderboard);
export async function getLeaderboard() {
  return window.ddl?.getLeaderboard ? window.ddl.getLeaderboard() : local.get();
}
export async function saveEntry(entry) {
  return window.ddl?.addEntry ? window.ddl.addEntry(entry) : local.add(entry);
}
