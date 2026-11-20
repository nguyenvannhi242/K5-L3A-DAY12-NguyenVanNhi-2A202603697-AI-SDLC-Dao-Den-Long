# Đánh giá từng phase

## Phase 1

- **Đạt:** toàn bộ 27 mục trong [bảng truy vết](../proof/phase-1.md). 28 test xanh, tất định cả đêm, build OK.
- **Chưa đạt / rủi ro:** chưa có âm thanh; chưa thử trên macOS/Linux thật; GitHub Actions bị khóa (billing) → thay bằng `npm run verify` + pre-push hook.
- **AI sai ở đâu, phát hiện thế nào:**
  1. Tích phân nhảy kiểu Euler cho đỉnh 1.167 m thay vì 1.225 m (= v²/2g). Test R-02 bắt được → đổi sang công thức chính xác cho gia tốc không đổi.
  2. Test R-11 ban đầu dựng sai (Mây bị chạm liên tục, thua trước tick 480) → đọc output thật, dựng lại tình huống có đèn che.
  3. `node --test tests/` không chạy trên Node 24; `shell: true` vỡ khi đường dẫn có dấu cách. Hook test bắt được ngay sau khi sửa file.
- **Chỉnh harness:** thêm `npm run verify` dùng chung cho pre-push và workflow; hook PostToolUse chạy test sau mỗi lần sửa code (đã chặn đúng 4 lần lỗi thật trong phase này).
- **Chuẩn bị cho Phase 2 (đã làm):** đã theo thứ tự xử lý trong tick của Ticket-02 và số chuẩn; cần đổi Tỏa Sáng sang khoảng cách 3D (A10), thêm `--night 2/3`, pause, dash.

## Phase 2

- **Đạt:** 25/26 AC đạt đầy đủ, P2-24 đạt một phần (âm thanh chưa có bằng chứng ghi âm, gió báo trước bằng phụ đề thay vì lá bay). 50 test xanh; 1 Đêm ≤ 0.4 s; 165 FPS ở 1280×720.
- **Hỏng phase trước?** Không về hành vi. 3 test Phase 1 phải sửa vì contract đổi (`night_start`, `lost` khi rơi) — ghi lý do trong test, CHANGELOG và proof.
- **AI sai ở đâu, phát hiện thế nào:**
  1. Đặt điểm xuất phát Đêm 3 ở (0,0,0) → Mây bị đẩy lên đỉnh tháp chuông và thua ở tick 2151. Phát hiện khi chạy headless cả 3 Đêm và đọc dòng `end`. Sửa: điểm xuất phát theo Đêm (B2).
  2. Lướt trên không giữ vy cũ → Mây bay tiếp lên sau khi lướt. Test P2-02b bắt.
  3. Gió Lạc biến mất sớm 1 tick (bộ đếm đặt ở bước 7 rồi bị trừ ngay ở bước 8). Test P2-15 bắt. Sửa bằng mốc `sim_tick` tuyệt đối; thêm quy tắc vào AGENTS.md.
  4. Test sai (không phải sim sai): P2-10 đi xuyên qua bục nhảy, P2-17 đứng trên chỗ bùa nên nhặt lại ngay, P2-09 kỳ vọng sai thời điểm đặt vận tốc. Phát hiện bằng trace từng tick (`tmp/*.mjs`) trước khi sửa — không sửa sim để chiều test.
- **Chỉnh harness:** AGENTS.md cập nhật cho v1.1 + 2 quy tắc rút ra từ lỗi trên; thêm skill `verify-proof` + `scripts/shot.cjs` (chụp ảnh/FPS từ bản build thật) — agent tự chạy game và lưu bằng chứng.

## Phase 3

- **Đạt:** mọi mục của Ticket-03 (7 phần) có test hoặc ảnh; 64 test xanh. ADR-0001 mô tả mô hình trạng thái đèn và luật thắng; CHANGELOG có mục breaking changes.
- **Hỏng phase trước?** Hành vi cũ bị thay đúng theo ticket. Đúng 4 test đỏ khi áp luật mới (R-05, R-14, P2-01, P2-07) — cả 4 đều là luật được đánh dấu [THAY THẾ]; sửa kèm comment `[Phase 3 sửa]`, không skip. 46 test còn lại không đổi vẫn xanh.
- **Thiết kế giúp phase ngắn:** từ Phase 1 đã tách module luật thắng/điểm và theo thứ tự tick Ticket-02, nên đổi luật chỉ chạm `interact`, `checkEnd`, bước 2 và nhánh `drain`.
- **AI sai ở đâu:**
  1. Bash heredoc dài chứa nhiều dấu nháy bị vỡ → chuyển sang ghi script vá ra file rồi chạy.
  2. 2 test P3 tự viết sai biên (vòng lặp kiểm tới tick 61 trong khi tick 61 đã mất vùng an toàn; ngưỡng `< 160` trong khi tính tay ra đúng 160). Sim đúng — kiểm bằng tính tay số đơn vị dầu (1740 − 1 − 11·158 ≤ 0) trước khi sửa test.
- **Chỉnh harness:** AGENTS.md cập nhật v1.2 + quy tắc "tính tay ranh giới tick trước khi viết assert".
