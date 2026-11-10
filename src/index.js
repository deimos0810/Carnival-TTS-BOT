import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  Events,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { startServer } from './server.js';
import { initStore, getGuild, getUser, save, flushNow, state } from './store.js';
import { commandData, voiceChoices } from './commands.js';
import { getSession, joinChannel, leave, sessionCount } from './voice.js';
import { detectLang, LANGS, BUILTIN_DICT, engineName, DEFAULT_VOICE_ID } from './tts.js';
import {
  findValue,
  searchValues,
  allValues,
  valueEmbed,
  valueSpeech,
  syncValues,
  CATEGORIES,
  SHEET_URL,
} from './values.js';
import {
  parseTradeItems,
  evaluateTrade,
  tradeEmbed,
  tradeSpeech,
  handleTradeAutocomplete,
} from './trade.js';

if (!process.env.DISCORD_TOKEN) {
  console.error('Thiếu DISCORD_TOKEN trong biến môi trường!');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

startServer(() => ({
  bot: client.user?.tag ?? null,
  ready: client.isReady(),
  guilds: client.guilds.cache.size,
  voice: sessionCount(),
  engine: engineName(),
  items: Object.keys(state.values || {}).length,
  lastSync: state.lastSync,
}));

// ---------------- Helpers ----------------
const ephemeral = MessageFlags.Ephemeral;
const isAdmin = (member) => member?.permissions?.has(PermissionFlagsBits.ManageGuild);
const isOwner = (userId) => process.env.BOT_OWNER_ID && userId === process.env.BOT_OWNER_ID;
const hasTTSRole = (member, cfg) => cfg.roleIds.some((r) => member.roles.cache.has(r));

function resolveLang(userId, cfg, text) {
  const pref = getUser(userId).lang || cfg.defaultLang;
  return pref === 'auto' ? detectLang(text) : pref;
}

function cleanMessage(msg, maxLength) {
  let t = msg.cleanContent
    .replace(/```[\s\S]*?```/g, ' code ')
    .replace(/<a?:(\w+):\d+>/g, '$1')
    .replace(/<t:\d+(:\w)?>/g, '')
    .replace(/https?:\/\/\S+/gi, ' link ')
    .replace(/\|\|[\s\S]*?\|\|/g, ' spoiler ')
    .replace(/[*_~`>#|@]/g, '')
    .replace(/(.)\1{4,}/g, '$1$1$1')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length > maxLength) t = t.slice(0, maxLength);
  return t;
}

// ---------------- Ready & Guild Events ----------------
client.once(Events.ClientReady, async (c) => {
  console.log(`[bot] Đăng nhập: ${c.user.tag} | ${c.guilds.cache.size} server`);

  // Đăng ký slash command tức thì cho TẤT CẢ các server bot đang tham gia
  for (const guild of c.guilds.cache.values()) {
    try {
      await guild.commands.set(commandData);
      console.log(`[bot] Đã đăng ký lệnh cho server: ${guild.name} (${guild.id})`);
    } catch (e) {
      console.warn(`[bot] Không thể đăng ký lệnh cho ${guild.name}:`, e.message);
    }
  }

  // Đồng thời đăng ký global
  c.application.commands.set(commandData).catch((e) => console.warn('[bot] Lỗi đăng ký global:', e.message));

  // Đồng bộ dữ liệu mới nhất từ Google Sheet khi bot vừa khởi động
  syncValues()
    .then((n) => console.log(`[values] Đã đồng bộ ${n} items từ Google Sheet lúc khởi động!`))
    .catch((e) => console.warn('[values] Chưa tải được sheet mới, đang dùng seed data:', e.message));

  // Tự động kiểm tra và cập nhật lại từ Google Sheet mỗi 30 phút một lần
  setInterval(() => {
    syncValues()
      .then((n) => console.log(`[values] [Auto-Sync] Cập nhật thành công ${n} items từ Google Sheet!`))
      .catch((e) => console.warn('[values] [Auto-Sync] Lỗi:', e.message));
  }, 30 * 60 * 1000);
});

// Tự động đăng ký slash command ngay khi bot được mời vào server mới
client.on(Events.GuildCreate, async (guild) => {
  try {
    await guild.commands.set(commandData);
    console.log(`[bot] Đã vào server mới và đăng ký lệnh: ${guild.name} (${guild.id})`);
    getGuild(guild.id);
    await flushNow();
  } catch (e) {
    console.warn(`[bot] Không thể đăng ký command cho server mới ${guild.name}:`, e.message);
  }
});

// ---------------- Đọc tin nhắn (TTS) ----------------
client.on(Events.MessageCreate, async (msg) => {
  try {
    if (!msg.inGuild() || msg.author.bot || msg.system) return;
    const cfg = getGuild(msg.guild.id);
    if (!cfg.enabled || cfg.roleIds.length === 0) return;
    if (cfg.ignorePrefix && msg.content.startsWith(cfg.ignorePrefix)) return;

    const member = msg.member ?? (await msg.guild.members.fetch(msg.author.id).catch(() => null));
    if (!member || !hasTTSRole(member, cfg)) return;

    const userVC = member.voice.channel;
    if (!userVC) return;

    let session = getSession(msg.guild.id);
    const allowedChannel = cfg.channelIds.includes(msg.channel.id) || msg.channel.id === userVC.id;
    if (!allowedChannel) return;

    if (!session) {
      if (!cfg.autoJoin || !userVC.joinable) return;
      session = await joinChannel(userVC);
    } else if (session.channelId !== userVC.id) {
      return;
    }

    let text = cleanMessage(msg, cfg.maxLength);
    const lang = resolveLang(msg.author.id, cfg, text);
    if (!text) {
      if (msg.attachments.size) text = lang === 'vi' ? 'đã gửi một tệp đính kèm' : 'sent an attachment';
      else if (msg.stickers.size) text = lang === 'vi' ? 'đã gửi một sticker' : 'sent a sticker';
      else return;
    }
    if (cfg.sayName) text = `${member.displayName} ${lang === 'vi' ? 'nói' : 'said'}: ${text}`;
    const u = getUser(msg.author.id);
    session.enqueue(text, lang, u.voiceId, u.engine);
  } catch (e) {
    console.error('[msg] Lỗi:', e.message);
  }
});

// Tự rời khi voice không còn người
client.on(Events.VoiceStateUpdate, (oldState) => {
  const session = getSession(oldState.guild.id);
  if (!session) return;
  const channel = oldState.guild.channels.cache.get(session.channelId);
  if (!channel || channel.members.filter((m) => !m.user.bot).size === 0) leave(oldState.guild.id);
});

// ---------------- Slash commands ----------------
client.on(Events.InteractionCreate, async (i) => {
  try {
    if (i.isAutocomplete()) return await handleAutocomplete(i);
    if (!i.isChatInputCommand() || !i.inGuild()) return;
    const cfg = getGuild(i.guildId);
    const member = i.member;

    switch (i.commandName) {
      case 'join': {
        const vc = member.voice.channel;
        if (!vc) return i.reply({ content: '❌ Bạn phải vào kênh voice trước.', flags: ephemeral });
        if (!vc.joinable) return i.reply({ content: '❌ Bot không có quyền vào kênh này.', flags: ephemeral });
        await i.deferReply();
        await joinChannel(vc);
        return i.editReply(
          `🔊 Đã vào **${vc.name}**. Bot sẽ đọc tin nhắn của người có role: ${
            cfg.roleIds.map((r) => `<@&${r}>`).join(', ') || '_(chưa cài, dùng `/tts addrole`)_'
          }`,
        );
      }
      case 'leave':
        return i.reply(leave(i.guildId) ? '👋 Đã rời voice.' : 'Bot không ở trong voice.');
      case 'skip': {
        const s = getSession(i.guildId);
        if (!s) return i.reply({ content: 'Bot không ở trong voice.', flags: ephemeral });
        s.skip();
        return i.reply({ content: '⏭️ Đã bỏ qua.', flags: ephemeral });
      }
      case 'say': {
        if (!hasTTSRole(member, cfg) && !isAdmin(member))
          return i.reply({ content: '❌ Bạn không có role TTS.', flags: ephemeral });
        const vc = member.voice.channel;
        if (!vc) return i.reply({ content: '❌ Bạn phải vào kênh voice trước.', flags: ephemeral });
        await i.deferReply({ flags: ephemeral });
        const s = await joinChannel(vc);
        const text = i.options.getString('text');
        const opt = i.options.getString('lang');
        const lang = opt && opt !== 'auto' ? opt : resolveLang(i.user.id, cfg, text);
        const u = getUser(i.user.id);
        s.enqueue(text, lang, u.voiceId, u.engine);
        return i.editReply(`🗣️ Đang đọc (${LANGS[lang]}).`);
      }
      case 'tts':
        return await handleTTS(i, cfg, member);
      case 'value':
        if (i.options.getSubcommand() === 'trade') {
          return await handleTradeCommand(i, member);
        }
        return await handleValue(i, member);
      case 'wfl':
        return await handleTradeCommand(i, member);
    }
  } catch (e) {
    console.error('[cmd] Lỗi:', e);
    const content = `❌ Lỗi: ${e.message}`;
    if (i.deferred || i.replied) await i.editReply(content).catch(() => {});
    else await i.reply({ content, flags: ephemeral }).catch(() => {});
  }
});

async function handleTTS(i, cfg, member) {
  const sub = i.options.getSubcommand();
  if (i.options.getSubcommandGroup() === 'word') return handleWord(i, cfg, member, sub);
  if (sub === 'voice') {
    const lang = i.options.getString('lang');
    getUser(i.user.id).lang = lang;
    await flushNow();
    return i.reply({
      content: `✅ Giọng của bạn: **${lang === 'auto' ? 'Tự động' : LANGS[lang]}**`,
      flags: ephemeral,
    });
  }
  if (sub === 'character') {
    const voiceId = i.options.getString('voice');
    getUser(i.user.id).voiceId = voiceId;
    await flushNow();
    const vName = voiceChoices.find((c) => c.value === voiceId)?.name || voiceId;
    return i.reply({
      content: `✅ Nhân vật giọng đọc của bạn: **${vName}**`,
      flags: ephemeral,
    });
  }
  if (sub === 'servervoice') {
    if (!isAdmin(member) && !isOwner(i.user.id))
      return i.reply({ content: '❌ Cần quyền **Manage Server**.', flags: ephemeral });
    const voiceId = i.options.getString('voice');
    cfg.voiceId = voiceId;
    await flushNow();
    const vName = voiceChoices.find((c) => c.value === voiceId)?.name || voiceId;
    return i.reply({
      content: `✅ Nhân vật giọng mặc định của server: **${vName}**`,
      flags: ephemeral,
    });
  }
  if (sub === 'engine') {
    if (!isAdmin(member) && !isOwner(i.user.id))
      return i.reply({ content: '❌ Cần quyền **Manage Server**.', flags: ephemeral });
    const eng = i.options.getString('engine');
    cfg.engine = eng;
    await flushNow();
    return i.reply({
      content: `✅ Đã chuyển bộ đọc âm thanh sang: **${engineName(eng)}**`,
      flags: ephemeral,
    });
  }
  if (sub === 'settings') {
    const currentVoiceId = cfg.voiceId || DEFAULT_VOICE_ID;
    const voiceLabel = voiceChoices.find((c) => c.value === currentVoiceId)?.name || 'Brian';
    const e = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('⚙️ Cài đặt TTS')
      .addFields(
        { name: 'Trạng thái', value: cfg.enabled ? '🟢 Bật' : '🔴 Tắt', inline: true },
        {
          name: 'Bộ đọc (Engine)',
          value: engineName(cfg.engine),
          inline: true,
        },
        {
          name: 'Giọng mặc định',
          value: cfg.defaultLang === 'auto' ? 'Tự động' : LANGS[cfg.defaultLang],
          inline: true,
        },
        { name: 'Nhân vật giọng (nếu dùng ElevenLabs)', value: voiceLabel, inline: true },
        { name: 'Đọc tên', value: cfg.sayName ? 'Có' : 'Không', inline: true },
        { name: 'Tự vào voice', value: cfg.autoJoin ? 'Có' : 'Không', inline: true },
        { name: 'Bỏ qua tin bắt đầu bằng', value: `\`${cfg.ignorePrefix}\``, inline: true },
        { name: 'Bỏ qua tin bắt đầu bằng', value: `\`${cfg.ignorePrefix}\``, inline: true },
        {
          name: 'Role được đọc',
          value: cfg.roleIds.map((r) => `<@&${r}>`).join(', ') || '_Chưa có — bot sẽ không đọc ai_',
        },
        {
          name: 'Kênh chat thêm',
          value: cfg.channelIds.map((c) => `<#${c}>`).join(', ') || '_Chỉ chat của kênh voice_',
        },
      );
    return i.reply({ embeds: [e], flags: ephemeral });
  }

  if (!isAdmin(member) && !isOwner(i.user.id))
    return i.reply({ content: '❌ Cần quyền **Manage Server**.', flags: ephemeral });

  const toggleList = (list, id, add) => {
    const idx = list.indexOf(id);
    if (add && idx === -1) list.push(id);
    if (!add && idx !== -1) list.splice(idx, 1);
  };
  let reply;
  switch (sub) {
    case 'addrole': {
      const r = i.options.getRole('role');
      toggleList(cfg.roleIds, r.id, true);
      reply = `✅ Bot sẽ đọc tin nhắn của người có role ${r}.`;
      break;
    }
    case 'removerole': {
      const r = i.options.getRole('role');
      toggleList(cfg.roleIds, r.id, false);
      reply = `✅ Đã bỏ role ${r}.`;
      break;
    }
    case 'addchannel': {
      const c = i.options.getChannel('channel');
      toggleList(cfg.channelIds, c.id, true);
      reply = `✅ Bot sẽ đọc tin nhắn trong ${c}.`;
      break;
    }
    case 'removechannel': {
      const c = i.options.getChannel('channel');
      toggleList(cfg.channelIds, c.id, false);
      reply = `✅ Đã bỏ kênh ${c}.`;
      break;
    }
    case 'defaultlang':
      cfg.defaultLang = i.options.getString('lang');
      reply = `✅ Giọng mặc định: **${cfg.defaultLang === 'auto' ? 'Tự động' : LANGS[cfg.defaultLang]}**`;
      break;
    case 'toggle':
      cfg.enabled = i.options.getBoolean('enabled');
      reply = cfg.enabled ? '🟢 Đã bật TTS.' : '🔴 Đã tắt TTS.';
      break;
    case 'sayname':
      cfg.sayName = i.options.getBoolean('enabled');
      reply = `✅ Đọc tên người gửi: **${cfg.sayName ? 'Có' : 'Không'}**`;
      break;
    case 'autojoin':
      cfg.autoJoin = i.options.getBoolean('enabled');
      reply = `✅ Tự vào voice: **${cfg.autoJoin ? 'Có' : 'Không'}**`;
      break;
  }
  await flushNow();
  return i.reply({ content: reply, flags: ephemeral });
}

