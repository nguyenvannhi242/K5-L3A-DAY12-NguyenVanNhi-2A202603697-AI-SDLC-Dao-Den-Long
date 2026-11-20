# Bằng chứng Phase 2 (Ticket-02, Test Contract v1.1) · tag `phase-2`

Chạy lại: `npm test` (50 test = 28 hồi quy Phase 1 + 22 Phase 2) hoặc `npm run verify`. Log ở tag: [phase-2/verify.txt](phase-2/verify.txt).
Spec + acceptance criteria: [docs/notes/phase-2-spec.md](../notes/phase-2-spec.md). Giả định B1–B15: [assumptions.md](../notes/assumptions.md).

## Truy vết

| AC | Yêu cầu | Kiểm chứng | Kết quả |
|---|---|---|---|
| P2-01 | Số chuẩn + khóa tuning mới, contract 1.1 | `contract.test.js`, P2-01 | Đạt |
| P2-02 | Lướt 14 m/s × 0.2 s, hồi 1.5 s từ lúc bắt đầu, đứng yên → hướng mặt, trên không giữ độ cao | P2-02, P2-02b | Đạt |
| P2-03 | Tỏa Sáng 3D từ chân + 0.8 m | P2-03 (XZ 5.0 nhưng 3D 5.004 → trượt) | Đạt |
| P2-04 | Rơi: −1 lửa, mất hết, `lost`, chờ 60, hồi sinh, bất tử 90; hết lửa thua ngay | R-17, P2-04 | Đạt |
| P2-05 | Nhặt: XZ ≤ 1 và chênh cao ≤ 1.5; 20/30/240 | P2-05, R-03, R-18 | Đạt |
| P2-06 | Lịch sinh Bóng Mực 480/420/360, tối đa 6/8/10, tốc độ Đêm 3 4.5 | P2-06 | Đạt |
| P2-07 | Thời lượng 300/330/360, lửa đầy mỗi Đêm, `night_start` | P2-07 | Đạt |
| P2-08 | Đêm 2: hai đảo + cầu tre không lan can | P2-08 | Đạt |
| P2-09 | Bục Đêm 2: vy 14, ngang 24 m/s, đáp đảo kia ~1.4 s | P2-09 | Đạt |
| P2-10 | Đêm 3: 3 tầng, vách chặn, dốc lên tầng 1, bước khỏi mép rơi xuống | P2-10; ảnh [night3-tiers](phase-2/night3-tiers.png) | Đạt |
| P2-11 | Bục Đêm 3 → tầng 2; tháp chuông chặn | P2-11 | Đạt |
| P2-12 | Gió mỗi 30 s, 5 s, 2 m/s; `wind_enabled` | P2-12 (dịch 10.0 m) | Đạt |
| P2-13 | Đèn/điểm sinh chuẩn từng Đêm | P2-13 | Đạt |
| P2-14 | Gió Lạc: lịch sinh, idle→chase (≥ 5, ≤ 15 m), cướp min(3), flee 240 tick | P2-14 | Đạt |
| P2-15 | Tỏa Sáng vs Gió Lạc (chase → flee; flee có đồ → thả, 120 tick) | P2-15 | Đạt |
| P2-16 | Gió Lạc không mất lửa, không bị vùng an toàn chặn, bất tử không ngăn | P2-16 | Đạt |
| P2-17 | Bùa Gió: 600 tick, 7.2 m/s, lướt không hồi chiêu, xuất hiện lại 2700 tick | P2-17 | Đạt |
| P2-18 | Tạm dừng: tick tăng, sim_tick/thời gian/hồi chiêu đứng, `paused`/`resumed` | P2-18; ảnh [pause](phase-2/pause.png) (đồng hồ đứng 05:00) | Đạt |
| P2-19 | Snapshot v1.1 đủ trường | P2-19 | Đạt |
| P2-20 | Scenario v1.1 + lỗi định dạng → 2 | P2-20 | Đạt |
| P2-21 | 1 Đêm 21 600 tick ≤ 30 s, tất định cả 3 Đêm | P2-21; đo thực: ~0.2–0.4 s/Đêm | Đạt |
| P2-22 | Menu → giới thiệu Đêm (lời Ông Đăng) → chơi → kết quả → Đêm kế; Bình Minh; thua chơi lại | Ảnh [menu](phase-2/menu.png), [intro](phase-2/intro.png), [kết quả thắng](phase-2/result-won.png), [Bình Minh](phase-2/dawn.png) | Đạt (kiểm bằng mắt) |
| P2-23 | Pause menu 4 nút; Cài đặt âm lượng + độ nhạy chuột được lưu | Ảnh [pause](phase-2/pause.png); `scripts/shots/settings*.js`: đặt 0.35 / 2.2 → tải lại trang → đọc lại `volume=0.35 sens=2.2`, ảnh [settings-persisted](phase-2/settings-persisted.png) | Đạt |
| P2-24 | HUD đầy đủ, bảng màu chuẩn, ánh sáng môi trường, âm thanh | Ảnh HUD [night2-bridge](phase-2/night2-bridge.png); màu ở `src/render/palette.js` (đúng hex ticket); âm thanh WebAudio `src/render/audio.js` cho 10 sự kiện + nhạc nền | Đạt một phần — âm thanh chưa kiểm bằng ghi âm |
| P2-25 | ≥ 30 FPS trung bình 1280×720 | `scripts/shot.cjs` đo 10 s Đêm 3: **165 FPS** (chạm trần màn 165 Hz). Máy: Ryzen 5 5600H, RTX 3050 Laptop, 16 GB, Windows 11 | Đạt |
| P2-26 | Hồi quy Phase 1 | `gameplay.test.js` 21 test vẫn xanh; 3 test sửa có lý do (xem dưới) | Đạt |

## Test Phase 1 đã sửa (luật mới thay thế)
| Test | Thay đổi | Lý do |
|---|---|---|
| R-05 | Bỏ qua sự kiện ở tick 0 khi lấy 2 sự kiện đầu | v1.1 thêm `night_start` ở tick 0 |
| R-17 | `player_hit` khi rơi: `{dropped: 0, lost: 4}` thay vì `{dropped: 4}` | Ticket-02 thêm trường `lost` cho rơi (B10) |
| R-19 | Chuỗi dòng `snapshot, night_start, end` | v1.1 thêm `night_start` |

## Chưa đạt / giới hạn
- Âm thanh: có, nhưng chưa có bằng chứng ghi âm (sẽ thể hiện trong video Phase 4).
- Lá bay báo gió: thể hiện bằng phụ đề "🍃 Gió sắp thổi!" 2 s trước + âm thanh, chưa có hạt lá bay.
- Chưa thử trên macOS/Linux thật; GitHub Actions bị khóa (billing).
