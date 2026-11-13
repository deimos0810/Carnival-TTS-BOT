import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} from 'discord.js';
import { state, getGuild, save, flushNow } from './store.js';

export const WEAO_BASE_URL = 'https://weao.xyz/api';
export const WEAO_USER_AGENT = 'WEAO-3PService';
export const ROBLOX_ICON_URL = 'https://images.rbxcdn.com/2b3c52e6521c311e51480b5711204859.png';

/**
 * Lấy thông tin phiên bản Roblox từ WEAO API
 */
export async function fetchRobloxVersions(timeoutMs = 8000) {
  const headers = { 'User-Agent': WEAO_USER_AGENT };

  const fetchWithTimeout = async (url) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers, signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  };

  const [current, past, future] = await Promise.allSettled([
    fetchWithTimeout(`${WEAO_BASE_URL}/versions/current`),
    fetchWithTimeout(`${WEAO_BASE_URL}/versions/past`),
    fetchWithTimeout(`${WEAO_BASE_URL}/versions/future`),
  ]);

  return {
    current: current.status === 'fulfilled' ? current.value : null,
    past: past.status === 'fulfilled' ? past.value : null,
    future: future.status === 'fulfilled' ? future.value : null,
    error: current.status === 'rejected' ? current.reason?.message : null,
  };
}

/**
 * Tạo Embed và Button thông báo cập nhật Roblox Windows
 */
export function buildRobloxEmbed({ current, past, isUpdate = false, isTest = false }) {
  if (!current?.Windows) {
    return {
      embeds: [
        new EmbedBuilder()
          .setTitle('⚠️ Không thể lấy thông tin phiên bản Roblox')
          .setDescription('WEAO API tạm thời không phản hồi hoặc đang bảo trì. Vui lòng thử lại sau.')
          .setColor(0xe02424)
          .setTimestamp(),
      ],
      components: [],
    };
  }

  const winVersion = current.Windows;
  const winBuild = current.WindowsResponse?.version || 'N/A';
  const winTimestamp = current.WindowsResponse?.timestamp;
  const pastWinVersion = past?.Windows || null;
  const pastWinBuild = past?.WindowsResponse?.version || null;

  let title = 'ℹ️ Thông Tin Phiên Bản Roblox PC (Windows)';
  let color = 0x00a2ff; // Roblox Blue
  let description = 'Dữ liệu phiên bản được cập nhật trực tiếp từ hệ thống **WEAO API Tracker**.';

  if (isTest) {
    title = '🧪 [TEST] Thông Báo Cập Nhật Roblox PC (Windows)';
    color = 0xf59e0b; // Amber
    description = 'Đây là tin nhắn kiểm tra cấu hình kênh thông báo tự động trên server của bạn.';
  } else if (isUpdate) {
    title = '🚀 PHÁT HIỆN BẢN CẬP NHẬT ROBLOX PC MỚI!';
    color = 0x10b981; // Green
    description = 'Roblox Client trên nền tảng **Windows PC** vừa được cập nhật lên phiên bản mới nhất!';
  }

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setThumbnail(ROBLOX_ICON_URL)
    .addFields(
      {
        name: '🖥️ Phiên Bản Windows Mới Nhất',
        value: `\`${winVersion}\``,
        inline: false,
      },
      {
        name: '🔢 Số Hiệu Bản Dựng (Build)',
        value: `\`${winBuild}\``,
        inline: true,
      },
    );

  if (pastWinVersion) {
    embed.addFields({
      name: '⏪ Phiên Bản Trước Đó',
      value: `\`${pastWinVersion}\`${pastWinBuild ? ` (${pastWinBuild})` : ''}`,
      inline: true,
    });
  }

  if (winTimestamp) {
    embed.addFields({
      name: '⏰ Thời Gian Triển Khai',
      value: `<t:${winTimestamp}:F>\n(<t:${winTimestamp}:R>)`,
      inline: true,
    });
  } else if (current.WindowsDate) {
    embed.addFields({
      name: '📅 Ngày Cập Nhật (UTC)',
      value: `\`${current.WindowsDate}\``,
      inline: true,
    });
  }

  // Tải về qua RDD (Roblox Deployment Downloader)
  const currentRddUrl = `https://rdd.weao.gg/?channel=LIVE&binaryType=WindowsPlayer&version=${winVersion}`;
  let downloadText = `• [Tải phiên bản mới này qua RDD](${currentRddUrl})`;

  if (pastWinVersion) {
    const pastRddUrl = `https://rdd.weao.gg/?channel=LIVE&binaryType=WindowsPlayer&version=${pastWinVersion}`;
    downloadText += `\n• [Tải bản cũ (Downgrade) qua RDD](${pastRddUrl})`;
  }
  downloadText += `\n• [Mở trang theo dõi WEAO Tracker](https://weao.xyz)`;

  embed.addFields({
    name: '📦 Tải Bộ Cài Đặt (Deployment & Downgrade)',
    value: downloadText,
    inline: false,
  });

  embed
    .setFooter({
      text: 'WEAO Roblox Tracker • Tự động thông báo khi có update',
      iconURL: ROBLOX_ICON_URL,
    })
    .setTimestamp();

  // Nút liên kết nhanh
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Tải bản này (RDD)')
      .setURL(currentRddUrl)
      .setStyle(ButtonStyle.Link)
      .setEmoji('📥'),
    new ButtonBuilder()
      .setLabel('Trang Chủ WEAO')
      .setURL('https://weao.xyz')
      .setStyle(ButtonStyle.Link)
      .setEmoji('🌐'),
    new ButtonBuilder()
      .setLabel('API Docs')
      .setURL('https://docs.weao.xyz')
      .setStyle(ButtonStyle.Link)
      .setEmoji('📖'),
  );

  return { embeds: [embed], components: [row] };
}

