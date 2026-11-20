# Bằng chứng Phase 4 (Ticket-04 "Bình minh: phát hành v1.0.0", contract v1.3) · tag `phase-4` + Release `v1.0.0`

Chạy lại: `npm test` (70 test), `npm run verify`, `npm run bench`, `npm run soak`. Log verify ở tag: [phase-4/verify.txt](phase-4/verify.txt).
Máy đo (chỉ tham khảo; giảng viên đo lại trên máy chấm): Windows 11 (10.0.26200) · AMD Ryzen 5 5600H · NVIDIA RTX 3050 Laptop (ANGLE/D3D11) · 16 GB RAM · Node 24.21 · Electron 33.3.1.

## 1. Benchmark — [`bench.json`](../../bench.json)
Lệnh: `node scripts/launch.cjs --bench --seed 42 --duration 30 --out bench.json` (= `bench_cmd` + tham số ticket).

| Trường | Kết quả | Ngưỡng | |
|---|---:|---:|---|
| avg_fps | **714.4** | ≥ 60 | Đạt |
| p1_low_fps | **308.5** | ≥ 30 | Đạt |
| frame_ms_p95 | 2.1 | — | |
| frames | 21 431 | — | |
| load_ms | **583** | ≤ 10 000 | Đạt |
| peak_mem_mb | 389.1 | — | RSS (working set) tổng các tiến trình Electron |
| vsync_off | true | — | `disable-gpu-vsync` + `disable-frame-rate-limit` |

Cảnh bench đúng mô tả ticket ([ảnh](phase-4/bench-scene.png)): cửa sổ 1280×720 không toàn màn hình; Đêm 1 đủ hiệu ứng/ánh sáng; **đúng 200 Bóng Mực `wander` + 100 đom đóm** rải đều theo seed 42; L1–L3 sáng fuel 100; tắt sinh thêm/sát thương/nhặt/hao dầu/kết thúc Đêm; không input, Mây đứng ở (0,0,0); camera tròn R = 30, Y = 15, nhìn (0,0,0), bắt đầu (30,15,0), ngược chiều kim đồng hồ, 15 s/vòng; 3 s khởi động không đo; công thức avg/p1/p95 đúng định nghĩa (`finishBench` trong `src/render/main.js`). Cảnh bench bỏ qua cài đặt người chơi (mù màu, chữ lớn…) để mọi máy đo cùng cảnh. Logic cảnh có test P4-02.
Để đạt ngưỡng: Bóng Mực và đom đóm vẽ bằng `InstancedMesh` (`src/render/instanced.js`) — 6 draw call cho 300 thực thể.

## 2. Soak — [`soak.json`](../../soak.json)
Lệnh: `node --expose-gc headless/soak.js --seed 7 --nights 10 --out soak.json` (= `soak_cmd` + tham số).

| Trường | Kết quả | Ngưỡng | |
|---|---:|---:|---|
| crashes | **0** | = 0 | Đạt |
| mem_start_mb → mem_end_mb | 38.9 → 45.3 (**×1.165**) | ≤ ×1.2 | Đạt — sát ngưỡng, xem dưới |
| nights | 10 (Đêm 1→2→3 xoay vòng, Đêm thứ i seed 7+i) | | |

Phân tích bộ nhớ: chạy 30 và 60 Đêm RSS dừng ở ~47 MB (×1.22 so với lúc mới tải Đêm đầu) — **không rò rỉ**, phần tăng là mã JIT + heap V8 nở ra trong Đêm đầu tiên. Không "làm nóng" trước khi đo `mem_start` vì như vậy là lách định nghĩa của ticket. Có test P4-03 (đủ trường, xoay vòng, tất định).

