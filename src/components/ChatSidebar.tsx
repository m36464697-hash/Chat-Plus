import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Plus,
  KeyRound,
  Search,
  Lock,
  Users,
  Settings,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';
import { ChatMember, ChatRoom, UserProfile } from '../types/chat';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { createRoomIconAvatar } from '../utils/avatar';
import { decryptText } from '../utils/crypto';
import { copyToClipboard } from '../utils/clipboard';
import { formatReadableError } from '../utils/errors';
import { getAccentTheme, summarizeRoomPresence } from '../utils/wallpapers';

interface ChatSidebarProps {
  chats: ChatRoom[];
  chatsError?: string | null;
  selectedChatId: string | null;
  roomMembersMap: Record<string, ChatMember[]>;
  onSelectChat: (chatId: string) => void;
  onOpenCreateModal: () => void;
  onOpenJoinModal: () => void;
  onOpenProfile: () => void;
  onDeleteChat: (chat: ChatRoom) => Promise<void> | void;
  currentUser: UserProfile;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats,
  chatsError,
  selectedChatId,
  roomMembersMap,
  onSelectChat,
  onOpenCreateModal,
  onOpenJoinModal,
  onOpenProfile,
  onDeleteChat,
  currentUser,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'groups' | 'direct'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [chatToDelete, setChatToDelete] = useState<ChatRoom | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [decryptedPreviews, setDecryptedPreviews] = useState<Record<string, string>>({});
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const isMidnight = currentUser.preferences.theme === 'midnight';
  const locale = currentUser.preferences.language === 'en' ? 'en-US' : 'ar-SA';
  const accent = getAccentTheme(currentUser.preferences.accentColor);

