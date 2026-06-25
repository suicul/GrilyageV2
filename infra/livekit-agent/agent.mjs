import {
  ServerOptions,
  cli,
  defineAgent,
  loopAudioFramesFromFile,
} from '@livekit/agents';
import {
  AudioSource,
  LocalAudioTrack,
  TrackPublishOptions,
  TrackSource,
  RoomEvent,
} from '@livekit/rtc-node';
import { RoomServiceClient } from 'livekit-server-sdk';
import { readdirSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOST = process.env.LIVEKIT_HOST || 'localhost';
const PORT = process.env.LIVEKIT_PORT || '7880';
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;

const roomClient = new RoomServiceClient(
  `http://${HOST}:${PORT}`,
  API_KEY,
  API_SECRET,
);

// --- Audio file loader ---
const audioDir = join(__dirname, 'audio');
if (!existsSync(audioDir)) {
  mkdirSync(audioDir, { recursive: true });
}

const audioFiles = {};
try {
  for (const file of readdirSync(audioDir).filter((f) => f.endsWith('.wav'))) {
    audioFiles[file.replace('.wav', '')] = join(audioDir, file);
  }
  console.log(`Loaded audio: ${Object.keys(audioFiles).join(', ')}`);
} catch (e) {
  console.error('No audio files loaded:', e.message);
}

// --- Queue state ---
const callQueue = []; // FIFO: [{ callId, roomName, participantIdentity }]
const operatorAvailability = {}; // { roomName: { available: bool } }

// --- Audio playback helper ---
async function playAudio(ctx, audioName) {
  const filePath = audioFiles[audioName];
  if (!filePath) {
    console.warn(`Audio not found: ${audioName}`);
    return;
  }
  const audioSource = new AudioSource(48000, 1);
  const track = LocalAudioTrack.createAudioTrack('agent_audio', audioSource);
  const publication = await ctx.room.localParticipant.publishTrack(
    track,
    new TrackPublishOptions({ source: TrackSource.SOURCE_MICROPHONE }),
  );
  await publication.waitForSubscription();
  const abortController = new AbortController();
  ctx.addShutdownCallback(async () => abortController.abort());
  for await (const frame of loopAudioFramesFromFile(filePath, {
    sampleRate: 48000,
    numChannels: 1,
    abortSignal: abortController.signal,
  })) {
    await audioSource.captureFrame(frame);
  }
}

// --- DTMF tone detection ---
function detectDTMF(frame) {
  // Simplified DTMF detection via Goertzel algorithm
  // Frequencies: 697, 770, 852, 941 (rows) × 1209, 1336, 1477, 1633 (cols)
  const dtmfFrequencies = {
    '1': [697, 1209],
    '2': [697, 1336],
    '3': [697, 1477],
    '4': [770, 1209],
    '5': [770, 1336],
    '6': [770, 1477],
    '7': [852, 1209],
    '8': [852, 1336],
    '9': [852, 1477],
    '0': [941, 1336],
    '*': [941, 1209],
    '#': [941, 1477],
  };

  const sampleRate = 48000;
  const samples = frame.data;
  if (!samples || samples.length < 400) return null;

  // Simple energy-based detection for each DTMF tone
  for (const [key, [f1, f2]] of Object.entries(dtmfFrequencies)) {
    const energy1 = goertzel(samples, f1, sampleRate);
    const energy2 = goertzel(samples, f2, sampleRate);
    const threshold = 0.15;
    if (energy1 > threshold && energy2 > threshold) {
      return key;
    }
  }
  return null;
}

function goertzel(samples, targetFreq, sampleRate) {
  const n = samples.length;
  const k = Math.round((n * targetFreq) / sampleRate);
  const omega = (2 * Math.PI * k) / n;
  const coeff = 2 * Math.cos(omega);

  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < n; i++) {
    const s = samples[i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s;
  }
  const power = s2 * s2 + s1 * s1 - coeff * s1 * s2;
  return power / (n * n);
}

// --- DTMF menu handler ---
async function handleDTMFMenu(ctx, digit) {
  switch (digit) {
    case '0':
      await playAudio(ctx, 'operator_transfer');
      await transferToOperator(ctx);
      break;
    case '1':
      await playAudio(ctx, 'menu_info');
      await playAudio(ctx, 'background_music');
      break;
    case '2':
      await playAudio(ctx, 'fact');
      break;
    case '3':
      await playAudio(ctx, 'greeting');
      break;
    case '#':
      await playAudio(ctx, 'goodbye');
      ctx.room.disconnect();
      break;
    default:
      await playAudio(ctx, 'invalid_option');
  }
}

// --- Queue logic ---
async function transferToOperator(ctx) {
  const roomName = ctx.room.name;
  const callerIdentity = ctx.room.localParticipant?.identity || 'unknown';

  // Add to queue
  callQueue.push({
    callId: `${Date.now()}`,
    roomName,
    participantIdentity: callerIdentity,
    joinedAt: Date.now(),
  });

  console.log(`Caller enqueued: ${callerIdentity}. Queue length: ${callQueue.length}`);

  // Notify operators about new queue entry
  // (In production this would trigger a push notification to the operator desktop)

  // Check if any operator just became available
  if (operatorAvailability[roomName]?.available) {
    await assignNextCall(roomName);
  }

  // Hold loop with periodic facts/jokes
  let factCycle = 0;
  while (callQueue.some((c) => c.roomName === roomName)) {
    if (factCycle % 3 === 0) {
      await playAudio(ctx, 'fact');
    } else {
      await playAudio(ctx, 'joke');
    }
    await playAudio(ctx, 'background_music');
    factCycle++;
  }
}

async function assignNextCall(roomName) {
  const next = callQueue.find((c) => c.roomName === roomName);
  if (!next) return;

  callQueue.splice(callQueue.indexOf(next), 1);
  operatorAvailability[roomName] = { available: false };

  console.log(`Assigning call ${next.callId} to operator in room ${roomName}`);

  // In production: notify operator desktop via WebSocket or webhook
  // The operator accepts and joins the room
}

// --- Room participant monitoring ---
async function monitorParticipants(ctx) {
  const roomName = ctx.room.name;

  // Periodic check for operator availability
  const interval = setInterval(async () => {
    try {
      const participants = await roomClient.listParticipants(roomName);
      const hasOperator = participants.some((p) =>
        p.identity?.startsWith('operator-'),
      );

      const wasAvailable = operatorAvailability[roomName]?.available;
      operatorAvailability[roomName] = { available: hasOperator };

      if (hasOperator && !wasAvailable && callQueue.some((c) => c.roomName === roomName)) {
        console.log(`Operator became available in ${roomName}, assigning call`);
        await assignNextCall(roomName);
      }
    } catch (err) {
      console.error('Participant monitoring error:', err.message);
    }
  }, 5000);

  ctx.addShutdownCallback(async () => clearInterval(interval));
}

// --- Main agent entry ---
export default defineAgent({
  entry: async (ctx) => {
    await ctx.connect();
    const roomName = ctx.room.name;
    console.log(`Connected to room: ${roomName}`);

    // Start participant monitoring
    await monitorParticipants(ctx);

    const participants = await roomClient.listParticipants(roomName);
    const isOperatorAvailable = participants.some((p) =>
      p.identity?.startsWith('operator-'),
    );
    operatorAvailability[roomName] = { available: isOperatorAvailable };

    // Welcome greeting
    if (isOperatorAvailable) {
      await playAudio(ctx, 'greeting');
      // Brief menu prompt
      await playAudio(ctx, 'menu_info');
    } else {
      // All operators busy — queue with hold music
      await playAudio(ctx, 'greeting');
      await playAudio(ctx, 'queue_info');
      await transferToOperator(ctx);
    }

    // Listen for DTMF tones from remote participants
    let lastDigit = null;
    let lastDigitTime = 0;
    const DTMF_DEBOUNCE_MS = 400;

    ctx.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind !== 'audio' || !participant || participant.isLocal) return;
      console.log(`Subscribed to audio track from ${participant.identity}`);

      // Subscribe to audio frames for DTMF detection
      track.on('frame', (frame) => {
        const digit = detectDTMF(frame);
        if (!digit) return;

        const now = Date.now();
        if (digit !== lastDigit || now - lastDigitTime > DTMF_DEBOUNCE_MS) {
          lastDigit = digit;
          lastDigitTime = now;
          console.log(`DTMF detected: ${digit} from ${participant.identity}`);
          handleDTMFMenu(ctx, digit);
        }
      });
    });

    console.log(`Agent ready in room ${roomName}. Listening for DTMF on remote audio...`);
  },
});

cli.runApp(new ServerOptions({ agent: fileURLToPath(import.meta.url) }));
