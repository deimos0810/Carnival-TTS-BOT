import googleTTS from 'google-tts-api';

export const LANGS = {
  en: 'English',
  vi: 'Tiếng Việt',
};

const VI_CHARS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

/**
 * Tự đoán ngôn ngữ chính của câu:
 *  - có dấu tiếng Việt => vi
 *  - không dấu nhưng có teencode Việt (ko, dc, mn...) hoặc phần lớn là âm tiết Việt => vi
 *  - còn lại => en
 */
export function detectLang(text) {
  if (VI_CHARS.test(text)) return 'vi';
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  if (!words.length) return 'en';
  let vi = 0;
  for (const raw of words) {
    const w = collapse(raw);
    if (BUILTIN_DICT[w] || BUILTIN_DICT[raw]) continue; // từ đã có cách đọc cố định -> không tính
    if (VI_SLANG_STRONG.has(w) || VI_SLANG_STRONG.has(raw)) return 'vi';
    if (!EN_COMMON.has(raw) && !EN_WORDS.has(raw) && isVietSyllable(raw)) vi++;
  }
  return words.length >= 2 && vi / words.length >= 0.6 ? 'vi' : 'en';
}

/** Rút gọn ký tự lặp: "khummm" -> "khum", "okiii" -> "oki" */
const collapse = (w) => w.replace(/(.)\1+/g, '$1');
/** Tiếng cười: kkk, hahaha, hihihi, hjhjhj, hehehe... */
const LAUGH = /^(?:k{3,}|(?:h[aeij]){3,}h?)$/i;

// ======================================================================
//  TỪ ĐIỂN PHÁT ÂM
// ======================================================================

/**
 * Từ luôn được đọc theo cách chỉ định (mọi chế độ).
 * say  = cách đọc, lang = giọng dùng để đọc.
 * Admin có thể thêm/ghi đè bằng `/tts word add`.
 */