async function handleWord(i, cfg, member, sub) {
  if (sub === 'list') {
    const fmt = ([w, e]) => `\`${w}\` → ${e.say} _(${e.lang})_`;
    const custom = Object.entries(cfg.dict).map(fmt);
    const builtin = Object.entries(BUILTIN_DICT)
      .filter(([w]) => !cfg.dict[w])
      .map(fmt);
    const e = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📖 Từ điển phát âm')
      .addFields(
        { name: 'Của server', value: custom.join('\n').slice(0, 1024) || '_Chưa có — dùng `/tts word add`_' },
        { name: 'Có sẵn', value: builtin.join('\n').slice(0, 1024) || '_Trống_' },
      );
    return i.reply({ embeds: [e], flags: ephemeral });
  }

  if (!isAdmin(member) && !isOwner(i.user.id))
    return i.reply({ content: '❌ Cần quyền **Manage Server**.', flags: ephemeral });

  const word = i.options.getString('word').trim().toLowerCase();
  if (sub === 'add') {
    const say = i.options.getString('say').trim();
    const lang = i.options.getString('lang');
    cfg.dict[word] = { say, lang };
    await flushNow();
    return i.reply({ content: `✅ \`${word}\` sẽ được đọc là **${say}** (${LANGS[lang]}).`, flags: ephemeral });
  }
  if (sub === 'remove') {
    if (!cfg.dict[word])
      return i.reply({ content: `❌ \`${word}\` không có trong từ điển của server.`, flags: ephemeral });
    delete cfg.dict[word];
    await flushNow();
    return i.reply({ content: `✅ Đã xoá \`${word}\`.`, flags: ephemeral });
  }
}

