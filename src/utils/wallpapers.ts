import {
  AccentColor,
  ChatMember,
  ChatWallpaperId,
  UserPreferences,
  UserStatus,
} from '../types/chat';

export interface WallpaperOption {
  id: ChatWallpaperId;
  label: string;
  category: 'minimal' | 'gradient' | 'pattern';
  canvasClass: string;
  swatchClass: string;
}

export const CHAT_WALLPAPERS: WallpaperOption[] = [
  {
    id: 'default',
    label: 'هادئة نقية',
    category: 'minimal',
    canvasClass: '',
    swatchClass: 'bg-slate-100 dark:bg-[#0D111A]',
  },
  {
    id: 'grid',
    label: 'نقاط هندسية',
    category: 'pattern',
    canvasClass: 'bg-chat-grid',
    swatchClass: 'bg-slate-100 dark:bg-[#0D111A] bg-chat-grid',
  },
  {
    id: 'aurora',
    label: 'توهج الشفق',
    category: 'gradient',
    canvasClass:
      'bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.16),_transparent_58%),radial-gradient(ellipse_at_bottom_left,_rgba(56,189,248,0.12),_transparent_55%)]',
    swatchClass:
      'bg-slate-100 dark:bg-[#0D111A] bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.38),_transparent_62%),radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.28),_transparent_60%)]',
  },
  {
    id: 'emerald',
    label: 'طيف الزمرد',
    category: 'gradient',
    canvasClass:
      'bg-[radial-gradient(ellipse_at_top_left,_rgba(16,185,129,0.14),_transparent_60%),radial-gradient(ellipse_at_bottom_right,_rgba(20,184,166,0.1),_transparent_55%)]',
    swatchClass:
      'bg-slate-100 dark:bg-[#0D111A] bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.35),_transparent_62%),radial-gradient(circle_at_bottom_right,_rgba(20,184,166,0.26),_transparent_60%)]',
  },
  {
    id: 'midnight-cosmos',
    label: 'سديم الكون',
    category: 'gradient',
    canvasClass:
      'bg-[radial-gradient(circle_at_20%_25%,_rgba(124,58,237,0.15),_transparent_48%),radial-gradient(circle_at_80%_75%,_rgba(59,130,246,0.14),_transparent_50%)]',
    swatchClass:
      'bg-slate-900 bg-[radial-gradient(circle_at_25%_25%,_rgba(124,58,237,0.45),_transparent_55%),radial-gradient(circle_at_80%_75%,_rgba(59,130,246,0.42),_transparent_55%)]',
  },
  {
    id: 'sunset-amber',
    label: 'غسق الكهرمان',
    category: 'gradient',
    canvasClass:
      'bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.13),_transparent_55%),radial-gradient(ellipse_at_bottom_left,_rgba(244,63,94,0.10),_transparent_55%)]',
    swatchClass:
      'bg-slate-100 dark:bg-[#0F1016] bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.36),_transparent_60%),radial-gradient(circle_at_bottom_left,_rgba(244,63,94,0.28),_transparent_60%)]',
  },
  {
    id: 'cyber-mesh',
    label: 'شبكة سيبرانية',
    category: 'pattern',
    canvasClass: 'bg-cyber-mesh',
    swatchClass: 'bg-slate-100 dark:bg-[#0B0F19] bg-cyber-mesh',
  },
  {
    id: 'velvet-plum',
    label: 'مخمل بنفسجي',
    category: 'gradient',
    canvasClass:
      'bg-[radial-gradient(ellipse_at_center,_rgba(168,85,247,0.12),_transparent_65%),radial-gradient(ellipse_at_top_left,_rgba(236,72,153,0.09),_transparent_55%)]',
    swatchClass:
      'bg-slate-100 dark:bg-[#100B18] bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.36),_transparent_65%),radial-gradient(circle_at_top_left,_rgba(236,72,153,0.28),_transparent_60%)]',
  },
  {
    id: 'arctic-waves',
    label: 'نسيم القطب',
    category: 'gradient',
    canvasClass: 'bg-arctic-waves',
    swatchClass: 'bg-slate-100 dark:bg-[#09121B] bg-arctic-waves',
  },
  {
    id: 'carbon-weave',
    label: 'نسيج كربوني',
    category: 'pattern',
    canvasClass: 'bg-carbon-weave',
    swatchClass: 'bg-slate-200 dark:bg-[#0C0E14] bg-carbon-weave',
  },
  {
    id: 'royal-gold',
    label: 'ذهب ملكي',
    category: 'gradient',
    canvasClass: 'bg-royal-gold',
    swatchClass: 'bg-stone-100 dark:bg-[#12100B] bg-royal-gold',
  },
  {
    id: 'monochrome-waves',
    label: 'خطوط مائلة',
    category: 'pattern',
    canvasClass: 'bg-monochrome-waves',
    swatchClass: 'bg-slate-100 dark:bg-[#0D1017] bg-monochrome-waves',
  },
];

