import { EmbedBuilder } from 'discord.js';
import { state, save } from './store.js';

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

export const CATEGORIES = {
  fruit: { label: 'Trái ác quỷ', emoji: '🍎' },
  style: { label: 'Fighting Style', emoji: '👊' },
  weapon: { label: 'Vũ khí', emoji: '⚔️' },
  other: { label: 'Khác', emoji: '📦' },
};
export const categoryChoices = Object.entries(CATEGORIES).map(([value, c]) => ({ name: c.label, value }));
const cat = (f) => CATEGORIES[f.category] ?? CATEGORIES.other;

export function allFruits(category) {
  return Object.values(state.fruits)
    .filter((f) => !category || f.category === category)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function findFruit(query) {
  if (!query) return null;
  const q = norm(query);
  if (state.fruits[q]) return state.fruits[q];
  const list = allFruits();
  return (
    list.find((f) => norm(f.name) === q || (f.aliases ?? []).some((a) => norm(a) === q)) ??
    list.find((f) => norm(f.name).startsWith(q) || (f.aliases ?? []).some((a) => norm(a).startsWith(q))) ??
    list.find((f) => norm(f.name).includes(q)) ??
    null
  );
}

export function searchFruits(query, limit = 25) {
  const q = norm(query ?? '');
  return allFruits()
    .filter((f) => !q || norm(f.name).includes(q) || (f.aliases ?? []).some((a) => norm(a).includes(q)))
    .slice(0, limit);
}

export function createFruit(name, category = 'fruit') {
  name = name.trim();
  // Trái ác quỷ: key = từ đầu ("Mera Mera no Mi" -> mera); loại khác: key = cả tên ("Iron Fist" -> ironfist)
  const key = (category === 'fruit' ? norm(name.split(' ')[0]) : norm(name)) || norm(name);
  if (state.fruits[key]) return state.fruits[key];
  state.fruits[key] = { key, category, name, aliases: [key], caps: {}, notes: '', sources: [] };
  save();
  return state.fruits[key];
}

/**
 * Đọc văn bản dạng danh sách (copy từ Discord/Docs), ví dụ:
 *   Iron Fist
 *   • R = 391
 *   ◦ Z = 541
 *   ◦ Recommend Stat = 720 STR + 300 FS
 * Trả về [{ name, caps: {R:'391', Z:'541'}, notes: 'Recommend Stat: ...' }]
 */
export function parseImport(text) {
  const items = [];
  let cur = null;
  for (let line of text.split(/\r?\n/)) {
    line = line.replace(/^[\s•◦○o*\-–>·]+(?=\S)/, '').replace(/\*\*/g, '').trim();
    if (!line) continue;
    const kv = line.match(/^([^=:]{1,40}?)\s*[=:]\s*(.+)$/);
    if (kv && cur) {
      const [, k, v] = kv;
      if (/recommend|khuyên|build/i.test(k)) cur.notes = `${k.trim()}: ${v.trim()}`;
      else cur.caps[normMove(k)] = v.trim();
      continue;
    }
    if (kv && !cur) continue; // dòng chỉ số nhưng chưa có tên -> bỏ qua
    cur = { name: line.replace(/[:：]$/, ''), caps: {}, notes: '' };
    items.push(cur);
  }
  return items.filter((i) => Object.keys(i.caps).length || i.notes);
}

export function applyImport(items, category, { by, source }) {
  const result = [];
  for (const it of items) {
    const f = findExact(it.name) ?? createFruit(it.name, category);
    for (const [m, v] of Object.entries(it.caps)) f.caps[m] = v;
    if (it.notes) f.notes = it.notes;
    if (source && !f.sources.includes(source)) f.sources.push(source);
    f.updatedBy = by;
    f.updatedAt = new Date().toISOString();
    result.push({ fruit: f, count: Object.keys(it.caps).length });
  }
  save();
  return result;
}

function findExact(name) {
  const q = norm(name);
  return allFruits().find((f) => f.key === q || norm(f.name) === q || (f.aliases ?? []).some((a) => norm(a) === q)) ?? null;
}

/** Chuẩn hoá tên chiêu: z/x/c/v/b/f/t/y/m1/passive... viết hoa cho đẹp */
export function normMove(move) {
  const m = move.trim();
  return m.length <= 3 ? m.toUpperCase() : m.charAt(0).toUpperCase() + m.slice(1);
}

export function setCap(fruit, move, value, { by, source } = {}) {
  fruit.caps[normMove(move)] = String(value).trim();
  if (source && !fruit.sources.includes(source)) fruit.sources.push(source);
  fruit.updatedBy = by ?? fruit.updatedBy;
  fruit.updatedAt = new Date().toISOString();
  save();
}

export function removeCap(fruit, move) {
  const k = normMove(move);
  if (!(k in fruit.caps)) return false;
  delete fruit.caps[k];
  fruit.updatedAt = new Date().toISOString();
  save();
  return true;
}

const MOVE_ORDER = ['M1', 'Z', 'X', 'C', 'V', 'B', 'E', 'R', 'T', 'Y', 'F', 'G', 'H'];
function sortedCaps(fruit) {
  return Object.entries(fruit.caps).sort(([a], [b]) => {
    const ia = MOVE_ORDER.indexOf(a), ib = MOVE_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
  });
}

export function fruitEmbed(fruit) {
  const caps = sortedCaps(fruit);
  const e = new EmbedBuilder()
    .setColor(0xff7a00)
    .setTitle(`${cat(fruit).emoji} ${fruit.name}`)
    .setAuthor({ name: cat(fruit).label })
    .setDescription(
      caps.length
        ? caps.map(([m, v]) => `**${m}**: \`${v}\``).join('\n')
        : '_Chưa có dữ liệu stat cap. Dùng `/fruit submit` để đóng góp hoặc `/fruit wiki` để tra Wiki._',
    );
  if (fruit.notes) e.addFields({ name: 'Ghi chú', value: fruit.notes.slice(0, 1024) });
  if (fruit.sources?.length) e.addFields({ name: 'Nguồn', value: fruit.sources.slice(-5).join('\n').slice(0, 1024) });
  if (fruit.updatedAt) e.setFooter({ text: `Cập nhật bởi ${fruit.updatedBy ?? '?'}` }).setTimestamp(new Date(fruit.updatedAt));
  return e;
}

export function fruitSpeech(fruit, lang) {
  const caps = sortedCaps(fruit);
  if (lang === 'vi') {
    if (!caps.length) return `${fruit.name} hiện chưa có dữ liệu stat cap.`;
    return `Stat cap của ${fruit.name}. ` + caps.map(([m, v]) => `Chiêu ${m}: ${v}.`).join(' ');
  }
  if (!caps.length) return `${fruit.name} has no stat cap data yet.`;
  return `Stat caps for ${fruit.name}. ` + caps.map(([m, v]) => `${m} move: ${v}.`).join(' ');
}

// ---- Đóng góp từ người dùng ----
export function addSubmission({ fruitKey, move, value, source, userId, userTag, guildId }) {
  const sub = {
    id: state.nextSubmissionId++,
    fruitKey,
    move: normMove(move),
    value: String(value).trim(),
    source: source || null,
    userId,
    userTag,
    guildId,
    createdAt: new Date().toISOString(),
  };
  state.submissions.push(sub);
  save();
  return sub;
}

export function getSubmission(id) {
  return state.submissions.find((s) => s.id === id) ?? null;
}

export function removeSubmission(id) {
  const i = state.submissions.findIndex((s) => s.id === id);
  if (i === -1) return null;
  const [s] = state.submissions.splice(i, 1);
  save();
  return s;
}

