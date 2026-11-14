import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Shield,
  Crown,
  Calendar,
  Clock,
  MessageSquareText,
  UserCheck,
} from 'lucide-react';
import { ChatMember } from '../types/chat';
import { createMonogramAvatar } from '../utils/avatar';
import { resolveMemberPresence } from '../utils/wallpapers';
import { copyToClipboard } from '../utils/clipboard';

interface UserInfoModalProps {
  member: ChatMember;
  isCurrentUser?: boolean;
  locale?: 'ar-SA' | 'en-US';
  onClose: () => void;
  onEditOwnProfile?: () => void;
}

export const UserInfoModal: React.FC<UserInfoModalProps> = ({
  member,
  isCurrentUser = false,
  locale = 'ar-SA',
  onClose,
  onEditOwnProfile,
}) => {
  const [copiedUsername, setCopiedUsername] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const presence = resolveMemberPresence(member);

  const handleCopyUsername = () => {
    copyToClipboard(`@${member.username}`);
    setCopiedUsername(true);
    setTimeout(() => setCopiedUsername(false), 1800);
  };

  const formatDate = (iso?: string) => {
    if (!iso) return 'غير محدد';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'غير محدد';
    return d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatRelativeTime = (iso?: string) => {
    if (!iso) return 'غير معروف';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'غير معروف';
    if (presence.isOnline) return presence.label;
    const diffMins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMins < 1) return 'قبل لحظات';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return formatDate(iso);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#0E121B] border border-slate-200/80 dark:border-white/[0.08] rounded-[28px] overflow-hidden shadow-2xl text-slate-900 dark:text-slate-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Atmospheric Banner */}
        <div className="h-24 bg-[linear-gradient(125deg,#1e1b4b_0%,#312e81_48%,#0f172a_100%)] relative shrink-0">
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:18px_18px]" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 sm:px-6 pb-6 -mt-12 relative flex flex-col gap-4">
          {/* Avatar + Name + Role Row */}
          <div className="flex items-end justify-between gap-3">
            <div className="relative shrink-0">
              <img
                src={member.avatar || createMonogramAvatar(member.name)}
                alt={member.name}
                referrerPolicy="no-referrer"
                className="w-22 h-22 rounded-[22px] object-cover border-4 border-white dark:border-[#0E121B] bg-slate-100 dark:bg-slate-800 shadow-lg"
              />
              <span
                className={`absolute bottom-1 left-1 w-4 h-4 rounded-full border-2 border-white dark:border-[#0E121B] ${presence.dotClass}`}
                title={presence.label}
              />
            </div>

            <div className="flex items-center gap-2 pb-1">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border ${
                  member.role === 'owner'
                    ? 'bg-amber-50 dark:bg-amber-500/12 border-amber-200 dark:border-amber-400/25 text-amber-700 dark:text-amber-300'
                    : 'bg-slate-100 dark:bg-white/[0.06] border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-300'
                }`}
              >
                {member.role === 'owner' ? (
                  <>
                    <Crown className="w-3.5 h-3.5" />
                    <span>منشئ الغرفة</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>عضو مشارك</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Identity Block */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {member.name}
              </h3>
              {isCurrentUser && (
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                  (أنت)
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <button
                type="button"
                onClick={handleCopyUsername}
                className="inline-flex items-center gap-1.5 font-mono text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                title="نسخ اسم المستخدم"
              >
                <span dir="ltr">@{member.username}</span>
                {copiedUsername ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3 opacity-70" />
                )}
              </button>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                ·
              </span>
              <span className={`inline-flex items-center gap-1.5 font-semibold ${presence.badgeClass}`}>
                <span className={`w-2 h-2 rounded-full ${presence.dotClass}`} />
                <span>{presence.label}</span>
              </span>
            </div>
          </div>

          {/* Custom Status Message */}
          {member.statusMessage && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-200/70 dark:border-indigo-400/20 flex items-center gap-2.5 text-xs">
              <MessageSquareText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="text-slate-800 dark:text-slate-200 font-medium">{member.statusMessage}</span>
            </div>
          )}

          {/* Bio Section */}
          <div className="p-4 rounded-2xl bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.07] text-xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              النبذة التعريفية
            </span>
            <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
              {member.bio ? member.bio : 'لم يضف هذا العضو نبذة تعريفية بعد.'}
            </p>
          </div>

          {/* Activity & Membership Metadata */}
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-2xl bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.07] flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">آخر ظهور</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {formatRelativeTime(member.lastActiveAt)}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.07] flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">تاريخ الانضمام</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {formatDate(member.joinedAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Security Verification Footer Note */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>عضوية موثقة مشفرة داخل الغرفة</span>
            </div>

            {isCurrentUser && onEditOwnProfile && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditOwnProfile();
                }}
                className="min-h-[38px] px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                تعديل ملفي
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
