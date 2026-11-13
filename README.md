# 🐺 MA SÓI ONLINE – ANIMATION + THẺ BÀI 3D (V2)

Website Ma Sói tiếng Việt chơi đa thiết bị, **5–30 người/phòng**. Không cần tài khoản; chủ phòng tự chọn số lượng từng vai; chia bài bí mật; nhân vật 2D có hoạt ảnh và thẻ bài lật **3D bằng CSS**. Có thể chạy trên Node.js/Render.

## Các cảnh đồ họa mới

1. **Phòng chờ – đống lửa:** tất cả người chơi xuất hiện thành nhân vật riêng quanh lửa trại, chuyển động thở/chớp mắt. Từ 19–30 người sắp thành **hai vòng** để không chồng lên nhau.
2. **Đêm – ngôi làng đi ngủ:** avatar mỗi người nằm ngủ bên trong căn nhà/phòng nhỏ. Ở bảng kỹ năng cá nhân, nhân vật của **người đang tới lượt** sẽ thức dậy. Lượt mở theo thứ tự **Bảo Vệ → Ma Sói → Tiên Tri → Phù Thủy**, tự bỏ qua vai không có người còn sống. Chủ phòng chủ động chuyển lần lượt; người chưa tới lượt không thể sử dụng kỹ năng. Thợ Săn và Dân Làng không có kỹ năng ban đêm.
3. **Ngày – hội đồng làng:** tất cả còn sống tập trung quanh đống lửa, người chơi có thể **chạm vào avatar** hoặc chọn trong danh sách để chọn mục tiêu. Sau khi nhấn **XÁC NHẬN VOTE**, avatar người bỏ phiếu sẽ **chỉ tay về người đã chọn**, cùng một đường chỉ hướng. **Phiếu bầu công khai cho cả phòng** để có thể diễn hoạt theo mục tiêu; có thể đổi phiếu trước khi chủ phòng đóng biểu quyết.
4. **Kết thúc:** sân khấu thể hiện phe chiến thắng (Ma Sói hoặc Dân Làng), thông báo phe mình thắng/thua, avatar phe thắng ăn mừng, công bố vai tất cả người chơi.

**Thẻ bài bí mật 3D:** mỗi người chỉ được nhận vai của mình từ máy chủ. Nhấn lá bài để lật và xem vai; nhấn lại để úp. Sói nhìn được đồng đội Sói sau khi lật bài. Trang chủ sử dụng tiêu đề phong cách chữ xước/vết cào.

**Xem trước không cần 5 người:** nhấn **XEM TRƯỚC 4 HOẠT CẢNH** ngay ở trang chủ. Bản xem trước có 12 nhân vật ví dụ và không tạo ván chơi thật.

## Chạy trên máy tính

Cài **Node.js 18+**, sau đó trong thư mục chứa `server.js`:

```bash
node server.js
```

Mở `http://localhost:3000`. Với Windows, có thể nhấp đúp `CHAY-WINDOWS.bat`. Không cần thêm thư viện ngoài. Để chạy bộ kiểm thử:

```bash
npm test
```

## Đưa lên GitHub + Render miễn phí

**Quan trọng: giải nén ZIP và tải các file BÊN TRONG lên GitHub, không tải nguyên ZIP.**

**Nếu Repository đã chứa `ma-soi-online/`** và Render đang đặt **Root Directory** = `ma-soi-online`: hãy thay các file trong thư mục `ma-soi-online/` đó bằng file của phiên bản này (gồm `public/scenes.js` mới), giữ nguyên Root Directory trên Render.

**Nếu Repository đặt `server.js` và `package.json` ngay thư mục gốc**: tải các file v2 ngay thư mục gốc và đặt Root Directory trên Render **để trống**.

Render Web Service cấu hình:

| Render Settings | Giá trị |
|---|---|
| Runtime / Language | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Plan | Free (nếu còn khả dụng trong tài khoản) |
| Root Directory | Theo vị trí chứa `package.json` như bên trên |

Sau khi GitHub nhận commit mới, Render có thể tự deploy nếu Auto Deploy bật; nếu không, chọn **Manual Deploy → Deploy latest commit**. Chi tiết từng bước tại [HUONG-DAN-CAP-NHAT-GITHUB-RENDER.md](HUONG-DAN-CAP-NHAT-GITHUB-RENDER.md).

## Luật chơi và giới hạn

- **5–30 người/phòng**, 6 vai: Ma Sói, Tiên Tri, Phù Thủy, Bảo Vệ, Thợ Săn, Dân Làng.
- **Chia bài:** chủ phòng chọn đúng số lượng lá bằng số người; số Ma Sói phải ít hơn nửa phòng.
- **Ban đêm:** Bảo Vệ cứu một người (không cùng người hai đêm liên tiếp); Ma Sói bỏ phiếu chọn nạn nhân; Tiên Tri soi 1 người; Phù Thủy dùng 1 bình cứu/1 bình độc trong cả ván. Các lựa chọn kỹ năng **riêng tư**. Chủ phòng chuyển lượt, có thể chuyển ngay nếu người chơi bỏ qua/mất kết nối. Nếu đêm không có nạn nhân hoặc nạn nhân được cứu, không ai bị Sói loại.
- **Ban ngày:** chat, bỏ phiếu **công khai để nhân vật có thể chỉ tay**; trường hợp hòa cao nhất không ai bị loại.
- **Thợ Săn:** khi bị loại được bắn thêm một người; người mất kết nối có thể được chủ phòng bỏ qua.
- **Chiến thắng:** hết Ma Sói → phe Dân Làng thắng; số Sói còn sống bằng hoặc nhiều hơn số người còn lại → phe Ma Sói thắng.
- **Thiết bị di động:** cảnh hỗ trợ **vuốt ngang** để xem trọn vòng tròn 30 người trên màn hình nhỏ; các bảng chức năng phía dưới responsive.
- **Âm thanh:** chưa có âm thanh/voice chat; đây là phiên bản hoạt họa vector SVG/CSS và thẻ 3D, **không phải mô hình 3D toàn cảnh**.
- **Render Free:** có thể ngủ/ngắt/khởi động lại, ván đang chơi **không được lưu sau khi server restart** vì trạng thái phòng lưu trong RAM. Phòng đã tạo sẽ không tồn tại nếu máy chủ bị khởi động lại. Cần database và hạ tầng ổn định hơn nếu muốn vận hành liên tục quy mô lớn.

## Cấu trúc mã nguồn

```text
server.js                         HTTP + SSE realtime + luật chơi + tuần tự lượt kỹ năng
package.json                      npm start / npm test
render.yaml                       tùy chọn khai báo Render Blueprint
CHAY-WINDOWS.bat                  mở máy chủ trên Windows
HUONG-DAN-CAP-NHAT-GITHUB-RENDER.md
public/
  index.html                      Trang HTML
  style.css                       Giao diện/hiệu ứng 3D/animation
  app.js                          Tương tác, phòng, vai và chọn người
  scenes.js                       Vẽ cảnh 4 giai đoạn và avatar SVG
 test/
  server.test.js                  10 bài kiểm thử server + kiểm tra 30 vị trí
```

Tất cả nhân vật và hiệu ứng được tạo bằng code **SVG/CSS**, không cần tải mô hình 3D nặng và không yêu cầu thư viện web bên ngoài.