export const BUILTIN_DICT = {
  // --- Theo yêu cầu ---
  ye: { say: 'de', lang: 'vi' },
  yeah: { say: 'yeah', lang: 'en' },
  ok: { say: 'okay', lang: 'en' },
  oke: { say: 'okay', lang: 'en' },
  oki: { say: 'ô kê', lang: 'vi' },
  okela: { say: 'ô kê la', lang: 'vi' },
  okelah: { say: 'ô kê la', lang: 'vi' },

  // --- Game ---
  gg: { say: 'good game', lang: 'en' },
  ggwp: { say: 'good game well played', lang: 'en' },
  wp: { say: 'well played', lang: 'en' },
  ez: { say: 'easy', lang: 'en' },
  afk: { say: 'A F K', lang: 'en' },
  brb: { say: 'be right back', lang: 'en' },
  wfl: { say: 'win fair lose', lang: 'en' },
  npc: { say: 'N P C', lang: 'en' },
  op: { say: 'O P', lang: 'en' },
  noob: { say: 'noob', lang: 'en' },
  gl: { say: 'good luck', lang: 'en' },
  hf: { say: 'have fun', lang: 'en' },

  // --- Slang tiếng Anh (TikTok / Internet) ---
  btw: { say: 'by the way', lang: 'en' },
  idk: { say: "I don't know", lang: 'en' },
  idc: { say: "I don't care", lang: 'en' },
  lol: { say: 'lol', lang: 'en' },
  lmao: { say: 'L M A O', lang: 'en' },
  lmfao: { say: 'L M F A O', lang: 'en' },
  rofl: { say: 'rolling on the floor laughing', lang: 'en' },
  omg: { say: 'oh my god', lang: 'en' },
  omfg: { say: 'oh my god', lang: 'en' },
  wtf: { say: 'what the f', lang: 'en' },
  wth: { say: 'what the hell', lang: 'en' },
  tf: { say: 'the f', lang: 'en' },
  fr: { say: 'for real', lang: 'en' },
  frfr: { say: 'for real for real', lang: 'en' },
  ngl: { say: 'not gonna lie', lang: 'en' },
  tbh: { say: 'to be honest', lang: 'en' },
  imo: { say: 'in my opinion', lang: 'en' },
  imho: { say: 'in my humble opinion', lang: 'en' },
  smh: { say: 'shaking my head', lang: 'en' },
  irl: { say: 'in real life', lang: 'en' },
  np: { say: 'no problem', lang: 'en' },
  nvm: { say: 'never mind', lang: 'en' },
  ikr: { say: 'I know right', lang: 'en' },
  ily: { say: 'I love you', lang: 'en' },
  ilysm: { say: 'I love you so much', lang: 'en' },
  bff: { say: 'best friend forever', lang: 'en' },
  bf: { say: 'boyfriend', lang: 'en' },
  gf: { say: 'girlfriend', lang: 'en' },
  rip: { say: 'R I P', lang: 'en' },
  pov: { say: 'P O V', lang: 'en' },
  fyp: { say: 'for you page', lang: 'en' },
  xd: { say: 'X D', lang: 'en' },
  goat: { say: 'goat', lang: 'en' },
  sus: { say: 'sus', lang: 'en' },
  bruh: { say: 'bruh', lang: 'en' },
  bro: { say: 'bro', lang: 'en' },
  sis: { say: 'sis', lang: 'en' },
  cap: { say: 'cap', lang: 'en' },
  nocap: { say: 'no cap', lang: 'en' },
  gn: { say: 'good night', lang: 'en' },
  gm: { say: 'good morning', lang: 'en' },
  hbd: { say: 'happy birthday', lang: 'en' },
  slay: { say: 'slay', lang: 'en' },
  rizz: { say: 'rizz', lang: 'en' },
  delulu: { say: 'delulu', lang: 'en' },
  gyat: { say: 'gyat', lang: 'en' },
  skibidi: { say: 'skibidi', lang: 'en' },
  sigma: { say: 'sigma', lang: 'en' },
  mewing: { say: 'mewing', lang: 'en' },
  aura: { say: 'aura', lang: 'en' },
  cringe: { say: 'cringe', lang: 'en' },
  vibe: { say: 'vibe', lang: 'en' },
  chill: { say: 'chill', lang: 'en' },
  flex: { say: 'flex', lang: 'en' },
  crush: { say: 'crush', lang: 'en' },
  simp: { say: 'simp', lang: 'en' },
  toxic: { say: 'toxic', lang: 'en' },
  drama: { say: 'drama', lang: 'en' },
  trend: { say: 'trend', lang: 'en' },
  idol: { say: 'idol', lang: 'en' },
  fan: { say: 'fan', lang: 'en' },
  pls: { say: 'please', lang: 'en' },
  plz: { say: 'please', lang: 'en' },
  pliz: { say: 'please', lang: 'en' },
  thx: { say: 'thanks', lang: 'en' },
  tks: { say: 'thanks', lang: 'en' },
  thks: { say: 'thanks', lang: 'en' },
  ty: { say: 'thank you', lang: 'en' },
  tysm: { say: 'thank you so much', lang: 'en' },
  sr: { say: 'sorry', lang: 'en' },
  sry: { say: 'sorry', lang: 'en' },
  ib: { say: 'inbox', lang: 'en' },
  rep: { say: 'rep', lang: 'en' },
  cmt: { say: 'comment', lang: 'en' },
  fb: { say: 'facebook', lang: 'en' },
  ig: { say: 'instagram', lang: 'en' },
  yt: { say: 'youtube', lang: 'en' },
  tiktok: { say: 'tiktok', lang: 'en' },
  fl: { say: 'follow', lang: 'en' },
  acc: { say: 'account', lang: 'en' },
  ad: { say: 'admin', lang: 'en' },

  // --- Cười / cảm thán ---
  kk: { say: 'ha ha', lang: 'vi' },
  kkk: { say: 'ha ha ha', lang: 'vi' },
  haha: { say: 'ha ha', lang: 'vi' },
  hahaha: { say: 'ha ha ha', lang: 'vi' },
  hihi: { say: 'hi hi', lang: 'vi' },
  hehe: { say: 'hê hê', lang: 'vi' },
  huhu: { say: 'hu hu', lang: 'vi' },
  hjhj: { say: 'hi hi', lang: 'vi' },
  mlem: { say: 'mờ lem', lang: 'vi' },
  uk: { say: 'ừ', lang: 'vi' },
  uh: { say: 'ừ', lang: 'vi' },
  um: { say: 'ừm', lang: 'vi' },
  uhm: { say: 'ừm', lang: 'vi' },
  oce: { say: 'ô kê', lang: 'vi' },
  xl: { say: 'xin lỗi', lang: 'vi' },
};

