# Triển khai trên Vercel

Import kho NLHDawn2004/PROSTANDING-FF, chọn Framework Preset: Other, không đặt Output Directory hay Build Command.

Thêm hai biến môi trường cho Production và Preview trước khi Deploy:

- AUTH_ACCOUNTS_JSON: toàn bộ nội dung accounts.json đang giữ riêng trên máy (chứa hai tài khoản và mật khẩu băm).
- SESSION_SECRET: chuỗi ngẫu nhiên tối thiểu 32 ký tự; dùng cùng giá trị giữa các lần triển khai để giữ phiên.

Không commit hai giá trị này vào Git. Có thể tạo SESSION_SECRET bằng `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` trên máy của bạn.

Mọi đường dẫn được chuyển qua hàm máy chủ, gồm cả giao diện và ảnh nền, để yêu cầu đăng nhập. Cookie đăng nhập có HttpOnly, SameSite=Strict, Secure và thời hạn 12 giờ. Đăng xuất xóa cookie trên trình duyệt hiện tại. Đổi mật khẩu băm hoặc SESSION_SECRET để vô hiệu hóa phiên cũ.

Dữ liệu bảng điểm vẫn lưu trong trình duyệt đang dùng; đăng nhập trên thiết bị khác không tự đồng bộ bảng điểm. Giới hạn thời gian mỗi yêu cầu trên Vercel là 300 giây; danh sách quá lớn cần tải theo nhiều đợt nếu vượt thời gian này.

Sau triển khai, kiểm tra trang /login, cả hai tài khoản, API Match Stats và xuất PNG trước khi dùng trực tiếp.

## Preview OBS/vMix

Connect a private Vercel Blob store to this project for Production and Preview. The official @vercel/blob SDK uses BLOB_STORE_ID and Vercel OIDC automatically; do not commit tokens. SESSION_SECRET must stay stable across deployments to preserve preview links. Local runs store frames and a signing secret in .broadcast/ (ignored by Git).

Keep the control page open for automatic updates. Generate a new link once after upgrading from the old memory-only Preview. Anyone holding a preview link can view the output; publishing images and control commands requires login. The server retains three recent frame versions.
