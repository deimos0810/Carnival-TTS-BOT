import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  NoSubscriberBehavior,
  StreamType,
} from '@discordjs/voice';
import { Readable } from 'node:stream';
import { synthesize, DEFAULT_VOICE_ID } from './tts.js';
import { getGuild } from './store.js';

const sessions = new Map();
const MAX_QUEUE = 25;

class TTSSession {
  constructor(channel) {
    this.guildId = channel.guild.id;
    this.channelId = channel.id;
    this.queue = [];
    this.busy = false;

    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
    this.player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
    this.connection.subscribe(this.player);

    this.player.on(AudioPlayerStatus.Idle, () => {
      this.busy = false;
      this.next();
    });
    this.player.on('error', (err) => {
      console.error('[voice] Lỗi phát:', err.message);
      this.busy = false;
      this.next();
    });

    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        // Bị kéo sang kênh khác / mạng chập chờn -> đợi kết nối lại
        await Promise.race([
          entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        this.destroy();
      }
    });
    this.connection.on(VoiceConnectionStatus.Destroyed, () => sessions.delete(this.guildId));
  }

  async ready() {
    await entersState(this.connection, VoiceConnectionStatus.Ready, 20_000);
  }

  enqueue(text, lang, voiceId = null, engine = null, mode = null) {
    if (!text) return;
    if (this.queue.length >= MAX_QUEUE) this.queue.shift();
    this.queue.push({ text, lang, voiceId, engine, mode });
    this.next();
  }

  async next() {
    if (this.busy) return;
    const item = this.queue.shift();
    if (!item) return;
    this.busy = true;
    try {
      const guildCfg = getGuild(this.guildId);
      const mp3 = await synthesize(item.text, item.lang, {
        dict: guildCfg.dict,
        engine: item.engine || guildCfg.engine || (process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : 'google'),
        mode: item.mode || guildCfg.ttsMode || 'smooth',
        voiceId: item.voiceId || guildCfg.voiceId || DEFAULT_VOICE_ID,
      });
      const resource = createAudioResource(Readable.from([mp3]), { inputType: StreamType.Arbitrary });
      this.player.play(resource);
    } catch (err) {
      console.error('[voice] Lỗi TTS:', err.message);
      this.busy = false;
      this.next();
    }
  }

  skip() {
    this.player.stop(true);
  }

  destroy() {
    this.queue = [];
    sessions.delete(this.guildId);
    try {
      this.connection.destroy();
    } catch {
      /* đã huỷ */
    }
  }
}

export function getSession(guildId) {
  return sessions.get(guildId) ?? null;
}

export function sessionCount() {
  return sessions.size;
}

export async function joinChannel(channel) {
  const old = sessions.get(channel.guild.id);
  if (old && old.channelId === channel.id) return old;
  old?.destroy();
  const s = new TTSSession(channel);
  sessions.set(channel.guild.id, s);
  try {
    await s.ready();
  } catch (e) {
    s.destroy();
    throw new Error('Không thể kết nối voice (hết thời gian chờ).');
  }
  return s;
}

export function leave(guildId) {
  const s = sessions.get(guildId);
  if (!s) return false;
  s.destroy();
  return true;
}