/**
 * Teencode / slang GenZ tiếng Việt — chỉ áp dụng khi câu đang là tiếng Việt
 * (ví dụ trong câu tiếng Anh "r" vẫn đọc là "R").
 */
const VI_SLANG = {
  // phủ định
  k: 'không', ko: 'không', kh: 'không', khg: 'không', kg: 'không', khum: 'không', hok: 'không',
  hong: 'không', hông: 'không', hem: 'không', hk: 'không', khong: 'không',
  kb: 'không biết', kbt: 'không biết', kp: 'không phải', kcj: 'không có gì',
  // được / gì / vậy
  dc: 'được', đc: 'được', dk: 'được', đk: 'được', duoc: 'được',
  j: 'gì', z: 'vậy', v: 'vậy', dzay: 'vậy', zay: 'vậy', zậy: 'vậy', dzị: 'vậy', zị: 'vậy',
  lmj: 'làm gì', lsao: 'làm sao', ntn: 'như thế nào',
  // đại từ / người
  mn: 'mọi người', mng: 'mọi người', ae: 'anh em', mik: 'mình', mk: 'mình', mh: 'mình',
  e: 'em', a: 'anh', m: 'mày', t: 'tao', thg: 'thằng', th: 'thằng', cno: 'chúng nó', bno: 'bọn nó', tno: 'tụi nó',
  ny: 'người yêu', nyc: 'người yêu cũ', ck: 'chồng', vk: 'vợ', bme: 'bố mẹ',
  ng: 'người', nguoi: 'người', bn: 'bạn',
  // trạng từ / nối
  vs: 'với', r: 'rồi', rùi: 'rồi', rầu: 'rồi', cx: 'cũng', cg: 'cũng', nx: 'nữa',
  nma: 'nhưng mà', nhma: 'nhưng mà', trc: 'trước', ms: 'mới', lm: 'làm',
  bh: 'bây giờ', bjo: 'bây giờ', h: 'giờ', hnay: 'hôm nay', hqua: 'hôm qua', hum: 'hôm',
  thui: 'thôi', thùi: 'thôi', đag: 'đang', dag: 'đang', ik: 'đi', ak: 'à', ah: 'à',
  pk: 'phải không', pải: 'phải', fải: 'phải', tr: 'trời', trùi: 'trời', chời: 'trời', oi: 'ơi',
  dau: 'đâu',
  // động từ
  bt: 'biết', bik: 'biết', ns: 'nói', nt: 'nhắn tin', tn: 'tin nhắn', tl: 'trả lời',
  thik: 'thích', thic: 'thích', iu: 'yêu', yeu: 'yêu', hc: 'học',
  // khác
  nc: 'nước', đt: 'điện thoại', hs: 'học sinh', sv: 'sinh viên', gv: 'giáo viên',
  kq: 'kết quả', vd: 'ví dụ', ib: 'inbox',
  // cảm thán & từ bậy GenZ (dự án vui)
  vl: 'vãi lồn', vcl: 'vãi cả lồn', vkl: 'vãi cả lồn', vcc: 'vãi cả cặc', vch: 'vãi chưởng',
  vc: 'vãi cứt', vđ: 'vãi đái', vđl: 'vãi đái lồn',
  đm: 'địt mẹ', dm: 'địt mẹ', đmm: 'địt mẹ mày', dmm: 'địt mẹ mày',
  đcm: 'địt con mẹ', dcm: 'địt con mẹ', đcmn: 'địt con mẹ nó', dcmn: 'địt con mẹ nó',
  đkm: 'địt con mẹ', dkm: 'địt con mẹ', đuma: 'đụ má', duma: 'đụ má',
  cl: 'cái lồn', clgt: 'cái lồn gì thế', cclgt: 'cái con lồn gì thế',
  ml: 'mặt lồn', sml: 'sấp mặt lồn', cc: 'con cặc',
  đb: 'đầu buồi', db: 'đầu buồi', tđn: 'thế đéo nào', tdn: 'thế đéo nào',
  cmm: 'con mẹ mày', cmn: 'con mẹ nó', cmnr: 'con mẹ nó rồi', cmnl: 'con mẹ nó luôn',
  chằm: 'trầm', kẻm: 'cảm', chớt: 'chết',
};

