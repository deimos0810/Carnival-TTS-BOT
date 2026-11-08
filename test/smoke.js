// Smoke test: chạy bằng `node test/smoke.js` (không cần token Discord)
import { synthesize, detectLang } from '../src/tts.js';
import { fetchFruitFromWiki } from '../src/wiki.js';
import { generateDependencyReport } from '@discordjs/voice';
import { commandData } from '../src/commands.js';

console.log(generateDependencyReport());
console.log('Số slash command:', commandData.length);
console.log('detectLang:', detectLang('xin chào mọi người'), detectLang('hello everyone'));

const vi = await synthesize('Xin chào, đây là bot đọc tin nhắn.', 'vi');
const en = await synthesize('Hello, this is the text to speech bot.', 'en');
console.log('TTS vi bytes:', vi.length, '| en bytes:', en.length);

try {
  const w = await fetchFruitFromWiki('Magu Magu no Mi');
  console.log('Wiki:', w?.title, w?.url);
  console.log('Infobox keys:', Object.keys(w?.infobox ?? {}).slice(0, 10));
  console.log('Cap lines:', w?.capLines?.slice(0, 5));
} catch (e) {
  console.log('Wiki lỗi:', e.message);
}

