import React, { useState, useEffect } from 'react';
import { X, Lock, Users, RefreshCw, KeyRound, ShieldCheck, MessageSquarePlus } from 'lucide-react';
import { generateRoomCode } from '../utils/crypto';
import { createRoomIconAvatar } from '../utils/avatar';
import { formatReadableError } from '../utils/errors';

interface CreateChatModalProps {
  onClose: () => void;
  onCreate: (chatData: {
    title: string;
    description: string;
    isGroup: boolean;
    code: string;
    avatar: string;
  }) => Promise<void>;
}

export const CreateChatModal: React.FC<CreateChatModalProps> = ({ onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isGroup, setIsGroup] = useState(true);
  const [code, setCode] = useState(() => generateRoomCode());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, loading]);

  const avatarSeeds = [
    { seed: 'indigo', label: 'A' },
    { seed: 'teal', label: 'B' },
    { seed: 'sky', label: 'C' },
    { seed: 'violet', label: 'D' },
    { seed: 'emerald', label: 'E' },
    { seed: 'amber', label: 'F' },
  ];
  const [selectedSeed, setSelectedSeed] = useState('indigo');

  const handleRefreshCode = () => {
    setCode(generateRoomCode());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('يرجى إدخال اسم المحادثة أو الغرفة');
      return;
    }

    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9\-]/g, '');
    if (cleanCode.length < 4 || cleanCode.length > 32) {
      setError('رمز الغرفة يجب أن يتكون من 4 إلى 32 حرفاً أو رقماً باللغة الإنجليزية');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const avatarUrl = createRoomIconAvatar(selectedSeed + '_' + cleanCode, title.trim());
      await onCreate({
        title: title.trim(),
        description: description.trim(),
        isGroup,
        code: cleanCode,
        avatar: avatarUrl,
      });
      onClose();
    } catch (err) {
      setError(formatReadableError(err, 'حدث خطأ أثناء إنشاء المحادثة، يرجى المحاولة مرة أخرى'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4"
      onClick={() => !loading && onClose()}
      dir="rtl"
    >
      <div
        className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-white dark:bg-[#0E121B] border border-slate-200/80 dark:border-white/[0.08] rounded-[26px] p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-slate-100 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.07] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-[13px] bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200/70 dark:border-indigo-400/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">إنشاء محادثة جديدة</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">أنشئ غرفة آمنة برمز مشاركة فريد</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/30 rounded-2xl text-xs text-red-700 dark:text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          <div className="flex p-1 bg-[#F2F4F8] dark:bg-white/[0.04] rounded-[14px] border border-slate-200/70 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => setIsGroup(true)}
              className={`flex-1 min-h-[40px] py-2 rounded-[10px] flex items-center justify-center gap-2 font-semibold transition-all cursor-pointer ${
                isGroup
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>مجموعة أو مجلس</span>
            </button>
            <button
              type="button"
              onClick={() => setIsGroup(false)}
              className={`flex-1 min-h-[40px] py-2 rounded-[10px] flex items-center justify-center gap-2 font-semibold transition-all cursor-pointer ${
                !isGroup
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>محادثة ثنائية خاصة</span>
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-700 dark:text-slate-300 font-semibold">عنوان المحادثة *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder={isGroup ? 'مثال: فريق العمل والمشاريع' : 'مثال: محادثة خاصة'}
              className="min-h-[44px] bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-700 dark:text-slate-300 font-semibold">وصف المحادثة (اختياري)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              placeholder="وصف مختصر لموضوع الغرفة..."
              className="min-h-[44px] bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                <span>مفتاح ومُعرّف الغرفة</span>
              </label>
              <button
                type="button"
                onClick={handleRefreshCode}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>توليد رمز آخر</span>
              </button>
            </div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, ''))}
              maxLength={32}
              dir="ltr"
              className="min-h-[44px] w-full bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl px-4 py-2.5 text-xs font-mono font-bold tracking-wider text-indigo-600 dark:text-indigo-300 focus:outline-none focus:border-indigo-500 transition-colors uppercase text-left"
            />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              شارك هذا الرمز مع من ترغب لتمكينهم من الانضمام لهذه الغرفة مباشرة
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-700 dark:text-slate-300 font-semibold">أيقونة الغرفة</label>
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {avatarSeeds.map((item) => {
                const url = createRoomIconAvatar(item.seed, title || item.label);
                return (
                  <button
                    key={item.seed}
                    type="button"
                    onClick={() => setSelectedSeed(item.seed)}
                    className={`w-11 h-11 rounded-[13px] overflow-hidden border-2 transition-all p-0.5 shrink-0 cursor-pointer ${
                      selectedSeed === item.seed
                        ? 'border-indigo-500 scale-105 bg-indigo-50 dark:bg-indigo-950/40'
                        : 'border-slate-200 dark:border-white/[0.08] hover:border-slate-400'
                    }`}
                  >
                    <img src={url} alt={item.seed} className="w-full h-full rounded-[9px]" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-500/20 rounded-2xl flex items-center gap-2.5 text-emerald-700 dark:text-emerald-300 text-[11px]">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>سيتم تفعيل التشفير التام (AES-256-GCM) لهذه الغرفة تلقائياً.</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="min-h-[46px] w-full py-2.5 bg-gradient-to-br from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold rounded-2xl text-xs shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'جاري الإنشاء...' : 'إنشاء المحادثة والبدء'}
          </button>
        </form>
      </div>
    </div>
  );
};
