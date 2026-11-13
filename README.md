# 🎪 Carnival TTS, AA Value List & Roblox Update Tracker Bot

Bot Discord đa năng kết hợp:
1. **Text-to-Speech (TTS):** Đọc tin nhắn bằng giọng **Tiếng Việt** và **English**, **chỉ đọc những ai có role được phân quyền**.
2. **AA Value List (Tra cứu bảng giá Unit & Gamepass):** Tự động đồng bộ trực tiếp từ [Google Spreadsheet chính thức](https://docs.google.com/spreadsheets/d/1KTVAqVw26TkwJF7GGJmKjkVEXCK5itqS1OZAIpqxuJ0) (chia rõ Gamepass, Unit Tier S/A/B/C, Shiny, Unobtainable, Skins, Relics). Tự động cập nhật mỗi 30 phút một lần và có tính năng đọc giá to trong voice.
3. **Roblox PC Windows Update Tracker (WEAO API):** Tự động phát hiện và gửi thông báo vào kênh riêng khi client Roblox PC Windows có bản cập nhật mới, kèm link tải trực tiếp qua RDD và downgrade link.
4. **Hoạt động 24/7:** Chạy Web Service miễn phí trên **Render** kết hợp **UptimeRobot** ping `/health` giữ bot luôn thức.

---

## ⚡ Bảng lệnh Slash Command

### 1. Nhóm Lệnh Theo Dõi Cập Nhật Roblox PC (`/roblox`)

Dựa trên hệ thống **WEAO API** ([docs.weao.xyz](https://docs.weao.xyz/)), bot tự động theo dõi phiên bản Roblox PC Windows mỗi 3 phút. Khi phát hiện Roblox vừa đẩy bản cập nhật mới lên máy chủ Live, bot sẽ ngay lập tức gửi thông báo embed tuyệt đẹp vào kênh Discord bạn đã cài đặt!

| Lệnh | Phân quyền | Mô tả |
|---|---|---|
| `/roblox channel <channel>` | Admin | **Cài đặt kênh Discord riêng** để tự động nhận thông báo mỗi khi Roblox PC Windows có bản cập nhật mới. |
| `/roblox removechannel` | Admin | Hủy theo dõi và tắt tự động gửi thông báo cập nhật Roblox trên server này. |
| `/roblox role [role]` | Admin | Cài đặt role sẽ được ping khi có update Roblox mới (để trống để tắt ping role). |
| `/roblox check` | Mọi người | **Kiểm tra ngay lập tức** phiên bản Roblox PC Windows hiện tại trên WEAO API (kèm số hiệu bản dựng, ngày phát hành và link tải). |
| `/roblox test` | Admin | Gửi thử 1 thông báo cập nhật mẫu vào kênh đã cài đặt để kiểm tra quyền hạn của bot và cách hiển thị. |
| `/roblox settings` | Mọi người | Xem cấu hình kênh thông báo, role ping và phiên bản Roblox ghi nhận gần nhất. |

> 🛠️ **Tính năng nổi bật của Roblox Tracker:**
> - Tuân thủ chuẩn User-Agent `WEAO-3PService` theo tài liệu chính thức của WEAO API.
> - Cung cấp link tải trực tiếp phiên bản mới qua **RDD (Roblox Deployment Downloader)**.
> - Cung cấp link tải phiên bản cũ (Downgrade) phục vụ cho việc nghiên cứu, modding hoặc chạy executor tương thích.
> - Hiển thị timestamp phát hành dạng Discord Dynamic Time (`<t:timestamp:R>`) tự đếm lùi thời gian.

---

### 2. Nhóm Lệnh Tra Cứu & So Sánh Kèo Trade (`/wfl`, `/value`)

| Lệnh | Phân quyền | Mô tả |
|---|---|---|
| `/wfl [give] [get] [speak] [lang]` | Mọi người | **So sánh kèo trade Win / Fair / Loss (WFL)** giữa Unit, Gamepass, Stats, Skin.<br>• Phân tích đa chiều: **Value**, **Demand**, **Trend**, **Shiny / Unob**<br>• Đưa ra kết luận: 🚀 **Big Win**, 🟢 **Win**, ⚖️ **Fair**, 🔴 **Loss**, 💀 **Big Loss**<br>• **Giao diện bảng tương tác hiện đại:** Có nút bấm `➕ Thêm Bạn Đưa`, `➕ Thêm Bạn Nhận`, `✏️ Đổi số lượng`, `🗑️ Xóa món`, `🔄 Đảo 2 bên` ngay trên Discord!<br>• **Nhập tự nhiên:** Có thể gõ lệnh trực tiếp hoặc để trống `/wfl` để mở bảng tương tác popup modal.<br>• Autocomplete thông minh không giới hạn số lượng món, hỗ trợ rút gọn tên và tính tổng giá trị xếp chồng! |
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
| `/tts character <voice>` | Mọi người | Chọn nhân vật giọng đọc cho bản thân (Adam, Brian, Daniel, Liam, George) |
| `/tts customvoice [voice_id]` | Mọi người | Cài Voice ID ElevenLabs riêng cho bản thân (giọng clone/train riêng) |
| `/tts servervoice <voice>` | Admin | Đổi nhân vật giọng đọc mặc định của server |
| `/tts servercustomvoice [voice_id]` | Admin | Đổi Voice ID ElevenLabs mặc định cho cả server (giọng clone/train riêng) |
| `/tts engine <engine>` | Admin | Chọn bộ đọc: **ElevenLabs** (Adam chuẩn Việt) hoặc **Google** |
| `/tts voice <lang>` | Mọi người | Tự chọn ngôn ngữ đọc: Tự động / English / Tiếng Việt |
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

> 🎙️ **Giọng Adam (ElevenLabs Tối Ưu Tiếng Việt):**
> - Sử dụng model **`eleven_turbo_v2_5`** cùng cờ ép ngôn ngữ **`language_code: 'vi'`** giúp phát âm tiếng Việt chuẩn xác, tròn vành rõ chữ.
> - Tinh chỉnh thông số vàng: `stability: 0.75` (giữ tông vững, không bị tụt hơi hay méo giọng), `similarity_boost: 0.65` (thể hiện chuẩn thanh điệu hỏi, ngã, nặng, sắc không bị ép theo khẩu hình tiếng Anh).
> - Thuật toán **`splitLongText`** tự động phân tích và ngắt nghỉ tự nhiên theo mệnh đề khi gặp câu dài, sau đó nối mượt mà, giúp bot đọc câu dài không bao giờ bị hụt hơi hay lớ tiếng.
> - Hỗ trợ các từ lóng / chửi bậy viết tắt phổ biến: `clmm`, `dclmm`, `clbgm`, `dcdmm`, `dmm`... và tự nhận diện tiếng Việt không dấu.
> - Hỗ trợ giọng tự train / clone qua lệnh `/tts customvoice` và `/tts servercustomvoice`.

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
