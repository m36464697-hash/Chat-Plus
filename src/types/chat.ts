export type UserStatus = 'online' | 'busy' | 'away' | 'offline';

export type BubbleStyle = 'modern' | 'classic' | 'minimal';

export type AccentColor = 'indigo' | 'emerald' | 'sky' | 'violet' | 'rose' | 'amber';

export type ChatWallpaperId =
  | 'default'
  | 'grid'
  | 'aurora'
  | 'emerald'
  | 'midnight-cosmos'
  | 'sunset-amber'
  | 'cyber-mesh'
  | 'velvet-plum'
  | 'arctic-waves'
  | 'carbon-weave'
  | 'royal-gold'
  | 'monochrome-waves';

export interface UserPreferences {
  theme: 'dark' | 'light' | 'midnight';
  language: 'ar' | 'en';
  soundEffects: boolean;
  notifications: boolean;
  readReceipts: boolean;
  lastSeen: boolean;
  enterIsSend: boolean;
  fontSize: 'small' | 'medium' | 'large';
  chatWallpaper: ChatWallpaperId;
  compactMode: boolean;
  bubbleStyle: BubbleStyle;
  accentColor: AccentColor;
  sendTypingIndicator: boolean;
  showTimestamps: boolean;
  showEncryptionBadge: boolean;
  autoScrollOnMessage: boolean;
  linkPreviews: boolean;
  blurMedia: boolean;
  voiceAutoPlay: boolean;
  highContrastText: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  status: UserStatus;
  statusMessage?: string;
  email: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  preferences: UserPreferences;
}

export interface ChatMember {
  userId: string;
  chatId: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  status: UserStatus;
  statusMessage?: string;
  role: 'owner' | 'member';
  joinedAt: string;
  lastActiveAt: string;
}

export interface ChatRoom {
  id: string;
  code: string;
  title: string;
  description?: string;
  isGroup: boolean;
  avatar?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  membersCount: number;
  isEncrypted: boolean;
  encryptionSalt: string;
  lastMessage?: ChatMessagePreview | null;
  pinnedMessageId?: string | null;
}

export type MessageType = 'text' | 'image' | 'file' | 'audio' | 'system';

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type: MessageType;
  content: string;
  isEncrypted: boolean;
  iv?: string | null;
  mediaUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  audioDuration?: number | null;
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
    type: MessageType;
  } | null;
  reactions: Record<string, string[]>;
  isPinned?: boolean;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
  updatedAt?: string;
}

export interface ChatMessagePreview {
  id: string;
  senderName: string;
  content: string;
  type: MessageType;
  isEncrypted?: boolean;
  iv?: string;
  createdAt: string;
}
