import { EmbedBuilder } from 'discord.js';
import { state, save } from './store.js';

export const SHEET_ID = '1KTVAqVw26TkwJF7GGJmKjkVEXCK5itqS1OZAIpqxuJ0';
export const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/htmlview`;

export const TABS = [
  { gid: '588115840', name: 'Gamepasses', category: 'gamepass', tier: null },
  { gid: '1902639631', name: 'S Tier', category: 'unit', tier: 'S Tier' },
  { gid: '883691415', name: 'A Tier', category: 'unit', tier: 'A Tier' },
  { gid: '1594979378', name: 'B Tier', category: 'unit', tier: 'B Tier' },
  { gid: '2118153850', name: 'C Tier', category: 'unit', tier: 'C Tier' },
  { gid: '2007444671', name: 'Skins', category: 'skin', tier: null },
  { gid: '451513775', name: 'Relics', category: 'relic', tier: null },
  { gid: '2009773227', name: 'Stats', category: 'stat', tier: null },
  { gid: '742145845', name: 'Untradable', category: 'unit', tier: 'Untradable' },
];

export const CATEGORIES = {
  all: { label: 'Tất cả', emoji: '📦' },
  gamepass: { label: 'Gamepass & Bundle', emoji: '🎮' },
  unit: { label: 'Unit', emoji: '⚔️' },
  stat: { label: 'Chỉ số Stats', emoji: '📊' },
  skin: { label: 'Skin', emoji: '🎨' },
  relic: { label: 'Relic', emoji: '🔮' },
};

export const TIERS = ['S Tier', 'A Tier', 'B Tier', 'C Tier', 'Untradable'];

const UNOB_REGEX =
  /leaderboard|limited|unobtainable|untradable|less than|christmas|halloween|summer|anniversary|secret unit|code unit|event quest|frieza invasion|april fools|highschool dxd/i;

function norm(s) {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

function clean(s) {
  return (s || '').replace(/^"(.*)"$/, '$1').trim();
}

/** Tải dữ liệu trực tiếp từ các tab của Google Sheet */
export async function fetchValuesFromSheet() {
  const items = [];
  for (const t of TABS) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${t.gid}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) {
        console.warn(`[values] Tab ${t.name} HTTP ${res.status}`);
        continue;
      }
      const text = await res.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

      if (t.name === 'Stats') {
        let currentGroup = 'Stats (SSS)';
        for (const line of lines) {
          const cols = parseCsvLine(line).map(clean);
          const col0 = cols[0];
          if (!col0) continue;
          if (/stats \((.*?)\)/i.test(col0)) {
            const m = col0.match(/stats \((.*?)\)/i);
            currentGroup = m[0];
            continue;
          }
          if (/^(dmg|spa|rng|any)$/i.test(col0)) {
            const gradeMatch = currentGroup.match(/\((.*?)\)/);
            const grade = gradeMatch ? gradeMatch[1] : '';
            let itemName = '';
            let aliases = [];
            if (grade.includes('to') || grade.includes('Under')) {
              itemName = `Stats ${grade}`;
              aliases = [grade.toLowerCase(), `stats ${grade.toLowerCase()}`];
            } else {
              itemName = `${grade} ${col0.toUpperCase()} (Stat)`;
              aliases = [
                `${grade} ${col0}`.toLowerCase(),
                `${col0} ${grade}`.toLowerCase(),
                `stats ${grade} ${col0}`.toLowerCase(),
              ];
            }
            const key = `stat_${norm(grade)}_${norm(col0)}`;
            items.push({
              key,
              name: itemName,
              aliases,
              category: 'stat',
              tier: null,
              value: cols[1] || '0',
              demand: cols[2] || '0',
              trend: cols[3] || 'Stable',
              info: cols[4] || `Stats classified as ${grade}`,
              isShiny: false,
              isUnob: false,
              sourceTab: 'Stats',
              updatedAt: new Date().toISOString(),
            });
          }
        }
        continue;
      }

      for (const line of lines) {
        const cols = parseCsvLine(line).map(clean);
        const name = cols[0];
        if (!name) continue;

        // Bỏ qua dòng tiêu đề / disclaimer / ngăn cách
        if (/disclaimer|note:|these are units|top s tier|normal skins|name|relic/i.test(name)) continue;
        if (name.length > 100) continue;

        let value = cols[1] || 'N/A';
        let demand = cols[2] || 'N/A';
        let trend = cols[3] || 'N/A';
        let info = cols[4] || '';

        if (t.name === 'Untradable') {
          value = cols[1] || 'Untradable';
          demand = cols[3] || 'N/A';
          trend = cols[4] || 'N/A';
          info = cols[5] || cols[4] || '';
        }

        if (!value && !demand && !info) continue;

        const isShiny = /\(shiny\)/i.test(name) || /rainbow/i.test(name);
        const isUnob = UNOB_REGEX.test(info) || UNOB_REGEX.test(name) || t.name === 'Untradable';

        // Tạo key duy nhất: name + category + isShiny
        const key = `${norm(name)}_${t.category}_${isShiny ? 'shiny' : 'normal'}`;

        items.push({
          key,
          name,
          category: t.category,
          tier: t.tier,
          value: value || 'N/A',
          demand: demand || 'N/A',
          trend: trend || 'N/A',
          info,
          isShiny,
          isUnob,
          sourceTab: t.name,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn(`[values] Lỗi tải tab ${t.name}:`, e.message);
    }
  }
  return items;
}

/** Đồng bộ dữ liệu vào store */
export async function syncValues() {
  const items = await fetchValuesFromSheet();
  if (!items.length) {
    throw new Error('Không thể tải dữ liệu từ Google Sheet (có thể bị chặn tạm thời).');
  }
  state.values = {};
  for (const it of items) {
    state.values[it.key] = it;
  }
  state.lastSync = new Date().toISOString();
  save();
  return items.length;
}

/** Tìm kiếm item trong kho */
export function allValues(filter = {}) {
  let list = Object.values(state.values || {});
  if (filter.category && filter.category !== 'all') {
    list = list.filter((i) => i.category === filter.category);
  }
  if (filter.tier) {
    list = list.filter((i) => i.tier === filter.tier);
  }
  if (filter.isShiny !== undefined && filter.isShiny !== null) {
    list = list.filter((i) => i.isShiny === filter.isShiny);
  }
  if (filter.isUnob !== undefined && filter.isUnob !== null) {
    list = list.filter((i) => i.isUnob === filter.isUnob);
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export function searchValues(query, limit = 25) {
  const q = norm(query);
  const list = Object.values(state.values || {});
  if (!q) return list.slice(0, limit);

  return list
    .filter((i) => norm(i.name).includes(q) || norm(i.info).includes(q))
    .sort((a, b) => {
      // Ưu tiên trùng khớp đầu tên
      const aStarts = norm(a.name).startsWith(q);
      const bStarts = norm(b.name).startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}

export function findValue(query) {
  if (!query) return null;
  // 1. Khớp trực tiếp key từ gợi ý Autocomplete
  if (state.values?.[query]) return state.values[query];

  const list = Object.values(state.values || {});
  // 2. Khớp key (không phân biệt hoa thường)
  const byKey = list.find((i) => i.key.toLowerCase() === query.toLowerCase());
  if (byKey) return byKey;

  const q = norm(query);
  const wantsShiny = /shiny|rainbow/i.test(query);

  // 3. Khớp qua alias (đặc biệt là các chỉ số Stat như sss dmg, ss spa...)
  const byAlias = list.find((i) => (i.aliases || []).some((a) => norm(a) === q));
  if (byAlias) return byAlias;

  // 4. Khớp theo tên chuẩn hoá (ưu tiên khớp chính xác hoặc bắt đầu bằng)
  let exact = list.find((i) => norm(i.name) === q);
  if (exact) return exact;

  // Nếu người dùng không ghi "shiny", ưu tiên lấy bản Thường (Normal)
  let candidates = list.filter((i) => norm(i.name).startsWith(q) || norm(i.name).includes(q));
  if (!candidates.length) {
    candidates = list.filter((i) => (i.aliases || []).some((a) => norm(a).includes(q)));
  }

  if (candidates.length) {
    candidates.sort((a, b) => {
      // Ưu tiên trùng khớp đầu tên
      const aStarts = norm(a.name).startsWith(q);
      const bStarts = norm(b.name).startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      // Ưu tiên bản thường nếu người dùng không gõ "shiny"
      if (!wantsShiny) {
        if (!a.isShiny && b.isShiny) return -1;
        if (a.isShiny && !b.isShiny) return 1;
      } else {
        if (a.isShiny && !b.isShiny) return -1;
        if (!a.isShiny && b.isShiny) return 1;
      }

      return a.name.length - b.name.length;
    });
    return candidates[0];
  }

  return null;
}

export function valueEmbed(item) {
  let color = 0x5865f2;
  if (item.tier === 'S Tier') color = 0xffd700; // Vàng
  else if (item.tier === 'A Tier') color = 0xff4500; // Đỏ cam
  else if (item.tier === 'B Tier') color = 0x9b59b6; // Tím
  else if (item.tier === 'C Tier') color = 0x3498db; // Xanh dương
  else if (item.category === 'gamepass') color = 0x2ecc71; // Xanh lá

  const cat = CATEGORIES[item.category] ?? CATEGORIES.unit;
  const badges = [];
  if (item.tier) badges.push(`🏆 **${item.tier}**`);
  if (item.isShiny) badges.push('✨ **Shiny / Rainbow**');
  if (item.isUnob) badges.push('🔒 **Unobtainable (Unob)**');

  const e = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${cat.emoji} ${item.name}`)
    .setURL(SHEET_URL)
    .setAuthor({ name: `AA Value List • ${cat.label}` });

  if (badges.length) {
    e.setDescription(badges.join(' • '));
  }

  e.addFields(
    { name: '💎 Value', value: `\`${item.value}\``, inline: true },
    { name: '🔥 Demand', value: `\`${item.demand}\``, inline: true },
    { name: '📈 Trend', value: `\`${item.trend}\``, inline: true },
  );

  if (item.info) {
    e.addFields({ name: 'ℹ️ Thông tin / Nguồn gốc', value: item.info.slice(0, 1024) });
  }

  const footerText = `Nguồn: Google Sheets (Tab ${item.sourceTab}) • Cập nhật tự động`;
  e.setFooter({ text: footerText });
  if (item.updatedAt) e.setTimestamp(new Date(item.updatedAt));

  return e;
}

export function valueSpeech(item, lang = 'vi') {
  if (lang === 'vi') {
    let text = `${item.name}. `;
    if (item.tier) text += `Xếp hạng ${item.tier}. `;
    text += `Giá trị là ${item.value}, nhu cầu ${item.demand}, xu hướng ${item.trend}. `;
    if (item.isShiny) text += 'Đây là bản Shiny. ';
    if (item.isUnob) text += 'Vật phẩm này hiện không còn cày được. ';
    return text;
  }
  let text = `${item.name}. `;
  if (item.tier) text += `${item.tier}. `;
  text += `Value is ${item.value}, demand ${item.demand}, trend ${item.trend}. `;
  if (item.isShiny) text += 'This is a Shiny unit. ';
  if (item.isUnob) text += 'This item is unobtainable. ';
  return text;
}

