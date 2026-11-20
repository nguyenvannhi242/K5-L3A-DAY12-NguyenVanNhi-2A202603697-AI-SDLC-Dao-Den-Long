---
name: verify-proof
description: Chạy kiểm chứng của dự án Đảo Đèn Lồng và lưu bằng chứng cho một phase (test, tất định, ảnh Electron, FPS). Dùng trước khi gắn tag phase-N hoặc khi cần bằng chứng cho một yêu cầu.
---

# Kiểm chứng và lưu bằng chứng

Khi nào dùng: trước khi tag `phase-N`; sau khi đổi luật sim; khi cần ảnh/số đo cho `docs/proof/phase-N.md`.

## 1. Logic (bắt buộc xanh)
```bash
npm run verify            # test + headless cả đêm ×2 so sánh + build; log ở tmp/verify.log
cp tmp/verify.log docs/proof/phase-N/verify.txt   # *.log bị .gitignore
```
- Mỗi yêu cầu mới → 1 test scenario headless trong `tests/phaseN.test.js` dùng `play()` của `tests/helpers.js` (chạy tiến trình thật, đọc JSONL).
- Test cũ bị luật mới thay: sửa assertion kèm comment `// [Phase N sửa] <lý do>` và ghi vào CHANGELOG. Không `skip`.

## 2. Ảnh và FPS từ app thật
```bash
npm run build
node scripts/launch.cjs --shot tmp/r.png --setup scripts/shots/reset-settings.js --wait 300   # xóa cài đặt cũ
node scripts/launch.cjs --shot docs/proof/phase-N/<tên>.png --setup scripts/shots/<setup>.js --wait 1500
```
- `--shot` chạy trong app Electron thật (có preload/IPC, lưu bảng xếp hạng ra đĩa); in `fps <số>` = FPS giây gần nhất ở 1280×720.
- `scripts/shots/*.js` chạy trong trang: dùng `window.__ddl` (`startNight(n)`, `state`, `goIntro(n)`, `openBoard()`, `setWon()`, `setYaw`) để dựng tình huống, rồi để sim tự chạy. Không sửa kết quả hiển thị bằng tay. Luôn đặt `timeout` khi chạy.
- Đo hiệu năng chính thức: `npm run bench` (→ `bench.json`), `npm run soak` (→ `soak.json`). Ghi kèm cấu hình máy.

## 3. Ghi bằng chứng
Bảng trong `docs/proof/phase-N.md`: yêu cầu → cách kiểm chứng (tên test/ảnh) → kết quả (Đạt / Chưa đạt + lý do). Ảnh phải chụp từ đúng commit sẽ tag.
