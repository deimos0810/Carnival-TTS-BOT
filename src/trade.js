import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} from 'discord.js';
import { findValue, searchValues, CATEGORIES } from './values.js';

export const tradeSessions = new Map();

function parseNumber(str, def = 0) {
  if (!str || str === 'N/A' || str === 'Untradable') return def;
  const n = parseFloat(String(str).replace(/,/g, ''));
  return isNaN(n) ? def : n;
}

export function cleanItemName(raw) {
  return raw
    .replace(/\s*\([^)]*Val:[^)]*\)/gi, '')
    .replace(/\s*\([^)]*Tier[^)]*\)/gi, '')
    .replace(/\s*\([^)]*Demand:[^)]*\)/gi, '')
    .replace(/^[\s*xX•\-_:;,~`|⚔🎮🎨🔮✨📊]+/g, '')
    .replace(/[\s*xX•\-_:;,~`|⚔🎮🎨🔮✨📊]+$/g, '')
    .trim();
}

export function shortenItemName(name) {
  if (!name) return '';
  if (name.includes(' / ')) {
    const parts = name.split(' / ');
    return parts[1] || name;
  }
  return name;
}

/** Tách chuỗi danh sách item, hỗ trợ số lượng thông minh (vd: "2 aizen", "aizen 2", "2x dio", "summer bundle 1") */
export function parseTradeItems(text) {
  if (!text) return { items: [], notFound: [] };
  // Xóa sạch các phụ chú (Val: ..., Tier: ...) trước khi split để dấu phẩy trong số (vd: 17,000) không làm vỡ câu
  const sanitized = text
    .replace(/\([^)]*Val:[^)]*\)/gi, '')
    .replace(/\([^)]*Tier[^)]*\)/gi, '')
    .replace(/\([^)]*Demand:[^)]*\)/gi, '');

  const parts = sanitized
    .split(/[,+\n&]|(?:\s+và\s+)|\sand\s/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const items = [];
  const notFound = [];

  for (const part of parts) {
    let qty = 1;
    let cleanName = part;

    // 1. Kiểm tra trực tiếp cả chuỗi part có phải tên 1 item không (vd: 'Summer Bundle 1', 'SSS DMG (Stat)')
    const directItem = findValue(cleanItemName(cleanName));
    if (directItem) {
      const existing = items.find((e) => e.item.key === directItem.key);
      if (existing) existing.qty += 1;
      else items.push({ item: directItem, qty: 1 });
      continue;
    }

    // Pattern 1: "2x item" hoặc "2* item"
    const m1 = cleanName.match(/^(\d+)\s*[*xX]\s*(.+)$/);
    if (m1) {
      qty = Math.max(1, parseInt(m1[1], 10));
      cleanName = m1[2];
    } else {
      // Pattern 2: "2 item" (số đứng trước chữ, vd: "2 dark mage" hoặc "6 aizen")
      const m2 = cleanName.match(/^(\d+)\s+([a-zA-Z\u00C0-\u1EF9].+)$/);
      if (m2) {
        qty = Math.max(1, parseInt(m2[1], 10));
        cleanName = m2[2];
      } else {
        // Pattern 3: "item x2" hoặc "item * 2"
        const m3 = cleanName.match(/^(.+?)\s*[*xX]\s*(\d+)$/);
        if (m3) {
          qty = Math.max(1, parseInt(m3[2], 10));
          cleanName = m3[1];
        } else {
          // Pattern 4: "item 2" (số sau chữ, vd: "aizen 6")
          const m4 = cleanName.match(/^([a-zA-Z\u00C0-\u1EF9].+?)\s+(\d+)$/);
          if (m4 && isNaN(m4[1])) {
            qty = Math.max(1, parseInt(m4[2], 10));
            cleanName = m4[1];
          }
        }
      }
    }

    const stripped = cleanItemName(cleanName);
    const item = findValue(stripped) || findValue(cleanName);
    if (item) {
      const existing = items.find((e) => e.item.key === item.key);
      if (existing) existing.qty += qty;
      else items.push({ item, qty });
    } else {
      notFound.push(cleanName);
    }
  }

  return { items, notFound };
}