/**
 * Gửi thông báo đến 1 server cụ thể hoặc toàn bộ các server đã cấu hình kênh
 */
export async function sendRobloxNotification(client, { current, past, isUpdate = false, isTest = false, targetGuildId = null }) {
  const payload = buildRobloxEmbed({ current, past, isUpdate, isTest });
  let sentCount = 0;

  const targetGuilds = targetGuildId
    ? [client.guilds.cache.get(targetGuildId)].filter(Boolean)
    : Array.from(client.guilds.cache.values());

  for (const guild of targetGuilds) {
    try {
      const cfg = getGuild(guild.id);
      if (!cfg.robloxChannelId) continue;

      const channel =
        guild.channels.cache.get(cfg.robloxChannelId) ||
        (await guild.channels.fetch(cfg.robloxChannelId).catch(() => null));

      if (!channel) continue;

      const permissions = channel.permissionsFor(guild.members.me);
      if (!permissions || !permissions.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
        console.warn(`[roblox] Thiếu quyền gửi tin nhắn/embed tại kênh ${channel.name} (${guild.name})`);
        continue;
      }

      let content = null;
      if (cfg.robloxRolePingId) {
        content = cfg.robloxRolePingId === 'everyone' ? '@everyone' : `<@&${cfg.robloxRolePingId}>`;
      }

      await channel.send({
        content: content || undefined,
        ...payload,
      });

      sentCount++;
    } catch (e) {
      console.warn(`[roblox] Không thể gửi thông báo tới guild ${guild.name} (${guild.id}):`, e.message);
    }
  }

  return sentCount;
}

/**
 * Quét định kỳ kiểm tra có bản cập nhật mới hay không
 */
export async function checkRobloxUpdate(client) {
  try {
    const { current, past, error } = await fetchRobloxVersions();
    if (error || !current?.Windows) {
      if (error) console.warn('[roblox] Lỗi khi gọi WEAO API:', error);
      return;
    }

    state.roblox ??= {
      lastWindowsVersion: null,
      lastWindowsDate: null,
      lastUpdated: null,
      lastCheck: null,
    };

    const latestVersion = current.Windows;
    const latestDate = current.WindowsDate;
    const latestTimestamp = current.WindowsResponse?.timestamp || null;

    // Lần chạy đầu tiên: chỉ lưu lại baseline hiện tại, không spam thông báo
    if (!state.roblox.lastWindowsVersion) {
      state.roblox.lastWindowsVersion = latestVersion;
      state.roblox.lastWindowsDate = latestDate;
      state.roblox.lastUpdated = latestTimestamp;
      state.roblox.lastCheck = Date.now();
      save();
      console.log(`[roblox] Khởi tạo baseline phiên bản Roblox Windows: ${latestVersion} (${latestDate})`);
      return;
    }

    // Kiểm tra nếu có phiên bản mới
    if (latestVersion !== state.roblox.lastWindowsVersion) {
      const oldVersion = state.roblox.lastWindowsVersion;
      console.log(`[roblox] 🔔 PHÁT HIỆN CẬP NHẬT ROBLOX MỚI: ${oldVersion} ➜ ${latestVersion}`);

      // Gửi thông báo đến tất cả các kênh discord đã đăng ký
      const sent = await sendRobloxNotification(client, {
        current,
        past: past || { Windows: oldVersion },
        isUpdate: true,
        isTest: false,
      });

      console.log(`[roblox] Đã gửi thông báo cập nhật Roblox tới ${sent} kênh server!`);

      // Cập nhật lại state lưu trữ
      state.roblox.lastWindowsVersion = latestVersion;
      state.roblox.lastWindowsDate = latestDate;
      state.roblox.lastUpdated = latestTimestamp;
      state.roblox.lastCheck = Date.now();
      await flushNow();
    } else {
      state.roblox.lastCheck = Date.now();
    }
  } catch (e) {
    console.error('[roblox] Lỗi trong tiến trình kiểm tra cập nhật:', e.message);
  }
}
