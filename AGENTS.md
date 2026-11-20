# AGENTS.md — Đảo Đèn Lồng

Game 3D (Three.js + Electron) có chế độ headless theo Test Contract (hiện **v1.1**, 3 Đêm). Yêu cầu: `docs/lab/` + lab board; spec phase hiện tại: `docs/notes/phase-2-spec.md`; kế hoạch: `docs/notes/plan.md`.

## Lệnh
- Cài: `npm ci` · Chạy game: `npm start` · Dev web: `npm run dev`
- Test (bắt buộc xanh trước khi xong việc): `npm test` · CI trên máy: `npm run verify` (pre-push hook; GitHub Actions bị khóa)
- Headless: `node headless/run.js --seed 1 --night <1|2|3> --ticks 600 --out tmp/out.jsonl [--inputs f] [--scenario f]`
- Bằng chứng/ảnh/FPS: skill `.claude/skills/verify-proof/SKILL.md` (`scripts/shot.cjs`)

## Cấu trúc
- `src/sim/` logic thuần, 60 tick/s. `tuning.js` (TUNING = contract, RULES = hằng nội bộ), `maps.js` (3 bản đồ chuẩn, `surface(x,z)`), `game.js` (luật, thứ tự tick theo Ticket-02), `output.js` (JSONL).
- `src/render/` chỉ đọc state sim để vẽ + luồng màn hình/âm thanh/cài đặt. `headless/` CLI. `electron/` vỏ cửa sổ.
- `tests/*.test.js`: `gameplay` (Phase 1, R-xx), `phase2` (P2-xx), `headless`, `contract`. Mỗi test gameplay = scenario chạy headless thật qua `tests/helpers.js#play`.

## Quy tắc cứng
- `src/sim/` KHÔNG import three/DOM/electron, KHÔNG dùng `Math.random`/`Date` → `g.rng`.
- Đổi số trong `TUNING` thì đổi `game.contract.json` cùng commit (test `contract.test.js` kiểm).
- Thứ tự trong tick là bắt buộc (Ticket-02): input(pause trước) → bộ đếm → Mây → nhặt → đèn → vùng an toàn → Tỏa Sáng → bóng/Gió Lạc → chạm (Gió Lạc trước) → sinh → thắng/thua → snapshot.
- Hẹn giờ biến mất/hồi chiêu đặt trong một bước rồi bị trừ ngay ở bước sau trong cùng tick → dùng mốc `sim_tick` tuyệt đối (đã sai 1 lần ở Gió Lạc).
- Khi viết scenario test trên bản đồ có bục nhảy/vách: kiểm tra đường đi không cắt qua bục (đã sai 1 lần ở P2-10).
- Tọa độ output làm tròn 3 số. Inputs/scenario sai định dạng → exit 2.
- Phần sáng tạo chỉ ở `src/render/`, không đổi output headless.
- Không bịa yêu cầu: trích nguyên văn ticket; chỗ mơ hồ ghi `docs/notes/assumptions.md` (A* Phase 1, B* Phase 2).
- Không sửa test để cho qua; test cũ bị luật mới thay → sửa kèm `// [Phase N sửa] lý do` + CHANGELOG.
- Commit nhỏ, mỗi commit một việc.