/** Đánh giá kèo trade W/F/L dựa trên Value, Demand, Trend, Unob/Shiny */
export function evaluateTrade(giveEntries, getEntries) {
  if (giveEntries.length === 0 && getEntries.length === 0) {
    return {
      give: { details: [], rawTotal: 0, scoreTotal: 0, avgDemand: 0, totalQty: 0, specialItems: [] },
      get: { details: [], rawTotal: 0, scoreTotal: 0, avgDemand: 0, totalQty: 0, specialItems: [] },
      ratio: 1.0,
      valDiff: 0,
      demandDiff: 0,
      hasSpecial: false,
      verdict: 'EMPTY',
      verdictColor: 0x5865f2,
      verdictEmoji: '⚖️',
      verdictTitle: 'BẢNG SO KÈO TRADE (W/F/L)',
      advice: 'Chưa có vật phẩm nào. Bấm các nút bên dưới để thêm món vào kèo trade!',
    };
  }

  const calcSide = (entries) => {
    let rawTotal = 0;
    let scoreTotal = 0;
    let demandWeighted = 0;
    let totalQty = 0;
    const specialItems = [];

    const details = entries.map(({ item, qty }) => {
      const valNum = parseNumber(item.value, -1);
      const demNum = parseNumber(item.demand, 5.0);
      const isSpecial = valNum <= 0;
      if (isSpecial) specialItems.push(item);

      // Hệ số nhân thông minh
      let multiplier = 1.0;
      // Nhu cầu (Demand): mỗi 1.0 điểm so với chuẩn 5.0 cộng/trừ 4%
      multiplier += (demNum - 5.0) * 0.04;

      // Xu hướng (Trend)
      const trendLower = (item.trend || '').toLowerCase();
      if (trendLower.includes('rising')) multiplier += 0.05;
      else if (trendLower.includes('dropping')) multiplier -= 0.05;
      else if (trendLower.includes('overpriced')) multiplier -= 0.07;
      else if (trendLower.includes('unstable')) multiplier -= 0.03;

      // Tính chất Unob/Giới hạn
      if (item.isUnob) multiplier += 0.03;

      const effectiveVal = valNum > 0 ? valNum : 0;
      const itemScore = effectiveVal * qty * Math.max(0.5, multiplier);

      rawTotal += effectiveVal * qty;
      scoreTotal += itemScore;
      demandWeighted += demNum * qty;
      totalQty += qty;

      return { item, qty, valNum, demNum, isSpecial, multiplier, itemScore };
    });

    const avgDemand = totalQty > 0 ? demandWeighted / totalQty : 5.0;
    return { details, rawTotal, scoreTotal, avgDemand, totalQty, specialItems };
  };

  const give = calcSide(giveEntries);
  const get = calcSide(getEntries);

  let ratio = 1.0;
  if (give.scoreTotal > 0 && get.scoreTotal > 0) {
    ratio = get.scoreTotal / give.scoreTotal;
  } else if (give.scoreTotal === 0 && get.scoreTotal > 0) {
    ratio = 2.0;
  } else if (give.scoreTotal > 0 && get.scoreTotal === 0) {
    ratio = 0.5;
  }

  let verdict = 'FAIR';
  let verdictColor = 0xf1c40f; // Vàng
  let verdictEmoji = '⚖️';
  let verdictTitle = 'FAIR (Ngang Kèo / Cân Bằng)';
  let advice = '';

  const hasSpecial = give.specialItems.length > 0 || get.specialItems.length > 0;

  if (ratio >= 1.25) {
    verdict = 'BIG_WIN';
    verdictColor = 0x2ecc71; // Xanh lá đậm
    verdictEmoji = '🚀';
    verdictTitle = 'BIG WIN (Lời Rất Nhiều / Siêu Hời)';
    advice = 'Kèo này bạn lời vượt trội về cả giá trị lẫn nhu cầu thị trường. Chốt trade ngay lập tức!';
  } else if (ratio >= 1.08) {
    verdict = 'WIN';
    verdictColor = 0x27ae60; // Xanh lá
    verdictEmoji = '🟢';
    verdictTitle = 'WIN (Có Lời)';
    advice = 'Kèo này có lợi thế cho bạn. Giá trị hoặc độ hot của bên nhận cao hơn bên bạn đưa.';
  } else if (ratio >= 0.93) {
    verdict = 'FAIR';
    verdictColor = 0xf1c40f; // Vàng
    verdictEmoji = '⚖️';
    verdictTitle = 'FAIR (Cân Bằng / Ngang Giá)';
    advice = 'Kèo tương đương nhau về giá trị và nhu cầu. Quyết định tuỳ thuộc vào việc bạn thích unit nào hơn.';
  } else if (ratio >= 0.78) {
    verdict = 'LOSS';
    verdictColor = 0xe67e22; // Cam
    verdictEmoji = '🔴';
    verdictTitle = 'LOSS (Hơi Lỗ)';
    advice = 'Kèo này bạn bị thiệt về value hoặc demand. Không nên đổi trừ khi bạn đang cực kỳ cần món đó.';
  } else {
    verdict = 'BIG_LOSS';
    verdictColor = 0xe74c3c; // Đỏ
    verdictEmoji = '💀';
    verdictTitle = 'BIG LOSS (Lỗ Nặng / Không Nên)';
    advice = 'Kèo lỗ rất nặng! Bạn đang đưa ra vật phẩm giá trị hơn nhiều lần. Tuyệt đối không trade!';
  }

  const valDiff = get.rawTotal - give.rawTotal;
  const demandDiff = get.avgDemand - give.avgDemand;

  return {
    give,
    get,
    ratio,
    valDiff,
    demandDiff,
    hasSpecial,
    verdict,
    verdictColor,
    verdictEmoji,
    verdictTitle,
    advice,
  };
}

