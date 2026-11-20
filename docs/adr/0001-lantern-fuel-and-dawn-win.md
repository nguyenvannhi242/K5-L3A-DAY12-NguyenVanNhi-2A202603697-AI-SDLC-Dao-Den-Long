# ADR-0001: Đèn có nhiên liệu, thắng bằng "giữ đảo sáng tới bình minh"

- **Trạng thái:** Chấp nhận (Phase 3, Ticket-03, contract v1.2)
- **Bối cảnh:** Playtest cho thấy người chơi giỏi thắp hết đèn trong 2 phút rồi Đêm kết thúc. Ticket-03 thay 3 luật cốt lõi: đèn đã sáng không nhận thêm đom đóm; Bóng Mực không bao giờ vào vùng an toàn; thắng ngay khi mọi đèn sáng.

## Quyết định

### 1. Mô hình trạng thái đèn
Trước: `{lit, deposited}` — hai trạng thái *chưa sáng → sáng* và không quay lại.

Sau: `{lit, deposited, fuel_u, ever_lit, relit_count}` với vòng đời

```
chưa từng sáng --nạp đủ 10--> SÁNG (fuel 100)
SÁNG --hao 1/s + bị hút 5/s mỗi Bóng Mực--> fuel ≤ 0 --> TẮT (deposited = 0, ever_lit = true, lantern_out)
TẮT --nạp đủ 5 (relight_cost)--> SÁNG (fuel 100, relit_count+1, lantern_lit{relight:true})
SÁNG & fuel < 100 --Tương tác--> châm dầu: used = min(mang, ceil((100−fuel)/10)), fuel += 10·used
```

- **Nhiên liệu lưu bằng số nguyên đơn vị 1/60** (`fuel_u`, tối đa 6000): hao 1 đơn vị/tick, mỗi Bóng Mực hút 5 đơn vị/tick → không sai số số thực; chỉ làm tròn 1 chữ số thập phân khi xuất.
- Vùng an toàn là **thuộc tính suy ra**: đèn sáng và `fuel ≥ 30`. Đèn đi lên lại ≥ 30 (châm dầu) thì đẩy Bóng Mực trong 6 m ra mép như lúc vừa thắp.
- Thêm trạng thái Bóng Mực `drain` (đứng yên cạnh đèn yếu ≤ 2 m); chỉ con `wander` chọn đèn yếu.

### 2. Luật thắng
Bỏ thắng sớm `all_lit`. Kiểm tra sau mọi cập nhật của tick: hết lửa → thua `no_flames` (kể cả tick bình minh); hết giờ → thắng `dawn_survived` nếu số đèn đang sáng ≥ ceil(0.6 × tổng đèn), ngược lại thua `dawn`. Thời lượng Đêm 240/270/300 s.

### 3. Điểm & sức chứa
Công thức điểm thay toàn bộ (nạp +5/đom đóm, thắp lần đầu +100, thắp lại +40, Tỏa Sáng +5 hoặc +15 nếu bóng đang `drain`, bình minh: mỗi đèn sáng +50+floor(fuel), mỗi Ngọn Lửa +50; bỏ thưởng thời gian). Sức chứa = 10 + 2 × số lần thắp thành công trong Đêm, tối đa 20.

## Hệ quả
- Test cũ bị thay: thắng `all_lit` (R-14), điểm nạp ×10 (R-05), thời lượng Đêm (P2-07), phiên bản contract (P2-01). Được sửa kèm comment `[Phase 3 sửa]` và ghi trong CHANGELOG — không skip.
- Thứ tự tick: trừ dầu ở bước 2, ngay sau đó đèn hết dầu tắt (trước khi Mây di chuyển).
- Rủi ro: thêm một vòng phản hồi (bóng hút → đèn tắt → bóng về `wander` → đi tới đèn tắt gần nhất). Đã có test cho từng chuyển trạng thái.