export function getWallpaperOption(id?: string): WallpaperOption {
  return CHAT_WALLPAPERS.find((w) => w.id === id) || CHAT_WALLPAPERS[0];
}

export interface AccentThemeConfig {
  id: AccentColor;
  label: string;
  swatchClass: string;
  senderBubbleClass: string;
  buttonClass: string;
  textClass: string;
  softBadgeClass: string;
  ringClass: string;
}

export const ACCENT_THEMES: Record<AccentColor, AccentThemeConfig> = {
  indigo: {
    id: 'indigo',
    label: 'نيلي عصري',
    swatchClass: 'bg-indigo-600',
    senderBubbleClass: 'bg-gradient-to-br from-indigo-600 via-indigo-600 to-blue-600 text-white',
    buttonClass: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    textClass: 'text-indigo-600 dark:text-indigo-400',
    softBadgeClass: 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200/80 dark:border-indigo-400/25 text-indigo-700 dark:text-indigo-300',
    ringClass: 'ring-indigo-500/40',
  },
  emerald: {
    id: 'emerald',
    label: 'زمردي صافي',
    swatchClass: 'bg-emerald-600',
    senderBubbleClass: 'bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-600 text-white',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    softBadgeClass: 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200/80 dark:border-emerald-400/25 text-emerald-700 dark:text-emerald-300',
    ringClass: 'ring-emerald-500/40',
  },
  sky: {
    id: 'sky',
    label: 'سماوي مشرق',
    swatchClass: 'bg-sky-600',
    senderBubbleClass: 'bg-gradient-to-br from-sky-600 via-sky-600 to-cyan-600 text-white',
    buttonClass: 'bg-sky-600 hover:bg-sky-500 text-white',
    textClass: 'text-sky-600 dark:text-sky-400',
    softBadgeClass: 'bg-sky-50 dark:bg-sky-500/15 border-sky-200/80 dark:border-sky-400/25 text-sky-700 dark:text-sky-300',
    ringClass: 'ring-sky-500/40',
  },
  violet: {
    id: 'violet',
    label: 'بنفسجي ملكي',
    swatchClass: 'bg-violet-600',
    senderBubbleClass: 'bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 text-white',
    buttonClass: 'bg-violet-600 hover:bg-violet-500 text-white',
    textClass: 'text-violet-600 dark:text-violet-400',
    softBadgeClass: 'bg-violet-50 dark:bg-violet-500/15 border-violet-200/80 dark:border-violet-400/25 text-violet-700 dark:text-violet-300',
    ringClass: 'ring-violet-500/40',
  },
  rose: {
    id: 'rose',
    label: 'ياقوتي دافئ',
    swatchClass: 'bg-rose-600',
    senderBubbleClass: 'bg-gradient-to-br from-rose-600 via-rose-600 to-pink-600 text-white',
    buttonClass: 'bg-rose-600 hover:bg-rose-500 text-white',
    textClass: 'text-rose-600 dark:text-rose-400',
    softBadgeClass: 'bg-rose-50 dark:bg-rose-500/15 border-rose-200/80 dark:border-rose-400/25 text-rose-700 dark:text-rose-300',
    ringClass: 'ring-rose-500/40',
  },
  amber: {
    id: 'amber',
    label: 'كهرماني ذهبي',
    swatchClass: 'bg-amber-600',
    senderBubbleClass: 'bg-gradient-to-br from-amber-600 via-amber-600 to-orange-600 text-white',
    buttonClass: 'bg-amber-600 hover:bg-amber-500 text-white',
    textClass: 'text-amber-600 dark:text-amber-400',
    softBadgeClass: 'bg-amber-50 dark:bg-amber-500/15 border-amber-200/80 dark:border-amber-400/25 text-amber-700 dark:text-amber-300',
    ringClass: 'ring-amber-500/40',
  },
};

