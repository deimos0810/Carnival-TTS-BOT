import { synthesize, detectLang } from '../src/tts.js';
import { fetchValuesFromSheet, allValues, findValue } from '../src/values.js';
import { generateDependencyReport } from '@discordjs/voice';
import { commandData } from '../src/commands.js';

console.log(generateDependencyReport());
console.log('Số slash command:', commandData.length);
console.log('detectLang:', detectLang('xin chào mọi người'), detectLang('hello everyone'));

const vi = await synthesize('Xin chào, đây là bot đọc tin nhắn.', 'vi');
const en = await synthesize('Hello, this is the text to speech bot.', 'en');
console.log('TTS vi bytes:', vi.length, '| en bytes:', en.length);

try {
  const items = await fetchValuesFromSheet();
  console.log('Lấy từ Google Sheet thành công, tổng số items:', items.length);
  const sample = items.find((i) => i.isShiny);
  console.log('Sample Shiny Item:', sample?.name, sample?.value, sample?.tier);
} catch (e) {
  console.log('Sheet lỗi:', e.message);
}
