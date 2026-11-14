import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Link as LinkIcon,
  ShieldCheck,
  Edit3,
  Image as ImageIcon,
  FileText,
  Download,
  Users,
  Save,
  Trash2,
  LogOut,
  Camera,
  Crown,
  ChevronLeft,
} from 'lucide-react';
import { ChatMember, ChatMessage, ChatRoom, UserProfile } from '../types/chat';
import { compressImageFile, createMonogramAvatar, createRoomIconAvatar } from '../utils/avatar';
import { copyToClipboard } from '../utils/clipboard';
import { formatReadableError } from '../utils/errors';
import { resolveMemberPresence } from '../utils/wallpapers';

interface RoomInfoModalProps {
  chat: ChatRoom;
  messages: ChatMessage[];
  members: ChatMember[];
  currentUser: UserProfile;
  initialTab?: 'overview' | 'members' | 'media' | 'files';
  onClose: () => void;
  onUpdateRoom: (updates: { title: string; description: string; avatar?: string }) => Promise<void>;
  onOpenEncryption: () => void;
  onRequestDeleteChat: () => void;
  onPreviewImage: (media: { url: string; fileName: string; sender: string; time: string }) => void;
  onSelectMember: (member: ChatMember) => void;
}

export const RoomInfoModal: React.FC<RoomInfoModalProps> = ({
  chat,
  messages,
  members,
  currentUser,
  initialTab = 'overview',
  onClose,
  onUpdateRoom,
  onOpenEncryption,
  onRequestDeleteChat,
  onPreviewImage,
  onSelectMember,
}) => {
  const isOwner = chat.createdBy === currentUser.id;
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'media' | 'files'>(initialTab);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(chat.title);
  const [description, setDescription] = useState(chat.description || '');
  const [avatar, setAvatar] = useState(chat.avatar || '');
  const [saving, setSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setTitle(chat.title);
    setDescription(chat.description || '');
    setAvatar(chat.avatar || '');
  }, [chat.id, chat.title, chat.description, chat.avatar]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sharedImages = messages.filter((m) => m.type === 'image' && m.mediaUrl);
  const sharedFiles = messages.filter((m) => m.type === 'file' && m.mediaUrl);

  const onlineMembersCount = members.filter((m) => resolveMemberPresence(m).isOnline).length;
  const inviteUrl = `${window.location.origin}/?room=${encodeURIComponent(chat.code)}`;

  const handleCopyCode = () => {
    copyToClipboard(chat.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyInviteLink = () => {
    copyToClipboard(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRoomAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    try {
      setError(null);
      const compressed = await compressImageFile(file, 300, 0.8);
      setAvatar(compressed);
      if (!isEditing) {
        await onUpdateRoom({ title: chat.title, description: chat.description || '', avatar: compressed });
      }
    } catch (err) {
      setError(formatReadableError(err, 'تعذر معالجة صورة الغرفة'));
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('عنوان الغرفة مطلوب');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await onUpdateRoom({
        title: title.trim(),
        description: description.trim(),
        avatar: avatar || undefined,
      });
      setIsEditing(false);
    } catch (err) {
      setError(formatReadableError(err, 'تعذر تحديث بيانات الغرفة'));
    } finally {
      setSaving(false);
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="w-full max-w-lg max-h-[90dvh] bg-white dark:bg-[#0E121B] border border-slate-200/80 dark:border-white/[0.08] rounded-[28px] shadow-2xl text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.07] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative group shrink-0">
              <img
                src={avatar || createRoomIconAvatar(chat.code, chat.title)}
                alt={chat.title}
                className="w-12 h-12 rounded-[14px] object-cover border border-slate-200/80 dark:border-white/[0.08]"
              />
              {isOwner && (
                <label
                  className="absolute inset-0 bg-black/55 rounded-[14px] opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity"
                  title="تغيير صورة الغرفة"
                >
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleRoomAvatarChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate tracking-tight">{chat.title}</h3>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Users className="w-3.5 h-3.5" />
                  <span>{members.length || chat.membersCount || 1} عضو</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">
                  {onlineMembersCount} متصل الآن
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 sm:px-5 pt-3 pb-2.5 border-b border-slate-200/80 dark:border-white/[0.07] flex items-center gap-1.5 overflow-x-auto bg-[#F8F9FC] dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`min-h-[36px] px-3 py-1.5 rounded-[11px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-white/[0.06]'
            }`}
          >
            تفاصيل الغرفة
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`min-h-[36px] px-3 py-1.5 rounded-[11px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
              activeTab === 'members'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-white/[0.06]'
            }`}
          >
            الأعضاء ({members.length || chat.membersCount || 1})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`min-h-[36px] px-3 py-1.5 rounded-[11px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
              activeTab === 'media'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-white/[0.06]'
            }`}
          >
            الصور ({sharedImages.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`min-h-[36px] px-3 py-1.5 rounded-[11px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
              activeTab === 'files'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-white/[0.06]'
            }`}
          >
            الملفات ({sharedFiles.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 text-xs">
          {error && (
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-200 font-medium">
              {error}
            </div>
          )}

          {activeTab === 'overview' && (
            <>
              {isEditing ? (
                <form
                  onSubmit={handleSaveDetails}
                  className="flex flex-col gap-3 p-4 rounded-2xl bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.07]"
                >
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">عنوان الغرفة</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={100}
                      required
                      className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white dark:bg-[#0E121B] border border-slate-200/80 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">وصف الغرفة</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={300}
                      rows={2}
                      className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#0E121B] border border-slate-200/80 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={saving}
                      className="min-h-[40px] px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTitle(chat.title);
                        setDescription(chat.description || '');
                        setIsEditing(false);
                      }}
                      className="min-h-[40px] px-3.5 py-1.5 bg-slate-200 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 rounded-xl font-medium cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 rounded-2xl bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.07] flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">الوصف</span>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                      {chat.description || 'لا يوجد وصف مضاف لهذه الغرفة.'}
                    </p>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      أنشأها: <strong className="text-slate-700 dark:text-slate-300">{chat.createdByName || 'المالك'}</strong>
                    </span>
                  </div>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#0E121B] border border-slate-200/80 dark:border-white/[0.08] hover:border-indigo-500 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 font-semibold shrink-0 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>تعديل</span>
                    </button>
                  )}
                </div>
              )}

              <div className="p-4 rounded-2xl bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.07] flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">رمز الانضمام السري</span>
                    <span dir="ltr" className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 inline-block tabular-nums">
                      {chat.code}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'تم النسخ' : 'نسخ الرمز'}</span>
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-200/80 dark:border-white/[0.07] flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">رابط الدعوة المباشر</span>
                    <span dir="ltr" className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate block text-left">
                      {inviteUrl}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#0E121B] border border-slate-200/80 dark:border-white/[0.08] hover:border-indigo-500 text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <LinkIcon className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'تم نسخ الرابط' : 'نسخ الرابط'}</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEncryption();
                }}
                className="w-full p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-500/20 flex items-center justify-between gap-3 text-right hover:bg-emerald-100/70 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-bold text-emerald-900 dark:text-emerald-200">التشفير وبصمة الأمان (E2EE)</div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-300/80">
                      معاينة بصمة SHA-256 وفحص النصوص المشفرة المخزنة
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestDeleteChat();
                }}
                className="min-h-[44px] w-full px-4 py-2.5 rounded-2xl bg-red-50 dark:bg-red-950/35 hover:bg-red-100 dark:hover:bg-red-950/55 border border-red-200/80 dark:border-red-500/30 text-red-600 dark:text-red-300 font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {isOwner ? <Trash2 className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                <span>{isOwner ? 'حذف هذه الغرفة نهائياً' : 'مغادرة هذه الغرفة'}</span>
              </button>
            </>
          )}

          {activeTab === 'members' && (
            members.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center gap-2 text-slate-400">
                <Users className="w-8 h-8 opacity-40" />
                <span>جاري تحميل قائمة الأعضاء...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {members.map((member) => {
                  const presence = resolveMemberPresence(member);
                  const isMe = member.userId === currentUser.id;
                  return (
                    <button
                      key={member.userId}
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectMember(member);
                      }}
                      className="w-full p-3 rounded-2xl bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.07] hover:border-indigo-500/60 flex items-center justify-between gap-3 text-right transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={member.avatar || createMonogramAvatar(member.name)}
                            alt={member.name}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-[13px] object-cover border border-slate-200/80 dark:border-white/[0.08]"
                          />
                          <span
                            className={`absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#07090E] ${presence.dotClass}`}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-white truncate">
                              {member.name}
                            </span>
                            {isMe && (
                              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                                (أنت)
                              </span>
                            )}
                            {member.role === 'owner' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">
                                <Crown className="w-2.5 h-2.5" />
                                <span>منشئ الغرفة</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] mt-0.5">
                            <span dir="ltr" className="font-mono text-slate-500 dark:text-slate-400">
                              @{member.username}
                            </span>
                            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                            <span className={`font-semibold ${presence.badgeClass}`}>
                              {presence.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" />
                    </button>
                  );
                })}
              </div>
            )
          )}

          {activeTab === 'media' && (
            sharedImages.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center gap-2 text-slate-400">
                <ImageIcon className="w-8 h-8 opacity-40" />
                <span>لم يتم إرسال أي صور في هذه الغرفة بعد</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {sharedImages.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onPreviewImage({
                        url: img.mediaUrl!,
                        fileName: img.fileName || 'image.jpg',
                        sender: img.senderName,
                        time: img.createdAt,
                      });
                    }}
                    className="aspect-square rounded-[14px] overflow-hidden border border-slate-200/80 dark:border-white/[0.08] hover:border-indigo-500 transition-colors cursor-pointer"
                  >
                    <img
                      src={img.mediaUrl!}
                      alt={img.fileName || 'صورة'}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )
          )}

          {activeTab === 'files' && (
            sharedFiles.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center gap-2 text-slate-400">
                <FileText className="w-8 h-8 opacity-40" />
                <span>لم تتم مشاركة أي ملفات في هذه الغرفة بعد</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {sharedFiles.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-2xl bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.07] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {f.fileName || 'مستند'}
                        </div>
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          {formatFileSize(f.fileSize)} · {f.senderName}
                        </div>
                      </div>
                    </div>
                    <a
                      href={f.mediaUrl!}
                      download={f.fileName || 'file'}
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-white dark:bg-[#0E121B] border border-slate-200/80 dark:border-white/[0.08] hover:border-indigo-500 text-slate-700 dark:text-slate-200 shrink-0"
                      title="تحميل"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