// ---------------- Value List Handlers ----------------
async function handleValue(i, member) {
  const sub = i.options.getSubcommand();

  switch (sub) {
    case 'search': {
      const query = i.options.getString('item');
      const item = findValue(query);
      if (!item) {
        return i.reply({
          content: `❌ Không tìm thấy item nào có tên "${query}". Hãy gõ để chọn từ gợi ý!`,
          flags: ephemeral,
        });
      }

      await i.reply({ embeds: [valueEmbed(item)] });

      if (i.options.getBoolean('speak')) {
        const vc = member.voice.channel;
        if (!vc) {
          return i.followUp({ content: '⚠️ Bạn hãy vào phòng voice để bot đọc giá trị.', flags: ephemeral });
        }
        const s = await joinChannel(vc);
        const lang = i.options.getString('lang') ?? (getUser(i.user.id).lang === 'en' ? 'en' : 'vi');
        s.enqueue(valueSpeech(item, lang), lang);
      }
      return;
    }

    case 'list': {
      const category = i.options.getString('category');
      const tier = i.options.getString('tier');
      const isShiny = i.options.getBoolean('shiny');
      const isUnob = i.options.getBoolean('unob');

      const list = allValues({
        category: category ?? 'all',
        tier: tier ?? undefined,
        isShiny: isShiny === null ? undefined : isShiny,
        isUnob: isUnob === null ? undefined : isUnob,
      });

      const filters = [];
      if (category && category !== 'all') filters.push(CATEGORIES[category]?.label);
      if (tier) filters.push(tier);
      if (isShiny) filters.push('Shiny / Rainbow');
      if (isUnob) filters.push('Unobtainable');

      const title = filters.length ? `📊 Danh sách (${filters.join(' • ')})` : '📊 Danh sách AA Value List';

      if (!list.length) {
        return i.reply({
          content: `🔍 Không tìm thấy item nào phù hợp với bộ lọc đã chọn.`,
          flags: ephemeral,
        });
      }

      // Giới hạn 25 item mỗi trang hiển thị
      const display = list.slice(0, 25);
      const lines = display.map((it) => {
        const cat = CATEGORIES[it.category] ?? CATEGORIES.unit;
        const shiny = it.isShiny ? '✨' : '';
        const unob = it.isUnob ? '🔒' : '';
        return `${cat.emoji}${shiny}${unob} **${it.name}** • Value: \`${it.value}\` • Demand: \`${it.demand}\``;
      });

      const e = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`${title} — Tìm thấy ${list.length} mục`)
        .setURL(SHEET_URL)
        .setDescription(lines.join('\n'))
        .setFooter({
          text: list.length > 25 ? `Hiển thị 25/${list.length} mục. Dùng /value search để xem chi tiết từng món.` : 'Dùng /value search để xem chi tiết.',
        });

      return i.reply({ embeds: [e] });
    }

    case 'info': {
      const all = Object.values(state.values || {});
      const gamepasses = all.filter((i) => i.category === 'gamepass').length;
      const units = all.filter((i) => i.category === 'unit').length;
      const sTier = all.filter((i) => i.tier === 'S Tier').length;
      const aTier = all.filter((i) => i.tier === 'A Tier').length;
      const bTier = all.filter((i) => i.tier === 'B Tier').length;
      const cTier = all.filter((i) => i.tier === 'C Tier').length;
      const skins = all.filter((i) => i.category === 'skin').length;
      const relics = all.filter((i) => i.category === 'relic').length;
      const shinies = all.filter((i) => i.isShiny).length;
      const unobs = all.filter((i) => i.isUnob).length;

      const e = new EmbedBuilder()
        .setColor(0x00b0f4)
        .setTitle('📊 Thông tin AA Value List')
        .setURL(SHEET_URL)
        .setDescription(`Bảng giá được đồng bộ trực tiếp từ [Google Spreadsheet chính thức](${SHEET_URL}).`)
        .addFields(
          { name: '📦 Tổng số item', value: `\`${all.length}\``, inline: true },
          { name: '🎮 Gamepasses', value: `\`${gamepasses}\``, inline: true },
          { name: '⚔️ Tổng Units', value: `\`${units}\``, inline: true },
          {
            name: '🏆 Phân hạng Unit',
            value: `• **S Tier**: ${sTier}\n• **A Tier**: ${aTier}\n• **B Tier**: ${bTier}\n• **C Tier**: ${cTier}`,
            inline: true,
          },
          {
            name: '✨ Phân loại đặc biệt',
            value: `• **Shiny / Rainbow**: ${shinies}\n• **Unobtainable (Unob)**: ${unobs}\n• **Skins**: ${skins}\n• **Relics**: ${relics}`,
            inline: true,
          },
          {
            name: '🕒 Lần đồng bộ gần nhất',
            value: state.lastSync ? `<t:${Math.floor(new Date(state.lastSync).getTime() / 1000)}:R>` : 'Chưa có',
            inline: true,
          },
        )
        .setFooter({ text: 'Bot tự động đồng bộ mỗi 30 phút một lần • /value sync để cập nhật ngay' });

      return i.reply({ embeds: [e] });
    }

    case 'sync': {
      if (!isAdmin(member) && !isOwner(i.user.id)) {
        return i.reply({ content: '❌ Bạn cần quyền **Manage Server** để đồng bộ dữ liệu.', flags: ephemeral });
      }
      await i.deferReply();
      try {
        const count = await syncValues();
        return i.editReply(
          `✅ Đã đồng bộ thành công **${count}** items từ [Google Spreadsheet](${SHEET_URL})!\nThời gian: <t:${Math.floor(
            Date.now() / 1000,
          )}:R>`,
        );
      } catch (err) {
        return i.editReply(`❌ Lỗi khi đồng bộ từ Google Sheet: ${err.message}`);
      }
    }
  }
}

