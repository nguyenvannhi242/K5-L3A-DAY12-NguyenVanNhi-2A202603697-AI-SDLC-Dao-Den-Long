# Đảo Đèn Lồng

> 🎬 Video demo: _(thêm ở Phase 4)_

Game 3D góc nhìn thứ ba: Mây gom đom đóm để thắp lại các Đèn Lồng Lớn và né Bóng Mực. Bài lab Day 12 AI SDLC (yêu cầu gốc trong [docs/lab/](docs/lab/README.md)).

## Cài đặt và chạy (macOS / Linux / Windows, cần Node ≥ 20)

```bash
npm ci
npm start
```

## Điều khiển

| Phím | Hành động |
|---|---|
| W A S D | Di chuyển |
| _(CP1)_ | Nhảy, tương tác, tỏa sáng |

## Test và headless

```bash
npm test
node headless/run.js --seed 1 --night 1 --ticks 600 --out out.jsonl [--inputs f.json] [--scenario f.json] [--snapshot-every 10]
```

Khai báo contract: [game.contract.json](game.contract.json).

## Cách tính điểm

_(CP1)_

## Sáng tạo của tôi

_(sau khi lõi đạt)_

## Tài liệu

- Kế hoạch: [docs/notes/plan.md](docs/notes/plan.md)
- Giả định: [docs/notes/assumptions.md](docs/notes/assumptions.md)
- Nhật ký AI và token: [docs/notes/ai-log.md](docs/notes/ai-log.md)
- Bằng chứng: [docs/proof/](docs/proof/README.md)
- Harness AI: [AGENTS.md](AGENTS.md), [.claude/settings.json](.claude/settings.json) (hook chạy test), [CI](.github/workflows/ci.yml)
