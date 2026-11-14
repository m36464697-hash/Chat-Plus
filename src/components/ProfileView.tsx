import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Shield,
  Key,
  Bell,
  Volume2,
  Lock,
  Monitor,
  Check,
  Copy,
  Camera,
  Download,
  Moon,
  Sun,
  ArrowRight,
  Eye,
  CheckCheck,
  Upload,
  LogOut,
  Type,
  Image as ImageIcon,
  Minimize2,
  Globe,
  RotateCcw,
  AlertCircle,
  Send,
  Sliders,
  Palette,
  MessageSquare,
  Clock,
  ArrowDownCircle,
  Link2,
  EyeOff,
  PlayCircle,
  Contrast,
  Keyboard,
} from 'lucide-react';
import {
  AccentColor,
  BubbleStyle,
  ChatRoom,
  UserPreferences,
  UserProfile,
  UserStatus,
} from '../types/chat';
import { compressImageFile, createMonogramAvatar, getPresetAvatars } from '../utils/avatar';
import { copyToClipboard } from '../utils/clipboard';
import { formatReadableError } from '../utils/errors';
import {
  ACCENT_THEMES,
  CHAT_WALLPAPERS,
  getAccentTheme,
  getWallpaperOption,
} from '../utils/wallpapers';

interface ProfileViewProps {
  user: UserProfile;
  chats: ChatRoom[];
  googlePhotoUrl?: string | null;
  lastSignInTime?: string | null;
  onUpdateUser: (updated: Partial<UserProfile>) => Promise<void>;
  onSignOut: () => Promise<void>;
  onBack: () => void;
}

type SettingsTab = 'profile' | 'appearance' | 'privacy' | 'security';

