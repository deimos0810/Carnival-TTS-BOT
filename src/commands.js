import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';

const langChoices = [
  { name: 'Tự động (có dấu → Việt, không dấu → English)', value: 'auto' },
  { name: 'English', value: 'en' },
  { name: 'Tiếng Việt', value: 'vi' },
];

export const voiceChoices = [
  { name: '🧔 Adam (Nam trầm - Chuẩn Việt nhất - Khuyên dùng)', value: 'pNInz6obpgDQGcFmaJgB' },
  { name: '🌟 Brian (Trầm ấm, rõ chữ)', value: 'nPczCjzI2devNBz1zQrb' },
  { name: '🎙️ Daniel (Phát thanh viên, tròn vành rõ chữ)', value: 'onwK4e9ZLuTAKqWW03F9' },
  { name: '⚡ Liam (Nam trẻ, tự nhiên)', value: 'TX3LPaxmHKxFdv7VOQHJ' },
  { name: '🎩 George (Nam ấm áp)', value: 'JBFqnCBsd6RMkjVDRZzb' },
];

const categoryChoices = [
  { name: '📦 Tất cả', value: 'all' },
  { name: '🎮 Gamepass & Bundle', value: 'gamepass' },
  { name: '⚔️ Unit (Tất cả Tier)', value: 'unit' },
  { name: '📊 Chỉ số Stats (SSS, SS...)', value: 'stat' },
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
  .addSubcommand((s) =>
    s
      .setName('character')
      .setDescription('Chọn nhân vật giọng đọc cho bản thân')
      .addStringOption((o) =>
        o.setName('voice').setDescription('Nhân vật giọng').setRequired(true).addChoices(...voiceChoices),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName('servervoice')
      .setDescription('[Admin] Đổi nhân vật giọng đọc mặc định của server')
      .addStringOption((o) =>
        o.setName('voice').setDescription('Nhân vật giọng').setRequired(true).addChoices(...voiceChoices),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName('customvoice')
      .setDescription('Cài đặt Voice ID riêng (giọng tự train/clone từ ElevenLabs)')
      .addStringOption((o) =>
        o.setName('voice_id').setDescription('Voice ID ElevenLabs (để trống để xóa và quay về mặc định)').setRequired(false),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName('servercustomvoice')
      .setDescription('[Admin] Cài đặt Voice ID riêng mặc định cho cả server (giọng tự train/clone)')
      .addStringOption((o) =>
        o.setName('voice_id').setDescription('Voice ID ElevenLabs (để trống để xóa và quay về mặc định)').setRequired(false),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName('engine')
      .setDescription('[Admin] Chọn bộ đọc: ElevenLabs (Adam nam trầm chuẩn Việt) hoặc Google')
      .addStringOption((o) =>
        o
          .setName('engine')
          .setDescription('Bộ đọc âm thanh')
          .setRequired(true)
          .addChoices(
            { name: '🎙️ ElevenLabs (Adam / Brian - Giọng nam trầm, chuẩn tiếng Việt - Khuyên dùng)', value: 'elevenlabs' },
            { name: '🇻🇳 Google (Thuần Việt 100% Chị Google)', value: 'google' },
          ),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName('mode')
      .setDescription('Chọn kiểu đọc tiếng Anh trong câu tiếng Việt')
      .addStringOption((o) =>
        o
          .setName('mode')
          .setDescription('Kiểu đọc')
          .setRequired(true)
          .addChoices(
            { name: '🎭 Mượt mà & Hài hước (Việt hoá tiếng Anh, không đổi tông giật cục - Khuyên dùng)', value: 'smooth' },
            { name: '🔀 Song ngữ đổi giọng (Chuyển sang giọng Mỹ khi đọc từ tiếng Anh)', value: 'split' },
          ),
      ),
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
  )
  .addSubcommandGroup((g) =>
    g
      .setName('word')
      .setDescription('Từ điển phát âm (vd: "ye" đọc là "de")')
      .addSubcommand((s) =>
        s
          .setName('add')
          .setDescription('[Admin] Thêm/sửa cách đọc một từ')
          .addStringOption((o) => o.setName('word').setDescription('Từ gốc (vd: ye)').setRequired(true).setMaxLength(40))
          .addStringOption((o) => o.setName('say').setDescription('Đọc thành (vd: de)').setRequired(true).setMaxLength(100))
          .addStringOption((o) =>
            o
              .setName('lang')
              .setDescription('Đọc bằng giọng nào')
              .setRequired(true)
              .addChoices({ name: 'Tiếng Việt', value: 'vi' }, { name: 'English', value: 'en' }),
          ),
      )
      .addSubcommand((s) =>
        s
          .setName('remove')
          .setDescription('[Admin] Xoá cách đọc của một từ')
          .addStringOption((o) => o.setName('word').setDescription('Từ').setRequired(true)),
      )
      .addSubcommand((s) => s.setName('list').setDescription('Xem từ điển phát âm của server')),
  );

const join = new SlashCommandBuilder().setName('join').setDescription('Gọi bot vào kênh voice bạn đang ở');
const leave = new SlashCommandBuilder().setName('leave').setDescription('Cho bot rời kênh voice');
const skip = new SlashCommandBuilder().setName('skip').setDescription('Bỏ qua câu đang đọc');
const say = new SlashCommandBuilder()
  .setName('say')
  .setDescription('Bot đọc một câu (cần có role TTS)')
  .addStringOption((o) => o.setName('text').setDescription('Nội dung').setRequired(true).setMaxLength(500))
  .addStringOption((o) => o.setName('lang').setDescription('Giọng').addChoices(...langChoices));

function addTradeOptions(builder) {
  return builder
    .addStringOption((o) =>
      o
        .setName('give')
        .setDescription('Món bạn đưa (vd: 2 dark mage, hoặc dark mage, dio)')
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addStringOption((o) =>
      o
        .setName('get')
        .setDescription('Món bạn nhận (vd: 2 battle pass, hoặc battle pass, vip)')
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
}

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
    addTradeOptions(
      s.setName('trade').setDescription('So sánh kèo trade Win / Fair / Loss giữa các Unit / Gamepass'),
    ),
  )
  .addSubcommand((s) =>
    s.setName('info').setDescription('Xem thông tin bảng giá, link Google Sheet và thời gian cập nhật'),
  )
  .addSubcommand((s) =>
    s.setName('sync').setDescription('[Admin] Đồng bộ dữ liệu mới nhất trực tiếp từ Google Sheet'),
  );

// Lệnh tắt /wfl để so sánh nhanh kèo trade
const wfl = addTradeOptions(
  new SlashCommandBuilder()
    .setName('wfl')
    .setDescription('So sánh kèo trade Win / Fair / Loss (Unit, Gamepass, Stats, Skin)'),
);

export const commandData = [tts, join, leave, skip, say, value, wfl].map((c) => c.toJSON());
export { PermissionFlagsBits };