export function formatTradeList(side) {
  if (!side.details.length) return '_Chưa có vật phẩm nào_';
  return side.details
    .map(({ item, qty }) => {
      const cat = CATEGORIES[item.category] ?? CATEGORIES.unit;
      const shiny = item.isShiny ? '✨ ' : '';
      const tierStr = item.tier ? `\`[${item.tier}]\` ` : '';
      const qtyStr = qty > 1 ? `**${qty}x** ` : '';
      const unitVal = parseNumber(item.value, 0);
      const totalVal = unitVal > 0 && qty > 1 ? ` *(Tổng: \`${(unitVal * qty).toLocaleString()}\`)*` : '';
      return `${cat.emoji} ${qtyStr}${shiny}**${item.name}** ${tierStr}\n↳ Giá: \`${item.value}\`${totalVal} • Demand: \`${item.demand}\` • Trend: \`${item.trend}\``;
    })
    .join('\n\n');
}

export function tradeEmbed(result, notFound = []) {
  const e = new EmbedBuilder()
    .setColor(result.verdictColor)
    .setTitle(`${result.verdictEmoji} ${result.verdictTitle}`)
    .setDescription(`> 💡 **Đánh giá:** ${result.advice}`);

  e.addFields(
    {
      name: '📤 BẠN ĐƯA (YOU GIVE)',
      value: `${formatTradeList(result.give)}\n\n**Tổng Value:** \`${result.give.rawTotal.toLocaleString()}\` • **Avg Demand:** \`${result.give.avgDemand.toFixed(1)}\``,
      inline: true,
    },
    {
      name: '📥 BẠN NHẬN (YOU GET)',
      value: `${formatTradeList(result.get)}\n\n**Tổng Value:** \`${result.get.rawTotal.toLocaleString()}\` • **Avg Demand:** \`${result.get.avgDemand.toFixed(1)}\``,
      inline: true,
    },
  );

  if (result.give.totalQty > 0 || result.get.totalQty > 0) {
    const analysisLines = [];
    const diffSign = result.valDiff >= 0 ? '+' : '';
    analysisLines.push(`• **Chênh lệch Value:** \`${diffSign}${result.valDiff.toLocaleString()}\` điểm value thuần.`);

    if (result.demandDiff > 0.5) {
      analysisLines.push(`• **Độ hot (Demand):** 🟢 Bên bạn nhận có nhu cầu cao hơn (\`+${result.demandDiff.toFixed(1)}\`), dễ trade/flip hơn.`);
    } else if (result.demandDiff < -0.5) {
      analysisLines.push(`• **Độ hot (Demand):** 🔴 Bên bạn nhận có nhu cầu thấp hơn (\`${result.demandDiff.toFixed(1)}\`), sẽ khó trade lại hơn.`);
    } else {
      analysisLines.push(`• **Độ hot (Demand):** ⚖️ Nhu cầu hai bên tương đương nhau (\`~${result.get.avgDemand.toFixed(1)}\`).`);
    }

    const droppingGet = result.get.details.filter((d) => (d.item.trend || '').toLowerCase().includes('dropping'));
    const risingGet = result.get.details.filter((d) => (d.item.trend || '').toLowerCase().includes('rising'));
    const overpricedGet = result.get.details.filter((d) => (d.item.trend || '').toLowerCase().includes('overpriced'));

    if (risingGet.length) {
      analysisLines.push(`• **Xu hướng tích cực:** 📈 Bên nhận có món đang tăng giá (${risingGet.map((d) => d.item.name).join(', ')}).`);
    }
    if (droppingGet.length) {
      analysisLines.push(`• **Cảnh báo rớt giá:** 📉 Bên nhận có món đang tụt giá (${droppingGet.map((d) => d.item.name).join(', ')}).`);
    }
    if (overpricedGet.length) {
      analysisLines.push(`• **Cảnh báo thổi giá:** ⚠️ Bên nhận có món bị định giá quá cao (${overpricedGet.map((d) => d.item.name).join(', ')}).`);
    }

    e.addFields({
      name: '📊 Phân Tích Kèo Trade',
      value: analysisLines.join('\n'),
    });
  } else {
    e.addFields({
      name: '🎮 Hướng Dẫn So Kèo Nhanh',
      value: '• Bấm nút **`➕ Thêm Bạn Đưa`** để thêm món bạn muốn đưa.\n• Bấm nút **`➕ Thêm Bạn Nhận`** để thêm món bạn nhận.\n• Bấm **`✏️ Đổi số lượng`** hoặc **`🗑️ Xóa món`** để điều chỉnh bất kỳ lúc nào!',
    });
  }

  if (result.hasSpecial) {
    e.addFields({
      name: '⚠️ Chú ý về Unit đặc biệt (N/A / Untradable)',
      value: 'Kèo có chứa vật phẩm chưa định giá số cụ thể (N/A) hoặc Untradable. Giá trị thực tế phụ thuộc lớn vào độ hiếm và thoả thuận cá nhân!',
    });
  }

  if (notFound && notFound.length) {
    e.addFields({
      name: '❓ Không tìm thấy trong bảng giá',
      value: `Không nhận diện được: ${notFound.map((s) => `\`${s}\``).join(', ')}`,
    });
  }

  e.setFooter({ text: 'Dựa trên AA Value List • Bấm nút bên dưới để chỉnh sửa hoặc thêm bớt món!' });
  e.setTimestamp();

  return e;
}

export function tradeSpeech(result, lang = 'vi') {
  if (lang === 'vi') {
    let t = `Kèo trade này là ${result.verdictTitle}. `;
    if (result.valDiff > 0) t += `Bạn lời khoảng ${result.valDiff} giá trị. `;
    else if (result.valDiff < 0) t += `Bạn lỗ khoảng ${Math.abs(result.valDiff)} giá trị. `;
    else t += 'Hai bên ngang giá trị. ';
    t += result.advice;
    return t;
  }
  let t = `This trade is a ${result.verdictTitle}. `;
  if (result.valDiff > 0) t += `You gain around ${result.valDiff} value. `;
  else if (result.valDiff < 0) t += `You lose around ${Math.abs(result.valDiff)} value. `;
  t += result.advice;
  return t;
}

/** Autocomplete thông minh hỗ trợ gõ tiếp sau dấu phẩy/cộng, hỗ trợ nhiều món và giữ số lượng */
export function handleTradeAutocomplete(input) {
  if (!input) {
    const topItems = searchValues('', 10);
    return topItems.map((it) => {
      const cat = CATEGORIES[it.category] ?? CATEGORIES.unit;
      const shiny = it.isShiny ? '✨ ' : '';
      const tier = it.tier ? `[${it.tier}] ` : '';
      const valStr = it.value !== 'N/A' && it.value !== 'Untradable' ? `Val: ${it.value}` : it.value;
      return {
        name: `${shiny}${cat.emoji} ${it.name} (${tier}${valStr})`.slice(0, 100),
        value: it.name.slice(0, 100),
      };
    });
  }

  // 1. Dọn dẹp metadata rườm rà tránh comma trong Val: 17,000 làm vỡ câu
  const sanitized = input
    .replace(/\([^)]*Val:[^)]*\)/gi, '')
    .replace(/\([^)]*Tier[^)]*\)/gi, '')
    .replace(/\([^)]*Demand:[^)]*\)/gi, '');

  const parts = sanitized.split(/[,+]/);
  const prefixParts = parts.slice(0, -1).map((s) => cleanItemName(s)).filter(Boolean);
  const rawCurrent = parts[parts.length - 1].trim();

  // 2. Tách số lượng thông minh (hỗ trợ cả '6 aizen' lẫn 'aizen 6' hoặc '6x aizen')
  let qtyPrefix = '';
  let searchQuery = rawCurrent;
  const startMatch = rawCurrent.match(/^(\d+\s*[*xX]?\s*)(.*)$/);
  const endMatch = rawCurrent.match(/^(.*?)\s*[*xX]?\s*(\d+)$/);

  if (startMatch && startMatch[2]) {
    qtyPrefix = startMatch[1].trim() + ' ';
    searchQuery = startMatch[2].trim();
  } else if (endMatch && endMatch[1] && isNaN(endMatch[1])) {
    qtyPrefix = endMatch[2].trim() + ' ';
    searchQuery = endMatch[1].trim();
  }

  // 3. Rút gọn prefix nếu dài để không bao giờ vượt trần 100 ký tự Discord
  let prefix = prefixParts.join(', ');
  if (prefix.length > 45) {
    prefix = prefixParts
      .map((p) => {
        const m = p.match(/^(\d+\s*[*xX]?\s*)(.*)$/);
        const q = m ? m[1] : '';
        const n = m ? m[2] : p;
        return (q + shortenItemName(n)).trim();
      })
      .join(', ');
  }

  const matches = searchValues(searchQuery, 15);
  const seen = new Set();
  const choices = [];

  for (const it of matches) {
    const itemWithQty = (qtyPrefix + it.name).trim();
    let fullVal = prefix ? `${prefix}, ${itemWithQty}` : itemWithQty;

    // Nếu sắp chạm giới hạn 100 ký tự Discord, rút gọn tên item hiện tại
    if (fullVal.length > 95) {
      const shortWithQty = (qtyPrefix + shortenItemName(it.name)).trim();
      fullVal = prefix ? `${prefix}, ${shortWithQty}` : shortWithQty;
    }
    if (fullVal.length > 100) {
      fullVal = fullVal.slice(0, 100);
    }

    if (seen.has(fullVal)) continue;
    seen.add(fullVal);

    const cat = CATEGORIES[it.category] ?? CATEGORIES.unit;
    const shiny = it.isShiny ? '✨ ' : '';
    const tier = it.tier ? `[${it.tier}] ` : '';
    const valStr = it.value !== 'N/A' && it.value !== 'Untradable' ? `Val: ${it.value}` : it.value;
    const displayQty = qtyPrefix ? `${qtyPrefix.trim()} ` : '';

    const label = `${shiny}${cat.emoji} ${displayQty}${it.name} (${tier}${valStr})`.slice(0, 100);

    choices.push({ name: label, value: fullVal });
    if (choices.length >= 10) break;
  }

  return choices;
}

/** Tạo thanh nút bấm tương tác cho kèo trade */
export function tradeActionRow(tid) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`trade_add_give:${tid}`)
      .setLabel('➕ Thêm Bạn Đưa')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`trade_add_get:${tid}`)
      .setLabel('➕ Thêm Bạn Nhận')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`trade_edit_qty:${tid}`)
      .setLabel('✏️ Đổi số lượng')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`trade_remove:${tid}`)
      .setLabel('🗑️ Xóa món')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`trade_flip:${tid}`)
      .setLabel('🔄 Đảo 2 bên')
      .setStyle(ButtonStyle.Secondary),
  );
}

/** Tự động phục hồi session trade nếu bot bị restart */
function recoverSessionFromMessage(message, tid, userId) {
  const embed = message.embeds?.[0];
  if (!embed || !embed.fields || embed.fields.length < 2) return null;

  const giveField = embed.fields[0]?.value || '';
  const getField = embed.fields[1]?.value || '';

  const giveParsed = parseTradeItems(giveField);
  const getParsed = parseTradeItems(getField);

  const session = {
    messageId: message.id,
    channelId: message.channelId,
    guildId: message.guildId,
    userId: userId || 'unknown',
    give: giveParsed.items,
    get: getParsed.items,
    notFound: [],
    lastUpdated: Date.now(),
  };

  tradeSessions.set(tid, session);
  return session;
}

/** Cập nhật tin nhắn gốc sau khi thêm/sửa/xóa món */
async function updateTradeMessage(client, session, tid, result, interaction = null) {
  const embed = tradeEmbed(result, session.notFound);
  const row = tradeActionRow(tid);

  if (interaction && typeof interaction.update === 'function' && interaction.message?.id === session.messageId) {
    return await interaction.update({ embeds: [embed], components: [row] });
  }

  try {
    const channel = client.channels.cache.get(session.channelId) || (await client.channels.fetch(session.channelId));
    if (channel && session.messageId) {
      const msg = await channel.messages.fetch(session.messageId);
      if (msg) {
        await msg.edit({ embeds: [embed], components: [row] });
        if (interaction && !interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '✅ Đã cập nhật kèo trade thành công!', flags: MessageFlags.Ephemeral });
        }
      }
    }
  } catch (e) {
    console.warn('[trade] Lỗi updateTradeMessage:', e.message);
    if (interaction && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
    }
  }
}

/** Xử lý khi bấm nút tương tác trong kèo trade */
export async function handleTradeButton(i) {
  const customId = i.customId;
  if (!customId.startsWith('trade_')) return false;

  const [action, tid] = customId.split(':');
  let session = tradeSessions.get(tid);

  if (!session && i.message?.embeds?.[0]) {
    session = recoverSessionFromMessage(i.message, tid, i.user.id);
  }

  if (!session) {
    await i.reply({
      content: '⚠️ Kèo trade này đã hết phiên tương tác. Hãy dùng lệnh `/wfl` để tạo kèo mới!',
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  // 1. Thêm món bạn đưa
  if (action === 'trade_add_give') {
    const modal = new ModalBuilder()
      .setCustomId(`modal_add_give:${tid}`)
      .setTitle('➕ Thêm món vào BẠN ĐƯA')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('item_name')
            .setLabel('Tên vật phẩm')
            .setPlaceholder('vd: aizen, alucard, summer 1, sss dmg...')
            .setStyle(TextInputStyle.Short)
            .setRequired(true),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('item_qty')
            .setLabel('Số lượng')
            .setValue('1')
            .setPlaceholder('vd: 1, 2, 4, 10...')
            .setStyle(TextInputStyle.Short)
            .setRequired(false),
        ),
      );
    await i.showModal(modal);
    return true;
  }

  // 2. Thêm món bạn nhận
  if (action === 'trade_add_get') {
    const modal = new ModalBuilder()
      .setCustomId(`modal_add_get:${tid}`)
      .setTitle('➕ Thêm món vào BẠN NHẬN')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('item_name')
            .setLabel('Tên vật phẩm')
            .setPlaceholder('vd: dio, dracula, battle pass, sss spa...')
            .setStyle(TextInputStyle.Short)
            .setRequired(true),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('item_qty')
            .setLabel('Số lượng')
            .setValue('1')
            .setPlaceholder('vd: 1, 2, 4, 10...')
            .setStyle(TextInputStyle.Short)
            .setRequired(false),
        ),
      );
    await i.showModal(modal);
    return true;
  }

  // 3. Đổi số lượng
  if (action === 'trade_edit_qty') {
    const allItems = [
      ...session.give.map((e, idx) => ({ ...e, side: 'give', idx })),
      ...session.get.map((e, idx) => ({ ...e, side: 'get', idx })),
    ];

    if (!allItems.length) {
      await i.reply({
        content: '❌ Kèo trade hiện tại chưa có món nào để chỉnh sửa số lượng!',
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    const options = allItems.map(({ item, qty, side, idx }) => {
      const sideLabel = side === 'give' ? '📤 Bạn Đưa' : '📥 Bạn Nhận';
      const unitVal = parseNumber(item.value, 0);
      const totalValStr = unitVal > 0 ? ` • Tổng Val: ${(unitVal * qty).toLocaleString()}` : '';
      return {
        label: `[${sideLabel}] ${qty}x ${shortenItemName(item.name)}`.slice(0, 100),
        description: `Giá gốc: ${item.value}${totalValStr}`.slice(0, 100),
        value: `${side}_${idx}`,
      };
    });

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`select_edit_item:${tid}`)
      .setPlaceholder('Chọn món bạn muốn thay đổi số lượng...')
      .addOptions(options.slice(0, 25));

    await i.reply({
      content: '✏️ **Chọn món bạn muốn chỉnh sửa số lượng:**',
      components: [new ActionRowBuilder().addComponents(menu)],
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  // 4. Xóa món
  if (action === 'trade_remove') {
    const allItems = [
      ...session.give.map((e, idx) => ({ ...e, side: 'give', idx })),
      ...session.get.map((e, idx) => ({ ...e, side: 'get', idx })),
    ];

    if (!allItems.length) {
      await i.reply({
        content: '❌ Kèo trade chưa có món nào để xóa!',
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    const options = allItems.map(({ item, qty, side, idx }) => {
      const sideLabel = side === 'give' ? '📤 Bạn Đưa' : '📥 Bạn Nhận';
      return {
        label: `[${sideLabel}] ${qty}x ${shortenItemName(item.name)}`.slice(0, 100),
        description: `Giá: ${item.value} • Bấm để xóa món này`.slice(0, 100),
        value: `${side}_${idx}`,
      };
    });

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`select_remove_item:${tid}`)
      .setPlaceholder('Chọn món bạn muốn xóa khỏi kèo...')
      .addOptions(options.slice(0, 25));

    await i.reply({
      content: '🗑️ **Chọn món bạn muốn xóa:**',
      components: [new ActionRowBuilder().addComponents(menu)],
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  // 5. Đảo 2 bên
  if (action === 'trade_flip') {
    const tmp = session.give;
    session.give = session.get;
    session.get = tmp;
    session.lastUpdated = Date.now();

    const result = evaluateTrade(session.give, session.get);
    await i.update({
      embeds: [tradeEmbed(result, session.notFound)],
      components: [tradeActionRow(tid)],
    });
    return true;
  }

  return false;
}

/** Xử lý Select Menu chọn món để sửa số lượng hoặc xóa */
export async function handleTradeSelectMenu(i) {
  const customId = i.customId;
  if (!customId.startsWith('select_edit_item:') && !customId.startsWith('select_remove_item:')) {
    return false;
  }

  const [action, tid] = customId.split(':');
  let session = tradeSessions.get(tid);
  if (!session && i.message) {
    session = recoverSessionFromMessage(i.message, tid, i.user.id);
  }
  if (!session) {
    await i.reply({
      content: '⚠️ Hết phiên tương tác, vui lòng dùng lại lệnh `/wfl`!',
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  const selected = i.values[0]; // 'give_0' or 'get_1'
  const [side, idxStr] = selected.split('_');
  const idx = parseInt(idxStr, 10);
  const entry = session[side]?.[idx];

  if (!entry) {
    await i.reply({ content: '❌ Vật phẩm này không còn tồn tại.', flags: MessageFlags.Ephemeral });
    return true;
  }

  if (action === 'select_edit_item') {
    const modal = new ModalBuilder()
      .setCustomId(`modal_set_qty:${tid}:${side}:${idx}`)
      .setTitle(`Đổi SL: ${shortenItemName(entry.item.name)}`.slice(0, 45))
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('new_qty')
            .setLabel(`Số lượng mới (hiện tại: ${entry.qty})`.slice(0, 45))
            .setValue(String(entry.qty))
            .setPlaceholder('Nhập số lượng mới (gõ 0 để xóa)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true),
        ),
      );
    await i.showModal(modal);
    return true;
  }

  if (action === 'select_remove_item') {
    const removed = session[side].splice(idx, 1)[0];
    session.lastUpdated = Date.now();

    const result = evaluateTrade(session.give, session.get);
    await updateTradeMessage(i.client, session, tid, result);

    await i.update({
      content: `✅ Đã xóa món **${removed?.item?.name}** khỏi kèo trade!`,
      components: [],
    });
    return true;
  }

  return false;
}

/** Xử lý khi submit Modal nhập món hoặc đổi số lượng */
export async function handleTradeModalSubmit(i) {
  const customId = i.customId;
  if (
    !customId.startsWith('modal_add_give:') &&
    !customId.startsWith('modal_add_get:') &&
    !customId.startsWith('modal_set_qty:')
  ) {
    return false;
  }

  // 1. Thêm món qua Modal
  if (customId.startsWith('modal_add_give:') || customId.startsWith('modal_add_get:')) {
    const isGive = customId.startsWith('modal_add_give:');
    const side = isGive ? 'give' : 'get';
    const tid = customId.split(':')[1];

    let session = tradeSessions.get(tid);
    if (!session && i.message) {
      session = recoverSessionFromMessage(i.message, tid, i.user.id);
    }
    if (!session) {
      await i.reply({
        content: '⚠️ Hết phiên tương tác, hãy dùng `/wfl` để tạo kèo mới!',
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    const itemName = i.fields.getTextInputValue('item_name').trim();
    const qtyStr = i.fields.getTextInputValue('item_qty').trim();
    let qty = parseInt(qtyStr, 10);
    if (isNaN(qty) || qty < 1) qty = 1;

    const parsed = parseTradeItems(`${qty}x ${itemName}`);
    if (!parsed.items.length) {
      await i.reply({
        content: `❌ Không tìm thấy vật phẩm nào khớp với: \`${itemName}\`!\n💡 *Mẹo: Bạn có thể gõ tên ngắn như "aizen", "dracula", "dio", "summer 1", "sss dmg"...*`,
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    for (const added of parsed.items) {
      const existing = session[side].find((e) => e.item.key === added.item.key);
      if (existing) existing.qty += added.qty;
      else session[side].push(added);
    }
    session.lastUpdated = Date.now();

    const result = evaluateTrade(session.give, session.get);
    await updateTradeMessage(i.client, session, tid, result, i);
    return true;
  }

  // 2. Sửa số lượng qua Modal
  if (customId.startsWith('modal_set_qty:')) {
    const [, tid, side, idxStr] = customId.split(':');
    const idx = parseInt(idxStr, 10);

    let session = tradeSessions.get(tid);
    if (!session && i.message) {
      session = recoverSessionFromMessage(i.message, tid, i.user.id);
    }
    if (!session) {
      await i.reply({
        content: '⚠️ Hết phiên tương tác, hãy dùng `/wfl` để tạo kèo mới!',
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    const newQtyStr = i.fields.getTextInputValue('new_qty').trim();
    const newQty = parseInt(newQtyStr, 10);
    if (isNaN(newQty) || newQty < 0) {
      await i.reply({ content: '❌ Số lượng không hợp lệ!', flags: MessageFlags.Ephemeral });
      return true;
    }

    if (newQty === 0) {
      session[side].splice(idx, 1);
    } else {
      if (session[side][idx]) session[side][idx].qty = newQty;
    }
    session.lastUpdated = Date.now();

    const result = evaluateTrade(session.give, session.get);
    await updateTradeMessage(i.client, session, tid, result);

    await i.update({
      content: `✅ Đã cập nhật số lượng thành công!`,
      components: [],
    });
    return true;
  }

  return false;
}
