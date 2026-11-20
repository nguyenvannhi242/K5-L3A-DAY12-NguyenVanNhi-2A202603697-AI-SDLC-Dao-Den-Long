# Đánh giá từng phase

## Phase 1

- **Đạt:** toàn bộ 27 mục trong [bảng truy vết](../proof/phase-1.md). 28 test xanh, tất định cả đêm, build OK.
- **Chưa đạt / rủi ro:** chưa có âm thanh; chưa thử trên macOS/Linux thật; GitHub Actions bị khóa (billing) → thay bằng `npm run verify` + pre-push hook.
- **AI sai ở đâu, phát hiện thế nào:**
  1. Tích phân nhảy kiểu Euler cho đỉnh 1.167 m thay vì 1.225 m (= v²/2g). Test R-02 bắt được → đổi sang công thức chính xác cho gia tốc không đổi.
  2. Test R-11 ban đầu dựng sai (Mây bị chạm liên tục, thua trước tick 480) → đọc output thật, dựng lại tình huống có đèn che.
  3. `node --test tests/` không chạy trên Node 24; `shell: true` vỡ khi đường dẫn có dấu cách. Hook test bắt được ngay sau khi sửa file.
- **Chỉnh harness:** thêm `npm run verify` dùng chung cho pre-push và workflow; hook PostToolUse chạy test sau mỗi lần sửa code (đã chặn đúng 4 lần lỗi thật trong phase này).
- **Chuẩn bị cho Phase 2:** đã theo thứ tự xử lý trong tick của Ticket-02 và số chuẩn; cần đổi Tỏa Sáng sang khoảng cách 3D (A10), thêm `--night 2/3`, pause, dash.
