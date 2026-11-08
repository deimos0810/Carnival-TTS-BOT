import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';

const langChoices = [
  { name: 'Tự động (có dấu → Việt, không dấu → English)', value: 'auto' },
  { name: 'English', value: 'en' },
  { name: 'Tiếng Việt', value: 'vi' },
];

const categoryChoices = [
  { name: '📦 Tất cả', value: 'all' },
  { name: '🎮 Gamepass & Bundle', value: 'gamepass' },
  { name: '⚔️ Unit (Tất cả Tier)', value: 'unit' },
  { name: '🎨 Skin', value: 'skin' },
  { name: '🔮 Relic', value: 'relic' },
];

const tierChoices = [
  { name: '🏆 S Tier', value: 'S Tier' },
  { name: '🥇 A Tier', value: 'A Tier' },
  { name: '🥈 B Tier', value: 'B Tier' },
  { name: '🥉 C Tier', value: 'C Tier' },
  { name: '🔒 Untradable', value: 'Untradable' },
];

// --- TTS Commands ---
const tts = new SlashCommandBuilder()
  .setName('tts')
  .setDescription('Cài đặt Text-to-Speech')
  .addSubcommand((s) =>
    s
      .setName('voice')
      .setDescription('Chọn giọng đọc cho bản thân')
      .addStringOption((o) => o.setName('lang').setDescription('Giọng').setRequired(true).addChoices(...langChoices)),
  )
  .addSubcommand((s) => s.setName('settings').setDescription('Xem cài đặt TTS của server'))
  .addSubcommand((s) =>
    s
      .setName('addrole')
      .setDescription('[Admin] Thêm role được bot đọc tin nhắn')
      .addRoleOption((o) => o.setName('role').setDescription('Role').setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName('removerole')
      .setDescription('[Admin] Bỏ role khỏi danh sách được đọc')
      .addRoleOption((o) => o.setName('role').setDescription('Role').setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName('addchannel')
      .setDescription('[Admin] Thêm kênh chat mà bot sẽ đọc')
      .addChannelOption((o) =>
        o
          .setName('channel')
          .setDescription('Kênh')
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName('removechannel')
      .setDescription('[Admin] Bỏ kênh chat khỏi danh sách đọc')
      .addChannelOption((o) => o.setName('channel').setDescription('Kênh').setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName('defaultlang')
      .setDescription('[Admin] Giọng mặc định của server')
      .addStringOption((o) => o.setName('lang').setDescription('Giọng').setRequired(true).addChoices(...langChoices)),
  )
  .addSubcommand((s) =>
    s
      .setName('toggle')
      .setDescription('[Admin] Bật/tắt TTS')
      .addBooleanOption((o) => o.setName('enabled').setDescription('Bật?').setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName('sayname')
      .setDescription('[Admin] Đọc tên người gửi trước tin nhắn')
      .addBooleanOption((o) => o.setName('enabled').setDescription('Bật?').setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName('autojoin')
      .setDescription('[Admin] Tự vào voice khi người có role nhắn tin')
      .addBooleanOption((o) => o.setName('enabled').setDescription('Bật?').setRequired(true)),
  );

const join = new SlashCommandBuilder().setName('join').setDescription('Gọi bot vào kênh voice bạn đang ở');
const leave = new SlashCommandBuilder().setName('leave').setDescription('Cho bot rời kênh voice');
const skip = new SlashCommandBuilder().setName('skip').setDescription('Bỏ qua câu đang đọc');
const say = new SlashCommandBuilder()
  .setName('say')
  .setDescription('Bot đọc một câu (cần có role TTS)')
  .addStringOption((o) => o.setName('text').setDescription('Nội dung').setRequired(true).setMaxLength(500))
  .addStringOption((o) => o.setName('lang').setDescription('Giọng').addChoices(...langChoices));

// --- Value List Commands ---
const value = new SlashCommandBuilder()
  .setName('value')
  .setDescription('Tra cứu bảng giá AA Value List (Unit, Gamepass, Skin, Relic)')
  .addSubcommand((s) =>
    s
      .setName('search')
      .setDescription('Tìm kiếm giá trị Unit, Gamepass, Skin, Relic')
      .addStringOption((o) =>
        o.setName('item').setDescription('Tên item (gõ để gợi ý)').setRequired(true).setAutocomplete(true),
      )
      .addBooleanOption((o) => o.setName('speak').setDescription('Bot đọc to giá trị trong voice?'))
      .addStringOption((o) =>
        o
          .setName('lang')
          .setDescription('Giọng đọc')
          .addChoices({ name: 'Tiếng Việt', value: 'vi' }, { name: 'English', value: 'en' }),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName('list')
      .setDescription('Xem danh sách phân loại (Gamepass, Tier S/A/B/C, Shiny, Unob)')
      .addStringOption((o) => o.setName('category').setDescription('Phân loại').addChoices(...categoryChoices))
      .addStringOption((o) => o.setName('tier').setDescription('Lọc theo Tier Unit').addChoices(...tierChoices))
      .addBooleanOption((o) => o.setName('shiny').setDescription('Chỉ xem bản Shiny/Rainbow?'))
      .addBooleanOption((o) => o.setName('unob').setDescription('Chỉ xem bản Unobtainable (Unob)?')),
  )
  .addSubcommand((s) =>
    s
      .setName('trade')
      .setDescription('So sánh kèo trade Win / Fair / Loss giữa các Unit / Gamepass')
      .addStringOption((o) =>
        o
          .setName('give')
          .setDescription('Món bạn đưa (vd: Piccolo Shiny, hoặc nhiều món cách nhau dấu phẩy)')
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addStringOption((o) =>
        o
          .setName('get')
          .setDescription('Món bạn nhận (vd: Thorfinn, hoặc Summer Bundle 1)')
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addBooleanOption((o) => o.setName('speak').setDescription('Bot đọc kết quả trong voice?'))
      .addStringOption((o) =>
        o
          .setName('lang')
          .setDescription('Giọng đọc')
          .addChoices({ name: 'Tiếng Việt', value: 'vi' }, { name: 'English', value: 'en' }),
      ),
  )
  .addSubcommand((s) =>
    s.setName('info').setDescription('Xem thông tin bảng giá, link Google Sheet và thời gian cập nhật'),
  )
  .addSubcommand((s) =>
    s.setName('sync').setDescription('[Admin] Đồng bộ dữ liệu mới nhất trực tiếp từ Google Sheet'),
  );

// Lệnh tắt /wfl để so sánh nhanh kèo trade
const wfl = new SlashCommandBuilder()
  .setName('wfl')
  .setDescription('So sánh kèo trade Win / Fair / Loss (Unit, Gamepass, Skin, Relic)')
  .addStringOption((o) =>
    o
      .setName('give')
      .setDescription('Món bạn đưa (vd: Piccolo Shiny, hoặc nhiều món cách nhau dấu phẩy)')
      .setRequired(true)
      .setAutocomplete(true),
  )
  .addStringOption((o) =>
    o
      .setName('get')
      .setDescription('Món bạn nhận (vd: Thorfinn, hoặc Summer Bundle 1)')
      .setRequired(true)
      .setAutocomplete(true),
  )
  .addBooleanOption((o) => o.setName('speak').setDescription('Bot đọc kết quả trong voice?'))
  .addStringOption((o) =>
    o
      .setName('lang')
      .setDescription('Giọng đọc')
      .addChoices({ name: 'Tiếng Việt', value: 'vi' }, { name: 'English', value: 'en' }),
  );

export const commandData = [tts, join, leave, skip, say, value, wfl].map((c) => c.toJSON());
export { PermissionFlagsBits };
