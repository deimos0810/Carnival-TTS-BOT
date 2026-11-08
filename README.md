# 🎪 Carnival TTS & GPO Stat Bot

Bot Discord đa năng kết hợp:
1. **Text-to-Speech (TTS):** Đọc tin nhắn bằng giọng **Tiếng Việt** và **English**, **chỉ đọc những ai có role được phân quyền**.
2. **Grand Piece Online (GPO) Stat Cap:** Tra cứu stat cap và build khuyến nghị của **Trái ác quỷ (Fruit)**, **Fighting Style (Melee)**, **Vũ khí (Weapon)**, v.v., kèm tính năng bot **đọc to stat cap trong voice**.
3. **Hoạt động 24/7:** Chạy Web Service miễn phí trên **Render** kết hợp **UptimeRobot** ping `/health` giữ bot không bao giờ "ngủ".

---

## ⚡ Bảng lệnh Slash Command

| Lệnh | Phân quyền | Mô tả |
|---|---|---|
| `/join` | Mọi người | Gọi bot vào kênh voice bạn đang đứng |
| `/leave` | Mọi người | Cho bot rời voice |
| `/skip` | Mọi người | Bỏ qua câu bot đang đọc dở |
| `/say <text> [lang]` | Có role TTS | Bot đọc một câu tùy ý trong voice |
| `/tts voice <lang>` | Mọi người | Tự chọn giọng đọc cá nhân: Tự động / English / Tiếng Việt |
| `/tts settings` | Mọi người | Xem toàn bộ cấu hình TTS hiện tại của server |
| `/tts addrole <role>` | Admin | **Thêm role được bot đọc tin nhắn** |
| `/tts removerole <role>` | Admin | Xoá role khỏi danh sách được đọc |
| `/tts addchannel <channel>` | Admin | Thêm kênh chat cho phép bot đọc |
| `/tts defaultlang <lang>` | Admin | Đặt giọng đọc mặc định của server |
| `/tts toggle <enabled>` | Admin | Bật / tắt chức năng TTS |
| `/tts sayname <enabled>` | Admin | Đọc tên người nói trước câu chat hay không |
| `/tts autojoin <enabled>` | Admin | Bot tự vào voice khi người có role chat |
| `/fruit info <mục> [speak] [lang]` | Mọi người | Xem stat cap; tuỳ chọn `speak:True` để bot đọc to trong voice |
| `/fruit list [category]` | Mọi người | Xem danh sách đã lưu (lọc theo Trái ác quỷ, Fighting Style, Vũ khí...) |
| `/fruit wiki <mục>` | Mọi người | Tra cứu thông tin trực tiếp từ GPO Fandom Wiki |
| `/fruit submit <mục> <chiêu> <giá trị>` | Mọi người | Đóng góp stat cap kèm link nguồn → gửi vào hàng đợi duyệt |
| `/fruit pending` | Editor | Xem danh sách đóng góp đang chờ duyệt |
| `/fruit approve <id>` | Editor | Duyệt và cập nhật đóng góp vào dữ liệu chính |
| `/fruit reject <id>` | Editor | Từ chối đóng góp |
| `/fruit set <mục> <chiêu> <giá trị>` | Editor | Sửa hoặc thêm trực tiếp stat cap một chiêu |
| `/fruit import <category> <text>` | Editor | **Nhập hàng loạt bằng cách copy/paste văn bản** |
| `/fruit remove <mục> <chiêu>` | Editor | Xoá stat cap của một chiêu |
| `/fruit note <mục> [text]` | Editor | Đặt ghi chú (ví dụ: Recommend Stat) |
| `/fruit editorrole <role>` | Admin | Phân quyền role Editor được duyệt và sửa dữ liệu stat |
| `/fruit reviewchannel <channel>` | Admin | Đặt kênh nhận thông báo khi có người đóng góp stat mới |

---

## 🥊 Dữ liệu Fighting Style đã có sẵn

Bot đã được nạp sẵn toàn bộ stat cap từ cộng đồng cho **13 Fighting Styles** trong `data/styles.seed.json`:
- **Iron Fist:** R = 391, Z = 541 (Recommend: 720 STR + 300 FS)
- **Cyborg:** E = 456, R = 565, X = 805, C = 521 (Recommend: 805 FS)
- **Vampire:** Z = 481, C = 553 (Recommend: 553 FS)
- **Dullahan:** E = 901, R = 1141, Z = 1251 (Recommend: 901 FS)
- **Dragon Claw:** E = 1030, R = 1030, T = 871, Z = 940, X = 1450, C = 930 (Recommend: 720 STR + 100 FS)
- **Black Leg:** M1 = 720, E = 288, R = 281, Z = 321, X = 196, C = 521
- **Demon Step:** M1 = 720, E = 406, R = 1241, X = 281
- **Electro:** R = 159, Z = 795, X = 525, C = 998
- **Moonlit Electro:** E = 690, R = 1449, X = 451
- **Fishman Karate:** E = 336, R = 421, Z = 1086, X = 1621, C = 911
- **Abyssal Karate:** T = 1051, X = 585, C = 1671
- **Rokushiki:** E = 313, Z = 261
- **Kamishiki:** Z = 977

---

## 📖 Hướng dẫn cập nhật thêm Stat Cap (Fruit, Weapon...)

