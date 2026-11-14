import React, { useState, useEffect } from 'react';
import { X, KeyRound, Clipboard, ArrowLeft, ShieldCheck } from 'lucide-react';
import { extractRoomCodeFromInput } from '../utils/clipboard';
import { formatReadableError } from '../utils/errors';

interface JoinChatModalProps {
  initialCode?: string;
  onClose: () => void;
  onJoin: (code: string) => Promise<void>;
}

export const JoinChatModal: React.FC<JoinChatModalProps> = ({ initialCode = '', onClose, onJoin }) => {
  const [code, setCode] = useState(extractRoomCodeFromInput(initialCode));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, loading]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setCode(extractRoomCodeFromInput(text));
      }
    } catch {
      // clipboard permission denied
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const extracted = extractRoomCodeFromInput(code);
    if (!extracted) {
      setError('يرجى إدخال رمز الغرفة أو رابط الدعوة');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onJoin(extracted);
      onClose();
    } catch (err) {
      setError(formatReadableError(err, 'تعذر الانضمام، تأكد من صحة رمز الغرفة وحاول مجدداً'));
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
        className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-white dark:bg-[#0E121B] border border-slate-200/80 dark:border-white/[0.08] rounded-[28px] p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-slate-100 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.07] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-indigo-500/15 to-blue-500/15 border border-indigo-200/80 dark:border-indigo-400/25 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">الانضمام إلى محادثة</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">أدخل مفتاح الغرفة أو رابط الدعوة للانضمام فوراً</p>
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
          <div className="flex flex-col gap-2">
            <label className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
              <span>رمز الوصول للغرفة *</span>
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  const val = e.target.value;
                  setCode(
                    val.includes('room=')
                      ? extractRoomCodeFromInput(val)
                      : val.toUpperCase().replace(/[^A-Z0-9\-]/g, '').slice(0, 32)
                  );
                }}
                placeholder="أدخل الرمز مثل CP-4821-KLM أو الصق رابط الدعوة..."
                dir="ltr"
                className="min-h-[48px] w-full bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl pr-4 pl-16 py-3 text-sm font-mono font-bold tracking-wider text-indigo-600 dark:text-indigo-300 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors uppercase text-left"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={handlePaste}
                className="absolute left-2 min-h-[34px] px-2.5 py-1 bg-slate-200/80 dark:bg-white/[0.08] hover:bg-slate-300 dark:hover:bg-white/[0.14] rounded-xl text-slate-700 dark:text-slate-200 text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                title="لصق من الحافظة"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>لصق</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              احصل على مفتاح الدخول السري من منشئ الغرفة للانضمام المباشر ومشاركة الملفات والرسائل المشفرة.
            </p>
          </div>

          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-500/20 rounded-2xl flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>يُستخدم المفتاح محلياً لتوليد مفتاح التشفير وفك الرسائل على جهازك فقط.</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="min-h-[46px] w-full py-2.5 bg-gradient-to-br from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold rounded-2xl text-xs shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{loading ? 'جاري الانضمام...' : 'الانضمام إلى المحادثة'}</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
