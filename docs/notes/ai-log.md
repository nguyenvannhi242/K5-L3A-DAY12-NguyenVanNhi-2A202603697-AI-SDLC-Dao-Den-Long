# Nhật ký dùng AI

Công cụ: Claude Code (desktop app). Harness: `AGENTS.md`/`CLAUDE.md`, hook `.claude/hooks/run-tests.mjs`, CI.

| Phase | Việc | Lời nhắc chính | AI sai ở đâu / cách phát hiện | Token/chi phí ước tính |
|---|---|---|---|---|
| CP0 | Đọc đề, lập kế hoạch, dựng khung repo + harness | "lên kế hoạch theo checkpoint", "lưu và dựng CP0" | npm 11 chặn postinstall của electron → phát hiện khi kiểm tra binary, thêm `allowScripts` | _(điền từ trang usage)_ |
| CP1 | Sim Đêm 1, headless v1.0, 21 scenario test, bản 3D + HUD, bằng chứng | "tiếp tục CP1. sửa CI để chạy trên máy" | Đỉnh nhảy sai 5% (Euler), test R-11 dựng sai, glob test Node 24, `shell:true` + dấu cách — đều do hook/test bắt (xem evaluation.md) | _(điền từ trang usage)_ |
| CP2 | Spec P2 (26 AC), sim 3 Đêm + v1.1, 22 test P2, bản chơi 3 Đêm/menu/pause/cài đặt/HUD/âm thanh, skill verify-proof | "Bắt đầu CP2" | Điểm xuất phát Đêm 3 trong tháp; vy sau lướt; Gió Lạc lệch 1 tick; 3 test dựng sai (xem evaluation.md) | _(điền từ trang usage)_ |
| CP3 | ADR-0001, sim dầu/drain/thắng bình minh/sức chứa/điểm, contract v1.2, 14 test P3, sửa 4 test bị thay, thanh dầu + mù màu | "Bắt đầu CP3", "continue" | heredoc vỡ; 2 test biên sai (xem evaluation.md) | _(điền từ trang usage)_ |

**Cách tiết kiệm token:** đọc đề một lần rồi tóm tắt vào `docs/notes/plan.md`; dữ liệu đề lấy bằng script trích text thay vì đọc HTML thô; test chạy qua hook nên agent không phải tự nhớ chạy; chỉ in dòng PASS/FAIL thay vì toàn bộ log test.