export function getAccentTheme(color?: AccentColor | string): AccentThemeConfig {
  if (color && color in ACCENT_THEMES) {
    return ACCENT_THEMES[color as AccentColor];
  }
  return ACCENT_THEMES.indigo;
}

export const ALLOWED_PREFERENCE_KEYS: (keyof UserPreferences)[] = [
  'theme',
  'language',
  'soundEffects',
  'notifications',
  'readReceipts',
  'lastSeen',
  'enterIsSend',
  'fontSize',
  'chatWallpaper',
  'compactMode',
  'bubbleStyle',
  'accentColor',
  'sendTypingIndicator',
  'showTimestamps',
  'showEncryptionBadge',
  'autoScrollOnMessage',
  'linkPreviews',
  'blurMedia',
  'voiceAutoPlay',
  'highContrastText',
];

export function sanitizePreferencesPayload(prefs: UserPreferences): UserPreferences {
  return {
    theme: prefs.theme,
    language: prefs.language,
    soundEffects: Boolean(prefs.soundEffects),
    notifications: Boolean(prefs.notifications),
    readReceipts: Boolean(prefs.readReceipts),
    lastSeen: Boolean(prefs.lastSeen),
    enterIsSend: Boolean(prefs.enterIsSend),
    fontSize: prefs.fontSize,
    chatWallpaper: prefs.chatWallpaper,
    compactMode: Boolean(prefs.compactMode),
    bubbleStyle: prefs.bubbleStyle,
    accentColor: prefs.accentColor,
    sendTypingIndicator: Boolean(prefs.sendTypingIndicator),
    showTimestamps: Boolean(prefs.showTimestamps),
    showEncryptionBadge: Boolean(prefs.showEncryptionBadge),
    autoScrollOnMessage: Boolean(prefs.autoScrollOnMessage),
    linkPreviews: Boolean(prefs.linkPreviews),
    blurMedia: Boolean(prefs.blurMedia),
    voiceAutoPlay: Boolean(prefs.voiceAutoPlay),
    highContrastText: Boolean(prefs.highContrastText),
  };
}

export const PRESENCE_STALE_MS = 180_000;

export interface ResolvedPresence {
  status: UserStatus;
  label: string;
  dotClass: string;
  badgeClass: string;
  isOnline: boolean;
}

export function resolveMemberPresence(
  member: Pick<ChatMember, 'status' | 'lastActiveAt'>,
  nowMs: number = Date.now()
): ResolvedPresence {
  let effective: UserStatus = member.status || 'offline';

  if (effective !== 'offline' && member.lastActiveAt) {
    const activeMs = Date.parse(member.lastActiveAt);
    if (!Number.isNaN(activeMs) && nowMs - activeMs > PRESENCE_STALE_MS) {
      effective = 'offline';
    }
  }

  switch (effective) {
    case 'online':
      return {
        status: 'online',
        label: 'متصل الآن',
        dotClass: 'bg-emerald-500',
        badgeClass: 'text-emerald-600 dark:text-emerald-400',
        isOnline: true,
      };
    case 'busy':
      return {
        status: 'busy',
        label: 'مشغول',
        dotClass: 'bg-rose-500',
        badgeClass: 'text-rose-600 dark:text-rose-400',
        isOnline: true,
      };
    case 'away':
      return {
        status: 'away',
        label: 'بالخارج',
        dotClass: 'bg-amber-500',
        badgeClass: 'text-amber-600 dark:text-amber-400',
        isOnline: true,
      };
    default:
      return {
        status: 'offline',
        label: 'أوفلاين',
        dotClass: 'bg-slate-400 dark:bg-slate-500',
        badgeClass: 'text-slate-500 dark:text-slate-400',
        isOnline: false,
      };
  }
}

