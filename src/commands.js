import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';

const langChoices = [
  { name: 'Tự động (có dấu → Việt, không dấu → English)', value: 'auto' },
  { name: 'English', value: 'en' },
  { name: 'Tiếng Việt', value: 'vi' },
];

const tts = new SlashCommandBuilder()
  .setName('tts')
  .setDescription('Cài đặt Text-to-Speech')
  .addSubcommand((s) =>
    s.setName('voice').setDescription('Chọn giọng đọc cho bản thân')
      .addStringOption((o) => o.setName('lang').setDescription('Giọng').setRequired(true).addChoices(...langChoices)))
  .addSubcommand((s) => s.setName('settings').setDescription('Xem cài đặt TTS của server'))
  .addSubcommand((s) =>
    s.setName('addrole').setDescription('[Admin] Thêm role được bot đọc tin nhắn')
      .addRoleOption((o) => o.setName('role').setDescription('Role').setRequired(true)))
  .addSubcommand((s) =>
    s.setName('removerole').setDescription('[Admin] Bỏ role khỏi danh sách được đọc')
      .addRoleOption((o) => o.setName('role').setDescription('Role').setRequired(true)))
  .addSubcommand((s) =>
    s.setName('addchannel').setDescription('[Admin] Thêm kênh chat mà bot sẽ đọc')
      .addChannelOption((o) => o.setName('channel').setDescription('Kênh').setRequired(true)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice)))
  .addSubcommand((s) =>
    s.setName('removechannel').setDescription('[Admin] Bỏ kênh chat khỏi danh sách đọc')
      .addChannelOption((o) => o.setName('channel').setDescription('Kênh').setRequired(true)))
  .addSubcommand((s) =>
    s.setName('defaultlang').setDescription('[Admin] Giọng mặc định của server')
      .addStringOption((o) => o.setName('lang').setDescription('Giọng').setRequired(true).addChoices(...langChoices)))
  .addSubcommand((s) =>
    s.setName('toggle').setDescription('[Admin] Bật/tắt TTS')
      .addBooleanOption((o) => o.setName('enabled').setDescription('Bật?').setRequired(true)))
  .addSubcommand((s) =>
    s.setName('sayname').setDescription('[Admin] Đọc tên người gửi trước tin nhắn')
      .addBooleanOption((o) => o.setName('enabled').setDescription('Bật?').setRequired(true)))
  .addSubcommand((s) =>
    s.setName('autojoin').setDescription('[Admin] Tự vào voice khi người có role nhắn tin')
      .addBooleanOption((o) => o.setName('enabled').setDescription('Bật?').setRequired(true)));

const join = new SlashCommandBuilder().setName('join').setDescription('Gọi bot vào kênh voice bạn đang ở');
const leave = new SlashCommandBuilder().setName('leave').setDescription('Cho bot rời kênh voice');
const skip = new SlashCommandBuilder().setName('skip').setDescription('Bỏ qua câu đang đọc');
const say = new SlashCommandBuilder()
  .setName('say').setDescription('Bot đọc một câu (cần có role TTS)')
  .addStringOption((o) => o.setName('text').setDescription('Nội dung').setRequired(true).setMaxLength(500))
  .addStringOption((o) => o.setName('lang').setDescription('Giọng').addChoices(...langChoices));

const categoryChoices = [
  { name: '🍎 Trái ác quỷ', value: 'fruit' },
  { name: '👊 Fighting Style', value: 'style' },
  { name: '⚔️ Vũ khí', value: 'weapon' },
  { name: '📦 Khác', value: 'other' },
];

const fruitOpt = (o) => o.setName('fruit').setDescription('Tên trái / fighting style / vũ khí').setRequired(true).setAutocomplete(true);

