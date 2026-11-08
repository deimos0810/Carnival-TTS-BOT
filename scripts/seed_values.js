import { fetchValuesFromSheet } from '../src/values.js';
import fs from 'node:fs/promises';

console.log('Đang cào dữ liệu từ Google Sheet...');
const items = await fetchValuesFromSheet();
console.log(`Đã lấy ${items.length} items từ Google Sheet!`);
await fs.writeFile('data/values.seed.json', JSON.stringify(items, null, 2));
console.log('Đã lưu vào data/values.seed.json');
