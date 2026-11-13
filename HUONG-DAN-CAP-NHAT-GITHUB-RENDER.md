# Hướng dẫn cập nhật game Ma Sói V2 lên GitHub & Render

## Bước 1 — Giải nén

Tải ZIP mới rồi bấm **Extract All** trên Windows. Trong thư mục giải nén phải thấy:

- `server.js`
- `package.json`
- `public` (gồm `index.html`, `style.css`, `app.js`, **`scenes.js` mới**)
- `test`, `README.md` và các file phụ.

**Không tải trực tiếp file .zip lên GitHub.**

## Bước 2 — Cập nhật repository `Masoi` trên GitHub

1. Vào GitHub → Repository **Masoi** của bạn.
2. **Kiểm tra vị trí file cũ:**
   - **Trường hợp A:** nhìn thấy thư mục `ma-soi-online` ở gốc repo, mở thư mục đó. Nếu Render đang đặt Root Directory là `ma-soi-online`, **giữ nguyên thư mục này**.
   - **Trường hợp B:** nhìn thấy ngay `server.js` và `package.json` ở gốc repo, **giữ nguyên kiểu bố trí này**.
3. Trong đúng thư mục chứa `package.json` cũ, chọn **Add file → Upload files**.
4. Từ thư mục vừa giải nén, **kéo toàn bộ file và các thư mục bên trong** vào màn hình Upload của GitHub (nhất là `server.js`, `public/app.js`, `public/style.css`, `public/index.html`, `public/scenes.js`). Chấp nhận ghi đè file cũ nếu được hỏi. Nếu trình duyệt không cho tải cả thư mục `public` ghi đè, hãy vào `public` trên GitHub và lần lượt cập nhật 4 file bên trong, tạo mới `scenes.js`.
5. Bấm **Commit changes** trên nhánh `main`.

**Kết quả đúng:** trong cùng thư mục phải thấy `server.js`, `package.json` và `public/`. Bên trong `public/` có **4 file**: `index.html`, `app.js`, `style.css`, `scenes.js`.

## Bước 3 — Render tự nhận code mới

Mở **dashboard.render.com** → chọn Web Service Ma Sói → **Settings**:

| Mục | Giá trị |
|---|---|
| Root Directory | `ma-soi-online` nếu mã nguồn nằm trong thư mục đó; ngược lại để trống |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Branch | `main` |

**Không điền số `0` tại Start Command.** Nếu bạn thay đổi Settings, hãy bấm Save. Nếu dịch vụ không tự deploy sau khi commit: **Manual Deploy → Deploy latest commit**.

Đợi trạng thái dịch vụ thành **Live** rồi mở lại URL `.onrender.com` cũ. Bạn **không cần tạo Web Service mới** chỉ để cập nhật đồ họa.

## Bước 4 — Thử tính năng

1. Mở trang chủ, xác nhận tiêu đề **MA SÓI** có ba vết cào.
2. Bấm **XEM TRƯỚC 4 HOẠT CẢNH**, chuyển thử 4 cảnh.
3. Thử trên điện thoại; **vuốt ngang sân khấu** khi phòng đông người.
4. Để thử ván thật cần ít nhất 5 người (hoặc 5 trình duyệt/phiên độc lập để thử). Chủ phòng bắt đầu và lần lượt chuyển kỹ năng đêm. Ban ngày chạm avatar → **XÁC NHẬN BỎ PHIẾU** để thấy tay chỉ người bị chọn.

**Lưu ý:** Những phòng/ván đang chơi trên Render có thể bị mất khi deploy phiên bản mới. Hãy cập nhật lúc không có ván đang diễn ra.
