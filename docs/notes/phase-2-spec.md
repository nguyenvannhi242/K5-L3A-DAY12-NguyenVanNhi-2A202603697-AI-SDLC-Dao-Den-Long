# Phase 2 · Ticket-02 "Ba hòn đảo" · Contract v1.1 — spec & acceptance criteria

Mỗi AC có một test `P2-xx` trong `tests/phase2.test.js` (scenario headless thật) hoặc bằng chứng hình ảnh trong `docs/proof/phase-2.md`.

## Phần 1 — Số liệu chuẩn
| AC | Tiêu chí kiểm chứng được |
|---|---|
| P2-01 | `game.contract.json` v1.1: tuning = số chuẩn + `dash_speed` 14, `dash_duration_s` 0.2, `dash_cooldown_s` 1.5, `night2_duration_s` 330, `night3_duration_s` 360 |
| P2-02 | Lướt: nhấn `dash` → sự kiện `dash`, 12 tick ở 14 m/s theo hướng input (đứng yên: hướng mặt), hồi chiêu 90 tick tính từ lúc bắt đầu; lướt trên không giữ độ cao |
| P2-03 | Tỏa Sáng: tâm = chân + 0.8 m, khoảng cách **3D** tới tâm Bóng Mực ≤ 5; pulse lại làm mới choáng |
| P2-04 | Rơi (Y < −10): −1 lửa, mất toàn bộ đom đóm (`player_hit` có `lost`), chờ 60 tick, hồi sinh (0,0,0) vận tốc 0, bất tử 90 tick; hết lửa thì thua ngay |
| P2-05 | Đom đóm: nhặt khi XZ ≤ 1 **và** chênh cao ≤ 1.5; 20 ban đầu, trần 30, +1 mỗi 240 tick |
| P2-06 | Bóng Mực: sinh 2 con ở tick 300 rồi mỗi 480/420/360 tick (Đêm 1/2/3), tối đa 6/8/10; tốc độ 4.0 (Đêm 3: 4.5); trạng thái `spawning/wander/chase/recoil/stunned` |
| P2-07 | Thời lượng Đêm 1/2/3 = 300/330/360 s; Ngọn Lửa hồi đầy mỗi Đêm |

## Phần 2 — Bản đồ chuẩn
| AC | Tiêu chí |
|---|---|
| P2-08 | Đêm 2: hai đảo R=28 tâm (0,0,0)/(70,0,0), cầu x∈[26,44] z∈[−2,2]; đi qua cầu không rơi, bước khỏi cầu thì rơi |
| P2-09 | Bục nhảy Đêm 2: chạm bục → vận tốc Y 14, ngang 24 m/s về tâm đảo kia, giữ tới khi chạm đất, đáp trong đảo đích (~1.4 s) |
| P2-10 | Đêm 3: 3 tầng (Y 0/3/6), vách đứng chặn đi lên, bước ra thì rơi xuống; dốc 30°/150° đi lên được tầng 1 |
| P2-11 | Bục Đêm 3 (0,3,13): vy 12, ngang 8 hướng −Z → đáp lên tầng 2; tháp chuông R=2 không đi xuyên |
| P2-12 | Gió Đêm 3: mỗi 30 s một cơn 5 s, hướng ngẫu nhiên theo seed, đẩy 2 m/s; snapshot `wind {active, dir_deg}` |
| P2-13 | Đèn/điểm sinh/đom đóm từng Đêm đúng tọa độ chuẩn (L1…L6, L1…L7) |

## Phần 3 — Tính năng mới
| AC | Tiêu chí |
|---|---|
| P2-14 | Gió Lạc (Đêm 2–3): sinh tick 1200, 2400…, tối đa 2, id D1…; idle → chase khi mang ≥ 5 và ≤ 15 m; chạm (XZ ≤ 1.2) cướp min(3, mang) → flee 240 tick rồi biến mất |
| P2-15 | Tỏa Sáng trúng Gió Lạc chase → flee không cướp; trúng flee có đồ → thả lại thành đom đóm rơi (`drifter_drop`), biến mất sau 120 tick |
| P2-16 | Gió Lạc không làm mất lửa, không bị vùng an toàn chặn, bất tử không ngăn cướp |
| P2-17 | Bùa Gió: nhặt như đom đóm → `charm_picked`, 600 tick: tốc độ 7.2, Lướt không hồi chiêu (vẫn phải nhấn lại); xuất hiện lại sau 2700 tick |
| P2-18 | Tạm dừng: `pause` → sự kiện `paused`, `tick` vẫn tăng, `sim_tick`/thời gian/hồi chiêu/spawn/TTL đứng yên, snapshot `state:"paused"`; nhấn lại → `resumed` |
| P2-19 | `--night 1/2/3`; `night_start {night}`; snapshot có `night`, `wind`, player `vel/grounded/invuln/dash_cd_s/pulse_cd_s/charm_s`, mảng `motes/drifters/charms` |
| P2-20 | Scenario v1.1: player `invuln_ticks/dash_cd_ticks/pulse_cd_ticks/charm_ticks`, shades `state/state_ticks_left`, `drifters`, `charms`, `random_drifters`, `wind_enabled` |
| P2-21 | Headless một Đêm đầy đủ (≤ 21 600 tick) ≤ 30 s |
| P2-22 | Bản chơi: Menu → giới thiệu Đêm → chơi → kết quả → Đêm kế; Bình Minh sau Đêm 3; thua chơi lại Đêm đó |
| P2-23 | Pause menu (Esc/P): Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu; Cài đặt âm lượng + độ nhạy chuột được lưu |
| P2-24 | HUD đầy đủ, bảng màu chuẩn, ánh sáng môi trường 0.15 + 0.55×tỉ lệ đèn, âm thanh các sự kiện |
| P2-25 | ≥ 30 FPS trung bình ở 1280×720 |
| P2-26 | Hồi quy: mọi test Phase 1 vẫn đạt (trừ chỗ ticket thay luật, ghi lý do) |
