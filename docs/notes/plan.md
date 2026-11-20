# Kế hoạch làm lab theo checkpoint

Nguồn: lab board (PRD-0, Ticket-02/03/04) + `docs/lab/*.md`. Lịch 4 giờ: P1 0h–1h, P2 1h–2h, P3 2h–2h30, P4 2h30–4h.

## Quyết định kiến trúc

| Quyết định | Lý do |
|---|---|
| Electron + Three.js (render), Node ESM thuần (sim + headless) | P4 cần `bench_cmd` mở cửa sổ 1280×720, đo RSS, `run_cmd --export-leaderboard`, lưu bảng xếp hạng ra đĩa → web thuần không đủ. Chạy được macOS/Linux/Windows |
| `src/sim/` không import DOM/three, không `Math.random`, RNG có seed | Headless tất định, 60 tick/s cố định, dùng chung cho game/headless/soak |
| Mọi hằng số ở `src/sim/tuning.js`; `game.contract.json` sinh/kiểm từ đó | Contract khai sai tuning = trượt test |
| P1 dùng luôn số chuẩn Ticket-02 và bản đồ chuẩn Đêm 1 | P1 cho tự chọn số → chọn số chuẩn để P2 không phải sửa test hồi quy |
| Thứ tự xử lý trong tick theo Ticket-02 ngay từ đầu; module luật thắng/điểm tách riêng; mô hình đèn chừa chỗ `fuel` (đơn vị nguyên 1/60) | P3 chỉ 30 phút, phải đổi luật nhanh |
| Mỗi tag chỉ chứa luật của phase đó | Test ẩn chạy lại ở từng tag theo contract phase đó |
| Test bằng `node:test` (không thêm dependency) | Gọn, nhanh |

## CP0 · Chuẩn bị (~10')
- [x] Khung repo, Vite + Three.js + Electron, headless stub, `game.contract.json`
- [x] Harness: `CLAUDE.md`, hook chạy test sau khi sửa + chặn Stop khi test đỏ, CI GitHub Actions
- [x] `docs/notes/`, `docs/proof/`, `tests/scenarios/`
- [ ] Đổi tên repo GitHub có hậu tố `-Dao-Den-Long` (SUBMISSION mục 1), để Public

## CP1 · Phase 1 · contract v1.0 · tag `phase-1` trước 1h
- Sim Đêm 1 (đảo R=40, L1–L5 tọa độ chuẩn), nhặt/nạp/thắp, Bóng Mực đuổi, Tỏa Sáng, thắng `all_lit`/thua `dawn`,`no_flames`, điểm
- Headless v1.0: mô hình tick (snapshot tick 0 trước input; sự kiện bước k ghi tick k+1), inputs (cạnh false→true, giữ giá trị cũ, chuẩn hóa move, xoay theo cam_yaw), scenario (lantern theo id, motes/shades thay thế, không phát sự kiện), JSONL + `end`, mã thoát 0/2/≠0, làm tròn 3 số
- Bản 3D tối giản + HUD + chơi lại
- Bằng chứng: ~10 scenario, test tất định (chạy 2 lần, diff), ảnh, bảng truy vết `docs/proof/phase-1.md`

## CP2 · Phase 2 · contract v1.1 · tag `phase-2` trước 2h (phase nặng nhất)
- Ưu tiên 1 (headless): Lướt, rơi/hồi sinh, lịch sinh đom đóm & Bóng Mực, trạng thái `spawning/wander/chase/recoil/stunned`, Đêm 2–3 (cầu, bục nhảy, tầng, dốc, tháp, gió), Gió Lạc, Bùa Gió, pause, snapshot/sự kiện mới, `--night 1..3`, 1 Đêm ≤ 30 s
- Ưu tiên 2: chuỗi 3 Đêm + menu, cài đặt lưu, HUD đầy đủ, bảng màu, âm thanh, ≥ 30 FPS
- DoD: acceptance criteria từng tính năng, ≥ 1 scenario/tính năng mới, cập nhật CLAUDE.md + skill
- Hỏi trợ giảng: thời lượng `spawning`, hành vi `wander`, luật cách ≥15 m ở Đêm 2–3

## CP3 · Phase 3 · contract v1.2 · tag `phase-3` trước 2h30
- Dầu đèn, `drain`, châm dầu, thắp lại 5, thắng `dawn_survived` (≥ ceil(0.6×đèn)), sức chứa tăng, điểm mới, mù màu
- ADR + CHANGELOG breaking changes; sửa/xóa test cũ có lý do (all_lit, thưởng thời gian, đèn sáng không nhận thêm, vùng an toàn luôn có)

## CP4 · Phase 4 · contract v1.3 · tag `phase-4` + Release `v1.0.0`
- `bench_cmd` (200 Bóng Mực, 100 đom đóm, camera bay vòng, bench.json; avg ≥ 60, p1 ≥ 30, load ≤ 10 s → instancing)
- `soak_cmd` (10 Đêm/1 tiến trình, crashes 0, mem_end ≤ 1.2×mem_start)
- Bảng xếp hạng top 10 + `--export-leaderboard`; accessibility; README/CHANGELOG/CREDITS/LICENSE; commit bench.json, soak.json

## CP5 · Video + retro (15' cuối)
- Video < 5', retro 1–2 trang có token, checklist SUBMISSION mục 7

## Rủi ro
Phase 2 quá nhiều việc trong 60' → ưu tiên headless/gameplay (30 điểm test ẩn), phần trình bày tối thiểu và ghi "chưa đạt" trung thực.
