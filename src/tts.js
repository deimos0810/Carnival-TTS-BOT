import googleTTS from 'google-tts-api';

export const LANGS = {
  en: 'English',
  vi: 'Tiếng Việt',
};

const VI_CHARS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

/** Tự đoán ngôn ngữ: có dấu tiếng Việt => vi, ngược lại => en */
export function detectLang(text) {
  return VI_CHARS.test(text) ? 'vi' : 'en';
}

/** Chuyển văn bản thành 1 buffer MP3 (tự chia đoạn > 200 ký tự). */
export async function synthesize(text, lang = 'vi') {
  const parts = await googleTTS.getAllAudioBase64(text, {
    lang,
    slow: false,
    host: 'https://translate.google.com',
    splitPunct: ',.?!;:',
    timeout: 10000,
  });
  return Buffer.concat(parts.map((p) => Buffer.from(p.base64, 'base64')));
}

