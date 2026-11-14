import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Key, Copy, Check, Eye, EyeOff, Terminal } from 'lucide-react';
import { generateSecurityFingerprint } from '../utils/crypto';
import { ChatRoom } from '../types/chat';
import { copyToClipboard } from '../utils/clipboard';

interface EncryptionBadgeModalProps {
  chat: ChatRoom;
  sampleCiphertext?: { ciphertext: string; iv: string; plaintext: string };
  onClose: () => void;
}

export const EncryptionBadgeModal: React.FC<EncryptionBadgeModalProps> = ({
  chat,
  sampleCiphertext,
  onClose,
}) => {
  const [fingerprint, setFingerprint] = useState<string>('جاري التحقق...');
  const [copied, setCopied] = useState(false);
  const [showRawInspector, setShowRawInspector] = useState(false);

  useEffect(() => {
    generateSecurityFingerprint(chat.code, chat.encryptionSalt).then((fp) => {
      setFingerprint(fp);
    });
  }, [chat.code, chat.encryptionSalt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleCopyCode = () => {
    copyToClipboard(chat.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-white dark:bg-[#0E121B] border border-slate-200/80 dark:border-white/[0.08] rounded-[26px] p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-slate-100 flex flex-col gap-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-[14px] bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200/80 dark:border-emerald-400/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              تشفير تام طرف لطرف (AES-256-GCM)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              الرسائل النصية في هذه الغرفة تشفر محلياً على جهازك قبل حفظها
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.07] flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span>معيار التشفير المعتمد</span>
            </div>
            <span className="font-mono text-slate-900 dark:text-slate-200 font-semibold text-xs">
              AES-256-GCM · PBKDF2
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.07] flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Key className="w-3.5 h-3.5 text-emerald-500" />
              <span>رمز مشاركة الغرفة</span>
            </div>
            <div className="flex items-center justify-between font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs tabular-nums">
              <span>{chat.code}</span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                title="نسخ الرمز"
                aria-label="نسخ الرمز"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.07] flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400">بصمة الأمان الرقمية للغرفة:</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">SHA-256</span>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-[#0E121B] font-mono tabular-nums text-center text-xs sm:text-sm font-semibold tracking-wider text-emerald-700 dark:text-emerald-300 border border-slate-200/80 dark:border-white/[0.07] select-all">
            {fingerprint}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            يمكنك مقارنة هذه البصمة مع أعضاء الغرفة للتأكد من تطابق مفتاح التشفير المحلي.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowRawInspector(!showRawInspector)}
            className="flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 hover:underline p-1.5 rounded-xl cursor-pointer"
          >
            <span className="flex items-center gap-1.5 font-medium">
              <Terminal className="w-3.5 h-3.5" />
              <span>فاحص التشفير المباشر للرسائل المخزنة</span>
            </span>
            {showRawInspector ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {showRawInspector && (
            <div className="p-3.5 bg-[#F5F6FA] dark:bg-[#07090E] rounded-2xl border border-slate-200/80 dark:border-white/[0.07] text-[11px] font-mono flex flex-col gap-2.5 text-slate-600 dark:text-slate-400 max-h-44 overflow-y-auto">
              {sampleCiphertext ? (
                <>
                  <div>
                    <span className="text-amber-600 dark:text-amber-400 font-bold block mb-1">
                      المخزن في قاعدة البيانات (Ciphertext):
                    </span>
                    <span className="text-slate-800 dark:text-slate-300 break-all select-all block bg-white dark:bg-[#0E121B] p-2 rounded-xl border border-slate-200/80 dark:border-white/[0.06]">
                      {sampleCiphertext.ciphertext}
                    </span>
                  </div>
                  <div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold block mb-1">
                      في متصفحك فقط (Decrypted):
                    </span>
                    <span className="text-slate-900 dark:text-slate-200 block bg-white dark:bg-[#0E121B] p-2 rounded-xl border border-slate-200/80 dark:border-white/[0.06]">
                      {sampleCiphertext.plaintext}
                    </span>
                  </div>
                </>
              ) : (
                <p className="font-sans text-slate-500 dark:text-slate-400">
                  أرسل أول رسالة نصية مشفرة في هذه الغرفة لمعاينة النص المشفر المخزن مقابل النص المفكوك محلياً.
                </p>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="min-h-[46px] w-full py-2.5 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-900 dark:text-white rounded-2xl text-xs font-semibold transition-colors cursor-pointer"
        >
          إغلاق
        </button>
      </div>
    </div>
  );
};