/** Từ điển phiên âm tiếng Anh theo ngữ điệu Việt hài hước, giúp đọc một giọng mượt mà, không bị đổi tông giật cục */
export const EN_PHONETIC_VI = {
  // Game & Trade
  trade: 'trây',
  trading: 'trây đing',
  unit: 'du nịt',
  units: 'du nịt',
  item: 'ai tầm',
  items: 'ai tầm',
  win: 'win',
  fair: 'phe',
  loss: 'lốt',
  lose: 'lút',
  wfl: 'win phe lốt',
  stat: 'sờ tát',
  stats: 'sờ tát',
  tier: 'tia',
  shiny: 'xai ni',
  skin: 'sờ kin',
  skins: 'sờ kin',
  relic: 're ních',
  fruit: 'phờ rút',
  fruits: 'phờ rút',
  gamepass: 'gêm pát',
  pass: 'pát',
  bundle: 'băn đồ',
  farm: 'fam',
  farming: 'fam ming',
  boss: 'bót',
  raid: 'rết',
  rank: 'ranh',
  level: 'le vồ',
  event: 'e ven',
  carry: 'ce ry',
  pro: 'pờ rô',
  noob: 'núp',
  team: 'tim',
  game: 'gêm',
  server: 'xơ vơ',
  admin: 'át min',
  mod: 'mót',
  bot: 'bót',
  code: 'cốt',
  link: 'linh',
  spam: 'xờ pam',
  sell: 'xeo',
  buy: 'bai',
  free: 'phờ ri',
  online: 'on lai',
  offline: 'ọp lai',
  update: 'ắp đét',

  // Slang & Cảm thán
  tbh: 'tu bi on nít',
  ngl: 'nót go na lai',
  fr: 'pho riu',
  frfr: 'pho riu pho riu',
  btw: 'bai đơ goay',
  idk: 'ai đôn nâu',
  idc: 'ai đôn ke',
  imo: 'ai em ô',
  omg: 'ô mai gót',
  wtf: 'quát đờ phắc',
  wth: 'quát đờ heo',
  tf: 'đờ phắc',
  lol: 'lon',
  lmao: 'lờ mao',
  ez: 'i zi',
  gg: 'gi gi',
  ggwp: 'gút gêm guen plây',
  afk: 'a ép ca',
  brb: 'bi rai bách',
  npc: 'en pi xi',
  op: 'ô pê',
  bruh: 'bờ rúp',
  bro: 'bờ rô',
  sis: 'xít',
  rizz: 'rít',
  slay: 'xờ lây',
  delulu: 'đê lu lu',
  gyat: 'gát',
  skibidi: 'xờ ki bi đi',
  sigma: 'xích ma',
  mewing: 'miu inh',
  aura: 'au ra',
  cringe: 'co rin',
  vibe: 'vai',
  chill: 'chiu',
  flex: 'phờ lếch',
  crush: 'cờ rắt',
  simp: 'xỉm',
  toxic: 'tốc xích',
  drama: 'đờ ra ma',
  trend: 'tren',
  idol: 'ai đần',
  fan: 'phan',
  pls: 'pờ lí',
  plz: 'pờ lí',
  thx: 'thanh',
  tks: 'thanh',
  ty: 'thanh kiu',
  tysm: 'thanh kiu so mát',
  sr: 'so ri',
  sry: 'so ri',
  sorry: 'so ri',
  hello: 'hê nâu',
  hi: 'hai',
  bye: 'bai',
  yes: 'dét',
  no: 'nô',
  cap: 'cắp',
  nocap: 'nô cắp',
  gn: 'gút nai',
  gm: 'gút mo ninh',
  hbd: 'háp pi bớt đê',
  top: 'tóp',
  hot: 'hót',
  mic: 'míc',
  chat: 'chát',
  map: 'mép',
  nice: 'nai xừ',
  good: 'gút',
  bad: 'bét',
  like: 'lai',
  follow: 'pho lâu',
  sub: 'xắp',
  view: 'viu',
  acc: 'ác',
  ib: 'in bốc',
  inbox: 'in bốc',
  rep: 'dép',
  cmt: 'còm men',
  comment: 'còm men',
  fb: 'phây búc',
  tiktok: 'tóp tóp',
  yt: 'diu túp',
  youtube: 'diu túp',
  discord: 'đít cọt',
  ye: 'de',
  yeah: 'de',
  ok: 'ô kê',
  oke: 'ô kê',
  oki: 'ô kê',
  okela: 'ô kê la',
};

