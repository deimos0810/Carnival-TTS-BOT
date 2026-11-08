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
import { initStore, getGuild, getUser, save, state } from './store.js';
import { commandData } from './commands.js';
import { getSession, joinChannel, leave, sessionCount } from './voice.js';
import { detectLang, LANGS } from './tts.js';
import * as F from './fruits.js';
import { fetchFruitFromWiki } from './wiki.js';

if (!process.env.DISCORD_TOKEN) {
  console.error('Thiếu DISCORD_TOKEN trong biến môi trường!');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Privileged: phải bật trong Developer Portal
    GatewayIntentBits.GuildVoiceStates,
  ],
});

startServer(() => ({ bot: client.user?.tag ?? null, ready: client.isReady(), guilds: client.guilds.cache.size, voice: sessionCount() }));

// ---------------- Helpers ----------------
const ephemeral = MessageFlags.Ephemeral;
const isAdmin = (member) => member?.permissions?.has(PermissionFlagsBits.ManageGuild);
const isOwner = (userId) => process.env.BOT_OWNER_ID && userId === process.env.BOT_OWNER_ID;
const hasTTSRole = (member, cfg) => cfg.roleIds.some((r) => member.roles.cache.has(r));
const isEditor = (member, cfg) =>
  isOwner(member.id) || isAdmin(member) || cfg.editorRoleIds.some((r) => member.roles.cache.has(r));

function resolveLang(userId, cfg, text) {
  const pref = getUser(userId).lang || cfg.defaultLang;
  return pref === 'auto' ? detectLang(text) : pref;
}