export interface RoomPresenceSummary {
  onlineCount: number;
  onlinePeersCount: number;
  totalMembersCount: number;
  effectiveStatus: UserStatus;
  statusLabel: string;
  dotClass: string;
  textClass: string;
  isOnline: boolean;
}

export function summarizeRoomPresence(
  members: ChatMember[],
  currentUserId: string,
  nowMs: number = Date.now()
): RoomPresenceSummary {
  if (!members || members.length === 0) {
    return {
      onlineCount: 0,
      onlinePeersCount: 0,
      totalMembersCount: 0,
      effectiveStatus: 'offline',
      statusLabel: 'أوفلاين',
      dotClass: 'bg-slate-400 dark:bg-slate-500',
      textClass: 'text-slate-500 dark:text-slate-400',
      isOnline: false,
    };
  }

  const resolvedAll = members.map((m) => ({
    member: m,
    presence: resolveMemberPresence(m, nowMs),
  }));
  const peers = resolvedAll.filter((r) => r.member.userId !== currentUserId);
  const onlinePeers = peers.filter((r) => r.presence.isOnline);
  const onlineAll = resolvedAll.filter((r) => r.presence.isOnline);

  // When there are other users in the room, evaluate peers; otherwise reflect current user's status
  if (peers.length > 0) {
    if (onlinePeers.length === 0) {
      return {
        onlineCount: onlineAll.length,
        onlinePeersCount: 0,
        totalMembersCount: members.length,
        effectiveStatus: 'offline',
        statusLabel: 'أوفلاين',
        dotClass: 'bg-slate-400 dark:bg-slate-500',
        textClass: 'text-slate-500 dark:text-slate-400',
        isOnline: false,
      };
    }

    if (peers.length === 1) {
      const p = onlinePeers[0].presence;
      return {
        onlineCount: onlineAll.length,
        onlinePeersCount: 1,
        totalMembersCount: members.length,
        effectiveStatus: p.status,
        statusLabel: p.label,
        dotClass: p.dotClass,
        textClass: p.badgeClass,
        isOnline: true,
      };
    }

    return {
      onlineCount: onlineAll.length,
      onlinePeersCount: onlinePeers.length,
      totalMembersCount: members.length,
      effectiveStatus: 'online',
      statusLabel: `${onlinePeers.length} متصل`,
      dotClass: 'bg-emerald-500',
      textClass: 'text-emerald-600 dark:text-emerald-400',
      isOnline: true,
    };
  }

  // Solo room (only current user joined so far)
  const selfResolved = resolvedAll[0].presence;
  return {
    onlineCount: selfResolved.isOnline ? 1 : 0,
    onlinePeersCount: 0,
    totalMembersCount: members.length,
    effectiveStatus: selfResolved.status,
    statusLabel: selfResolved.label,
    dotClass: selfResolved.dotClass,
    textClass: selfResolved.badgeClass,
    isOnline: selfResolved.isOnline,
  };
}

export function findNextAudioMessageId(
  messages: { id: string; type: string; mediaUrl?: string | null }[],
  currentMessageId: string
): string | null {
  const idx = messages.findIndex((m) => m.id === currentMessageId);
  if (idx === -1) return null;
  for (let i = idx + 1; i < messages.length; i++) {
    if (messages[i].type === 'audio' && messages[i].mediaUrl) {
      return messages[i].id;
    }
  }
  return null;
}

