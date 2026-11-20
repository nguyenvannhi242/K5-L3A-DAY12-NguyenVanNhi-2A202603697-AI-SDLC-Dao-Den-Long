# Giả định theo phase

## Phase 1 (PRD-0, contract v1.0)

| # | Chỗ mơ hồ | Giả định | Ghi chú |
|---|---|---|---|
| A1 | Mọi số liệu gameplay | Dùng số chuẩn Ticket-02 (tốc độ 6, sức chứa 10, đèn 10, tỏa sáng 3/5 m/3 s, choáng 2 s, đẩy 4 m, an toàn 6 m, bất tử 1.5 s, rơi 0.5, Bóng Mực 4 m/s, đêm 300 s, 3 Ngọn Lửa) | Phase 2 không phải đổi số → hồi quy dễ |
| A2 | Bản đồ Đêm 1 | Đảo tròn R=40 tâm gốc tọa độ; đèn L1–L5 theo tọa độ chuẩn; 24 điểm đom đóm (8 ở r12, 16 ở r33); 12 điểm Bóng Mực ở r37 | |
| A3 | Hướng góc | Điểm ở góc a = (r·cos a, 0, r·sin a) — khớp tọa độ đèn chuẩn (L1 ở 90° = (0,0,25)) | |
| A4 | Gia tốc | Đạt tốc độ ngay trong 1 tick (thỏa "≤ 0.1 s"); dừng ngay | Dễ dự đoán cho test |
| A5 | "Máu" | = Ngọn Lửa (`flames`), 3 | |
| A6 | Độ cao Bóng Mực | Tâm ở Y = 1.0; chạm khi XZ ≤ 1.0 và \|Y chân Mây − Y tâm bóng\| ≤ 1.5 | |
| A7 | Bóng Mực khi không đuổi (`wander`) | Đi 2 m/s về đèn chưa sáng gần nhất, dừng cách 2 m | Ticket-03 nhắc "đi về đèn tắt gần nhất như trước" |
| A8 | Bóng Mực mới sinh | Trạng thái `spawning` 60 tick: đứng yên, không gây sát thương | |
| A9 | Phát hiện/bỏ đuổi | Đuổi khi ≤ 12 m, bỏ khi > 18 m | Ticket-02 |
| A10 | Tỏa Sáng | Mục tiêu trong `pulse_radius` theo **XZ** (contract v1.0: mọi khoảng cách tuning đo trên XZ); kích hoạt cả khi không trúng con nào (vẫn tốn 3, phát `pulse` với mảng rỗng); trúng cả con đang choáng/spawning | Ticket-02 đổi sang 3D từ tâm Mây+0.8 m — sẽ đổi ở Phase 2 |
| A11 | Bị chạm | Đom đóm rơi ra vành 1.5–2.5 m, tồn tại 480 tick; Bóng Mực vừa chạm lùi 2 m trong 60 tick (`recoil`) rồi đuổi tiếp | Ticket-02 |
| A12 | Rơi khỏi đảo | Ngoài R=40 không có đất; Y < −10 → −1 lửa, mất hết đom đóm, chờ 60 tick, hồi sinh (0,0,0), bất tử 90 tick. `player_hit.dropped` = số đom đóm bị mất | |
| A13 | Thắng & hết giờ cùng tick | Kiểm tra: hết lửa → thua; tất cả sáng → thắng; hết giờ → thua `dawn` | Ticket-02 |
| A14 | Điểm khi thắng | +floor(giây còn lại)×2 + 50×Ngọn Lửa còn lại | |
| A15 | Lịch sinh | Đom đóm: 20 ban đầu, +1 ở tick 240, 480… (trần 30). Bóng Mực: 2 ở tick 300, rồi 1 mỗi 480 tick, tối đa 6, cách Mây ≥ 15 m | |
| A16 | Scenario `lit: true` không kèm `deposited` | deposited = 10 | |
| A17 | Snapshot khi game kết thúc giữa chu kỳ | Không ghi snapshot thêm; dòng `end` luôn có | |
| A18 | Seed của bản chơi | Bản chơi dùng seed ngẫu nhiên; headless dùng `--seed` | |