/** Teencode chắc chắn là tiếng Việt -> dùng để đoán câu không dấu là tiếng Việt */
const VI_SLANG_STRONG = new Set([
  'ko', 'kh', 'khg', 'khum', 'hok', 'hong', 'kb', 'kbt', 'kp', 'kcj', 'dc', 'dk', 'lmj', 'lsao', 'ntn', 'mn',
  'mng', 'ae', 'mik', 'mk', 'thg', 'ny', 'nyc', 'vk', 'ck', 'vs', 'cx', 'cg', 'nx', 'nma', 'nhma', 'trc', 'thui',
  'bik', 'thik', 'iu', 'vl', 'vcl', 'vkl', 'vch', 'sml', 'hnay', 'hqua', 'bjo', 'dag', 'pk',
]);

/** Từ tiếng Anh phổ biến trông giống âm tiết Việt — dùng khi đoán ngôn ngữ câu không dấu */
const EN_COMMON = new Set([
  'a', 'i', 'to', 'go', 'do', 'so', 'no', 'me', 'he', 'be', 'by', 'my', 'in', 'on', 'an', 'at', 'it',
  'can', 'man', 'hot', 'top', 'long', 'thing', 'sing', 'king', 'ring', 'big', 'bit', 'but', 'cut', 'hit',
  'let', 'lot', 'not', 'get', 'got', 'put', 'set', 'sit', 'ten', 'tin', 'tip', 'pin', 'pan', 'pen', 'map',
  'mom', 'dad', 'hi', 'oh', 'the', 'up', 'us', 'am', 'and', 'nice', 'game', 'time', 'come', 'home',
]);

/**
 * Các từ không dấu trông giống âm tiết Việt nhưng gần như chắc chắn là tiếng Anh
 * khi xuất hiện trong câu tiếng Việt.
 */
const EN_WORDS = new Set([
  // (từ như "cho", "me", "no", "so", "ban", "can" cố ý KHÔNG có ở đây -> ưu tiên đọc tiếng Việt)
  'hi', 'oh', 'the', 'chat', 'mic', 'top', 'map', 'hot', 'yo', 'team', 'unit', 'tag', 'bot', 'mod', 'code', 'link', 'pass', 'win', 'lose', 'my', 'bye', 'yes',
]);

// Kiểm tra 1 từ không dấu có phải âm tiết tiếng Việt hợp lệ không
const VI_INITIAL = '(?:ngh|ng|nh|ch|gh|gi|kh|ph|qu|th|tr|[bcdghklmnprstvx])?';
const VI_OPEN = 'a|e|i|o|u|y|ai|ao|au|ay|eo|eu|ia|iu|oa|oe|oi|ua|ue|ui|uu|uy|ya|ieu|yeu|oai|oay|oeo|uay|uoi|uou|uya|uyu|uoi';
const VI_CLOSED_NUC = 'a|e|i|o|u|y|oa|oe|uy|ie|ye|uo|uye|oo|ua|ua|ue';
const VI_FINAL = 'ch|ng|nh|[cmnpt]';
const VI_SYLLABLE = new RegExp(`^${VI_INITIAL}(?:(?:${VI_CLOSED_NUC})(?:${VI_FINAL})|(?:${VI_OPEN}))$`);

function isVietSyllable(w) {
  return VI_SYLLABLE.test(w);
}

/**
 * Chuẩn hoá toàn bộ câu văn trước khi gửi tới TTS:
 *  - Mở rộng slang/teencode (thg -> thằng, vl -> vãi lồn, đm -> địt mẹ,...)
 *  - Phiên âm tiếng Anh sang ngữ điệu Việt (trade -> trây, unit -> du nịt, tbh -> tu bi on nít,...)
 *  - Áp dụng từ điển tuỳ chỉnh của server
 *  - Đọc mặt cười/tiếng cười thành chữ tự nhiên
 * Đọc NGUYÊN CÂU trong 1 giọng duy nhất, không bị đổi tông hay gián đoạn lạc quẻ!
 */
