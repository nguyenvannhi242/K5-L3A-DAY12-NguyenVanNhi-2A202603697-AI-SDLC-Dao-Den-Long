# Changelog

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
