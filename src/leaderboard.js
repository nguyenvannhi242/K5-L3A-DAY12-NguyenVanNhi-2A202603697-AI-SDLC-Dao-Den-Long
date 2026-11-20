// Bảng xếp hạng cục bộ (Ticket-04 §3) — logic thuần, dùng chung cho Electron main, trang game và test.
// Tên: 3–12 ký tự [A-Za-z0-9_]; hỗ trợ thêm chữ tiếng Việt có dấu (điểm cộng).
export const NAME_RE = /^[\p{L}\p{M}\p{N}_]{3,12}$/u;
export const MAX_ENTRIES = 10;

export function validateName(raw) {
  if (typeof raw !== 'string') return null;
  const name = raw.normalize('NFC');
  const chars = [...name];
  if (chars.length < 3 || chars.length > 12) return null;
  return NAME_RE.test(name) ? name : null;
}

// ISO 8601 có múi giờ, ví dụ 2026-11-20T19:35:12+07:00
export function isoWithOffset(date = new Date()) {
  const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  const off = -date.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(off / 60)}:${pad(off % 60)}`
  );
}

export function makeEntry({ name, score, nights_won, seed, date = new Date() }) {
  const n = validateName(name);
  if (!n) throw new Error('Tên phải có 3–12 ký tự, chỉ gồm chữ, số hoặc _');
  if (!Number.isInteger(score) || score < 0) throw new Error('score không hợp lệ');
  if (!Number.isInteger(nights_won) || nights_won < 0 || nights_won > 3) throw new Error('nights_won phải 0–3');
  return { name: n, score, nights_won, achieved_at: isoWithOffset(date), seed };
}

// Điểm giảm dần; bằng điểm thì ai đạt trước đứng trên. Giữ top 10.
export function sortEntries(entries) {
  return [...entries]
    .map((e, i) => ({ e, i }))
    .sort((a, b) => b.e.score - a.e.score || Date.parse(a.e.achieved_at) - Date.parse(b.e.achieved_at) || a.i - b.i)
    .map((x) => x.e)
    .slice(0, MAX_ENTRIES);
}

export function addEntry(entries, entry) {
  return sortEntries([...(Array.isArray(entries) ? entries : []), entry]);
}

export function exportPayload(entries) {
  return { entries: sortEntries(Array.isArray(entries) ? entries : []) };
}
