import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X, LogOut } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  chatTitle: string;
  isOwner?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
  error?: string | null;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  chatTitle,
  isOwner = true,
  onConfirm,
  onCancel,
  isDeleting = false,
  error = null,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isDeleting, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4"
      onClick={() => !isDeleting && onCancel()}
      dir="rtl"
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-[#0E121B] border border-red-200/80 dark:border-red-500/25 rounded-[26px] p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-slate-100 flex flex-col gap-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={isDeleting}
          className="absolute top-3.5 left-3.5 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-40"
          aria-label="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-[14px] bg-red-50 dark:bg-red-500/15 border border-red-200/80 dark:border-red-500/25 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {isOwner ? 'حذف المحادثة نهائياً' : 'مغادرة المحادثة'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isOwner ? 'إجراء دائم لا يمكن التراجع عنه' : 'ستتم إزالة الغرفة من قائمتك'}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-[#F5F6FA] dark:bg-[#07090E] p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.07]">
          {isOwner ? (
            <>
              هل أنت متأكد من رغبتك في حذف محادثة{' '}
              <span className="font-bold text-slate-900 dark:text-white">"{chatTitle}"</span>؟ سيتم مسح كافة
              الرسائل والملفات وإلغاء رمز الغرفة نهائياً من قاعدة البيانات.
            </>
          ) : (
            <>
              هل ترغب في مغادرة محادثة{' '}
              <span className="font-bold text-slate-900 dark:text-white">"{chatTitle}"</span>؟ يمكنك العودة
              لاحقاً عبر إدخال رمز الغرفة السري.
            </>
          )}
        </p>

        {error && (
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/30 text-xs text-red-700 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="min-h-[44px] flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {isOwner ? <Trash2 className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
            <span>
              {isDeleting
                ? isOwner
                  ? 'جاري الحذف...'
                  : 'جاري المغادرة...'
                : isOwner
                ? 'نعم، حذف المحادثة'
                : 'نعم، مغادرة'}
            </span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="min-h-[44px] py-2.5 px-4 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
