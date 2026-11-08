import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_FILE = process.env.DATA_FILE || path.resolve('data/state.json');
const SEED_FILE = path.resolve('data/values.seed.json');

const defaultState = () => ({ guilds: {}, users: {}, values: {}, lastSync: null });

export let state = defaultState();
let mongoCol = null;
let saveTimer = null;

export async function initStore() {
  if (process.env.MONGODB_URI) {
    const { MongoClient } = await import('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    mongoCol = client.db(process.env.MONGODB_DB || 'carnival_bot').collection('state');
    const doc = await mongoCol.findOne({ _id: 'state' });
    state = { ...defaultState(), ...(doc?.data ?? {}) };
    console.log('[store] Dùng MongoDB');
  } else {
    try {
      state = { ...defaultState(), ...JSON.parse(await fs.readFile(DATA_FILE, 'utf8')) };
    } catch {
      state = defaultState();
    }
    console.log(`[store] Dùng file ${DATA_FILE}`);
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
  return g;
}

export function getUser(id) {
  state.users[id] ??= { lang: null };
  return state.users[id];
}
