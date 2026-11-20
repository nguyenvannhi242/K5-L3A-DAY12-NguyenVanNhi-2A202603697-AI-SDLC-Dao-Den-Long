# Đảo Đèn Lồng

> 🎬 Video demo: _(thêm ở Phase 4)_

Game 3D góc nhìn thứ ba: Mây, người giữ đèn nhỏ tuổi, gom đom đóm để thắp lại các Đèn Lồng Lớn trên 3 hòn đảo (Đảo Bến, Đảo Cau, Đảo Chuông) và né Bóng Mực, Gió Lạc trong sương đen. Bài lab Day 12 AI SDLC (đề gốc: [docs/lab/](docs/lab/README.md)).

![Đảo Chuông](docs/proof/phase-2/night3-tiers.png)

## Cài đặt và chạy (macOS / Linux / Windows, cần Node ≥ 20)

```bash
npm ci
npm start
```

`npm start` build bản web rồi mở cửa sổ Electron 1280×720.

## Điều khiển

| Phím | Hành động |
|---|---|
| W A S D | Di chuyển (theo hướng camera) |
| Chuột (bấm vào cửa sổ để khóa chuột) / ← → | Xoay camera (độ nhạy chỉnh trong Cài đặt) |
| Space | Nhảy |
| Shift | Lướt (14 m/s trong 0.2 s, hồi chiêu 1.5 s) |
| E | Nạp ánh sáng vào đèn gần nhất (trong 2 m) |
| F / chuột trái | Tỏa Sáng (tốn 3 đom đóm, bán kính 5 m, hồi chiêu 3 s) |
| Esc / P | Tạm dừng: Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu |

## Luật và cách tính điểm

- Chuỗi 3 Đêm: Đảo Bến (5 đèn, 5 phút) → Đảo Cau (6 đèn, 5:30, hai đảo nối bằng cầu tre, bục nhảy) → Đảo Chuông (7 đèn, 6 phút, 3 tầng, gió mạnh). Thắng Đêm 3 thấy màn hình Bình Minh với tổng điểm; thua thì chơi lại Đêm đó.
- Đi gần đom đóm (≤ 1 m) để tự nhặt, mang tối đa 10. Bấm E cạnh đèn để nạp; đèn cần 10 đom đóm (nạp nhiều lần được).
- Đèn đã sáng tạo vùng an toàn 6 m mà Bóng Mực không vào được. Bóng Mực chạm: −1 Ngọn Lửa, rơi một nửa số đom đóm, bất tử 1.5 s. Rơi khỏi đảo: −1 Ngọn Lửa, mất hết đom đóm.
- Gió Lạc (Đêm 2–3) cướp 3 đom đóm khi bạn mang ≥ 5; Tỏa Sáng làm nó bỏ chạy hoặc thả lại đồ. Bùa Gió (đỏ viền vàng): 10 s chạy nhanh và lướt không hồi chiêu.
- Thắng khi thắp hết đèn. Thua khi hết 3 Ngọn Lửa hoặc trời sáng.

| Sự kiện | Điểm |
|---|---|
| Mỗi đom đóm nạp vào đèn | +10 |
| Mỗi đèn thắp sáng | +100 |
| Mỗi Bóng Mực trúng Tỏa Sáng | +5 |
| Khi thắng: mỗi giây còn lại (làm tròn xuống) | +2 |
| Khi thắng: mỗi Ngọn Lửa còn lại | +50 |
| Tổng điểm game | Tổng điểm các Đêm đã thắng |

Mọi số liệu ở [src/sim/tuning.js](src/sim/tuning.js) và bản đồ ở [src/sim/maps.js](src/sim/maps.js), khai báo trong [game.contract.json](game.contract.json) (contract v1.1). Không có khóa nào khai `null`.

## Test, CI và headless

```bash
npm test          # 50 test: contract + scenario headless cho từng yêu cầu Phase 1–2
npm run verify    # CI trên máy: test + tất định cả đêm + build (cũng chạy tự động khi git push)
node headless/run.js --seed 1 --night 2 --ticks 600 --out out.jsonl [--inputs f.json] [--scenario f.json] [--snapshot-every 10]
```

Bật pre-push hook một lần sau khi clone: `git config core.hooksPath .githooks`.
Headless chạy logic 60 tick/s, không cần cửa sổ/GPU (1 Đêm 21 600 tick ≈ 0.4 s).

## Sáng tạo của tôi

- **Đảo sáng dần:** đèn đang nạp dở hắt sáng yếu theo tiến độ; nón lá của Mây có đèn lồng nhỏ là nguồn sáng thật, bùng sáng khi Tỏa Sáng.
- **Bóng Mực có mắt tím nhìn theo Mây**, viền đậm hơn khi đuổi, xám tím khi choáng, lớn dần khi đang xuất hiện.
- **Lời Ông Đăng** giới thiệu từng Đêm; **màn Bình Minh** chuyển màu trời; **nhạc nền ngũ cung** và hiệu ứng âm thanh tự tổng hợp (không dùng file ngoài).

Tất cả chỉ nằm ở phần hiển thị (`src/render/`), không đổi output headless: bằng chứng là 50 test headless và kiểm tra tất định vẫn đạt ([docs/proof/phase-2.md](docs/proof/phase-2.md)).

## Tài liệu

- Bằng chứng: [Phase 1](docs/proof/phase-1.md) · [Phase 2](docs/proof/phase-2.md) · Thay đổi: [CHANGELOG.md](CHANGELOG.md)
- Spec Phase 2: [docs/notes/phase-2-spec.md](docs/notes/phase-2-spec.md) · Giả định: [docs/notes/assumptions.md](docs/notes/assumptions.md) · Kế hoạch: [docs/notes/plan.md](docs/notes/plan.md)
- Nhật ký AI và token: [docs/notes/ai-log.md](docs/notes/ai-log.md) · Đánh giá phase: [docs/notes/evaluation.md](docs/notes/evaluation.md)
- Harness AI: [AGENTS.md](AGENTS.md), skill [verify-proof](.claude/skills/verify-proof/SKILL.md), hook test [.claude/settings.json](.claude/settings.json), CI trên máy [scripts/verify.mjs](scripts/verify.mjs) + [.githooks/pre-push](.githooks/pre-push), chụp bằng chứng [scripts/shot.cjs](scripts/shot.cjs)
