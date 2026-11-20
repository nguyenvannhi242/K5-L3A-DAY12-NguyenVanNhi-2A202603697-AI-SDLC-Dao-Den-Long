# Credits

## Asset
Game **không dùng file asset ngoài** (không ảnh, mô hình, font hay âm thanh tải về).

| Thành phần | Nguồn | Giấy phép |
|---|---|---|
| Mô hình 3D (đảo, Mây, đèn lồng, Bóng Mực, Gió Lạc, Bùa Gió, tháp chuông) | Tự dựng bằng hình khối Three.js trong `src/render/world.js`, `src/render/instanced.js` | MIT (repo này) |
| Âm thanh và nhạc nền | Tự tổng hợp bằng WebAudio trong `src/render/audio.js` (oscillator, không có file âm thanh) | MIT (repo này) |
| Bảng màu | Theo bảng màu chuẩn Ticket-02 / Ticket-03 của lab | — |
| Nhân vật, bối cảnh, lời thoại gốc | Bài lab Day 12 AI SDLC "Đảo Đèn Lồng" | Thuộc lab |
| Lời thoại Ông Đăng mỗi Đêm, tên màn Bình Minh | Viết mới cho repo này | MIT |

## Thư viện
| Thư viện | Dùng cho | Giấy phép |
|---|---|---|
| [three.js](https://threejs.org) r170 | Hiển thị 3D | MIT |
| [Electron](https://www.electronjs.org) 33 | Cửa sổ game, bench, lưu bảng xếp hạng | MIT |
| [Vite](https://vitejs.dev) 6 | Build bản web | MIT |
| Node.js `node:test` | Test | MIT |

## Công cụ AI
| Công cụ | Dùng để |
|---|---|
| Claude Code (Anthropic), model Claude Opus | Lập kế hoạch, viết mã sim/render/headless/test, viết tài liệu, chụp ảnh bằng chứng. Mọi đầu ra được kiểm bằng test headless, ảnh chụp từ bản build thật và số đo (xem `docs/notes/ai-log.md`). |

Không có hình ảnh hay âm thanh nào do AI sinh ra (âm thanh là tổng hợp bằng code).
