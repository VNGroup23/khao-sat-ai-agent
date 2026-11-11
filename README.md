# Khảo sát GPCN · VNGroup

Phiếu khảo sát online của Phòng GPCN, bắt đầu với **Khảo Sát Thực Trạng Sử Dụng AI Agent (2026)**.
Mọi người mở link, trả lời rồi nhấn **Gửi**. Câu trả lời được lưu vào Supabase. Phòng GPCN xem tổng hợp
và xuất Excel ở trang admin.

| Trang | Link |
|---|---|
| Khảo sát | https://vngroup23.github.io/khao-sat-ai-agent/ |
| Tổng hợp (GPCN) | https://vngroup23.github.io/khao-sat-ai-agent/admin.html |

## Cấu trúc

- `index.html`: trang khảo sát (giao diện và nội dung giữ theo bản gốc của GPCN)
- `admin.html`: trang tổng hợp có mật khẩu. Có biểu đồ từng câu, lọc theo đơn vị, phòng ban và mức độ dùng,
  danh sách phản hồi, xuất CSV/JSON, đóng hoặc mở khảo sát, mã QR
- `config.js`: **sửa câu hỏi, tiêu đề, liên hệ ở đây**. Sau khi sửa, tăng số `?v=` trong hai trang
- `api.js`: gọi các hàm `survey_*` trên Supabase
- `supabase/schema.sql`: bảng nằm trong schema `survey`, không lộ ra API. Trang web chỉ gọi được các hàm `public.survey_*`

Dùng chung Supabase project với minigame 23 năm. Nếu chạy lại `schema.sql` của minigame thì phải chạy lại
file schema của khảo sát, vì file của minigame thu hồi quyền mọi hàm trong `public`.

## Lệnh

```sh
npm install
npm run dev                                   # xem thử trên máy với dữ liệu giả, mật khẩu admin: test
npm run db -- apply supabase/schema.sql       # tạo hoặc cập nhật bảng và hàm (chạy lại nhiều lần vẫn an toàn)
npm run db -- set-admin-key                   # đặt mật khẩu admin = SURVEY_ADMIN_KEY trong .env.local
npm run smoke                                 # kiểm tra API thật, chạy trong transaction rồi rollback
npm run qr                                    # tạo lại qr.png / qr.svg sau khi đổi SURVEY_URL
```

`.env.local` (không commit) chứa `DB_PASSWORD_ENC`, `SUPABASE_REF` và `SURVEY_ADMIN_KEY`.

## Đưa lên mạng

GitHub Pages phục vụ thẳng từ nhánh `main` (không có bước build). Mỗi lần `git push` thì khoảng 1 phút sau
trang được cập nhật.

## Thêm một khảo sát mới

Tạo một bản sao của repo này. Trong `config.js`, đổi `SURVEY_ID`, `SAVE_KEY` và `QUESTIONS`. Sau đó chạy
`npm run db -- add-survey <id> "<tiêu đề>"`. Các khảo sát dùng chung bảng và được phân biệt bằng `survey_id`.
