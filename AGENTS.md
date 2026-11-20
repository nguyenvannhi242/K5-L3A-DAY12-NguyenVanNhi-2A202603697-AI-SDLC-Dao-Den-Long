# AGENTS.md — Đảo Đèn Lồng

Game 3D (Three.js + Electron) có chế độ headless theo Test Contract (hiện **v1.3**: 3 Đêm, đèn có dầu, bench, soak, bảng xếp hạng). Yêu cầu: `docs/lab/` + lab board; spec: `docs/notes/phase-2-spec.md`, ADR `docs/adr/`; kế hoạch: `docs/notes/plan.md`.

## Lệnh
- Cài: `npm ci` · Chạy game: `npm start` (= build + `node scripts/launch.cjs`) · Dev web: `npm run dev`
- Bench: `npm run bench` · Soak: `npm run soak` · Export bảng xếp hạng: `node scripts/launch.cjs --export-leaderboard out.json`
- Test (bắt buộc xanh trước khi xong việc): `npm test` · CI trên máy: `npm run verify` (pre-push hook; GitHub Actions bị khóa)
- Headless: `node headless/run.js --seed 1 --night <1|2|3> --ticks 600 --out tmp/out.jsonl [--inputs f] [--scenario f]`
- Bằng chứng/ảnh/FPS: skill `.claude/skills/verify-proof/SKILL.md` (`node scripts/launch.cjs --shot out.png --setup scripts/shots/x.js --wait ms`)

## Cấu trúc
- `src/sim/` logic thuần, 60 tick/s. `tuning.js` (TUNING = contract, RULES = hằng nội bộ), `maps.js` (3 bản đồ chuẩn, `surface(x,z)`), `game.js` (luật, thứ tự tick theo Ticket-02), `output.js` (JSONL).
- `src/render/` chỉ đọc state sim để vẽ + luồng màn hình/âm thanh/cài đặt. `headless/` CLI. `electron/` vỏ cửa sổ.
- `tests/*.test.js`: `gameplay` (Phase 1, R-xx), `phase2` (P2-xx), `phase3` (P3-xx), `phase4` (P4-xx), `headless`, `contract`. Mỗi test gameplay = scenario chạy headless thật qua `tests/helpers.js#play`.

## Quy tắc cứng
- `src/sim/` KHÔNG import three/DOM/electron, KHÔNG dùng `Math.random`/`Date` → `g.rng`.
- Đổi số trong `TUNING` thì đổi `game.contract.json` cùng commit (test `contract.test.js` kiểm).
- Thứ tự trong tick là bắt buộc (Ticket-02): input(pause trước) → bộ đếm → Mây → nhặt → đèn → vùng an toàn → Tỏa Sáng → bóng/Gió Lạc → chạm (Gió Lạc trước) → sinh → thắng/thua → snapshot.
- Hẹn giờ biến mất/hồi chiêu đặt trong một bước rồi bị trừ ngay ở bước sau trong cùng tick → dùng mốc `sim_tick` tuyệt đối (đã sai 1 lần ở Gió Lạc).
- Dầu đèn là số nguyên đơn vị 1/60 (`l.fuel`, tối đa 6000); bước 2 trừ dầu trước khi Mây di chuyển. Trước khi viết assert về tick/ngưỡng, tính tay số đơn vị (đã sai biên 2 lần ở P3).
- Khi viết scenario test trên bản đồ có bục nhảy/vách: kiểm tra đường đi không cắt qua bục (đã sai 1 lần ở P2-10).
- Tọa độ output làm tròn 3 số. Inputs/scenario sai định dạng → exit 2.
- Phần sáng tạo chỉ ở `src/render/`, không đổi output headless. Cảnh bench (`createBenchGame`) phải giữ đúng mô tả Ticket-04 và bỏ qua cài đặt người chơi.
- Không chạy app (launch/electron) trong cùng lệnh với script vá file: nếu vá lỗi, app vẫn mở và treo (đã xảy ra 1 lần). Luôn đặt `timeout`.
- Không bịa yêu cầu: trích nguyên văn ticket; chỗ mơ hồ ghi `docs/notes/assumptions.md` (A* Phase 1, B* Phase 2, C* Phase 3, D* Phase 4).
- Không sửa test để cho qua; test cũ bị luật mới thay → sửa kèm `// [Phase N sửa] lý do` + CHANGELOG.
- Commit nhỏ, mỗi commit một việc.