export function normalizeTextForSpeech(text, baseLang = 'vi', customDict = {}, phoneticVi = true) {
  const dict = { ...BUILTIN_DICT, ...customDict };
  // Xử lý cụm từ đặc biệt
  let t = text
    .replace(/\bto\s+be\s+honest\b/gi, 'tbh')
    .replace(/\bby\s+the\s+way\b/gi, 'btw')
    .replace(/\bfor\s+real\b/gi, 'fr')
    .replace(/\bnot\s+gonna\s+lie\b/gi, 'ngl')
    .replace(/\bin\s+my\s+opinion\b/gi, 'imo')
    .replace(/\bno\s+cap\b/gi, 'nocap')
    .replace(/\bthg\s+n([aàáạảãâầấậẩẫăằắặẳẵeèéẹẻẽêềếệểễoòóọỏõôồốộổỗơờớợởỡuùúụủũưừứựửữiìíịỉĩyỳýỵỷỹ])\b/gi, 'thằng n$1')
    .replace(/[:;=]+[)(dDpP]+|<3/g, ' ');

  const words = t.split(/\s+/).filter(Boolean);
  const result = [];

  for (const raw of words) {
    const m = raw.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}'’.-]*?[\p{L}\p{N}]|[\p{L}\p{N}]?)([^\p{L}\p{N}]*)$/u);
    if (!m || !m[2]) {
      result.push(raw);
      continue;
    }
    const [, pre, core, post] = m;
    const lower = core.toLowerCase();
    let short = collapse(lower);
    if (short.length < 2) short = lower;

    const custom = customDict[lower] ?? customDict[short];
    const entry = dict[lower] ?? dict[short];
    const slang = baseLang === 'vi' ? (VI_SLANG[lower] ?? VI_SLANG[short]) : undefined;
    const phonetic = phoneticVi && baseLang === 'vi' ? (EN_PHONETIC_VI[lower] ?? EN_PHONETIC_VI[short]) : undefined;

    if (custom) {
      result.push(`${pre}${custom.say}${post}`);
    } else if (LAUGH.test(lower)) {
      result.push(`${pre}ha ha ha${post}`);
    } else if (slang) {
      result.push(`${pre}${slang}${post}`);
    } else if (phonetic) {
      result.push(`${pre}${phonetic}${post}`);
    } else if (entry) {
      result.push(`${pre}${entry.say}${post}`);
    } else {
      result.push(raw);
    }
  }

  return result.join(' ');
}

/**
 * Tách văn bản thành các đoạn liên tiếp cùng ngôn ngữ (dùng cho Google TTS fallback).
 * @param {string} text
 * @param {'vi'|'en'} baseLang  ngôn ngữ chính của câu
 * @param {Record<string,{say:string,lang:string}>} customDict  từ điển riêng của server
 * @returns {{text:string, lang:'vi'|'en'}[]}
 */
export function segmentText(text, baseLang = 'vi', customDict = {}) {
  const dict = { ...BUILTIN_DICT, ...customDict };
  const tokens = []; // { text, lang|null }

  // Cụm từ tiếng Anh nhiều chữ -> chuyển về viết tắt để gán chuẩn lang 'en'
  text = text
    .replace(/\bto\s+be\s+honest\b/gi, 'tbh')
    .replace(/\bby\s+the\s+way\b/gi, 'btw')
    .replace(/\bfor\s+real\b/gi, 'fr')
    .replace(/\bnot\s+gonna\s+lie\b/gi, 'ngl')
    .replace(/\bin\s+my\s+opinion\b/gi, 'imo')
    .replace(/\bno\s+cap\b/gi, 'nocap')
    .replace(/[:;=]+[)(dDpP]+|<3/g, ' ');
  for (const raw of text.split(/\s+/).filter(Boolean)) {
    const m = raw.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}'’.-]*?[\p{L}\p{N}]|[\p{L}\p{N}]?)([^\p{L}\p{N}]*)$/u);
    if (!m || !m[2]) {
      tokens.push({ text: raw, lang: null }); // dấu câu / ký hiệu -> theo đoạn trước
      continue;
    }
    const [, pre, core, post] = m;
    const lower = core.toLowerCase();
    let short = collapse(lower); // "khummm" -> "khum", "okiii" -> "oki"
    if (short.length < 2) short = lower; // "aaa" không thành "a"
    const entry = dict[lower] ?? dict[short];
    const slang = baseLang === 'vi' ? (VI_SLANG[lower] ?? VI_SLANG[short]) : undefined;
    let say = core;
    let lang;

    if (entry) {
      say = entry.say;
      lang = entry.lang;
    } else if (!/\p{L}/u.test(core)) {
      lang = null; // chỉ có số -> đọc theo giọng đoạn xung quanh
    } else if (LAUGH.test(lower)) {
      say = 'ha ha ha'; // kkkk, hahaha, hihihi, hjhjhj...
      lang = 'vi';
    } else if (slang) {
      say = slang;
      lang = 'vi';
    } else if (VI_CHARS.test(core)) {
      lang = 'vi';
    } else if (baseLang === 'vi') {
      if (EN_WORDS.has(lower)) lang = 'en';
      else if (isVietSyllable(lower)) lang = 'vi';
      else lang = 'en';
    } else {
      lang = 'en';
    }
    tokens.push({ text: `${pre}${say}${post}`, lang });
  }

  // Gộp các token liền kề cùng ngôn ngữ
  const segments = [];
  for (const t of tokens) {
    const last = segments[segments.length - 1];
    if (last && (t.lang === null || t.lang === last.lang)) last.text += ` ${t.text}`;
    else if (!last && t.lang === null) segments.push({ text: t.text, lang: null });
    else if (last && last.lang === null) {
      last.text += ` ${t.text}`;
      last.lang = t.lang;
    } else segments.push({ text: t.text, lang: t.lang });
  }
  for (const s of segments) s.lang ??= baseLang;
  // Bỏ đoạn chỉ có dấu câu (không đọc được)
  return segments.filter((s) => /[\p{L}\p{N}]/u.test(s.text));
}

