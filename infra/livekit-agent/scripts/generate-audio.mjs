/**
 * Generate placeholder WAV audio files for LiveKit Agent development.
 * In production, replace these with professionally recorded audio.
 *
 * Usage: node generate-audio.mjs
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const audioDir = join(__dirname, 'audio');

if (!existsSync(audioDir)) {
  mkdirSync(audioDir, { recursive: true });
}

const SAMPLE_RATE = 48000;
const NUM_CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

function generateTone(frequency, durationSec, amplitude = 0.3) {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Int16Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    // Sinusoidal tone with fade-in/fade-out
    const fade = Math.min(1, (i / (SAMPLE_RATE * 0.05)), (numSamples - i) / (SAMPLE_RATE * 0.05));
    const value = amplitude * Math.sin(2 * Math.PI * frequency * t) * Math.min(1, fade);
    samples[i] = Math.max(-32768, Math.min(32767, Math.round(value * 32767)));
  }

  return samples;
}

function generateSilence(durationSec) {
  return new Int16Array(Math.floor(SAMPLE_RATE * durationSec));
}

function writeWav(filePath, samples) {
  const numChannels = NUM_CHANNELS;
  const bitsPerSample = BITS_PER_SAMPLE;
  const byteRate = SAMPLE_RATE * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * (bitsPerSample / 8);
  const headerSize = 44;

  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write samples
  const offset = 44;
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(offset + i * 2, samples[i], true);
  }

  writeFileSync(filePath, Buffer.from(buffer));
  console.log(`  ✓ ${filePath}`);
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// --- Generate audio files ---

console.log('Generating placeholder audio files...\n');

// 1. greeting.wav — «Добро пожаловать в Грильяж» (~5 sec)
writeWav(
  join(audioDir, 'greeting.wav'),
  generateTone(440, 5, 0.25),
);

// 2. queue_info.wav — «Все операторы заняты» (~4 sec)
writeWav(
  join(audioDir, 'queue_info.wav'),
  generateTone(350, 4, 0.25),
);

// 3. background_music.wav — фоновая музыка (~10 sec loop)
writeWav(
  join(audioDir, 'background_music.wav'),
  (() => {
    const melody = [262, 294, 330, 349, 392, 349, 330, 294]; // C D E F G F E D
    let result = new Int16Array(0);
    for (const freq of melody) {
      const tone = generateTone(freq, 0.5, 0.08);
      const combined = new Int16Array(result.length + tone.length + 2400); // 50ms gap
      combined.set(result);
      combined.set(tone, result.length + 1200);
      result = combined;
    }
    return result;
  })(),
);

// 4. fact.wav — интересный факт (~4 sec) — placeholder tone
writeWav(
  join(audioDir, 'fact.wav'),
  generateTone(523, 4, 0.2), // C5
);

// 5. joke.wav — шутка (~4 sec)
writeWav(
  join(audioDir, 'joke.wav'),
  generateTone(392, 4, 0.2), // G4
);

// 6. menu_info.wav — «Нажмите 1 для заказа...» (~5 sec)
writeWav(
  join(audioDir, 'menu_info.wav'),
  generateTone(440, 5, 0.2),
);

// 7. operator_transfer.wav — «Соединяю с оператором» (~3 sec)
writeWav(
  join(audioDir, 'operator_transfer.wav'),
  generateTone(523, 3, 0.25),
);

// 8. invalid_option.wav — «Неверный ввод» (~2 sec)
writeWav(
  join(audioDir, 'invalid_option.wav'),
  (() => {
    const tone1 = generateTone(200, 0.3, 0.3);
    const tone2 = generateTone(150, 0.3, 0.3);
    const combined = new Int16Array(tone1.length + 2400 + tone2.length);
    combined.set(tone1);
    combined.set(tone2, tone1.length + 2400);
    return combined;
  })(),
);

// 9. goodbye.wav — «До свидания» (~2 sec)
writeWav(
  join(audioDir, 'goodbye.wav'),
  (() => {
    const tone1 = generateTone(523, 0.5, 0.25);
    const tone2 = generateTone(659, 0.5, 0.25);
    const tone3 = generateTone(784, 0.8, 0.25);
    const combined = new Int16Array(tone1.length + tone2.length + tone3.length);
    combined.set(tone1);
    combined.set(tone2, tone1.length);
    combined.set(tone3, tone1.length + tone2.length);
    return combined;
  })(),
);

console.log('\nDone! All 9 audio files generated.');
console.log('Replace these with professionally recorded voiceovers for production.');
