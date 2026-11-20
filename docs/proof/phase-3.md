# Bằng chứng Phase 3 (Ticket-03 "Đèn cạn dầu", Test Contract v1.2) · tag `phase-3`

Chạy lại: `npm test` (64 test = 28 Phase 1 + 22 Phase 2 + 14 Phase 3) hoặc `npm run verify`. Log ở tag: [phase-3/verify.txt](phase-3/verify.txt).
Quyết định thiết kế: [ADR-0001](../adr/0001-lantern-fuel-and-dawn-win.md). Thay đổi phá vỡ tương thích: [CHANGELOG.md](../../CHANGELOG.md).

## Truy vết
| Mục ticket | Yêu cầu | Kiểm chứng | Kết quả |
|---|---|---|---|
| 1 | Nhiên liệu 100, hao 1/s (đơn vị nguyên 1/60), fuel xuất 1 chữ số, đèn tắt fuel 0 | P3-02 | Đạt |
| 1 | Hết dầu → tắt, deposited 0, `lantern_out`, nhớ `ever_lit` | P3-03 | Đạt |
| 1 | Thắp lại chỉ cần 5 (`relight:true`, `relit_count`), chưa từng sáng vẫn 10 | P3-04 | Đạt |
| 1 | Châm dầu `used = min(mang, ceil((100−fuel)/10))`, fuel ≤ 100, `refuel` | P3-05 | Đạt |
| 1 | Chọn đèn nhận được (chưa sáng / sáng chưa đầy), gần nhất, id nhỏ | `nearestLantern` + R-06, P3-05 | Đạt (trường hợp "đầy đúng 100" chỉ tồn tại trong tick vừa châm vì bước 2 trừ dầu trước bước 5 — xem C3) |
| 1 | Thanh dầu trên đèn sáng; fuel < 30 nhấp nháy 1 Hz | Ảnh [fuel-low-and-out](phase-3/fuel-low-and-out.png), [colorblind](phase-3/colorblind.png) | Đạt (kiểm bằng mắt) |
| 2 | fuel < 30 mất vùng an toàn; đúng 30 vẫn còn | P3-06 (fuel 31 → 30.0 ở tick 60 vẫn chặn; tick 61 mất) | Đạt |
| 2 | Chỉ bóng `wander` chọn đèn yếu; ≤ 2 m → `drain`, hút 5/s cộng dồn, đèn vẫn hao 1/s | P3-07, P3-08 (1 con tắt ở tick 291, 2 con ở tick 160 — đúng số học) | Đạt |
| 2 | `fuel_drain` mỗi 60 tick khi đang hút | P3-07 (tick 61, fuel 23.0) | Đạt |
| 2 | Từ `drain`: chase khi Mây ≤ 6 m; stunned khi trúng Tỏa Sáng; wander khi đèn tắt / châm ≥ 30 / cách > 2 m | P3-07, P3-09 | Đạt |
| 2 | Châm lên ≥ 30 khi có bóng trong 6 m → đẩy ra mép ≤ 30 tick, không sát thương | P3-09 | Đạt |
| 3 | Thời lượng 240/270/300; thắng `dawn_survived` khi sáng ≥ ceil(0.6 × tổng) (3/5, 4/6, 5/7); không thắng sớm | P3-01, P3-10, R-14 (đã sửa) | Đạt |
| 3 | Hết lửa ở tick bình minh vẫn thua `no_flames` | P3-11 | Đạt |
| 4 | Sức chứa 10 + 2 × lần thắp thành công (tính cả thắp lại), tối đa 20; đèn đặt sẵn không tính; HUD `mang/sức chứa` | P3-12; ảnh (HUD "7/16") | Đạt |
| 5 | Điểm mới: +5/đom đóm, +100 thắp đầu, +40 thắp lại, Tỏa Sáng +5 / +15 nếu đang drain, bình minh +50+floor(fuel)/đèn sáng, +50/lửa; bỏ thưởng thời gian | R-05 (150), P3-04 (65), P3-05 (25), P3-09 (15), P3-10 (597) | Đạt |
| 6 | Bảng màu dễ phân biệt (lưu): viền/mắt Bóng Mực #00B3FF, cảnh báo #FFFFFF + ⚠, đèn tắt xẹp 20% + rách, đèn sắp hết dầu nhấp nháy | Ảnh [colorblind](phase-3/colorblind.png) (viền xanh, "⚠ 00:24" trắng); cài đặt dùng chung cơ chế lưu đã kiểm ở P2-23 | Đạt |
| 7 | Contract v1.2: tuning, snapshot (`fuel`, `ever_lit`, `relit_count`, `capacity`, `drain`), scenario (`lit/fuel/ever_lit`, `successful_lights`, `target_lantern_id`), sự kiện mới | P3-01…P3-13 | Đạt |
| DoD | Hồi quy Phase 1–2 không bị thay thế vẫn đạt | 46 test cũ không đổi vẫn xanh | Đạt |

## Test cũ đã sửa vì luật bị thay ([THAY THẾ] trong Ticket-03)
| Test | Trước | Sau | Lý do |
|---|---|---|---|
| R-05 | điểm 200, `lantern_lit {lantern_id}` | điểm 150, thêm `relight:false` | Công thức điểm mới (+5/đom đóm); v1.2 thêm `relight` |
| R-14 | thắng `all_lit` ở tick 1 + thưởng thời gian | thắp đèn cuối **không** kết thúc Đêm | Bỏ thắng sớm; luật thắng mới kiểm ở P3-10 |
| P2-01 | contract 1.1, Đêm 2/3 = 330/360 | chỉ kiểm khóa dash | Version và thời lượng chuyển sang P3-01 |
| P2-07 | 300/330/360 s | 240/270/300 s | Ticket-03 đổi thời lượng |

Không có test nào bị `skip`.

## Chưa đạt / giới hạn
- Chưa thử trên macOS/Linux thật; GitHub Actions vẫn bị khóa (billing) → `npm run verify` + pre-push hook.