## 3. Bảng xếp hạng cục bộ
| Yêu cầu | Kiểm chứng | Kết quả |
|---|---|---|
| Nhập tên sau Bình Minh hoặc sau khi thua ở bất kỳ Đêm nào | Ảnh [leaderboard](phase-4/leaderboard.png) (thua Đêm 2, lưu "Mây_đẹp"), [leaderboard-2](phase-4/leaderboard-2.png) (Bình Minh, "Ong_Dang") — chụp trên app thật qua `--shot` | Đạt |
| Tên 3–12 ký tự `[A-Za-z0-9_]` + tiếng Việt có dấu (điểm cộng) | P4-04 | Đạt |
| Mục: name, score (tổng Đêm đã thắng), nights_won, achieved_at ISO 8601 có múi giờ, seed | P4-05; export thực tế `"achieved_at": "2026-11-20T19:55:17+07:00"` | Đạt |
| Top 10, điểm giảm dần, bằng điểm ai đạt trước đứng trên | P4-06 | Đạt |
| Lưu trên đĩa, còn sau khi tắt/mở lại | `userData/leaderboard.json` qua preload IPC; export chạy ở tiến trình mới sau khi app đã đóng vẫn ra 2 mục | Đạt |
| Màn Bảng xếp hạng từ menu chính | Nút "Bảng xếp hạng" | Đạt |
| `<run_cmd> --export-leaderboard out.json` → `{"entries": [...]}` đúng thứ tự | `node scripts/launch.cjs --export-leaderboard tmp/lb.json` → 2137 trước 640, exit 0 | Đạt |

## 4. Dễ tiếp cận
| Yêu cầu | Kiểm chứng | Kết quả |
|---|---|---|
| Đổi phím mọi hành động (4 hướng, nhảy, lướt, tương tác, tỏa sáng, tạm dừng), báo trùng phím, khôi phục mặc định, được lưu | Ảnh [keys-conflict](phase-4/keys-conflict.png) ("⚠ Trùng phím: E → Lướt + Tương tác"); `findConflicts` trong `src/render/keys.js`; lưu trong `settings.keys` | Đạt |
| Phụ đề/chỉ báo: Bóng Mực xuất hiện + mũi tên ở mép màn hình, gió sắp thổi, 10 s cuối, đèn fuel < 30 | Ảnh [a11y](phase-4/a11y-large-text-shade-arrow.png) (phụ đề + mũi tên tím); phụ đề "🍃 Gió sắp thổi!", "⏳ Còn N giây", "⚠ Đèn Lx sắp hết dầu" trong `drawHud` | Đạt |
| Giảm chuyển động: tắt rung camera và chớp màn hình | `followCamera` / `drawWorld`: `reducedMotion` → không rung, không chớp đỏ khi bị đánh, không bùng sáng khi Tỏa Sáng, đồng hồ không nhấp nháy | Đạt (kiểm bằng mã + chơi thử) |
| Chữ UI ≥ 18 px ở 1280×720; tùy chọn chữ lớn ×1.25 | CSS: chữ nhỏ nhất 18 px (`#help`, `.cd`, `#carry`); ảnh a11y bật chữ lớn | Đạt |

## 5. Đóng gói & tài liệu
| Yêu cầu | Kết quả |
|---|---|
| Clone sạch → ≤ 3 lệnh → chơi được | `npm ci` → `npm start` (README). Kiểm lại trên bản clone sạch ở tag (xem mục dưới) |
| README: mô tả, ảnh, yêu cầu hệ thống, cài đặt, điều khiển, test, headless, bench, soak | [README.md](../../README.md) |
| CHANGELOG cho 4 phase; CREDITS; LICENSE | [CHANGELOG.md](../../CHANGELOG.md), [CREDITS.md](../../CREDITS.md), [LICENSE](../../LICENSE) |
| Release `v1.0.0` có bản chạy được | Bản web tĩnh `dao-den-long-v1.0.0-web.zip` (thư mục `dist/`) + hướng dẫn chạy Electron từ mã nguồn |

## 6. Contract v1.3
`game.contract.json`: `contract_version` 1.3, thêm `bench_cmd`, `soak_cmd`; `build_cmd` = `npm ci && npm run build`; `run_cmd` = `node scripts/launch.cjs` (nhận nguyên tham số, vd. `--export-leaderboard`). Mọi yêu cầu v1.0–v1.2 giữ nguyên: 64 test Phase 1–3 vẫn xanh (1 test P3-01 nới kiểm phiên bản, ghi lý do `[Phase 4 sửa]`).

## Chưa đạt / giới hạn
- Số đo trên máy cá nhân Windows; chưa chạy trên macOS/Linux thật. Lệnh chỉ dùng Node/npm/Electron nên kỳ vọng chạy được.
- Release chỉ có bản web tĩnh + mã nguồn, chưa đóng gói file thực thi riêng cho macOS/Linux.
- GitHub Actions vẫn bị khóa (billing) → CI chạy bằng `npm run verify` + pre-push hook.
