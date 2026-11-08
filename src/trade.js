import { EmbedBuilder } from 'discord.js';
import { findValue, searchValues, CATEGORIES } from './values.js';

function parseNumber(str, def = 0) {
  if (!str || str === 'N/A' || str === 'Untradable') return def;
  const n = parseFloat(String(str).replace(/,/g, ''));
  return isNaN(n) ? def : n;
}

function cleanItemName(raw) {
  return raw
    .replace(/\s*\([^)]*Val:[^)]*\)/gi, '')
    .replace(/\s*\([^)]*Tier[^)]*\)/gi, '')
    .replace(/\s*\([^)]*Demand:[^)]*\)/gi, '')
    .replace(/^[\s*xX•\-_:;,~`|⚔🎮🎨🔮✨📊]+/g, '')
    .replace(/[\s*xX•\-_:;,~`|⚔🎮🎨🔮✨📊]+$/g, '')
    .trim();
}

/** Tách chuỗi danh sách item, hỗ trợ số lượng (vd: "2 darkmage", "2x Grand Return Bundle", "Battle Pass, VIP") */
export function parseTradeItems(text) {
  if (!text) return { items: [], notFound: [] };
  const parts = text
    .split(/[,+\n&]|(?:\s+và\s+)|\sand\s/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const items = [];
  const notFound = [];

  for (const part of parts) {
    let qty = 1;
    let cleanName = part;

    // Pattern 1: "2x item" or "2* item"
    const m1 = cleanName.match(/^(\d+)\s*[*xX]\s*(.+)$/);
    if (m1) {
      qty = Math.max(1, parseInt(m1[1], 10));
      cleanName = m1[2];
    } else {
      // Pattern 2: "2 item" (số đứng trước chữ, vd: "2 darkmage" hoặc "2 battle pass")
      const m2 = cleanName.match(/^(\d+)\s+([a-zA-Z\u00C0-\u1EF9].+)$/);
      if (m2) {
        qty = Math.max(1, parseInt(m2[1], 10));
        cleanName = m2[2];
      } else {
        // Pattern 3: "item x2"
        const m3 = cleanName.match(/^(.+?)\s*[*xX]\s*(\d+)$/);
        if (m3) {
          qty = Math.max(1, parseInt(m3[2], 10));
          cleanName = m3[1];
        }
      }
    }

    const stripped = cleanItemName(cleanName);
    const item = findValue(stripped) || findValue(cleanName);
    if (item) {
      // Gộp nếu cùng item
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
  if (!side.details.length) return '_Không có vật phẩm nào_';
  return side.details
    .map(({ item, qty }) => {
      const cat = CATEGORIES[item.category] ?? CATEGORIES.unit;
      const shiny = item.isShiny ? '✨' : '';
      const qtyStr = qty > 1 ? `\`${qty}x\` ` : '';
      const tierStr = item.tier ? `[${item.tier}] ` : '';
      return `${qtyStr}${shiny}${cat.emoji} **${item.name}**\n↳ Giá: \`${item.value}\` • Demand: \`${item.demand}\` • Trend: \`${item.trend}\``;
    })
    .join('\n');
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

  // Phân tích so sánh chi tiết
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

  // Cảnh báo xu hướng
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

  if (result.hasSpecial) {
    e.addFields({
      name: '⚠️ Chú ý về Unit đặc biệt (N/A / Untradable)',
      value: 'Kèo có chứa vật phẩm chưa định giá số cụ thể (N/A) hoặc Untradable. Giá trị thực tế phụ thuộc lớn vào độ hiếm và thoả thuận cá nhân!',
    });
  }

  if (notFound.length) {
    e.addFields({
      name: '❓ Không tìm thấy trong bảng giá',
      value: `Không nhận diện được: ${notFound.map((s) => `\`${s}\``).join(', ')}`,
    });
  }

  e.setFooter({ text: 'Dựa trên AA Value List • Tự động tính toán theo Value, Demand & Trend' });
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

/** Autocomplete thông minh hỗ trợ gõ tiếp sau dấu phẩy/cộng và giữ số lượng (vd: "2 dark mage") */
export function handleTradeAutocomplete(input) {
  const parts = input.split(/[,+]/);
  const prefix = parts.slice(0, -1).map((s) => s.trim()).filter(Boolean).join(', ');
  const rawCurrent = parts[parts.length - 1].trim();

  // Tách số lượng nếu người dùng gõ số trước (vd: "2 dark mage" hoặc "2x dio")
  let qtyPrefix = '';
  let searchQuery = rawCurrent;
  const qMatch = rawCurrent.match(/^(\d+\s*[*xX]?\s*)(.*)$/);
  if (qMatch && qMatch[2]) {
    qtyPrefix = qMatch[1].trim() + ' ';
    searchQuery = qMatch[2].trim();
  }

  const matches = searchValues(searchQuery, 10);
  return matches.map((it) => {
    const itemWithQty = `${qtyPrefix}${it.name}`;
    const fullValue = prefix ? `${prefix}, ${itemWithQty}` : itemWithQty;
    const cat = CATEGORIES[it.category] ?? CATEGORIES.unit;
    const shiny = it.isShiny ? '✨' : '';
    const tier = it.tier ? `[${it.tier}] ` : '';
    return {
      name: `${fullValue} (${shiny}${cat.emoji} ${tier}Val: ${it.value})`.slice(0, 100),
      value: fullValue.slice(0, 100),
    };
  });
}

