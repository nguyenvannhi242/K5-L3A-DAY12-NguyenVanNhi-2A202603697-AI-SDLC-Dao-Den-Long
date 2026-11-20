// Đổi phím (Ticket-04 §4): mọi hành động đổi được, phát hiện trùng phím, khôi phục mặc định.
export const ACTIONS = [
  ['forward', 'Đi tới'],
  ['back', 'Đi lùi'],
  ['left', 'Sang trái'],
  ['right', 'Sang phải'],
  ['jump', 'Nhảy'],
  ['dash', 'Lướt'],
  ['interact', 'Tương tác (nạp/châm đèn)'],
  ['pulse', 'Tỏa Sáng'],
  ['pause', 'Tạm dừng'],
];

export const DEFAULT_KEYS = {
  forward: 'KeyW',
  back: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  jump: 'Space',
  dash: 'ShiftLeft',
  interact: 'KeyE',
  pulse: 'KeyF',
  pause: 'Escape',
};

// Trả về danh sách các nhóm hành động đang dùng chung một phím.
export function findConflicts(keys) {
  const byKey = {};
  for (const [a] of ACTIONS) (byKey[keys[a]] ??= []).push(a);
  return Object.values(byKey).filter((list) => list.length > 1);
}

const NAMES = { Space: 'Space', Escape: 'Esc', ShiftLeft: 'Shift trái', ShiftRight: 'Shift phải', ControlLeft: 'Ctrl trái', ControlRight: 'Ctrl phải', AltLeft: 'Alt trái', AltRight: 'Alt phải', Enter: 'Enter', Tab: 'Tab', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
export function keyLabel(code) {
  if (!code) return '—';
  if (NAMES[code]) return NAMES[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}