Khi bạn có ảnh hoặc danh sách stat cap mới, bạn có thể cập nhật vào bot bằng **4 cách linh hoạt**:

### Cách 1: Dán trực tiếp vào Discord với `/fruit import` (Tiện nhất)
Gõ lệnh:
```
/fruit import category:Trái ác quỷ text:<dán nội dung>
```
Bot tự động đọc các định dạng danh sách bạn copy từ Discord hoặc Docs, ví dụ:
```text
Mera Mera no Mi
• Z = 450
• X = 650
• C = 820
• Recommend Stat = 500 Fruit

Magu Magu no Mi
• Z = 790
• X = 1040
• C = 1300
```
Bot sẽ tự động tách từng chiêu, cập nhật vào database ngay lập tức.

### Cách 2: Cập nhật từng chiêu với `/fruit set`
```
/fruit set fruit:Mera move:Z value:450 category:Trái ác quỷ source:https://...
/fruit note fruit:Mera text:Recommend Stat = 500 Fruit
```

### Cách 3: Người dùng đóng góp qua `/fruit submit`
- Người chơi gõ: `/fruit submit fruit:Pika move:Z value:520 source:https://youtube.com/...`
- Bot gửi thông báo vào kênh `reviewchannel`.
- Mod/Editor xem danh sách bằng `/fruit pending` và duyệt bằng `/fruit approve id:<ID>`.

### Cách 4: Thêm file seed vào mã nguồn GitHub
Tạo thêm file JSON trong thư mục `data/` (ví dụ `data/weapons.seed.json`):
```json
[
  {
    "key": "bisento",
    "category": "weapon",
    "name": "Bisento",
    "caps": { "E": "350", "R": "500" },
    "notes": "Recommend Stat: 500 Sword"
  }
]
```
Mỗi khi bot khởi động, bot sẽ tự nạp các file `.seed.json` này vào hệ thống mà không làm mất dữ liệu đã chỉnh sửa trên Discord.

---

## 🚀 Hướng dẫn Deploy lên Render & UptimeRobot (Chạy 24/7)

### Bước 1: Tạo MongoDB Atlas miễn phí (Lưu trữ bền vững)
Vì Render gói Free sẽ xoá ổ đĩa khi restart/redeploy, bạn nên dùng 1 database MongoDB miễn phí:
1. Vào https://www.mongodb.com/atlas tạo tài khoản.
2. Tạo 1 Cluster **M0 Free**.
3. Vào **Database Access** tạo user và password.
4. Vào **Network Access** chọn **Add IP Address** -> `0.0.0.0/0` (Allow Access from Anywhere).
5. Bấm **Connect** -> **Drivers** -> copy chuỗi kết nối dạng:
   `mongodb+srv://<user>:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority`

### Bước 2: Deploy lên Render
1. Đăng ký/đăng nhập https://render.com bằng tài khoản GitHub của bạn.
2. Bấm **New +** -> **Web Service** (hoặc chọn **Blueprint** và chọn repo `Carnival-TTS-BOT`).
3. Kết nối với repo: `https://github.com/deimos0810/Carnival-TTS-BOT`.
4. Cấu hình:
   - **Name:** `carnival-tts-bot`
   - **Region:** Singapore
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
5. Trong mục **Environment Variables**, thêm các biến sau:
   - `DISCORD_TOKEN`: Token bot của bạn.
   - `GUILD_ID`: `1161183419837993000` (để lệnh hiện tức thì trong server của bạn; nếu muốn dùng toàn cầu thì để trống).
   - `MONGODB_URI`: Chuỗi kết nối MongoDB Atlas lấy ở Bước 1.
   - `BOT_OWNER_ID`: ID tài khoản Discord của bạn (tuỳ chọn, để có quyền admin duyệt mọi nơi).
6. Bấm **Create Web Service**. Sau vài phút Render báo deploy thành công.

### Bước 3: Cài đặt UptimeRobot để bot không bị ngủ
Render Free sẽ tự động tắt nếu không có ai truy cập web trong 15 phút. Bot đã có sẵn endpoint `/health`:
1. Vào https://uptimerobot.com tạo tài khoản miễn phí.
2. Bấm **Add New Monitor**:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `Carnival TTS Bot`
   - **URL (or IP):** `https://<tên-web-service-của-bạn>.onrender.com/health`
   - **Monitoring Interval:** `5 minutes`
3. Bấm **Create Monitor**. Giờ đây UptimeRobot sẽ ping bot mỗi 5 phút một lần, giữ bot online 24/7.

---

## ⚙️ Thiết lập trong Server Discord lần đầu

1. Mời bot vào server với đủ quyền (Voice Connect, Speak, Read Messages, Send Messages, Use Slash Commands).
2. Tạo hoặc chọn 1 role cho phép dùng TTS (ví dụ `@TTS`).
3. Gõ lệnh:
   ```
   /tts addrole role:@TTS
   ```
4. Chỉ định role Mod/Editor để duyệt và sửa stat cap:
   ```
   /fruit editorrole role:@Moderator
   /fruit reviewchannel channel:#duyet-stat
   ```
5. Mọi thành viên có role `@TTS` chỉ cần vào voice và nhắn tin trong kênh chat voice, bot sẽ tự động nhảy vào và đọc bằng giọng tương ứng.