async function handleTradeCommand(i, member) {
  const giveStr = i.options.getString('give');
  const getStr = i.options.getString('get');

  const giveParsed = parseTradeItems(giveStr);
  const getParsed = parseTradeItems(getStr);

  const notFound = [...giveParsed.notFound, ...getParsed.notFound];

  if (!giveParsed.items.length && !getParsed.items.length) {
    return i.reply({
      content: `❌ Không tìm thấy item hợp lệ nào trong kèo trade!\nKhông nhận diện được: ${notFound.map((s) => `\`${s}\``).join(', ')}`,
      flags: ephemeral,
    });
  }

  const result = evaluateTrade(giveParsed.items, getParsed.items);
  await i.reply({ embeds: [tradeEmbed(result, notFound)] });

  if (i.options.getBoolean('speak')) {
    const vc = member.voice.channel;
    if (!vc) {
      return i.followUp({ content: '⚠️ Bạn hãy vào phòng voice để bot đọc kết quả trade.', flags: ephemeral });
    }
    const s = await joinChannel(vc);
    const lang = i.options.getString('lang') ?? (getUser(i.user.id).lang === 'en' ? 'en' : 'vi');
    s.enqueue(tradeSpeech(result, lang), lang);
  }
}

async function handleAutocomplete(i) {
  const focusedOption = i.options.getFocused(true);

  // Nếu đang gõ ở ô give hoặc get của kèo trade
  if (focusedOption.name === 'give' || focusedOption.name === 'get') {
    const choices = handleTradeAutocomplete(focusedOption.value);
    return await i.respond(choices.slice(0, 25));
  }

  const focused = focusedOption.value;
  const choices = searchValues(focused, 25).map((it) => {
    const cat = CATEGORIES[it.category] ?? CATEGORIES.unit;
    const shiny = it.isShiny ? '✨' : '';
    const tier = it.tier ? `[${it.tier}] ` : '';
    return {
      name: `${shiny}${cat.emoji} ${tier}${it.name} (Val: ${it.value})`.slice(0, 100),
      value: it.key,
    };
  });
  await i.respond(
    choices.length
      ? choices
      : [{ name: focused.slice(0, 100) || 'Gõ để tìm kiếm...', value: focused.slice(0, 100) || 'none' }],
  );
}

// ---------------- Shutdown Gracefully ----------------
let isShuttingDown = false;
async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[bot] Nhận tín hiệu ${signal}, đang lưu toàn bộ dữ liệu an toàn trước khi thoát...`);
  try {
    await flushNow();
    console.log('[store] Đã lưu dữ liệu MongoDB & local backup thành công.');
  } catch (err) {
    console.error('[store] Lỗi khi lưu dữ liệu trước khi thoát:', err.message);
  }
  try {
    client.destroy();
  } catch {}
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ---------------- Start ----------------
process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));
process.on('uncaughtException', (e) => console.error('[uncaughtException]', e));

await initStore();
await client.login(process.env.DISCORD_TOKEN);
