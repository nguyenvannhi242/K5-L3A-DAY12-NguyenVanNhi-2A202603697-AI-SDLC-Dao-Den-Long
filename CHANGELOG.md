# Changelog

## [1.0.0] / [Phase 4] — Ticket-04 "Bình minh" · contract v1.3 · tag `phase-4` + Release `v1.0.0`
### Thêm
- Chế độ benchmark (`bench_cmd`): cảnh chuẩn 200 Bóng Mực + 100 đom đóm, camera bay vòng, tắt vsync, xuất `bench.json` (avg/p1/p95/frames/load/peak mem).
- Soak test (`soak_cmd`): 10 Đêm trong một tiến trình, xuất `soak.json`.
- Bảng xếp hạng cục bộ top 10 lưu trên đĩa, màn hình từ menu, `--export-leaderboard`.
- Dễ tiếp cận: đổi phím (báo trùng, khôi phục mặc định), phụ đề + mũi tên mép màn hình, giảm chuyển động, chữ lớn ×1.25, chữ UI ≥ 18 px.
- `InstancedMesh` cho Bóng Mực/đom đóm; launcher `scripts/launch.cjs`; chế độ chụp bằng chứng `--shot`.
- README đầy đủ, CREDITS, LICENSE (MIT), retro; `bench.json`, `soak.json`.
### Thay đổi
- `contract_version` 1.3; `build_cmd` = `npm ci && npm run build`; `run_cmd` = `node scripts/launch.cjs` (nhận nguyên tham số).

## [Phase 3] — Ticket-03 "Đèn cạn dầu" · contract v1.2 · tag `phase-3`
### Thay đổi phá vỡ tương thích (breaking changes)
- **Luật thắng:** bỏ thắng sớm `all_lit`; thắng `dawn_survived` khi còn sống lúc hết giờ và số đèn đang sáng ≥ ceil(0.6 × tổng). `game_over.reason` không còn `all_lit`.
- **Thời lượng Đêm:** 300/330/360 → **240/270/300 s**.
- **Đèn:** đèn sáng hao dầu và có thể tắt (`lantern_out`); đèn sáng nhận thêm đom đóm (châm dầu, `refuel`). Vùng an toàn chỉ còn khi `fuel ≥ 30`.
- **Điểm:** thay toàn bộ công thức (+5/đom đóm, +40 thắp lại, +15 Tỏa Sáng bóng đang hút, điểm bình minh theo đèn sáng + dầu); **bỏ thưởng thời gian** (`per_second_left` = 0).
- **Sức chứa** không cố định 10 nữa: 10 + 2 × lần thắp thành công, tối đa 20.
- **Contract 1.1 → 1.2:** tuning thêm `fuel_max, fuel_decay_per_s, fuel_per_mote, relight_cost, win_ratio, drain_per_s, low_fuel_threshold, capacity_max` (+ khóa điểm mới); `lantern_lit` thêm `relight`; snapshot đèn thêm `fuel/ever_lit/relit_count`, player thêm `capacity`; Bóng Mực thêm trạng thái `drain`; sự kiện mới `refuel`, `lantern_out`, `fuel_drain`.
### Thêm
- Bóng Mực hút dầu đèn yếu; chế độ "Bảng màu dễ phân biệt"; thanh dầu + nhấp nháy 1 Hz; đèn tắt xẹp và rách giấy; HUD `mang/sức chứa` và số đèn cần giữ.
- ADR-0001, 14 test P3; 4 test cũ sửa có lý do (R-05, R-14, P2-01, P2-07).
### Sửa
- `npm start` tự tải binary Electron nếu npm bỏ qua postinstall.

## [Phase 2] — Ticket-02 "Ba hòn đảo" · contract v1.1 · tag `phase-2`
### Thêm
- Đêm 2 (Đảo Cau: 2 đảo, cầu tre, bục nhảy) và Đêm 3 (Đảo Chuông: 3 tầng, dốc, bục, tháp chuông, gió); `--night 1|2|3`.
- Lướt, Gió Lạc, Bùa Gió, tạm dừng; sự kiện `dash`, `charm_picked`, `drifter_steal`, `drifter_drop`, `night_start`, `paused`, `resumed`.
- Snapshot: `night`, `wind`, player `vel/grounded/invuln/dash_cd_s/pulse_cd_s/charm_s`, mảng `motes/drifters/charms`.
- Bản chơi: menu → giới thiệu Đêm → chơi → kết quả → Đêm kế → Bình Minh; pause menu; cài đặt lưu; HUD đầy đủ; bảng màu chuẩn; âm thanh WebAudio.
### Thay đổi phá vỡ tương thích
- `contract_version` 1.0 → 1.1; tuning thêm `dash_*`, `night2/3_duration_s`.
- Tỏa Sáng đo khoảng cách **3D** từ chân + 0.8 m (trước: XZ).
- `player_hit` khi rơi: `dropped: 0` + `lost: n` (trước: `dropped: n`).
- Có thêm sự kiện `night_start` ở tick 0.
- Trạng thái Bóng Mực cố định: `spawning/wander/chase/recoil/stunned`.

## [Phase 1] — PRD-0 · contract v1.0 · tag `phase-1`
- Đêm 1 Đảo Bến chơi được: nhặt đom đóm, nạp/thắp đèn, Bóng Mực, Tỏa Sáng, vùng an toàn, rơi khỏi đảo, thắng/thua, điểm, HUD, chơi lại.
- Headless theo Test Contract v1.0, `game.contract.json`, 28 test, CI trên máy (`npm run verify`).
