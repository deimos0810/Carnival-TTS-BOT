# 🎪 Carnival TTS & AA Value List Bot

Bot Discord đa năng kết hợp:
1. **Text-to-Speech (TTS):** Đọc tin nhắn bằng giọng **Tiếng Việt** và **English**, **chỉ đọc những ai có role được phân quyền**.
2. **AA Value List (Tra cứu bảng giá Unit & Gamepass):** Tự động đồng bộ trực tiếp từ [Google Spreadsheet chính thức](https://docs.google.com/spreadsheets/d/1KTVAqVw26TkwJF7GGJmKjkVEXCK5itqS1OZAIpqxuJ0) (chia rõ Gamepass, Unit Tier S/A/B/C, Shiny, Unobtainable, Skins, Relics). Tự động cập nhật mỗi 30 phút một lần và có tính năng đọc giá to trong voice.
3. **Hoạt động 24/7:** Chạy Web Service miễn phí trên **Render** kết hợp **UptimeRobot** ping `/health` giữ bot luôn thức.

---

## ⚡ Bảng lệnh Slash Command

### 1. Nhóm Lệnh Tra Cứu & So Sánh Kèo Trade (`/wfl`, `/value`)

| Lệnh | Phân quyền | Mô tả |
|---|---|---|
| `/wfl <give> <get> [speak] [lang]` | Mọi người | **So sánh kèo trade Win / Fair / Loss (WFL)** giữa Unit, Gamepass, Stats, Skin.<br>• Phân tích đa chiều: **Value**, **Demand**, **Trend**, **Shiny / Unob**<br>• Đưa ra kết luận: 🚀 **Big Win**, 🟢 **Win**, ⚖️ **Fair**, 🔴 **Loss**, 💀 **Big Loss**<br>• **Giao diện 2 ô gọn gàng:** Chỉ gồm ô `give` (bạn đưa) và `get` (bạn nhận)<br>• **Nhập tự nhiên:** `give: 2 dark mage, sss dmg` `get: battle pass, vip`<br>• Autocomplete thông minh tự động gợi ý tiếp sau dấu phẩy và giữ nguyên số lượng! |
| `/value search <item> [speak] [lang]` | Mọi người | **Tra cứu giá trị item** (Unit, Gamepass, Skin, Relic). Hỗ trợ gõ gợi ý nhanh (Autocomplete), tuỳ chọn `speak:True` để bot đọc to trong voice! |
| `/value list [category] [tier] [shiny] [unob]` | Mọi người | **Xem danh sách phân loại**:<br>• Lọc theo: Gamepass, Unit, Skin, Relic<br>• Lọc theo Tier: S Tier, A Tier, B Tier, C Tier, Untradable<br>• Lọc riêng bản Shiny / Rainbow<br>• Lọc riêng các Unit Unobtainable (Unob / Limited / Event) |
| `/value info` | Mọi người | Xem thống kê số lượng items, số lượng Shiny, Unob, link Google Sheet và thời gian đồng bộ |
| `/value sync` | Admin | Buộc bot kiểm tra và đồng bộ dữ liệu mới nhất từ Google Sheet ngay lập tức |

### 2. Nhóm Lệnh Voice & TTS (`/tts`, `/join`, `/leave`, `/say`)

| Lệnh | Phân quyền | Mô tả |
|---|---|---|
| `/join` | Mọi người | Gọi bot vào kênh voice bạn đang đứng |
| `/leave` | Mọi người | Cho bot rời voice |
| `/skip` | Mọi người | Bỏ qua câu bot đang đọc dở |
| `/say <text> [lang]` | Có role TTS | Bot đọc một câu tùy ý trong voice |
| `/tts voice <lang>` | Mọi người | Tự chọn giọng đọc cá nhân: Tự động / English / Tiếng Việt |
| `/tts settings` | Mọi người | Xem cấu hình TTS hiện tại của server |
| `/tts addrole <role>` | Admin | **Thêm role được bot đọc tin nhắn** |
| `/tts removerole <role>` | Admin | Xoá role khỏi danh sách được đọc |
| `/tts addchannel <channel>` | Admin | Thêm kênh chat cho phép bot đọc |
| `/tts removechannel <channel>` | Admin | Bỏ kênh chat khỏi danh sách đọc |
| `/tts defaultlang <lang>` | Admin | Đặt giọng đọc mặc định của server |
| `/tts toggle <enabled>` | Admin | Bật / tắt chức năng TTS |
| `/tts sayname <enabled>` | Admin | Đọc tên người nói trước câu chat hay không |
| `/tts autojoin <enabled>` | Admin | Bot tự vào voice khi người có role chat |
| `/tts word add <word> <say> <lang>` | Admin | Thêm cách đọc cho một từ (vd: `ye` → `de`, giọng Việt) |
| `/tts word remove <word>` | Admin | Xoá cách đọc đã thêm |
| `/tts word list` | Mọi người | Xem từ điển phát âm |

> 🎙️ **Giọng Adam (ElevenLabs):** đặt biến môi trường `ELEVENLABS_API_KEY` để dùng giọng Adam. Bot tự tách từng từ tiếng Việt / tiếng Anh trong câu và đọc mỗi đoạn với giọng + tông riêng (`language_code` vi/en). Không có key thì bot dùng giọng Google (vẫn tách Việt/Anh).

---

## 📊 Phân loại dữ liệu được đồng bộ từ Google Sheet

Bot tự động phân tách dữ liệu thành các nhóm rõ ràng:
1. **🎮 Gamepasses & Bundles:** Grand Return Bundle, Summer Bundles, Shiny Hunter... kèm chi tiết quà tặng trong bundle.
2. **⚔️ Units (Chia theo Tier):**
   * **S Tier:** Jio (Over Heaven) / Dio, Time Saviour / Gohan, etc.
   * **A Tier:** Piccolo, Chihiro, Thorfinn, Buddha, Shidou, etc.
   * **B Tier:** Klein, Kento Nanami, Kisame, Hinamy, Ace, etc.
   * **C Tier:** Madoka, Chuyo, Shinji, Mecha Frieza, etc.
   * **Untradable:** Các unit hiện chưa cho trade (Nejire...).
3. **✨ Phân loại Shiny / Rainbow:** Tự động gắn tag Shiny và biểu tượng `✨`.
4. **🔒 Phân loại Unobtainable (Unob):** Tự động nhận diện các Unit giới hạn sự kiện (Halloween, Christmas, Summer, Leaderboard, Secret Portal...).
5. **🎨 Skins & 🔮 Relics:** Bulma Rainbow, Erwin Rainbow, Nail, Black Blade Autumn Water, v.v.

---

## 🔄 Cơ Chế Tự Động Cập Nhật Khi Chủ Link Thay Đổi Dữ Liệu

* **Tự động mỗi 30 phút:** Bot có tiến trình nền tự động tải lại toàn bộ các tab của Google Sheet, cập nhật giá trị (Value, Demand, Trend) mới nhất vào database.
* **Cập nhật thủ công tức thì:** Bất cứ lúc nào chủ sheet có update lớn, Admin chỉ cần gõ:
  ```
  /value sync
  ```
  Bot sẽ kéo dữ liệu mới nhất về trong vòng 3 giây!

---

## 🚀 Deploy lên Render & UptimeRobot (24/7)

1. **Render:** Đã được thiết lập chạy Web Service miễn phí với các biến môi trường:
   * `DISCORD_TOKEN`
   * `MONGODB_URI`
2. **UptimeRobot:** Ping định kỳ vào `https://<ten-app>.onrender.com/health` mỗi 5 phút một lần để bot luôn trực tuyến.
