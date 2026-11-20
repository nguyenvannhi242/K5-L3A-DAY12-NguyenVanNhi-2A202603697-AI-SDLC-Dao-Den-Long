# Retro — Đảo Đèn Lồng (Day 12 AI SDLC)

## Số liệu dự án
| | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|---|---|---|---|---|
| Contract | v1.0 | v1.1 | v1.2 | v1.3 |
| Test (tích lũy) | 28 | 50 | 64 | 70 |
| Test cũ phải sửa vì luật bị thay | — | 3 | 4 | 1 |
| Lỗi thật do test/hook bắt | 2 | 3 | 0 | 1 (bench dùng cài đặt người chơi) |
| Lỗi do test tự viết sai | 1 | 3 | 2 | 1 |
| Hiệu năng | 1 Đêm 0.35 s | 165 FPS (trần màn) | — | bench 714 FPS avg, p1 309, load 0.58 s; soak 0 crash ×1.165 |

## Tổng hợp đánh giá 4 phase
- **Phase 1:** dựng sim tách hẳn khỏi hiển thị, headless đúng contract, dùng luôn số chuẩn của Ticket-02 (đã đọc trước). Nhờ vậy Phase 2 không phải sửa số.
- **Phase 2:** phase nặng nhất (3 bản đồ, 5 tính năng, menu, HUD, âm thanh). Ưu tiên headless trước, trình bày sau → mọi AC đạt, chỉ âm thanh thiếu bằng chứng ghi âm.
- **Phase 3:** 30 phút cho một change request thay luật cốt lõi. Thành công nhờ thiết kế từ Phase 1: luật thắng/điểm tách riêng, thứ tự tick theo ticket, nhiên liệu số nguyên. Đúng 4 test đỏ = đúng 4 luật bị thay.
- **Phase 4:** bench/soak/bảng xếp hạng/trợ năng. Dùng `InstancedMesh` để 300 thực thể chỉ tốn 6 draw call.

## Điều hiệu quả khi làm với AI
1. **Hook chạy test sau mỗi lần sửa file + chặn kết thúc khi test đỏ** — bắt lỗi ngay ở bước sửa (glob Node 24, `shell:true` + dấu cách, vật lý nhảy, điểm xuất phát Đêm 3). Đây là harness giúp nhiều nhất.
2. **Test = scenario chạy tiến trình headless thật**, đọc JSONL; không gọi hàm nội bộ → test cũng là bằng chứng contract.
3. **Spec/AC viết trước code** (phase-2-spec, ADR) → agent không bịa yêu cầu; chỗ mơ hồ ghi giả định (A/B/C, 41 mục).
4. **Skill `verify-proof` + chế độ `--shot` của app**: agent tự chạy bản build thật, chụp ảnh, đo FPS → bằng chứng hình ảnh không phụ thuộc người.
5. Commit nhỏ theo từng việc; tag đúng phase; pre-push chạy `npm run verify` thay cho CI bị khóa.

## Điều không hiệu quả
- Heredoc Bash dài với nhiều dấu nháy bị vỡ 2 lần → chuyển sang ghi script vá ra file.
- Một lần launcher treo vì script vá dừng giữa chừng mà lệnh chạy app vẫn tiếp tục → nên tách bước "vá" và "chạy app", và luôn có timeout.
- Ảnh bằng chứng bị ảnh hưởng bởi cài đặt còn lưu từ lần chụp trước (bench màu mù màu) → thêm `reset-settings.js` và cho bench luôn dùng cài đặt mặc định.

## Những lần AI sai và cách phát hiện
| Lần sai | Phát hiện | Sửa harness |
|---|---|---|
| Đỉnh nhảy thấp 5% (Euler) | Test R-02 | Công thức chính xác cho gia tốc không đổi |
| Điểm xuất phát Đêm 3 trong tháp chuông | Chạy cả 3 Đêm, đọc dòng `end` | Điểm xuất phát theo Đêm (B2) |
| Bộ đếm Gió Lạc lệch 1 tick | Test P2-15 | Quy tắc "mốc sim_tick tuyệt đối" trong AGENTS.md |
| Test tự viết sai biên (P2-10 qua bục, P3-06, P3-08, P4-06) | Trace từng tick / tính tay trước khi sửa | Quy tắc "tính tay ranh giới trước khi assert" — không bao giờ sửa sim để chiều test |
| Bench dùng cài đặt người chơi | Nhìn ảnh bench (Bóng Mực màu xanh) | Bench ép cài đặt hiển thị mặc định |

## Token / chi phí
Toàn bộ dự án làm trong một phiên Claude Code. Số token chính xác lấy ở trang usage (điền vào `docs/notes/ai-log.md`). Cách tiết kiệm đã dùng: trích text đề bằng script thay vì đọc HTML thô (~1 MB/file); kế hoạch + spec ngắn để không phải đọc lại đề; test chạy qua hook và chỉ in dòng PASS/FAIL; sửa bằng patch nhỏ thay vì viết lại file; không dùng subagent.

## Nếu làm lại thì đổi gì
1. Dựng `InstancedMesh` và chế độ `--shot` ngay từ Phase 1 (rẻ, dùng cho mọi phase).
2. Viết bộ "scenario builder" có kiểm đường đi qua bục/vách để giảm test dựng sai.
3. Quay video demo theo từng phase thay vì dồn cuối.
4. Kiểm trên Linux (WSL/Docker) sớm để chắc lệnh contract chạy trên máy chấm.