// ======================================================================
//  ENGINE: ElevenLabs
// ======================================================================

export const VOICES = {
  brian: { name: 'Brian (Trầm ấm, rõ chữ nhất - Khuyên dùng)', id: 'nPczCjzI2devNBz1zQrb' },
  daniel: { name: 'Daniel (Phát thanh viên, tròn vành rõ chữ)', id: 'onwK4e9ZLuTAKqWW03F9' },
  adam: { name: 'Adam (Nam trầm)', id: 'pNInz6obpgDQGcFmaJgB' },
  liam: { name: 'Liam (Nam trẻ, tự nhiên)', id: 'TX3LPaxmHKxFdv7VOQHJ' },
  george: { name: 'George (Nam ấm áp)', id: 'JBFqnCBsd6RMkjVDRZzb' },
};

export const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || VOICES.brian.id;
const num = (v, d) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? d : Number(v));

/** Cấu hình giọng đọc và tối ưu thông số để phát âm rõ chữ, đều nhịp */
function voiceProfile(lang, customVoiceId) {
  const L = lang.toUpperCase();
  const env = process.env;
  // stability = 0.65 giúp giữ nhịp đều, không bị lúc nhanh lúc chậm
  // similarity = 0.85 giúp phát âm rõ âm điệu, tròn vành rõ chữ tiếng Việt
  // style = 0.0 loại bỏ cảm xúc kịch tính gây nói vấp
  const defaults = { stability: 0.65, similarity: 0.85, style: 0.0, speed: 1.0 };
  const voiceId = customVoiceId || env[`ELEVENLABS_VOICE_${L}`] || env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  return {
    voiceId,
    voice_settings: {
      stability: num(env[`ELEVENLABS_STABILITY_${L}`], defaults.stability),
      similarity_boost: num(env[`ELEVENLABS_SIMILARITY_${L}`], defaults.similarity),
      style: num(env[`ELEVENLABS_STYLE_${L}`], defaults.style),
      speed: num(env[`ELEVENLABS_SPEED_${L}`], defaults.speed),
      use_speaker_boost: true,
    },
  };
}

const cache = new Map(); // LRU nhỏ để tiết kiệm credit ElevenLabs
const CACHE_MAX = 200;

// Gói free ElevenLabs giới hạn số request đồng thời -> xếp hàng
const MAX_CONCURRENT = Math.max(1, num(process.env.ELEVENLABS_CONCURRENCY, 2));
let running = 0;
const waiters = [];
async function withSlot(fn) {
  if (running >= MAX_CONCURRENT) await new Promise((r) => waiters.push(r));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    waiters.shift()?.();
  }
}

async function elevenLabs(text, lang, customVoiceId, attempt = 0) {
  try {
    return await withSlot(() => elevenLabsOnce(text, lang, customVoiceId));
  } catch (e) {
    if (e.status === 429 && attempt < 3) {
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      return elevenLabs(text, lang, customVoiceId, attempt + 1);
    }
    throw e;
  }
}

