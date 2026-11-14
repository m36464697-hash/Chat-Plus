import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Mic,
  UserCog,
  Smartphone,
  Sun,
  Moon,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Check,
  Terminal,
  RefreshCw,
  Users,
  Palette,
} from 'lucide-react';
import { encryptText } from '../utils/crypto';
import heroVaultImg from '../assets/images/hero_e2ee_vault_1794665456070.jpg';
import prismArtworkImg from '../assets/images/chat_encryption_prism_1794665458252.jpg';

interface AuthLandingScreenProps {
  onGoogleSignIn: () => Promise<void>;
  isDark: boolean;
  onToggleTheme: () => void;
  authError: string | null;
}

const HERO_IMAGE = heroVaultImg;
const PRISM_IMAGE = prismArtworkImg;

export const AuthLandingScreen: React.FC<AuthLandingScreenProps> = ({
  onGoogleSignIn,
  isDark,
  onToggleTheme,
  authError,
}) => {
  const [signingIn, setSigningIn] = useState(false);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [prismImgFailed, setPrismImgFailed] = useState(false);

  const [sampleText, setSampleText] = useState('اجتماع الفريق الساعة 8 مساءً');
  const [sampleCipher, setSampleCipher] = useState<{ ciphertext: string; iv: string } | null>(null);
  const [encryptingSample, setEncryptingSample] = useState(false);
  const [labTab, setLabTab] = useState<'crypto' | 'workspace'>('crypto');

  useEffect(() => {
    let active = true;
    if (!sampleText.trim()) {
      setSampleCipher(null);
      return;
    }
    setEncryptingSample(true);
    const timer = setTimeout(async () => {
      try {
        const res = await encryptText(sampleText, 'CP-DEMO-2026', 'chat-plus-preview-salt');
        if (active) setSampleCipher(res);
      } catch {
        if (active) setSampleCipher(null);
      } finally {
        if (active) setEncryptingSample(false);
      }
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [sampleText]);

  const handleLoginClick = async () => {
    try {
      setSigningIn(true);
      await onGoogleSignIn();
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] w-full bg-[#F5F6FA] dark:bg-[#07090E] text-slate-900 dark:text-slate-100 flex flex-col transition-colors relative overflow-x-clip"
      dir="rtl"
    >
      {/* Subtle Ambient Architectural Depth */}
      <div
        className="pointer-events-none absolute top-0 inset-x-0 h-[520px] bg-[radial-gradient(ellipse_75%_55%_at_50%_-10%,_rgba(79,70,229,0.14),_transparent)] dark:bg-[radial-gradient(ellipse_75%_55%_at_50%_-10%,_rgba(99,102,241,0.22),_transparent)]"
        aria-hidden="true"
      />

      {/* Top Bar: Strict 3-zone frosted navigation */}
      <header className="sticky top-0 z-30 bg-[#F5F6FA]/85 dark:bg-[#07090E]/85 backdrop-blur-2xl border-b border-slate-200/80 dark:border-white/[0.07]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
          <a
            href="#top"
            className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 flex items-center gap-2"
          >
            <span className="w-7 h-7 rounded-[9px] bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-xs">
              <Lock className="w-3.5 h-3.5" />
            </span>
            <span>Chat Plus</span>
          </a>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-400">
            <a
              href="#capabilities"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              الإمكانيات
            </a>
            <a
              href="#encryption-lab"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              التشفير والحضور
            </a>
            <a
              href="#architecture"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              الخصوصية
            </a>
            <a
              href="#devices"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              الأجهزة
            </a>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleLoginClick}
              disabled={signingIn}
              className="min-h-[40px] px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs sm:text-sm font-semibold transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 flex items-center gap-2 disabled:opacity-60 cursor-pointer shadow-xs"
            >
              {signingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeft className="w-4 h-4" />}
              <span>ابدأ الآن</span>
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1 flex flex-col relative z-10">
        {/* 1. Hero Showcase */}
        <section className="max-w-7xl w-full mx-auto px-4 sm:px-8 pt-10 pb-14 sm:py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          {/* Editorial Copy + Google Sign-In */}
          <div className="lg:col-span-6 flex flex-col justify-center items-start gap-6">
            <div className="w-full flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs sm:text-sm font-medium text-indigo-600 dark:text-indigo-400 flex flex-wrap items-center gap-2">
                <span>تواصل فوري مشفر طرف لطرف</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">AES-256-GCM</span>
                <span aria-hidden="true">·</span>
                <span>حضور لحظي</span>
              </div>

              <button
                type="button"
                onClick={onToggleTheme}
                className="min-h-[38px] px-3 py-1.5 flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                aria-label={isDark ? 'التبديل للوضع الفاتح' : 'التبديل للوضع الداكن'}
              >
                {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
                <span>{isDark ? 'المظهر الفاتح' : 'المظهر الداكن'}</span>
              </button>
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 dark:text-white leading-[1.2] tracking-[-0.02em] [text-wrap:balance]">
              مساحة محادثات معاصرة تجمع التفاعل الحي ودقة التشفير
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
              أنشئ غرف محادثة محمية بمفاتيح دخول خاصة، تابع حالة الأعضاء المتصلين مباشرة، استعرض ملفاتهم التعريفية،
              وصمم مساحة الدردشة الخاصة بك مع عشرات الخلفيات والإعدادات المتقدمة.
            </p>

            {authError && (
              <div className="w-full max-w-md p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <span>{authError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto pt-1">
              <button
                type="button"
                onClick={handleLoginClick}
                disabled={signingIn}
                className="min-h-[52px] px-6 py-3 bg-slate-950 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-950 border border-slate-950 dark:border-white rounded-2xl text-sm font-semibold shadow-sm transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                {signingIn ? (
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                    />
                  </svg>
                )}
                <span>{signingIn ? 'جاري تسجيل الدخول بحساب Google...' : 'تسجيل الدخول باستخدام Google'}</span>
              </button>

              <a
                href="#encryption-lab"
                className="min-h-[52px] px-5 py-3 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] hover:bg-white dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300 text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <Terminal className="w-4 h-4 text-indigo-500" />
                <span>تجربة التشفير مباشرة</span>
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>مؤشرات حضور حية (أونلاين/أوفلاين) بدون بيانات وهمية</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>دخول مباشر بمفتاح الغرفة أو رابط الدعوة</span>
              </span>
            </div>
          </div>

          {/* Framed Hero Visual */}
          <div className="lg:col-span-6 flex">
            <div className="relative w-full min-h-[340px] sm:min-h-[420px] rounded-[28px] overflow-hidden border border-slate-200/80 dark:border-white/[0.08] bg-[#0B0F19] flex flex-col justify-end shadow-xl">
              {!heroImgFailed ? (
                <img
                  src={HERO_IMAGE}
                  alt="تشفير Chat Plus متعدد الطبقات"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(79,70,229,0.35),_rgba(7,9,14,1)_70%)] flex items-center justify-center">
                  <ShieldCheck className="w-20 h-20 text-emerald-400/50" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

              <div className="relative z-10 p-6 sm:p-8 flex flex-col gap-3.5">
                <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-3 text-xs text-slate-300">
                  <span className="font-semibold text-white">بنية التشفير والخصوصية</span>
                  <span dir="ltr" className="font-mono text-emerald-300 tabular-nums">
                    256-bit Web Crypto
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <div dir="ltr" className="font-mono text-white font-semibold text-sm inline-block">
                      AES-GCM
                    </div>
                    <div className="text-slate-300 text-[11px] mt-0.5">تشفير نصي فوري</div>
                  </div>
                  <div>
                    <div dir="ltr" className="font-mono text-white font-semibold text-sm tabular-nums inline-block">
                      100,000x
                    </div>
                    <div className="text-slate-300 text-[11px] mt-0.5">دورة اشتقاق PBKDF2</div>
                  </div>
                  <div>
                    <div dir="ltr" className="font-mono text-white font-semibold text-sm inline-block">
                      Real-Time
                    </div>
                    <div className="text-slate-300 text-[11px] mt-0.5">مزامنة الحضور والرسائل</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Asymmetric Bento Capabilities Grid */}
        <section
          id="capabilities"
          className="border-t border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-[#0B0E16] py-16 sm:py-20"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div className="max-w-xl">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight [text-wrap:balance]">
                  منظومة محادثات مصممة للتفاعل الحقيقي
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  كل المزايا الأساسية والتفاعلية مبنية على مزامنة فورية حقيقية بين أعضاء الغرفة عبر Firebase Firestore.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">
                01 — 04 قدرات المنصة
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-7 p-6 sm:p-7 rounded-[24px] bg-[#F5F6FA] dark:bg-[#111622] border border-slate-200/80 dark:border-white/[0.07] flex flex-col justify-between gap-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="w-11 h-11 rounded-[14px] bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    01. غرف بمفاتيح دخول مشفرة
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    إنشاء غرف مستقلة ومشاركتها برمز أو رابط مباشر
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    أنشئ غرفة لمشروعك أو محادثة ثنائية خاصة واحصل فوراً على مفتاح دخول مخصص ورابط دعوة.
                    يمكن للمنشئ تعديل تفاصيل الغرفة أو حذفها نهائياً مع كافة رسائلها بضغطة واحدة.
                  </p>
                </div>
              </div>

              <div className="md:col-span-5 p-6 sm:p-7 rounded-[24px] bg-[#F5F6FA] dark:bg-[#111622] border border-slate-200/80 dark:border-white/[0.07] flex flex-col justify-between gap-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="w-11 h-11 rounded-[14px] bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    02. الحضور وملفات الأعضاء
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    حالة أونلاين/أوفلاين وبطاقة معلومات كل عضو
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    شاهد من يتواجد في الغرفة الآن بمؤشرات حالة حية بجانب الأسماء، واضغط على أي عضو لعرض نبذته وحالته ومعرفه دون كشف أي بيانات خاصة.
                  </p>
                </div>
              </div>

              <div className="md:col-span-5 p-6 sm:p-7 rounded-[24px] bg-[#F5F6FA] dark:bg-[#111622] border border-slate-200/80 dark:border-white/[0.07] flex flex-col justify-between gap-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="w-11 h-11 rounded-[14px] bg-violet-600 text-white flex items-center justify-center shrink-0">
                    <Palette className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
                    03. خلفيات وألوان متنوعة
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    12 خلفية للدردشة و20 إعداداً قابلاً للتخصيص
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    بدّل بين الخلفيات المتدرجة والهندسية، ألوان الفقاعات، نمط العرض، تمويه الصور للخصوصية، ومؤشرات القراءة والكتابة بحفظ لحظي.
                  </p>
                </div>
              </div>

              <div className="md:col-span-7 p-6 sm:p-7 rounded-[24px] bg-[#F5F6FA] dark:bg-[#111622] border border-slate-200/80 dark:border-white/[0.07] flex flex-col justify-between gap-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="w-11 h-11 rounded-[14px] bg-sky-600 text-white flex items-center justify-center shrink-0">
                    <Mic className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-sky-600 dark:text-sky-400">
                    04. وسائط متكاملة وتشفير محلي
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    رسائل صوتية، صور، ملفات وتشفير محلي قبل الإرسال
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    سجّل مقاطع صوتية بموجات تفاعلية، أرسل الصور والملفات بسرعة، وتحكّم في ملفك الشخصي وصورتك من هاتفك أو حاسوبك بسلاسة تامة.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Real Interactive E2EE Live Sandbox + Architecture Prism */}
        <section id="encryption-lab" className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-16 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-7 p-6 sm:p-8 rounded-[26px] bg-white dark:bg-[#0E121B] border border-slate-200/80 dark:border-white/[0.08] flex flex-col justify-between gap-6">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                      استكشف المحرك عملياً الآن
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      جرّب التشفير الحقيقي في متصفحك أو تفقد بنية الحضور المشترك
                    </p>
                  </div>
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F2F4F8] dark:bg-white/[0.04] text-[11px]">
                    <button
                      type="button"
                      onClick={() => setLabTab('crypto')}
                      className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
                        labTab === 'crypto'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      محرك AES-256
                    </button>
                    <button
                      type="button"
                      onClick={() => setLabTab('workspace')}
                      className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
                        labTab === 'workspace'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      بنية الحضور والغرف
                    </button>
                  </div>
                </div>

                {labTab === 'crypto' ? (
                  <div className="mt-5 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          رسالتك الصريحة (تبقى في متصفحك فقط):
                        </label>
                        {encryptingSample && <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin" />}
                      </div>
                      <input
                        type="text"
                        value={sampleText}
                        onChange={(e) => setSampleText(e.target.value)}
                        placeholder="اكتب نصاً لتجربة تشفيره..."
                        className="min-h-[46px] w-full bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200 dark:border-white/[0.08] rounded-2xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          النص المشفر المُرسَل إلى قاعدة البيانات (Ciphertext):
                        </span>
                        <span dir="ltr" className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0">
                          AES-GCM · Base64
                        </span>
                      </div>
                      <div
                        dir="ltr"
                        className="min-h-[76px] p-4 rounded-2xl bg-[#07090E] text-emerald-300 font-mono text-xs break-all border border-slate-800/80 dark:border-white/[0.08] leading-relaxed select-all tabular-nums"
                      >
                        {sampleCipher
                          ? `${sampleCipher.ciphertext}   |   IV: ${sampleCipher.iv}`
                          : 'اكتب نصاً أعلاه لمعاينة المخرجات المشفرة...'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-4 rounded-2xl bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.08]">
                      <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-1.5">
                        <UserCog className="w-4 h-4 text-indigo-500" />
                        <span>ملفات الأعضاء الآمنة</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                        يظهر للاعضاء اسمك، اسم المستخدم، نبذتك، وحالتك الحالية فقط — مع عزل تام لبريدك وهاتفك في حسابك الخاص.
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.08]">
                      <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>تحديث نبضي للحضور</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                        يتحدّث مؤشر الأونلاين والأوفلاين لحظياً عند فتح التطبيق أو تبديل حالتك أو إغلاق النافذة.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div id="architecture" className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200/80 dark:border-white/[0.08] text-xs">
                <div>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400 block mb-1">01. مصادقة موثقة</span>
                  <span className="text-slate-500 dark:text-slate-400 leading-relaxed">تسجيل آمن عبر Google Auth بعزل كامل لبيانات كل مستخدم.</span>
                </div>
                <div>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400 block mb-1">02. مفتاح فريد</span>
                  <span className="text-slate-500 dark:text-slate-400 leading-relaxed">اشتقاق مفتاح مستقل لكل غرفة عبر رمزها السري.</span>
                </div>
                <div>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400 block mb-1">03. تحكم شامل</span>
                  <span className="text-slate-500 dark:text-slate-400 leading-relaxed">حذف فوري للرسائل أو الغرفة كاملة في أي وقت.</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 relative min-h-[300px] rounded-[26px] overflow-hidden border border-slate-200/80 dark:border-white/[0.08] bg-[#0B0F19] flex flex-col justify-end">
              {!prismImgFailed ? (
                <img
                  src={PRISM_IMAGE}
                  alt="بنية العزل والتشفير"
                  referrerPolicy="no-referrer"
                  onError={() => setPrismImgFailed(true)}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-[#0B0F19] flex items-center justify-center">
                  <Lock className="w-16 h-16 text-indigo-400/50" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#07090E]/95 via-[#07090E]/65 to-transparent" />
              <div className="relative z-10 p-6 sm:p-7">
                <span className="text-[11px] font-mono text-indigo-300 block mb-1">
                  Zero-Trust Firestore Rules
                </span>
                <h3 className="text-lg font-bold text-white mb-1.5">
                  قواعد وصول صارمة لكل غرفة
                </h3>
                <p className="text-xs text-slate-200 leading-relaxed">
                  لا يمكن لأي مستخدم استعراض قوائم الغرف أو قراءة رسائلها دون عضوية موثقة وامتلاك رمز الغرفة.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Responsive Devices Banner CTA */}
        <section id="devices" className="max-w-7xl w-full mx-auto px-4 sm:px-8 pb-16">
          <div className="p-6 sm:p-8 rounded-[26px] bg-white dark:bg-[#0E121B] border border-slate-200/80 dark:border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-[16px] bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/70 dark:border-indigo-400/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  متوافق بسلاسة مع الهاتف، التابلت، والكمبيوتر
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  ادخل بنفس حساب Google من أي متصفح لتجد محادثاتك وإعداداتك وخلفياتك متزامنة فوراً بتصميم يتكيف مع مقاس شاشتك.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLoginClick}
              disabled={signingIn}
              className="min-h-[48px] px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs sm:text-sm font-semibold transition-all active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              تسجيل الدخول عبر Google
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/80 dark:border-white/[0.07] py-6 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Chat Plus — محادثات مشفرة طرف لطرف</span>
          <span>يعمل بمصادقة Google وقاعدة بيانات Firebase سحابية</span>
        </div>
      </footer>
    </div>
  );
};
