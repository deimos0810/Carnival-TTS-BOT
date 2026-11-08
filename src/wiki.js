/**
 * Lấy dữ liệu từ GPO Fandom Wiki qua MediaWiki API (API công khai, không scrape HTML).
 * Trả về: thông tin infobox + các dòng có nhắc tới "cap" (stat cap / soft cap).
 */
const API = process.env.GPO_WIKI_API || 'https://grand-piece-online.fandom.com/api.php';
const WIKI_BASE = API.replace(/api\.php$/, 'wiki/');
const HEADERS = { 'User-Agent': 'GPO-TTS-DiscordBot/1.0 (community fruit stat lookup)' };

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Wiki trả về HTTP ${res.status} (có thể đang bị giới hạn truy cập, thử lại sau)`);
  if (!(res.headers.get('content-type') ?? '').includes('json'))
    throw new Error('Wiki đang tạm chặn truy cập tự động, hãy thử lại sau hoặc dùng dữ liệu cộng đồng (/fruit info).');
  return res.json();
}

export async function searchWiki(query) {
  const data = await api({ action: 'opensearch', search: query, limit: '5', namespace: '0' });
  return data?.[1] ?? [];
}

function cleanWiki(s) {
  return s
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/<br\s*\/?>/gi, ', ')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\[(?:File|Image|Tệp):[^\]]*\]\]/gi, '')
    .replace(/\[\[[^|\]]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/\[https?:\/\/\S+\s([^\]]+)\]/g, '$1')
    .replace(/\{\{[^{}|]*\|([^{}]*)\}\}/g, '$1')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/'{2,}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchFruitFromWiki(query) {
  let titles = await searchWiki(query);
  if (!titles.length && !/no mi/i.test(query)) titles = await searchWiki(`${query} no Mi`);
  if (!titles.length) return null;
  // Ưu tiên trang có "no Mi"
  const title = titles.find((t) => /no mi/i.test(t)) ?? titles[0];

  const data = await api({ action: 'parse', page: title, prop: 'wikitext', redirects: '1' });
  const wikitext = data?.parse?.wikitext?.['*'];
  if (!wikitext) return null;
  const realTitle = data.parse.title;

  // Infobox: các dòng "| key = value" ở phần đầu trang
  const infobox = {};
  const head = wikitext.split(/\n==/)[0];
  for (const m of head.matchAll(/^\|\s*([\w ]+?)\s*=\s*(.+)$/gm)) {
    const val = cleanWiki(m[2]);
    if (val && val.length < 200) infobox[m[1].trim()] = val;
  }

  // Các dòng nhắc đến cap (kèm tên mục/chiêu gần nhất để biết cap của chiêu nào)
  const capLines = [];
  let section = '';
  for (const raw of wikitext.split('\n')) {
    const h = raw.match(/^=+\s*(.+?)\s*=+\s*$/);
    if (h) {
      section = cleanWiki(h[1]);
      continue;
    }
    if (/\bcap(s|ped)?\b|soft ?cap|hard ?cap/i.test(raw)) {
      let line = cleanWiki(raw.replace(/^[*#:|!\s-]+/, '')).replace(/^[,•\s*-]+/, '');
      if (!line || line.length <= 3 || line.length >= 300) continue;
      if (section) line = `[${section}] ${line}`;
      if (!capLines.includes(line)) capLines.push(line);
    }
  }

  return {
    title: realTitle,
    url: WIKI_BASE + encodeURIComponent(realTitle.replace(/ /g, '_')),
    infobox,
    capLines: capLines.slice(0, 15),
  };
}
