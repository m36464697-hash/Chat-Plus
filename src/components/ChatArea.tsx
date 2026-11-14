import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  Mic,
  Lock,
  ShieldCheck,
  Copy,
  Check,
  Trash2,
  Reply,
  Pin,
  Download,
  FileText,
  X,
  Search,
  CheckCheck,
  ArrowRight,
  AlertCircle,
  MoreHorizontal,
  Edit3,
  Plus,
  Info,
  Users,
  Eye,
  ExternalLink,
  Crown,
} from 'lucide-react';
import { ChatMember, ChatRoom, ChatMessage, UserProfile, MessageType } from '../types/chat';
import { encryptText, decryptText } from '../utils/crypto';
import { compressImageFile, createMonogramAvatar, createRoomIconAvatar } from '../utils/avatar';
import { AudioPlayer } from './AudioPlayer';
import { VoiceRecorder } from './VoiceRecorder';
import { EmojiPickerModal } from './EmojiPickerModal';
import { MediaViewerModal } from './MediaViewerModal';
import { EncryptionBadgeModal } from './EncryptionBadgeModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { RoomInfoModal } from './RoomInfoModal';
import { UserInfoModal } from './UserInfoModal';
import { QUICK_REACTIONS } from '../utils/emojiData';
import { playSound } from '../hooks/useSound';
import { copyToClipboard } from '../utils/clipboard';
import { formatReadableError } from '../utils/errors';
import {
  findNextAudioMessageId,
  getAccentTheme,
  getWallpaperOption,
  resolveMemberPresence,
  summarizeRoomPresence,
} from '../utils/wallpapers';

interface ChatAreaProps {
  chat: ChatRoom;
  messages: ChatMessage[];
  roomMembers: ChatMember[];
  currentUser: UserProfile;
  onSendMessage: (msg: {
    type: MessageType;
    content: string;
    isEncrypted: boolean;
    iv?: string;
    mediaUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    audioDuration?: number;
    replyTo?: {
      id: string;
      senderName: string;
      content: string;
      type: MessageType;
    };
  }) => Promise<void>;
  onEditMessage: (messageId: string, updates: { content: string; iv?: string | null }) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onToggleReaction: (message: ChatMessage, emoji: string) => Promise<void>;
  onTogglePinMessage: (message: ChatMessage) => Promise<void>;
  onUpdateRoom: (updates: { title: string; description: string; avatar?: string }) => Promise<void>;
  onDeleteChat: (chat: ChatRoom) => Promise<void>;
  typingUsers: string[];
  onTyping: (isTyping: boolean) => void;
  onBackToSidebar?: () => void;
  onOpenProfile?: () => void;
}

function extractFirstSafeUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"']+/i);
  if (!match) return null;
  try {
    const u = new URL(match[0]);
    if (u.protocol === 'https:' || u.protocol === 'http:') return u.toString();
  } catch {
    return null;
  }
  return null;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  chat,
  messages,
  roomMembers,
  currentUser,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onTogglePinMessage,
  onUpdateRoom,
  onDeleteChat,
  typingUsers,
  onTyping,
  onBackToSidebar,
  onOpenProfile,
}) => {
  const [inputText, setInputText] = useState('');
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactingMessage, setReactingMessage] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [editText, setEditText] = useState('');
  const [activeMediaPreview, setActiveMediaPreview] = useState<{
    url: string;
    fileName: string;
    sender: string;
    time: string;
  } | null>(null);
  const [showEncryptionModal, setShowEncryptionModal] = useState(false);
  const [roomModalInitialTab, setRoomModalInitialTab] = useState<'overview' | 'members' | 'media' | 'files'>('overview');
  const [showRoomInfoModal, setShowRoomInfoModal] = useState(false);
  const [selectedMemberInfo, setSelectedMemberInfo] = useState<ChatMember | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [deleteChatError, setDeleteChatError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [activeActionMsgId, setActiveActionMsgId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [searchInChat, setSearchInChat] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});
  const [revealedBlurredIds, setRevealedBlurredIds] = useState<Record<string, boolean>>({});
  const [composerError, setComposerError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [autoPlayAudioTarget, setAutoPlayAudioTarget] = useState<{ id: string; seq: number } | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const { preferences } = currentUser;
  const isMidnight = preferences.theme === 'midnight';
  const locale = preferences.language === 'en' ? 'en-US' : 'ar-SA';
  const accent = getAccentTheme(preferences.accentColor);
  const wallpaperOption = getWallpaperOption(preferences.chatWallpaper);
  const presenceSummary = summarizeRoomPresence(roomMembers, currentUser.id, nowMs);

  const textSizeClass =
    preferences.fontSize === 'small'
      ? 'text-xs'
      : preferences.fontSize === 'large'
      ? 'text-sm sm:text-base'
      : 'text-[13px] sm:text-sm';

  const getBubbleShapeClass = (isMe: boolean) => {
    if (preferences.bubbleStyle === 'classic') {
      return isMe ? 'rounded-2xl rounded-bl-sm' : 'rounded-2xl rounded-br-sm';
    }
    if (preferences.bubbleStyle === 'minimal') {
      return 'rounded-2xl';
    }
    return isMe ? 'rounded-[22px] rounded-bl-[6px]' : 'rounded-[22px] rounded-br-[6px]';
  };

  const getBubbleSurfaceClass = (isMe: boolean) => {
    if (isMe) {
      if (preferences.bubbleStyle === 'minimal') {
        return `${accent.buttonClass} shadow-none`;
      }
      return `${accent.senderBubbleClass} shadow-xs`;
    }
    if (preferences.bubbleStyle === 'minimal') {
      return isMidnight
        ? 'bg-[#12141B]/90 text-slate-100'
        : 'bg-slate-200/75 dark:bg-white/[0.06] text-slate-900 dark:text-slate-100';
    }
    if (isMidnight) {
      return 'bg-[#12141B] text-slate-100 border border-white/[0.08] shadow-xs';
    }
    return 'bg-white dark:bg-[#141A26] text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-white/[0.07] shadow-xs';
  };

  const signatureMapKey = messages.map((m) => `${m.id}:${m.content.slice(0, 16)}:${m.iv || ''}`).join('|');

  useEffect(() => {
    let isMounted = true;
    const decryptAll = async () => {
      const updates: Record<string, string> = {};
      for (const msg of messages) {
        const cacheKey = `${msg.id}:${msg.content}`;
        if (decryptedCache[cacheKey] !== undefined) continue;
        if (msg.isEncrypted && msg.iv) {
          try {
            updates[cacheKey] = await decryptText(msg.content, msg.iv, chat.code, chat.encryptionSalt);
          } catch {
            updates[cacheKey] = msg.content;
          }
        } else {
          updates[cacheKey] = msg.content;
        }
      }

      if (Object.keys(updates).length > 0 && isMounted) {
        setDecryptedCache((prev) => ({ ...prev, ...updates }));
      }
    };

    decryptAll();
    return () => {
      isMounted = false;
    };
  }, [signatureMapKey, chat.code, chat.encryptionSalt]);

  const getClearContent = (msg: ChatMessage) => {
    return decryptedCache[`${msg.id}:${msg.content}`] ?? msg.content;
  };

  useEffect(() => {
    if (preferences.autoScrollOnMessage !== false) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, chat.id, preferences.autoScrollOnMessage]);

  useEffect(() => {
    setReplyingTo(null);
    setEditingMessage(null);
    setActiveActionMsgId(null);
    setComposerError(null);
    setSelectedMemberInfo(null);
    setAutoPlayAudioTarget(null);
  }, [chat.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (editingMessage) {
        setEditingMessage(null);
        setEditText('');
      } else if (replyingTo) {
        setReplyingTo(null);
      } else if (activeActionMsgId) {
        setActiveActionMsgId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingMessage, replyingTo, activeActionMsgId]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    const nextHeight = Math.min(textareaRef.current.scrollHeight, 128);
    textareaRef.current.style.height = `${Math.max(44, nextHeight)}px`;
  }, [inputText]);

  const handleOpenMemberBySender = (senderId: string, fallbackName: string, fallbackAvatar?: string) => {
    const found = roomMembers.find((m) => m.userId === senderId);
    if (found) {
      setSelectedMemberInfo(found);
      return;
    }
    setSelectedMemberInfo({
      userId: senderId,
      chatId: chat.id,
      name: fallbackName,
      username: 'member',
      avatar: fallbackAvatar || createMonogramAvatar(fallbackName),
      bio: '',
      status: 'offline',
      statusMessage: '',
      role: chat.createdBy === senderId ? 'owner' : 'member',
      joinedAt: chat.createdAt,
      lastActiveAt: chat.updatedAt,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);

    if (preferences.sendTypingIndicator === false) return;

    const now = Date.now();
    if (now - lastTypingSentRef.current > 3500) {
      lastTypingSentRef.current = now;
      onTyping(true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
      lastTypingSentRef.current = 0;
    }, 2500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && preferences.enterIsSend) {
      e.preventDefault();
      handleSendTextMessage();
    }
  };

  const handleSendTextMessage = async () => {
    if (!inputText.trim() || isSending) return;

    const rawText = inputText.trim();
    setComposerError(null);
    setIsSending(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onTyping(false);
    lastTypingSentRef.current = 0;

    try {
      let contentToSend = rawText;
      let ivBase64: string | undefined;
      let isEnc = true;

      try {
        const encrypted = await encryptText(rawText, chat.code, chat.encryptionSalt);
        contentToSend = encrypted.ciphertext;
        ivBase64 = encrypted.iv;
      } catch (err) {
        console.warn('Encryption failed, sending cleartext:', err);
        isEnc = false;
      }

      await onSendMessage({
        type: 'text',
        content: contentToSend,
        isEncrypted: isEnc,
        iv: ivBase64,
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              senderName: replyingTo.senderName,
              content: getClearContent(replyingTo),
              type: replyingTo.type,
            }
          : undefined,
      });

      if (preferences.soundEffects) playSound('send');
      setInputText('');
      setReplyingTo(null);
    } catch (err) {
      console.error('Failed to send text message:', err);
      setComposerError(formatReadableError(err, 'تعذر إرسال الرسالة، تحقق من الاتصال وأعد المحاولة'));
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveEditMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMessage || !editText.trim()) return;

    const clean = editText.trim();
    try {
      setComposerError(null);
      let nextContent = clean;
      let nextIv: string | null = null;
      if (editingMessage.isEncrypted) {
        const enc = await encryptText(clean, chat.code, chat.encryptionSalt);
        nextContent = enc.ciphertext;
        nextIv = enc.iv;
      }
      await onEditMessage(editingMessage.id, { content: nextContent, iv: nextIv });
      setEditingMessage(null);
      setEditText('');
    } catch (err) {
      setComposerError(formatReadableError(err, 'تعذر تعديل الرسالة'));
    }
  };

  const processAndUploadFile = async (file: File) => {
    setComposerError(null);
    const isImage = file.type.startsWith('image/');

    try {
      if (isImage) {
        const compressedDataUrl = await compressImageFile(file, 1080, 0.8);
        if (compressedDataUrl.length > 830000) {
          setComposerError('حجم الصورة كبير جداً حتى بعد الضغط، يرجى اختيار صورة أصغر');
          return;
        }
        if (preferences.soundEffects) playSound('send');
        await onSendMessage({
          type: 'image',
          content: file.name || 'image.jpg',
          isEncrypted: false,
          mediaUrl: compressedDataUrl,
          fileName: file.name || `image_${Date.now()}.jpg`,
          fileSize: file.size,
          fileType: 'image/jpeg',
        });
      } else {
        if (file.size > 580 * 1024) {
          setComposerError('الحد الأقصى للملفات والمستندات هو 580 كيلوبايت لضمان سرعة المزامنة');
          return;
        }
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error('تعذر قراءة الملف'));
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        if (preferences.soundEffects) playSound('send');
        await onSendMessage({
          type: 'file',
          content: file.name,
          isEncrypted: false,
          mediaUrl: dataUrl,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'application/octet-stream',
        });
      }
    } catch (err) {
      console.error('Failed to send file:', err);
      setComposerError('حدث خطأ أثناء رفع الملف أو إرساله');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await processAndUploadFile(file);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          await processAndUploadFile(file);
          break;
        }
      }
    }
  };

  const handleSendVoice = async (audioDataUrl: string, durationSeconds: number) => {
    setIsVoiceRecording(false);
    setComposerError(null);
    if (audioDataUrl.length > 820000) {
      setComposerError('حجم التسجيل الصوتي كبير جداً للحفظ، يرجى تسجيل مقطع أقصر');
      return;
    }
    try {
      if (preferences.soundEffects) playSound('send');
      await onSendMessage({
        type: 'audio',
        content: 'تسجيل صوتي',
        isEncrypted: false,
        mediaUrl: audioDataUrl,
        audioDuration: durationSeconds,
      });
    } catch (err) {
      console.error('Failed to send voice note:', err);
      setComposerError('تعذر إرسال التسجيل الصوتي');
    }
  };

  const handleCopyCode = () => {
    copyToClipboard(chat.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyMessageText = (msg: ChatMessage) => {
    copyToClipboard(getClearContent(msg));
    setCopiedMsgId(msg.id);
    setActiveActionMsgId(null);
    setTimeout(() => setCopiedMsgId(null), 1800);
  };

  const jumpToMessage = (messageId: string) => {
    const el = messageRefs.current[messageId];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMsgId(messageId);
    setTimeout(() => setHighlightedMsgId(null), 1600);
  };

  const handleConfirmDeleteChat = async () => {
    try {
      setIsDeletingChat(true);
      setDeleteChatError(null);
      await onDeleteChat(chat);
      setShowDeleteModal(false);
    } catch (err) {
      setDeleteChatError(formatReadableError(err, 'تعذر حذف أو مغادرة المحادثة. تحقق من الاتصال وأعد المحاولة.'));
    } finally {
      setIsDeletingChat(false);
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (!searchInChat.trim()) return true;
    const text = getClearContent(m).toLowerCase();
    const sender = m.senderName.toLowerCase();
    const q = searchInChat.toLowerCase().trim();
    return text.includes(q) || sender.includes(q) || (m.fileName && m.fileName.toLowerCase().includes(q));
  });

  const pinnedMessage =
    messages.find((m) => chat.pinnedMessageId && m.id === chat.pinnedMessageId) ||
    messages.find((m) => m.isPinned);

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDateDivider = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'اليوم';
    if (d.toDateString() === yesterday.toDateString()) return 'أمس';
    return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const firstEncryptedSample = messages.find((m) => m.isEncrypted && m.iv);
  const visibleMembers = roomMembers.slice(0, 8);
  const extraMembersCount = Math.max(0, roomMembers.length - visibleMembers.length);

  return (
    <div
      className={`flex-1 h-full flex flex-col relative min-w-0 ${
        isMidnight
          ? 'bg-black text-slate-100'
          : 'bg-[#F5F6FA] dark:bg-[#07090E] text-slate-900 dark:text-slate-100'
      }`}
      dir="rtl"
    >
      {/* 1. Frosted Studio Header */}
      <div
        className={`h-16 px-3 sm:px-6 border-b border-slate-200/80 dark:border-white/[0.07] flex items-center justify-between gap-2 shrink-0 z-10 backdrop-blur-2xl ${
          isMidnight ? 'bg-black/90' : 'bg-white/85 dark:bg-[#0B0E16]/85'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onBackToSidebar && (
            <button
              type="button"
              onClick={onBackToSidebar}
              className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[14px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer shrink-0"
              aria-label="الرجوع للقائمة"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setRoomModalInitialTab('overview');
              setShowRoomInfoModal(true);
            }}
            className="flex items-center gap-2.5 sm:gap-3 min-w-0 text-right group cursor-pointer rounded-[14px] py-1 px-1.5 -mx-1.5 hover:bg-slate-100/80 dark:hover:bg-white/[0.04] transition-colors"
            title="معلومات الغرفة والأعضاء والوسائط"
          >
            <div className="relative shrink-0">
              <img
                src={chat.avatar || createRoomIconAvatar(chat.code, chat.title)}
                alt={chat.title}
                className="w-10 h-10 rounded-[13px] object-cover bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-white/[0.08]"
              />
              <span
                className={`absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#0B0E16] ${presenceSummary.dotClass}`}
                title={presenceSummary.statusLabel}
              />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors tracking-tight">
                  {chat.title}
                </h2>
                {preferences.showEncryptionBadge && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>E2EE</span>
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate tabular-nums flex items-center gap-1.5">
                <span className={`font-semibold ${presenceSummary.textClass}`}>
                  {presenceSummary.statusLabel}
                </span>
                <span aria-hidden="true">·</span>
                <span>{roomMembers.length || chat.membersCount || 1} عضو</span>
              </span>
            </div>
          </button>
        </div>

        {/* Left Header Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 bg-[#F2F4F8] dark:bg-white/[0.04] px-3 py-1.5 rounded-[13px] border border-slate-200/70 dark:border-white/[0.07]">
            <span className={`font-mono text-xs font-semibold ${accent.textClass} tabular-nums`}>
              {chat.code}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="نسخ رمز المشاركة"
              aria-label="نسخ رمز المشاركة"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setRoomModalInitialTab('members');
              setShowRoomInfoModal(true);
            }}
            className="min-h-[42px] px-2.5 flex items-center justify-center gap-1 rounded-[13px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="أعضاء الغرفة"
            aria-label="أعضاء الغرفة"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-semibold tabular-nums">
              {roomMembers.length || chat.membersCount || 1}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRoomModalInitialTab('overview');
              setShowRoomInfoModal(true);
            }}
            className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-[13px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="تفاصيل الغرفة والوسائط"
            aria-label="تفاصيل الغرفة"
          >
            <Info className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className={`min-h-[42px] min-w-[42px] flex items-center justify-center rounded-[13px] transition-colors cursor-pointer ${
              showSearch
                ? accent.buttonClass
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]'
            }`}
            title="بحث في الرسائل"
            aria-label="بحث في الرسائل"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setDeleteChatError(null);
              setShowDeleteModal(true);
            }}
            className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-[13px] text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
            title={chat.createdBy === currentUser.id ? 'حذف المحادثة نهائياً' : 'مغادرة المحادثة'}
            aria-label="حذف المحادثة"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="relative min-h-[42px] min-w-[42px] p-1 flex items-center justify-center rounded-[13px] border border-slate-200/80 dark:border-white/[0.08] hover:border-indigo-500/70 transition-all shrink-0 cursor-pointer"
              title="الملف الشخصي والإعدادات"
              aria-label="الملف الشخصي"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-[9px] object-cover bg-slate-100 dark:bg-slate-800"
              />
            </button>
          )}
        </div>
      </div>

      {/* Live Interactive Room Members Presence Bar */}
      {roomMembers.length > 0 && (
        <div
          className={`px-3 sm:px-6 py-2 border-b border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-3 shrink-0 overflow-x-auto ${
            isMidnight ? 'bg-black/75' : 'bg-white/60 dark:bg-[#0B0E16]/60'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>الأعضاء المتواجدون:</span>
            </span>

            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {visibleMembers.map((member) => {
                const presence = resolveMemberPresence(member, nowMs);
                const firstName = member.name.split(' ')[0];
                return (
                  <button
                    key={member.userId}
                    type="button"
                    onClick={() => setSelectedMemberInfo(member)}
                    className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full bg-white dark:bg-[#131824] border border-slate-200/80 dark:border-white/[0.08] hover:border-indigo-500/70 transition-all cursor-pointer shrink-0 group shadow-2xs"
                    title={`${member.name} — ${presence.label} (اضغط لعرض المعلومات)`}
                  >
                    <span className="relative shrink-0">
                      <img
                        src={member.avatar || createMonogramAvatar(member.name)}
                        alt={member.name}
                        referrerPolicy="no-referrer"
                        className="w-5 h-5 rounded-full object-cover"
                      />
                      <span
                        className={`absolute -bottom-0.5 -left-0.5 w-2 h-2 rounded-full border border-white dark:border-[#131824] ${presence.dotClass}`}
                      />
                    </span>
                    <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 max-w-[95px] truncate">
                      {firstName}
                    </span>
                    {member.role === 'owner' && (
                      <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                    )}
                  </button>
                );
              })}
              {extraMembersCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setRoomModalInitialTab('members');
                    setShowRoomInfoModal(true);
                  }}
                  className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/[0.06] text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.1] cursor-pointer shrink-0 tabular-nums"
                >
                  +{extraMembersCount} آخرون
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setRoomModalInitialTab('members');
              setShowRoomInfoModal(true);
            }}
            className={`hidden md:inline-flex items-center gap-1 text-[11px] font-semibold ${accent.textClass} hover:underline whitespace-nowrap shrink-0 cursor-pointer`}
          >
            <span>عرض الكل</span>
          </button>
        </div>
      )}

      {/* Mobile Room Code Strip */}
      <div className="sm:hidden px-4 py-1.5 bg-white/80 dark:bg-[#0B0E16]/80 border-b border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between text-[11px]">
        <button
          type="button"
          onClick={() => setShowEncryptionModal(true)}
          className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>تشفير E2EE</span>
        </button>
        <button
          type="button"
          onClick={handleCopyCode}
          className={`flex items-center gap-1.5 font-mono font-bold ${accent.textClass} cursor-pointer tabular-nums`}
        >
          <span>{chat.code}</span>
          {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="px-4 py-2 bg-white/95 dark:bg-[#0E121B]/95 border-b border-slate-200/80 dark:border-white/[0.07] flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchInChat}
            onChange={(e) => setSearchInChat(e.target.value)}
            placeholder="ابحث داخل هذه المحادثة..."
            className="flex-1 min-h-[38px] bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
            autoFocus
          />
          {searchInChat && (
            <button
              type="button"
              onClick={() => setSearchInChat('')}
              className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              aria-label="مسح البحث"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Pinned Message Banner */}
      {pinnedMessage && (
        <div className="px-4 py-2 bg-indigo-50/90 dark:bg-indigo-950/35 border-b border-indigo-200/70 dark:border-indigo-500/20 flex items-center justify-between text-xs text-indigo-950 dark:text-indigo-200">
          <button
            type="button"
            onClick={() => jumpToMessage(pinnedMessage.id)}
            className="flex items-center gap-2 min-w-0 flex-1 text-right hover:opacity-80 cursor-pointer"
          >
            <Pin className={`w-3.5 h-3.5 ${accent.textClass} rotate-45 shrink-0`} />
            <span className={`font-semibold ${accent.textClass} shrink-0`}>رسالة مثبتة:</span>
            <span className="truncate">{getClearContent(pinnedMessage)}</span>
          </button>
          <button
            type="button"
            onClick={() => onTogglePinMessage(pinnedMessage)}
            className={`text-[11px] ${accent.textClass} hover:underline mr-3 shrink-0 cursor-pointer`}
          >
            إلغاء التثبيت
          </button>
        </div>
      )}

      {/* 2. Messages Feed */}
      <div
        onClick={() => setActiveActionMsgId(null)}
        className={`flex-1 overflow-y-auto px-3 sm:px-6 py-4 ${
          preferences.compactMode ? 'space-y-1.5' : 'space-y-2.5'
        } ${wallpaperOption.canvasClass}`}
      >
        {filteredMessages.length === 0 ? (
          <div className="py-16 sm:py-24 text-center flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
            <div className="w-14 h-14 rounded-[18px] bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/70 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-tight">
              {searchInChat ? 'لا توجد رسائل مطابقة لبحثك' : 'المحادثة مشفرة ومستعدة للبدء'}
            </span>
            <span className="text-xs text-slate-500 max-w-sm leading-relaxed">
              {searchInChat
                ? 'جرّب كلمات بحث أخرى.'
                : 'أرسل رسالتك الأولى، الصق صورة، أرفق ملفاً أو سجّل مقطعاً صوتياً. يتم تشفير النصوص محلياً قبل حفظها.'}
            </span>
          </div>
        ) : (
          filteredMessages.map((msg, idx) => {
            const prevMsg = idx > 0 ? filteredMessages[idx - 1] : null;
            const showDateDivider =
              !prevMsg ||
              new Date(prevMsg.createdAt).toDateString() !== new Date(msg.createdAt).toDateString();

            const isMe = msg.senderId === currentUser.id;
            const isSystem = msg.type === 'system';
            const clearContent = getClearContent(msg);
            const showActions = activeActionMsgId === msg.id;
            const senderMember = roomMembers.find((m) => m.userId === msg.senderId);
            const senderPresence = senderMember ? resolveMemberPresence(senderMember, nowMs) : null;
            const embeddedUrl = msg.type === 'text' && preferences.linkPreviews !== false ? extractFirstSafeUrl(clearContent) : null;
            const isImageBlurred = Boolean(preferences.blurMedia) && !revealedBlurredIds[msg.id];

            const isGrouped =
              !isSystem &&
              !showDateDivider &&
              prevMsg &&
              prevMsg.type !== 'system' &&
              prevMsg.senderId === msg.senderId &&
              new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < 180000;

            const isEdited = Boolean(msg.updatedAt && msg.updatedAt !== msg.createdAt && msg.type === 'text');

            return (
              <React.Fragment key={msg.id}>
                {showDateDivider && (
                  <div className="flex items-center justify-center my-4">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-white/85 dark:bg-[#0E121B]/90 border border-slate-200/80 dark:border-white/[0.07] px-3.5 py-1 rounded-full">
                      {formatDateDivider(msg.createdAt)}
                    </span>
                  </div>
                )}

                {isSystem ? (
                  <div className="flex justify-center my-2">
                    <div className="px-4 py-1.5 rounded-2xl bg-white/90 dark:bg-[#0E121B]/90 border border-slate-200/80 dark:border-white/[0.07] text-[11px] text-slate-600 dark:text-slate-400 text-center max-w-md">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div
                    ref={(el) => {
                      messageRefs.current[msg.id] = el;
                    }}
                    onMouseEnter={() => setActiveActionMsgId(msg.id)}
                    onMouseLeave={() => setActiveActionMsgId(null)}
                    className={`flex gap-2 sm:gap-2.5 group relative transition-colors rounded-2xl ${
                      isMe ? 'flex-row-reverse' : 'flex-row'
                    } ${isGrouped ? 'mt-0.5' : 'mt-3'} ${
                      highlightedMsgId === msg.id ? `bg-indigo-500/15 ring-2 ${accent.ringClass} p-1` : ''
                    }`}
                  >
                    {isGrouped ? (
                      <div className="w-8 shrink-0" />
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenMemberBySender(msg.senderId, msg.senderName, msg.senderAvatar);
                        }}
                        className="relative shrink-0 self-end mb-1 cursor-pointer group/avatar"
                        title={`عرض ملف ${msg.senderName}`}
                      >
                        <img
                          src={senderMember?.avatar || msg.senderAvatar || createMonogramAvatar(msg.senderName)}
                          alt={msg.senderName}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-[11px] object-cover bg-slate-200 dark:bg-slate-800 border border-slate-200/80 dark:border-white/[0.08] group-hover/avatar:border-indigo-500 transition-colors"
                        />
                        {senderPresence && (
                          <span
                            className={`absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#07090E] ${senderPresence.dotClass}`}
                          />
                        )}
                      </button>
                    )}

                    <div className={`flex flex-col max-w-[82%] sm:max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && !isGrouped && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenMemberBySender(msg.senderId, msg.senderName, msg.senderAvatar);
                          }}
                          className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold px-1.5 mb-1 cursor-pointer transition-colors"
                        >
                          <span>{senderMember?.name || msg.senderName}</span>
                          {senderPresence && (
                            <span className={`w-1.5 h-1.5 rounded-full ${senderPresence.dotClass}`} />
                          )}
                        </button>
                      )}

                      {msg.replyTo && (
                        <button
                          type="button"
                          onClick={() => jumpToMessage(msg.replyTo!.id)}
                          className={`text-right text-xs px-3 py-2 rounded-2xl mb-1 max-w-full cursor-pointer transition-opacity hover:opacity-85 border ${
                            isMe
                              ? accent.softBadgeClass
                              : 'bg-white/90 dark:bg-white/[0.05] border-slate-200/80 dark:border-white/[0.07] text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="font-semibold flex items-center gap-1 text-[10px] opacity-80 mb-0.5">
                            <Reply className="w-3 h-3" />
                            <span>{msg.replyTo.senderName}</span>
                          </span>
                          <p className="truncate text-[11px]">{msg.replyTo.content}</p>
                        </button>
                      )}

                      <div className="flex items-end gap-1.5 max-w-full">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveActionMsgId(showActions ? null : msg.id);
                          }}
                          className={`relative ${getBubbleShapeClass(isMe)} ${
                            preferences.compactMode ? 'px-3.5 py-2' : 'px-4 py-2.5'
                          } cursor-pointer sm:cursor-auto ${getBubbleSurfaceClass(isMe)} ${
                            preferences.highContrastText ? 'font-medium ring-1 ring-black/5 dark:ring-white/10' : ''
                          }`}
                        >
                          {msg.type === 'image' && msg.mediaUrl && (
                            <div className="relative mb-1.5 rounded-[14px] overflow-hidden cursor-pointer">
                              <img
                                src={msg.mediaUrl}
                                alt={msg.fileName || 'صورة'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isImageBlurred) {
                                    setRevealedBlurredIds((prev) => ({ ...prev, [msg.id]: true }));
                                    return;
                                  }
                                  setActiveMediaPreview({
                                    url: msg.mediaUrl!,
                                    fileName: msg.fileName || 'image.jpg',
                                    sender: msg.senderName,
                                    time: msg.createdAt,
                                  });
                                }}
                                className={`max-h-72 w-full object-cover rounded-[14px] transition-all duration-200 ${
                                  isImageBlurred ? 'blur-lg scale-105 brightness-75' : ''
                                }`}
                              />
                              {isImageBlurred && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRevealedBlurredIds((prev) => ({ ...prev, [msg.id]: true }));
                                  }}
                                  className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/35 text-white text-xs font-semibold cursor-pointer"
                                >
                                  <Eye className="w-5 h-5" />
                                  <span>اضغط لعرض الصورة</span>
                                </button>
                              )}
                            </div>
                          )}

                          {msg.type === 'audio' && msg.mediaUrl && (
                            <AudioPlayer
                              src={msg.mediaUrl}
                              duration={msg.audioDuration || undefined}
                              isSender={isMe}
                              accentButtonClass={accent.buttonClass}
                              autoPlaySignal={
                                autoPlayAudioTarget?.id === msg.id ? autoPlayAudioTarget.seq : 0
                              }
                              onEnded={() => {
                                if (!preferences.voiceAutoPlay) return;
                                const nextId = findNextAudioMessageId(filteredMessages, msg.id);
                                if (nextId) {
                                  setAutoPlayAudioTarget((prev) => ({
                                    id: nextId,
                                    seq: (prev?.seq || 0) + 1,
                                  }));
                                }
                              }}
                            />
                          )}

                          {msg.type === 'file' && (
                            <div
                              className={`flex items-center gap-3 p-2.5 rounded-[14px] mb-1 ${
                                isMe ? 'bg-black/15' : 'bg-[#F2F4F8] dark:bg-black/25'
                              }`}
                            >
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                  isMe
                                    ? 'bg-white/20 text-white'
                                    : `${accent.softBadgeClass}`
                                }`}
                              >
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col">
                                <span className="text-xs font-semibold truncate">{msg.fileName || 'مستند'}</span>
                                <span className="text-[10px] opacity-75 tabular-nums">
                                  {formatFileSize(msg.fileSize)}
                                </span>
                              </div>
                              {msg.mediaUrl && (
                                <a
                                  href={msg.mediaUrl}
                                  download={msg.fileName || 'download'}
                                  onClick={(e) => e.stopPropagation()}
                                  className={`min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl transition-colors ${
                                    isMe
                                      ? 'bg-white/15 hover:bg-white/25 text-white'
                                      : 'bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white'
                                  }`}
                                  title="تحميل الملف"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          )}

                          {msg.type === 'text' && (
                            <>
                              <p className={`${textSizeClass} leading-relaxed whitespace-pre-wrap break-words`}>
                                {clearContent}
                              </p>
                              {embeddedUrl && (
                                <a
                                  href={embeddedUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className={`mt-2 p-2.5 rounded-xl flex items-center justify-between gap-2 text-[11px] border transition-opacity hover:opacity-90 ${
                                    isMe
                                      ? 'bg-black/15 border-white/15 text-white'
                                      : 'bg-[#F2F4F8] dark:bg-white/[0.04] border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-200'
                                  }`}
                                >
                                  <span dir="ltr" className="font-mono truncate">
                                    {embeddedUrl}
                                  </span>
                                  <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-80" />
                                </a>
                              )}
                            </>
                          )}

                          {(preferences.showTimestamps !== false ||
                            (preferences.showEncryptionBadge !== false && msg.isEncrypted) ||
                            (isMe && preferences.readReceipts)) && (
                            <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] opacity-80 font-mono tabular-nums">
                              {isEdited && <span className="font-sans opacity-80">معدّلة ·</span>}
                              {msg.isEncrypted && preferences.showEncryptionBadge !== false && (
                                <span title="مشفرة طرف لطرف" className="inline-flex items-center">
                                  <Lock className={`w-2.5 h-2.5 ${isMe ? 'text-emerald-200' : 'text-emerald-500'}`} />
                                </span>
                              )}
                              {preferences.showTimestamps !== false && (
                                <span>
                                  {new Date(msg.createdAt).toLocaleTimeString(locale, {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              )}
                              {isMe && preferences.readReceipts && (
                                <span title="تم الإرسال" className="inline-flex items-center">
                                  <CheckCheck className="w-3.5 h-3.5 text-sky-200" />
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveActionMsgId(showActions ? null : msg.id);
                          }}
                          className="sm:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0"
                          aria-label="خيارات الرسالة"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>

                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mt-1 px-1">
                          {Object.entries(msg.reactions).map(([emoji, users]) => {
                            const hasReacted = users.includes(currentUser.id);
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleReaction(msg, emoji);
                                }}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition-all cursor-pointer ${
                                  hasReacted
                                    ? `${accent.softBadgeClass} font-semibold`
                                    : 'bg-white dark:bg-[#141A26] border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <span>{emoji}</span>
                                <span className="text-[10px] font-mono tabular-nums">{users.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Floating Action Bar */}
                    {showActions && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute z-20 flex flex-wrap sm:flex-nowrap items-center gap-0.5 max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-[#141925]/95 border border-slate-200/80 dark:border-white/[0.1] p-1 rounded-2xl shadow-xl backdrop-blur-xl ${
                          idx === 0 ? 'top-full mt-1' : '-top-10'
                        } ${isMe ? 'left-4 sm:left-10' : 'right-4 sm:right-10'}`}
                      >
                        <div className="flex items-center gap-0.5 border-l border-slate-200/80 dark:border-white/[0.08] pl-1">
                          {QUICK_REACTIONS.slice(0, 4).map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                onToggleReaction(msg, emoji);
                                setActiveActionMsgId(null);
                              }}
                              className="w-7 h-7 flex items-center justify-center text-sm rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.08] cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setReactingMessage(msg);
                              setActiveActionMsgId(null);
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.08] cursor-pointer"
                            title="المزيد من الإيموجي"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {msg.type === 'text' && (
                          <button
                            type="button"
                            onClick={() => handleCopyMessageText(msg)}
                            className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] cursor-pointer"
                            title="نسخ النص"
                          >
                            {copiedMsgId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setReplyingTo(msg);
                            setActiveActionMsgId(null);
                            textareaRef.current?.focus();
                          }}
                          className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] cursor-pointer"
                          title="رد على الرسالة"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>

                        {isMe && msg.type === 'text' && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMessage(msg);
                              setEditText(clearContent);
                              setActiveActionMsgId(null);
                            }}
                            className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-white/[0.08] cursor-pointer"
                            title="تعديل الرسالة"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            onTogglePinMessage(msg);
                            setActiveActionMsgId(null);
                          }}
                          className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] cursor-pointer"
                          title={msg.isPinned ? 'إلغاء التثبيت' : 'تثبيت الرسالة'}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>

                        {(isMe || chat.createdBy === currentUser.id) && (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteMessage(msg.id);
                              setActiveActionMsgId(null);
                            }}
                            className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                            title="حذف الرسالة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className={`px-4 sm:px-6 py-1.5 text-[11px] ${accent.textClass} font-medium flex items-center gap-2`}>
          <span>{typingUsers.join('، ')} يكتب الآن...</span>
        </div>
      )}

      {/* 4. Frosted Bottom Input Composer */}
      <div
        className={`p-2.5 sm:p-4 border-t border-slate-200/80 dark:border-white/[0.07] relative shrink-0 backdrop-blur-2xl ${
          isMidnight ? 'bg-black/95' : 'bg-white/85 dark:bg-[#0B0E16]/85'
        }`}
      >
        {composerError && (
          <div className="mb-2.5 p-2.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/30 rounded-2xl text-xs text-red-700 dark:text-red-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{composerError}</span>
            </div>
            <button
              type="button"
              onClick={() => setComposerError(null)}
              className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {editingMessage && (
          <form
            onSubmit={handleSaveEditMessage}
            className="flex items-center gap-2 p-2 mb-2.5 bg-indigo-50 dark:bg-indigo-500/12 border border-indigo-200/80 dark:border-indigo-400/25 rounded-2xl text-xs"
          >
            <Edit3 className={`w-4 h-4 ${accent.textClass} shrink-0`} />
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="flex-1 bg-white dark:bg-[#07090E] border border-indigo-200 dark:border-indigo-500/30 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              className={`px-3.5 py-1.5 rounded-xl ${accent.buttonClass} text-white font-semibold cursor-pointer`}
            >
              حفظ
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingMessage(null);
                setEditText('');
              }}
              className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        )}

        {replyingTo && (
          <div className="flex items-center justify-between p-2.5 mb-2.5 bg-[#F2F4F8] dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.07] rounded-2xl text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2 truncate">
              <Reply className={`w-3.5 h-3.5 ${accent.textClass} shrink-0`} />
              <span className={`font-semibold ${accent.textClass}`}>
                رد على {replyingTo.senderName}:
              </span>
              <span className="truncate text-slate-500 dark:text-slate-400">{getClearContent(replyingTo)}</span>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {isVoiceRecording ? (
          <VoiceRecorder
            onSendAudio={handleSendVoice}
            onCancel={() => setIsVoiceRecording(false)}
            soundEnabled={preferences.soundEffects}
          />
        ) : (
          <div className="flex items-end gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[15px] bg-[#F2F4F8] dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.07] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shrink-0 cursor-pointer"
              title="إرفاق صورة أو ملف"
              aria-label="إرفاق ملف"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.zip,.txt"
            />

            <button
              type="button"
              onClick={() => {
                setReactingMessage(null);
                setShowEmojiPicker(!showEmojiPicker);
              }}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[15px] bg-[#F2F4F8] dark:bg-white/[0.04] border transition-colors shrink-0 cursor-pointer ${
                showEmojiPicker
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-slate-200/70 dark:border-white/[0.07] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
              title="الرموز التعبيرية (Emoji)"
              aria-label="الرموز التعبيرية"
            >
              <Smile className="w-5 h-5" />
            </button>

            <div className="flex-1 min-w-0 relative">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={
                  preferences.enterIsSend
                    ? 'اكتب رسالة مشفرة أو الصق صورة...'
                    : 'اكتب رسالة مشفرة...'
                }
                rows={1}
                className="w-full min-h-[44px] bg-[#F2F4F8] dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.07] rounded-[18px] px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500/70 transition-colors resize-none max-h-32 leading-relaxed"
              />
            </div>

            {inputText.trim() ? (
              <button
                type="button"
                onClick={handleSendTextMessage}
                disabled={isSending}
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[15px] ${accent.buttonClass} active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-50 shadow-xs`}
                title="إرسال الرسالة"
                aria-label="إرسال"
              >
                <Send className="w-5 h-5 rotate-180" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsVoiceRecording(true)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[15px] bg-[#F2F4F8] dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.07] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shrink-0 cursor-pointer"
                title="تسجيل رسالة صوتية"
                aria-label="تسجيل صوتي"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {(showEmojiPicker || reactingMessage) && (
          <EmojiPickerModal
            onSelectEmoji={(emoji) => {
              if (reactingMessage) {
                onToggleReaction(reactingMessage, emoji);
                setReactingMessage(null);
              } else {
                setInputText((prev) => prev + emoji);
                setShowEmojiPicker(false);
                textareaRef.current?.focus();
              }
            }}
            onClose={() => {
              setShowEmojiPicker(false);
              setReactingMessage(null);
            }}
          />
        )}
      </div>

      {activeMediaPreview && (
        <MediaViewerModal
          mediaUrl={activeMediaPreview.url}
          fileName={activeMediaPreview.fileName}
          senderName={activeMediaPreview.sender}
          createdAt={activeMediaPreview.time}
          onClose={() => setActiveMediaPreview(null)}
        />
      )}

      {showEncryptionModal && (
        <EncryptionBadgeModal
          chat={chat}
          sampleCiphertext={
            firstEncryptedSample
              ? {
                  ciphertext: firstEncryptedSample.content,
                  iv: firstEncryptedSample.iv || '',
                  plaintext: getClearContent(firstEncryptedSample),
                }
              : undefined
          }
          onClose={() => setShowEncryptionModal(false)}
        />
      )}

      {showRoomInfoModal && (
        <RoomInfoModal
          chat={chat}
          messages={messages}
          members={roomMembers}
          currentUser={currentUser}
          initialTab={roomModalInitialTab}
          onClose={() => setShowRoomInfoModal(false)}
          onUpdateRoom={onUpdateRoom}
          onOpenEncryption={() => setShowEncryptionModal(true)}
          onRequestDeleteChat={() => setShowDeleteModal(true)}
          onPreviewImage={(media) => setActiveMediaPreview(media)}
          onSelectMember={(member) => setSelectedMemberInfo(member)}
        />
      )}

      {selectedMemberInfo && (
        <UserInfoModal
          member={selectedMemberInfo}
          isCurrentUser={selectedMemberInfo.userId === currentUser.id}
          locale={locale}
          onClose={() => setSelectedMemberInfo(null)}
          onEditOwnProfile={onOpenProfile}
        />
      )}

      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        chatTitle={chat.title}
        isOwner={chat.createdBy === currentUser.id}
        isDeleting={isDeletingChat}
        error={deleteChatError}
        onConfirm={handleConfirmDeleteChat}
        onCancel={() => {
          setShowDeleteModal(false);
          setDeleteChatError(null);
        }}
      />
    </div>
  );
};
