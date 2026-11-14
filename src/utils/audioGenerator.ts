/**
 * Generates a clean synthetic audio voice recording WAV file in memory
 * Used for audio preview, testing, and environments without microphone hardware.
 */

export function generateSyntheticVoiceNote(durationSeconds = 4): string {
  const sampleRate = 44100;
  const numSamples = durationSeconds * sampleRate;
  const buffer = new Float32Array(numSamples);

  // Generate an organic speech-like harmonic sweep
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Fundamental frequency with natural vibrato
    const f0 = 220 + Math.sin(t * 3.5) * 45;
    // Formant simulation
    const s1 = Math.sin(2 * Math.PI * f0 * t) * 0.4;
    const s2 = Math.sin(2 * Math.PI * (f0 * 2) * t) * 0.2;
    const s3 = Math.sin(2 * Math.PI * (f0 * 3) * t) * 0.1;
    // Volume envelope (fade in and out softly with pauses like speech)
    const envelope = Math.sin((t / durationSeconds) * Math.PI) * (0.6 + 0.4 * Math.sin(t * 8));
    buffer[i] = (s1 + s2 + s3) * envelope * 0.5;
  }

  // Convert Float32Array to 16-bit PCM WAV
  const wavBytes = new Uint8Array(44 + numSamples * 2);
  const view = new DataView(wavBytes.buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, 'WAVE');
  // fmt subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  // data subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // PCM data
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  // Convert to Base64 data URL
  let binary = '';
  for (let i = 0; i < wavBytes.byteLength; i++) {
    binary += String.fromCharCode(wavBytes[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