function cleanMessage(msg, maxLength) {
  let t = msg.cleanContent
    .replace(/```[\s\S]*?```/g, ' code ')
    .replace(/<a?:(\w+):\d+>/g, '$1') // emoji custom -> tên
    .replace(/<t:\d+(:\w)?>/g, '')
    .replace(/https?:\/\/\S+/gi, ' link ')
    .replace(/\|\|[\s\S]*?\|\|/g, ' spoiler ')
    .replace(/[*_~`>#|@]/g, '')
    .replace(/(.)\1{4,}/g, '$1$1$1') // "aaaaaaa" -> "aaa"
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length > maxLength) t = t.slice(0, maxLength);
  return t;
}

// ---------------- Ready ----------------
client.once(Events.ClientReady, async (c) => {
  console.log(`[bot] Đăng nhập: ${c.user.tag} | ${c.guilds.cache.size} server`);
  // Đăng ký slash command tức thì cho TẤT CẢ các server bot đang tham gia
  for (const guild of c.guilds.cache.values()) {
    try {
      await guild.commands.set(commandData);
      console.log(`[bot] Đã đăng ký slash command tức thì cho: ${guild.name} (${guild.id})`);
    } catch (e) {
      console.warn(`[bot] Không thể đăng ký command cho ${guild.name}:`, e.message);
    }
  }
  // Đồng thời đăng ký global
  c.application.commands.set(commandData).catch((e) => console.warn('[bot] Lỗi đăng ký global:', e.message));
});

// Tự động đăng ký slash command ngay khi bot được mời vào server mới
client.on(Events.GuildCreate, async (guild) => {
  try {
    await guild.commands.set(commandData);
    console.log(`[bot] Đã vào server mới và đăng ký lệnh tức thì: ${guild.name} (${guild.id})`);
  } catch (e) {
    console.warn(`[bot] Không thể đăng ký command cho server mới ${guild.name}:`, e.message);
  }
});

// ---------------- Đọc tin nhắn ----------------
client.on(Events.MessageCreate, async (msg) => {
  try {
    if (!msg.inGuild() || msg.author.bot || msg.system) return;
    const cfg = getGuild(msg.guild.id);
    if (!cfg.enabled || cfg.roleIds.length === 0) return;
    if (cfg.ignorePrefix && msg.content.startsWith(cfg.ignorePrefix)) return;

    const member = msg.member ?? (await msg.guild.members.fetch(msg.author.id).catch(() => null));
    if (!member || !hasTTSRole(member, cfg)) return; // Chỉ đọc người có role

    const userVC = member.voice.channel;
    if (!userVC) return; // Người gửi phải đang ở voice

    let session = getSession(msg.guild.id);
    // Kênh hợp lệ: kênh đã cấu hình, hoặc chat của chính voice channel
    const allowedChannel = cfg.channelIds.includes(msg.channel.id) || msg.channel.id === userVC.id;
    if (!allowedChannel) return;

    if (!session) {
      if (!cfg.autoJoin || !userVC.joinable) return;
      session = await joinChannel(userVC);
    } else if (session.channelId !== userVC.id) {
      return; // Bot đang ở kênh voice khác
    }

    let text = cleanMessage(msg, cfg.maxLength);
    const lang = resolveLang(msg.author.id, cfg, text);
    if (!text) {
      if (msg.attachments.size) text = lang === 'vi' ? 'đã gửi một tệp đính kèm' : 'sent an attachment';
      else if (msg.stickers.size) text = lang === 'vi' ? 'đã gửi một sticker' : 'sent a sticker';
      else return;
    }
    if (cfg.sayName) text = `${member.displayName} ${lang === 'vi' ? 'nói' : 'said'}: ${text}`;
    session.enqueue(text, lang);
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
        return i.editReply(`🔊 Đã vào **${vc.name}**. Bot sẽ đọc tin nhắn của người có role: ${cfg.roleIds.map((r) => `<@&${r}>`).join(', ') || '_(chưa cài, dùng `/tts addrole`)_'}`);
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
        s.enqueue(text, lang);
        return i.editReply(`🗣️ Đang đọc (${LANGS[lang]}).`);
      }
      case 'tts':
        return await handleTTS(i, cfg, member);
      case 'fruit':
        return await handleFruit(i, cfg, member);
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
  if (sub === 'voice') {
    const lang = i.options.getString('lang');
    getUser(i.user.id).lang = lang;
    save();
    return i.reply({ content: `✅ Giọng của bạn: **${lang === 'auto' ? 'Tự động' : LANGS[lang]}**`, flags: ephemeral });
  }
  if (sub === 'settings') {
    const e = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('⚙️ Cài đặt TTS')
      .addFields(
        { name: 'Trạng thái', value: cfg.enabled ? '🟢 Bật' : '🔴 Tắt', inline: true },
        { name: 'Giọng mặc định', value: cfg.defaultLang === 'auto' ? 'Tự động' : LANGS[cfg.defaultLang], inline: true },
        { name: 'Đọc tên', value: cfg.sayName ? 'Có' : 'Không', inline: true },
        { name: 'Tự vào voice', value: cfg.autoJoin ? 'Có' : 'Không', inline: true },
        { name: 'Bỏ qua tin bắt đầu bằng', value: `\`${cfg.ignorePrefix}\``, inline: true },
        { name: 'Role được đọc', value: cfg.roleIds.map((r) => `<@&${r}>`).join(', ') || '_Chưa có — bot sẽ không đọc ai_' },
        { name: 'Kênh chat thêm', value: cfg.channelIds.map((c) => `<#${c}>`).join(', ') || '_Chỉ chat của kênh voice_' },
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
  save();
  return i.reply({ content: reply, flags: ephemeral });
}

async function handleFruit(i, cfg, member) {
  const sub = i.options.getSubcommand();
  const fruitName = i.options.getString('fruit');
  const needFruit = () => {
    const f = F.findFruit(fruitName);
    if (!f) throw new Error(`Không tìm thấy trái "${fruitName}". Dùng \`/fruit list\` hoặc \`/fruit wiki\`.`);
    return f;
  };
  const requireEditor = () => {
    if (!isEditor(member, cfg)) throw new Error('Bạn không có quyền duyệt/sửa dữ liệu (cần Manage Server hoặc role editor).');
  };

  switch (sub) {
    case 'info': {
      const f = needFruit();
      await i.reply({ embeds: [F.fruitEmbed(f)] });
      if (i.options.getBoolean('speak')) {
        const vc = member.voice.channel;
        if (!vc) return i.followUp({ content: '⚠️ Vào voice để bot đọc to.', flags: ephemeral });
        const s = await joinChannel(vc);
        const lang = i.options.getString('lang') ?? (getUser(i.user.id).lang === 'en' ? 'en' : 'vi');
        s.enqueue(F.fruitSpeech(f, lang), lang);
      }
      return;
    }
    case 'list': {
      const catFilter = i.options.getString('category');
      const list = F.allFruits(catFilter);
      const catInfo = catFilter ? F.CATEGORIES[catFilter] : null;
      const title = catInfo ? `${catInfo.emoji} ${catInfo.label} (${list.length})` : `📚 Danh sách Stat Cap (${list.length})`;
      const lines = list.map((f) => {
        const c = F.CATEGORIES[f.category] ?? F.CATEGORIES.other;
        return `${Object.keys(f.caps).length ? '✅' : '▫️'} ${c.emoji} **${f.name}** (${Object.keys(f.caps).length} chiêu)`;
      });
      const e = new EmbedBuilder()
        .setColor(0xff7a00)
        .setTitle(title)
        .setDescription(lines.join('\n').slice(0, 4000) || '_Không có mục nào._')
        .setFooter({ text: '✅ = đã có dữ liệu stat cap · /fruit info <tên> để xem' });
      return i.reply({ embeds: [e] });
    }
    case 'wiki': {
      await i.deferReply();
      const known = F.findFruit(fruitName);
      const data = await fetchFruitFromWiki(known?.name.split(',')[0] ?? fruitName);
      if (!data) return i.editReply(`❌ Không tìm thấy "${fruitName}" trên GPO Wiki.`);
      const e = new EmbedBuilder().setColor(0x00b0f4).setTitle(`📖 ${data.title}`).setURL(data.url);
      const info = Object.entries(data.infobox).slice(0, 12).map(([k, v]) => `**${k}**: ${v}`).join('\n');
      if (info) e.addFields({ name: 'Thông tin', value: info.slice(0, 1024) });
      e.addFields({
        name: 'Dòng nhắc tới cap trên Wiki',
        value: (data.capLines.map((l) => `• ${l}`).join('\n') || '_Trang Wiki không ghi stat cap._').slice(0, 1024),
      });
      e.setFooter({ text: 'Nguồn: GPO Fandom Wiki · Có thể chưa cập nhật theo bản game mới nhất' });
      return i.editReply({ embeds: [e] });
    }
    case 'submit': {
      const f = needFruit();
      const source = i.options.getString('source');
      const entry = F.addSubmission({
        fruitKey: f.key,
        move: i.options.getString('move'),
        value: i.options.getString('value'),
        source,
        userId: i.user.id,
        userTag: i.user.tag,
        guildId: i.guildId,
      });
      await i.reply({
        content: `📨 Đã gửi đóng góp **#${entry.id}**: ${f.name} · ${entry.move} = \`${entry.value}\`. Chờ editor duyệt!`,
        flags: ephemeral,
      });
      if (cfg.reviewChannelId) {
        const ch = await i.guild.channels.fetch(cfg.reviewChannelId).catch(() => null);
        ch?.send(`🆕 Đóng góp **#${entry.id}** từ ${i.user}: **${f.name}** · ${entry.move} = \`${entry.value}\`${source ? `\nNguồn: <${source}>` : ''}\n→ \`/fruit approve id:${entry.id}\` hoặc \`/fruit reject id:${entry.id}\``).catch(() => {});
      }
      return;
    }
    case 'pending': {
      requireEditor();
      const list = state.submissions.slice(0, 20);
      if (!list.length) return i.reply({ content: '✨ Không có đóng góp nào chờ duyệt.', flags: ephemeral });
      const text = list
        .map((s) => `**#${s.id}** ${state.fruits[s.fruitKey]?.name ?? s.fruitKey} · ${s.move} = \`${s.value}\` — ${s.userTag}${s.source ? ` · <${s.source}>` : ''}`)
        .join('\n');
      return i.reply({ content: text.slice(0, 2000), flags: ephemeral });
    }
    case 'approve': {
      requireEditor();
      const s = F.removeSubmission(i.options.getInteger('id'));
      if (!s) return i.reply({ content: '❌ Không tìm thấy ID.', flags: ephemeral });
      const f = state.fruits[s.fruitKey];
      if (!f) return i.reply({ content: '❌ Trái này không còn tồn tại.', flags: ephemeral });
      F.setCap(f, s.move, s.value, { by: `${s.userTag} (duyệt bởi ${i.user.tag})`, source: s.source });
      return i.reply(`✅ Đã duyệt **#${s.id}**: ${f.name} · ${s.move} = \`${s.value}\``);
    }
    case 'reject': {
      requireEditor();
      const s = F.removeSubmission(i.options.getInteger('id'));
      return i.reply({ content: s ? `🗑️ Đã từ chối #${s.id}.` : '❌ Không tìm thấy ID.', flags: ephemeral });
    }
    case 'set': {
      requireEditor();
      const cat = i.options.getString('category') ?? 'fruit';
      const f = F.findFruit(fruitName) ?? F.createFruit(fruitName, cat);
      if (i.options.getString('category')) f.category = cat;
      F.setCap(f, i.options.getString('move'), i.options.getString('value'), {
        by: i.user.tag,
        source: i.options.getString('source'),
      });
      return i.reply({ embeds: [F.fruitEmbed(f)] });
    }
    case 'import': {
      requireEditor();
      const cat = i.options.getString('category');
      const text = i.options.getString('text');
      const source = i.options.getString('source');
      const parsed = F.parseImport(text);
      if (!parsed.length) {
        return i.reply({
          content: '❌ Không nhận diện được dữ liệu nào. Định dạng mẫu:\n```\nIron Fist\n• R = 391\n• Z = 541\n• Recommend Stat = 720 STR + 300 FS\n```',
          flags: ephemeral,
        });
      }
      const applied = F.applyImport(parsed, cat, { by: i.user.tag, source });
      const summary = applied.map((a) => `• **${a.fruit.name}**: đã cập nhật ${a.count} chiêu${a.fruit.notes ? ` (${a.fruit.notes})` : ''}`).join('\n');
      return i.reply({
        content: `✅ Đã nhập thành công **${applied.length}** mục (${F.CATEGORIES[cat]?.label}):\n${summary}`.slice(0, 2000),
      });
    }
    case 'remove': {
      requireEditor();
      const f = needFruit();
      const ok = F.removeCap(f, i.options.getString('move'));
      return i.reply({ content: ok ? '🗑️ Đã xoá.' : '❌ Chiêu này chưa có dữ liệu.', flags: ephemeral });
    }
    case 'note': {
      requireEditor();
      const f = needFruit();
      f.notes = i.options.getString('text') ?? '';
      save();
      return i.reply({ content: '✅ Đã cập nhật ghi chú.', flags: ephemeral });
    }
    case 'reviewchannel': {
      if (!isAdmin(member)) throw new Error('Cần quyền Manage Server.');
      cfg.reviewChannelId = i.options.getChannel('channel').id;
      save();
      return i.reply({ content: `✅ Đóng góp mới sẽ được báo vào <#${cfg.reviewChannelId}>.`, flags: ephemeral });
    }
    case 'editorrole': {
      if (!isAdmin(member)) throw new Error('Cần quyền Manage Server.');
      const r = i.options.getRole('role');
      const idx = cfg.editorRoleIds.indexOf(r.id);
      if (idx === -1) cfg.editorRoleIds.push(r.id);
      else cfg.editorRoleIds.splice(idx, 1);
      save();
      return i.reply({ content: idx === -1 ? `✅ ${r} giờ có thể duyệt dữ liệu.` : `✅ Đã bỏ quyền editor của ${r}.`, flags: ephemeral });
    }
  }
}

async function handleAutocomplete(i) {
  const focused = i.options.getFocused();
  const choices = F.searchFruits(focused).map((f) => {
    const emoji = F.CATEGORIES[f.category]?.emoji ?? '🍎';
    return { name: `${emoji} ${f.name}`.slice(0, 100), value: f.key };
  });
  await i.respond(choices.length ? choices : [{ name: focused.slice(0, 100) || '...', value: focused.slice(0, 100) || '...' }]);
}

// ---------------- Start ----------------
process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));
process.on('uncaughtException', (e) => console.error('[uncaughtException]', e));

await initStore();
await client.login(process.env.DISCORD_TOKEN);

