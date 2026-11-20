# AGENTS.md — Đảo Đèn Lồng

Game 3D (Three.js + Electron) có chế độ headless theo Test Contract. Yêu cầu: `docs/lab/`, kế hoạch: `docs/notes/plan.md`.

## Lệnh
- Cài: `npm ci` · Chạy game: `npm start` · Dev web: `npm run dev`
- Test (bắt buộc xanh trước khi xong việc): `npm test` · CI trên máy: `npm run verify` (pre-push hook, GitHub Actions bị khóa)
- Test gameplay = scenario chạy headless thật qua `tests/helpers.js#play`; mỗi yêu cầu một test `R-xx` khớp `docs/proof/phase-N.md`
- Headless: `node headless/run.js --seed 1 --night 1 --ticks 600 --out tmp/out.jsonl [--inputs f] [--scenario f]`

## Cấu trúc
- `src/sim/` logic thuần, 60 tick/s cố định. `tuning.js` là nguồn số liệu duy nhất.
- `src/render/` chỉ đọc state sim để vẽ. `headless/` CLI + parse inputs. `electron/` vỏ cửa sổ.
- `tests/*.test.js` (node:test), `tests/scenarios/` file inputs/scenario dùng chung.

## Quy tắc cứng
- `src/sim/` KHÔNG import three/DOM/electron, KHÔNG dùng `Math.random`/`Date` → dùng `createRng(seed)`.
- Đổi số trong `tuning.js` thì đổi `game.contract.json` cùng commit (test `contract.test.js` kiểm).
- Đúng mô hình tick: snapshot tick 0 trước input; bước k đọc input tick k, sự kiện ghi tick k+1; dòng cuối luôn `end`.
- Tọa độ output làm tròn 3 chữ số. Inputs/scenario sai định dạng → exit 2.
- Phần sáng tạo không được đổi output headless (tắt khi headless).
- Không tự bịa yêu cầu: trích nguyên văn ticket; chỗ mơ hồ ghi vào `docs/notes/assumptions.md`.
- Không sửa test để cho qua; test cũ bị luật mới thay → sửa/xóa kèm lý do trong commit + notes.
- Commit nhỏ, mỗi commit một việc.