async function elevenLabsOnce(text, lang, customVoiceId) {
  const { voiceId, voice_settings } = voiceProfile(lang, customVoiceId);
  // Dùng eleven_multilingual_v2 để phát âm tiếng Việt chuẩn xác nhất
  const model = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
  const key = `${voiceId}|${model}|${lang}|${JSON.stringify(voice_settings)}|${text}`;
  if (cache.has(key)) {
    const buf = cache.get(key);
    cache.delete(key);
    cache.set(key, buf);
    return buf;
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({ text, model_id: model, voice_settings }),
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`ElevenLabs ${res.status}: ${body.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  cache.set(key, buf);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  return buf;
}

// ======================================================================
//  ENGINE: Google Translate (dự phòng, miễn phí)
// ======================================================================

async function google(text, lang) {
  const parts = await googleTTS.getAllAudioBase64(text, {
    lang,
    slow: false,
    host: 'https://translate.google.com',
    splitPunct: ',.?!;:',
    timeout: 10000,
  });
  return Buffer.concat(parts.map((p) => Buffer.from(p.base64, 'base64')));
}

export const engineName = (engine = 'google') =>
  engine === 'elevenlabs' && process.env.ELEVENLABS_API_KEY
    ? 'ElevenLabs (Brian / Adam)'
    : 'Google (Chị Google Thuần Việt)';

/**
 * Chuyển văn bản thành 1 buffer MP3.
 * - Mặc định (mode === 'smooth'): Đọc 100% trong 1 giọng duy nhất (Chị Google thuần Việt),
 *   các từ tiếng Anh/slang được việt hoá phiên âm hài hước, đọc mượt mà, không giật cục, không đổi tông lạc quẻ!
 * - Chế độ tách đoạn (mode === 'split'): Tách câu để đổi sang giọng Mỹ đọc từ tiếng Anh.
 * - Tuỳ chọn Engine: ElevenLabs nếu server chọn.
 * @param {string} text
 * @param {'vi'|'en'} lang  ngôn ngữ chính
 * @param {{dict?: Record<string,{say:string,lang:string}>, engine?: string, mode?: string, voiceId?: string}} [opts]
 */
export async function synthesize(text, lang = 'vi', opts = {}) {
  const dict = opts.dict || {};
  const engine = opts.engine || 'google';
  const mode = opts.mode || 'smooth'; // 'smooth' (mượt mà hài hước - một giọng) hoặc 'split' (đổi giọng Mỹ)

  if (engine === 'elevenlabs' && process.env.ELEVENLABS_API_KEY) {
    try {
      const normalized = normalizeTextForSpeech(text, lang, dict, false);
      if (!normalized.trim()) throw new Error('Không có gì để đọc');
      return await elevenLabs(normalized, lang, opts.voiceId);
    } catch (e) {
      console.warn('[tts] ElevenLabs lỗi, chuyển sang Google fallback:', e.message);
    }
  }

  // 1. Chế độ Mượt mà (smooth - Mặc định):
  // Khi câu là tiếng Việt: Việt hoá phiên âm tiếng Anh và đọc toàn bộ câu bằng giọng Chị Google tiếng Việt.
  // Nhịp điệu hài hước, tự nhiên, tưng tửng, không bị đổi tông giọng lạ lẫm!
  if (mode === 'smooth' && lang === 'vi') {
    const normalized = normalizeTextForSpeech(text, 'vi', dict, true);
    if (!normalized.trim()) throw new Error('Không có gì để đọc');
    return await google(normalized, 'vi');
  }

  // Nếu câu là 100% tiếng Anh:
  if (lang === 'en') {
    const normalized = normalizeTextForSpeech(text, 'en', dict, false);
    if (!normalized.trim()) throw new Error('Không có gì để đọc');
    return await google(normalized, 'en');
  }

  // 2. Chế độ tách đoạn (split): Chuyển sang giọng Mỹ khi gặp từ tiếng Anh
  const segments = segmentText(text, lang, dict);
  if (!segments.length) throw new Error('Không có gì để đọc');
  const bufs = await Promise.all(segments.map((s) => google(s.text, s.lang)));
  return Buffer.concat(bufs);
}