const fruit = new SlashCommandBuilder()
  .setName('fruit')
  .setDescription('Stat cap GPO (Trái ác quỷ, Fighting Style, Vũ khí)')
  .addSubcommand((s) =>
    s.setName('info').setDescription('Xem stat cap của 1 mục')
      .addStringOption(fruitOpt)
      .addBooleanOption((o) => o.setName('speak').setDescription('Đọc to trong voice?'))
      .addStringOption((o) => o.setName('lang').setDescription('Giọng đọc').addChoices(
        { name: 'English', value: 'en' }, { name: 'Tiếng Việt', value: 'vi' })))
  .addSubcommand((s) =>
    s.setName('list').setDescription('Danh sách stat cap đã lưu')
      .addStringOption((o) => o.setName('category').setDescription('Lọc theo phân loại').addChoices(...categoryChoices)))
  .addSubcommand((s) =>
    s.setName('wiki').setDescription('Tra cứu trực tiếp từ GPO Fandom Wiki')
      .addStringOption((o) => o.setName('fruit').setDescription('Tên mục').setRequired(true).setAutocomplete(true)))
  .addSubcommand((s) =>
    s.setName('submit').setDescription('Đóng góp stat cap (chờ duyệt)')
      .addStringOption(fruitOpt)
      .addStringOption((o) => o.setName('move').setDescription('Chiêu: Z, X, C, V, B, E, R, T, M1...').setRequired(true).setMaxLength(30))
      .addStringOption((o) => o.setName('value').setDescription('Giá trị cap (vd: 1100 hoặc "soft 800 / hard 1200")').setRequired(true).setMaxLength(60))
      .addStringOption((o) => o.setName('source').setDescription('Link nguồn (video, wiki, sheet...)').setMaxLength(300)))
  .addSubcommand((s) => s.setName('pending').setDescription('[Editor] Xem các đóng góp chờ duyệt'))
  .addSubcommand((s) =>
    s.setName('approve').setDescription('[Editor] Duyệt đóng góp')
      .addIntegerOption((o) => o.setName('id').setDescription('ID đóng góp').setRequired(true)))
  .addSubcommand((s) =>
    s.setName('reject').setDescription('[Editor] Từ chối đóng góp')
      .addIntegerOption((o) => o.setName('id').setDescription('ID đóng góp').setRequired(true)))
  .addSubcommand((s) =>
    s.setName('set').setDescription('[Editor] Sửa trực tiếp stat cap')
      .addStringOption((o) => o.setName('fruit').setDescription('Tên mục (tạo mới nếu chưa có)').setRequired(true).setAutocomplete(true))
      .addStringOption((o) => o.setName('move').setDescription('Chiêu').setRequired(true).setMaxLength(30))
      .addStringOption((o) => o.setName('value').setDescription('Giá trị').setRequired(true).setMaxLength(60))
      .addStringOption((o) => o.setName('category').setDescription('Phân loại (nếu tạo mới)').addChoices(...categoryChoices))
      .addStringOption((o) => o.setName('source').setDescription('Link nguồn').setMaxLength(300)))
  .addSubcommand((s) =>
    s.setName('import').setDescription('[Editor] Nhập nhanh danh sách dạng text (copy/paste)')
      .addStringOption((o) => o.setName('category').setDescription('Phân loại').setRequired(true).addChoices(...categoryChoices))
      .addStringOption((o) => o.setName('text').setDescription('Dán nội dung (vd: Iron Fist\\n• R = 391\\n• Z = 541)').setRequired(true).setMaxLength(4000))
      .addStringOption((o) => o.setName('source').setDescription('Link nguồn').setMaxLength(300)))
  .addSubcommand((s) =>
    s.setName('remove').setDescription('[Editor] Xoá stat cap 1 chiêu')
      .addStringOption(fruitOpt)
      .addStringOption((o) => o.setName('move').setDescription('Chiêu').setRequired(true)))
  .addSubcommand((s) =>
    s.setName('note').setDescription('[Editor] Đặt ghi chú (vd: Recommend Stat)')
      .addStringOption(fruitOpt)
      .addStringOption((o) => o.setName('text').setDescription('Ghi chú (để trống = xoá)').setMaxLength(1000)))
  .addSubcommand((s) =>
    s.setName('reviewchannel').setDescription('[Admin] Kênh nhận thông báo đóng góp mới')
      .addChannelOption((o) => o.setName('channel').setDescription('Kênh').setRequired(true).addChannelTypes(ChannelType.GuildText)))
  .addSubcommand((s) =>
    s.setName('editorrole').setDescription('[Admin] Thêm/bỏ role được duyệt dữ liệu')
      .addRoleOption((o) => o.setName('role').setDescription('Role').setRequired(true)));

export const commandData = [tts, join, leave, skip, say, fruit].map((c) => c.toJSON());
export { PermissionFlagsBits };

