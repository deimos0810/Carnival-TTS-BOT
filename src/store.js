import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Lưu trữ đơn giản: toàn bộ state là 1 object.
 * - Có MONGODB_URI  -> lưu vào MongoDB (bền vững, khuyên dùng trên Render).
 * - Không có        -> lưu file data/state.json (Render free sẽ MẤT file khi restart/deploy).
 */
const DATA_FILE = process.env.DATA_FILE || path.resolve('data/state.json');
const SEED_DIR = path.resolve('data');

const defaultState = () => ({ guilds: {}, users: {}, fruits: {}, submissions: [], nextSubmissionId: 1 });

export let state = defaultState();
let mongoCol = null;
let saveTimer = null;

export async function initStore() {
  if (process.env.MONGODB_URI) {
    const { MongoClient } = await import('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    mongoCol = client.db(process.env.MONGODB_DB || 'gpo_tts_bot').collection('state');
    const doc = await mongoCol.findOne({ _id: 'state' });
    state = { ...defaultState(), ...(doc?.data ?? {}) };
    console.log('[store] Dùng MongoDB');
  } else {
    try {
      state = { ...defaultState(), ...JSON.parse(await fs.readFile(DATA_FILE, 'utf8')) };
    } catch {
      state = defaultState();
    }
    console.log(`[store] Dùng file ${DATA_FILE} (không bền vững trên Render free!)`);
  }

  // Nạp dữ liệu mặc định từ data/*.seed.json:
  // - Mục chưa có -> thêm mới.
  // - Mục đã có -> chỉ bổ sung chiêu/ghi chú còn thiếu (KHÔNG ghi đè dữ liệu đã sửa trên Discord).
  const SOURCE = 'Seed data (repo)';
  for (const file of (await fs.readdir(SEED_DIR)).filter((f) => f.endsWith('.seed.json'))) {
    try {
      const seed = JSON.parse(await fs.readFile(path.join(SEED_DIR, file), 'utf8'));
      for (const f of seed) {
        const cur = state.fruits[f.key];
        if (!cur) {
          state.fruits[f.key] = { category: 'fruit', caps: {}, notes: '', sources: f.caps ? [SOURCE] : [], ...f };
          continue;
        }
        cur.category ??= f.category ?? 'fruit';
        for (const [m, v] of Object.entries(f.caps ?? {})) if (!(m in cur.caps)) cur.caps[m] = v;
        if (!cur.notes && f.notes) cur.notes = f.notes;
      }
    } catch (e) {
      console.warn(`[store] Không đọc được ${file}:`, e.message);
    }
  }
  for (const f of Object.values(state.fruits)) f.category ??= 'fruit';
  await flush();
}

export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => flush().catch((e) => console.error('[store] Lỗi lưu:', e)), 500);
}

async function flush() {
  if (mongoCol) {
    await mongoCol.updateOne({ _id: 'state' }, { $set: { data: state } }, { upsert: true });
  } else {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(state, null, 2));
  }
}

export function getGuild(id) {
  state.guilds[id] ??= {};
  const g = state.guilds[id];
  g.enabled ??= true;
  g.roleIds ??= [];
  g.channelIds ??= [];
  g.defaultLang ??= 'auto';
  g.sayName ??= false;
  g.autoJoin ??= true;
  g.ignorePrefix ??= '//';
  g.maxLength ??= 300;
  g.reviewChannelId ??= null;
  g.editorRoleIds ??= [];
  return g;
}

export function getUser(id) {
  state.users[id] ??= { lang: null };
  return state.users[id];
}

