import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_FILE = process.env.DATA_FILE || path.resolve('data/state.json');
const SEED_FILE = path.resolve('data/values.seed.json');

const defaultState = () => ({ guilds: {}, users: {}, values: {}, lastSync: null });

export let state = defaultState();
let mongoCol = null;
let saveTimer = null;

export async function initStore() {
  let localState = defaultState();
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    localState = { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    localState = defaultState();
  }

  if (process.env.MONGODB_URI) {
    try {
      const { MongoClient } = await import('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
      });
      await client.connect();
      mongoCol = client.db(process.env.MONGODB_DB || 'gpo_tts_bot').collection('state');
      const doc = await mongoCol.findOne({ _id: 'state' });
      const remoteData = doc?.data ?? {};

      // Hợp nhất dữ liệu: ưu tiên MongoDB, nhưng không làm mất server đã lưu ở local
      state = {
        ...defaultState(),
        ...localState,
        ...remoteData,
        guilds: {
          ...(localState.guilds || {}),
          ...(remoteData.guilds || {}),
        },
        users: {
          ...(localState.users || {}),
          ...(remoteData.users || {}),
        },
      };
      console.log(`[store] Đã kết nối MongoDB thành công (${Object.keys(state.guilds).length} servers)`);
    } catch (err) {
      console.warn('[store] Không thể kết nối MongoDB, dùng file dự phòng cục bộ:', err.message);
      state = localState;
    }
  } else {
    state = localState;
    console.log(`[store] Dùng file cục bộ ${DATA_FILE} (${Object.keys(state.guilds).length} servers)`);
  }

  // Nạp seed data nếu kho values chưa có gì
  if (!state.values || Object.keys(state.values).length === 0) {
    try {
      const seed = JSON.parse(await fs.readFile(SEED_FILE, 'utf8'));
      state.values = {};
      for (const item of seed) {
        state.values[item.key] = item;
      }
      state.lastSync = new Date().toISOString();
      console.log(`[store] Đã nạp ${seed.length} items từ values.seed.json`);
    } catch (e) {
      console.warn('[store] Không đọc được values.seed.json:', e.message);
    }
  }

  // Ghi đồng bộ ngay cả MongoDB và file backup cục bộ
  await flush();
}

export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => flush().catch((e) => console.error('[store] Lỗi lưu:', e)), 300);
}

/** Ghi ngay lập tức không cần chờ debounce, dùng khi tắt bot hoặc cập nhật quan trọng */
export async function flushNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  return await flush();
}

async function flush() {
  // 1. Luôn ghi ra file backup cục bộ
  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    console.error('[store] Lỗi ghi file local backup:', e.message);
  }

  // 2. Ghi lên MongoDB Atlas (đám mây vĩnh viễn, không mất khi restart/deploy)
  if (mongoCol) {
    try {
      await mongoCol.updateOne({ _id: 'state' }, { $set: { data: state, updatedAt: new Date() } }, { upsert: true });
    } catch (e) {
      console.error('[store] Lỗi ghi MongoDB:', e.message);
    }
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
  g.voiceId ??= null; // ID giọng đọc riêng của server
  g.dict ??= {}; // từ điển phát âm riêng: { word: { say, lang } }
  return g;
}

export function getUser(id) {
  state.users[id] ??= { lang: null, voiceId: null };
  return state.users[id];
}
