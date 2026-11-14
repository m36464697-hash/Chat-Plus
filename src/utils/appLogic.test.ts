import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bufferToBase64,
  base64ToBuffer,
  encryptText,
  decryptText,
  generateSecurityFingerprint,
  generateRoomCode,
} from './crypto';
import { formatReadableError } from './errors';
import { extractRoomCodeFromInput } from './clipboard';
import {
  ACCENT_THEMES,
  ALLOWED_PREFERENCE_KEYS,
  CHAT_WALLPAPERS,
  findNextAudioMessageId,
  getAccentTheme,
  getWallpaperOption,
  PRESENCE_STALE_MS,
  resolveMemberPresence,
  sanitizePreferencesPayload,
  summarizeRoomPresence,
} from './wallpapers';
import type { ChatMember, UserPreferences } from '../types/chat';

test('Web Crypto AES-256-GCM encrypts and decrypts Arabic and emoji messages accurately', async () => {
  const plaintext = 'مرحباً بك في شات بلس! 🔐✨ رسالة سرية مشفرة بالكامل.';
  const secret = 'CP-8924-KLM';
  const salt = 'room_salt_2026';

  const { ciphertext, iv } = await encryptText(plaintext, secret, salt);
  assert.ok(ciphertext.length > 0);
  assert.ok(iv.length > 0);
  assert.notEqual(ciphertext, plaintext);

  const decrypted = await decryptText(ciphertext, iv, secret, salt);
  assert.equal(decrypted, plaintext);
});

test('decryptText falls back safely when secret key or salt is incorrect', async () => {
  const { ciphertext, iv } = await encryptText('سر الغرفة', 'CP-1111-AAA', 'salt1');
  const result = await decryptText(ciphertext, iv, 'CP-9999-ZZZ', 'salt1');
  assert.equal(result, ciphertext);
});

test('bufferToBase64 and base64ToBuffer preserve arbitrary binary bytes', () => {
  const original = new Uint8Array([0, 12, 127, 128, 255, 42]);
  const b64 = bufferToBase64(original);
  const restored = base64ToBuffer(b64);
  assert.deepEqual(Array.from(restored), Array.from(original));
});

test('generateSecurityFingerprint returns deterministic 4x4 hex fingerprint', async () => {
  const fp1 = await generateSecurityFingerprint('CP-1234-ABC', 's1');
  const fp2 = await generateSecurityFingerprint('CP-1234-ABC', 's1');
  const fpOther = await generateSecurityFingerprint('CP-1234-ABD', 's1');

  assert.equal(fp1, fp2);
  assert.notEqual(fp1, fpOther);
  assert.match(fp1, /^[0-9A-F]{4} · [0-9A-F]{4} · [0-9A-F]{4} · [0-9A-F]{4}$/);
});

test('generateRoomCode generates valid CP-XXXX-XXX format', () => {
  const code = generateRoomCode();
  assert.match(code, /^CP-[A-Z0-9]{4}-[A-Z0-9]{3}$/);
});

test('extractRoomCodeFromInput normalizes URLs, lowercase, and whitespace', () => {
  assert.equal(extractRoomCodeFromInput('  cp-4821-abc  '), 'CP-4821-ABC');
  assert.equal(
    extractRoomCodeFromInput('https://chatplus.app/?room=cp-9910-xyz&ref=share'),
    'CP-9910-XYZ'
  );
  assert.equal(extractRoomCodeFromInput('   '), '');
});

test('formatReadableError converts Firebase JSON and network errors into clean Arabic messages', () => {
  const permJson = JSON.stringify({
    error: 'Missing or insufficient permissions',
    authInfo: { emailVerified: true },
  });
  assert.match(formatReadableError(new Error(permJson), 'fallback'), /الصلاحيات/);

  const unverifiedJson = JSON.stringify({
    error: 'permission-denied',
    authInfo: { emailVerified: false },
  });
  assert.match(formatReadableError(new Error(unverifiedJson), 'fallback'), /توثيق البريد/);

  assert.match(formatReadableError(new Error('client is offline'), 'fallback'), /الاتصال/);
  assert.equal(formatReadableError(new Error('رسالة خطأ عربية واضحة'), 'fallback'), 'رسالة خطأ عربية واضحة');
  assert.equal(formatReadableError(new Error('opaque unknown error'), 'خطأ افتراضي'), 'خطأ افتراضي');
});

test('CHAT_WALLPAPERS provides 12 unique wallpapers and getWallpaperOption falls back to default', () => {
  assert.equal(CHAT_WALLPAPERS.length, 12);
  const uniqueIds = new Set(CHAT_WALLPAPERS.map((w) => w.id));
  assert.equal(uniqueIds.size, 12);
  assert.equal(getWallpaperOption('midnight-cosmos').id, 'midnight-cosmos');
  assert.equal(getWallpaperOption('nonexistent').id, 'default');
});

