# Bằng chứng Phase 1 (PRD-0, Test Contract v1.0) · tag `phase-1`

Chạy lại toàn bộ: `npm test` (28 test) hoặc `npm run verify` (test + tất định cả đêm + build). Log lần chạy ở tag này: [phase-1/verify.txt](phase-1/verify.txt).
Mọi test gameplay chạy **tiến trình headless thật** (`tests/helpers.js` → `node headless/run.js`) rồi đọc file JSONL output, không gọi hàm nội bộ.

## Truy vết yêu cầu → bằng chứng

| ID | Yêu cầu (PRD-0 / Contract v1.0) | Cách kiểm chứng | Kết quả |
|---|---|---|---|
| R-01 | Nhân vật đi lại; hướng theo `cam_yaw_deg`, chuẩn hóa vector > 1 | `gameplay.test.js` R-01; `headless.test.js` "đi thẳng +Z" | Đạt |
| R-02 | Nhảy (chỉ khi chạm đất) | R-02: đỉnh 1.225 m ±0.02, chỉ 1 lần lên khi nhấn lại trên không | Đạt |
| R-03 | Đom đóm nhặt được, `pickup_radius` ≤ 1.0 | R-03: sự kiện `mote_picked` đúng tick 40 | Đạt |
| R-04 | Sức chứa `carry_capacity` 10 | R-04 | Đạt |
| R-05 | Nạp ánh sáng vào đèn để thắp; `deposit`, `lantern_lit`, điểm | R-05; [sample-win.jsonl](phase-1/sample-win.jsonl) | Đạt |
| R-06 | Chọn đèn chưa sáng gần nhất, bằng nhau id nhỏ; nạp từng phần | R-06 | Đạt |
| R-07 | `interact_radius` 2.0, "trong bán kính" = ≤ r | R-07 (2.0 nạp, 2.01 không) | Đạt |
| R-08 | Tỏa Sáng xua Bóng Mực: tốn 3, choáng 2 s, đẩy 4 m, hồi chiêu 3 s, `pulse` event, điểm | R-08 | Đạt |
| R-09 | Không đủ ánh sáng thì không tỏa sáng | R-09 | Đạt |
| R-10 | Bóng Mực đuổi; chạm thì mất máu, rơi đom đóm, bất tử | R-10 (`player_hit` tick 1, lần 2 cách ≥ 90 tick) | Đạt |
| R-11 | Đom đóm rơi tồn tại 480 tick | R-11 | Đạt |
| R-12 | Bóng Mực sợ đèn: `safe_radius` 6 m | R-12 (600 tick, khoảng cách luôn ≥ 6) | Đạt |
| R-13 | Đèn vừa thắp đẩy Bóng Mực ra trong ≤ 30 tick, không sát thương | R-13 | Đạt |
| R-14 | Thắp hết đèn thì thắng (`all_lit`), điểm thưởng | R-14 (điểm 858 tính tay = output) | Đạt |
| R-15 | Hết giờ thì thua (`dawn`) | R-15 | Đạt |
| R-16 | Mất hết máu thì thua (`no_flames`) | R-16 | Đạt |
| R-17 | Rơi khỏi đảo (`fall_enabled: true`) | R-17 (−1 lửa, mất hết, hồi sinh sau 60 tick) | Đạt |
| R-18 | Đom đóm rải rác; Bóng Mực xuất hiện | R-18 (20 + 1/240 tick; S1,S2 @300, S3 @780, cách ≥ 15 m) | Đạt |
| R-19 | Scenario: không phát sự kiện/điểm; motes/shades thay thế; lantern theo id | R-19, R-14 | Đạt |
| R-20 | Scenario/inputs sai định dạng → exit 2; lỗi khác → khác 0 | R-20; `headless.test.js` | Đạt |
| R-21 | Tất định: cùng seed/scenario/inputs → giống hệt (kể cả id) | R-21 (3000 tick có sinh ngẫu nhiên); `verify` cả đêm 18000 tick | Đạt |
| R-22 | Mô hình tick: snapshot tick 0, mỗi `--snapshot-every`, dòng cuối `end` | `headless.test.js` | Đạt |
| R-23 | `game.contract.json` tuning = số game dùng | `contract.test.js` (so trực tiếp với `src/sim/tuning.js`) | Đạt |
| R-24 | Không cần cửa sổ/GPU, nhanh | 1 đêm 18000 tick ≈ 0.35 s (Windows 11, Node 24) | Đạt |
| R-25 | Game 3D chơi được, camera 3D, HUD, thắng/thua, chơi lại (R) | Ảnh Electron 1280×720: [start](phase-1/start.png), [đèn sáng](phase-1/lit-lantern.png), [thắng](phase-1/win.png), [thua](phase-1/lose-dawn.png) | Đạt (kiểm bằng mắt) |
| R-26 | Phong cách: đêm, vàng cam ấm = tốt, tím đen = nguy hiểm; Mây đội nón lá có đèn lồng | Ảnh trên | Đạt mức đơn giản |
| R-27 | Đảo sáng dần khi thắp đèn | `src/render/main.js` ambient = 0.15 + 0.55×(sáng/tổng) | Đạt (chỉ hiển thị) |

## Cách chụp ảnh
Ảnh chụp từ bản build thật trong Electron 1280×720 (`webContents.capturePage`). Ảnh thắng/thua dựng trạng thái qua móc debug `window.__ddl` (đặt 4 đèn sáng / đặt còn 30 tick) rồi để sim chạy tiếp và nhấn phím E thật; màn hình kết quả do sim quyết định.

## Chưa đạt / giới hạn
- Chưa có âm thanh (PRD-0 không bắt buộc ở Phase 1).
- Kiểm tra trên macOS/Linux: chưa chạy trên máy thật; lệnh chỉ dùng Node + npm nên kỳ vọng chạy được. GitHub Actions (Ubuntu) bị khóa do billing tài khoản, nên CI chạy bằng `npm run verify` + pre-push hook trên máy.