  useEffect(() => {
    let active = true;
    const run = async () => {
      const updates: Record<string, string> = {};
      let changed = false;

      for (const chat of chats) {
        const lm = chat.lastMessage;
        if (!lm) continue;
        const cacheKey = `${chat.id}_${lm.id}`;
        if (decryptedPreviews[cacheKey]) continue;

        if (lm.type === 'text' && lm.isEncrypted && lm.iv) {
          try {
            updates[cacheKey] = await decryptText(lm.content, lm.iv, chat.code, chat.encryptionSalt);
            changed = true;
          } catch {
            updates[cacheKey] = 'رسالة مشفرة';
            changed = true;
          }
        }
      }

      if (changed && active) {
        setDecryptedPreviews((prev) => ({ ...prev, ...updates }));
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [chats]);

  const filteredChats = chats.filter((chat) => {
    const matchesSearch =
      chat.title.toLowerCase().includes(search.toLowerCase()) ||
      chat.code.toLowerCase().includes(search.toLowerCase()) ||
      (chat.description && chat.description.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;
    if (filter === 'groups') return chat.isGroup;
    if (filter === 'direct') return !chat.isGroup;
    return true;
  });

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    copyToClipboard(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDeleteClick = (e: React.MouseEvent, chat: ChatRoom) => {
    e.stopPropagation();
    setDeleteError(null);
    setChatToDelete(chat);
  };

  const handleConfirmDelete = async () => {
    if (!chatToDelete) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await onDeleteChat(chatToDelete);
      setChatToDelete(null);
    } catch (err) {
      setDeleteError(formatReadableError(err, 'تعذر حذف أو مغادرة المحادثة. تحقق من الاتصال وأعد المحاولة.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTimestamp = (isoDate?: string) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString(locale, { month: 'numeric', day: 'numeric' });
  };

  const getLastMessageLabel = (chat: ChatRoom) => {
    const lm = chat.lastMessage;
    if (!lm) return chat.description || 'لا توجد رسائل بعد';
    if (lm.type === 'audio') return `${lm.senderName}: تسجيل صوتي`;
    if (lm.type === 'image') return `${lm.senderName}: صورة مرفقة`;
    if (lm.type === 'file') return `${lm.senderName}: ملف مرفق`;
    const cacheKey = `${chat.id}_${lm.id}`;
    const text =
      lm.isEncrypted && lm.iv
        ? decryptedPreviews[cacheKey] || 'جاري فك التشفير...'
        : lm.content;
    return `${lm.senderName}: ${text}`;
  };

  return (
    <div
      className={`w-full md:w-80 lg:w-[356px] h-full flex flex-col border-l border-slate-200/80 dark:border-white/[0.07] shrink-0 select-none ${
        isMidnight ? 'bg-black text-slate-100' : 'bg-white dark:bg-[#0B0E16] text-slate-900 dark:text-slate-100'
      }`}
      dir="rtl"
    >
      {/* 1. Contemporary Frosted Studio Header with Modern Join Icon & Profile */}
      <div className="px-4 h-16 border-b border-slate-200/80 dark:border-white/[0.07] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-[12px] ${accent.buttonClass} flex items-center justify-center text-white shrink-0 shadow-xs`}>
            <MessageSquare className="w-4 h-4 fill-current" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-base text-slate-900 dark:text-white tracking-tight whitespace-nowrap leading-none">
              Chat Plus
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
              {chats.length} محادثة نشطة
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenJoinModal}
            className="min-h-[42px] px-2.5 flex items-center justify-center gap-1.5 rounded-[13px] border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/90 dark:bg-white/[0.04] text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400/50 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-all cursor-pointer"
            title="الانضمام برمز الغرفة"
            aria-label="الانضمام برمز"
          >
            <KeyRound className="w-4 h-4" />
            <span className="text-[11px] font-semibold hidden sm:inline">دخول برمز</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className={`min-h-[42px] min-w-[42px] flex items-center justify-center rounded-[13px] ${accent.buttonClass} transition-all active:scale-[0.96] cursor-pointer shadow-xs`}
            title="إنشاء محادثة جديدة"
            aria-label="إنشاء محادثة جديدة"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Profile Avatar Button in Top-Left */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="relative min-h-[42px] min-w-[42px] p-1 flex items-center justify-center rounded-[13px] border border-slate-200/80 dark:border-white/[0.08] hover:border-indigo-500/70 transition-all cursor-pointer"
            title="الملف الشخصي والإعدادات"
            aria-label="الملف الشخصي"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-[9px] object-cover bg-slate-100 dark:bg-slate-800"
            />
            <span
              className={`absolute bottom-0.5 left-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0B0E16] ${
                currentUser.status === 'online'
                  ? 'bg-emerald-500'
                  : currentUser.status === 'busy'
                  ? 'bg-rose-500'
                  : currentUser.status === 'away'
                  ? 'bg-amber-500'
                  : 'bg-slate-400'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 2. Search & Segmented Control */}
      <div className="p-3 border-b border-slate-200/80 dark:border-white/[0.07] space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو رمز الغرفة..."
            className="w-full min-h-[42px] bg-[#F2F4F8] dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.06] rounded-[14px] pr-10 pl-9 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500/70 transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              aria-label="مسح البحث"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#F2F4F8] dark:bg-white/[0.04] rounded-[13px] text-[11px]">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`flex-1 min-h-[34px] py-1 rounded-[10px] font-semibold transition-all cursor-pointer whitespace-nowrap tabular-nums ${
              filter === 'all'
                ? 'bg-white dark:bg-[#1A202E] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            الكل ({chats.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('groups')}
            className={`flex-1 min-h-[34px] py-1 rounded-[10px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filter === 'groups'
                ? 'bg-white dark:bg-[#1A202E] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            المجموعات
          </button>
          <button
            type="button"
            onClick={() => setFilter('direct')}
            className={`flex-1 min-h-[34px] py-1 rounded-[10px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filter === 'direct'
                ? 'bg-white dark:bg-[#1A202E] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            الخاصة
          </button>
        </div>
      </div>

      {/* 3. Conversations Feed with Live Online/Offline Status Indicators */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
        {chatsError && (
          <div className="mb-2 p-3 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/30 text-[11px] text-red-700 dark:text-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
            <span>{chatsError}</span>
          </div>
        )}
        {filteredChats.length === 0 ? (
          <div className="py-14 px-4 text-center flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
            <div className="w-12 h-12 rounded-[16px] bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.07] flex items-center justify-center">
              <MessageSquare className="w-5 h-5 opacity-50" />
            </div>
            <span className="text-xs font-medium">
              {chats.length === 0 ? 'لا توجد غرف محادثة في حسابك بعد' : 'لم يتم العثور على محادثات مطابقة'}
            </span>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onOpenCreateModal}
                className={`min-h-[40px] px-4 py-1.5 rounded-xl ${accent.buttonClass} text-white text-xs font-semibold cursor-pointer transition-colors`}
              >
                إنشاء غرفة
              </button>
              <button
                type="button"
                onClick={onOpenJoinModal}
                className="min-h-[40px] px-4 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.1] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>دخول برمز</span>
              </button>
            </div>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isSelected = selectedChatId === chat.id;
            const isOwner = chat.createdBy === currentUser.id;
            const roomMembers = roomMembersMap[chat.id] || [];
            const presence = summarizeRoomPresence(roomMembers, currentUser.id, nowMs);
            const peerMember =
              !chat.isGroup && roomMembers.length > 1
                ? roomMembers.find((m) => m.userId !== currentUser.id)
                : undefined;

            const displayTitle = peerMember ? `${chat.title}` : chat.title;

            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`relative group flex items-center gap-3 p-2.5 rounded-[18px] cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'bg-indigo-50/90 dark:bg-indigo-500/14 border border-indigo-200/80 dark:border-indigo-400/30'
                    : 'hover:bg-slate-100/75 dark:hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={peerMember?.avatar || chat.avatar || createRoomIconAvatar(chat.code, chat.title)}
                    alt={displayTitle}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-[14px] object-cover bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-white/[0.08]"
                  />
                  {/* Live Presence Dot on Avatar Corner */}
                  <span
                    className={`absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#0B0E16] ${presence.dotClass}`}
                    title={presence.statusLabel}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`text-xs sm:text-[13px] font-bold truncate ${
                          isSelected
                            ? 'text-indigo-950 dark:text-white'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {displayTitle}
                      </span>
                      {/* Inline Presence Indicator next to conversation/user name */}
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold shrink-0 whitespace-nowrap ${presence.textClass}`}
                        title={presence.statusLabel}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${presence.dotClass}`} />
                        <span>{presence.statusLabel}</span>
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tabular-nums shrink-0">
                      {formatTimestamp(chat.lastMessage?.createdAt || chat.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                    <button
                      type="button"
                      onClick={(e) => handleCopyCode(e, chat.code)}
                      className={`inline-flex items-center gap-1 font-mono ${accent.textClass} hover:underline cursor-pointer`}
                      title="نسخ رمز الغرفة للمشاركة"
                    >
                      <span>{chat.code}</span>
                      {copiedCode === chat.code ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3 opacity-70" />
                      )}
                    </button>
                    {chat.isEncrypted && currentUser.preferences.showEncryptionBadge && (
                      <>
                        <span aria-hidden="true">·</span>
                        <Lock className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                      </>
                    )}
                    {chat.isGroup && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-0.5 tabular-nums">
                          <Users className="w-3 h-3" />
                          <span>{roomMembers.length || chat.membersCount || 1}</span>
                        </span>
                      </>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-snug">
                    {getLastMessageLabel(chat)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleDeleteClick(e, chat)}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all shrink-0 cursor-pointer"
                  title={isOwner ? 'حذف المحادثة نهائياً' : 'مغادرة المحادثة'}
                  aria-label={isOwner ? `حذف ${chat.title}` : `مغادرة ${chat.title}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Compact Identity Dock */}
      <button
        type="button"
        onClick={onOpenProfile}
        className={`w-full px-4 py-3 border-t border-slate-200/80 dark:border-white/[0.07] flex items-center justify-between transition-colors group text-right cursor-pointer shrink-0 ${
          isMidnight
            ? 'bg-black hover:bg-white/[0.04]'
            : 'bg-[#F8F9FC] dark:bg-white/[0.02] hover:bg-slate-100/80 dark:hover:bg-white/[0.05]'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-[12px] object-cover bg-slate-200 dark:bg-slate-800 border border-slate-200/80 dark:border-white/[0.08]"
            />
            <span
              className={`absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0B0E16] ${
                currentUser.status === 'online'
                  ? 'bg-emerald-500'
                  : currentUser.status === 'busy'
                  ? 'bg-rose-500'
                  : currentUser.status === 'away'
                  ? 'bg-amber-500'
                  : 'bg-slate-400'
              }`}
            />
          </div>
          <div className="min-w-0 flex flex-col">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
              {currentUser.name}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {currentUser.statusMessage || `@${currentUser.username}`}
            </span>
          </div>
        </div>

        <div className="p-2 rounded-xl text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors shrink-0">
          <Settings className="w-4 h-4" />
        </div>
      </button>

      <ConfirmDeleteModal
        isOpen={Boolean(chatToDelete)}
        chatTitle={chatToDelete?.title || ''}
        isOwner={chatToDelete ? chatToDelete.createdBy === currentUser.id : true}
        isDeleting={isDeleting}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setChatToDelete(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
};