test('ACCENT_THEMES provides 6 accent palettes and getAccentTheme falls back safely', () => {
  assert.equal(Object.keys(ACCENT_THEMES).length, 6);
  assert.equal(getAccentTheme('emerald').id, 'emerald');
  assert.equal(getAccentTheme('unknown' as any).id, 'indigo');
});

test('sanitizePreferencesPayload keeps only the 20 allowlisted keys', () => {
  const dirty = {
    theme: 'dark',
    language: 'ar',
    soundEffects: true,
    notifications: false,
    readReceipts: true,
    lastSeen: true,
    enterIsSend: true,
    fontSize: 'medium',
    chatWallpaper: 'aurora',
    compactMode: false,
    bubbleStyle: 'modern',
    accentColor: 'emerald',
    sendTypingIndicator: true,
    showTimestamps: true,
    showEncryptionBadge: true,
    autoScrollOnMessage: true,
    linkPreviews: true,
    blurMedia: false,
    voiceAutoPlay: false,
    highContrastText: true,
    unexpectedExtraField: 'evil',
  } as unknown as UserPreferences;

  const clean = sanitizePreferencesPayload(dirty);
  assert.deepEqual(Object.keys(clean).sort(), [...ALLOWED_PREFERENCE_KEYS].sort());
  assert.equal((clean as any).unexpectedExtraField, undefined);
});

test('resolveMemberPresence marks fresh online/busy/away members active and expires stale heartbeats to offline', () => {
  const now = Date.UTC(2026, 10, 14, 12, 0, 0);
  const freshIso = new Date(now - 30_000).toISOString();
  const staleIso = new Date(now - PRESENCE_STALE_MS - 5_000).toISOString();

  const onlineMember = resolveMemberPresence({ status: 'online', lastActiveAt: freshIso }, now);
  assert.equal(onlineMember.status, 'online');
  assert.equal(onlineMember.isOnline, true);
  assert.equal(onlineMember.label, 'متصل الآن');

  const busyMember = resolveMemberPresence({ status: 'busy', lastActiveAt: freshIso }, now);
  assert.equal(busyMember.status, 'busy');
  assert.equal(busyMember.isOnline, true);

  const staleOnline = resolveMemberPresence({ status: 'online', lastActiveAt: staleIso }, now);
  assert.equal(staleOnline.status, 'offline');
  assert.equal(staleOnline.isOnline, false);
  assert.equal(staleOnline.label, 'أوفلاين');
});

test('summarizeRoomPresence computes peer online counts accurately', () => {
  const now = Date.UTC(2026, 10, 14, 12, 0, 0);
  const freshIso = new Date(now - 10_000).toISOString();
  const baseMember = (userId: string, status: ChatMember['status']): ChatMember => ({
    userId,
    chatId: 'chat_1',
    name: `User ${userId}`,
    username: `u_${userId}`,
    avatar: '',
    bio: '',
    status,
    role: userId === 'me' ? 'owner' : 'member',
    joinedAt: freshIso,
    lastActiveAt: freshIso,
  });

  const twoPeersOnline = summarizeRoomPresence(
    [baseMember('me', 'online'), baseMember('p1', 'online'), baseMember('p2', 'busy')],
    'me',
    now
  );
  assert.equal(twoPeersOnline.onlinePeersCount, 2);
  assert.equal(twoPeersOnline.isOnline, true);
  assert.equal(twoPeersOnline.statusLabel, '2 متصل');

  const peerOffline = summarizeRoomPresence(
    [baseMember('me', 'online'), baseMember('p1', 'offline')],
    'me',
    now
  );
  assert.equal(peerOffline.onlinePeersCount, 0);
  assert.equal(peerOffline.isOnline, false);
  assert.equal(peerOffline.statusLabel, 'أوفلاين');
});

test('findNextAudioMessageId finds the next playable audio message in sequence', () => {
  const list = [
    { id: 'm1', type: 'text', mediaUrl: null },
    { id: 'm2', type: 'audio', mediaUrl: 'data:audio/webm;base64,AAA' },
    { id: 'm3', type: 'image', mediaUrl: 'data:image/jpeg;base64,BBB' },
    { id: 'm4', type: 'audio', mediaUrl: null },
    { id: 'm5', type: 'audio', mediaUrl: 'data:audio/webm;base64,CCC' },
  ];
  assert.equal(findNextAudioMessageId(list, 'm2'), 'm5');
  assert.equal(findNextAudioMessageId(list, 'm5'), null);
  assert.equal(findNextAudioMessageId(list, 'missing'), null);
});