function getRealBrowserLabel(): string {
  const ua = navigator.userAgent || '';
  let browser = 'متصفح ويب';
  if (ua.includes('Edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('Chrome/')) browser = 'Google Chrome';
  else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Apple Safari';

  let os = 'جهاز حاسوب';
  if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return `${browser} · ${os}`;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  chats,
  googlePhotoUrl,
  lastSignInTime,
  onUpdateUser,
  onSignOut,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio);
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [statusMessage, setStatusMessage] = useState(user.statusMessage || '');
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || '');
  const [avatar, setAvatar] = useState(user.avatar);

  // Preferences synced immediately on toggle
  const [prefs, setPrefs] = useState<UserPreferences>(user.preferences);

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [wallpaperFilter, setWallpaperFilter] = useState<'all' | 'minimal' | 'gradient' | 'pattern'>('all');

  useEffect(() => {
    setName(user.name);
    setUsername(user.username);
    setBio(user.bio);
    setStatus(user.status);
    setStatusMessage(user.statusMessage || '');
    setEmail(user.email);
    setPhone(user.phone || '');
    setAvatar(user.avatar);
    setPrefs(user.preferences);
  }, [user]);

  const presetAvatars = useMemo(() => getPresetAvatars(name || user.name), [name, user.name]);
  const currentBrowserSession = useMemo(() => getRealBrowserLabel(), []);
  const activeAccent = getAccentTheme(prefs.accentColor);
  const activeWallpaper = getWallpaperOption(prefs.chatWallpaper);

  const visibleWallpapers = useMemo(() => {
    if (wallpaperFilter === 'all') return CHAT_WALLPAPERS;
    return CHAT_WALLPAPERS.filter((w) => w.category === wallpaperFilter);
  }, [wallpaperFilter]);

  const flashSuccess = (msg: string) => {
    setSaveSuccess(msg);
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  // Immediate live save when toggling preferences or status
  const updatePreferenceLive = async <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K],
    label?: string
  ) => {
    const nextPrefs = { ...prefs, [key]: value };
    setPrefs(nextPrefs);
    setErrorMsg(null);
    try {
      await onUpdateUser({ preferences: nextPrefs });
      if (label) flashSuccess(`تم تطبيق وحفظ: ${label}`);
    } catch (err) {
      setErrorMsg(formatReadableError(err, 'تعذر حفظ الإعداد في قاعدة البيانات'));
    }
  };

  const handleStatusChangeLive = async (nextStatus: UserStatus) => {
    setStatus(nextStatus);
    setErrorMsg(null);
    try {
      await onUpdateUser({ status: nextStatus });
      flashSuccess('تم تحديث حالة الاتصال ومزامنتها');
    } catch (err) {
      setErrorMsg(formatReadableError(err, 'تعذر تحديث حالة الاتصال'));
    }
  };

  const persistAvatarImmediately = async (newAvatarUrl: string) => {
    setAvatar(newAvatarUrl);
    setShowAvatarPicker(false);
    setErrorMsg(null);
    try {
      await onUpdateUser({ avatar: newAvatarUrl });
      flashSuccess('تم تحديث صورة الملف الشخصي وحفظها بنجاح');
    } catch (err) {
      setErrorMsg(formatReadableError(err, 'تعذر حفظ صورة الملف الشخصي'));
    }
  };

  const handleCustomAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('يرجى اختيار ملف صورة صالح (PNG, JPG, WebP)');
      return;
    }

    try {
      setUploadingAvatar(true);
      setErrorMsg(null);
      const compressedDataUrl = await compressImageFile(file, 360, 0.84);
      await persistAvatarImmediately(compressedDataUrl);
    } catch (err) {
      setErrorMsg(formatReadableError(err, 'تعذر معالجة الصورة المختارة'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleToggleNotifications = async (checked: boolean) => {
    if (checked && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        // ignore if blocked in iframe
      }
    }
    await updatePreferenceLive('notifications', checked, checked ? 'تفعيل الإشعارات' : 'إيقاف الإشعارات');
  };

  const handleSaveTextProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('الاسم الكامل مطلوب');
      return;
    }

    const cleanUsername = username.trim();
    if (cleanUsername.length < 2 || !/^[a-zA-Z0-9_.\-]+$/.test(cleanUsername)) {
      setErrorMsg('اسم المستخدم يجب أن يكون من حرفين على الأقل (أحرف إنجليزية، أرقام، _ . -)');
      return;
    }

    try {
      setSaving(true);
      await onUpdateUser({
        name: name.trim(),
        username: cleanUsername,
        bio: bio.trim(),
        status,
        statusMessage: statusMessage.trim(),
        email: email.trim(),
        phone: phone.trim(),
        avatar,
        preferences: prefs,
      });
      flashSuccess('تم حفظ كافة بيانات الملف الشخصي بنجاح');
    } catch (err) {
      console.error('Save error:', err);
      setErrorMsg(formatReadableError(err, 'حدث خطأ أثناء حفظ التعديلات، يرجى المحاولة مرة أخرى'));
    } finally {
      setSaving(false);
    }
  };

  const handleCopyUserId = () => {
    copyToClipboard(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleExportBackup = () => {
    const backupData = {
      user: {
        id: user.id,
        name,
        username,
        email,
        bio,
        status,
        preferences: prefs,
      },
      rooms: chats.map((c) => ({
        id: c.id,
        title: c.title,
        code: c.code,
        isEncrypted: c.isEncrypted,
        createdAt: c.createdAt,
      })),
      exportDate: new Date().toISOString(),
      app: 'Chat Plus',
      encryptionStandard: 'AES-256-GCM + PBKDF2',
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatplus_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isMidnight = prefs.theme === 'midnight';
  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'profile', label: 'البيانات الشخصية', icon: User },
    { id: 'appearance', label: 'الخلفيات والمظهر', icon: Sliders },
    { id: 'privacy', label: 'الخصوصية والتجربة', icon: Bell },
    { id: 'security', label: 'الأمان والنسخ', icon: Shield },
  ];

  const previewSenderBubbleClass =
    prefs.bubbleStyle === 'minimal' ? activeAccent.buttonClass : activeAccent.senderBubbleClass;
  const previewBubbleRadius =
    prefs.bubbleStyle === 'classic'
      ? 'rounded-2xl'
      : prefs.bubbleStyle === 'minimal'
      ? 'rounded-2xl'
      : 'rounded-[22px]';

  const privacyTogglesSection1 = [
    {
      icon: <CheckCheck className="w-4 h-4 text-sky-500 shrink-0" />,
      title: 'مؤشرات القراءة (الصحين)',
      desc: 'إظهار علامات التسليم أسفل رسائلك',
      checked: prefs.readReceipts,
      onChange: (checked: boolean) => updatePreferenceLive('readReceipts', checked, 'مؤشرات القراءة'),
    },
    {
      icon: <Eye className="w-4 h-4 text-amber-500 shrink-0" />,
      title: 'عرض حالة النشاط (أونلاين)',
      desc: 'إظهار حالتك الحالية للأعضاء في الغرف وقائمة المحادثات',
      checked: prefs.lastSeen,
      onChange: (checked: boolean) => updatePreferenceLive('lastSeen', checked, 'عرض حالة النشاط'),
    },
    {
      icon: <Keyboard className="w-4 h-4 text-indigo-500 shrink-0" />,
      title: 'مؤشر جاري الكتابة',
      desc: 'إبلاغ أعضاء الغرفة عندما تكتب رسالة جديدة',
      checked: prefs.sendTypingIndicator,
      onChange: (checked: boolean) => updatePreferenceLive('sendTypingIndicator', checked, 'مؤشر جاري الكتابة'),
    },
    {
      icon: <Lock className="w-4 h-4 text-emerald-500 shrink-0" />,
      title: 'إظهار شارة التشفير E2EE',
      desc: 'عرض أيقونة القفل وشارة التشفير بجانب الرسائل والغرف',
      checked: prefs.showEncryptionBadge,
      onChange: (checked: boolean) => updatePreferenceLive('showEncryptionBadge', checked, 'شارة التشفير'),
    },
    {
      icon: <Volume2 className="w-4 h-4 text-emerald-500 shrink-0" />,
      title: 'المؤثرات الصوتية',
      desc: 'أصوات خفيفة عند الإرسال والاستقبال والتسجيل',
      checked: prefs.soundEffects,
      onChange: (checked: boolean) => updatePreferenceLive('soundEffects', checked, 'المؤثرات الصوتية'),
    },
    {
      icon: <Bell className="w-4 h-4 text-indigo-500 shrink-0" />,
      title: 'إشعارات المتصفح الفورية',
      desc: 'تنبيهات عند وصول رسائل جديدة في الخلفية',
      checked: prefs.notifications,
      onChange: (checked: boolean) => handleToggleNotifications(checked),
    },
  ];

  const privacyTogglesSection2 = [
    {
      icon: <Send className="w-4 h-4 text-indigo-500 shrink-0 rotate-180" />,
      title: 'الإرسال بضغط Enter',
      desc: 'Enter للإرسال و Shift+Enter لسطر جديد',
      checked: prefs.enterIsSend,
      onChange: (checked: boolean) => updatePreferenceLive('enterIsSend', checked, 'تفضيل زر الإرسال'),
    },
    {
      icon: <Minimize2 className="w-4 h-4 text-slate-500 shrink-0" />,
      title: 'وضع العرض المضغوط',
      desc: 'تقليل المسافات بين الرسائل المتتالية لاستيعاب أكثر',
      checked: Boolean(prefs.compactMode),
      onChange: (checked: boolean) => updatePreferenceLive('compactMode', checked, 'وضع العرض المضغوط'),
    },
    {
      icon: <Clock className="w-4 h-4 text-sky-500 shrink-0" />,
      title: 'إظهار وقت كل رسالة',
      desc: 'عرض الساعة والدقيقة أسفل فقاعة المحادثة',
      checked: prefs.showTimestamps,
      onChange: (checked: boolean) => updatePreferenceLive('showTimestamps', checked, 'إظهار التوقيت'),
    },
    {
      icon: <ArrowDownCircle className="w-4 h-4 text-emerald-500 shrink-0" />,
      title: 'التمرير التلقائي للرسائل الجديدة',
      desc: 'الانتقال تلقائياً لأسفل المحادثة عند وصول رسالة',
      checked: prefs.autoScrollOnMessage,
      onChange: (checked: boolean) => updatePreferenceLive('autoScrollOnMessage', checked, 'التمرير التلقائي'),
    },
    {
      icon: <Link2 className="w-4 h-4 text-indigo-500 shrink-0" />,
      title: 'بطاقات معاينة الروابط',
      desc: 'تنسيق الروابط داخل الرسائل كبطاقة قابلة للنقر الآمن',
      checked: prefs.linkPreviews,
      onChange: (checked: boolean) => updatePreferenceLive('linkPreviews', checked, 'بطاقات الروابط'),
    },
    {
      icon: <EyeOff className="w-4 h-4 text-rose-500 shrink-0" />,
      title: 'تمويه الصور للخصوصية',
      desc: 'إخفاء الصور بضبابية حتى تضغط عليها لفتحها',
      checked: prefs.blurMedia,
      onChange: (checked: boolean) => updatePreferenceLive('blurMedia', checked, 'تمويه الوسائط'),
    },
    {
      icon: <PlayCircle className="w-4 h-4 text-violet-500 shrink-0" />,
      title: 'استعداد تشغيل الصوتيات المتتابع',
      desc: 'تحسين تجربة الاستماع المتصل للمقاطع الصوتية',
      checked: prefs.voiceAutoPlay,
      onChange: (checked: boolean) => updatePreferenceLive('voiceAutoPlay', checked, 'تشغيل الصوتيات المتتابع'),
    },
    {
      icon: <Contrast className="w-4 h-4 text-amber-500 shrink-0" />,
      title: 'تباين نصي عالٍ',
      desc: 'زيادة وضوح النصوص وحدود الفقاعات لسهولة القراءة',
      checked: prefs.highContrastText,
      onChange: (checked: boolean) => updatePreferenceLive('highContrastText', checked, 'تباين عالٍ'),
    },
  ];

  return (
    <div
      className={`flex-1 h-full overflow-y-auto flex flex-col ${
        isMidnight
          ? 'bg-black text-slate-100'
          : 'bg-[#F5F6FA] dark:bg-[#07090E] text-slate-900 dark:text-slate-100'
      }`}
      dir="rtl"
    >
      {/* Frosted Studio Top Header */}
      <div
        className={`sticky top-0 z-20 backdrop-blur-2xl border-b border-slate-200/80 dark:border-white/[0.07] px-3 sm:px-8 h-16 flex items-center justify-between gap-2 shrink-0 ${
          isMidnight ? 'bg-black/85' : 'bg-white/85 dark:bg-[#0B0E16]/85'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[42px] px-3 rounded-[13px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors flex items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer"
            aria-label="العودة للمحادثات"
          >
            <ArrowRight className="w-4 h-4" />
            <span>المحادثات</span>
          </button>
          <div className="h-4 w-px bg-slate-200 dark:bg-white/[0.08] shrink-0" />
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate tracking-tight">
            الملف الشخصي والإعدادات
          </h2>
        </div>

        <button
          type="button"
          onClick={() => handleSaveTextProfile()}
          disabled={saving}
          className={`min-h-[42px] flex items-center gap-1.5 px-4 py-2 ${activeAccent.buttonClass} rounded-[13px] text-xs font-semibold shadow-xs active:scale-95 transition-all disabled:opacity-50 shrink-0 cursor-pointer whitespace-nowrap`}
        >
          {saving ? (
            <span>جاري الحفظ...</span>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>حفظ البيانات</span>
            </>
          )}
        </button>
      </div>

      <div className="max-w-6xl w-full mx-auto p-4 sm:p-8 flex flex-col gap-6 pb-20 sm:pb-12">
        {saveSuccess && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-emerald-800 dark:text-emerald-200 text-xs font-medium">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200/80 dark:border-red-500/30 rounded-2xl flex items-center gap-2.5 text-red-700 dark:text-red-200 text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Profile Studio Hero Card */}
        <div
          className={`rounded-[28px] overflow-hidden border border-slate-200/80 dark:border-white/[0.08] ${
            isMidnight ? 'bg-[#0B0D12]' : 'bg-white dark:bg-[#0E121B]'
          }`}
        >
          <div className="h-24 sm:h-28 bg-[linear-gradient(125deg,#1e1b4b_0%,#312e81_48%,#0f172a_100%)] relative">
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:20px_20px]" />
          </div>

          <div className="px-5 sm:px-7 pb-6 -mt-12 relative flex flex-col sm:flex-row items-center sm:items-end justify-between gap-5">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-right">
              <div className="relative group shrink-0">
                <img
                  src={avatar}
                  alt={name}
                  referrerPolicy="no-referrer"
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-[22px] object-cover border-4 border-white dark:border-[#0E121B] bg-slate-100 dark:bg-slate-800 shadow-lg"
                />
                <div
                  className={`absolute bottom-1 left-1 w-4 h-4 rounded-full border-2 border-white dark:border-[#0E121B] ${
                    status === 'online'
                      ? 'bg-emerald-500'
                      : status === 'busy'
                      ? 'bg-rose-500'
                      : status === 'away'
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
                  }`}
                />
                <label
                  className="absolute inset-0 bg-black/55 rounded-[22px] opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[11px] font-semibold gap-1 transition-opacity cursor-pointer"
                  title="تغيير صورة الملف الشخصي من جهازك"
                >
                  <Camera className="w-5 h-5" />
                  <span>{uploadingAvatar ? 'جاري الرفع...' : 'تغيير'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCustomAvatarUpload}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                </label>
              </div>

              <div className="pb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {name || user.name}
                </h1>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className={`font-mono ${activeAccent.textClass} font-semibold`}>@{username}</span>
                  <span aria-hidden="true">·</span>
                  <span>{email}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
              <label className={`min-h-[42px] cursor-pointer flex items-center gap-1.5 px-4 py-2 ${activeAccent.buttonClass} rounded-[13px] text-xs font-semibold transition-colors whitespace-nowrap`}>
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadingAvatar ? 'جاري المعالجة...' : 'صورة من جهازك'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCustomAvatarUpload}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
              </label>
              <button
                type="button"
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="min-h-[42px] px-4 py-2 bg-[#F2F4F8] dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 rounded-[13px] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
              >
                اختيار أفاتار
              </button>
            </div>
          </div>

          {showAvatarPicker && (
            <div className="p-4 sm:p-6 border-t border-slate-200/80 dark:border-white/[0.07] bg-[#F8F9FC] dark:bg-[#07090E]/60 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  اختر تصميماً لحسابك أو استعد صورة جوجل:
                </span>
                <div className="flex items-center gap-2">
                  {googlePhotoUrl && (
                    <button
                      type="button"
                      onClick={() => persistAvatarImmediately(googlePhotoUrl)}
                      className="min-h-[36px] px-3 py-1.5 bg-white dark:bg-[#0E121B] border border-slate-200/80 dark:border-white/[0.08] hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>صورة Google</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => persistAvatarImmediately(createMonogramAvatar(name || user.name))}
                    className="min-h-[36px] px-3 py-1.5 bg-white dark:bg-[#0E121B] border border-slate-200/80 dark:border-white/[0.08] hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    أحرف الاسم
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                {presetAvatars.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => persistAvatarImmediately(p.url)}
                    className={`p-1.5 rounded-2xl border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      avatar === p.url
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15'
                        : 'border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#0E121B] hover:border-slate-300'
                    }`}
                  >
                    <img src={p.url} alt={p.label} className="w-11 h-11 rounded-xl object-cover" />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full text-center">
                      {p.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Segmented Tabs */}
        <div
          className={`flex items-center gap-1.5 p-1.5 border border-slate-200/80 dark:border-white/[0.08] rounded-[18px] overflow-x-auto ${
            isMidnight ? 'bg-[#0B0D12]' : 'bg-white dark:bg-[#0E121B]'
          }`}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-h-[42px] px-3.5 py-2 rounded-[13px] text-xs font-semibold flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? `${activeAccent.buttonClass} shadow-xs`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/[0.05]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: Personal Info */}
        {activeTab === 'profile' && (
          <form
            onSubmit={handleSaveTextProfile}
            className={`p-5 sm:p-7 rounded-[24px] border border-slate-200/80 dark:border-white/[0.08] flex flex-col gap-5 text-xs ${
              isMidnight ? 'bg-[#0B0D12]' : 'bg-white dark:bg-[#0E121B]'
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-700 dark:text-slate-300 font-semibold">الاسم الكامل *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  required
                  className="min-h-[44px] bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-700 dark:text-slate-300 font-semibold">اسم المستخدم (@username) *</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={40}
                  required
                  dir="ltr"
                  className="min-h-[44px] bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl px-4 py-2.5 text-slate-900 dark:text-slate-100 font-mono text-left focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-700 dark:text-slate-300 font-semibold">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={160}
                  dir="ltr"
                  className="min-h-[44px] bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl px-4 py-2.5 text-slate-900 dark:text-slate-100 text-left focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-700 dark:text-slate-300 font-semibold">رقم الهاتف (اختياري)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={40}
                  dir="ltr"
                  placeholder="+966 50 000 0000"
                  className="min-h-[44px] bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl px-4 py-2.5 text-slate-900 dark:text-slate-100 font-mono text-left focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-slate-700 dark:text-slate-300 font-semibold">النبذة التعريفية (Bio)</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder="اكتب نبذة مختصرة عنك..."
                  className="bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-700 dark:text-slate-300 font-semibold">
                  حالة الاتصال المباشرة (تحفظ فوراً)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'online', label: 'متصل الآن', color: 'bg-emerald-500' },
                    { id: 'busy', label: 'مشغول', color: 'bg-rose-500' },
                    { id: 'away', label: 'بالخارج', color: 'bg-amber-500' },
                    { id: 'offline', label: 'أوفلاين (مخفي)', color: 'bg-slate-400' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleStatusChangeLive(st.id as UserStatus)}
                      className={`min-h-[42px] flex items-center gap-2 px-3 py-2 rounded-[14px] border transition-all text-xs cursor-pointer ${
                        status === st.id
                          ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-500 font-semibold text-indigo-700 dark:text-white'
                          : 'bg-[#F5F6FA] dark:bg-[#07090E] border-slate-200/80 dark:border-white/[0.07] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${st.color}`} />
                      <span>{st.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-700 dark:text-slate-300 font-semibold">رسالة الحالة المخصصة</label>
                <input
                  type="text"
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  maxLength={120}
                  placeholder="مثال: متاح للمشاريع، في اجتماع..."
                  className="min-h-[44px] bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className={`min-h-[44px] px-6 py-2.5 ${activeAccent.buttonClass} rounded-2xl text-xs font-semibold cursor-pointer disabled:opacity-50 transition-all active:scale-[0.98]`}
              >
                {saving ? 'جاري الحفظ...' : 'حفظ التغييرات النصية'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: Appearance, 12 Wallpapers Gallery, 6 Accents, 3 Bubble Styles & Live Mini-Preview */}
        {activeTab === 'appearance' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div
              className={`lg:col-span-7 p-5 sm:p-6 rounded-[24px] border border-slate-200/80 dark:border-white/[0.08] flex flex-col gap-6 text-xs ${
                isMidnight ? 'bg-[#0B0D12]' : 'bg-white dark:bg-[#0E121B]'
              }`}
            >
              {/* Theme Mode */}
              <div className="flex flex-col gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">نمط المظهر العام (يطبق فوراً):</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'dark', label: 'داكن عصري', icon: Moon },
                    { id: 'midnight', label: 'أسود AMOLED', icon: Moon },
                    { id: 'light', label: 'فاتح ناصع', icon: Sun },
                  ].map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => updatePreferenceLive('theme', t.id as UserPreferences['theme'], t.label)}
                        className={`min-h-[44px] p-3 rounded-[14px] border transition-all flex items-center justify-center gap-2 font-semibold cursor-pointer ${
                          prefs.theme === t.id
                            ? `${activeAccent.buttonClass} border-transparent shadow-xs`
                            : 'bg-[#F5F6FA] dark:bg-[#07090E] border-slate-200/80 dark:border-white/[0.07] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 12 Chat Space Wallpapers Gallery */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className={`w-4 h-4 ${activeAccent.textClass}`} />
                    <span>خلفيات مساحة الدردشة ({CHAT_WALLPAPERS.length} خياراً):</span>
                  </span>

                  <div className="flex items-center gap-1 bg-[#F2F4F8] dark:bg-white/[0.04] p-1 rounded-xl text-[11px]">
                    {[
                      { id: 'all', label: 'الكل' },
                      { id: 'gradient', label: 'تدرجات' },
                      { id: 'pattern', label: 'أنماط' },
                      { id: 'minimal', label: 'هادئة' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setWallpaperFilter(cat.id as typeof wallpaperFilter)}
                        className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                          wallpaperFilter === cat.id
                            ? 'bg-white dark:bg-[#1A202E] text-slate-900 dark:text-white shadow-2xs'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {visibleWallpapers.map((wp) => {
                    const isSelected = prefs.chatWallpaper === wp.id;
                    return (
                      <button
                        key={wp.id}
                        type="button"
                        onClick={() => updatePreferenceLive('chatWallpaper', wp.id, wp.label)}
                        className={`group p-2 rounded-[16px] border text-right flex flex-col gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-500/12 ring-2 ring-indigo-500/25'
                            : 'border-slate-200/80 dark:border-white/[0.07] bg-[#F5F6FA] dark:bg-[#07090E] hover:border-slate-400'
                        }`}
                      >
                        <div className={`w-full h-14 rounded-[11px] border border-slate-200/60 dark:border-white/[0.08] relative overflow-hidden ${wp.swatchClass}`}>
                          <div className="absolute bottom-1.5 right-1.5 w-8 h-2.5 rounded-full bg-white/80 dark:bg-white/20" />
                          <div className={`absolute top-1.5 left-1.5 w-10 h-2.5 rounded-full ${activeAccent.swatchClass} opacity-85`} />
                          {isSelected && (
                            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate w-full">
                          {wp.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accent Colors */}
              <div className="flex flex-col gap-2.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Palette className={`w-4 h-4 ${activeAccent.textClass}`} />
                  <span>اللون الرئيسي لفقاعاتك والأزرار:</span>
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(Object.values(ACCENT_THEMES) as typeof ACCENT_THEMES[AccentColor][]).map((theme) => {
                    const selected = prefs.accentColor === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => updatePreferenceLive('accentColor', theme.id, theme.label)}
                        className={`p-2 rounded-[14px] border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          selected
                            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-500/12 font-semibold'
                            : 'border-slate-200/80 dark:border-white/[0.07] bg-[#F5F6FA] dark:bg-[#07090E]'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-full ${theme.swatchClass} flex items-center justify-center text-white shadow-xs`}>
                          {selected && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <span className="text-[10px] text-slate-700 dark:text-slate-300 truncate max-w-full">
                          {theme.label.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bubble Style + Font Size + Locale */}
              <div className="flex flex-col gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className={`w-3.5 h-3.5 ${activeAccent.textClass}`} />
                  <span>نمط فقاعات الرسائل:</span>
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'modern', label: 'عصري متدرج' },
                    { id: 'classic', label: 'كلاسيكي محدد' },
                    { id: 'minimal', label: 'بسيط مسطح' },
                  ].map((bs) => (
                    <button
                      key={bs.id}
                      type="button"
                      onClick={() => updatePreferenceLive('bubbleStyle', bs.id as BubbleStyle, bs.label)}
                      className={`min-h-[40px] px-3 py-2 rounded-[13px] border font-semibold transition-colors cursor-pointer ${
                        prefs.bubbleStyle === bs.id
                          ? `${activeAccent.buttonClass} border-transparent`
                          : 'bg-[#F5F6FA] dark:bg-[#07090E] border-slate-200/80 dark:border-white/[0.07] text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {bs.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Type className={`w-3.5 h-3.5 ${activeAccent.textClass}`} />
                    <span>حجم خط المحادثة:</span>
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'small', label: 'صغير' },
                      { id: 'medium', label: 'متوسط' },
                      { id: 'large', label: 'كبير' },
                    ].map((fs) => (
                      <button
                        key={fs.id}
                        type="button"
                        onClick={() => updatePreferenceLive('fontSize', fs.id as UserPreferences['fontSize'], `خط ${fs.label}`)}
                        className={`min-h-[40px] px-3 py-2 rounded-[13px] border font-semibold transition-colors cursor-pointer ${
                          prefs.fontSize === fs.id
                            ? `${activeAccent.buttonClass} border-transparent`
                            : 'bg-[#F5F6FA] dark:bg-[#07090E] border-slate-200/80 dark:border-white/[0.07] text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {fs.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Globe className={`w-3.5 h-3.5 ${activeAccent.textClass}`} />
                    <span>تنسيق التوقيت والأرقام:</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'ar', label: 'عربية (ar-SA)' },
                      { id: 'en', label: 'لاتينية (en-US)' },
                    ].map((lang) => (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => updatePreferenceLive('language', lang.id as UserPreferences['language'], lang.label)}
                        className={`min-h-[40px] px-3 py-2 rounded-[13px] border font-semibold transition-colors cursor-pointer ${
                          prefs.language === lang.id
                            ? `${activeAccent.buttonClass} border-transparent`
                            : 'bg-[#F5F6FA] dark:bg-[#07090E] border-slate-200/80 dark:border-white/[0.07] text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Visual Preview */}
            <div
              className={`lg:col-span-5 lg:sticky lg:top-24 rounded-[24px] border border-slate-200/80 dark:border-white/[0.08] overflow-hidden ${
                isMidnight ? 'bg-[#0B0D12]' : 'bg-white dark:bg-[#0E121B]'
              }`}
            >
              <div className="px-4 py-3.5 border-b border-slate-200/80 dark:border-white/[0.07] flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span>معاينة حية لمظهر المحادثة</span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {activeWallpaper.label}
                </span>
              </div>
              <div
                className={`p-5 flex flex-col gap-3 min-h-[260px] justify-center bg-[#F5F6FA] dark:bg-[#07090E] ${activeWallpaper.canvasClass}`}
              >
                <div
                  className={`self-start max-w-[85%] ${previewBubbleRadius} ${
                    prefs.bubbleStyle === 'minimal'
                      ? 'bg-slate-200/80 dark:bg-white/[0.07]'
                      : 'bg-white dark:bg-[#141A26] border border-slate-200/80 dark:border-white/[0.08]'
                  } px-4 py-2.5 text-slate-800 dark:text-slate-100 shadow-xs`}
                >
                  <p
                    className={
                      prefs.fontSize === 'small'
                        ? 'text-xs'
                        : prefs.fontSize === 'large'
                        ? 'text-base'
                        : 'text-sm'
                    }
                  >
                    أهلاً بك، تم تفعيل الخلفية والتشفير لهذه الغرفة.
                  </p>
                  {(prefs.showTimestamps || prefs.showEncryptionBadge) && (
                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 font-mono">
                      {prefs.showEncryptionBadge && <Lock className="w-2.5 h-2.5 text-emerald-500" />}
                      {prefs.showTimestamps && <span>10:42</span>}
                    </div>
                  )}
                </div>

                <div
                  className={`self-end max-w-[85%] ${previewBubbleRadius} ${previewSenderBubbleClass} px-4 py-2.5 shadow-xs`}
                >
                  <p
                    className={
                      prefs.fontSize === 'small'
                        ? 'text-xs'
                        : prefs.fontSize === 'large'
                        ? 'text-base'
                        : 'text-sm'
                    }
                  >
                    تصميم عصري وواضح جداً ومريح للعين!
                  </p>
                  {(prefs.showTimestamps || prefs.readReceipts) && (
                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-85 font-mono">
                      {prefs.showTimestamps && <span>10:43</span>}
                      {prefs.readReceipts && <CheckCheck className="w-3.5 h-3.5 text-sky-200" />}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Expanded Privacy, Notifications & Messaging Controls (14 switches) */}
        {activeTab === 'privacy' && (
          <div className="flex flex-col gap-5 text-xs">
            <div
              className={`p-5 sm:p-6 rounded-[24px] border border-slate-200/80 dark:border-white/[0.08] flex flex-col gap-4 ${
                isMidnight ? 'bg-[#0B0D12]' : 'bg-white dark:bg-[#0E121B]'
              }`}
            >
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  الخصوصية والحضور والتنبيهات
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  تحكم في ظهورك للأعضاء الآخرين، مؤشرات القراءة والكتابة، والتنبيهات الفورية.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {privacyTogglesSection1.map((item, idx) => (
                  <label
                    key={idx}
                    className="p-4 rounded-[18px] bg-[#F5F6FA] dark:bg-[#07090E]/80 border border-slate-200/80 dark:border-white/[0.07] flex items-center justify-between gap-3 cursor-pointer hover:border-slate-300 dark:hover:border-white/[0.14] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {item.icon}
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 block truncate">
                          {item.title}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                          {item.desc}
                        </span>
                      </div>
                    </div>
                    <span className="relative inline-flex items-center shrink-0">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => item.onChange(e.target.checked)}
                        className="sr-only peer"
                      />
                      <span
                        className="w-11 h-6 rounded-full bg-slate-300 dark:bg-white/[0.14] peer-checked:bg-emerald-500 transition-colors duration-200 relative after:content-[''] after:absolute after:top-0.5 after:right-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-200 peer-checked:after:-translate-x-5"
                        aria-hidden="true"
                      />
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div
              className={`p-5 sm:p-6 rounded-[24px] border border-slate-200/80 dark:border-white/[0.08] flex flex-col gap-4 ${
                isMidnight ? 'bg-[#0B0D12]' : 'bg-white dark:bg-[#0E121B]'
              }`}
            >
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  تجربة المحادثة والوسائط والقراءة
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  خيارات متقدمة لتخصيص عرض الرسائل، الصور، الصوتيات، وطريقة الإرسال.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {privacyTogglesSection2.map((item, idx) => (
                  <label
                    key={idx}
                    className="p-4 rounded-[18px] bg-[#F5F6FA] dark:bg-[#07090E]/80 border border-slate-200/80 dark:border-white/[0.07] flex items-center justify-between gap-3 cursor-pointer hover:border-slate-300 dark:hover:border-white/[0.14] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {item.icon}
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 block truncate">
                          {item.title}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                          {item.desc}
                        </span>
                      </div>
                    </div>
                    <span className="relative inline-flex items-center shrink-0">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => item.onChange(e.target.checked)}
                        className="sr-only peer"
                      />
                      <span
                        className="w-11 h-6 rounded-full bg-slate-300 dark:bg-white/[0.14] peer-checked:bg-emerald-500 transition-colors duration-200 relative after:content-[''] after:absolute after:top-0.5 after:right-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-200 peer-checked:after:-translate-x-5"
                        aria-hidden="true"
                      />
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Security, Session & Backup */}
        {activeTab === 'security' && (
          <div className="flex flex-col gap-5 text-xs">
            <div
              className={`p-5 sm:p-6 rounded-[24px] border border-slate-200/80 dark:border-white/[0.08] flex flex-col gap-4 ${
                isMidnight ? 'bg-[#0B0D12]' : 'bg-white dark:bg-[#0E121B]'
              }`}
            >
              <div className="p-4 rounded-[18px] bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.07] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="min-w-0 max-w-full">
                  <span className="text-slate-500 dark:text-slate-400 font-medium block">
                    المعرف الرقمي الموثق للمستخدم (UID)
                  </span>
                  <span dir="ltr" className="font-mono text-slate-900 dark:text-slate-200 font-bold text-xs break-all inline-block mt-0.5">
                    {user.id}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUserId}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-slate-200/80 dark:bg-white/[0.07] hover:bg-slate-300 dark:hover:bg-white/[0.12] text-slate-800 dark:text-slate-200 flex items-center gap-1.5 font-medium transition-colors shrink-0 cursor-pointer"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId ? 'تم النسخ' : 'نسخ المعرف'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-[18px] bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.07] flex items-start gap-3">
                  <Lock className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      تشفير طرف لطرف (AES-256-GCM)
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                      تُشفر رسائلك عبر Web Crypto API محلياً قبل وصولها إلى قاعدة البيانات.
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-[18px] bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.07] flex items-start gap-3">
                  <Key className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      اشتقاق المفاتيح (PBKDF2)
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                      توليد مفتاح فريد لكل غرفة من رمزها مع 100,000 دورة SHA-256.
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-[18px] bg-[#F5F6FA] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.07] flex items-center gap-3">
                <Monitor className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    الجلسة الحالية: {currentBrowserSession}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    موثق عبر Google
                    {lastSignInTime
                      ? ` · آخر تسجيل دخول: ${new Date(lastSignInTime).toLocaleDateString('ar-SA')}`
                      : ''}
                  </span>
                </div>
              </div>
            </div>

            <div
              className={`p-5 sm:p-6 rounded-[24px] border border-slate-200/80 dark:border-white/[0.08] flex flex-col gap-4 ${
                isMidnight ? 'bg-[#0B0D12]' : 'bg-white dark:bg-[#0E121B]'
              }`}
            >
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>النسخ الاحتياطي وتسجيل الخروج</span>
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                يمكنك تصدير بيانات ملفك الشخصي وقائمة غرفك الفعلية كملف JSON، أو تسجيل الخروج من حسابك.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="min-h-[44px] px-4 py-2 bg-[#F2F4F8] dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-800 dark:text-slate-200 rounded-[14px] font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>تصدير نسخة JSON</span>
                </button>

                <button
                  type="button"
                  onClick={onSignOut}
                  className="min-h-[44px] px-4 py-2 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/60 text-red-600 dark:text-red-300 border border-red-200/80 dark:border-red-500/30 rounded-[14px] font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
