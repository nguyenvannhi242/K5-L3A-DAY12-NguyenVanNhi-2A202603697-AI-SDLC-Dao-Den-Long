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

## Phase 2 (Ticket-02, contract v1.1)

Ticket-02 làm rõ/thay các giả định A1, A2, A9, A11, A13, A15 (đã khớp vì Phase 1 dùng sẵn số chuẩn). A10 đổi: Tỏa Sáng đo **3D** từ chân + 0.8 m.

| # | Chỗ mơ hồ | Giả định | Ghi chú |
|---|---|---|---|
| B1 | Thời điểm `night_start` | Ghi ở **tick 0** ngay sau snapshot đầu (trước bước đầu tiên) | Dựng scenario vẫn không phát sự kiện nào khác |
| B2 | Điểm xuất phát Đêm 2/3 | Đêm 2: (0,0,0). Đêm 3: **(0,0,−30)** vì (0,0,0) nằm trong tháp chuông và dưới tầng 2; hồi sinh cũng ở đây | Hỏi trợ giảng nếu có quy định khác |
| B3 | "Vách đứng" và dốc | Đi bộ lên được nếu chênh cao ≤ 0.35 m mỗi bước (dốc 0.5 m/m), cao hơn là vách chặn; tháp chuông xử lý như vách cao 14 m | |
| B4 | Lướt trên không | Giữ nguyên độ cao trong 12 tick (vy = 0); hết lướt thì rơi từ vy = 0 | Không ghi rõ vy sau lướt |
| B5 | Bục nhảy | Kích hoạt khi chân Mây đứng trên bục (XZ ≤ 1 m, chênh cao ≤ 0.35) ở cuối bước di chuyển; vận tốc phóng hiện trong snapshot của chính tick đó | |
| B6 | Độ cao Bóng Mực / Gió Lạc | Bay ở mặt đất bên dưới + 1.0 m / + 1.5 m, không bị vách chặn; mặt đất của Bóng Mực trên tháp tính là tầng 2 | Chênh cao khi chạm: chân Mây so với mặt đất dưới Bóng Mực |
| B7 | Gió Lạc `idle` | Lượn 2 m/s tới một điểm sương ngẫu nhiên (theo seed), tới nơi thì chọn điểm khác. Tỏa Sáng trúng con `idle` không có tác dụng | Ticket chỉ quy định chase/flee |
| B8 | Gió Lạc biến mất | Rời danh sách `drifters` ở đúng tick hết hạn (cướp: +240; bị Tỏa Sáng thả đồ: +120 kể từ tick đó) | Không giữ trạng thái `removed` trong snapshot |
| B9 | `player.invuln` trong snapshot | Boolean (đang bất tử hay không) | Các trường khác đều có hậu tố `_s` |
| B10 | `player_hit` khi rơi | `dropped: 0, lost: <số đom đóm bị mất>` | Đom đóm mất, không rơi ra đất |
| B11 | Gió | Cơn gió bắt đầu ở tick 1800, 3600… (theo `sim_tick`), hướng `dir_deg` ngẫu nhiên theo seed, cùng quy ước góc với bản đồ; cộng 2 m/s vào vận tốc ngang (cả khi lướt/bay) | |
| B12 | Bóng Mực sinh cách Mây ≥ 15 m | Áp dụng cho cả 3 Đêm | Ticket chỉ nêu ở Đêm 1 |
| B13 | Sinh Gió Lạc | Ở một điểm sinh Bóng Mực ngẫu nhiên (theo seed); không cần cách xa Mây | |
| B14 | Scenario `charms` | `{id, pos?, available?, respawn_ticks? | respawn_s?}`; id mặc định của Đêm thì được bỏ `pos` | |
| B15 | Scenario `drifters` | `{id?, pos, state?, stolen?, state_ticks_left?}`; `state_ticks_left` của `flee` = tick biến mất | |

## Phase 3 (Ticket-03, contract v1.2)

Ticket-03 thay A13/A14 (luật thắng, điểm) và thời lượng Đêm. Giả định mới:

| # | Chỗ mơ hồ | Giả định | Ghi chú |
|---|---|---|---|
| C1 | Khóa điểm trong `tuning.score` | Giữ 5 khóa cũ (`per_mote` 5, `per_second_left` 0) và thêm `per_relight` 40, `per_stun_draining` 15, `per_lit_lantern_dawn` 50 | Ticket không liệt kê khóa điểm mới |
| C2 | `refuel.amount` | Số đom đóm dùng (`used`); `refuel.fuel` là dầu sau khi châm (1 chữ số) | |
| C3 | "Đèn đầy dầu không được chọn" | Bước 2 trừ dầu trước bước 5, nên đèn chỉ đầy đúng 100 trong tick vừa châm/thắp; khi đó không được chọn | Theo đúng thứ tự tick |
| C4 | `fuel_drain` | Mỗi Bóng Mực ghi riêng sau mỗi 60 tick hút liên tục (tick hút thứ 60, 120…); bộ đếm về 0 khi rời `drain` | |
| C5 | Bóng `drain` | Đứng yên, không gây sát thương (chỉ wander/chase gây sát thương); chuyển `chase` khi Mây ≤ 6 m | |
| C6 | Scenario `drain` thiếu `target_lantern_id` | Lấy đèn sáng gần nhất | |
| C7 | Scenario `lit:true` | Luôn `ever_lit = true`; thiếu `fuel` → 100; `lit:false` → fuel 0 | Ticket: "lit:true mà không có fuel → 100" |
| C8 | Dầu khi thắng | `floor(fuel)` theo dầu tại tick bình minh (sau khi trừ dầu của tick đó) | |
